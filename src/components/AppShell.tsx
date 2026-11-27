"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ShoppingCart,
  Package,
  BarChart3,
  Globe2,
  UserCheck,
  Shield,
} from "lucide-react";
import type { UserDTO } from "@/types/crm";
import { ROLE_LABELS } from "@/lib/constants";

interface AppShellProps {
  children: React.ReactNode;
  onUserChanged?: (user: UserDTO) => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Khách hàng (CRM)", icon: LayoutGrid },
  { href: "/orders", label: "Đơn hàng & Báo giá", icon: ShoppingCart },
  { href: "/products", label: "Sản phẩm (SKU)", icon: Package },
  { href: "/dashboard", label: "Báo cáo Tháng", icon: BarChart3 },
];

export default function AppShell({ children, onUserChanged }: AppShellProps) {
  const pathname = usePathname();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.users) setUsers(data.users);
        if (data.currentUser) setCurrentUser(data.currentUser);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleSwitchUser(userId: string) {
    setSwitching(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.currentUser) {
        setCurrentUser(data.currentUser);
        if (onUserChanged) {
          onUserChanged(data.currentUser);
        } else {
          window.location.reload();
        }
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F3F6FA]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-[#E5EAF2] shadow-[0_1px_2px_rgba(22,119,255,0.03)]">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#1677FF] text-white flex items-center justify-center shadow-xs">
                <Globe2 className="w-4.5 h-4.5" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-slate-800 text-sm tracking-tight block">
                  VietExport CRM
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Quản lý Xuất khẩu B2B
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/80"
                        : "text-slate-600 hover:bg-[#F4F7FB] hover:text-slate-900 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Role / User Switcher */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E5EAF2] rounded-lg px-2.5 py-1.5">
                {currentUser.role === "SALE" ? (
                  <UserCheck className="w-4 h-4 text-[#1677FF] shrink-0" />
                ) : (
                  <Shield className="w-4 h-4 text-[#059669] shrink-0" />
                )}
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Tài khoản:
                </span>
                <select
                  aria-label="Chuyển đổi nhân viên"
                  disabled={switching}
                  value={currentUser.id}
                  onChange={(e) => handleSwitchUser(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {ROLE_LABELS[u.role] ?? u.role}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden border-t border-[#E5EAF2] px-3 py-1.5 flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-[#EBF4FF] text-[#1677FF]"
                    : "text-slate-600 hover:bg-[#F4F7FB]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 py-4">
        {children}
      </main>
    </div>
  );
}

