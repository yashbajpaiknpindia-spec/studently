"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, GraduationCap, Briefcase, Users, CreditCard,
  ListChecks, Landmark, Bell, ShieldAlert, LogOut, Menu, X, Radar, Sparkles, Home
} from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/scholarships", label: "Scholarships", icon: GraduationCap },
  { href: "/admin/jobs", label: "Jobs & Internships", icon: Briefcase },
  { href: "/admin/ai-job-search", label: "AI Deep Search", icon: Sparkles },
  { href: "/admin/sources", label: "Aggregation Sources", icon: Radar },
  { href: "/admin/weekly-scholarship-tests", label: "Weekly Scholarship Tests", icon: ListChecks },
  { href: "/admin/sponsors", label: "Sponsors", icon: Landmark },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/fraud-detection", label: "Fraud Detection", icon: ShieldAlert },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const activeItem = nav.find((item) => item.href === pathname);

  const SidebarContent = () => (
    <>
      <Link
        href="/"
        className="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-xl text-[13.5px] font-medium text-slate-500 hover:bg-violet-50 hover:text-[#4F46E5] transition-colors flex-shrink-0"
      >
        <Home size={16} strokeWidth={2} /> Back to homepage
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors ${
                active ? "text-white" : "text-slate-500 hover:bg-violet-50 hover:text-[#4F46E5]"
              }`}
              style={active ? { background: G } : {}}
            >
              <item.icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <LogOut size={16} /> Log out
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F8F7FD] text-[#120F1F] md:flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Mobile top bar — the only nav entry point on small screens, so it must never be hidden */}
      <div className="md:hidden sticky top-0 z-40 safe-top bg-white border-b border-violet-100 flex items-center justify-between px-4 h-14">
        <button onClick={() => setMenuOpen(true)} className="text-slate-600" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: G }}>S</div>
          <span className="font-semibold text-[14px]">{activeItem?.label ?? "Admin panel"}</span>
        </div>
        <Link href="/" className="text-slate-600" aria-label="Back to homepage">
          <Home size={20} />
        </Link>
      </div>

      {/* Mobile slide-in drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col p-4 safe-top pb-safe animate-slideIn">
            <div className="flex items-center justify-between mb-7 px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: G }}>S</div>
                <div>
                  <p className="font-semibold text-[14px] leading-tight">Studently</p>
                  <p className="text-[11px] text-slate-400">Admin panel</p>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} className="text-slate-400" /></button>
            </div>
            <SidebarContent />
          </aside>
          <style>{`
            @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
            .animate-slideIn { animation: slideIn 0.22s ease-out both; }
          `}</style>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-violet-100 p-4 flex-shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-2 mb-7 px-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: G }}>S</div>
          <div>
            <p className="font-semibold text-[14px] leading-tight">Studently</p>
            <p className="text-[11px] text-slate-400">Admin panel</p>
          </div>
        </div>
        <SidebarContent />
      </aside>

      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6">{children}</main>
    </div>
  );
}
