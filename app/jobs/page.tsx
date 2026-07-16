"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, Briefcase, Building2, Clock, IndianRupee, ArrowRight,
  SlidersHorizontal, Home, Rocket, Landmark, CheckCircle2, Loader2,
  ExternalLink, ShieldCheck, Globe2, Info, ChevronRight, FileText
} from "lucide-react";
import BackBar from "@/components/BackBar";
import DetailsSheet from "@/components/DetailsSheet";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

const tabs = [
  { key: "FRESHER", label: "Fresher Jobs", icon: Briefcase },
  { key: "INTERNSHIP", label: "Internships", icon: Rocket },
  { key: "REMOTE", label: "Remote", icon: Home },
  { key: "CAMPUS", label: "Campus Hiring", icon: Building2 },
  { key: "STARTUP", label: "Startups", icon: Rocket },
  { key: "GOVERNMENT", label: "Government", icon: Landmark },
];

type Job = {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  employmentTerm: string;
  description?: string;
  source: "STUDENTLY_CURATED" | "GOVERNMENT_EXAM" | "GOVERNMENT_SCHEME" | "EXTERNAL_PORTAL" | "AGGREGATED";
  providerName?: string | null;
  officialUrl?: string | null;
};

// Shown only if the API/database isn't reachable yet. Mirrors the real seed data —
// real government exams/schemes with their actual official links, no fabricated
// company listings.
const FALLBACK: Job[] = [
  { id: "f1", role: "SSC CGL 2026 — Combined Graduate Level", company: "Staff Selection Commission (SSC)", location: "All India", salary: "₹25,500–₹1,51,100 (Pay Level 4–8)", type: "GOVERNMENT", employmentTerm: "Central Govt · Group B/C", description: "~12,256 vacancies across central govt ministries/departments. 2026 notification released; Tier 1 exam expected Aug–Sep 2026. Always confirm current application status on the official site.", source: "GOVERNMENT_EXAM", providerName: "Staff Selection Commission, Govt. of India", officialUrl: "https://ssc.gov.in/" },
  { id: "f2", role: "IBPS PO/MT 2026 — Probationary Officer", company: "Institute of Banking Personnel Selection (IBPS)", location: "All India", salary: "₹48,480 basic (in-hand ≈ ₹74k–76k/mo)", type: "GOVERNMENT", employmentTerm: "PSU Bank · 2-yr probation", description: "6,715 vacancies across 11 public sector banks. Online applications open now — closes 21 July 2026. Prelims: 22–23 Aug 2026.", source: "GOVERNMENT_EXAM", providerName: "Institute of Banking Personnel Selection", officialUrl: "https://www.ibps.in/" },
  { id: "f3", role: "PM Internship Scheme 2026", company: "Ministry of Corporate Affairs, Govt. of India", location: "All India (rolling)", salary: "Monthly stipend + ₹6,000 joining grant", type: "INTERNSHIP", employmentTerm: "6–12 months", description: "Rolling internship programme placing candidates aged 21–24 inside India's top 500 companies by CSR spend. No application fee, ever. Confirm the current monthly stipend amount on the official portal, as figures vary by source.", source: "GOVERNMENT_SCHEME", providerName: "Ministry of Corporate Affairs (PMIS)", officialUrl: "https://pminternship.mca.gov.in/" },
  { id: "f4", role: "Browse verified private-sector jobs & internships", company: "National Career Service (NCS)", location: "All India", salary: "Varies by employer", type: "REMOTE", employmentTerm: "Aggregator portal", description: "Government-run job portal aggregating real, verified private and public employer postings across sectors — the honest place to find current company openings instead of a hardcoded list here.", source: "EXTERNAL_PORTAL", providerName: "National Career Service, Ministry of Labour & Employment", officialUrl: "https://www.ncs.gov.in/" },
];

