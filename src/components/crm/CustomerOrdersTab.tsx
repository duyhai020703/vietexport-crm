"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Edit2,
  FileText,
  Globe,
  Package,
  Plus,
  Scale,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type { OrderDTO, ProductDTO } from "@/types/crm";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import {
  calculateKg,
  computeOrderItemWeightKg,
  DEFAULT_CONTAINER_TYPES,
  formatNumber,
  formatUSD,
  getOrderStatusMeta,
  INCOTERM_OPTIONS,
  ORDER_PAYMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
} from "@/lib/constants";

interface DraftOrderItem {
  productId: string;
  category: string;
  specification: string;
  unit: string;
  quantity: number;
  weightKg: string;
  market: string;
  deliveryDate: string;
  unitPrice: number;
}

interface CustomerOrdersTabProps {
  customerId: string;
  customerName: string;
  customerCountry: string;
  onOrderChanged: () => void;
  onCountChange?: (count: number) => void;
}

export default function CustomerOrdersTab({
  customerId,
  customerName,
  customerCountry,
  onOrderChanged,
  onCountChange,
}: CustomerOrdersTabProps) {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [containerTypeOptions, setContainerTypeOptions] = useState<string[]>([
    ...DEFAULT_CONTAINER_TYPES,
  ]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Form mode: null = list view, "create" = new order, OrderDTO = editing order
  const [formTarget, setFormTarget] = useState<"create" | OrderDTO | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [productionOrderNo, setProductionOrderNo] = useState("");
  const [orderType, setOrderType] = useState<"STANDARD" | "OEM">("STANDARD");
  const [incoterm, setIncoterm] = useState<"EXW" | "FOB" | "CFR" | "CIF">("FOB");
  const [status, setStatus] = useState<OrderDTO["status"]>("CONFIRMED");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [estProductionDate, setEstProductionDate] = useState("");
  const [etd, setEtd] = useState("");
  const [eta, setEta] = useState("");
  const [containerType, setContainerType] = useState("");
  const [showContainerDropdown, setShowContainerDropdown] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick-Add Product (Thêm mã hàng mới)
  const [showAddSku, setShowAddSku] = useState(false);
  const [newSkuCode, setNewSkuCode] = useState("");
  const [newSkuName, setNewSkuName] = useState("");
  const [newSkuCategory, setNewSkuCategory] = useState("Siêu Mỏng");
  const [newSkuSpec, setNewSkuSpec] = useState("");
  const [newSkuUnit, setNewSkuUnit] = useState("Thùng");
  const [newSkuNetWeight, setNewSkuNetWeight] = useState("220");
  const [newSkuPacks, setNewSkuPacks] = useState("40");
  const [newSkuPrice, setNewSkuPrice] = useState("45");
  const [skuError, setSkuError] = useState("");
  const [skuSaving, setSkuSaving] = useState(false);

  const fetchOrdersAndProducts = useCallback(async () => {
    const [ordRes, prodRes, ctRes] = await Promise.all([
      fetch(`/api/orders?customerId=${encodeURIComponent(customerId)}`),
      fetch("/api/products"),
      fetch("/api/container-types"),
    ]);
    const [ordData, prodData, ctData] = await Promise.all([
      ordRes.json(),
      prodRes.json(),
      ctRes.json(),
    ]);
    return { ordRes, ordData, prodRes, prodData, ctRes, ctData };
  }, [customerId]);

  const applyFetchResult = useCallback(
    (result: {
      ordRes: Response;
      ordData: { orders?: OrderDTO[]; error?: string };
      prodRes: Response;
      prodData: { products?: ProductDTO[] };
      ctRes: Response;
      ctData: { containerTypes?: string[] };
    }) => {
      if (!result.ordRes.ok) {
        setListError(
          result.ordData.error || "Không thể tải danh sách đơn hàng."
        );
      } else {
        const loaded: OrderDTO[] = result.ordData.orders ?? [];
        setOrders(loaded);
        onCountChange?.(loaded.length);
      }
      if (result.prodRes.ok) {
        setProducts(result.prodData.products ?? []);
      }
      if (result.ctRes.ok && Array.isArray(result.ctData.containerTypes)) {
        setContainerTypeOptions(result.ctData.containerTypes);
      }
    },
    [onCountChange]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      applyFetchResult(await fetchOrdersAndProducts());
    } catch {
      setListError("Lỗi kết nối khi tải đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [fetchOrdersAndProducts, applyFetchResult]);

  useEffect(() => {
    let active = true;
    fetchOrdersAndProducts()
      .then((res) => {
        if (active) applyFetchResult(res);
      })
      .catch(() => {
        if (active) setListError("Lỗi kết nối khi tải đơn hàng.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchOrdersAndProducts, applyFetchResult]);

  function buildDraftItemFromProduct(
    prod: ProductDTO,
    qty = 100,
    defaultMarket = customerCountry,
    defaultDelivery = ""
  ): DraftOrderItem {
    const spec =
      prod.specification ||
      `${prod.netWeightGrams}g - ${prod.packsPerCarton} gói/${prod.unit.toLowerCase()}`;
    const kg = computeOrderItemWeightKg({
      productName: prod.name,
      specification: spec,
      netWeightGrams: prod.netWeightGrams,
      packsPerCarton: prod.packsPerCarton,
      quantity: qty,
    });
    return {
      productId: prod.id,
      category: prod.category ?? "",
      specification: spec,
      unit: prod.unit || "Thùng",
      quantity: qty,
      weightKg: String(kg),
      market: defaultMarket,
      deliveryDate: defaultDelivery,
      unitPrice: prod.basePrice,
    };
  }

  function openCreateOrder() {
    setFormError("");
    setShowAddSku(false);
    setShowContainerDropdown(false);
    setPoNumber("");
    setProductionOrderNo("");
    setOrderType("STANDARD");
    setIncoterm("FOB");
    setStatus("CONFIRMED");
    setPaymentStatus("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setEstProductionDate("");
    setEtd("");
    setEta("");
    setContainerType("");
    setNotes("");
    const first = products[0];
    setItems(first ? [buildDraftItemFromProduct(first, 100, customerCountry, "")] : []);
    setFormTarget("create");
  }

  function openEditOrder(order: OrderDTO) {
    setFormError("");
    setShowAddSku(false);
    setShowContainerDropdown(false);
    setPoNumber(order.poNumber ?? "");
    setProductionOrderNo(order.productionOrderNo ?? "");
    setOrderType(order.orderType);
    setIncoterm(order.incoterm);
    setStatus(order.status);
    setPaymentStatus(order.paymentStatus ?? "");
    setOrderDate(order.orderDate ? order.orderDate.slice(0, 10) : "");
    setEstProductionDate(
      order.estProductionDate ? order.estProductionDate.slice(0, 10) : ""
    );
    setEtd(order.etd ? order.etd.slice(0, 10) : "");
    setEta(order.eta ? order.eta.slice(0, 10) : "");
    setContainerType(order.containerType ?? "");
    setNotes(order.notes ?? "");
    setItems(
      order.items.map((it) => {
        const prod = it.product;
        const spec =
          it.specification ??
          prod?.specification ??
          (prod
            ? `${prod.netWeightGrams}g - ${prod.packsPerCarton} gói/${prod.unit.toLowerCase()}`
            : "");
        const computedKg = computeOrderItemWeightKg({
          productName: prod?.name,
          specification: spec,
          netWeightGrams: prod?.netWeightGrams,
          packsPerCarton: prod?.packsPerCarton,
          quantity: it.quantity,
        });
        return {
          productId: it.productId,
          category: it.category ?? prod?.category ?? "",
          specification: spec,
          unit: it.unit ?? prod?.unit ?? "Thùng",
          quantity: it.quantity,
          weightKg: String(computedKg > 0 ? computedKg : it.weightKg ?? 0),
          market: it.market ?? customerCountry,
          deliveryDate: it.deliveryDate
            ? it.deliveryDate.slice(0, 10)
            : order.etd
            ? order.etd.slice(0, 10)
            : "",
          unitPrice: it.unitPrice,
        };
      })
    );
    setFormTarget(order);
  }

  function updateItem(
    idx: number,
    field: keyof DraftOrderItem,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "productId") {
          const prod = products.find((p) => p.id === value);
          if (!prod) return { ...item, productId: String(value) };
          const spec =
            prod.specification ||
            `${prod.netWeightGrams}g - ${prod.packsPerCarton} gói/${prod.unit.toLowerCase()}`;
          const kg = computeOrderItemWeightKg({
            productName: prod.name,
            specification: spec,
            netWeightGrams: prod.netWeightGrams,
            packsPerCarton: prod.packsPerCarton,
            quantity: item.quantity,
          });
          return {
            ...item,
            productId: prod.id,
            category: prod.category ?? "",
            specification: spec,
            unit: prod.unit || "Thùng",
            weightKg: String(kg),
            unitPrice: prod.basePrice,
          };
        }
        if (field === "quantity" || field === "specification") {
          const nextQty = field === "quantity" ? Number(value) : item.quantity;
          const nextSpec =
            field === "specification" ? String(value) : item.specification;
          const prod = products.find((p) => p.id === item.productId);
          const nextWeight = computeOrderItemWeightKg({
            productName: prod?.name,
            specification: nextSpec,
            netWeightGrams: prod?.netWeightGrams,
            packsPerCarton: prod?.packsPerCarton,
            quantity: nextQty,
          });
          return {
            ...item,
            quantity: nextQty,
            specification: nextSpec,
            weightKg: String(nextWeight),
          };
        }
        if (field === "unitPrice") {
          return { ...item, unitPrice: Number(value) };
        }
        return { ...item, [field]: String(value) };
      })
    );
  }

  function updateItemSubtotal(idx: number, subtotalValue: string) {
    const subtotalNum = Number(subtotalValue);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const qty = Number(item.quantity);
        if (isNaN(subtotalNum) || qty <= 0) return item;
        return {
          ...item,
          unitPrice: Number((subtotalNum / qty).toFixed(4)),
        };
      })
    );
  }

  async function handleQuickAddProduct() {
    setSkuError("");
    if (!newSkuCode.trim() || !newSkuName.trim() || !newSkuUnit.trim() || newSkuPrice === "") {
      setSkuError("Vui lòng nhập Mã SKU, Tên sản phẩm, ĐVT và Đơn giá.");
      return;
    }

    const netW = Number(newSkuNetWeight) || 220;
    const packs = Number(newSkuPacks) || 40;
    const autoSpec =
      newSkuSpec.trim() ||
      `${newSkuCategory ? `${newSkuCategory} ` : ""}${netW} g - ${packs} túi/ ${newSkuUnit.toLowerCase()}`;

    setSkuSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: newSkuCode.trim().toUpperCase(),
          name: newSkuName.trim(),
          category: newSkuCategory.trim() || null,
          specification: autoSpec,
          unit: newSkuUnit.trim(),
          netWeightGrams: netW,
          packsPerCarton: packs,
          basePrice: Number(newSkuPrice) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSkuError(data.error || "Không thể thêm mã hàng mới.");
        return;
      }

      const created: ProductDTO = data.product;
      setProducts((prev) =>
        [...prev, created].sort((a, b) => a.sku.localeCompare(b.sku))
      );
      setItems((prev) => [
        ...prev,
        buildDraftItemFromProduct(created, 100, customerCountry, etd),
      ]);
      setShowAddSku(false);
      setNewSkuCode("");
      setNewSkuName("");
      setNewSkuSpec("");
    } catch {
      setSkuError("Lỗi kết nối khi lưu mã hàng.");
    } finally {
      setSkuSaving(false);
    }
  }

  const draftTotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
    0
  );

  const totalWeightKg = items.reduce(
    (sum, it) => sum + (Number(it.weightKg) || 0),
    0
  );

  async function handleSaveOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (items.length === 0) {
      setFormError("Đơn hàng phải có ít nhất 1 sản phẩm.");
      return;
    }

    const hasInvalidItem = items.some(
      (it) =>
        !it.productId ||
        isNaN(it.quantity) ||
        it.quantity <= 0 ||
        isNaN(it.unitPrice) ||
        it.unitPrice < 0
    );
    if (hasInvalidItem) {
      setFormError(
        "Vui lòng chọn sản phẩm, số lượng (> 0) và số tiền/đơn giá (>= 0) hợp lệ."
      );
      return;
    }

    setSaving(true);
    try {
      const isEditing = formTarget !== "create" && formTarget !== null;
      const url = isEditing ? `/api/orders/${formTarget.id}` : "/api/orders";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        ...(isEditing ? {} : { customerId }),
        poNumber: poNumber.trim() || null,
        productionOrderNo: productionOrderNo.trim() || null,
        orderType,
        incoterm,
        status,
        paymentStatus: status === "COMPLETED" ? paymentStatus || null : null,
        orderDate: orderDate || undefined,
        estProductionDate: estProductionDate || null,
        ...(status !== "SHIPPED" ? { etd: etd || null, eta: eta || null } : {}),
        containerType: containerType.trim() || null,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          productId: it.productId,
          category: it.category.trim() || null,
          specification: it.specification.trim() || null,
          unit: it.unit.trim() || null,
          quantity: Number(it.quantity),
          weightKg: it.weightKg !== "" ? Number(it.weightKg) : null,
          market: it.market.trim() || null,
          deliveryDate: it.deliveryDate || null,
          unitPrice: Number(it.unitPrice),
        })),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Không thể lưu đơn hàng.");
        return;
      }

      setFormTarget(null);
      await loadData();
      onOrderChanged();
    } catch {
      setFormError("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrder(order: OrderDTO) {
    if (!confirm(`Xác nhận xóa đơn hàng "${order.orderCode}"?`)) return;
    setListError("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error || "Không thể xóa đơn hàng.");
        return;
      }
      await loadData();
      onOrderChanged();
    } catch {
      setListError("Lỗi kết nối khi xóa đơn hàng.");
    }
  }

  if (formTarget !== null) {
    const isEditing = formTarget !== "create";
    return (
      <form onSubmit={handleSaveOrder} className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isEditing
                ? `Cập nhật đơn hàng ${formTarget.orderCode}`
                : `Thêm đơn hàng mới — ${customerName}`}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing
                ? "Chỉnh sửa thông tin đơn hàng, lịch dự kiến và chi tiết SKU"
                : "Mã đơn hàng sẽ tự động sinh theo định dạng ORD-YY-XXX"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormTarget(null)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Danh sách
          </button>
        </div>

        {formError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Số PO khách hàng
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="VD: PO-910"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Số LSX
            </label>
            <input
              type="text"
              value={productionOrderNo}
              onChange={(e) => setProductionOrderNo(e.target.value)}
              placeholder="VD: LSX-26-001"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#1677FF] focus:outline-none"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
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
                setIncoterm(e.target.value as "EXW" | "FOB" | "CFR" | "CIF")
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
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
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as OrderDTO["status"])
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
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
              Ngày đặt hàng
            </label>
            <CustomDatePicker
              value={orderDate}
              onChange={(v) => setOrderDate(v)}
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Loại Container
            </label>
            <input
              type="text"
              value={containerType}
              onFocus={() => setShowContainerDropdown(true)}
              onBlur={() => setShowContainerDropdown(false)}
              onChange={(e) => {
                setContainerType(e.target.value);
                setShowContainerDropdown(true);
              }}
              placeholder="VD: 20ft, 40HC, LCL..."
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#1677FF] focus:outline-none"
            />
            {showContainerDropdown && (() => {
              const q = containerType.trim().toLowerCase();
              const filtered = containerTypeOptions.filter(
                (opt) => !q || opt.toLowerCase().includes(q)
              );
              if (filtered.length === 0) return null;
              return (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                  {filtered.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setContainerType(opt);
                        setShowContainerDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#EBF4FF] hover:text-[#1677FF] ${
                        containerType === opt
                          ? "bg-[#EBF4FF] text-[#1677FF] font-semibold"
                          : "text-slate-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {status === "COMPLETED" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Thanh toán
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
              >
                <option value="">-- Chọn trạng thái thanh toán --</option>
                {ORDER_PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Lịch SX dự kiến
            </label>
            <CustomDatePicker
              value={estProductionDate}
              onChange={(v) => setEstProductionDate(v)}
            />
          </div>

          {status !== "SHIPPED" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ETD (Tàu chạy)
                </label>
                <CustomDatePicker
                  value={etd}
                  onChange={(v) => setEtd(v)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ETA (Tàu đến)
                </label>
                <CustomDatePicker
                  value={eta}
                  onChange={(v) => setEta(v)}
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Ghi chú đơn hàng
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Yêu cầu đóng pallet, nhãn phụ..."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>
        </div>

        {/* Order Items (Chi tiết Mã hàng SKU) */}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800 uppercase">
              Chi tiết Mã hàng (SKU)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={products.length === 0}
                onClick={() => {
                  const first = products[0];
                  if (!first) return;
                  setItems((prev) => [
                    ...prev,
                    buildDraftItemFromProduct(first, 100, customerCountry, ""),
                  ]);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EBF4FF] text-[#1677FF] text-xs font-semibold hover:bg-blue-100 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo dòng mới
              </button>
            </div>
          </div>

          {/* Quick-Add SKU Panel */}
          {showAddSku && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">
                  Thêm nhanh Mã hàng (SKU) vào thư viện sản phẩm
                </span>
              </div>
              {skuError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5">
                  {skuError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Mã SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSkuCode}
                    onChange={(e) => setNewSkuCode(e.target.value)}
                    placeholder="VD: SKU-SHABU-220"
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Tên Sản Phẩm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSkuName}
                    onChange={(e) => setNewSkuName(e.target.value)}
                    placeholder="VD: Shabu"
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Phân loại
                  </label>
                  <input
                    type="text"
                    list="quick-sku-categories"
                    value={newSkuCategory}
                    onChange={(e) => setNewSkuCategory(e.target.value)}
                    placeholder="Siêu Mỏng, Cuốn, Đa nem, Mè..."
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <datalist id="quick-sku-categories">
                    {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Quy cách
                  </label>
                  <input
                    type="text"
                    value={newSkuSpec}
                    onChange={(e) => setNewSkuSpec(e.target.value)}
                    placeholder="VD: Siêu mỏng 220 g - 40 túi/ thùng"
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    ĐVT <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSkuUnit}
                    onChange={(e) => setNewSkuUnit(e.target.value)}
                    placeholder="Thùng"
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Đơn giá bán (USD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSkuPrice}
                    onChange={(e) => setNewSkuPrice(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Net Weight (g/gói)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSkuNetWeight}
                    onChange={(e) => setNewSkuNetWeight(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Số gói / thùng
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSkuPacks}
                    onChange={(e) => setNewSkuPacks(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSku(false)}
                    className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={skuSaving}
                    onClick={handleQuickAddProduct}
                    className="px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#059669] hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {skuSaving ? "Đang lưu..." : "Lưu & Thêm vào đơn"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Chưa có sản phẩm nào trong thư viện SKU. Vui lòng thêm ở mục Sản phẩm (SKU).
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const lineAmount = Number(
                  (
                    Number(item.quantity || 0) * Number(item.unitPrice || 0)
                  ).toFixed(2)
                );
                return (
                  <div
                    key={idx}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        Dòng sản phẩm #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Xóa
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Tên Sản Phẩm (SKU)
                        </label>
                        <CustomSelect
                          searchable
                          value={item.productId}
                          onChange={(val) =>
                            updateItem(idx, "productId", val)
                          }
                          options={products.map((p) => ({
                            value: p.id,
                            label: `${p.name} (${p.sku})`,
                            subLabel: p.category ?? undefined,
                          }))}
                          placeholder="-- Chọn sản phẩm --"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Quy cách
                        </label>
                        <input
                          type="text"
                          value={item.specification}
                          onChange={(e) =>
                            updateItem(idx, "specification", e.target.value)
                          }
                          placeholder="VD: Siêu mỏng 220 g - 40 túi/ thùng"
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Phân loại
                        </label>
                        <input
                          type="text"
                          list={`item-cat-${idx}`}
                          value={item.category}
                          onChange={(e) =>
                            updateItem(idx, "category", e.target.value)
                          }
                          placeholder="Siêu Mỏng, Cuốn, Đa nem, Mè..."
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm"
                        />
                        <datalist id={`item-cat-${idx}`}>
                          {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          ĐVT
                        </label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(idx, "unit", e.target.value)
                          }
                          placeholder="Thùng"
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Số lượng
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, "quantity", e.target.value)
                          }
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Khối Lượng (kg)
                        </label>
                        <div
                          title="Tự động tính từ gram/gói (Tên SP / Quy cách) × số gói/thùng × số lượng"
                          className="w-full rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 tabular-nums"
                        >
                          {formatNumber(Number(item.weightKg) || 0)} kg
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Thị Trường
                        </label>
                        <input
                          type="text"
                          value={item.market}
                          onChange={(e) =>
                            updateItem(idx, "market", e.target.value)
                          }
                          placeholder="VD: Nhật Bản, Mỹ..."
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Ngày giao hàng
                        </label>
                        <input
                          type="date"
                          value={item.deliveryDate}
                          onChange={(e) =>
                            updateItem(idx, "deliveryDate", e.target.value)
                          }
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Đơn giá / {item.unit || "ĐVT"} (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, "unitPrice", e.target.value)
                          }
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Số tiền (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={lineAmount}
                          onChange={(e) =>
                            updateItemSubtotal(idx, e.target.value)
                          }
                          className="w-full rounded border border-blue-200 bg-blue-50/40 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-[#1677FF] tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#EBF4FF] border border-[#BFDBFE] rounded-lg px-4 py-2.5">
            <span className="text-xs sm:text-sm text-slate-700">
              Tổng khối lượng:{" "}
              <strong className="text-slate-900 tabular-nums">
                {formatNumber(totalWeightKg)} kg
              </strong>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-700">
                Tổng số tiền đơn hàng:
              </span>
              <span className="text-base sm:text-lg font-bold text-[#1677FF] tabular-nums">
                {formatUSD(draftTotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => setFormTarget(null)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : isEditing
              ? "Lưu đơn hàng"
              : "Tạo đơn hàng"}
          </button>
        </div>
      </form>
    );
  }

  const totalOrdersValue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPaidValue = orders.reduce((s, o) => s + o.paidAmount, 0);

  return (
    <div className="space-y-4">
      {/* Top summary & Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] border border-[#E5EAF2] rounded-xl p-3.5">
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-slate-500">Tổng số đơn:</span>{" "}
            <strong className="text-slate-900">{orders.length}</strong>
          </div>
          <div>
            <span className="text-slate-500">Tổng giá trị:</span>{" "}
            <strong className="text-[#1677FF] tabular-nums">
              {formatUSD(totalOrdersValue)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Đã thu:</span>{" "}
            <strong className="text-[#059669] tabular-nums">
              {formatUSD(totalPaidValue)}
            </strong>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateOrder}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Thêm đơn hàng
        </button>
      </div>

      {listError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{listError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Đang tải danh sách đơn hàng...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
          <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">
            Khách hàng này chưa có đơn hàng nào.
          </p>
          <button
            type="button"
            onClick={openCreateOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1677FF] bg-[#EBF4FF] hover:bg-blue-100"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo đơn hàng đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusMeta = getOrderStatusMeta(order.status);
            const pct =
              order.totalAmount > 0
                ? Math.round((order.paidAmount / order.totalAmount) * 100)
                : 0;

            return (
              <div
                key={order.id}
                className="bg-white border border-[#E5EAF2] rounded-xl p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60 font-mono text-xs font-semibold">
                      <FileText className="w-3.5 h-3.5" />
                      {order.orderCode}
                    </span>
                    {order.poNumber && (
                      <span className="text-xs font-medium text-slate-600">
                        PO: {order.poNumber}
                      </span>
                    )}
                    {order.productionOrderNo && (
                      <span className="text-xs font-medium text-slate-600">
                        LSX: {order.productionOrderNo}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {order.orderType} • {order.incoterm} •{" "}
                      {order.containerType || `${order.containerCount} cont`}
                    </span>
                    {order.status === "COMPLETED" && order.paymentStatus && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        TT: {order.paymentStatus}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.color}`}
                    >
                      {statusMeta.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditOrder(order)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#1677FF] hover:bg-[#EBF4FF]"
                      title="Sửa đơn hàng"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      title="Xóa đơn hàng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items summary */}
                <div className="bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#EEF2F7] space-y-2">
                  {order.items.map((it, i) => {
                    const spec = it.specification ?? it.product?.specification;
                    const cat = it.category ?? it.product?.category;
                    const unit = it.unit ?? it.product?.unit ?? "Thùng";
                    const computedKg =
                      it.weightKg ??
                      (it.product
                        ? calculateKg(
                            it.product.netWeightGrams,
                            it.product.packsPerCarton,
                            it.quantity
                          )
                        : null);
                    const delivery = it.deliveryDate ?? order.etd;

                    return (
                      <div
                        key={it.id ?? i}
                        className="text-xs text-slate-700 pb-1.5 last:pb-0 border-b last:border-b-0 border-slate-200/70 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-900">
                              {it.product?.name}
                            </span>
                            <span className="font-mono text-[11px] text-[#1677FF]">
                              ({it.product?.sku ?? "SKU"})
                            </span>
                            {cat && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#1677FF] text-[10px] font-semibold">
                                {cat}
                              </span>
                            )}
                          </span>
                          <span className="font-bold text-slate-900 tabular-nums shrink-0">
                            {formatUSD(it.subtotal)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 pl-5">
                          {spec && <span>Quy cách: {spec}</span>}
                          <span>
                            SL:{" "}
                            <strong className="text-slate-700">
                              {formatNumber(it.quantity)} {unit}
                            </strong>
                          </span>
                          {computedKg !== null && computedKg > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Scale className="w-3 h-3" />
                              {formatNumber(computedKg)} kg
                            </span>
                          )}
                          {(it.market || order.customer?.countryRegion) && (
                            <span className="inline-flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {it.market || order.customer?.countryRegion}
                            </span>
                          )}
                          {delivery && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Giao:{" "}
                              {new Date(delivery).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Ngày đặt:{" "}
                      <strong>
                        {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                      </strong>
                    </span>
                    {order.etd && (
                      <span>
                        ETD:{" "}
                        <strong>
                          {new Date(order.etd).toLocaleDateString("vi-VN")}
                        </strong>
                      </span>
                    )}
                    {order.eta && (
                      <span>
                        ETA:{" "}
                        <strong>
                          {new Date(order.eta).toLocaleDateString("vi-VN")}
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-slate-800 tabular-nums">
                    Đã thu:{" "}
                    <span className="text-[#059669]">
                      {formatUSD(order.paidAmount)}
                    </span>{" "}
                    / {formatUSD(order.totalAmount)} ({pct}%)
                  </div>
                </div>

                {order.notes && (
                  <div className="text-xs text-slate-500 italic">
                    Ghi chú: {order.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
