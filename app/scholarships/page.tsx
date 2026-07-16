"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, Calendar, Landmark, ArrowRight, CheckCircle2,
  SlidersHorizontal, Sparkles, Loader2, Trophy, Building2, ExternalLink, ShieldCheck,
  Info, IndianRupee, GraduationCap
} from "lucide-react";
import BackBar from "@/components/BackBar";
import DetailsSheet from "@/components/DetailsSheet";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

type Scholarship = {
  id: string;
  title: string;
  sponsor?: { name: string } | null;
  amount: number;
  qualification: string;
  location: string;
  description?: string;
  deadline: string;
  source: "STUDENTLY_WEEKLY" | "GOVERNMENT" | "PRIVATE" | "AGGREGATED";
  providerName?: string | null;
  officialUrl?: string | null;
};

// Shown only if the API/database isn't reachable yet, so the page never looks broken.
// Mirrors the real seed data — same sources, same official links.
const FALLBACK: Scholarship[] = [
  { id: "f1", title: "Studently Weekly Scholarship — Banking Category", amount: 15000, qualification: "Undergraduate", deadline: new Date(Date.now() + 2 * 86400000).toISOString(), location: "All India", description: "Awarded from Studently's weekly test prize pool to the top performers in the Banking test category. Funded directly by Studently, not a government or private body.", source: "STUDENTLY_WEEKLY", providerName: "Studently Weekly Test Pool" },
  { id: "f2", title: "Central Sector Scheme of Scholarship (CSSS)", amount: 20000, qualification: "Class 12", deadline: "2026-10-31", location: "All India", description: "Merit-based scholarship for students who scored in the top 20th percentile in Class 12 board exams and are pursuing regular degree courses. Disbursed directly via DBT into the student's bank account.", source: "GOVERNMENT", providerName: "Dept. of Higher Education, Govt. of India (via NSP)", officialUrl: "https://scholarships.gov.in/" },
  { id: "f3", title: "AICTE Pragati Scholarship for Girls", amount: 50000, qualification: "Diploma", deadline: "2026-10-31", location: "All India", description: "For girl students pursuing technical diploma or degree courses at AICTE-approved institutions, with family income below ₹8 lakh per annum. Covers tuition and other academic expenses.", source: "GOVERNMENT", providerName: "AICTE, via NSP", officialUrl: "https://www.aicte-india.org/schemes/students-development-schemes/Pragati" },
  { id: "f4", title: "Reliance Foundation Undergraduate Scholarship", amount: 200000, qualification: "Undergraduate", deadline: "2026-10-15", location: "All India", description: "Need-cum-merit scholarship for first-year undergraduate students across all disciplines, awarded competitively based on academics and financial need.", source: "PRIVATE", providerName: "Reliance Foundation", officialUrl: "https://www.scholarships.reliancefoundation.org/UG_Scholarship.aspx" },
];

