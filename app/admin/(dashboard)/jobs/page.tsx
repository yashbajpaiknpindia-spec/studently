"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Briefcase, X, Loader2, ShieldCheck, Globe2 } from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";
const TYPES = ["FRESHER", "INTERNSHIP", "REMOTE", "CAMPUS", "STARTUP", "GOVERNMENT"];
const SOURCES = [
  { value: "STUDENTLY_CURATED", label: "Studently curated (vetted company listing)" },
  { value: "GOVERNMENT_EXAM", label: "Government exam (real, external — e.g. SSC, IBPS)" },
  { value: "GOVERNMENT_SCHEME", label: "Government scheme (real, external — e.g. PM Internship)" },
  { value: "EXTERNAL_PORTAL", label: "External aggregator portal (e.g. NCS)" },
];

type Job = {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  source: "STUDENTLY_CURATED" | "GOVERNMENT_EXAM" | "GOVERNMENT_SCHEME" | "EXTERNAL_PORTAL";
  providerName: string | null;
  officialUrl: string | null;
};

function SourceBadge({ source }: { source: Job["source"] }) {
  if (source === "STUDENTLY_CURATED") return <span className="text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-600 flex items-center gap-1"><Briefcase size={10} /> Curated</span>;
  if (source === "EXTERNAL_PORTAL") return <span className="text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1"><Globe2 size={10} /> Portal</span>;
  return <span className="text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1"><ShieldCheck size={10} /> Government</span>;
}

export default function AdminJobsPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    role: "", company: "", location: "", salary: "", type: "FRESHER",
    source: "STUDENTLY_CURATED", providerName: "", officialUrl: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/jobs?status=PUBLISHED")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load jobs — is the database connected?");
        return r.json();
      })
      .then((d) => setItems(d.jobs))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create.");
      setShowForm(false);
      setForm({ role: "", company: "", location: "", salary: "", type: "FRESHER", source: "STUDENTLY_CURATED", providerName: "", officialUrl: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/jobs/${id}`, { method: "DELETE" }).catch(() => load());
  };

  const needsUrl = form.source !== "STUDENTLY_CURATED";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-semibold text-2xl mb-1">Jobs & Internships</h1>
          <p className="text-slate-400 text-[13.5px]">Manage curated company listings and verified real government exams/schemes.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-white text-[13px] font-medium rounded-full px-4 py-2.5" style={{ background: G }}>
          <Plus size={15} /> New listing
        </button>
      </div>
      <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5 max-w-xl">
        Don't invent specific private-company openings — real roles change daily and go stale
        fast. Government exam / scheme / portal listings require a real <code className="font-mono">officialUrl</code> and
        should only ever link students to the real, current application, never process it in-app.
      </p>

      {error && <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
          {items.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No listings yet — add one to get started.</p>}
          {items.map((j) => (
            <div key={j.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><Briefcase size={15} className="text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-[14px] truncate">{j.role}</p>
                  <SourceBadge source={j.source} />
                </div>
                <p className="text-[12px] text-slate-400">{j.providerName ?? j.company} · {j.location}</p>
              </div>
              <span className="text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-600">{j.type}</span>
              <button onClick={() => remove(j.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3 my-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[16px]">New listing</h2>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>

            <label className="block text-[12px] text-slate-500 -mb-2">Source</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none">
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role title" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company / department" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="Salary (e.g. ₹6-8 LPA)" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            {needsUrl && (
              <>
                <input required value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} placeholder="Provider name (e.g. Staff Selection Commission)" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
                <input required type="url" value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} placeholder="Official source URL (required)" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
              </>
            )}

            <button disabled={saving} type="submit" className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3 mt-2 disabled:opacity-60" style={{ background: G }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : "Create listing"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
