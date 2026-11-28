"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  Download,
  Printer,
  Scale,
  Ship,
  WalletCards,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import CustomSelect from "@/components/ui/CustomSelect";
import type { UserDTO } from "@/types/crm";
import { formatNumber, formatUSD } from "@/lib/constants";

interface DashboardData {
  kpis: {
    newCustomersCount: number;
    totalCustomersCount: number;
    wonCustomersCount: number;
    conversionRate: number;
    monthlyRevenue: number;
    monthlyOrdersCount: number;
    totalTons: number;
    totalContainers: number;
    totalUnpaidDebt: number;
  };
  skuStats: {
    productId: string;
    sku: string;
    name: string;
    unit: string;
    totalQuantity: number;
    totalTons: number;
    totalRevenue: number;
    orderCount: number;
  }[];
  countryRanking: {
    countryRegion: string;
    orderCount: number;
    totalTons: number;
    totalRevenue: number;
    sharePercent: number;
  }[];
  pipelineDistribution: {
    stage: string;
    label: string;
    viLabel: string;
    count: number;
  }[];
  lostReasonDistribution: {
    reason: string;
    count: number;
  }[];
}

const PIE_COLORS = [
  "#1677FF",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

export default function DashboardPage() {
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [salesRepId, setSalesRepId] = useState("ALL");
  const [dateMode, setDateMode] = useState<"ORDER_DATE" | "ETD">("ORDER_DATE");
  const [orderType, setOrderType] = useState<"ALL" | "STANDARD" | "OEM">("ALL");

  useEffect(() => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  }, []);

  const [users, setUsers] = useState<UserDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const json = await res.json();
    if (res.ok) {
      setUsers(json.users ?? []);
      setCurrentUser(json.currentUser ?? null);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        salesRepId,
        dateMode,
        orderType,
      });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [month, year, salesRepId, dateMode, orderType]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["SKU", "Ten San Pham", "So Thung", "San Luong (Tan)", "Doanh Thu (USD)"],
      ...data.skuStats.map((s) => [
        s.sku,
        `"${s.name}"`,
        String(s.totalQuantity),
        String(s.totalTons),
        String(s.totalRevenue),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BaoCao_XuatKhau_T${month}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isManagerOrAdmin =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "MANAGER" ||
    currentUser?.role === "SALES_ADMIN";

  return (
    <AppShell
      onUserChanged={(u) => {
        setCurrentUser(u);
        setSalesRepId("ALL");
        loadDashboard();
      }}
    >
      <div className="space-y-5">
        {/* Header & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Báo cáo Tổng hợp &amp; Phân tích Xuất khẩu (Dashboard)
            </h1>
            <p className="text-sm text-slate-500">
              Tự động quy đổi Sản lượng Tấn (MT), số Container, Công nợ và Xếp hạng Thị trường / SKU
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
            <CustomSelect
              value={dateMode}
              onChange={(v) => setDateMode(v as "ORDER_DATE" | "ETD")}
              options={[
                { value: "ORDER_DATE", label: "Mốc: Ngày ký HĐ (KPI Sale)" },
                { value: "ETD", label: "Mốc: Ngày tàu chạy (ETD)" },
              ]}
              className="col-span-2 sm:col-span-1 sm:w-56"
            />

            <CustomSelect
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                value: String(m),
                label: `Tháng ${m}`,
              }))}
              className="sm:w-28"
            />

            <CustomSelect
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              options={[year - 1, year, year + 1].map((y) => ({
                value: String(y),
                label: `Năm ${y}`,
              }))}
              className="sm:w-28"
            />

            <CustomSelect
              value={orderType}
              onChange={(v) => setOrderType(v as "ALL" | "STANDARD" | "OEM")}
              options={[
                { value: "ALL", label: "Standard & OEM" },
                { value: "STANDARD", label: "Chỉ Standard" },
                { value: "OEM", label: "Chỉ OEM" },
              ]}
              className="sm:w-40"
            />

            {isManagerOrAdmin && (
              <CustomSelect
                value={salesRepId}
                onChange={(v) => setSalesRepId(v)}
                options={[
                  { value: "ALL", label: "Tất cả Sale" },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
                className="sm:w-44"
              />
            )}

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-[#E5EAF2] text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Excel/CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-[#E5EAF2] text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* 4 BRD KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>TỔNG DOANH THU (T{month}/{year})</span>
              <DollarSign className="w-4 h-4 text-[#1677FF]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? "..." : formatUSD(data?.kpis.monthlyRevenue ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tỷ lệ chốt CRM: {data?.kpis.conversionRate ?? 0}% ({data?.kpis.wonCustomersCount ?? 0} Won)
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>TỔNG SẢN LƯỢNG (TẤN / MT)</span>
              <Scale className="w-4 h-4 text-[#059669]" />
            </div>
            <div className="text-2xl font-bold text-[#059669] tabular-nums">
              {loading ? "..." : `${formatNumber(data?.kpis.totalTons ?? 0)} Tấn`}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Quy đổi từ Net Weight × Số gói/thùng
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>ĐƠN HÀNG / CONTAINER</span>
              <Ship className="w-4 h-4 text-[#1677FF]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading
                ? "..."
                : `${data?.kpis.monthlyOrdersCount ?? 0} đơn / ${data?.kpis.totalContainers ?? 0} cont`}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Khách mới tháng {month}: {data?.kpis.newCustomersCount ?? 0}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>TỔNG CÔNG NỢ CHƯA THU</span>
              <WalletCards className="w-4 h-4 text-[#D97706]" />
            </div>
            <div className="text-2xl font-bold text-[#D97706] tabular-nums">
              {loading ? "..." : formatUSD(data?.kpis.totalUnpaidDebt ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tổng công nợ còn lại các đơn đang chạy
            </div>
          </div>
        </div>

        {/* SKU Ranking & Country Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E5EAF2]">
              <h2 className="text-base font-bold text-slate-900">
                Xếp hạng Mã hàng (SKU) bán chạy nhất
              </h2>
              <p className="text-xs text-slate-500">
                Số thùng, Sản lượng quy đổi (Tấn) và Doanh thu trong tháng {month}/{year}
              </p>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Tên sản phẩm</th>
                    <th className="py-2.5 px-4 text-right">Số thùng</th>
                    <th className="py-2.5 px-4 text-right">Sản lượng (Tấn)</th>
                    <th className="py-2.5 px-4 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7] text-sm">
                  {!data || data.skuStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500 text-sm"
                      >
                        Không có dữ liệu xuất khẩu trong tháng {month}/{year}.
                      </td>
                    </tr>
                  ) : (
                    data.skuStats.map((row) => (
                      <tr key={row.productId} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60">
                            {row.sku}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700 whitespace-nowrap tabular-nums">
                          {formatNumber(row.totalQuantity)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-800 whitespace-nowrap tabular-nums">
                          {formatNumber(row.totalTons)} Tấn
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#059669] whitespace-nowrap tabular-nums">
                          {formatUSD(row.totalRevenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E5EAF2]">
              <h2 className="text-base font-bold text-slate-900">
                Xếp hạng Thị trường theo Quốc gia
              </h2>
              <p className="text-xs text-slate-500">
                Thống kê số đơn, sản lượng Tấn và tỷ trọng doanh thu
              </p>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Thị trường</th>
                    <th className="py-2.5 px-4 text-right">Đơn</th>
                    <th className="py-2.5 px-4 text-right">Tấn</th>
                    <th className="py-2.5 px-4 text-right">Doanh thu (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7] text-sm">
                  {!data || data.countryRanking.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-500 text-sm"
                      >
                        Chưa có đơn hàng trong kỳ.
                      </td>
                    </tr>
                  ) : (
                    data.countryRanking.map((c) => (
                      <tr key={c.countryRegion} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {c.countryRegion}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {c.orderCount}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {formatNumber(c.totalTons)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#1677FF] whitespace-nowrap tabular-nums">
                          {formatUSD(c.totalRevenue)} ({c.sharePercent}%)
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pipeline & Lost Reason Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Phân bổ Khách hàng theo 5 giai đoạn Pipeline
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Theo dõi chuyển đổi phễu bán hàng
            </p>
            <div className="h-[260px] w-full">
              {data && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.pipelineDistribution}
                    margin={{ top: 10, right: 10, left: 0, bottom: 35 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#475569" }}
                      angle={-22}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#475569" }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Số khách hàng"
                      fill="#1677FF"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Phân tích Lý do Trượt đơn (Lost Reason)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Tổng hợp lý do khách hàng từ chối phục vụ nghiên cứu thị trường
            </p>
            <div className="h-[260px] w-full flex items-center">
              {data && data.lostReasonDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.lostReasonDistribution}
                      dataKey="count"
                      nameKey="reason"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {data.lostReasonDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full text-center text-sm text-slate-400">
                  Chưa có dữ liệu khách Lost
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
