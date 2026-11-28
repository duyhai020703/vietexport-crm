import * as XLSX from "xlsx";

export interface ParsedExcelProduct {
  sku: string;
  name: string;
  englishName: string;
  category: string;
  specification: string;
  unit: string;
  netWeightGrams: number;
  packsPerCarton: number;
  cartonDimensions: string;
  cbm: number | null;
  capacity20ft: number | null;
  capacity40hc: number | null;
}

function mapProductGroupToCategory(
  groupText: string,
  commodityText: string
): string {
  const combined = `${groupText} ${commodityText}`.toUpperCase();
  if (combined.includes("OEM")) return "OEM";
  if (combined.includes("MÈ") || combined.includes("SESAME")) return "Mè";
  if (
    combined.includes("SIÊU MỎNG") ||
    combined.includes("READY TO ROLL") ||
    combined.includes("SUPER THIN")
  ) {
    return "Siêu Mỏng";
  }
  if (
    combined.includes("CHẢ GIÒ") ||
    combined.includes("SPRING ROLL RICE PAPER") ||
    combined.includes("ĐA NEM")
  ) {
    return "Chả giò / Đa nem";
  }
  if (
    combined.includes("CUỐN") ||
    combined.includes("TRADITIONAL") ||
    combined.includes("FRESH SPRING")
  ) {
    return "Cuốn";
  }
  if (
    combined.includes("GIA VỊ") ||
    combined.includes("SPICIES") ||
    combined.includes("SPICES") ||
    combined.includes("MUỐI") ||
    combined.includes("SỐT") ||
    combined.includes("SAUCE") ||
    combined.includes("SALT")
  ) {
    return "Trộn / Gia vị";
  }
  if (
    combined.includes("CUỐN") ||
    combined.includes("TRADITIONAL") ||
    combined.includes("FRESH SPRING")
  ) {
    return "Cuốn";
  }
  return "Siêu Mỏng";
}

