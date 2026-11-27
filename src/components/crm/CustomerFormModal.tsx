"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type {
  CustomerContactDTO,
  CustomerDTO,
  UserDTO,
} from "@/types/crm";
import {
  CHANNEL_OPTIONS,
  PIPELINE_STAGES,
  SOURCE_OPTIONS,
} from "@/lib/constants";

interface CustomerFormModalProps {
  open: boolean;
  customer: CustomerDTO | null;
  currentUser: UserDTO | null;
  users: UserDTO[];
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_CONTACT: CustomerContactDTO = {
  name: "",
  position: "",
  email: "",
  phoneWhatsAppWeChat: "",
  isPrimary: true,
};

export default function CustomerFormModal({
  open,
  customer,
  currentUser,
  users,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  const isEdit = Boolean(customer);
  const canReassign =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [companyName, setCompanyName] = useState("");
  const [countryRegion, setCountryRegion] = useState("");
  const [portOfDestination, setPortOfDestination] = useState("");
  const [channel, setChannel] = useState<CustomerDTO["channel"]>("IMPORTER");
  const [source, setSource] = useState<CustomerDTO["source"]>("TRADE_FAIR");
  const [salesRepId, setSalesRepId] = useState("");
  const [pipelineStage, setPipelineStage] =
    useState<CustomerDTO["pipelineStage"]>("NEW_LEAD");
  const [lostReason, setLostReason] = useState("");
  const [contacts, setContacts] = useState<CustomerContactDTO[]>([
    { ...EMPTY_CONTACT },
  ]);

  const [duplicateWarning, setDuplicateWarning] = useState<{
    customerCode: string;
    companyName: string;
    salesRepName: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setDuplicateWarning(null);
    if (customer) {
      setCompanyName(customer.companyName);
      setCountryRegion(customer.countryRegion);
      setPortOfDestination(customer.portOfDestination ?? "");
      setChannel(customer.channel);
      setSource(customer.source);
      setSalesRepId(customer.salesRepId);
      setPipelineStage(customer.pipelineStage);
      setLostReason(customer.lostReason ?? "");
      setContacts(
        customer.contacts.length > 0
          ? customer.contacts.map((c) => ({
              name: c.name,
              position: c.position ?? "",
              email: c.email ?? "",
              phoneWhatsAppWeChat: c.phoneWhatsAppWeChat ?? "",
              isPrimary: c.isPrimary,
            }))
          : [{ ...EMPTY_CONTACT }]
      );
    } else {
      setCompanyName("");
      setCountryRegion("");
      setPortOfDestination("");
      setChannel("IMPORTER");
      setSource("TRADE_FAIR");
      setSalesRepId(currentUser?.id ?? "");
      setPipelineStage("NEW_LEAD");
      setLostReason("");
      setContacts([{ ...EMPTY_CONTACT }]);
    }
  }, [open, customer, currentUser]);

  // Real-time duplicate company name check
  useEffect(() => {
    if (!open) return;
    const trimmed = companyName.trim();
    if (trimmed.length < 2) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ companyName: trimmed });
        if (customer?.id) params.set("excludeId", customer.id);
        const res = await fetch(`/api/customers/check-duplicate?${params}`);
        const data = await res.json();
        if (data.exists && data.match) {
          setDuplicateWarning(data.match);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // ignore network check errors
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [companyName, customer?.id, open]);

  if (!open) return null;

  function addContactRow() {
    setContacts((prev) => [
      ...prev,
      {
        name: "",
        position: "",
        email: "",
        phoneWhatsAppWeChat: "",
        isPrimary: prev.length === 0,
      },
    ]);
  }

  function removeContactRow(index: number) {
    setContacts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((c) => c.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  }

  function updateContact(
    index: number,
    field: keyof CustomerContactDTO,
    value: string | boolean
  ) {
    setContacts((prev) =>
      prev.map((c, i) => {
        if (field === "isPrimary" && value === true) {
          return { ...c, isPrimary: i === index };
        }
        if (i === index) {
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!companyName.trim() || !countryRegion.trim()) {
      setError("Vui lòng nhập Tên công ty và Quốc gia/Khu vực.");
      return;
    }

    if (pipelineStage === "LOST" && !lostReason.trim()) {
      setError("Bắt buộc nhập Lý do trượt khi chọn trạng thái Lost.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        countryRegion: countryRegion.trim(),
        portOfDestination: portOfDestination.trim() || null,
        channel,
        source,
        ...(canReassign && salesRepId ? { salesRepId } : {}),
        pipelineStage,
        lostReason: pipelineStage === "LOST" ? lostReason.trim() : null,
        contacts: contacts.filter((c) => c.name.trim()),
      };

      const url = isEdit
        ? `/api/customers/${customer!.id}`
        : "/api/customers";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể lưu thông tin khách hàng.");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E5EAF2] w-full max-w-3xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E5EAF2] bg-[#F8FAFC]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit
                ? `Cập nhật Khách hàng (${customer?.customerCode})`
                : "Thêm Khách hàng Xuất khẩu Mới"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã khách hàng sẽ được tự động sinh theo định dạng CUS-XXX
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Company info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tên công ty <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="VD: Pacific Rim Foods LLC"
                className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                  duplicateWarning
                    ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
              {duplicateWarning && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Cảnh báo trùng lặp: Công ty{" "}
                    <strong>{duplicateWarning.companyName}</strong> (
                    {duplicateWarning.customerCode}) đã tồn tại — Phụ trách:{" "}
                    <strong>{duplicateWarning.salesRepName}</strong>.
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quốc gia / Khu vực <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={countryRegion}
                onChange={(e) => setCountryRegion(e.target.value)}
                placeholder="VD: Đức - Châu Âu, Mỹ - Bắc Mỹ, Hàn Quốc - Châu Á"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cảng đến (Port of Destination)
              </label>
              <input
                type="text"
                value={portOfDestination}
                onChange={(e) => setPortOfDestination(e.target.value)}
                placeholder="VD: Rotterdam, Los Angeles, Busan"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phân loại khách hàng
              </label>
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as CustomerDTO["channel"])
                }
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {CHANNEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nguồn khách
              </label>
              <select
                value={source}
                onChange={(e) =>
                  setSource(e.target.value as CustomerDTO["source"])
                }
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Giai đoạn Pipeline
              </label>
              <select
                value={pipelineStage}
                onChange={(e) =>
                  setPipelineStage(e.target.value as CustomerDTO["pipelineStage"])
                }
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {PIPELINE_STAGES.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.label} ({st.viLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sale phụ trách
              </label>
              <select
                disabled={!canReassign}
                value={salesRepId}
                onChange={(e) => setSalesRepId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              {!canReassign && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Chỉ Manager/Admin mới có quyền chuyển giao khách hàng.
                </p>
              )}
            </div>

            {pipelineStage === "LOST" && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-rose-700 mb-1">
                  Lý do trượt (Lost Reason) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="Nhập bắt buộc lý do không chốt được khách hàng..."
                  className="w-full rounded-lg border border-rose-300 px-3.5 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* PIC / Customer Contacts */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Thông tin người liên hệ (PIC)
                </h3>
                <p className="text-xs text-slate-500">
                  Một công ty có thể có nhiều PIC (Mua hàng, Logistics, Giám đốc...)
                </p>
              </div>
              <button
                type="button"
                onClick={addContactRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm PIC
              </button>
            </div>

            <div className="space-y-3">
              {contacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => updateContact(idx, "isPrimary", true)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        contact.isPrimary
                          ? "bg-amber-100 text-amber-800"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          contact.isPrimary ? "fill-amber-500 text-amber-500" : ""
                        }`}
                      />
                      {contact.isPrimary ? "Liên hệ chính" : "Đặt làm chính"}
                    </button>

                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContactRow(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                        title="Xóa người liên hệ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      placeholder="Họ tên PIC *"
                      value={contact.name}
                      onChange={(e) =>
                        updateContact(idx, "name", e.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Chức vụ (VD: Buyer)"
                      value={contact.position}
                      onChange={(e) =>
                        updateContact(idx, "position", e.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(idx, "email", e.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="SĐT / WhatsApp / WeChat"
                      value={contact.phoneWhatsAppWeChat}
                      onChange={(e) =>
                        updateContact(
                          idx,
                          "phoneWhatsAppWeChat",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Đang lưu..."
                : isEdit
                ? "Lưu thay đổi"
                : "Tạo khách hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

