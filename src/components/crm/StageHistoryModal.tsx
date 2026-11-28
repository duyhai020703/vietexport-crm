"use client";

import React from "react";
import { ArrowRight, Clock, History, User, X } from "lucide-react";
import type { CustomerDTO } from "@/types/crm";
import { getStageMeta } from "@/lib/constants";

interface StageHistoryModalProps {
  customer: CustomerDTO | null;
  onClose: () => void;
}

export default function StageHistoryModal({
  customer,
  onClose,
}: StageHistoryModalProps) {
  if (!customer) return null;

  const histories = customer.stageHistories ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E5EAF2] w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF2] bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#1677FF]" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Lịch sử chuyển trạng thái
              </h3>
              <p className="text-xs text-slate-500">
                {customer.customerCode} — {customer.companyName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {histories.length === 0 ? (
            <div className="rounded-lg border border-[#E5EAF2] bg-[#F8FAFC] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getStageMeta(customer.pipelineStage).color
                  }`}
                >
                  {getStageMeta(customer.pipelineStage).label} (
                  {getStageMeta(customer.pipelineStage).viLabel})
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(
                    customer.stageChangedAt || customer.createdAt
                  ).toLocaleString("vi-VN")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Phụ trách: <strong>{customer.salesRep.name}</strong> (Trạng
                  thái hiện tại)
                </span>
              </div>
            </div>
          ) : (
            histories.map((h) => {
              const fromMeta = h.fromStage ? getStageMeta(h.fromStage) : null;
              const toMeta = getStageMeta(h.toStage);

              return (
                <div
                  key={h.id}
                  className="rounded-lg border border-[#E5EAF2] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {fromMeta ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${fromMeta.color}`}
                        >
                          {fromMeta.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                          Khởi tạo
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${toMeta.color}`}
                      >
                        {toMeta.label} ({toMeta.viLabel})
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(h.changedAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Người chuyển:{" "}
                      <strong className="text-slate-800">
                        {h.changedBy?.name ?? "Hệ thống"}
                      </strong>
                    </span>
                  </div>

                  {h.note && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
                      Ghi chú / Lý do: {h.note}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#E5EAF2] bg-[#F8FAFC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-200/70 hover:bg-slate-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
