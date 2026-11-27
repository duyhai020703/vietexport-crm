"use client";

import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import type { CustomerDTO } from "@/types/crm";
import {
  getChannelLabel,
  getSourceLabel,
  getStageMeta,
} from "@/lib/constants";

interface CustomerListViewProps {
  customers: CustomerDTO[];
  onEdit: (customer: CustomerDTO) => void;
  onDelete: (customer: CustomerDTO) => void;
}

export default function CustomerListView({
  customers,
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
    <div className="bg-white rounded-xl border border-[#E5EAF2] shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E5EAF2] text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Mã KH</th>
              <th className="py-3 px-4">Công ty</th>
              <th className="py-3 px-4">Quốc gia / Cảng đến</th>
              <th className="py-3 px-4">Phân loại / Nguồn</th>
              <th className="py-3 px-4">PIC Chính</th>
              <th className="py-3 px-4">Trạng thái</th>
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
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${stage.color}`}
                    >
                      {stage.label}
                    </span>
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
                      <button
                        type="button"
                        onClick={() => onDelete(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

