"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardCheck,
  ShoppingCart,
  Package,
  BarChart3,
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
  { href: "/quotations", label: "Báo giá & Check Specs", icon: ClipboardCheck },
  { href: "/orders", label: "Điều phối Đơn hàng", icon: ShoppingCart },
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
        <div className="w-full px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <img
                src="/logo.png"
                alt="TanNhienExport-CRM"
                className="w-8 h-8 object-contain shrink-0"
              />
              <div className="leading-tight">
                <span className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight block truncate max-w-[140px] sm:max-w-none">
                  TanNhienExport-CRM
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block">
                  Quản lý Xuất khẩu B2B
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
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
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#F8FAFC] border border-[#E5EAF2] rounded-lg px-2 sm:px-2.5 py-1.5">
                {currentUser.role === "SALE" ? (
                  <UserCheck className="w-4 h-4 text-[#1677FF] shrink-0" />
                ) : (
                  <Shield className="w-4 h-4 text-[#059669] shrink-0" />
                )}
                <span className="text-xs text-slate-500 hidden xl:inline">
                  Tài khoản:
                </span>
                <select
                  aria-label="Chuyển đổi nhân viên"
                  disabled={switching}
                  value={currentUser.id}
                  onChange={(e) => handleSwitchUser(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1 max-w-[125px] sm:max-w-[210px] lg:max-w-none truncate"
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

        {/* Mobile & Tablet Nav */}
        <div className="lg:hidden border-t border-[#E5EAF2] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto">
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

