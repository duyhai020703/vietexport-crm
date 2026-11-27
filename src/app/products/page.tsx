"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Edit2, Package, Plus, Search, Trash2, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import type { ProductDTO } from "@/types/crm";
import { formatUSD } from "@/lib/constants";

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [specification, setSpecification] = useState("");
  const [unit, setUnit] = useState("Tấn");
  const [basePrice, setBasePrice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 200);
    return () => clearTimeout(t);
  }, [loadProducts]);

  function openCreate() {
    setEditing(null);
    setSku("");
    setName("");
    setSpecification("");
    setUnit("Tấn");
    setBasePrice("");
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(p: ProductDTO) {
    setEditing(p);
    setSku(p.sku);
    setName(p.name);
    setSpecification(p.specification ?? "");
    setUnit(p.unit);
    setBasePrice(String(p.basePrice));
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!sku.trim() || !name.trim() || !unit.trim() || basePrice === "") {
      setFormError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
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
          specification: specification.trim() || null,
          unit: unit.trim(),
          basePrice: Number(basePrice),
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

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Danh mục Mã hàng Xuất khẩu (Products)
            </h1>
            <p className="text-sm text-slate-500">
              Quản lý SKU, quy cách đóng gói, đơn vị tính và đơn giá tham khảo (USD)
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Thêm mã hàng
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#E5EAF2] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã SKU, tên hàng, quy cách..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading && products.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5EAF2] p-8 text-center text-slate-500 text-sm">
              Đang tải danh mục sản phẩm...
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5EAF2] p-8 text-center text-slate-500 text-sm">
              Chưa có mã hàng nào.
            </div>
          ) : (
            products.map((p) => (
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
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 text-sm tabular-nums">
                      {formatUSD(p.basePrice)}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      / {p.unit}
                    </span>
                  </div>
                </div>
                {p.specification && (
                  <p className="text-xs text-slate-600">{p.specification}</p>
                )}
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
                <tr className="bg-[#1E293B] text-white text-xs font-semibold tracking-wide divide-x divide-[#334155]">
                  <th className="py-3 px-4">Mã SKU</th>
                  <th className="py-3 px-4">Tên sản phẩm</th>
                  <th className="py-3 px-4">Quy cách đóng gói</th>
                  <th className="py-3 px-4">Đơn vị tính</th>
                  <th className="py-3 px-4 text-right">Đơn giá tham khảo</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7] text-sm">
                {loading && products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Đang tải danh mục sản phẩm...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Chưa có mã hàng nào.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60">
                          {p.sku}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          {p.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.specification || "—"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatUSD(p.basePrice)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editing ? `Cập nhật Mã hàng (${editing.sku})` : "Thêm Mã hàng Xuất khẩu"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mã SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="VD: CAS-W320-2268"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Đơn vị tính <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Tấn, Thùng, Container..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Hạt điều nhân trắng W320"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quy cách đóng gói
                </label>
                <input
                  type="text"
                  value={specification}
                  onChange={(e) => setSpecification(e.target.value)}
                  placeholder="VD: Thùng carton 22.68 kg hút chân không"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Đơn giá tham khảo (USD) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="6450"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
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
                  {saving ? "Đang lưu..." : "Lưu mã hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