function parseNumberWithDots(raw: string): number | null {
  const cleaned = raw.replace(/\./g, "").replace(/,/g, "").trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function computeCbmFromDimensions(dim: string): number | null {
  const match = dim.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const l = parseFloat(match[1]);
  const w = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  if (isNaN(l) || isNaN(w) || isNaN(h)) return null;
  return Number(((l * w * h) / 1_000_000).toFixed(4));
}

function buildAutoSku(
  name: string,
  category: string,
  netWeight: number,
  index: number
): string {
  const prefixMap: Record<string, string> = {
    "Siêu Mỏng": "SM",
    "Cuốn": "CUON",
    "Chả giò / Đa nem": "CG",
    "Mè": "ME",
    "Trộn / Gia vị": "GV",
    "OEM": "OEM",
  };
  const prefix = prefixMap[category] ?? "TN";
  const upper = name.toUpperCase();

  let tag = "";
  if (upper.includes("16CM")) tag = "16";
  else if (upper.includes("22CM")) tag = "22";
  else if (upper.includes("TẮC") || upper.includes("CALAMANSI")) tag = "TAC";
  else if (upper.includes("SIÊU CAY") || upper.includes("EXTRA HOT")) tag = "SC";
  else if (upper.includes("SỐT") || upper.includes("SAUCE")) tag = "SOT";
  else if (upper.includes("TÔM") || upper.includes("SHRIMP")) tag = "TOM";
  else if (upper.includes("TỎI") || upper.includes("GARLIC")) tag = "TOI";
  else if (upper.includes("TIÊU") || upper.includes("PEPPER")) tag = "TIEU";

  const weightPart = netWeight > 0 ? `${Math.round(netWeight)}G` : `${index}`;
  const parts = ["SKU", prefix, tag, weightPart].filter(Boolean);
  return parts.join("-");
}

/**
 * Parses an Excel buffer matching Tan Nhien Export Quotation format (FOB/EXW sheets)
 * or a standard SKU table, ignoring price and image columns.
 */
export function parseProductsFromExcelBuffer(
  buffer: ArrayBuffer
): ParsedExcelProduct[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName =
    wb.SheetNames.find((s) => s.toUpperCase().includes("FOB")) ??
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: "",
  });

  // Find header row dynamically
  let headerIdx = -1;
  let colSku = -1;
  let colGroup = -1;
  let colCommodity = -1;
  let colSize = -1;
  let colSpecs = -1;
  let colUnit = -1;
  let colNotes = -1;

  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r].map((c) => String(c ?? "").toUpperCase().trim());
    const commIdx = row.findIndex(
      (c) => c.includes("COMMODITY") || c.includes("TÊN SẢN PHẨM")
    );
    if (commIdx !== -1) {
      headerIdx = r;
      colCommodity = commIdx;
      colSku = row.findIndex((c) => c === "SKU" || c.includes("MÃ SKU"));
      colGroup = row.findIndex(
        (c) => c.includes("PRODUCT GROUP") || c.includes("NHÓM SẢN PHẨM") || c.includes("PHÂN LOẠI")
      );
      colSize = row.findIndex(
        (c) => c.includes("SIZE") || c.includes("KÍCH THƯỚC")
      );
      colSpecs = row.findIndex(
        (c) => c.includes("SPECIFICATION") || c.includes("QUY CÁCH")
      );
      colUnit = row.findIndex((c) => c.includes("UNIT") || c.includes("ĐVT"));
      colNotes = row.findIndex((c) => c.includes("NOTES") || c.includes("GHI CHÚ"));
      break;
    }
  }

  if (headerIdx === -1 || colCommodity === -1) {
    return [];
  }

  const results: ParsedExcelProduct[] = [];
  const usedSkus = new Set<string>();
  let lastGroupText = "";

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const rawCommodity = String(row[colCommodity] ?? "").trim();
    if (!rawCommodity) continue;

    // Stop if we hit footer notes/bank info
    const upperComm = rawCommodity.toUpperCase();
    if (
      upperComm.startsWith("NOTE:") ||
      upperComm.startsWith("PAYMENT") ||
      upperComm.startsWith("BANK") ||
      upperComm.startsWith("VALIDITY")
    ) {
      break;
    }

    const rawGroup =
      colGroup !== -1 ? String(row[colGroup] ?? "").trim() : "";
    if (rawGroup) {
      lastGroupText = rawGroup;
    }

    // Split bilingual commodity (Line 1 = English, Line 2 = Vietnamese)
    const lines = rawCommodity
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const englishName = lines.length > 1 ? lines[0] : "";
    const viName = lines.length > 1 ? lines.slice(1).join(" ") : lines[0];

    const category = mapProductGroupToCategory(lastGroupText, rawCommodity);

    // Extract Net Weight (e.g. "300 g", "120 g", "45g")
    const weightMatch = rawCommodity.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    const netWeightGrams = weightMatch ? parseFloat(weightMatch[1]) : 300;

    // Extract packsPerCarton from specs (e.g. "40 packages/carton")
    const rawSpecs = colSpecs !== -1 ? String(row[colSpecs] ?? "").trim() : "";
    const packsMatch = rawSpecs.match(/(\d+)\s*(?:packages?|gói|packs?)/i);
    const packsPerCarton = packsMatch ? parseInt(packsMatch[1], 10) : 40;

    // Extract carton dimensions & compute CBM
    const cartonDimensions =
      colSize !== -1 ? String(row[colSize] ?? "").trim() : "";
    const cbm = cartonDimensions
      ? computeCbmFromDimensions(cartonDimensions)
      : null;

    // Extract 20ft & 40ft container capacities from NOTES
    const rawNotes = colNotes !== -1 ? String(row[colNotes] ?? "").trim() : "";
    const cap20Match = rawNotes.match(/([\d.,]+)\s*Carton\/Cont\s*20/i);
    const cap40Match = rawNotes.match(/([\d.,]+)\s*Carton\/Cont\s*40/i);
    const capacity20ft = cap20Match ? parseNumberWithDots(cap20Match[1]) : null;
    const capacity40hc = cap40Match ? parseNumberWithDots(cap40Match[1]) : null;

    const rawUnit = colUnit !== -1 ? String(row[colUnit] ?? "").trim() : "";
    const unit =
      rawUnit.toLowerCase() === "package"
        ? "Thùng"
        : rawUnit || "Thùng";

    let sku =
      colSku !== -1 && String(row[colSku] ?? "").trim()
        ? String(row[colSku]).trim().toUpperCase()
        : buildAutoSku(viName, category, netWeightGrams, results.length + 1);

    if (usedSkus.has(sku)) {
      sku = `${sku}-${results.length + 1}`;
    }
    usedSkus.add(sku);

    results.push({
      sku,
      name: viName,
      englishName,
      category,
      specification: rawSpecs || `${packsPerCarton} gói/thùng`,
      unit,
      netWeightGrams,
      packsPerCarton,
      cartonDimensions,
      cbm,
      capacity20ft,
      capacity40hc,
    });
  }

  return results;
}
