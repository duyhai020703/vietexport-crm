"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại.");
        return;
      }

      if (data.user?.mustChangePassword) {
        window.location.href = "/change-password";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F3F6FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5EAF2] shadow-[0_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="px-6 pt-7 pb-5 border-b border-[#E5EAF2] text-center bg-[#F8FAFC]">
          <img
            src="/logo.png"
            alt="TanNhienExport-CRM"
            className="w-12 h-12 object-contain mx-auto mb-3"
          />
          <h1 className="text-lg font-bold text-slate-900">
            TanNhienExport-CRM
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đăng nhập hệ thống Quản trị Kinh doanh Xuất khẩu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email nhân viên
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@tannhien.vn"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] disabled:opacity-50 transition-colors"
          >
            {loading ? "Đang xác thực..." : "Đăng nhập"}
          </button>

          <p className="text-[11px] text-center text-slate-400 pt-1">
            Tài khoản được cấp nội bộ bởi Trưởng phòng / Admin.
          </p>
        </form>
      </div>
    </div>
  );
}

