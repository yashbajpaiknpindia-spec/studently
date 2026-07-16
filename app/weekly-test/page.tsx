"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock, ChevronLeft, ChevronRight, Flag, Trophy, ShieldCheck, X,
  CheckCircle2, Circle, GraduationCap, School,
  Loader2, PartyPopper
} from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

// Weekly scholarship tests are school & college only for now — see the admin
// weekly-scholarship-tests page for the matching restriction.
const CATEGORIES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: "SCHOOL", label: "School", icon: School },
  { key: "COLLEGE", label: "College", icon: GraduationCap },
];

type WeeklyTest = {
  id: string;
  title: string;
  category: string;
  weekNumber: number;
  startsAt: string;
  endsAt: string;
  durationMins: number;
  scholarshipPoolAmount: number;
  _count: { questions: number; attempts: number };
};

type Question = { id: string; text: string; options: string[]; order: number };
type LeaderboardEntry = { rank: number; studentId: string; name: string; city: string | null; score: number; me: boolean };

function useTimer(initialSeconds: number, running: boolean, onExpire: () => void) {
  const [t, setT] = useState(initialSeconds);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setT((p) => {
        if (p <= 1) {
          clearInterval(id);
          onExpire();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const m = Math.floor(t / 60), s = t % 60;
  return { label: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, secondsLeft: t };
}

export default function WeeklyTestPage() {
  const [category, setCategory] = useState<string | null>(null);
  const [tests, setTests] = useState<WeeklyTest[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);

  const [activeTest, setActiveTest] = useState<WeeklyTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; correctCount: number; totalQuestions: number; rank: number } | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!category) return;
    setTestsLoading(true);
    fetch(`/api/weekly-tests?category=${category}`)
      .then((r) => (r.ok ? r.json() : { tests: [] }))
      .then((d) => setTests(d.tests ?? []))
      .finally(() => setTestsLoading(false));
  }, [category]);

  const loadLeaderboard = (testId: string) => {
    fetch(`/api/weekly-tests/${testId}/attempts`)
      .then((r) => (r.ok ? r.json() : { leaderboard: [] }))
      .then((d) => setLeaderboard(d.leaderboard ?? []));
  };

  const startTest = async (test: WeeklyTest) => {
    setActiveTest(test);
    setResult(null);
    setAlreadyDone(false);
    setAnswers({});
    setCurrent(0);
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/weekly-tests/${test.id}/questions`);
      const d = await res.json();
      setQuestions(d.questions ?? []);
    } finally {
      setQuestionsLoading(false);
    }
    loadLeaderboard(test.id);
  };

  const submit = async () => {
    if (!activeTest) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/weekly-tests/${activeTest.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const d = await res.json();
      if (res.status === 409) {
        setAlreadyDone(true);
      } else if (res.ok) {
        setResult({ score: d.score, correctCount: d.correctCount, totalQuestions: d.totalQuestions, rank: d.rank });
        loadLeaderboard(activeTest.id);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const running = !!activeTest && !questionsLoading && !result && !alreadyDone;
  const { label: timeLeft, secondsLeft } = useTimer((activeTest?.durationMins ?? 45) * 60, running, submit);

  useEffect(() => {
    if (running && secondsLeft === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const select = (qid: string, i: number) => setAnswers((p) => ({ ...p, [qid]: i }));

  // ---------------------------------------------------------------------
  // STEP 1 — pick a category
  // ---------------------------------------------------------------------
  if (!category) {
    return (
      <div className="min-h-screen bg-[#F8F7FD] text-[#120F1F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');.font-display{font-family:'Space Grotesk',sans-serif}.font-mono{font-family:'IBM Plex Mono',monospace}`}</style>
        <div className="sticky top-0 z-30 bg-white border-b border-violet-100 px-4 sm:px-6 h-14 flex items-center gap-2">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-700"><X size={18} /></Link>
          <span className="text-[14px] font-medium">Weekly Scholarship Test</span>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-2">Pick your category</h1>
          <p className="text-[13.5px] text-slate-500 mb-8">Choose a category to see this week's live test. Nothing starts until you tap "Start test".</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setCategory(c.key)} className="flex flex-col items-center gap-2 bg-white border border-violet-100 rounded-2xl p-5 hover:border-violet-300 hover:shadow-[0_8px_28px_-10px_rgba(79,70,229,0.2)] transition-all">
                <c.icon size={22} className="text-violet-600" />
                <span className="text-[13px] font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // STEP 2 — pick a specific live test in that category
  // ---------------------------------------------------------------------
  if (!activeTest) {
    return (
      <div className="min-h-screen bg-[#F8F7FD] text-[#120F1F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');.font-display{font-family:'Space Grotesk',sans-serif}.font-mono{font-family:'IBM Plex Mono',monospace}`}</style>
        <div className="sticky top-0 z-30 bg-white border-b border-violet-100 px-4 sm:px-6 h-14 flex items-center gap-2">
          <button onClick={() => setCategory(null)} className="text-slate-400 hover:text-slate-700"><ChevronLeft size={20} /></button>
          <span className="text-[14px] font-medium">{CATEGORIES.find((c) => c.key === category)?.label} tests</span>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          {testsLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-[14px]"><Loader2 size={16} className="animate-spin" /> Loading tests...</div>
          ) : tests.length === 0 ? (
            <div className="bg-white border border-violet-100 rounded-2xl p-8 text-center">
              <p className="text-[14px] text-slate-500 mb-1">No test is live for this category right now.</p>
              <p className="text-[13px] text-slate-400 mb-4">Check back next week, or try another category.</p>
              <button onClick={() => setCategory(null)} className="text-[13px] font-medium text-violet-500 hover:text-violet-700">Choose another category</button>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((t) => {
                const isLive = new Date(t.startsAt) <= new Date() && new Date(t.endsAt) >= new Date();
                return (
                  <div key={t.id} className="bg-white border border-violet-100 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-display font-semibold text-[16px] mb-1">{t.title}</h3>
                      <p className="text-[13px] text-slate-500">{t._count.questions} questions · {t.durationMins} minutes · Pool ₹{t.scholarshipPoolAmount.toLocaleString("en-IN")}</p>
                      <p className={`text-[12px] mt-1 ${isLive ? "text-emerald-600" : "text-slate-400"}`}>{isLive ? "Live now" : `Opens ${new Date(t.startsAt).toLocaleString("en-IN")}`}</p>
                    </div>
                    <button
                      onClick={() => startTest(t)}
                      disabled={!isLive || t._count.questions === 0}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium text-white disabled:opacity-40"
                      style={{ background: G }}
                    >
                      Start test <ChevronRight size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // STEP 3 — the test itself (only rendered once the user chose to start)
  // ---------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8F7FD] text-[#120F1F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .font-display{font-family:'Space Grotesk',sans-serif} .font-mono{font-family:'IBM Plex Mono',monospace}
      `}</style>

      <div className="sticky top-0 z-30 safe-top bg-white border-b border-violet-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-700"><X size={18} /></Link>
          <span className="text-[13px] font-medium hidden sm:inline">{activeTest.title}</span>
        </div>
        {running && (
          <div className="flex items-center gap-2 font-mono font-semibold text-[15px] bg-violet-50 text-[#4F46E5] rounded-full px-3.5 py-1.5">
            <Clock size={14} /> {timeLeft}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
          <ShieldCheck size={14} className="text-emerald-500" /> Secure
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_260px] gap-6">
        <div>
          {questionsLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-[14px] py-10"><Loader2 size={16} className="animate-spin" /> Loading questions...</div>
          ) : alreadyDone ? (
            <div className="bg-white rounded-2xl border border-violet-100 p-8 text-center">
              <PartyPopper size={28} className="text-violet-500 mx-auto mb-3" />
              <h2 className="font-display font-semibold text-lg mb-1">You've already taken this test</h2>
              <p className="text-[13.5px] text-slate-500 mb-4">Check the leaderboard on the right to see where you rank.</p>
              <Link href="/dashboard" className="text-[13px] font-medium text-violet-500 hover:text-violet-700">Back to dashboard</Link>
            </div>
          ) : result ? (
            <div className="bg-white rounded-2xl border border-violet-100 p-8 text-center">
              <Trophy size={28} className="text-amber-500 mx-auto mb-3" />
              <h2 className="font-display font-semibold text-2xl mb-1">Score: {result.score}%</h2>
              <p className="text-[13.5px] text-slate-500 mb-1">{result.correctCount} of {result.totalQuestions} correct</p>
              <p className="text-[13.5px] text-slate-500 mb-5">You're currently ranked <span className="font-semibold text-[#4F46E5]">#{result.rank}</span></p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-white font-medium text-[13.5px] rounded-full px-5 py-2.5" style={{ background: G }}>Back to dashboard</Link>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-violet-100 p-8 text-center text-[13.5px] text-slate-400">
              This test doesn't have any questions yet. Please check back later.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-mono text-slate-400">Question {current + 1} of {questions.length}</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {questions.map((q, i) => (
                    <button key={q.id} onClick={() => setCurrent(i)} className={`w-6 h-6 rounded-md text-[11px] font-mono font-medium flex items-center justify-center transition-colors ${i === current ? "text-white" : answers[q.id] !== undefined ? "bg-emerald-50 text-emerald-600" : "bg-white border border-slate-200 text-slate-400"}`} style={i === current ? { background: G } : {}}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-violet-100 p-5 sm:p-7">
                <h2 className="font-medium text-[16px] sm:text-[17px] leading-relaxed mb-6">{questions[current].text}</h2>
                <div className="space-y-2.5">
                  {questions[current].options.map((opt, i) => (
                    <button key={opt} onClick={() => select(questions[current].id, i)} className={`w-full flex items-center gap-3 text-left px-4 py-3.5 rounded-xl border text-[14px] transition-all ${answers[questions[current].id] === i ? "border-[#4F46E5] bg-violet-50/60 text-[#4F46E5] font-medium" : "border-slate-200 hover:border-violet-300"}`}>
                      {answers[questions[current].id] === i ? <CheckCircle2 size={18} className="text-[#4F46E5] flex-shrink-0" /> : <Circle size={18} className="text-slate-300 flex-shrink-0" />}
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mt-5">
                <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium text-slate-600 bg-white border border-slate-200 disabled:opacity-40" disabled={current === 0}>
                  <ChevronLeft size={15} /> Previous
                </button>
                {current === questions.length - 1 ? (
                  <button onClick={submit} disabled={submitting} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium text-white disabled:opacity-60" style={{ background: G }}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />} Submit Test
                  </button>
                ) : (
                  <button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium text-white" style={{ background: G }}>
                    Next <ChevronRight size={15} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Live leaderboard sidebar */}
        <div className="bg-white rounded-2xl border border-violet-100 p-4 h-fit sticky top-20">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-4"><Trophy size={15} className="text-amber-500" /> Live Leaderboard</div>
          <div className="space-y-1">
            {leaderboard.length === 0 && <p className="text-[12px] text-slate-400">No submissions yet — be the first!</p>}
            {leaderboard.map((l) => (
              <div key={l.studentId} className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] ${l.me ? "bg-violet-50 font-medium" : ""}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-slate-400 w-6 flex-shrink-0">#{l.rank}</span>
                  <span className="truncate">{l.me ? "You" : l.name}</span>
                </div>
                <span className="font-mono text-slate-500 flex-shrink-0">{l.score}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">Rankings update instantly once you submit. Top 100 qualify for this week's scholarship pool.</p>
        </div>
      </div>
    </div>
  );
}
