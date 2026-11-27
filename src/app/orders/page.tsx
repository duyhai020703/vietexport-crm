"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  FileText,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import type {
  CustomerDTO,
  OrderDTO,
  ProductDTO,
  UserDTO,
} from "@/types/crm";
import {
  formatNumber,
  formatUSD,
  getOrderStatusMeta,
  INCOTERM_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "@/lib/constants";

interface DraftItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

function getOrderAlerts(order: OrderDTO): string[] {
  const alerts: string[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (order.etd && order.status !== "SHIPPED" && order.status !== "COMPLETED") {
    const daysToEtd = (new Date(order.etd).getTime() - now) / dayMs;
    if (daysToEtd <= 7 && daysToEtd >= -3) {
      alerts.push(
        daysToEtd < 0
          ? "Quá ETD chưa xuất tàu!"
          : `Sắp ETD (${Math.ceil(daysToEtd)} ngày) — Kiểm tra hàng/booking`
      );
    }
  }

  if (order.eta && order.status !== "COMPLETED") {
    const daysToEta = (new Date(order.eta).getTime() - now) / dayMs;
    const unpaid = order.totalAmount - order.paidAmount;
    const docsMissing =
      !order.docsStatus ||
      order.docsStatus.toLowerCase().includes("chưa");
    if (daysToEta <= 5 && (unpaid > 0 || docsMissing)) {
      alerts.push("Khẩn (<5d ETA): Chưa xong chứng từ hoặc còn công nợ!");
    }
  }

  return alerts;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Order Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [orderType, setOrderType] = useState<"STANDARD" | "OEM">("STANDARD");
  const [incoterm, setIncoterm] = useState<"EXW" | "FOB" | "CFR" | "CIF">("FOB");
  const [orderDate, setOrderDate] = useState("");
  const [status, setStatus] = useState<OrderDTO["status"]>("CONFIRMED");
  const [containerCount, setContainerCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // 6-step Coordination & Payment Drawer/Modal
  const [coordOrder, setCoordOrder] = useState<OrderDTO | null>(null);
  const [coordForm, setCoordForm] = useState({
    poNumber: "",
    status: "CONFIRMED" as OrderDTO["status"],
    contractDate: "",
    estProductionDate: "",
    actualProductionDate: "",
    packagingStatus: "",
    qaQcStatus: "",
    stuffingDate: "",
    etd: "",
    eta: "",
    docsStatus: "",
    dhlTracking: "",
    containerCount: "1",
  });
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState<"DEPOSIT" | "BALANCE" | "OTHER">("DEPOSIT");
  const [paySwift, setPaySwift] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [coordSaving, setCoordSaving] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setOrders(data.orders ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const loadMasterData = useCallback(async () => {
    const [custRes, prodRes, userRes] = await Promise.all([
      fetch("/api/customers"),
      fetch("/api/products"),
      fetch("/api/users"),
    ]);
    const [custData, prodData, userData] = await Promise.all([
      custRes.json(),
      prodRes.json(),
      userRes.json(),
    ]);
    setCustomers(custData.customers ?? []);
    setProducts(prodData.products ?? []);
    setCurrentUser(userData.currentUser ?? null);
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    const t = setTimeout(loadOrders, 200);
    return () => clearTimeout(t);
  }, [loadOrders]);

  function openCreateModal() {
    setFormError("");
    setCustomerId(customers[0]?.id ?? "");
    setPoNumber("");
    setOrderType("STANDARD");
    setIncoterm("FOB");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setStatus("CONFIRMED");
    setContainerCount("1");
    setNotes("");
    const defaultProd = products[0];
    setItems(
      defaultProd
        ? [
            {
              productId: defaultProd.id,
              quantity: defaultProd.capacity40hc ?? 1000,
              unitPrice: defaultProd.basePrice,
            },
          ]
        : []
    );
    setModalOpen(true);
  }

  function openCoordModal(order: OrderDTO) {
    setCoordOrder(order);
    setCoordForm({
      poNumber: order.poNumber ?? "",
      status: order.status,
      contractDate: order.contractDate ? order.contractDate.slice(0, 10) : "",
      estProductionDate: order.estProductionDate
        ? order.estProductionDate.slice(0, 10)
        : "",
      actualProductionDate: order.actualProductionDate
        ? order.actualProductionDate.slice(0, 10)
        : "",
      packagingStatus: order.packagingStatus ?? "",
      qaQcStatus: order.qaQcStatus ?? "",
      stuffingDate: order.stuffingDate ? order.stuffingDate.slice(0, 10) : "",
      etd: order.etd ? order.etd.slice(0, 10) : "",
      eta: order.eta ? order.eta.slice(0, 10) : "",
      docsStatus: order.docsStatus ?? "",
      dhlTracking: order.dhlTracking ?? "",
      containerCount: String(order.containerCount ?? 1),
    });
    setPayAmount("");
    setPaySwift("");
    setPayNotes("");
  }

  async function handleSaveCoordination(e: React.FormEvent) {
    e.preventDefault();
    if (!coordOrder) return;
    setCoordSaving(true);
    try {
      const res = await fetch(`/api/orders/${coordOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...coordForm,
          containerCount: Number(coordForm.containerCount) || 1,
        }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setCoordOrder(data.order);
        loadOrders();
      } else {
        alert(data.error || "Không thể lưu điều phối.");
      }
    } finally {
      setCoordSaving(false);
    }
  }

  async function handleAddPayment() {
    if (!coordOrder || !payAmount) return;
    setCoordSaving(true);
    try {
      const res = await fetch(`/api/orders/${coordOrder.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: payType,
          amount: Number(payAmount),
          swiftRef: paySwift,
          notes: payNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoordOrder((prev) =>
          prev
            ? {
                ...prev,
                paidAmount: data.paidAmount,
                payments: [...(prev.payments ?? []), data.payment],
              }
            : null
        );
        setPayAmount("");
        setPaySwift("");
        setPayNotes("");
        loadOrders();
      } else {
        alert(data.error || "Không thể ghi nhận thanh toán.");
      }
    } finally {
      setCoordSaving(false);
    }
  }

  function updateItem(
    idx: number,
    field: keyof DraftItem,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "productId") {
          const prod = products.find((p) => p.id === value);
          return {
            ...item,
            productId: String(value),
            unitPrice: prod ? prod.basePrice : item.unitPrice,
          };
        }
        return { ...item, [field]: Number(value) };
      })
    );
  }

  const draftTotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!customerId || items.length === 0) {
      setFormError("Vui lòng chọn khách hàng và ít nhất 1 SKU.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          poNumber,
          orderType,
          incoterm,
          orderDate,
          status,
          containerCount: Number(containerCount) || 1,
          notes,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Không thể tạo đơn hàng.");
        return;
      }
      setModalOpen(false);
      loadOrders();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrder(order: OrderDTO) {
    if (!confirm(`Xác nhận xóa đơn hàng "${order.orderCode}"?`)) return;
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) {
      loadOrders();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể xóa đơn hàng.");
    }
  }

  return (
    <AppShell
      onUserChanged={(u) => {
        setCurrentUser(u);
        loadMasterData();
        loadOrders();
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Điều phối Đơn hàng, Sản xuất, Công nợ &amp; Logistics (6 Bước)
            </h1>
            <p className="text-sm text-slate-500">
              Theo dõi PO, Lịch sản xuất, QA/QC, Thanh toán Deposit/Balance, ETD/ETA và Chứng từ
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tạo đơn hàng mới
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E5EAF2] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn ORD, số PO, tên công ty..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            {ORDER_STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {orders.map((order) => {
            const statusMeta = getOrderStatusMeta(order.status);
            const pct =
              order.totalAmount > 0
                ? Math.round((order.paidAmount / order.totalAmount) * 100)
                : 0;
            const alerts = getOrderAlerts(order);
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-[#E5EAF2] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60 font-mono text-[11px] font-semibold">
                      <FileText className="w-3 h-3" />
                      {order.orderCode} {order.poNumber ? `/ ${order.poNumber}` : ""}
                    </span>
                    <div className="font-bold text-slate-900 text-sm mt-1">
                      {order.customer.companyName}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.color}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                {alerts.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{alerts[0]}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    Thanh toán:{" "}
                    <strong className="text-slate-900">
                      {formatUSD(order.paidAmount)} / {formatUSD(order.totalAmount)} ({pct}%)
                    </strong>
                  </div>
                  <div>
                    ETD:{" "}
                    <strong>
                      {order.etd
                        ? new Date(order.etd).toLocaleDateString("vi-VN")
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#EEF2F7]">
                  <button
                    type="button"
                    onClick={() => openCoordModal(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EBF4FF] text-[#1677FF]"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Điều phối &amp; Thanh toán
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop & Tablet Table */}
        <div className="hidden md:block bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã Đơn / PO</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Lịch SX (DK / TT)</th>
                  <th className="py-3 px-4">Thanh toán (Tổng / Đã thu)</th>
                  <th className="py-3 px-4">ETD / ETA</th>
                  <th className="py-3 px-4">Chứng từ (B/L, C/O)</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7] text-sm">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Đang tải đơn hàng...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const statusMeta = getOrderStatusMeta(order.status);
                    const pct =
                      order.totalAmount > 0
                        ? Math.round((order.paidAmount / order.totalAmount) * 100)
                        : 0;
                    const alerts = getOrderAlerts(order);

                    return (
                      <tr key={order.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60">
                            <FileText className="w-3.5 h-3.5" />
                            {order.orderCode}
                          </span>
                          {order.poNumber && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {order.poNumber} • {order.containerCount} cont
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {order.customer.companyName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.customer.countryRegion} • {order.salesRep.name}
                          </div>
                          {alerts.map((al, i) => (
                            <div
                              key={i}
                              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-medium"
                            >
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {al}
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          <div>
                            DK:{" "}
                            {order.estProductionDate
                              ? new Date(
                                  order.estProductionDate
                                ).toLocaleDateString("vi-VN")
                              : "—"}
                          </div>
                          <div className="text-slate-500">
                            TT:{" "}
                            {order.actualProductionDate
                              ? new Date(
                                  order.actualProductionDate
                                ).toLocaleDateString("vi-VN")
                              : "Chưa xong"}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-xs font-bold text-slate-900 tabular-nums">
                            {formatUSD(order.paidAmount)} /{" "}
                            {formatUSD(order.totalAmount)} ({pct}%)
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 100 ? "bg-[#059669]" : "bg-[#1677FF]"
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          <div>
                            ETD:{" "}
                            {order.etd
                              ? new Date(order.etd).toLocaleDateString("vi-VN")
                              : "—"}
                          </div>
                          <div className="text-slate-500">
                            ETA:{" "}
                            {order.eta
                              ? new Date(order.eta).toLocaleDateString("vi-VN")
                              : "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          <div>{order.docsStatus || "Chưa làm"}</div>
                          {order.dhlTracking && (
                            <div className="text-[11px] font-mono text-slate-500">
                              {order.dhlTracking}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.color}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openCoordModal(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF4FF] text-[#1677FF] hover:bg-blue-100"
                              title="Điều phối 6 bước & Thanh toán"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              Điều phối
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Xóa đơn hàng"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Coordination 6-Step & Payment Modal */}
      {coordOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5EAF2] w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF2] bg-[#F8FAFC]">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Điều phối Đơn hàng {coordOrder.orderCode} —{" "}
                  {coordOrder.customer.companyName}
                </h2>
                <p className="text-xs text-slate-500">
                  Cập nhật 6 bước: Hợp đồng → Sản xuất → QA/QC → Thanh toán → Đóng cont (ETD/ETA) → Chứng từ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoordOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <form onSubmit={handleSaveCoordination} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Trạng thái đơn hàng
                    </label>
                    <select
                      value={coordForm.status}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          status: e.target.value as OrderDTO["status"],
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
                    >
                      {ORDER_STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Số PO khách hàng
                    </label>
                    <input
                      type="text"
                      value={coordForm.poNumber}
                      onChange={(e) =>
                        setCoordForm((f) => ({ ...f, poNumber: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Số Container
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={coordForm.containerCount}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          containerCount: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ngày ký HĐ (PI/SC)
                    </label>
                    <input
                      type="date"
                      value={coordForm.contractDate}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          contractDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Lịch SX dự kiến
                    </label>
                    <input
                      type="date"
                      value={coordForm.estProductionDate}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          estProductionDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Hoàn thành SX thực tế
                    </label>
                    <input
                      type="date"
                      value={coordForm.actualProductionDate}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          actualProductionDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tiến độ bao bì
                    </label>
                    <input
                      type="text"
                      value={coordForm.packagingStatus}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          packagingStatus: e.target.value,
                        }))
                      }
                      placeholder="VD: Đủ bao bì / Đang in..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kiểm tra QA/QC
                    </label>
                    <input
                      type="text"
                      value={coordForm.qaQcStatus}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          qaQcStatus: e.target.value,
                        }))
                      }
                      placeholder="VD: Đạt chuẩn xuất..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ngày đóng hàng (Stuffing)
                    </label>
                    <input
                      type="date"
                      value={coordForm.stuffingDate}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          stuffingDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ngày tàu chạy (ETD)
                    </label>
                    <input
                      type="date"
                      value={coordForm.etd}
                      onChange={(e) =>
                        setCoordForm((f) => ({ ...f, etd: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ngày tàu đến (ETA)
                    </label>
                    <input
                      type="date"
                      value={coordForm.eta}
                      onChange={(e) =>
                        setCoordForm((f) => ({ ...f, eta: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Mã vận đơn DHL / FedEx
                    </label>
                    <input
                      type="text"
                      value={coordForm.dhlTracking}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          dhlTracking: e.target.value,
                        }))
                      }
                      placeholder="VD: DHL-884920112"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tình trạng bộ chứng từ (Invoice, P/L, B/L, C/O, Health Cert)
                    </label>
                    <input
                      type="text"
                      value={coordForm.docsStatus}
                      onChange={(e) =>
                        setCoordForm((f) => ({
                          ...f,
                          docsStatus: e.target.value,
                        }))
                      }
                      placeholder="VD: B/L Telex, C/O EUR.1 xong"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={coordSaving}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] disabled:opacity-50"
                  >
                    {coordSaving ? "Đang lưu..." : "Lưu thông tin điều phối"}
                  </button>
                </div>
              </form>

              {/* Payments Section */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#1677FF]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Theo dõi Thanh toán &amp; Công nợ
                    </h3>
                  </div>
                  <div className="text-xs font-semibold">
                    Đã thu:{" "}
                    <span className="text-[#059669]">
                      {formatUSD(coordOrder.paidAmount)}
                    </span>{" "}
                    / Còn nợ:{" "}
                    <span className="text-rose-600">
                      {formatUSD(
                        Math.max(0, coordOrder.totalAmount - coordOrder.paidAmount)
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <select
                    value={payType}
                    onChange={(e) =>
                      setPayType(
                        e.target.value as "DEPOSIT" | "BALANCE" | "OTHER"
                      )
                    }
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  >
                    <option value="DEPOSIT">Đặt cọc (Deposit)</option>
                    <option value="BALANCE">Thanh toán nốt (Balance)</option>
                    <option value="OTHER">Đợt khác</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Số tiền (USD)"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Mã Swift / UNC"
                    value={paySwift}
                    onChange={(e) => setPaySwift(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Ghi chú"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={coordSaving || !payAmount}
                    onClick={handleAddPayment}
                    className="px-3 py-1.5 rounded bg-[#059669] text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    + Ghi nhận tiền về
                  </button>
                </div>

                {(coordOrder.payments?.length ?? 0) > 0 && (
                  <div className="space-y-1.5">
                    {coordOrder.payments!.map((p) => (
                      <div
                        key={p.id}
                        className="text-xs flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <div>
                          <span className="font-semibold text-[#1677FF]">
                            {p.paymentType}
                          </span>{" "}
                          —{" "}
                          <strong className="text-slate-900">
                            {formatUSD(p.amount)}
                          </strong>{" "}
                          {p.swiftRef && (
                            <span className="text-slate-500">
                              • Swift: {p.swiftRef}
                            </span>
                          )}
                          {p.notes && (
                            <span className="text-slate-500"> • {p.notes}</span>
                          )}
                        </div>
                        <span className="text-slate-400">
                          {p.paidDate
                            ? new Date(p.paidDate).toLocaleDateString("vi-VN")
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Tạo Đơn hàng Xuất khẩu Mới
                </h2>
                <p className="text-xs text-slate-500">
                  Mã đơn tự động sinh theo định dạng ORD-YY-XXX
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateOrder}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Khách hàng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} — {c.companyName} ({c.countryRegion})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Số PO khách hàng
                  </label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="VD: PO-910"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Loại đơn hàng
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) =>
                      setOrderType(e.target.value as "STANDARD" | "OEM")
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="OEM">OEM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Incoterms
                  </label>
                  <select
                    value={incoterm}
                    onChange={(e) =>
                      setIncoterm(
                        e.target.value as "EXW" | "FOB" | "CFR" | "CIF"
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {INCOTERM_OPTIONS.map((inc) => (
                      <option key={inc} value={inc}>
                        {inc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Số Container
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={containerCount}
                    onChange={(e) => setContainerCount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ngày đặt hàng
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as OrderDTO["status"])
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {ORDER_STATUS_OPTIONS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Chi tiết Mã hàng
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const p = products[0];
                      if (!p) return;
                      setItems((prev) => [
                        ...prev,
                        { productId: p.id, quantity: 500, unitPrice: p.basePrice },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EBF4FF] text-[#1677FF] text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm dòng
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                  >
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        updateItem(idx, "productId", e.target.value)
                      }
                      className="col-span-12 sm:col-span-6 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, "quantity", e.target.value)
                      }
                      className="col-span-5 sm:col-span-2 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(idx, "unitPrice", e.target.value)
                      }
                      className="col-span-5 sm:col-span-3 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                    />
                    <div className="col-span-2 sm:col-span-1 text-right">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-end gap-4 bg-[#EBF4FF] border border-[#BFDBFE] rounded-lg px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">
                    Tổng giá trị đơn hàng:
                  </span>
                  <span className="text-lg font-bold text-[#1677FF] tabular-nums">
                    {formatUSD(draftTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
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
                  {saving ? "Đang tạo..." : "Lưu đơn hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
