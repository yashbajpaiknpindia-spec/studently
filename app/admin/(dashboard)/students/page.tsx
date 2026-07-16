"use client";

import React, { useEffect, useState } from "react";
import {
  Search, User, Phone, Mail, MapPin, School, Flame, Star, Trophy,
  Briefcase, GraduationCap, Bookmark, Bell, Award, ShieldAlert, Loader2, TrendingUp
} from "lucide-react";
import DetailsSheet from "@/components/DetailsSheet";

type Student = {
  id: string;
  fullName: string;
  city: string | null;
  institution: string | null;
  eligibilityScore: number;
  xp: number;
  user: { phone: string; email: string | null };
  _count: { applications: number; testAttempts: number; savedItems: number };
};

type StudentDetail = {
  id: string;
  fullName: string;
  city: string | null;
  qualification: string | null;
  institution: string | null;
  branch: string | null;
  profileCompletion: number;
  eligibilityScore: number;
  resumeScore: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  referralCode: string;
  createdAt: string;
  user: { phone: string; email: string | null; avatarUrl: string | null; createdAt: string };
  applications: { id: string; status: string; appliedAt: string; scholarship: { title: string; amount: number } | null; job: { role: string; company: string } | null }[];
  testAttempts: { id: string; score: number; rank: number | null; submittedAt: string | null; createdAt: string; test: { title: string; category: string; weekNumber: number } }[];
  savedItems: { id: string; createdAt: string; scholarshipTitle: string | null; job: { role: string; company: string } | null }[];
  notifications: { id: string; title: string; body: string; read: boolean; createdAt: string }[];
  badges: { earnedAt: string; badge: { name: string; description: string } }[];
};

type Analysis = {
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
  totalTestsAttempted: number;
  averageScore: number;
  totalSaved: number;
  totalBadges: number;
  unresolvedFraudFlags: number;
  accountAgeDays: number;
};

type FraudFlag = { id: string; reason: string; severity: string; resolved: boolean; createdAt: string };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2 mt-5 first:mt-0">{children}</p>;
}

