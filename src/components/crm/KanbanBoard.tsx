"use client";

import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Anchor,
  Building2,
  Globe,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";
import type { CustomerDTO } from "@/types/crm";
import { getChannelLabel, PIPELINE_STAGES } from "@/lib/constants";

interface KanbanBoardProps {
  customers: CustomerDTO[];
  onStageChange: (
    customer: CustomerDTO,
    targetStage: CustomerDTO["pipelineStage"]
  ) => void;
  onSelectCustomer: (customer: CustomerDTO) => void;
}

export default function KanbanBoard({
  customers,
  onStageChange,
  onSelectCustomer,
}: KanbanBoardProps) {
  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const customer = customers.find((c) => c.id === draggableId);
    if (!customer) return;

    const targetStage =
      destination.droppableId as CustomerDTO["pipelineStage"];
    if (customer.pipelineStage === targetStage) return;

    onStageChange(customer, targetStage);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 sm:gap-3.5 overflow-x-auto pb-4 kanban-scroll snap-x sm:snap-none snap-mandatory min-h-[calc(100vh-290px)] sm:min-h-[calc(100vh-260px)]">
        {PIPELINE_STAGES.map((stage) => {
          const columnCustomers = customers.filter(
            (c) => c.pipelineStage === stage.key
          );

          return (
            <div
              key={stage.key}
              className="w-[272px] sm:w-[295px] shrink-0 snap-start flex flex-col rounded-xl bg-[#EEF2F7]/75 border border-[#E5EAF2]"
            >
              {/* Column Header */}
              <div
                className={`p-3 rounded-t-xl border-t-4 border-b border-[#E5EAF2] ${stage.headerBg}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {stage.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {stage.viLabel}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${stage.badge}`}
                  >
                    {columnCustomers.length}
                  </span>
                </div>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={stage.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2.5 space-y-2.5 overflow-y-auto kanban-scroll transition-colors rounded-b-xl ${
                      snapshot.isDraggingOver ? "bg-blue-50/70" : ""
                    }`}
                  >
                    {columnCustomers.map((customer, index) => {
                      const primaryPic =
                        customer.contacts.find((c) => c.isPrimary) ??
                        customer.contacts[0];

                      return (
                        <Draggable
                          key={customer.id}
                          draggableId={customer.id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={() => onSelectCustomer(customer)}
                              className={`bg-white rounded-lg border p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#1677FF]/50 hover:shadow-sm transition-all cursor-pointer ${
                                dragSnapshot.isDragging
                                  ? "border-[#1677FF] shadow-lg rotate-1"
                                  : "border-[#E5EAF2]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[11px] font-mono font-semibold text-[#1677FF] bg-[#EBF4FF] border border-[#BFDBFE]/60 px-1.5 py-0.5 rounded">
                                  {customer.customerCode}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 truncate">
                                  {getChannelLabel(customer.channel).split(" ")[0]}
                                </span>
                              </div>

                              <h4 className="font-semibold text-sm text-slate-900 leading-snug mb-2 flex items-start gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">
                                  {customer.companyName}
                                </span>
                              </h4>

                              <div className="space-y-1 text-xs text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">
                                    {customer.countryRegion}
                                  </span>
                                </div>
                                {customer.portOfDestination && (
                                  <div className="flex items-center gap-1.5">
                                    <Anchor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      Cảng: {customer.portOfDestination}
                                    </span>
                                  </div>
                                )}
                                {primaryPic && (
                                  <div className="flex items-center gap-1.5 text-slate-700 pt-0.5">
                                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="truncate font-medium">
                                      {primaryPic.name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {customer.pipelineStage === "LOST" &&
                                customer.lostReason && (
                                  <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-1 line-clamp-2">
                                    Lý do: {customer.lostReason}
                                  </div>
                                )}

                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <span className="flex items-center gap-1 truncate">
                                  <User className="w-3 h-3" />
                                  {customer.salesRep.name}
                                </span>
                                <span className="flex items-center gap-1 shrink-0 font-medium text-slate-600">
                                  <ShoppingBag className="w-3 h-3" />
                                  {customer._count?.orders ?? 0} đơn
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