function SourceBadge({ j }: { j: Job }) {
  if (j.source === "STUDENTLY_CURATED") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-violet-700 bg-violet-50 rounded-full px-2 py-0.5 flex-shrink-0">
        <Briefcase size={10} /> Studently Curated
      </span>
    );
  }
  if (j.source === "EXTERNAL_PORTAL") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 rounded-full px-2 py-0.5 flex-shrink-0">
        <Globe2 size={10} /> Govt Portal
      </span>
    );
  }
  if (j.source === "AGGREGATED") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 flex-shrink-0">
        <Globe2 size={10} /> Auto-collected · {j.providerName ?? "Official source"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 flex-shrink-0">
      <ShieldCheck size={10} /> Government · Verified
    </span>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("FRESHER");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Job | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState<Job["source"] | "All">("All");
  const [sort, setSort] = useState<"newest" | "az">("newest");

  const apply = async (jobId: string) => {
    setApplyingId(jobId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (res.status === 401) {
        router.push("/auth?next=/jobs");
        return;
      }
      if (res.ok || res.status === 409) {
        setAppliedIds((prev) => new Set(prev).add(jobId));
      }
    } finally {
      setApplyingId(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/jobs?type=${tab}`)
      .then((r) => {
        if (!r.ok) throw new Error("api unavailable");
        return r.json();
      })
      .then((d) => {
        if (d.jobs?.length) {
          setItems(d.jobs);
          setUsingFallback(false);
        } else {
          setItems(FALLBACK.filter((j) => j.type === tab));
          setUsingFallback(true);
        }
      })
      .catch(() => {
        setItems(FALLBACK.filter((j) => j.type === tab));
        setUsingFallback(true);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const locationOptions = ["All", ...Array.from(new Set(items.map((j) => j.location)))];

  const visible = items
    .filter((j) => j.role.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()))
    .filter((j) => locationFilter === "All" || j.location === locationFilter)
    .filter((j) => sourceFilter === "All" || j.source === sourceFilter)
    .sort((a, b) => (sort === "az" ? a.role.localeCompare(b.role) : 0));

  const activeFilterCount = (locationFilter !== "All" ? 1 : 0) + (sourceFilter !== "All" ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  return (
    <div className="min-h-screen bg-white text-[#120F1F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .font-display{font-family:'Space Grotesk',sans-serif} .font-mono{font-family:'IBM Plex Mono',monospace}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .skeleton{background:linear-gradient(90deg,#f1eefc 25%,#e5e0fb 37%,#f1eefc 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
      `}</style>

      <BackBar label="Dashboard" fallbackHref="/dashboard" />

      <div className="bg-[#F8F7FD] border-b border-violet-100 px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[12px] font-medium text-violet-600 mb-1.5">JOBS & INTERNSHIPS</p>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-2">Real roles, zero noise</h1>
          <p className="text-[13px] text-slate-500 mb-5 max-w-2xl">
            Company job postings change daily, so we don't fake them here. What you'll find
            instead: real, current <strong>government exams and internship schemes</strong> with
            official links, plus a direct route to <strong>National Career Service</strong> for
            verified private-sector openings.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 flex items-center gap-2.5 bg-white border border-violet-100 rounded-xl px-4 py-3 min-w-0">
              <Search size={17} className="text-slate-400 flex-shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles, companies..." className="flex-1 min-w-0 outline-none text-[14px] placeholder:text-slate-400" />
            </div>
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center justify-center gap-2 bg-white border border-violet-100 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-600 hover:border-violet-300 transition-colors w-full"
              >
                <SlidersHorizontal size={16} /> Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-semibold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              {filtersOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-violet-100 rounded-2xl shadow-[0_12px_40px_-12px_rgba(79,70,229,0.3)] z-30 p-4 space-y-4">
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-2">Location</p>
                    <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full rounded-lg border border-violet-100 px-3 py-2 text-[13px] outline-none focus:border-violet-300">
                      {locationOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-2">Source</p>
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} className="w-full rounded-lg border border-violet-100 px-3 py-2 text-[13px] outline-none focus:border-violet-300">
                      <option value="All">All sources</option>
                      <option value="STUDENTLY_CURATED">Studently Curated</option>
                      <option value="GOVERNMENT_EXAM">Government Exam</option>
                      <option value="GOVERNMENT_SCHEME">Government Scheme</option>
                      <option value="EXTERNAL_PORTAL">Govt Portal</option>
                      <option value="AGGREGATED">Auto-collected</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-2">Sort by</p>
                    <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="w-full rounded-lg border border-violet-100 px-3 py-2 text-[13px] outline-none focus:border-violet-300">
                      <option value="newest">Newest first</option>
                      <option value="az">Role A-Z</option>
                    </select>
                  </div>
                  <button
                    onClick={() => { setLocationFilter("All"); setSourceFilter("All"); setSort("newest"); }}
                    className="w-full text-[12.5px] font-medium text-violet-500 hover:text-violet-700 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        {usingFallback && !loading && (
          <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5 inline-block">
            Showing sample data — connect a database and run <code className="font-mono">npm run db:seed</code> to load real listings.
          </p>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap border transition-all ${tab === t.key ? "text-white border-transparent" : "text-slate-600 bg-white border-slate-200 hover:border-violet-300"}`} style={tab === t.key ? { background: G } : {}}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
        ) : (
          <div className="space-y-3">
            {visible.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelected(l)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setSelected(l); }}
                className="group flex items-center gap-3 sm:gap-4 bg-white border border-violet-100 rounded-2xl p-4 sm:p-5 hover:border-violet-300 hover:shadow-[0_8px_28px_-10px_rgba(79,70,229,0.2)] transition-all duration-300 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 font-display font-semibold text-violet-600 text-[15px]">
                  {l.company[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <h3 className="font-semibold text-[14px] sm:text-[15px] break-words">{l.role}</h3>
                    <SourceBadge j={l} />
                  </div>
                  <p className="text-[12px] text-slate-400 mb-1.5 truncate">{l.providerName ?? l.company}</p>
                  <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {l.location}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {l.employmentTerm}</span>
                    <span className="flex items-center gap-1 font-mono font-medium text-slate-700"><IndianRupee size={11} /> {l.salary.replace("₹", "")}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 flex-shrink-0 group-hover:text-violet-400 transition-colors" />
              </div>
            ))}
            {visible.length === 0 && <p className="text-[13px] text-slate-400 text-center py-10">No listings in this category yet.</p>}
          </div>
        )}
      </div>

      <DetailsSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.role ?? ""}
        subtitle={selected?.providerName ?? selected?.company ?? ""}
        footer={
          selected && (
            selected.source === "STUDENTLY_CURATED" ? (
              appliedIds.has(selected.id) ? (
                <div className="flex items-center justify-center gap-1.5 text-[14px] font-medium text-emerald-600 py-1">
                  <CheckCircle2 size={16} /> You've applied to this role
                </div>
              ) : (
                <button
                  onClick={() => apply(selected.id)}
                  disabled={applyingId === selected.id}
                  className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3.5 disabled:opacity-60"
                  style={{ background: G }}
                >
                  {applyingId === selected.id ? <Loader2 size={16} className="animate-spin" /> : <>Apply now <ArrowRight size={16} /></>}
                </button>
              )
            ) : (
              <a
                href={selected.officialUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3.5"
                style={{ background: G }}
              >
                {selected.source === "EXTERNAL_PORTAL" ? "Open portal" : "Apply on official site"} <ExternalLink size={15} />
              </a>
            )
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SourceBadge j={selected} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-violet-50/60 rounded-xl p-3">
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-1"><IndianRupee size={11} /> Salary / Stipend</p>
                <p className="font-mono font-semibold text-[14px] text-[#4F46E5] break-words">{selected.salary}</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-3">
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-1"><Clock size={11} /> Term</p>
                <p className="font-medium text-[13.5px]">{selected.employmentTerm}</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-3 col-span-2">
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-1"><MapPin size={11} /> Location</p>
                <p className="font-medium text-[13.5px]">{selected.location}</p>
              </div>
            </div>
            {selected.description && (
              <div>
                <p className="flex items-center gap-1 text-[12px] font-medium text-slate-500 mb-1.5"><FileText size={12} /> Details</p>
                <p className="text-[13.5px] text-slate-600 leading-relaxed">{selected.description}</p>
              </div>
            )}
            {selected.officialUrl && (
              <a href={selected.officialUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12.5px] font-medium text-violet-500 hover:text-violet-700 transition-colors w-fit">
                View official source <ExternalLink size={12} />
              </a>
            )}
            {selected.source !== "STUDENTLY_CURATED" && (
              <p className="text-[12px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed">
                {selected.source === "EXTERNAL_PORTAL"
                  ? `This is a real government portal, not a single listing. Tap "Open portal" to browse current openings on ${selected.providerName}.`
                  : selected.source === "AGGREGATED"
                  ? `Automatically collected from ${selected.providerName ?? "an official source"} and kept in sync — tap "Apply on official site" to apply directly with them.`
                  : `This is a real, external government ${selected.source === "GOVERNMENT_EXAM" ? "exam" : "scheme"}. Studently doesn't process this application — tap "Apply on official site" to go to ${selected.providerName}'s real portal.`}
              </p>
            )}
          </div>
        )}
      </DetailsSheet>
    </div>
  );
}
