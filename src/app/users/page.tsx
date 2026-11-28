"use client";

import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, Plus, Unlock, Users, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import type { Role, UserDTO } from "@/types/crm";
import { ROLE_LABELS } from "@/lib/constants";

interface AdminUserRow extends UserDTO {
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("SALE");
  const [tempPassword, setTempPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users ?? []);
        setCurrentUser(data.currentUser ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const isManagerOrAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, tempPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Không thể tạo tài khoản.");
        return;
      }
      setModalOpen(false);
      setName("");
      setEmail("");
      setTempPassword("");
      setRole("SALE");
      loadUsers();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: AdminUserRow) {
    const nextActive = !u.isActive;
    const actionLabel = nextActive ? "mở khóa" : "khóa & đăng xuất ngay";
    if (!confirm(`Xác nhận ${actionLabel} tài khoản "${u.name}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Không thể cập nhật.");
      return;
    }
    loadUsers();
  }

  async function resetTempPassword(u: AdminUserRow) {
    const nextPass = prompt(
      `Nhập mật khẩu tạm mới cho "${u.name}" (tối thiểu 6 ký tự):`,
      ""
    );
    if (!nextPass) return;
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempPassword: nextPass }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Không thể đặt lại mật khẩu.");
      return;
    }
    alert(`Đã cấp mật khẩu tạm mới cho ${u.name}. Nhân viên sẽ phải đổi mật khẩu khi đăng nhập.`);
    loadUsers();
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Tài khoản Nhân viên
            </h1>
            <p className="text-sm text-slate-500">
              Chỉ Trưởng phòng / Admin được cấp tài khoản mới, phân vai trò và khóa tài khoản
            </p>
          </div>

          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Cấp tài khoản nhân viên
            </button>
          )}
        </div>

        {!loading && !isManagerOrAdmin ? (
          <div className="bg-white rounded-xl border border-[#E5EAF2] p-8 text-center text-rose-600 text-sm">
            Bạn không có quyền truy cập trang Quản lý nhân sự.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Nhân viên</th>
                    <th className="py-3 px-4">Email đăng nhập</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Yêu cầu đổi MK</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7] text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          {u.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                        {u.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF4FF] text-[#1677FF]">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669]">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#DC2626]">
                            Đã khóa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {u.mustChangePassword ? (
                          <span className="text-amber-700 font-medium">
                            Chờ đổi MK lần đầu
                          </span>
                        ) : (
                          "Đã đổi"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => resetTempPassword(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                            title="Cấp lại mật khẩu tạm"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset MK
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => toggleActive(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                u.isActive
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {u.isActive ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  Khóa
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  Mở khóa
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Employee Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5EAF2] w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF2] bg-[#F8FAFC]">
              <h2 className="text-base font-bold text-slate-900">
                Cấp tài khoản nhân viên mới
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email công ty <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vana@tannhien.vn"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="SALE">Sale Export</option>
                  <option value="SALES_ADMIN">Sales Admin (Điều phối)</option>
                  <option value="MANAGER">Quản lý (Manager)</option>
                  {currentUser?.role === "ADMIN" && (
                    <option value="ADMIN">Trưởng phòng (Admin)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu tạm (bắt buộc đổi khi đăng nhập lần đầu){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] disabled:opacity-50"
                >
                  {saving ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
