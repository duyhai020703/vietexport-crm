"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, X, FileText } from "lucide-react";
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
  ORDER_STATUS_OPTIONS,
} from "@/lib/constants";

interface DraftItem {
  productId: string;
  quantity: number;
  unitPrice: number;
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
  const [orderDate, setOrderDate] = useState("");
  const [status, setStatus] = useState<OrderDTO["status"]>("QUOTED");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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
    setOrderDate(new Date().toISOString().slice(0, 10));
    setStatus("QUOTED");
    setNotes("");
    const defaultProd = products[0];
    setItems(
      defaultProd
        ? [
            {
              productId: defaultProd.id,
              quantity: 10,
              unitPrice: defaultProd.basePrice,
            },
          ]
        : []
    );
    setModalOpen(true);
  }

  function addItemRow() {
    const defaultProd = products[0];
    if (!defaultProd) return;
    setItems((prev) => [
      ...prev,
      {
        productId: defaultProd.id,
        quantity: 1,
        unitPrice: defaultProd.basePrice,
      },
    ]);
  }

  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
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
    if (!customerId) {
      setFormError("Vui lòng chọn khách hàng.");
      return;
    }
    if (items.length === 0) {
      setFormError("Đơn hàng cần ít nhất 1 mã sản phẩm.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          orderDate,
          status,
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

  async function handleStatusChange(
    orderId: string,
    newStatus: OrderDTO["status"]
  ) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      loadOrders();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể cập nhật trạng thái đơn hàng.");
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
              Quản lý Đơn hàng & Báo giá (Orders)
            </h1>
            <p className="text-sm text-slate-500">
              {currentUser?.role === "SALE"
                ? `Đơn hàng do ${currentUser.name} phụ trách (${orders.length})`
                : `Toàn bộ đơn hàng xuất khẩu (${orders.length})`}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Lên đơn hàng / Báo giá
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
              placeholder="Tìm mã đơn ORD, tên công ty..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            {ORDER_STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label} ({st.value})
              </option>
            ))}
          </select>
        </div>

        {/* Orders Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading && orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5EAF2] p-8 text-center text-slate-500 text-sm">
              Đang tải đơn hàng...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5EAF2] p-8 text-center text-slate-500 text-sm">
              Chưa có đơn hàng nào.
            </div>
          ) : (
            orders.map((order) => {
              const statusMeta = getOrderStatusMeta(order.status);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-[#E5EAF2] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60 font-mono text-[11px] font-semibold">
                        <FileText className="w-3 h-3" />
                        {order.orderCode}
                      </span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {order.customer.companyName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {order.customer.countryRegion} •{" "}
                        {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm tabular-nums">
                        {formatUSD(order.totalAmount)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {order.salesRep.name}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] rounded-lg px-2.5 py-2 border border-[#EEF2F7] space-y-1">
                    {order.items.map((item, i) => (
                      <div key={item.id ?? i} className="text-xs text-slate-700">
                        <span className="font-mono font-semibold text-slate-800">
                          {item.product?.sku}
                        </span>{" "}
                        — {formatNumber(item.quantity)} {item.product?.unit} ×{" "}
                        {formatUSD(item.unitPrice)}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[#EEF2F7]">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(
                          order.id,
                          e.target.value as OrderDTO["status"]
                        )
                      }
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer focus:outline-none ${statusMeta.color}`}
                    >
                      {ORDER_STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Xóa đơn hàng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Orders Table (Tablet & Desktop) */}
        <div className="hidden md:block bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E293B] text-white text-xs font-semibold tracking-wide divide-x divide-[#334155]">
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Chi tiết mã hàng (SKU)</th>
                  <th className="py-3 px-4">Ngày đặt</th>
                  <th className="py-3 px-4 text-right">Tổng tiền (USD)</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Sale</th>
                  <th className="py-3 px-4 text-right">Xóa</th>
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
                    return (
                      <tr key={order.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60">
                            <FileText className="w-3.5 h-3.5" />
                            {order.orderCode}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {order.customer.companyName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.customer.customerCode} • {order.customer.countryRegion}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {order.items.map((item, i) => (
                              <div
                                key={item.id ?? i}
                                className="text-xs text-slate-700"
                              >
                                <span className="font-mono font-semibold text-slate-800">
                                  {item.product?.sku}
                                </span>{" "}
                                — {formatNumber(item.quantity)}{" "}
                                {item.product?.unit} × {formatUSD(item.unitPrice)}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-xs">
                          {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatUSD(order.totalAmount)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusChange(
                                order.id,
                                e.target.value as OrderDTO["status"]
                              )
                            }
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold border border-transparent cursor-pointer focus:outline-none ${statusMeta.color}`}
                          >
                            {ORDER_STATUS_OPTIONS.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 text-xs">
                          {order.salesRep.name}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Xóa đơn hàng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Create Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Tạo Đơn hàng / Báo giá Xuất khẩu
                </h2>
                <p className="text-xs text-slate-500">
                  Mã đơn hàng tự động sinh theo định dạng ORD-YYYYMM-XXX
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
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Khách hàng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ngày đơn hàng
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as OrderDTO["status"])
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {ORDER_STATUS_OPTIONS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label} ({st.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ghi chú (Incoterm / Cảng / Container)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="VD: CIF Hamburg - 1x40ft HC, TT 30/70"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Chi tiết Mã hàng
                  </h3>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm dòng hàng
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const lineSubtotal =
                      Number(item.quantity || 0) * Number(item.unitPrice || 0);
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2.5 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                      >
                        <div className="col-span-12 sm:col-span-5">
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Sản phẩm (SKU)
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              updateItem(idx, "productId", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} — {p.name} ({p.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Sản lượng ({prod?.unit ?? ""})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(idx, "quantity", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Đơn giá (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(idx, "unitPrice", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2 text-right">
                          <span className="block text-[11px] text-slate-500 mb-1">
                            Thành tiền
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatUSD(lineSubtotal)}
                          </span>
                        </div>

                        <div className="col-span-1 text-right pt-4">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-end gap-4 bg-blue-50/70 border border-blue-100 rounded-lg px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">
                    Tổng giá trị đơn hàng:
                  </span>
                  <span className="text-xl font-bold text-blue-700">
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
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
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
