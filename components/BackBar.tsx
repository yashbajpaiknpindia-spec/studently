"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type Props = {
  /** Label shown next to the back arrow, e.g. "Dashboard" */
  label?: string;
  /** Fallback route used when there's no browser history to go back to (e.g. opened via direct link/share) */
  fallbackHref?: string;
  /** Optional content rendered on the right side of the bar (e.g. a filter button) */
  right?: React.ReactNode;
  /** Optional title shown centered on the bar for context on deep subpages */
  title?: string;
  className?: string;
};

export default function BackBar({ label = "Back", fallbackHref = "/dashboard", right, title, className = "" }: Props) {
  const router = useRouter();

  const goBack = () => {
    // Prefer real browser back so the user returns exactly where they came from,
    // but always have a safe fallback for direct links/shares with no history.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <div className={`sticky top-0 z-40 safe-top bg-white/90 backdrop-blur-md border-b border-violet-100 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 h-12">
        <button
          onClick={goBack}
          className="flex items-center gap-1 -ml-1.5 pl-1.5 pr-3 py-1.5 rounded-full text-[13.5px] font-medium text-slate-600 hover:bg-violet-50 hover:text-[#4F46E5] transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft size={19} strokeWidth={2.25} />
          {label}
        </button>
        {title && <span className="text-[13.5px] font-medium text-slate-500 truncate flex-1 text-center sm:text-left">{title}</span>}
        <div className="flex-shrink-0">{right}</div>
      </div>
    </div>
  );
}