export default function AdminStudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/students${search ? `?search=${encodeURIComponent(search)}` : ""}`)
        .then((r) => {
          if (!r.ok) throw new Error("Could not load students — is the database connected?");
          return r.json();
        })
        .then((d) => setItems(d.students))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openStudent = (id: string) => {
    setOpenId(id);
    setDetailLoading(true);
    setDetail(null);
    fetch(`/api/admin/students/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load student details.");
        return r.json();
      })
      .then((d) => {
        setDetail(d.student);
        setAnalysis(d.analysis);
        setFraudFlags(d.fraudFlags ?? []);
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-semibold text-2xl mb-1">Students</h1>
      <p className="text-slate-400 text-[13.5px] mb-5">{items.length} loaded. Tap a student to see their full profile, activity and analysis.</p>

      <div className="flex items-center gap-2.5 bg-white border border-violet-100 rounded-xl px-4 py-2.5 mb-5 max-w-sm">
        <Search size={15} className="text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city, institution..." className="flex-1 outline-none text-[13.5px]" />
      </div>

      {error && <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
          {items.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No students found.</p>}
          {items.map((s) => (
            <button key={s.id} onClick={() => openStudent(s.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-violet-50/40 transition-colors">
              <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0"><User size={14} className="text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13.5px] truncate">{s.fullName}</p>
                <p className="text-[12px] text-slate-400">{s.user.phone} · {s.institution ?? "—"} · {s.city ?? "—"}</p>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">{s._count.applications} applied · {s._count.testAttempts} tests</span>
              <span className="font-mono text-[12px] text-slate-500">XP {s.xp}</span>
              <span className="font-mono text-[12px] font-medium text-[#4F46E5]">{s.eligibilityScore}%</span>
            </button>
          ))}
        </div>
      )}

      <DetailsSheet
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={detail?.fullName ?? "Student"}
        subtitle={detail ? `${detail.institution ?? "No institution set"} · ${detail.city ?? "—"}` : undefined}
      >
        {detailLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-[13.5px] py-10 justify-center"><Loader2 size={16} className="animate-spin" /> Loading...</div>
        )}

        {!detailLoading && !detail && (
          <p className="text-[13px] text-slate-400 py-10 text-center">Couldn't load this student's details.</p>
        )}

        {!detailLoading && detail && analysis && (
          <div>
            {/* Contact */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-600">
              <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {detail.user.phone}</span>
              {detail.user.email && <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" /> {detail.user.email}</span>}
              {detail.city && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> {detail.city}</span>}
              {detail.qualification && <span className="flex items-center gap-1.5"><School size={13} className="text-slate-400" /> {detail.qualification}{detail.branch ? ` · ${detail.branch}` : ""}</span>}
            </div>
            <p className="text-[11.5px] text-slate-400 mt-1.5">Joined {new Date(detail.user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ({analysis.accountAgeDays}d ago)</p>

            {/* Gamification stats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="bg-violet-50/60 rounded-xl p-2.5 text-center">
                <p className="font-mono font-semibold text-[15px] text-[#4F46E5]">{detail.xp}</p>
                <p className="text-[10px] text-slate-400">XP · Lv {detail.level}</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-2.5 text-center">
                <p className="font-mono font-semibold text-[15px] flex items-center justify-center gap-0.5"><Flame size={12} className="text-amber-500" />{detail.currentStreak}</p>
                <p className="text-[10px] text-slate-400">streak (best {detail.longestStreak})</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-2.5 text-center">
                <p className="font-mono font-semibold text-[15px]">{detail.eligibilityScore}%</p>
                <p className="text-[10px] text-slate-400">eligibility</p>
              </div>
              <div className="bg-violet-50/60 rounded-xl p-2.5 text-center">
                <p className="font-mono font-semibold text-[15px]">{detail.profileCompletion}%</p>
                <p className="text-[10px] text-slate-400">profile</p>
              </div>
            </div>

            {/* Analysis */}
            <SectionLabel>Analysis</SectionLabel>
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-1.5 text-[12.5px] text-slate-600">
              <p className="flex items-center gap-1.5"><TrendingUp size={13} className="text-slate-400" /> Average test score: <span className="font-medium">{analysis.totalTestsAttempted > 0 ? `${analysis.averageScore}%` : "no attempts yet"}</span></p>
              <p className="flex items-center gap-1.5"><Briefcase size={13} className="text-slate-400" /> {analysis.totalApplications} application{analysis.totalApplications === 1 ? "" : "s"}
                {Object.entries(analysis.applicationsByStatus).length > 0 && (
                  <span className="text-slate-400"> ({Object.entries(analysis.applicationsByStatus).map(([k, v]) => `${v} ${k.toLowerCase().replace("_", " ")}`).join(", ")})</span>
                )}
              </p>
              <p className="flex items-center gap-1.5"><Bookmark size={13} className="text-slate-400" /> {analysis.totalSaved} item{analysis.totalSaved === 1 ? "" : "s"} saved</p>
              <p className="flex items-center gap-1.5"><Award size={13} className="text-slate-400" /> {analysis.totalBadges} badge{analysis.totalBadges === 1 ? "" : "s"} earned</p>
              {analysis.unresolvedFraudFlags > 0 && (
                <p className="flex items-center gap-1.5 text-red-500 font-medium"><ShieldAlert size={13} /> {analysis.unresolvedFraudFlags} unresolved fraud flag{analysis.unresolvedFraudFlags === 1 ? "" : "s"}</p>
              )}
            </div>

            {/* Fraud flags */}
            {fraudFlags.length > 0 && (
              <>
                <SectionLabel>Fraud flags</SectionLabel>
                <div className="space-y-1.5">
                  {fraudFlags.map((f) => (
                    <div key={f.id} className={`rounded-lg px-3 py-2 text-[12px] ${f.resolved ? "bg-slate-50 text-slate-400" : "bg-red-50 text-red-600"}`}>
                      <span className="font-medium">{f.severity}</span> — {f.reason}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Applications */}
            <SectionLabel>Applications ({detail.applications.length})</SectionLabel>
            {detail.applications.length === 0 ? (
              <p className="text-[12.5px] text-slate-400">No applications yet.</p>
            ) : (
              <div className="space-y-1.5">
                {detail.applications.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-[12.5px] px-3 py-2 bg-slate-50 rounded-lg">
                    {a.scholarship ? <GraduationCap size={13} className="text-violet-500 flex-shrink-0" /> : <Briefcase size={13} className="text-violet-500 flex-shrink-0" />}
                    <span className="flex-1 min-w-0 truncate">{a.scholarship?.title ?? (a.job ? `${a.job.role} · ${a.job.company}` : "—")}</span>
                    <span className="text-[10.5px] font-mono bg-white border border-slate-200 rounded-full px-2 py-0.5 flex-shrink-0">{a.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Test attempts */}
            <SectionLabel>Weekly test attempts ({detail.testAttempts.length})</SectionLabel>
            {detail.testAttempts.length === 0 ? (
              <p className="text-[12.5px] text-slate-400">No tests attempted yet.</p>
            ) : (
              <div className="space-y-1.5">
                {detail.testAttempts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-[12.5px] px-3 py-2 bg-slate-50 rounded-lg">
                    <Trophy size={13} className="text-amber-500 flex-shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{a.test.title} · {a.test.category} Wk{a.test.weekNumber}</span>
                    <span className="font-mono text-[11.5px] flex-shrink-0">{a.submittedAt ? `${a.score}%` : "in progress"}{a.rank ? ` · #${a.rank}` : ""}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Saved items */}
            <SectionLabel>Saved items ({detail.savedItems.length})</SectionLabel>
            {detail.savedItems.length === 0 ? (
              <p className="text-[12.5px] text-slate-400">Nothing saved yet.</p>
            ) : (
              <div className="space-y-1.5">
                {detail.savedItems.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-[12.5px] px-3 py-2 bg-slate-50 rounded-lg">
                    <Bookmark size={13} className="text-violet-500 flex-shrink-0" />
                    <span className="truncate">{s.scholarshipTitle ?? (s.job ? `${s.job.role} · ${s.job.company}` : "—")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Badges */}
            {detail.badges.length > 0 && (
              <>
                <SectionLabel>Badges</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {detail.badges.map((b, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11.5px] font-medium bg-amber-50 text-amber-600 rounded-full px-2.5 py-1"><Star size={11} /> {b.badge.name}</span>
                  ))}
                </div>
              </>
            )}

            {/* Recent notifications */}
            {detail.notifications.length > 0 && (
              <>
                <SectionLabel>Recent notifications</SectionLabel>
                <div className="space-y-1.5">
                  {detail.notifications.slice(0, 8).map((n) => (
                    <div key={n.id} className="flex items-start gap-2 text-[12px] px-3 py-2 bg-slate-50 rounded-lg">
                      <Bell size={12} className={`flex-shrink-0 mt-0.5 ${n.read ? "text-slate-300" : "text-violet-500"}`} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{n.title}</p>
                        <p className="text-slate-400 truncate">{n.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </DetailsSheet>
    </div>
  );
}
