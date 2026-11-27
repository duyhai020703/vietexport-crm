"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface LostReasonModalProps {
  open: boolean;
  companyName: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export default function LostReasonModal({
  open,
  companyName,
  onCancel,
  onConfirm,
}: LostReasonModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do trượt (Lost Reason) trước khi lưu.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(reason.trim());
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-rose-50/60">
          <div className="flex items-center gap-2.5 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold text-base">
              Xác nhận chuyển sang Lost
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Khách hàng{" "}
            <span className="font-semibold text-slate-900">{companyName}</span>{" "}
            đang được chuyển sang trạng thái{" "}
            <span className="font-semibold text-rose-600">Lost</span>. Vui lòng
            nhập lý do trượt để phục vụ thống kê.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Lý do trượt (Lost Reason) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              autoFocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="VD: Giá chưa cạnh tranh, khách yêu cầu L/C trả chậm 90 ngày, không đạt chứng nhận..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
            />
            {error && <p className="text-xs text-rose-600 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Đang lưu..." : "Xác nhận Lost"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

