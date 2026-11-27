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
  TrendingUp,
  UserPlus,
  ShoppingBag,
} from "lucide-react";
import AppShell from "@/components/AppShell";
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
  };
  skuStats: {
    productId: string;
    sku: string;
    name: string;
    unit: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }[];
  pipelineDistribution: {
    stage: string;
    label: string;
    viLabel: string;
    count: number;
  }[];
  countryDistribution: {
    countryRegion: string;
    count: number;
  }[];
}

const PIE_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export default function DashboardPage() {
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [salesRepId, setSalesRepId] = useState("ALL");

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
      });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [month, year, salesRepId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const isManagerOrAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Báo cáo & Thống kê Kinh doanh Xuất khẩu
            </h1>
            <p className="text-sm text-slate-500">
              Tổng hợp sản lượng, doanh thu theo mã hàng (SKU) và hiệu suất chuyển đổi Pipeline
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            {isManagerOrAdmin && (
              <select
                value={salesRepId}
                onChange={(e) => setSalesRepId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">Tất cả Sale</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>KHÁCH HÀNG MỚI (THÁNG {month})</span>
              <UserPlus className="w-4 h-4 text-[#1677FF]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? "..." : data?.kpis.newCustomersCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tổng danh sách: {data?.kpis.totalCustomersCount ?? 0} khách
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>TỶ LỆ CHUYỂN ĐỔI (ACTIVE / WON)</span>
              <TrendingUp className="w-4 h-4 text-[#059669]" />
            </div>
            <div className="text-2xl font-bold text-[#059669] tabular-nums">
              {loading ? "..." : `${data?.kpis.conversionRate ?? 0}%`}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {data?.kpis.wonCustomersCount ?? 0} khách đã chốt đơn
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>DOANH THU THÁNG {month}/{year}</span>
              <DollarSign className="w-4 h-4 text-[#1677FF]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? "..." : formatUSD(data?.kpis.monthlyRevenue ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Từ các đơn Confirmed / Shipped / Completed
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5EAF2] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>SỐ ĐƠN THÀNH CÔNG</span>
              <ShoppingBag className="w-4 h-4 text-[#D97706]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? "..." : data?.kpis.monthlyOrdersCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Đơn hàng phát sinh trong tháng {month}
            </div>
          </div>
        </div>

        {/* SKU Table & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E5EAF2]">
              <h2 className="text-base font-bold text-slate-900">
                Thống kê Sản lượng & Doanh thu theo Mã hàng (SKU)
              </h2>
              <p className="text-xs text-slate-500">
                Tổng hợp từ các đơn hàng thành công trong tháng {month}/{year}
              </p>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Tên sản phẩm</th>
                    <th className="py-2.5 px-4 text-right">Tổng sản lượng</th>
                    <th className="py-2.5 px-4 text-right">Tổng doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7] text-sm">
                  {!data || data.skuStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
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
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-800 whitespace-nowrap tabular-nums">
                          {formatNumber(row.totalQuantity)} {row.unit}
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

          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Biểu đồ Doanh thu theo Mã hàng (USD)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              So sánh đóng góp doanh thu từng SKU
            </p>
            <div className="h-[280px] w-full">
              {data && data.skuStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.skuStats}
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="sku"
                      tick={{ fontSize: 11, fill: "#475569" }}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                    <Tooltip
                      formatter={(val) => formatUSD(Number(val ?? 0))}
                    />
                    <Bar
                      dataKey="totalRevenue"
                      name="Doanh thu"
                      fill="#1677FF"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Chưa có dữ liệu biểu đồ tháng này
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline & Country Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Phân bổ Khách hàng theo Giai đoạn Pipeline
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Số lượng khách hàng đang ở từng bước trong 9 giai đoạn bán hàng
            </p>
            <div className="h-[280px] w-full">
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
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5EAF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Phân bổ theo Quốc gia / Khu vực
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Tỷ trọng khách hàng xuất khẩu theo thị trường mục tiêu
            </p>
            <div className="h-[280px] w-full flex items-center">
              {data && data.countryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.countryDistribution}
                      dataKey="count"
                      nameKey="countryRegion"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {data.countryDistribution.map((_, index) => (
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
                  Chưa có dữ liệu quốc gia
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
