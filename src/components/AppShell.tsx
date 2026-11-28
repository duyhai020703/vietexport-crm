"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  ClipboardCheck,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  KeyRound,
  LogOut,
  UserCheck,
  Shield,
} from "lucide-react";
import type { UserDTO } from "@/types/crm";
import { ROLE_LABELS } from "@/lib/constants";

interface CurrentSessionUser extends UserDTO {
  mustChangePassword?: boolean;
}

interface AppShellProps {
  children: React.ReactNode;
  onUserChanged?: (user: UserDTO) => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Khách hàng (CRM)", icon: LayoutGrid, adminOnly: false },
  { href: "/quotations", label: "Báo giá & Check Specs", icon: ClipboardCheck, adminOnly: false },
  { href: "/orders", label: "Điều phối Đơn hàng", icon: ShoppingCart, adminOnly: false },
  { href: "/products", label: "Sản phẩm (SKU)", icon: Package, adminOnly: false },
  { href: "/dashboard", label: "Báo cáo Tháng", icon: BarChart3, adminOnly: false },
  { href: "/users", label: "Nhân sự", icon: Users, adminOnly: true },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentSessionUser | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/users")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!active || !data) return;
        if (data.currentUser) {
          setCurrentUser(data.currentUser);
          if (
            data.currentUser.mustChangePassword &&
            pathname !== "/change-password"
          ) {
            router.push("/change-password");
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isManagerOrAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isManagerOrAdmin
  );

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
              {visibleNav.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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

          {/* Authenticated User & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && (
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E5EAF2] rounded-lg px-2.5 py-1.5">
                {currentUser.role === "SALE" ? (
                  <UserCheck className="w-4 h-4 text-[#1677FF] shrink-0" />
                ) : (
                  <Shield className="w-4 h-4 text-[#059669] shrink-0" />
                )}
                <div className="leading-tight hidden sm:block">
                  <span className="text-xs font-semibold text-slate-800 block">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {ROLE_LABELS[currentUser.role] ?? currentUser.role}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-800 sm:hidden truncate max-w-[90px]">
                  {currentUser.name}
                </span>
              </div>
            )}

            <Link
              href="/change-password"
              title="Đổi mật khẩu"
              className="p-2 rounded-lg text-slate-500 hover:text-[#1677FF] hover:bg-[#EBF4FF] transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Nav */}
        <div className="lg:hidden border-t border-[#E5EAF2] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto">
          {visibleNav.map((item) => {
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
