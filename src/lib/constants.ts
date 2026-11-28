export const PIPELINE_STAGES = [
  {
    key: "NEW_LEAD",
    label: "New Lead",
    viLabel: "Khách mới",
    description: "Khách mới tìm được, chưa liên hệ",
    color: "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]",
    headerBg: "bg-white border-t-[#94A3B8]",
    badge: "bg-[#F1F5F9] text-slate-700",
  },
  {
    key: "QUOTED",
    label: "Quoted",
    viLabel: "Đã báo giá",
    description: "Đã gửi bảng báo giá",
    color: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
    headerBg: "bg-white border-t-[#0284C7]",
    badge: "bg-[#E0F2FE] text-[#0369A1]",
  },
  {
    key: "NEGOTIATING",
    label: "Negotiating",
    viLabel: "Đang đàm phán",
    description: "Đang đàm phán giá cuối, hợp đồng, thanh toán",
    color: "bg-[#FFF7ED] text-[#D97706] border-[#FED7AA]",
    headerBg: "bg-white border-t-[#EA580C]",
    badge: "bg-[#FFEDD5] text-[#C2410C]",
  },
  {
    key: "ACTIVE_WON",
    label: "Active / Won",
    viLabel: "Đã chốt đơn",
    description: "Đã chốt đơn thành công",
    color: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
    headerBg: "bg-white border-t-[#10B981]",
    badge: "bg-[#D1FAE5] text-[#047857]",
  },
  {
    key: "LOST",
    label: "Lost",
    viLabel: "Thất bại",
    description: "Khách từ chối / không chốt được",
    color: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    headerBg: "bg-white border-t-[#EF4444]",
    badge: "bg-[#FEE2E2] text-[#B91C1C]",
  },
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number]["key"];

export const CHANNEL_OPTIONS = [
  { value: "IMPORTER", label: "Importer (Nhà nhập khẩu)" },
  { value: "DISTRIBUTOR", label: "Distributor (Nhà phân phối)" },
  { value: "SUPERMARKET", label: "Supermarket (Chuỗi siêu thị)" },
  { value: "OEM", label: "OEM (Gia công thương hiệu)" },
  { value: "TRADING", label: "Trading (Công ty thương mại)" },
] as const;

export const SOURCE_OPTIONS = [
  { value: "TRADE_FAIR", label: "Hội chợ" },
  { value: "B2B_PLATFORM", label: "Sàn B2B" },
  { value: "CUSTOMS_DATA", label: "Data hải quan" },
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Giới thiệu" },
] as const;

