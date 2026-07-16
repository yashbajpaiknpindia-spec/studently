"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Phone, Lock, ArrowRight, Loader2 } from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED,#2563EB)";

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setLoading(false);
        return;
      }
      const next = searchParams.get("next") ?? "/admin";
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: "linear-gradient(120deg,#120F1F,#241B4E 55%,#1E2A6E)", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: G }}>S</div>
          <div>
            <p className="font-semibold text-[15px] leading-tight">Studently Admin</p>
            <p className="text-[12px] text-slate-400 flex items-center gap-1"><ShieldCheck size={11} /> Restricted access</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
            <Phone size={16} className="text-slate-400 flex-shrink-0" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Admin phone number"
              inputMode="numeric"
              className="flex-1 outline-none text-[14px] placeholder:text-slate-400"
              autoComplete="username"
            />
          </div>
          <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
            <Lock size={16} className="text-slate-400 flex-shrink-0" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="flex-1 outline-none text-[14px] placeholder:text-slate-400"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-[12.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3.5 mt-2 disabled:opacity-60"
            style={{ background: G }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <>Log in <ArrowRight size={15} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
