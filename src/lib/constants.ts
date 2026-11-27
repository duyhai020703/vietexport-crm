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
    key: "CONTACTED",
    label: "Contacted",
    viLabel: "Đã liên hệ",
    description: "Đã gửi email/tin nhắn chào hàng",
    color: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
    headerBg: "bg-white border-t-[#1677FF]",
    badge: "bg-[#EBF4FF] text-[#1677FF]",
  },
  {
    key: "INQUIRY_QUALIFIED",
    label: "Inquiry / Qualified",
    viLabel: "Đang hỏi hàng",
    description: "Khách có phản hồi, đang hỏi thông tin/quy cách",
    color: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
    headerBg: "bg-white border-t-[#3B82F6]",
    badge: "bg-[#EBF4FF] text-[#1D4ED8]",
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
    key: "SAMPLE_SENT",
    label: "Sample Sent",
    viLabel: "Đã gửi mẫu",
    description: "Đã gửi mẫu thử, đang chờ feedback",
    color: "bg-[#FFF7ED] text-[#D97706] border-[#FED7AA]",
    headerBg: "bg-white border-t-[#F59E0B]",
    badge: "bg-[#FEF3C7] text-[#B45309]",
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
    key: "DORMANT",
    label: "Dormant",
    viLabel: "Ngủ đông",
    description: "Khách cũ đã mua nhưng quá 3-6 tháng chưa đặt lại",
    color: "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]",
    headerBg: "bg-white border-t-[#64748B]",
    badge: "bg-[#F1F5F9] text-slate-700",
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
  { value: "CONFIRMED", label: "Đã xác nhận", color: "bg-[#FFF7ED] text-[#D97706] border-[#FED7AA]" },
  { value: "SHIPPED", label: "Đang giao hàng", color: "bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên (Admin)",
  MANAGER: "Quản lý (Manager)",
  SALE: "Nhân viên Sale",
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

