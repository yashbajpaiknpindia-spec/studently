"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function DetailsSheet({ open, onClose, title, subtitle, children, footer }: Props) {
  // Lock background scroll while the sheet is open, and allow Escape to close.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] sm:max-h-[85vh] flex flex-col animate-sheetUp"
      >
        {/* Drag handle, mobile only */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-3 sm:pt-6 pb-4 border-b border-violet-50 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-[17px] sm:text-[19px] leading-snug break-words">{title}</h2>
            {subtitle && <p className="text-[12.5px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-4 flex-1 min-h-0">{children}</div>

        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-violet-50 flex-shrink-0 pb-safe">{footer}</div>
        )}
      </div>

      <style>{`
        @keyframes sheetUp { from { transform: translateY(24px); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }
        .animate-sheetUp { animation: sheetUp 0.28s cubic-bezier(.22,1,.36,1) both; }
      `}</style>
    </div>
  );
}
