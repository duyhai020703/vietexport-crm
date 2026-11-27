"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  CopyPlus,
  FileOutput,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import type {
  CustomerDTO,
  ProductDTO,
  QuotationDTO,
  UserDTO,
} from "@/types/crm";
import {
  formatNumber,
  formatUSD,
  INCOTERM_OPTIONS,
  QUOTE_APPROVAL_META,
  SPECS_CHECK_META,
} from "@/lib/constants";

interface DraftQuoteItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationDTO[]>([]);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("ALL");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [baseQuoteCode, setBaseQuoteCode] = useState<string | undefined>(
    undefined
  );
  const [customerId, setCustomerId] = useState("");
  const [quoteType, setQuoteType] = useState<"STANDARD" | "OEM">("STANDARD");
  const [incoterm, setIncoterm] = useState<"EXW" | "FOB" | "CFR" | "CIF">(
    "FOB"
  );
  const [portName, setPortName] = useState("Cát Lái, HCM");
  const [packagingCost, setPackagingCost] = useState(0);
  const [testingCost, setTestingCost] = useState(0);
  const [localCharges, setLocalCharges] = useState(0);
  const [seaFreight, setSeaFreight] = useState(0);
  const [marginPercent, setMarginPercent] = useState(18);
  const [specsNotes, setSpecsNotes] = useState("");
  const [moq, setMoq] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("14");
  const [items, setItems] = useState<DraftQuoteItem[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMaster = useCallback(async () => {
    const [cRes, pRes, uRes] = await Promise.all([
      fetch("/api/customers"),
      fetch("/api/products"),
      fetch("/api/users"),
    ]);
    const [cData, pData, uData] = await Promise.all([
      cRes.json(),
      pRes.json(),
      uRes.json(),
    ]);
    setCustomers(cData.customers ?? []);
    setProducts(pData.products ?? []);
    setCurrentUser(uData.currentUser ?? null);
  }, []);

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (approvalFilter !== "ALL") params.set("approvalStatus", approvalFilter);
      const res = await fetch(`/api/quotations?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setQuotations(data.quotations ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, approvalFilter]);

  useEffect(() => {
    loadMaster();
  }, [loadMaster]);

  useEffect(() => {
    const t = setTimeout(loadQuotations, 200);
    return () => clearTimeout(t);
  }, [loadQuotations]);

  function openNewQuote(fromQuote?: QuotationDTO) {
    setFormError("");
    if (fromQuote) {
      setBaseQuoteCode(fromQuote.quoteCode);
      setCustomerId(fromQuote.customerId);
      setQuoteType(fromQuote.quoteType);
      setIncoterm(fromQuote.incoterm);
      setPortName(fromQuote.portName ?? "");
      setPackagingCost(fromQuote.packagingCost);
      setTestingCost(fromQuote.testingCost);
      setLocalCharges(fromQuote.localCharges);
      setSeaFreight(fromQuote.seaFreight);
      setMarginPercent(fromQuote.marginPercent);
      setSpecsNotes(fromQuote.specsNotes ?? "");
      setMoq(fromQuote.moq ?? "");
      setLeadTimeDays(
        fromQuote.leadTimeDays ? String(fromQuote.leadTimeDays) : "14"
      );
      setItems(
        fromQuote.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }))
      );
    } else {
      setBaseQuoteCode(undefined);
      setCustomerId(customers[0]?.id ?? "");
      setQuoteType("STANDARD");
      setIncoterm("FOB");
      setPortName("Cát Lái, HCM");
      setPackagingCost(0);
      setTestingCost(0);
      setLocalCharges(0);
      setSeaFreight(0);
      setMarginPercent(18);
      setSpecsNotes("");
      setMoq("");
      setLeadTimeDays("14");
      const first = products[0];
      setItems(
        first
          ? [
              {
                productId: first.id,
                quantity: first.capacity40hc ?? 1150,
                unitPrice: first.basePrice,
              },
            ]
          : []
      );
    }
    setModalOpen(true);
  }

  function updateItem(
    idx: number,
    field: keyof DraftQuoteItem,
    val: string | number
  ) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (field === "productId") {
          const prod = products.find((p) => p.id === val);
          return {
            ...it,
            productId: String(val),
            unitPrice: prod ? prod.basePrice : it.unitPrice,
            quantity: prod?.capacity40hc ?? it.quantity,
          };
        }
        return { ...it, [field]: Number(val) };
      })
    );
  }

  const itemsTotal = items.reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
    0
  );
  const draftTotal =
    itemsTotal +
    Number(packagingCost || 0) +
    Number(testingCost || 0) +
    Number(localCharges || 0) +
    Number(seaFreight || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!customerId || items.length === 0) {
      setFormError("Vui lòng chọn khách hàng và ít nhất 1 SKU.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseQuoteCode,
          customerId,
          quoteType,
          incoterm,
          portName,
          packagingCost,
          testingCost,
          localCharges,
          seaFreight,
          marginPercent,
          specsNotes,
          moq,
          leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Không thể lưu báo giá.");
        return;
      }
      setModalOpen(false);
      loadQuotations();
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus: status }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Không thể cập nhật duyệt.");
      return;
    }
    loadQuotations();
  }

  async function handleConvertOrder(q: QuotationDTO) {
    const po = prompt(
      `Nhập số PO khách hàng (nếu có) để chuyển ${q.quoteCode}_v${q.version} thành Đơn hàng:`,
      ""
    );
    if (po === null) return;
    const res = await fetch(`/api/quotations/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CONVERT_TO_ORDER", poNumber: po }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Không thể chuyển đổi thành đơn hàng.");
      return;
    }
    alert(`Đã chuyển đổi thành đơn hàng ${data.order.orderCode}!`);
    loadQuotations();
  }

  const isManagerOrAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  return (
    <AppShell
      onUserChanged={(u) => {
        setCurrentUser(u);
        loadMaster();
        loadQuotations();
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Báo giá &amp; Kiểm tra Quy cách (Quotation &amp; Check Specs)
            </h1>
            <p className="text-sm text-slate-500">
              Quản lý báo giá theo phiên bản (v1, v2...), Check Specs OEM và phê duyệt biên lợi nhuận
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-[#E5EAF2] hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              In / PDF
            </button>
            <button
              type="button"
              onClick={() => openNewQuote()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tạo Báo giá mới
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E5EAF2] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã QT, tên công ty, yêu cầu specs..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>

          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
          >
            <option value="ALL">Tất cả Trạng thái duyệt</option>
            <option value="AUTO_APPROVED">Đã duyệt (Tự động)</option>
            <option value="APPROVED">Đã duyệt (Trưởng phòng)</option>
            <option value="PENDING_APPROVAL">Chờ Trưởng phòng duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã BG (Ver)</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Loại / Check Specs</th>
                  <th className="py-3 px-4">Incoterms</th>
                  <th className="py-3 px-4 text-right">Tổng tiền / Margin</th>
                  <th className="py-3 px-4">Trạng thái duyệt</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7] text-sm">
                {loading && quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Đang tải danh sách báo giá...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Chưa có phiếu báo giá nào.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => {
                    const appMeta =
                      QUOTE_APPROVAL_META[q.approvalStatus] ??
                      QUOTE_APPROVAL_META.AUTO_APPROVED;
                    const specsMeta =
                      SPECS_CHECK_META[q.specsCheckStatus] ??
                      SPECS_CHECK_META.NOT_REQUIRED;

                    return (
                      <tr key={q.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60">
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            {q.quoteCode}_v{q.version}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {q.customer.companyName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {q.customer.countryRegion} • Sale: {q.salesRep.name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                q.quoteType === "OEM"
                                  ? "bg-purple-50 text-purple-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {q.quoteType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${specsMeta.color}`}
                            >
                              {specsMeta.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 line-clamp-1">
                            {q.specsNotes ||
                              q.items
                                .map((i) => `${i.product?.sku} (${formatNumber(i.quantity)})`)
                                .join(", ")}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                          {q.incoterm} {q.portName ? `(${q.portName})` : ""}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-bold text-slate-900 tabular-nums">
                            {formatUSD(q.totalAmount)}
                          </div>
                          <div
                            className={`text-xs font-semibold ${
                              q.marginPercent < 15
                                ? "text-rose-600"
                                : "text-[#059669]"
                            }`}
                          >
                            Margin: {q.marginPercent}%
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${appMeta.color}`}
                          >
                            {appMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {isManagerOrAdmin &&
                              q.approvalStatus === "PENDING_APPROVAL" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleApprove(q.id, "APPROVED")
                                    }
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                                    title="Trưởng phòng duyệt"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleApprove(q.id, "REJECTED")
                                    }
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                    title="Từ chối"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            <button
                              type="button"
                              onClick={() => openNewQuote(q)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#1677FF] hover:bg-[#EBF4FF]"
                              title="Tạo phiên bản mới (v+1)"
                            >
                              <CopyPlus className="w-4 h-4" />
                            </button>
                            {!q.convertedOrderId &&
                              (q.approvalStatus === "APPROVED" ||
                                q.approvalStatus === "AUTO_APPROVED") && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertOrder(q)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#ECFDF5] text-[#059669] hover:bg-emerald-100"
                                  title="Chuyển thành Đơn hàng"
                                >
                                  <FileOutput className="w-3.5 h-3.5" />
                                  Lên đơn
                                </button>
                              )}
                            {q.convertedOrderId && (
                              <span className="text-[11px] font-medium text-slate-400 px-1.5">
                                Đã lên đơn
                              </span>
                            )}
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

      {/* Create / Version Quote Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5EAF2] w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF2] bg-[#F8FAFC]">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {baseQuoteCode
                    ? `Tạo phiên bản mới cho ${baseQuoteCode}`
                    : "Lập Phiếu Báo giá & Check Specs"}
                </h2>
                <p className="text-xs text-slate-500">
                  Hàng OEM hoặc biên lợi nhuận dưới định mức sẽ khóa ở trạng thái Chờ Trưởng phòng duyệt
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
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-4"
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
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
                    Loại báo giá
                  </label>
                  <select
                    value={quoteType}
                    onChange={(e) =>
                      setQuoteType(e.target.value as "STANDARD" | "OEM")
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
                  >
                    <option value="STANDARD">Standard (Hàng chuẩn)</option>
                    <option value="OEM">OEM (Gia công / Check Specs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Điều kiện Incoterms
                  </label>
                  <select
                    value={incoterm}
                    onChange={(e) =>
                      setIncoterm(
                        e.target.value as "EXW" | "FOB" | "CFR" | "CIF"
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[#1677FF] focus:outline-none"
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
                    Cảng đi / Cảng đến
                  </label>
                  <input
                    type="text"
                    value={portName}
                    onChange={(e) => setPortName(e.target.value)}
                    placeholder="VD: Cát Lái, HCM / Hamburg"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1677FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Biên lợi nhuận kỳ vọng (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1677FF] focus:outline-none"
                  />
                </div>
              </div>

              {/* Costs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Chi phí bao bì/trục in ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Phí kiểm định/test lab ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={testingCost}
                    onChange={(e) => setTestingCost(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Local Charges ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={localCharges}
                    onChange={(e) => setLocalCharges(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Cước tàu biển ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={seaFreight}
                    onChange={(e) => setSeaFreight(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>

              {/* Specs Check */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Yêu cầu Check Specs / Quy cách bao bì / Chứng nhận (FDA, HACCP, Vi sinh...)
                  </label>
                  <input
                    type="text"
                    value={specsNotes}
                    onChange={(e) => setSpecsNotes(e.target.value)}
                    placeholder="VD: Nhãn phụ tiếng Đức, túi zip 250g, test vi sinh HQ..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#1677FF] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      MOQ
                    </label>
                    <input
                      type="text"
                      value={moq}
                      onChange={(e) => setMoq(e.target.value)}
                      placeholder="1 cont 40HC"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Lead time (ngày)
                    </label>
                    <input
                      type="number"
                      value={leadTimeDays}
                      onChange={(e) => setLeadTimeDays(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 uppercase">
                    Danh sách SKU báo giá
                  </span>
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
                    Thêm SKU
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
                          {p.sku} — {p.name}
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
                      placeholder="Số thùng"
                      className="col-span-5 sm:col-span-2 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(idx, "unitPrice", e.target.value)
                      }
                      placeholder="Giá/thùng"
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

                <div className="flex items-center justify-between bg-[#EBF4FF] border border-[#BFDBFE] rounded-lg px-4 py-3 mt-2">
                  <span className="text-sm font-medium text-slate-700">
                    Tổng giá trị báo giá (bao gồm phụ phí):
                  </span>
                  <span className="text-lg font-bold text-[#1677FF] tabular-nums">
                    {formatUSD(draftTotal)}
                  </span>
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
                  {saving ? "Đang lưu..." : "Lưu Báo giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

