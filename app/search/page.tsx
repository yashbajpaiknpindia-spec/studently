"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, MapPin, ExternalLink, Briefcase, GraduationCap, Clock } from "lucide-react";
import BackBar from "@/components/BackBar";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

type SearchResultItem = {
  id: string;
  kind: "JOB" | "SCHOLARSHIP";
  title: string;
  organization: string;
  location: string;
  applyUrl: string | null;
  deadline: string | null;
  rank: number;
};

const KIND_TABS: { key: "ALL" | "JOB" | "SCHOLARSHIP"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "JOB", label: "Jobs & Internships" },
  { key: "SCHOLARSHIP", label: "Scholarships" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"ALL" | "JOB" | "SCHOLARSHIP">("ALL");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&kind=${kind}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => setResults(d.results ?? []))
        .finally(() => {
          setLoading(false);
          setSearched(true);
        });
    }, 350); // debounce so we're not hitting the index on every keystroke
    return () => clearTimeout(handle);
  }, [query, kind]);

  return (
    <div className="min-h-screen bg-white text-[#120F1F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');.font-display{font-family:'Space Grotesk',sans-serif}`}</style>

      <BackBar label="Dashboard" fallbackHref="/dashboard" />

      <div className="bg-[#F8F7FD] border-b border-violet-100 px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-[12px] font-medium text-violet-600 mb-1.5">SEARCH</p>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-5">Find any opportunity</h1>

          <div className="relative mb-4">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “banking internship”, “AICTE scholarship”, “remote SDE”..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-violet-100 bg-white text-[14.5px] outline-none focus:border-violet-300 placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {KIND_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setKind(t.key)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border whitespace-nowrap transition-all ${kind === t.key ? "text-white border-transparent" : "text-slate-600 bg-white border-slate-200 hover:border-violet-300"}`}
                style={kind === t.key ? { background: G } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
        {!query.trim() ? (
          <p className="text-[13.5px] text-slate-400 text-center py-14">Start typing to search across every live job, internship, and scholarship.</p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-[14px] py-14"><Loader2 size={16} className="animate-spin" /> Searching...</div>
        ) : results.length === 0 && searched ? (
          <p className="text-[13.5px] text-slate-400 text-center py-14">No matches for "{query}". Try a broader term.</p>
        ) : (
          <div className="space-y-2.5">
            {results.map((r) => (
              <div key={`${r.kind}-${r.id}`} className="bg-white border border-violet-100 rounded-2xl p-4 hover:border-violet-300 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    {r.kind === "JOB" ? <Briefcase size={16} className="text-violet-600" /> : <GraduationCap size={16} className="text-violet-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="font-medium text-[14.5px]">{r.title}</p>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">{r.kind === "JOB" ? "Job" : "Scholarship"}</span>
                    </div>
                    <p className="text-[12.5px] text-slate-500">{r.organization}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin size={11} /> {r.location}</span>
                      {r.deadline && <span className="flex items-center gap-1"><Clock size={11} /> {new Date(r.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {r.applyUrl ? (
                      <a href={r.applyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12.5px] font-medium text-violet-500 hover:text-violet-700 transition-colors">
                        View <ExternalLink size={12} />
                      </a>
                    ) : (
                      <Link href={r.kind === "JOB" ? "/jobs" : "/scholarships"} className="flex items-center gap-1 text-[12.5px] font-medium text-violet-500 hover:text-violet-700 transition-colors">
                        View <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
