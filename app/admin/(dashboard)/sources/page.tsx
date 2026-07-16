"use client";

import React, { useEffect, useState } from "react";
import { Radar, Plus, X, Loader2, Play, Trash2, Power, CheckCircle2, XCircle, Clock, IndianRupee } from "lucide-react";
import { formatInr } from "@/lib/aggregator/aiCost";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

const KINDS = ["GREENHOUSE_API", "LEVER_API", "RSS_FEED", "JSON_API", "PARTNER_FEED", "NOTICE_BOARD", "AI_DEEP_SEARCH"];
const TARGET_TYPES = ["JOB", "INTERNSHIP", "SCHOLARSHIP"];

type Source = {
  id: string;
  name: string;
  kind: string;
  targetType: string;
  url: string;
  config: Record<string, unknown>;
  enabled: boolean;
  fetchIntervalMins: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  _count: { jobs: number; scholarships: number; runs: number };
  aiCostUsd: number;
};

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", kind: "RSS_FEED", targetType: "JOB", url: "", configText: "{}", fetchIntervalMins: "360" });

  const load = () => {
    setLoading(true);
    fetch("/api/admin/sources")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load sources.");
        return r.json();
      })
      .then((d) => setSources(d.sources))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let config: unknown;
      try {
        config = JSON.parse(form.configText);
      } catch {
        throw new Error("Config must be valid JSON.");
      }
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, config, fetchIntervalMins: Number(form.fetchIntervalMins) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create source.");
      setShowForm(false);
      setForm({ name: "", kind: "RSS_FEED", targetType: "JOB", url: "", configText: "{}", fetchIntervalMins: "360" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (s: Source) => {
    await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    });
    load();
  };

  const runNow = async (id: string) => {
    setRunningId(id);
    try {
      await fetch(`/api/admin/sources/${id}/run`, { method: "POST" });
      load();
    } finally {
      setRunningId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this source? Listings it already created will stay, but stop updating.")) return;
    await fetch(`/api/admin/sources?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-semibold text-2xl flex items-center gap-2"><Radar size={20} className="text-violet-600" /> Aggregation Sources</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Official APIs, RSS feeds, partner feeds & permitted notice boards the background workers pull from.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-white text-[13px] font-medium rounded-full px-4 py-2.5" style={{ background: G }}>
          <Plus size={15} /> Add source
        </button>
      </div>

      {error && <p className="text-[13px] text-red-500 bg-red-50 rounded-xl px-3.5 py-2.5 mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-[14px] py-10"><Loader2 size={16} className="animate-spin" /> Loading...</div>
      ) : sources.length === 0 ? (
        <p className="text-[13.5px] text-slate-400 py-10 text-center">No sources yet — add one, or run the seed script for worked examples.</p>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <div key={s.id} className="bg-white border border-violet-100 rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-[14.5px]">{s.name}</h3>
                    <span className="text-[10.5px] font-mono bg-violet-50 text-violet-600 rounded-full px-2 py-0.5">{s.kind}</span>
                    <span className="text-[10.5px] font-mono bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{s.targetType}</span>
                  </div>
                  <p className="text-[12px] text-slate-400 truncate max-w-md mt-1">{s.url}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11.5px] text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={11} /> every {s.fetchIntervalMins}m</span>
                    <span>{s._count.jobs} jobs · {s._count.scholarships} scholarships</span>
                    {s.lastSuccessAt ? (
                      <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} /> last ok {new Date(s.lastSuccessAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    ) : (
                      <span className="text-slate-400">never run</span>
                    )}
                    {s.lastError && <span className="flex items-center gap-1 text-red-500"><XCircle size={11} /> {s.lastError.slice(0, 60)}</span>}
                    {s.aiCostUsd > 0 && (
                      <span className="flex items-center gap-1 font-mono bg-violet-50 text-violet-600 rounded-full px-2 py-0.5">
                        <IndianRupee size={10} /> {formatInr(s.aiCostUsd)} AI cost
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => runNow(s.id)} disabled={runningId === s.id} className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center hover:bg-violet-100 disabled:opacity-50" title="Run now">
                    {runningId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>
                  <button onClick={() => toggleEnabled(s)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`} title={s.enabled ? "Disable" : "Enable"}>
                    <Power size={14} />
                  </button>
                  <button onClick={() => remove(s.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[16px]">Add source</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3.5">
              <input required placeholder="Name (e.g. Stripe — Greenhouse)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} className="rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300">
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <select value={form.targetType} onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))} className="rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300">
                  {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input required placeholder="Feed/API URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="w-full rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300" />
              <textarea rows={5} placeholder='Config JSON, e.g. {"boardToken":"gitlab"}' value={form.configText} onChange={(e) => setForm((f) => ({ ...f, configText: e.target.value }))} className="w-full rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13px] font-mono outline-none focus:border-violet-300" />
              <div>
                <label className="text-[12px] font-medium text-slate-500 mb-1 block">Fetch every (minutes)</label>
                <input type="number" min={15} value={form.fetchIntervalMins} onChange={(e) => setForm((f) => ({ ...f, fetchIntervalMins: e.target.value }))} className="w-full rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300" />
              </div>
              <button type="submit" disabled={saving} className="w-full text-white font-medium text-[13.5px] rounded-full py-2.5 disabled:opacity-60" style={{ background: G }}>
                {saving ? "Saving..." : "Add source"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
