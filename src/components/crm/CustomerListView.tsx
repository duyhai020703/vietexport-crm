"use client";

import React from "react";
import { Edit2, ShoppingBag, Trash2, AlertTriangle, Clock } from "lucide-react";
import type { CustomerDTO } from "@/types/crm";
import {
  getChannelLabel,
  getSourceLabel,
  getStageMeta,
  isOverdueSevenDays,
} from "@/lib/constants";

interface CustomerListViewProps {
  customers: CustomerDTO[];
  canDelete?: boolean;
  onViewStageHistory: (customer: CustomerDTO) => void;
  onEdit: (customer: CustomerDTO) => void;
  onDelete: (customer: CustomerDTO) => void;
}

export default function CustomerListView({
  customers,
  canDelete = true,
  onViewStageHistory,
  onEdit,
  onDelete,
}: CustomerListViewProps) {
  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
        Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại.
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {customers.map((c) => {
          const stage = getStageMeta(c.pipelineStage);
          const primaryPic =
            c.contacts.find((ct) => ct.isPrimary) ?? c.contacts[0];

          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-[#E5EAF2] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60 font-mono text-[11px] font-semibold mb-1">
                    {c.customerCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(c)}
                    className="block font-bold text-slate-900 text-sm text-left hover:text-[#1677FF]"
                  >
                    {c.companyName}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onViewStageHistory(c)}
                  title="Xem lịch sử chuyển trạng thái"
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 cursor-pointer hover:opacity-85 ${stage.color}`}
                >
                  {stage.label}
                </button>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>
                  Chuyển giai đoạn:{" "}
                  {new Date(c.stageChangedAt || c.updatedAt).toLocaleString(
                    "vi-VN"
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[11px]">Thị trường</span>
                  <span className="font-medium text-slate-800">{c.countryRegion}</span>
                  {c.portOfDestination && (
                    <span className="block text-[11px] text-slate-500">
                      Cảng: {c.portOfDestination}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phân loại / Nguồn</span>
                  <span className="font-medium text-slate-800">
                    {getChannelLabel(c.channel).split(" ")[0]}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {getSourceLabel(c.source)}
                  </span>
                </div>
              </div>

              {primaryPic && (
                <div className="text-xs text-slate-700 bg-[#F8FAFC] rounded-lg px-2.5 py-1.5 border border-[#EEF2F7]">
                  <span className="font-semibold">{primaryPic.name}</span>
                  {(primaryPic.email || primaryPic.phoneWhatsAppWeChat) && (
                    <span className="text-slate-500 block truncate">
                      {primaryPic.email || primaryPic.phoneWhatsAppWeChat}
                    </span>
                  )}
                </div>
              )}

              {c.pipelineStage === "LOST" && c.lostReason && (
                <p className="text-xs text-rose-600 bg-rose-50 rounded-md px-2.5 py-1.5">
                  Lý do trượt: {c.lostReason}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#EEF2F7]">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Sale: <strong className="text-slate-700">{c.salesRep.name}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                    <ShoppingBag className="w-3 h-3 text-[#1677FF]" />
                    {c._count?.orders ?? 0} đơn
                  </span>
                </div>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(c)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#1677FF] hover:bg-[#EBF4FF]"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(c)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Mã KH</th>
              <th className="py-3 px-4">Công ty</th>
              <th className="py-3 px-4">Quốc gia / Cảng đến</th>
              <th className="py-3 px-4">Phân loại / Nguồn</th>
              <th className="py-3 px-4">PIC Chính</th>
              <th className="py-3 px-4">Trạng thái &amp; Thời gian chuyển</th>
              <th className="py-3 px-4 text-center">Đơn hàng</th>
              <th className="py-3 px-4">Sale phụ trách</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F7] text-sm">
            {customers.map((c) => {
              const stage = getStageMeta(c.pipelineStage);
              const primaryPic =
                c.contacts.find((ct) => ct.isPrimary) ?? c.contacts[0];

              return (
                <tr
                  key={c.id}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60">
                      {c.customerCode}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onEdit(c)}
                      className="font-semibold text-slate-900 hover:text-blue-600 text-left"
                    >
                      {c.companyName}
                    </button>
                    {c.pipelineStage === "LOST" && c.lostReason && (
                      <p className="text-xs text-rose-600 mt-0.5 line-clamp-1">
                        Lý do trượt: {c.lostReason}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-800">{c.countryRegion}</div>
                    {c.portOfDestination && (
                      <div className="text-xs text-slate-500">
                        Cảng: {c.portOfDestination}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-800">
                      {getChannelLabel(c.channel).split(" ")[0]}
                    </div>
                    <div className="text-xs text-slate-500">
                      {getSourceLabel(c.source)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {primaryPic ? (
                      <div>
                        <div className="font-medium text-slate-800">
                          {primaryPic.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {primaryPic.email || primaryPic.phoneWhatsAppWeChat || "—"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewStageHistory(c)}
                        title="Bấm để xem lịch sử chuyển trạng thái"
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer hover:opacity-85 transition-opacity ${stage.color}`}
                      >
                        {stage.label} ({stage.viLabel})
                      </button>
                      {isOverdueSevenDays(c.pipelineStage, c.lastActivityAt) && (
                        <span
                          title="Quá 7 ngày chưa cập nhật"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          &gt;7d
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewStageHistory(c)}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#1677FF] mt-1 cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {new Date(
                          c.stageChangedAt || c.updatedAt
                        ).toLocaleString("vi-VN")}
                      </span>
                    </button>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-center">
                    <button
                      type="button"
                      onClick={() => onEdit(c)}
                      title="Xem / quản lý đơn hàng của khách"
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${
                        (c._count?.orders ?? 0) > 0
                          ? "bg-[#EBF4FF] text-[#1677FF] border border-[#BFDBFE]/60 hover:bg-blue-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {c._count?.orders ?? 0} đơn
                    </button>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                    {c.salesRep.name}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