export const ORDER_STATUS_OPTIONS = [
  { value: "QUOTED", label: "Đã báo giá", color: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
  { value: "CONFIRMED", label: "Đã xác nhận HĐ", color: "bg-[#FFF7ED] text-[#D97706] border-[#FED7AA]" },
  { value: "IN_PRODUCTION", label: "Đang sản xuất", color: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]" },
  { value: "READY_TO_SHIP", label: "Chờ xuất / Đóng cont", color: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]" },
  { value: "SHIPPED", label: "Đang đi biển (On Board)", color: "bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]" },
] as const;

export const INCOTERM_OPTIONS = ["EXW", "FOB", "CFR", "CIF"] as const;

export const PRODUCT_CATEGORY_OPTIONS = [
  "Siêu Mỏng",
  "Cuốn",
  "Chả giò / Đa nem",
  "Mè",
  "Trộn / Gia vị",
  "OEM",
] as const;

export const ORDER_PAYMENT_STATUS_OPTIONS = [
  "Cọc",
  "Chưa thanh toán",
  "Công nợ",
  "Đã thanh toán",
] as const;

export const DEFAULT_CONTAINER_TYPES = [
  "20ft",
  "40ft",
  "40HC",
  "LCL",
] as const;

export const LOST_REASON_PRESETS = [
  "Giá cao hơn đối thủ",
  "MOQ quá cao",
  "Thiếu chứng nhận (FDA/HACCP/Halal...)",
  "Không đạt test mẫu",
  "Cước tàu quá cao",
  "Điều khoản thanh toán chưa phù hợp",
] as const;

export const QUOTE_APPROVAL_META: Record<string, { label: string; color: string }> = {
  AUTO_APPROVED: { label: "Đã duyệt (Tự động)", color: "bg-[#ECFDF5] text-[#059669]" },
  APPROVED: { label: "Đã duyệt (TP)", color: "bg-[#ECFDF5] text-[#059669]" },
  PENDING_APPROVAL: { label: "Chờ TP duyệt", color: "bg-[#FFF7ED] text-[#D97706]" },
  REJECTED: { label: "Từ chối duyệt", color: "bg-[#FEF2F2] text-[#DC2626]" },
};

export const SPECS_CHECK_META: Record<string, { label: string; color: string }> = {
  NOT_REQUIRED: { label: "Không cần", color: "bg-slate-100 text-slate-600" },
  PENDING: { label: "Đang check R&D/QA", color: "bg-[#FFF7ED] text-[#D97706]" },
  FEASIBLE: { label: "Làm được", color: "bg-[#ECFDF5] text-[#059669]" },
  NOT_FEASIBLE: { label: "Không đáp ứng", color: "bg-[#FEF2F2] text-[#DC2626]" },
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Trưởng phòng (Admin)",
  MANAGER: "Quản lý (Manager)",
  SALES_ADMIN: "Sales Admin (Điều phối)",
  SALE: "Sale Export",
};

export function getStageMeta(stage: string) {
  return (
    PIPELINE_STAGES.find((s) => s.key === stage) ?? PIPELINE_STAGES[0]
  );
}

export function getChannelLabel(channel: string) {
  return CHANNEL_OPTIONS.find((c) => c.value === channel)?.label ?? channel;
}

export function getSourceLabel(source: string) {
  return SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;
}

export function getOrderStatusMeta(status: string) {
  return (
    ORDER_STATUS_OPTIONS.find((s) => s.value === status) ??
    ORDER_STATUS_OPTIONS[0]
  );
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * BRD Formula: Sản lượng (Tấn) = [Net Weight (g) × Số gói/thùng × Số thùng] / 1,000,000
 */
export function calculateTons(
  netWeightGrams: number,
  packsPerCarton: number,
  quantityCartons: number
): number {
  return Number(
    ((netWeightGrams * packsPerCarton * quantityCartons) / 1_000_000).toFixed(2)
  );
}

export function calculateKg(
  netWeightGrams: number,
  packsPerCarton: number,
  quantityCartons: number
): number {
  return Number(
    ((netWeightGrams * packsPerCarton * quantityCartons) / 1000).toFixed(2)
  );
}

/**
 * Tự động tính khối lượng (kg) từ gram/gói (trong tên sản phẩm hoặc quy cách),
 * số gói/thùng (trong quy cách hoặc thông số SKU) và số lượng thùng.
 */
export function computeOrderItemWeightKg(params: {
  productName?: string | null;
  specification?: string | null;
  netWeightGrams?: number | null;
  packsPerCarton?: number | null;
  quantity: number;
}): number {
  const { productName, specification, netWeightGrams, packsPerCarton, quantity } =
    params;
  if (!quantity || quantity <= 0 || isNaN(quantity)) return 0;

  const parseGrams = (text?: string | null): number | null => {
    if (!text) return null;
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gam|gram)\b/i);
    if (!m) return null;
    const val = Number(m[1].replace(",", "."));
    return isNaN(val) || val <= 0 ? null : val;
  };

  const parsePacks = (text?: string | null): number | null => {
    if (!text) return null;
    const m = text.match(/(\d+)\s*(?:gói|túi|bịch|xấp|pack|packs|pcs)\b/i);
    if (!m) return null;
    const val = Number(m[1]);
    return isNaN(val) || val <= 0 ? null : val;
  };

  const grams =
    parseGrams(productName) ??
    parseGrams(specification) ??
    (netWeightGrams && netWeightGrams > 0 ? netWeightGrams : 0);

  const packs =
    parsePacks(specification) ??
    (packsPerCarton && packsPerCarton > 0 ? packsPerCarton : 0);

  if (grams <= 0 || packs <= 0) return 0;
  return Number(((grams * packs * quantity) / 1000).toFixed(2));
}

export function isOverdueSevenDays(
  stage: string,
  lastActivityAt: string | Date
): boolean {
  if (stage !== "QUOTED") return false;
  const diffMs = Date.now() - new Date(lastActivityAt).getTime();
  return diffMs > 7 * 24 * 60 * 60 * 1000;
}
