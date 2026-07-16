"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, TrendingUp, Trophy, FileText,
  Target, ChevronRight, Sparkles, Briefcase,
  GraduationCap, Flame, Settings, Menu, X, Home,
  Landmark, Bookmark, LogOut, Search
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

function useCountUp(target: number, duration = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setV(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

const NavItem = ({ icon: Icon, label, active, href = "#" }: any) => (
  <Link href={href} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${active ? "text-white" : "text-slate-500 hover:bg-violet-50 hover:text-[#4F46E5]"}`} style={active ? { background: G } : {}}>
    <Icon size={17} strokeWidth={2} />
    {label}
  </Link>
);

const RingScore = ({ value, label }: { value: number; label: string }) => {
  const size = 88;
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const animated = useCountUp(value, 1300);
  const offset = c - (animated / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EDE9FE" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#grad)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.3s" }} />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" /><stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      <div className="-mt-[58px] font-mono font-semibold text-xl">{animated}</div>
      <div className="mt-8 text-[12px] text-slate-500">{label}</div>
    </div>
  );
};

type StudentProfile = {
  fullName: string;
  profileCompletion: number;
  eligibilityScore: number;
  resumeScore: number;
  xp: number;
  _count: { applications: number; savedItems: number; testAttempts: number };
};

type Scholarship = { id: string; title: string; amount: number; deadline: string; source?: string };
type Job = { id: string; role: string; company: string; location: string; source?: string };
type Application = { id: string; status: string; scholarship: { title: string } | null; job: { role: string; company: string } | null };
type Recommendation = { kind: "JOB" | "SCHOLARSHIP"; id: string; title: string; organization: string; location: string; score: number; reasons: string[] };

export default function StudentlyDashboard() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/students/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/scholarships").then((r) => (r.ok ? r.json() : { scholarships: [] })),
      fetch("/api/jobs").then((r) => (r.ok ? r.json() : { jobs: [] })),
      fetch("/api/applications").then((r) => (r.ok ? r.json() : { applications: [] })),
      fetch("/api/recommendations").then((r) => (r.ok ? r.json() : { recommendations: [] })),
    ])
      .then(([me, s, j, a, rec]) => {
        if (me?.student) setStudent(me.student);
        setScholarships((s.scholarships ?? []).slice(0, 2));
        setJobs((j.jobs ?? []).slice(0, 2));
        setApplications(a.applications ?? []);
        setRecommendations((rec.recommendations ?? []).slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const firstName = student?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-[#F8F7FD] text-[#120F1F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .font-display{font-family:'Space Grotesk',sans-serif} .font-mono{font-family:'IBM Plex Mono',monospace}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .animate-fadeUp{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .skeleton{background:linear-gradient(90deg,#f1eefc 25%,#e5e0fb 37%,#f1eefc 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
      `}</style>

      <div className="flex">
        <aside className={`fixed lg:sticky top-0 h-screen w-64 bg-white border-r border-violet-100 p-5 flex-col gap-1 z-40 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"} lg:flex flex flex-shrink-0`}>
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm" style={{ background: G }}>S</div>
              <span className="font-display font-semibold text-[16px]">Studently</span>
            </div>
            <button className="lg:hidden" onClick={() => setMenuOpen(false)}><X size={18} /></button>
          </div>
          <NavItem icon={Home} label="Dashboard" href="/dashboard" active />
          <NavItem icon={Search} label="Search" href="/search" />
          <NavItem icon={Trophy} label="Weekly Test" href="/weekly-test" />
          <NavItem icon={GraduationCap} label="Scholarships" href="/scholarships" />
          <NavItem icon={Briefcase} label="Jobs & Internships" href="/jobs" />
          <NavItem icon={Sparkles} label="AI Tools" href="/ai-tools" />
          <NavItem icon={Settings} label="Settings" href="/settings" />
          <a href="/" className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-slate-500 hover:bg-violet-50 hover:text-[#4F46E5] transition-colors">
            <TrendingUp size={17} strokeWidth={2} /> Studently Home
          </a>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors mt-auto">
            <LogOut size={17} strokeWidth={2} /> Log out
          </button>
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
            <div>
              <p className="text-[13px] text-slate-400">Welcome back</p>
              <h1 className="font-display font-semibold text-2xl">{loading ? "…" : firstName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link href="/settings" className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-[13px]" style={{ background: G }}>{firstName[0]?.toUpperCase()}</Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl skeleton" />)}</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="animate-fadeUp rounded-2xl bg-white border border-violet-100 p-4 flex flex-col items-center">
                <RingScore value={student?.profileCompletion ?? 0} label="Profile" />
              </div>
              <div className="animate-fadeUp rounded-2xl bg-white border border-violet-100 p-4 flex flex-col items-center" style={{ animationDelay: "0.05s" }}>
                <RingScore value={student?.eligibilityScore ?? 0} label="Eligibility" />
              </div>
              <div className="animate-fadeUp rounded-2xl bg-white border border-violet-100 p-4 flex flex-col justify-center gap-1" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center gap-1.5 text-slate-400 text-[12px]"><Trophy size={13} /> Test attempts</div>
                <div className="font-mono font-semibold text-2xl">{student?._count.testAttempts ?? 0}</div>
                <div className="flex items-center gap-1 text-[12px] text-slate-400">Take a weekly test to rank</div>
              </div>
              <div className="animate-fadeUp rounded-2xl bg-white border border-violet-100 p-4 flex flex-col justify-center gap-1" style={{ animationDelay: "0.15s" }}>
                <div className="flex items-center gap-1.5 text-slate-400 text-[12px]"><FileText size={13} /> Resume score</div>
                <div className="font-mono font-semibold text-2xl">{student?.resumeScore ?? 0}</div>
                <div className="text-[12px] text-violet-500">Build it in AI Tools</div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-2xl text-white p-5 flex items-center justify-between" style={{ background: "linear-gradient(120deg,#120F1F,#241B4E,#1E2A6E)" }}>
                <div>
                  <div className="flex items-center gap-1.5 text-[12px] text-emerald-300 mb-1"><Flame size={13} /> WEEKLY TEST</div>
                  <p className="font-display font-semibold text-lg">Take this week's scholarship test</p>
                  <p className="text-white/50 text-[13px] mt-0.5">Pick a category, 45 minutes, instant score</p>
                </div>
                <Link href="/weekly-test" className="bg-white text-[#4F46E5] font-medium rounded-full px-4 py-2.5 text-[13px] whitespace-nowrap ml-3">Start</Link>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-[16px]">Open right now</h2>
                  <Link href="/scholarships" className="text-[13px] text-[#4F46E5] font-medium flex items-center gap-1">View all <ChevronRight size={14} /></Link>
                </div>
                {loading ? (
                  <div className="space-y-2.5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
                ) : (
                  <div className="space-y-2.5">
                    {scholarships.map((s) => (
                      <Link key={s.id} href="/scholarships" className="flex items-center gap-3 bg-white border border-violet-100 rounded-xl p-3.5 hover:border-violet-300 hover:shadow-[0_4px_16px_-6px_rgba(79,70,229,0.2)] transition-all">
                        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><Landmark size={17} className="text-violet-600" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-[14px] truncate">{s.title}</p>
                            {s.source && s.source !== "STUDENTLY_WEEKLY" && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">Verified</span>
                            )}
                          </div>
                          <p className="text-[12px] text-slate-400">Deadline {new Date(s.deadline).toLocaleDateString("en-IN")}</p>
                        </div>
                        <span className="text-[12px] font-mono font-medium px-2.5 py-1 rounded-full flex-shrink-0 bg-amber-50 text-amber-600">₹{s.amount.toLocaleString("en-IN")}</span>
                      </Link>
                    ))}
                    {jobs.map((j) => (
                      <Link key={j.id} href="/jobs" className="flex items-center gap-3 bg-white border border-violet-100 rounded-xl p-3.5 hover:border-violet-300 hover:shadow-[0_4px_16px_-6px_rgba(79,70,229,0.2)] transition-all">
                        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><Briefcase size={17} className="text-violet-600" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-[14px] truncate">{j.role}</p>
                            {j.source && j.source !== "STUDENTLY_CURATED" && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">Verified</span>
                            )}
                          </div>
                          <p className="text-[12px] text-slate-400">{j.company} · {j.location}</p>
                        </div>
                      </Link>
                    ))}
                    {scholarships.length === 0 && jobs.length === 0 && <p className="text-[13px] text-slate-400 text-center py-6">Nothing published yet — check back soon.</p>}
                  </div>
                )}
              </div>

              {recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles size={15} className="text-violet-500" />
                    <h2 className="font-display font-semibold text-[16px]">Recommended for you</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {recommendations.map((r) => (
                      <Link
                        key={`${r.kind}-${r.id}`}
                        href={r.kind === "JOB" ? "/jobs" : "/scholarships"}
                        className="bg-white border border-violet-100 rounded-xl p-3.5 hover:border-violet-300 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-[13.5px] truncate">{r.title}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 flex-shrink-0">{r.kind}</span>
                        </div>
                        <p className="text-[12px] text-slate-400 mb-1.5">{r.organization} · {r.location}</p>
                        <p className="text-[11px] text-emerald-600">{r.reasons[0]}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="font-display font-semibold text-[16px] mb-3">Application tracker</h2>
                <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
                  {applications.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No applications yet. Apply to a scholarship or job to see it tracked here.</p>}
                  {applications.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-[14px]">{a.scholarship?.title ?? `${a.job?.role} — ${a.job?.company}`}</span>
                      <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-600">{a.status.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-violet-100 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-3"><Target size={15} className="text-violet-600" /> Career roadmap</div>
                <div className="space-y-2.5">
                  {[
                    `Complete your profile (${student?.profileCompletion ?? 0}%)`,
                    "Take a weekly scholarship test",
                    "Apply to at least one opportunity",
                    "Build your resume with AI Tools",
                  ].map((step, i) => (
                    <div key={step} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-bold text-white bg-violet-200">{i + 1}</div>
                      <span className="text-[13px] text-slate-600">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-violet-100 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-3"><Bookmark size={15} className="text-violet-600" /> Saved ({student?._count.savedItems ?? 0})</div>
                <p className="text-[12px] text-slate-400">Save scholarships or jobs to find them here.</p>
              </div>

              <div className="rounded-2xl p-4 text-white" style={{ background: G }}>
                <Sparkles size={18} className="mb-2" />
                <p className="font-medium text-[14px] mb-1">Finish your resume with AI</p>
                <p className="text-white/70 text-[12px] mb-3">Get recruiter-ready in a couple of minutes.</p>
                <Link href="/ai-tools" className="bg-white text-[#4F46E5] text-[12px] font-medium rounded-full px-3.5 py-2 inline-block">Continue</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
