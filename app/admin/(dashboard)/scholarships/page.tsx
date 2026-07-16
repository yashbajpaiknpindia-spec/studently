"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Landmark, X, Loader2, Trophy, Building2, ShieldCheck, Sparkles, ExternalLink, Calendar, MapPin, GraduationCap } from "lucide-react";
import DetailsSheet from "@/components/DetailsSheet";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

type Scholarship = {
  id: string;
  title: string;
  amount: number;
  qualification: string;
  location: string;
  description: string;
  deadline: string;
  source: "STUDENTLY_WEEKLY" | "GOVERNMENT" | "PRIVATE";
  providerName: string | null;
  officialUrl: string | null;
};

const SOURCES = [
  { value: "STUDENTLY_WEEKLY", label: "Studently Weekly Pool (funded by us)" },
  { value: "GOVERNMENT", label: "Government scheme (real, external)" },
  { value: "PRIVATE", label: "Private / company scholarship (real, external)" },
];

function SourceBadge({ source }: { source: Scholarship["source"] }) {
  if (source === "STUDENTLY_WEEKLY") return <span className="flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-600"><Trophy size={10} /> Weekly Pool</span>;
  if (source === "GOVERNMENT") return <span className="flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600"><Building2 size={10} /> Government</span>;
  return <span className="flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck size={10} /> Private</span>;
}

export default function AdminScholarshipsPage() {
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Scholarship | null>(null);
  const [form, setForm] = useState({
    title: "", amount: "", qualification: "Undergraduate", location: "All India", deadline: "",
    description: "", source: "STUDENTLY_WEEKLY", providerName: "", officialUrl: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/scholarships?status=PUBLISHED")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load scholarships — is the database connected?");
        return r.json();
      })
      .then((d) => setItems(d.scholarships))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create.");
      setShowForm(false);
      setForm({ title: "", amount: "", qualification: "Undergraduate", location: "All India", deadline: "", description: "", source: "STUDENTLY_WEEKLY", providerName: "", officialUrl: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/scholarships/${id}`, { method: "DELETE" }).catch(() => load());
  };

  const needsUrl = form.source === "GOVERNMENT" || form.source === "PRIVATE";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-semibold text-2xl mb-1">Scholarships</h1>
          <p className="text-slate-400 text-[13.5px]">Manage both Studently's own weekly-pool scholarships and verified external listings.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/admin/ai-job-search?type=SCHOLARSHIP" className="flex items-center gap-1.5 text-violet-600 bg-violet-50 hover:bg-violet-100 text-[13px] font-medium rounded-full px-4 py-2.5 transition-colors">
            <Sparkles size={15} /> AI Scholarship Search
          </Link>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-white text-[13px] font-medium rounded-full px-4 py-2.5" style={{ background: G }}>
            <Plus size={15} /> New scholarship
          </button>
        </div>
      </div>
      <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5 max-w-xl">
        Government and private scholarships must link to a real official source
        (<code className="font-mono">officialUrl</code> is required) — never publish an external
        scholarship without one. Only Studently Weekly Pool scholarships can be applied to directly on the platform.
      </p>

      {error && <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
          {items.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No scholarships yet — add one to get started.</p>}
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
              <button onClick={() => setViewing(s)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><Landmark size={15} className="text-violet-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-[14px] truncate">{s.title}</p>
                    <SourceBadge source={s.source} />
                  </div>
                  <p className="text-[12px] text-slate-400">{s.providerName ?? "Studently"} · {s.qualification} · {s.location} · Deadline {new Date(s.deadline).toLocaleDateString("en-IN")}</p>
                </div>
              </button>
              <span className="font-mono font-semibold text-[14px] text-[#4F46E5]">₹{s.amount.toLocaleString("en-IN")}</span>
              <button onClick={() => remove(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3 my-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[16px]">New scholarship</h2>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>

            <label className="block text-[12px] text-slate-500 -mb-2">Source</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none">
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount (₹)" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <select value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none">
              <option>Class 12</option><option>Undergraduate</option><option>Postgraduate</option><option>Diploma</option>
            </select>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <input required type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details — eligibility, what it covers, how disbursement works, any conditions..." rows={4} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400 resize-none" />

            {needsUrl && (
              <>
                <input required value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} placeholder="Provider name (e.g. Reliance Foundation)" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
                <input required type="url" value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} placeholder="Official source URL (required)" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
              </>
            )}

            <button disabled={saving} type="submit" className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3 mt-2 disabled:opacity-60" style={{ background: G }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : "Create scholarship"}
            </button>
          </form>
        </div>
      )}

      <DetailsSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? ""}
        subtitle={viewing?.providerName ?? "Studently"}
        footer={
          viewing && (
            <button
              onClick={() => { remove(viewing.id); setViewing(null); }}
              className="w-full flex items-center justify-center gap-2 text-red-500 font-medium text-[13.5px] rounded-full py-2.5 border border-red-100 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Delete scholarship
            </button>
          )
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SourceBadge source={viewing.source} />
              <span className="font-mono font-semibold text-[15px] text-[#4F46E5]">₹{viewing.amount.toLocaleString("en-IN")}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 text-[13px]">
              <div className="flex items-center gap-2 text-slate-600"><GraduationCap size={14} className="text-slate-400 flex-shrink-0" /> {viewing.qualification}</div>
              <div className="flex items-center gap-2 text-slate-600"><MapPin size={14} className="text-slate-400 flex-shrink-0" /> {viewing.location}</div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar size={14} className="text-slate-400 flex-shrink-0" /> Deadline {new Date(viewing.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Details</p>
              <p className="text-[13.5px] text-slate-600 whitespace-pre-wrap leading-relaxed">{viewing.description || "No additional details added yet."}</p>
            </div>
            {viewing.officialUrl && (
              <a href={viewing.officialUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] font-medium text-violet-600 hover:underline">
                <ExternalLink size={14} /> Official source
              </a>
            )}
          </div>
        )}
      </DetailsSheet>
    </div>
  );
}
