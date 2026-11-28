"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_LONG = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];

function parseYMD(val: string): Date | null {
  if (!val) return null;
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  className = "",
}: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseYMD(value), [value]);
  const [viewYear, setViewYear] = useState(() =>
    selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    selectedDate ? selectedDate.getMonth() : new Date().getMonth()
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const headerDateLabel = selectedDate
    ? `${WEEKDAY_LONG[selectedDate.getDay()]}, ${selectedDate.getDate()} thg ${selectedDate.getMonth() + 1}`
    : "-";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm cursor-pointer transition-all ${
          open
            ? "border-[#2563EB] ring-2 ring-[#2563EB]/20"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <span className={selectedDate ? "text-slate-800" : "text-slate-400"}>
          {selectedDate
            ? selectedDate.toLocaleDateString("vi-VN")
            : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedDate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
              title="Xóa ngày"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Calendar className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {open && (
        <div className="absolute left-0 mt-1.5 z-50 w-[286px] bg-white rounded-xl border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.16)] overflow-hidden">
          {/* Blue Material Header */}
          <div className="bg-[#2563EB] text-white px-4 py-3">
            <div className="text-xs text-blue-100 font-medium">
              {selectedDate ? selectedDate.getFullYear() : viewYear}
            </div>
            <div className="text-xl font-bold mt-0.5">{headerDateLabel}</div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-800">
              Tháng {viewMonth + 1} năm {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 px-3 text-center text-[11px] font-medium text-slate-500 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-1 text-center text-xs">
            {days.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const cellDate = new Date(viewYear, viewMonth, day);
              const isSelected =
                selectedDate !== null &&
                selectedDate.getFullYear() === viewYear &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getDate() === day;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onChange(toYMD(cellDate));
                    setOpen(false);
                  }}
                  className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? "bg-[#2563EB] text-white font-semibold"
                      : isToday
                      ? "border border-[#2563EB] text-[#2563EB] font-semibold hover:bg-blue-50"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-slate-500 hover:text-slate-700 font-medium px-2 py-1"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toYMD(today));
                setOpen(false);
              }}
              className="text-[#2563EB] hover:text-blue-700 font-semibold px-2 py-1"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
