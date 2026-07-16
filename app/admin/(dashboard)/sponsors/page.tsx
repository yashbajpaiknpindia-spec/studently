"use client";

import React, { useEffect, useState } from "react";
import { Plus, Landmark, X, Loader2 } from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

type Sponsor = { id: string; name: string; totalPledged: number; totalDisbursed: number; _count: { scholarships: number } };

export default function AdminSponsorsPage() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", totalPledged: "" });

  const load = () => {
    setLoading(true);
    fetch("/api/sponsors")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load sponsors — is the database connected?");
        return r.json();
      })
      .then((d) => setItems(d.sponsors))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create.");
      setShowForm(false);
      setForm({ name: "", totalPledged: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-semibold text-2xl mb-1">Sponsors</h1>
          <p className="text-slate-400 text-[13.5px]">Organisations funding the scholarship pool.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-white text-[13px] font-medium rounded-full px-4 py-2.5" style={{ background: G }}>
          <Plus size={15} /> New sponsor
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
          {items.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No sponsors yet.</p>}
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><Landmark size={15} className="text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[14px] truncate">{s.name}</p>
                <p className="text-[12px] text-slate-400">{s._count.scholarships} scholarships sponsored</p>
              </div>
              <span className="font-mono font-semibold text-[13.5px] text-[#4F46E5]">₹{s.totalPledged.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[16px]">New sponsor</h2>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sponsor name" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <input type="number" value={form.totalPledged} onChange={(e) => setForm({ ...form, totalPledged: e.target.value })} placeholder="Amount pledged (₹)" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <button disabled={saving} type="submit" className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3 mt-2 disabled:opacity-60" style={{ background: G }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : "Create sponsor"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
