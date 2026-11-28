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
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Khách hàng Xuất khẩu (CRM)
            </h1>
            <p className="text-sm text-slate-500">
              {isManagerOrAdmin
                ? `Đang xem toàn bộ khách hàng (${customers.length})`
                : `Khách hàng do ${currentUser?.name ?? "bạn"} phụ trách (${customers.length})`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1677FF] hover:bg-[#0E63DB] shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm khách hàng
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl border border-[#E5EAF2] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="relative col-span-2 sm:flex-1 sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên công ty, mã CUS, PIC, email..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <CustomSelect
            value={countryFilter}
            onChange={(val) => setCountryFilter(val)}
            options={[
              { value: "ALL", label: "Tất cả Quốc gia" },
              ...uniqueCountries.map((c) => ({ value: c, label: c })),
            ]}
            className="sm:w-44"
          />

          <CustomSelect
            value={portFilter}
            onChange={(val) => setPortFilter(val)}
            options={[
              { value: "ALL", label: "Tất cả Cảng đến" },
              ...uniquePorts.map((p) => ({ value: p, label: p })),
            ]}
            className="sm:w-44"
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
            className="sm:w-40"
          />

          <CustomSelect
            value={stageFilter}
            onChange={(val) => setStageFilter(val)}
            options={[
              { value: "ALL", label: "Tất cả Trạng thái" },
              ...PIPELINE_STAGES.map((st) => ({
                value: st.key,
                label: `${st.label} (${st.viLabel})`,
              })),
            ]}
            className="sm:w-52"
          />

          {isManagerOrAdmin && (
            <CustomSelect
              value={salesRepFilter}
              onChange={(val) => setSalesRepFilter(val)}
              options={[
                { value: "ALL", label: "Tất cả Sale" },
                ...users.map((u) => ({ value: u.id, label: u.name })),
              ]}
              className="sm:w-44"
            />
          )}

          <button
            type="button"
            onClick={loadCustomers}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
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
            customers={customers}
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
