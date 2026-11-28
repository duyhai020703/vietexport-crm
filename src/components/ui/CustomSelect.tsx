"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "-- Chọn --",
  searchable = false,
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(q))
    );
  }, [options, query]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-1.5 text-left text-xs sm:text-sm transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
          open
            ? "border-[#5B46F6] ring-2 ring-[#5B46F6]/30"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <span
          className={`truncate ${
            selectedOption ? "text-slate-800 font-medium" : "text-slate-400"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#5B46F6] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl border border-slate-100 shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-1.5 min-w-[170px]">
          {searchable && options.length > 6 && (
            <div className="relative mb-1.5 px-1 pt-0.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm nhanh..."
                className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-[#5B46F6] focus:outline-none"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-slate-400 text-center">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-colors ${
                      isSelected
                        ? "bg-[#5B46F6] text-white font-medium"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{opt.label}</div>
                      {opt.subLabel && (
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? "text-indigo-100" : "text-slate-400"
                          }`}
                        >
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

