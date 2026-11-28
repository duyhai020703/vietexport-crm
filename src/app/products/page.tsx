"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Edit2, FileSpreadsheet, Package, Plus, Search, Trash2, Upload, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import CustomSelect from "@/components/ui/CustomSelect";
import type { ProductDTO, UserDTO } from "@/types/crm";
import { formatUSD, PRODUCT_CATEGORY_OPTIONS } from "@/lib/constants";
import {
  parseProductsFromExcelBuffer,
  type ParsedExcelProduct,
} from "@/lib/excelProductParser";

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [category, setCategory] = useState("");
  const [specification, setSpecification] = useState("");
  const [unit, setUnit] = useState("Thùng");
  const [netWeightGrams, setNetWeightGrams] = useState("300");
  const [packsPerCarton, setPacksPerCarton] = useState("40");
  const [cartonDimensions, setCartonDimensions] = useState("46 x 37 x 34");
  const [cbm, setCbm] = useState("0.058");
  const [capacity20ft, setCapacity20ft] = useState("480");
  const [capacity40hc, setCapacity40hc] = useState("1150");
  const [costPrice, setCostPrice] = useState("0");
  const [minMarginPercent, setMinMarginPercent] = useState("15");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Import Excel state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedExcelProduct[]>([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const [pRes, uRes] = await Promise.all([
        fetch(`/api/products?${params.toString()}`),
        fetch("/api/users"),
      ]);
      const [pData, uData] = await Promise.all([pRes.json(), uRes.json()]);
      if (pRes.ok) setProducts(pData.products ?? []);
      if (uRes.ok) setCurrentUser(uData.currentUser ?? null);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 200);
    return () => clearTimeout(t);
  }, [loadProducts]);

  const filteredProducts = products.filter((p) => {
    if (categoryFilter === "ALL") return true;
    return p.category === categoryFilter;
  });

  const isManagerOrAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  function openCreate() {
    setEditing(null);
    setSku("");
    setName("");
    setEnglishName("");
    setCategory("Siêu Mỏng");
    setSpecification("");
    setUnit("Thùng");
    setNetWeightGrams("300");
    setPacksPerCarton("40");
    setCartonDimensions("46 x 37 x 34");
    setCbm("0.058");
    setCapacity20ft("480");
    setCapacity40hc("1150");
    setCostPrice("0");
    setMinMarginPercent("15");
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(p: ProductDTO) {
    setEditing(p);
    setSku(p.sku);
    setName(p.name);
    setEnglishName(p.englishName ?? "");
    setCategory(p.category ?? "");
    setSpecification(p.specification ?? "");
    setUnit(p.unit);
    setNetWeightGrams(String(p.netWeightGrams ?? 300));
    setPacksPerCarton(String(p.packsPerCarton ?? 40));
    setCartonDimensions(p.cartonDimensions ?? "");
    setCbm(p.cbm !== null ? String(p.cbm) : "");
    setCapacity20ft(p.capacity20ft !== null ? String(p.capacity20ft) : "");
    setCapacity40hc(p.capacity40hc !== null ? String(p.capacity40hc) : "");
    setCostPrice(p.costPrice !== undefined ? String(p.costPrice) : "0");
    setMinMarginPercent(String(p.minMarginPercent ?? 15));
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!sku.trim() || !name.trim() || !unit.trim()) {
      setFormError("Vui lòng nhập đầy đủ Mã SKU, Tên sản phẩm và Đơn vị tính.");
      return;
    }

    setSaving(true);
    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim(),
          englishName: englishName.trim() || null,
          category: category.trim() || null,
          specification: specification.trim() || null,
          unit: unit.trim(),
          netWeightGrams: Number(netWeightGrams) || 300,
          packsPerCarton: Number(packsPerCarton) || 40,
          cartonDimensions: cartonDimensions.trim() || null,
          cbm: cbm ? Number(cbm) : null,
          capacity20ft: capacity20ft ? Number(capacity20ft) : null,
          capacity40hc: capacity40hc ? Number(capacity40hc) : null,
          ...(isManagerOrAdmin ? { costPrice: Number(costPrice) || 0 } : {}),
          minMarginPercent: Number(minMarginPercent) || 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Không thể lưu sản phẩm.");
        return;
      }
      setModalOpen(false);
      loadProducts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: ProductDTO) {
    if (!confirm(`Xác nhận xóa mã hàng "${p.sku} - ${p.name}"?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Không thể xóa sản phẩm.");
      return;
    }
    loadProducts();
  }

  async function handleExcelFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseProductsFromExcelBuffer(buffer);
      if (parsed.length === 0) {
        alert("Không tìm thấy dữ liệu sản phẩm hợp lệ trong file Excel.");
        return;
      }
      setImportRows(parsed);
      setImportOpen(true);
    } catch {
      alert("Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx / .xls.");
    }
  }

  async function handleConfirmImport() {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: importRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Import thất bại.");
        return;
      }
      setImportOpen(false);
      setImportRows([]);
      alert(
        `Import thành công: ${data.createdCount} mã mới, ${data.updatedCount} mã cập nhật.`
      );
      loadProducts();
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppShell
      onUserChanged={(u) => {
        setCurrentUser(u);
        loadProducts();
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Thư viện Sản phẩm Chuẩn (Product Master)
            </h1>
            <p className="text-sm text-slate-500">
              SKU, Net Weight, Quy cách thùng, CBM, định mức Container 20ft/40HC và giá bán
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-[#E5EAF2] hover:bg-slate-50 shadow-2xs"
            >
              <Upload className="w-4 h-4 text-[#059669]" />
              Import Excel
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Thêm mã hàng
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5EAF2] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã SKU, tên hàng, quy cách..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>
          <CustomSelect
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            options={[
              { value: "ALL", label: "Tất cả Phân loại" },
              ...PRODUCT_CATEGORY_OPTIONS.map((cat) => ({
                value: cat,
                label: cat,
              })),
            ]}
            className="w-52"
          />
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading && filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5EAF2] p-8 text-center text-slate-500 text-sm">
              Đang tải danh mục sản phẩm...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5EAF2] p-8 text-center text-slate-500 text-sm">
              Chưa có mã hàng nào.
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-[#E5EAF2] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60 font-mono text-[11px] font-semibold">
                      {p.sku}
                    </span>
                    <div className="font-bold text-slate-900 text-sm mt-1">
                      {p.name}
                    </div>
                    {p.englishName && (
                      <div className="text-xs text-slate-500">
                        {p.englishName}
                      </div>
                    )}
                    {p.category && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {p.unit}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-600 grid grid-cols-2 gap-1">
                  <span>Net: {p.netWeightGrams}g × {p.packsPerCarton} gói</span>
                  <span>CBM: {p.cbm ?? "—"}</span>
                  <span>20ft: {p.capacity20ft ?? "—"} th</span>
                  <span>40HC: {p.capacity40hc ?? "—"} th</span>
                </div>
                <div className="flex items-center justify-end gap-1 pt-2 border-t border-[#EEF2F7]">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#1677FF] hover:bg-[#EBF4FF]"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop & Tablet Table */}
        <div className="hidden md:block bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã SKU</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Tên sản phẩm</th>
                  <th className="py-3 px-4">Net Weight / Quy cách</th>
                  <th className="py-3 px-4">Kích thước / CBM</th>
                  <th className="py-3 px-4">Định mức Cont</th>
                  {isManagerOrAdmin && (
                    <th className="py-3 px-4 text-right">Giá vốn</th>
                  )}
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7] text-sm">
                {loading && filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isManagerOrAdmin ? 8 : 7}
                      className="py-10 text-center text-slate-500"
                    >
                      Đang tải danh mục sản phẩm...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isManagerOrAdmin ? 8 : 7}
                      className="py-10 text-center text-slate-500"
                    >
                      Chưa có mã hàng nào.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60">
                          {p.sku}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.category ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                            {p.category}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{p.name}</span>
                        </div>
                        {p.englishName && (
                          <div className="text-xs font-normal text-slate-600 pl-6">
                            {p.englishName}
                          </div>
                        )}
                        {p.specification && (
                          <div className="text-xs font-normal text-slate-500 pl-6">
                            {p.specification}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        <div className="font-semibold">
                          {p.netWeightGrams}g / gói
                        </div>
                        <div className="text-slate-500">
                          {p.packsPerCarton} gói / {p.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <div>{p.cartonDimensions || "—"} cm</div>
                        <div className="text-slate-500">
                          CBM: {p.cbm ?? "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        <div>20ft: {p.capacity20ft ?? "—"} th</div>
                        <div>40HC: {p.capacity40hc ?? "—"} th</div>
                      </td>
                      {isManagerOrAdmin && (
                        <td className="py-3 px-4 text-right font-medium text-amber-700 whitespace-nowrap tabular-nums">
                          {formatUSD(p.costPrice ?? 0)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1677FF] hover:bg-[#EBF4FF]"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editing
                  ? `Cập nhật Mã hàng (${editing.sku})`
                  : "Thêm Mã hàng Xuất khẩu"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mã SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="VD: SKU-BT22-300"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-[#1677FF] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tên sản phẩm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Bánh tráng siêu mỏng 22cm 300g"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1677FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Net Weight (g/gói)
                  </label>
                  <input
                    type="number"
                    value={netWeightGrams}
                    onChange={(e) => setNetWeightGrams(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Số gói / thùng
                  </label>
                  <input
                    type="number"
                    value={packsPerCarton}
                    onChange={(e) => setPacksPerCarton(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Đơn vị tính <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kích thước thùng (cm)
                  </label>
                  <input
                    type="text"
                    value={cartonDimensions}
                    onChange={(e) => setCartonDimensions(e.target.value)}
                    placeholder="46 x 37 x 34"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Thể tích CBM
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={cbm}
                    onChange={(e) => setCbm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Margin tối thiểu (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={minMarginPercent}
                    onChange={(e) => setMinMarginPercent(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Định mức Cont 20ft (thùng)
                  </label>
                  <input
                    type="number"
                    value={capacity20ft}
                    onChange={(e) => setCapacity20ft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Định mức Cont 40HC (thùng)
                  </label>
                  <input
                    type="number"
                    value={capacity40hc}
                    onChange={(e) => setCapacity40hc(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tên tiếng Anh (Commodity)
                  </label>
                  <input
                    type="text"
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    placeholder="VD: Tan Nhien Super thin Rice paper 300 g"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                {isManagerOrAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-amber-700 mb-1">
                      Giá vốn / Giá sàn (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <div className={isManagerOrAdmin ? "sm:col-span-2" : "sm:col-span-2"}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mô tả quy cách đóng gói
                  </label>
                  <input
                    type="text"
                    value={specification}
                    onChange={(e) => setSpecification(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phân loại
                  </label>
                  <input
                    type="text"
                    list="product-category-options"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Siêu Mỏng, Cuốn, Đa nem, Mè..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <datalist id="product-category-options">
                    {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu mã hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Import Excel Preview Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5EAF2] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF2] bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-[#059669]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Xem trước dữ liệu Import Excel ({importRows.length} mã hàng)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Đã tự động tách Tên Anh/Việt, ánh xạ Phân loại, Net Weight, Số gói/thùng, CBM &amp; Định mức Cont (bỏ qua cột Giá &amp; Ảnh)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {importError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {importError}
                </div>
              )}

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-slate-500 uppercase">
                    <th className="py-2 px-2.5">Mã SKU</th>
                    <th className="py-2 px-2.5">Phân loại</th>
                    <th className="py-2 px-2.5">Tên sản phẩm (Việt / Anh)</th>
                    <th className="py-2 px-2.5">Net / Quy cách</th>
                    <th className="py-2 px-2.5">Size / CBM</th>
                    <th className="py-2 px-2.5">Cont 20 / 40HC</th>
                    <th className="py-2 px-2.5 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {importRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) =>
                            setImportRows((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? { ...r, sku: e.target.value.toUpperCase() }
                                  : r
                              )
                            )
                          }
                          className="w-36 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <CustomSelect
                          value={row.category}
                          onChange={(val) =>
                            setImportRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, category: val } : r
                              )
                            )
                          }
                          options={PRODUCT_CATEGORY_OPTIONS.map((cat) => ({
                            value: cat,
                            label: cat,
                          }))}
                          className="min-w-[140px]"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="font-semibold text-slate-900">
                          {row.name}
                        </div>
                        {row.englishName && (
                          <div className="text-slate-500">{row.englishName}</div>
                        )}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {row.netWeightGrams}g • {row.packsPerCarton} gói/th
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {row.cartonDimensions || "—"} ({row.cbm ?? "—"})
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {row.capacity20ft ?? "—"} / {row.capacity40hc ?? "—"}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setImportRows((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E5EAF2] bg-[#F8FAFC]">
              <span className="text-xs text-slate-500">
                SKU trùng sẽ được cập nhật thông số mới; SKU mới sẽ được thêm vào danh mục.
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-200/70 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={importing || importRows.length === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#059669] hover:bg-emerald-700 disabled:opacity-50"
                >
                  {importing
                    ? "Đang Import..."
                    : `Xác nhận Import (${importRows.length} mã)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