const SOURCE_TABS = [
  { key: "ALL", label: "All" },
  { key: "STUDENTLY_WEEKLY", label: "Studently Weekly" },
  { key: "GOVERNMENT", label: "Government" },
  { key: "PRIVATE", label: "Private / Company" },
  { key: "AGGREGATED", label: "Auto-collected" },
];

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all whitespace-nowrap ${active ? "text-white border-transparent" : "text-slate-600 bg-white border-slate-200 hover:border-violet-300"}`} style={active ? { background: G } : {}}>
    {label}
  </button>
);

function daysLeft(deadline: string) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  return diff <= 0 ? "Closing today" : `${diff} day${diff === 1 ? "" : "s"} left`;
}

function SourceBadge({ s }: { s: Scholarship }) {
  if (s.source === "STUDENTLY_WEEKLY") {
    return (
      <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1">
        <Trophy size={11} /> Studently Weekly Pool
      </div>
    );
  }
  if (s.source === "GOVERNMENT") {
    return (
      <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 rounded-full px-2.5 py-1">
        <Building2 size={11} /> Government · Verified
      </div>
    );
  }
  if (s.source === "AGGREGATED") {
    return (
      <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
        <ShieldCheck size={11} /> Auto-collected · {s.providerName ?? "Official source"}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
      <ShieldCheck size={11} /> Private · Verified
    </div>
  );
}

export default function ScholarshipsPage() {
  const router = useRouter();
  const [sourceTab, setSourceTab] = useState("ALL");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Scholarship | null>(null);
  const filters = ["All", "Undergraduate", "Postgraduate", "Class 12", "Diploma"];

  useEffect(() => {
    fetch("/api/scholarships")
      .then((r) => {
        if (!r.ok) throw new Error("api unavailable");
        return r.json();
      })
      .then((d) => {
        if (d.scholarships?.length) setItems(d.scholarships);
        else {
          setItems(FALLBACK);
          setUsingFallback(true);
        }
      })
      .catch(() => {
        setItems(FALLBACK);
        setUsingFallback(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const apply = async (scholarshipId: string) => {
    setApplyingId(scholarshipId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarshipId }),
      });
      if (res.status === 401) {
        router.push("/auth?next=/scholarships");
        return;
      }
      if (res.ok || res.status === 409) {
        setAppliedIds((prev) => new Set(prev).add(scholarshipId));
      }
    } finally {
      setApplyingId(null);
    }
  };

  const visible = items
    .filter((s) => sourceTab === "ALL" || s.source === sourceTab)
    .filter((s) => filter === "All" || s.qualification === filter)
    .filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

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
          <p className="text-[12px] font-medium text-violet-600 mb-1.5">SCHOLARSHIPS</p>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-2">Verified scholarships, matched to you</h1>
          <p className="text-[13px] text-slate-500 mb-5 max-w-2xl">
            Two kinds live here: scholarships <strong>Studently funds directly</strong> from weekly test
            pools, and real <strong>government &amp; private scholarships</strong> we've verified against
            their official source — every one links back to where it actually comes from.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 flex items-center gap-2.5 bg-white border border-violet-100 rounded-xl px-4 py-3 min-w-0">
              <Search size={17} className="text-slate-400 flex-shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, sponsor, or exam..." className="flex-1 min-w-0 outline-none text-[14px] placeholder:text-slate-400" />
            </div>
            <button className="flex items-center justify-center gap-2 bg-white border border-violet-100 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-600 flex-shrink-0">
              <SlidersHorizontal size={16} /> Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        {usingFallback && !loading && (
          <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5 inline-block">
            Showing sample data — connect a database and run <code className="font-mono">npm run db:seed</code> to load real listings.
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto pb-1">
          {SOURCE_TABS.map((t) => <FilterChip key={t.key} label={t.label} active={sourceTab === t.key} onClick={() => setSourceTab(t.key)} />)}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((f) => <FilterChip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />)}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 rounded-2xl skeleton" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {visible.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setSelected(s); }}
                className="group rounded-2xl bg-white border border-violet-100 p-5 hover:border-violet-300 hover:shadow-[0_8px_28px_-10px_rgba(79,70,229,0.25)] transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    {s.source === "STUDENTLY_WEEKLY" ? <Trophy size={17} className="text-violet-600" /> : <Landmark size={17} className="text-violet-600" />}
                  </div>
                  <SourceBadge s={s} />
                </div>
                <h3 className="font-semibold text-[15px] mb-0.5 break-words">{s.title}</h3>
                <p className="text-[12px] text-slate-400 mb-3 truncate">{s.providerName ?? s.sponsor?.name ?? "Studently"}</p>
                <div className="flex items-center gap-3 text-[12px] text-slate-500 mb-3 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {s.location}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {daysLeft(s.deadline)}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                  className="flex items-center gap-1 text-[12px] font-medium text-violet-500 hover:text-violet-700 transition-colors mb-3"
                >
                  <Info size={12} /> View full details
                </button>
                <div className="flex items-center justify-between pt-3 border-t border-violet-50 flex-wrap gap-2">
                  <span className="font-mono font-semibold text-lg text-[#4F46E5]">₹{s.amount.toLocaleString("en-IN")}</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {s.officialUrl && (
                      <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[12px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
                        Official site <ExternalLink size={12} />
                      </a>
                    )}
                    {s.source === "STUDENTLY_WEEKLY" ? (
                      appliedIds.has(s.id) ? (
                        <span className="flex items-center gap-1 text-[13px] font-medium text-emerald-600">
                          <CheckCircle2 size={14} /> Applied
                        </span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); apply(s.id); }} disabled={applyingId === s.id} className="flex items-center gap-1 text-[13px] font-medium text-slate-700 group-hover:text-[#4F46E5] transition-colors disabled:opacity-60">
                          {applyingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <>Apply <ArrowRight size={14} /></>}
                        </button>
                      )
                    ) : (
                      <a href={s.officialUrl ?? "#"} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[13px] font-medium text-slate-700 group-hover:text-[#4F46E5] transition-colors">
                        Apply on official site <ArrowRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {visible.length === 0 && <p className="text-[13px] text-slate-400 col-span-2 text-center py-10">No scholarships match this filter.</p>}
          </div>
        )}
      </div>

      <DetailsSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={selected?.providerName ?? selected?.sponsor?.name ?? "Studently"}
        footer={
          selected && (
            selected.source === "STUDENTLY_WEEKLY" ? (
              appliedIds.has(selected.id) ? (
                <div className="flex items-center justify-center gap-1.5 text-[14px] font-medium text-emerald-600 py-1">
                  <CheckCircle2 size={16} /> You've applied to this scholarship
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
                Apply on official site <ExternalLink size={15} />
              </a>
            )
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SourceBadge s={selected} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-violet-50/60 rounded-xl p-3">
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-1"><IndianRupee size={11} /> Amount</p>
                <p className="font-mono font-semibold text-[16px] text-[#4F46E5]">₹{selected.amount.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-3">
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-1"><Calendar size={11} /> Deadline</p>
                <p className="font-medium text-[13.5px]">{daysLeft(selected.deadline)}</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-3">
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-1"><GraduationCap size={11} /> Eligibility</p>
                <p className="font-medium text-[13.5px]">{selected.qualification}</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-3">
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mb-1"><MapPin size={11} /> Location</p>
                <p className="font-medium text-[13.5px]">{selected.location}</p>
              </div>
            </div>
            {selected.description && (
              <div>
                <p className="text-[12px] font-medium text-slate-500 mb-1.5">About this scholarship</p>
                <p className="text-[13.5px] text-slate-600 leading-relaxed">{selected.description}</p>
              </div>
            )}
            {selected.source !== "STUDENTLY_WEEKLY" && selected.officialUrl && (
              <p className="text-[12px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed">
                {selected.source === "AGGREGATED"
                  ? `Automatically collected from ${selected.providerName ?? "an official source"} and kept in sync — tap "Apply on official site" below to apply directly with them.`
                  : `This is a real ${selected.source === "GOVERNMENT" ? "government" : "private"} scholarship. Studently doesn't process this application — tap "Apply on official site" below to go to ${selected.providerName}'s real portal.`}
              </p>
            )}
          </div>
        )}
      </DetailsSheet>
    </div>
  );
}
