"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Loader2, Search, ExternalLink, RefreshCw, IndianRupee, Globe2 } from "lucide-react";
import { formatInr } from "@/lib/aggregator/aiCost";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";
const TARGET_TYPES = ["JOB", "INTERNSHIP", "SCHOLARSHIP"];

type IngestRun = {
  id: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  itemsFetched: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  error: string | null;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiWebSearches: number;
  aiCostUsd: number;
};

type SearchSource = {
  id: string;
  name: string;
  targetType: string;
  config: { query: string; locations?: string[]; keywords?: string[]; maxResults?: number };
  lastRunAt: string | null;
  lastError: string | null;
  runs: IngestRun[];
  _count: { jobs: number; scholarships: number };
};

type Listing = { id: string; role?: string; title?: string; company?: string; providerName?: string; location: string; officialUrl?: string | null; updatedAt: string };

type Totals = { costUsd: number; inputTokens: number; outputTokens: number; webSearches: number; jobsCreated: number; jobsUpdated: number };

function AiJobSearchInner() {
  const searchParams = useSearchParams();
  const presetType = searchParams.get("type");
  const initialTargetType = TARGET_TYPES.includes(presetType ?? "") ? (presetType as string) : "JOB";

  const [searches, setSearches] = useState<SearchSource[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ run: IngestRun; listings: Listing[]; query: string } | null>(null);

  const [form, setForm] = useState({ query: "", targetType: initialTargetType, locationsText: "", keywordsText: "", maxResults: "15" });

  const load = () => {
    setLoading(true);
    fetch("/api/admin/ai-job-search")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load AI search history.");
        return r.json();
      })
      .then((d) => {
        setSearches(d.searches);
        setTotals(d.totals);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const runSearch = async (overrideQuery?: string) => {
    const query = (overrideQuery ?? form.query).trim();
    if (!query) return;
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-job-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          targetType: form.targetType,
          locations: form.locationsText.split(",").map((s) => s.trim()).filter(Boolean),
          keywords: form.keywordsText.split(",").map((s) => s.trim()).filter(Boolean),
          maxResults: Number(form.maxResults) || 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      if (data.run?.status === "FAILED") {
        setError(data.run.error ?? "AI deep search failed.");
      }
      setLastResult({ run: data.run, listings: data.listings, query });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const rerun = (s: SearchSource) => runSearch(s.config.query);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-semibold text-2xl flex items-center gap-2"><Sparkles size={20} className="text-violet-600" /> AI Deep Search — Jobs &amp; Scholarships</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Claude searches the live web for real jobs, internships, or scholarships, extracts &amp; normalizes them, and publishes them to the platform — deduped against everything already listed. Pick “SCHOLARSHIP” below to run an AI scholarship search.</p>
        </div>
      </div>

      {error && <p className="text-[13px] text-red-500 bg-red-50 rounded-xl px-3.5 py-2.5 mb-4">{error}</p>}

      {/* Total spend summary */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-violet-100 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1"><IndianRupee size={11} /> Total AI cost</p>
            <p className="font-semibold text-[18px]">{formatInr(totals.costUsd)}</p>
          </div>
          <div className="bg-white border border-violet-100 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1"><Globe2 size={11} /> Web searches run</p>
            <p className="font-semibold text-[18px]">{totals.webSearches}</p>
          </div>
          <div className="bg-white border border-violet-100 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 mb-1">Listings created</p>
            <p className="font-semibold text-[18px] text-emerald-600">{totals.jobsCreated}</p>
          </div>
          <div className="bg-white border border-violet-100 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 mb-1">Listings updated</p>
            <p className="font-semibold text-[18px] text-blue-600">{totals.jobsUpdated}</p>
          </div>
        </div>
      )}

      {/* Trigger form */}
      <div className="bg-white border border-violet-100 rounded-2xl p-4 sm:p-5 mb-6">
        <h2 className="font-medium text-[14.5px] mb-3 flex items-center gap-1.5"><Search size={15} className="text-violet-600" /> Run a new search</h2>
        <div className="space-y-3">
          <input
            placeholder='What to look for, e.g. "fresher backend developer jobs" or "SSC / govt fresher notifications"'
            value={form.query}
            onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
            className="w-full rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.targetType} onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))} className="rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300">
              {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Locations (comma-separated)" value={form.locationsText} onChange={(e) => setForm((f) => ({ ...f, locationsText: e.target.value }))} className="rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300" />
            <input type="number" min={3} max={30} placeholder="Max results" value={form.maxResults} onChange={(e) => setForm((f) => ({ ...f, maxResults: e.target.value }))} className="rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300" />
          </div>
          <input placeholder="Keywords/skills (comma-separated, optional)" value={form.keywordsText} onChange={(e) => setForm((f) => ({ ...f, keywordsText: e.target.value }))} className="w-full rounded-xl border border-violet-100 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet-300" />
          <button onClick={() => runSearch()} disabled={running || !form.query.trim()} className="flex items-center gap-1.5 text-white text-[13.5px] font-medium rounded-full px-4 py-2.5 disabled:opacity-60" style={{ background: G }}>
            {running ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {running ? "Searching the web..." : "Run deep search"}
          </button>
          <p className="text-[11px] text-slate-400">Running the same search again updates listings it already found (refreshed deadlines, dedup against duplicates) instead of re-adding them.</p>
        </div>
      </div>

      {/* Last run result */}
      {lastResult && (
        <div className="bg-violet-50/60 border border-violet-100 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="font-medium text-[14px]">Result for “{lastResult.query}”</h3>
            <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap">
              <span className="text-emerald-600 font-medium">{lastResult.run.itemsCreated} created</span>
              <span className="text-blue-600 font-medium">{lastResult.run.itemsUpdated} updated</span>
              <span className="text-slate-400">{lastResult.run.itemsSkipped} skipped (dupes)</span>
              <span className="font-mono bg-white border border-violet-100 rounded-full px-2.5 py-1 flex items-center gap-1"><IndianRupee size={11} className="text-violet-600" /> {formatInr(lastResult.run.aiCostUsd)} · {lastResult.run.aiWebSearches} searches · {(lastResult.run.aiInputTokens + lastResult.run.aiOutputTokens).toLocaleString()} tokens</span>
            </div>
          </div>
          {lastResult.listings.length === 0 ? (
            <p className="text-[13px] text-slate-400">No listings from this run — try a broader query.</p>
          ) : (
            <div className="space-y-2">
              {lastResult.listings.map((l) => (
                <div key={l.id} className="bg-white rounded-xl border border-violet-100 px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[13.5px] truncate">{l.role ?? l.title}</p>
                    <p className="text-[12px] text-slate-400 truncate">{l.company ?? l.providerName} · {l.location}</p>
                  </div>
                  {l.officialUrl && (
                    <a href={l.officialUrl} target="_blank" rel="noreferrer" className="flex-shrink-0 text-violet-600"><ExternalLink size={14} /></a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search history */}
      <h2 className="font-medium text-[15px] mb-3">Saved searches</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-[14px] py-10"><Loader2 size={16} className="animate-spin" /> Loading...</div>
      ) : searches.length === 0 ? (
        <p className="text-[13.5px] text-slate-400 py-10 text-center">No AI searches run yet — try one above.</p>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => {
            const latest = s.runs[0];
            const cumulativeCost = s.runs.reduce((sum, r) => sum + r.aiCostUsd, 0);
            return (
              <div key={s.id} className="bg-white border border-violet-100 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-[14.5px]">{s.config.query}</h3>
                      <span className="text-[10.5px] font-mono bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{s.targetType}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11.5px] text-slate-400 flex-wrap">
                      <span>{s._count.jobs + s._count.scholarships} listings on platform</span>
                      {latest && (
                        <span className="font-mono bg-violet-50 text-violet-600 rounded-full px-2 py-0.5 flex items-center gap-1"><IndianRupee size={10} /> {formatInr(cumulativeCost)} total spent</span>
                      )}
                      {s.lastRunAt && <span>last run {new Date(s.lastRunAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                      {s.lastError && <span className="text-red-500">{s.lastError.slice(0, 60)}</span>}
                    </div>
                  </div>
                  <button onClick={() => rerun(s)} disabled={running} className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center hover:bg-violet-100 disabled:opacity-50 flex-shrink-0" title="Run again">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AiJobSearchPage() {
  return (
    <Suspense fallback={null}>
      <AiJobSearchInner />
    </Suspense>
  );
}
