"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import AppShell from "@/components/AppShell";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể đổi mật khẩu.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto mt-6 bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5EAF2] bg-[#F8FAFC] flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-[#1677FF]" />
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Đổi mật khẩu tài khoản
            </h1>
            <p className="text-xs text-slate-500">
              Bắt buộc đổi mật khẩu mới khi đăng nhập lần đầu bằng mật khẩu tạm
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Đổi mật khẩu thành công. Đang chuyển về trang chủ...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu hiện tại (hoặc mật khẩu tạm)
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu mới (tối thiểu 6 ký tự)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1677FF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

