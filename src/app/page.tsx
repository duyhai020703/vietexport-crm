"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import CustomerListView from "@/components/crm/CustomerListView";
import CustomerFormModal from "@/components/crm/CustomerFormModal";
import LostReasonModal from "@/components/crm/LostReasonModal";
import StageHistoryModal from "@/components/crm/StageHistoryModal";
import CustomSelect from "@/components/ui/CustomSelect";
import type { CustomerDTO, UserDTO } from "@/types/crm";
import { CHANNEL_OPTIONS, PIPELINE_STAGES } from "@/lib/constants";

export default function CrmHomePage() {
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [portFilter, setPortFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [salesRepFilter, setSalesRepFilter] = useState("ALL");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | null>(null);
  const [lostTarget, setLostTarget] = useState<CustomerDTO | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerDTO | null>(null);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) {
      setUsers(data.users ?? []);
      setCurrentUser(data.currentUser ?? null);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (countryFilter !== "ALL") params.set("countryRegion", countryFilter);
      if (portFilter !== "ALL") params.set("portOfDestination", portFilter);
      if (channelFilter !== "ALL") params.set("channel", channelFilter);
      if (stageFilter !== "ALL") params.set("pipelineStage", stageFilter);
      if (salesRepFilter !== "ALL") params.set("salesRepId", salesRepFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Không thể tải dữ liệu khách hàng.");
        setCustomers([]);
      } else {
        setCustomers(data.customers ?? []);
      }
    } catch {
      setErrorMsg("Lỗi kết nối cơ sở dữ liệu. Vui lòng kiểm tra DATABASE_URL.");
    } finally {
      setLoading(false);
    }
  }, [
    search,
    countryFilter,
    portFilter,
    channelFilter,
    stageFilter,
    salesRepFilter,
  ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  const uniqueCountries = useMemo(
    () => Array.from(new Set(customers.map((c) => c.countryRegion))).sort(),
    [customers]
  );

  const uniquePorts = useMemo(
    () =>
      Array.from(
        new Set(
          customers
            .map((c) => c.portOfDestination)
            .filter((p): p is string => Boolean(p))
        )
      ).sort(),
    [customers]
  );

  async function handleStageChange(
    customer: CustomerDTO,
    targetStage: CustomerDTO["pipelineStage"]
  ) {
    if (targetStage === "LOST") {
      setLostTarget(customer);
      return;
    }

    // Optimistic update
    const prevCustomers = customers;
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id ? { ...c, pipelineStage: targetStage } : c
      )
    );

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: targetStage }),
      });
      if (!res.ok) {
        setCustomers(prevCustomers);
        const data = await res.json();
        alert(data.error || "Không thể cập nhật trạng thái.");
      }
    } catch {
      setCustomers(prevCustomers);
    }
  }

  async function handleConfirmLost(reason: string) {
    if (!lostTarget) return;
    const res = await fetch(`/api/customers/${lostTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipelineStage: "LOST",
        lostReason: reason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể lưu trạng thái Lost.");
    }
    setLostTarget(null);
    loadCustomers();
  }

  async function handleDeleteCustomer(customer: CustomerDTO) {
    if (!confirm(`Xác nhận xóa khách hàng "${customer.companyName}"?`)) return;
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Không thể xóa khách hàng.");
      return;
    }
    loadCustomers();
  }

  const isManagerOrAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  return (
    <AppShell
      onUserChanged={(u) => {
        setCurrentUser(u);
        setSalesRepFilter("ALL");
        loadCustomers();
      }}
    >
      <div className="space-y-4">
        {/* Header & Filter Card */}
        <div className="bg-white rounded-2xl border border-[#E5EAF2] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3.5">
          {/* Top Row: Title + Stage Filter Pills + Actions */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-5 rounded-full bg-[#1677FF] shrink-0" />
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Quản lý Khách hàng Xuất khẩu (CRM)
                </h1>
              </div>

              {/* Pipeline Stage Filter Buttons */}
              <div className="bg-[#F8FAFC] border border-[#E5EAF2] rounded-xl p-1.5 flex flex-wrap items-center gap-1.5">
                {PIPELINE_STAGES.map((st) => {
                  const isActive = stageFilter === st.key;
                  const activeMap: Record<string, string> = {
                    NEW_LEAD: "bg-slate-700 text-white border-slate-700 shadow-xs",
                    QUOTED: "bg-[#1677FF] text-white border-[#1677FF] shadow-xs",
                    NEGOTIATING: "bg-[#D97706] text-white border-[#D97706] shadow-xs",
                    ACTIVE_WON: "bg-[#059669] text-white border-[#059669] shadow-xs",
                    LOST: "bg-[#DC2626] text-white border-[#DC2626] shadow-xs",
                  };
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() =>
                        setStageFilter((prev) =>
                          prev === st.key ? "ALL" : st.key
                        )
                      }
                      title={`${st.label} (${st.viLabel}) — ${st.description}`}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${
                        isActive
                          ? activeMap[st.key] ??
                            "bg-[#1677FF] text-white border-[#1677FF] shadow-xs"
                          : `${st.color} hover:opacity-85`
                      }`}
                    >
                      {st.viLabel}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setStageFilter("ALL")}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${
                    stageFilter === "ALL"
                      ? "bg-[#1677FF] text-white border-[#1677FF] shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Tất cả
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadCustomers}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF2] bg-white text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                title="Làm mới"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Làm mới
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCustomer(null);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm khách hàng
              </button>
            </div>
          </div>

          {/* Bottom Row: Compact Search (Left) + Secondary Filters (Right) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
            <div className="relative w-full sm:w-72 lg:w-80 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên công ty, mã CUS, PIC, email..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E5EAF2] bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#1677FF] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <CustomSelect
                value={countryFilter}
                onChange={(val) => setCountryFilter(val)}
                options={[
                  { value: "ALL", label: "Tất cả Quốc gia" },
                  ...uniqueCountries.map((c) => ({ value: c, label: c })),
                ]}
                className="sm:w-40"
              />

              <CustomSelect
                value={portFilter}
                onChange={(val) => setPortFilter(val)}
                options={[
                  { value: "ALL", label: "Tất cả Cảng đến" },
                  ...uniquePorts.map((p) => ({ value: p, label: p })),
                ]}
                className="sm:w-40"
              />

              <CustomSelect
                value={channelFilter}
                onChange={(val) => setChannelFilter(val)}
                options={[
                  { value: "ALL", label: "Tất cả Phân loại" },
                  ...CHANNEL_OPTIONS.map((ch) => ({
                    value: ch.value,
                    label: ch.label.split(" ")[0],
                  })),
                ]}
                className="sm:w-38"
              />

              <CustomSelect
                value={customerTypeFilter}
                onChange={(val) => setCustomerTypeFilter(val)}
                options={[
                  { value: "ALL", label: "Khách mới & cũ" },
                  { value: "NEW", label: "Khách mới (0 đơn chốt)" },
                  { value: "EXISTING", label: "Khách cũ (Đã có đơn)" },
                ]}
                className="sm:w-44"
              />

              {isManagerOrAdmin && (
                <CustomSelect
                  value={salesRepFilter}
                  onChange={(val) => setSalesRepFilter(val)}
                  options={[
                    { value: "ALL", label: "Tất cả Sale" },
                    ...users.map((u) => ({ value: u.id, label: u.name })),
                  ]}
                  className="sm:w-40"
                />
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Main Content */}
        {loading && customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
            Đang tải dữ liệu khách hàng...
          </div>
        ) : (
          <CustomerListView
            customers={
              customerTypeFilter === "ALL"
                ? customers
                : customers.filter((c) => c.customerType === customerTypeFilter)
            }
            canDelete={isManagerOrAdmin}
            onViewStageHistory={(c) => setHistoryCustomer(c)}
            onEdit={(c) => {
              setEditingCustomer(c);
              setFormOpen(true);
            }}
            onDelete={handleDeleteCustomer}
          />
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <CustomerFormModal
        open={formOpen}
        customer={editingCustomer}
        currentUser={currentUser}
        users={users}
        onClose={() => setFormOpen(false)}
        onSaved={loadCustomers}
      />

      {/* Lost Reason Popup when dragging to Lost */}
      <LostReasonModal
        open={Boolean(lostTarget)}
        companyName={lostTarget?.companyName ?? ""}
        onCancel={() => setLostTarget(null)}
        onConfirm={handleConfirmLost}
      />

      {/* Stage History Dialog */}
      <StageHistoryModal
        customer={historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />
    </AppShell>
  );
}
