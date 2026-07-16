"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, Trophy, Briefcase, GraduationCap, FileText, Sparkles,
  Users, Target, Clock, TrendingUp, Award, MapPin, Search, ChevronRight,
  Zap, ShieldCheck, Star, BookOpen, Building2, Landmark, Flame, Bell,
  CheckCircle2, ArrowUpRight, Menu, X
} from "lucide-react";

// ---------------------------------------------------------------------------
// STUDENTLY — design tokens
// Base:      #FFFFFF / #F8F7FD (section alt)
// Ink:       #120F1F
// Gradient:  #4F46E5 -> #7C3AED -> #2563EB  (indigo -> violet -> blue)
// Signal:    #F0A93A (earned/reward amber) — the "money" color, used sparingly
// Live:      #12B76A (live/active states)
// Type:      Space Grotesk (display) / Inter (body) / IBM Plex Mono (data)
// Signature: the "Live Pool" ticker — a scoreboard-style counter that makes
//            the scholarship pool feel like a living, ticking thing.
// ---------------------------------------------------------------------------

function useCountUp(target: number, durationMs = 1400, start = true) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); };
  }, [target, durationMs, start]);
  return value;
}

function useInView(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function useCountdown(target: number) {
  const [left, setLeft] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const clamp = Math.max(0, left);
  const d = Math.floor(clamp / 86400000);
  const h = Math.floor((clamp % 86400000) / 3600000);
  const m = Math.floor((clamp % 3600000) / 60000);
  const s = Math.floor((clamp % 60000) / 1000);
  return { d, h, m, s };
}

type StatCardProps = {
  icon: React.ElementType;
  value: number;
  suffix?: string;
  label: string;
  prefix?: string;
  accent: string;
};

const StatCard = ({ icon: Icon, value, suffix = "", label, prefix = "", accent }: StatCardProps) => {
  const [ref, inView] = useInView();
  const count = useCountUp(value, 1500, inView);
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="relative rounded-2xl bg-white/70 backdrop-blur-xl border border-violet-100 shadow-[0_4px_24px_-8px_rgba(79,70,229,0.15)] px-4 py-5 flex flex-col gap-2 hover:shadow-[0_8px_32px_-8px_rgba(79,70,229,0.25)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon size={17} strokeWidth={2.25} className="text-white" />
      </div>
      <div className="font-mono text-2xl sm:text-[28px] font-semibold tracking-tight text-[#120F1F] tabular-nums">
        {prefix}{count.toLocaleString("en-IN")}{suffix}
      </div>
      <div className="text-[13px] text-slate-500 leading-tight">{label}</div>
    </div>
  );
};

type GradientButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const GradientButton = ({ children, className = "", variant = "primary", ...props }: GradientButtonProps) => {
  if (variant === "primary") {
    return (
      <button
        className={`group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium text-white text-[15px] overflow-hidden transition-transform duration-300 active:scale-[0.97] ${className}`}
        style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 55%, #2563EB 100%)" }}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        <span className="absolute inset-0 bg-white/20 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700 skew-x-[-20deg]" />
      </button>
    );
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium text-[15px] text-[#3B2E8C] bg-white border border-violet-200 hover:border-violet-400 hover:bg-violet-50/50 transition-all duration-300 active:scale-[0.97] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

type PillProps = {
  children: React.ReactNode;
  icon?: React.ElementType;
};

const Pill = ({ children, icon: Icon }: PillProps) => (
  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
    {Icon && <Icon size={12} strokeWidth={2.5} />}
    {children}
  </span>
);

export default function StudentlyHome() {
  const [category, setCategory] = useState("College");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const categories = ["College", "Banking", "SSC", "UPSC", "JEE", "NEET", "School"];
  const nextTest = useRef(Date.now() + (2 * 86400000 + 6 * 3600000 + 41 * 60000)).current;
  const { d, h, m, s } = useCountdown(nextTest);

  useEffect(() => {
    fetch("/api/students/me")
      .then((r) => setIsLoggedIn(r.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);

  const features = [
    { icon: Trophy, title: "Weekly Scholarship Tests", desc: "Compete every week across 7 categories. Top rankers win real scholarship money.", tag: "Earn" },
    { icon: Landmark, title: "Verified Scholarship Pool", desc: "Every rupee sponsored, tracked and paid out with full public transparency.", tag: "Earn" },
    { icon: GraduationCap, title: "Scholarships", desc: "Thousands of verified scholarships matched to your profile automatically.", tag: "Discover" },
    { icon: Briefcase, title: "Internships & Fresher Jobs", desc: "From startups to campus hiring — apply in one tap with your Studently profile.", tag: "Work" },
    { icon: Building2, title: "Government Jobs", desc: "Curated Sarkari Naukri listings with deadline alerts, zero noise.", tag: "Work" },
    { icon: Sparkles, title: "AI Resume Builder", desc: "Generate a recruiter-ready resume from your profile in under 2 minutes.", tag: "AI" },
    { icon: Target, title: "AI Career Assistant", desc: "Get a personalised roadmap — skills, exams, and opportunities to target next.", tag: "AI" },
    { icon: CheckCircle2, title: "Opportunity Tracker", desc: "Every application, every status, in one clean timeline. Never lose track.", tag: "Track" },
  ];

  const liveWinners = [
    { name: "Ananya S.", city: "Lucknow", amount: 15000, cat: "JEE" },
    { name: "Rohit K.", city: "Kanpur", amount: 12000, cat: "Banking" },
    { name: "Fatima A.", city: "Bhopal", amount: 20000, cat: "UPSC" },
  ];

  return (
    <div className="min-h-screen bg-white text-[#120F1F] antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes floatSlow { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(3deg)} }
        @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(18,183,106,0.35)} 100%{box-shadow:0 0 0 8px rgba(18,183,106,0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeUp { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
        .animate-fadeUp { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) both; }
        .float-blob { animation: floatSlow 7s ease-in-out infinite; }
        .live-dot { animation: pulseRing 1.6s ease-out infinite; }
        .skeleton-shimmer { background: linear-gradient(90deg,#f1eefc 25%,#e5e0fb 37%,#f1eefc 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
      `}</style>

      {/* ambient gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="float-blob absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-[0.14] blur-3xl" style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)" }} />
        <div className="float-blob absolute top-[40%] -left-32 w-[380px] h-[380px] rounded-full opacity-[0.12] blur-3xl" style={{ background: "radial-gradient(circle, #2563EB, transparent 70%)", animationDelay: "2s" }} />
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-50 safe-top backdrop-blur-xl bg-white/80 border-b border-violet-100/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm" style={{ background: "linear-gradient(135deg,#4F46E5,#2563EB)" }}>S</div>
            <span className="font-display font-semibold text-[17px] tracking-tight">Studently</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-[14px] font-medium text-slate-600">
            <Link className="hover:text-[#4F46E5] transition-colors" href="/scholarships">Scholarships</Link>
            <Link className="hover:text-[#4F46E5] transition-colors" href="/jobs">Jobs</Link>
            <Link className="hover:text-[#4F46E5] transition-colors" href="/weekly-test">Weekly Test</Link>
            <Link className="hover:text-[#4F46E5] transition-colors" href="/ai-tools">AI Tools</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href={isLoggedIn ? "/dashboard" : "/auth"}><GradientButton className="!px-5 !py-2 !text-[13px]">{isLoggedIn ? "Dashboard" : "Start Free"}</GradientButton></Link>
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center text-slate-600 flex-shrink-0"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-violet-100/70 bg-white px-4 py-3 flex flex-col gap-1 text-[14px] font-medium text-slate-600">
            <Link onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg hover:bg-violet-50 hover:text-[#4F46E5] transition-colors" href="/scholarships">Scholarships</Link>
            <Link onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg hover:bg-violet-50 hover:text-[#4F46E5] transition-colors" href="/jobs">Jobs</Link>
            <Link onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg hover:bg-violet-50 hover:text-[#4F46E5] transition-colors" href="/weekly-test">Weekly Test</Link>
            <Link onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg hover:bg-violet-50 hover:text-[#4F46E5] transition-colors" href="/ai-tools">AI Tools</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center">
        <div className="animate-fadeUp inline-flex mb-5">
          <Pill icon={Flame}>Weekly test closes in {d}d {h}h — join now</Pill>
        </div>
        <h1 className="animate-fadeUp font-display font-semibold tracking-tight text-[38px] leading-[1.08] sm:text-6xl sm:leading-[1.05] max-w-3xl mx-auto" style={{ animationDelay: "0.05s" }}>
          India's smartest{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg,#4F46E5,#7C3AED,#2563EB)" }}>
            student platform
          </span>
        </h1>
        <p className="animate-fadeUp mt-5 text-slate-500 text-[16px] sm:text-lg max-w-lg mx-auto" style={{ animationDelay: "0.1s" }}>
          Earn scholarships. Find internships. Get hired.
        </p>
        <div className="animate-fadeUp mt-8 flex flex-col sm:flex-row items-center justify-center gap-3" style={{ animationDelay: "0.15s" }}>
          <Link href={isLoggedIn ? "/dashboard" : "/auth"}><GradientButton>{isLoggedIn ? "Go to dashboard" : "Start Free"} <ArrowRight size={16} /></GradientButton></Link>
          <Link href="/weekly-test"><GradientButton variant="secondary">Take Weekly Test <Trophy size={16} /></GradientButton></Link>
        </div>

        {/* stat strip */}
        <div className="animate-fadeUp mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" style={{ animationDelay: "0.2s" }}>
          <StatCard icon={Landmark} value={42800000} prefix="₹" label="Scholarship pool" accent="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]" />
          <StatCard icon={Users} value={186400} label="Students placed" accent="bg-gradient-to-br from-[#2563EB] to-[#4F46E5]" />
          <StatCard icon={Briefcase} value={3120} label="Active jobs" accent="bg-gradient-to-br from-[#7C3AED] to-[#2563EB]" />
          <StatCard icon={Building2} value={1840} label="Active internships" accent="bg-gradient-to-br from-[#4F46E5] to-[#2563EB]" />
        </div>
      </section>

      {/* LIVE POOL — signature element */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="relative rounded-[28px] overflow-hidden text-white px-6 py-8 sm:px-10 sm:py-10" style={{ background: "linear-gradient(120deg,#120F1F 0%,#241B4E 45%,#1E2A6E 100%)" }}>
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: "#7C3AED" }} />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[12px] font-medium text-emerald-300 mb-3">
                <span className="live-dot w-2 h-2 rounded-full bg-emerald-400" />
                LIVE THIS WEEK
              </div>
              <div className="font-mono text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums">
                ₹{useCountUp(1284600, 2000).toLocaleString("en-IN")}
              </div>
              <p className="text-white/60 text-[14px] mt-1">distributed to winners this month</p>
            </div>

            {/* countdown scoreboard */}
            <div className="flex items-center gap-2 sm:gap-3">
              {[["Days", d], ["Hrs", h], ["Min", m], ["Sec", s]].map(([label, v]) => (
                <div key={label} className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-xl px-3.5 py-2.5 border border-white/10 min-w-[58px]">
                  <span className="font-mono text-xl font-semibold tabular-nums">{String(v).padStart(2, "0")}</span>
                  <span className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* live winners ticker */}
          <div className="relative mt-7 pt-6 border-t border-white/10 flex flex-wrap gap-3">
            {liveWinners.map((w) => (
              <div key={w.name} className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-full pl-1.5 pr-3.5 py-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "linear-gradient(135deg,#F0A93A,#E8871A)" }}>
                  {w.name[0]}
                </div>
                <span className="text-[13px] text-white/90">{w.name} · {w.city}</span>
                <span className="text-[13px] font-mono font-medium text-amber-300">+₹{w.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WEEKLY TEST — category selector */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[12px] font-medium text-violet-600 mb-1.5">WEEKLY SCHOLARSHIP TEST</p>
            <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">Pick your category, start earning</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium border transition-all duration-200 ${
                category === c
                  ? "text-white border-transparent shadow-[0_4px_14px_-4px_rgba(79,70,229,0.5)]"
                  : "text-slate-600 bg-white border-slate-200 hover:border-violet-300"
              }`}
              style={category === c ? { background: "linear-gradient(135deg,#4F46E5,#7C3AED)" } : {}}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-white border border-violet-100 shadow-[0_4px_24px_-8px_rgba(79,70,229,0.12)] p-6 sm:p-8 grid sm:grid-cols-3 gap-6">
          <div className="sm:col-span-2">
            <h3 className="font-display font-semibold text-xl mb-1.5">{category} Scholarship Test — Week 27</h3>
            <p className="text-slate-500 text-[14px] mb-4">30 questions · 45 minutes · Instant score & national rank on submit.</p>
            <div className="flex flex-wrap gap-2">
              <Pill icon={Trophy}>Top 100 win scholarships</Pill>
              <Pill icon={ShieldCheck}>Secure & proctored</Pill>
              <Pill icon={Award}>Certificate on completion</Pill>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-end">
            <Link href={isLoggedIn ? "/weekly-test" : "/auth?next=/weekly-test"} className="w-full sm:w-auto">
              <GradientButton className="w-full sm:w-auto">Take Test Now <ArrowRight size={16} /></GradientButton>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="bg-[#F8F7FD] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-[12px] font-medium text-violet-600 mb-1.5 text-center">EVERYTHING IN ONE PLACE</p>
          <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-center mb-10">One profile. Every opportunity.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl bg-white border border-violet-100/80 p-5 hover:shadow-[0_8px_28px_-8px_rgba(79,70,229,0.2)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-violet-50 group-hover:bg-gradient-to-br group-hover:from-[#4F46E5] group-hover:to-[#7C3AED] transition-colors duration-300">
                  <f.icon size={18} strokeWidth={2} className="text-violet-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="text-[10px] font-semibold text-violet-500 tracking-wide">{f.tag.toUpperCase()}</span>
                <h3 className="font-semibold text-[15px] mt-1 mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-slate-500 leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[12px] font-medium text-violet-600 mb-1.5">YOUR DASHBOARD</p>
            <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-4">Built around your progress, not our clutter</h2>
            <ul className="space-y-3">
              {["Profile & scholarship eligibility score", "Weekly test rank, tracked over time", "Recommended opportunities, updated daily", "Resume score with AI suggestions"].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                  <CheckCircle2 size={17} className="text-[#4F46E5] mt-0.5 flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-violet-100 shadow-[0_8px_32px_-8px_rgba(79,70,229,0.18)] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>Y</div>
                <div>
                  <p className="font-medium text-[14px]">Yash Rathore</p>
                  <p className="text-[12px] text-slate-400">Rank #214 nationally</p>
                </div>
              </div>
              <Bell size={17} className="text-slate-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Profile completion</span>
                <span className="font-mono font-medium">82%</span>
              </div>
              <div className="h-2 rounded-full bg-violet-50 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "82%", background: "linear-gradient(90deg,#4F46E5,#7C3AED)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-violet-50/60 p-3">
                  <p className="text-[11px] text-slate-500 mb-0.5">Eligibility score</p>
                  <p className="font-mono font-semibold text-lg">91</p>
                </div>
                <div className="rounded-xl bg-violet-50/60 p-3">
                  <p className="text-[11px] text-slate-500 mb-0.5">Resume score</p>
                  <p className="font-mono font-semibold text-lg">76</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-[28px] text-center py-14 px-6" style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED,#2563EB)" }}>
          <h2 className="font-display font-semibold text-white text-2xl sm:text-3xl tracking-tight mb-3">Your next scholarship is one test away</h2>
          <p className="text-white/70 text-[14px] mb-7">Free to join. No card required.</p>
          <Link href={isLoggedIn ? "/dashboard" : "/auth"} className="bg-white text-[#4F46E5] font-medium rounded-full px-7 py-3.5 text-[15px] hover:scale-[1.03] transition-transform duration-300 active:scale-[0.97] inline-block">
            Start Free Today
          </Link>
        </div>
      </section>

      <footer className="border-t border-violet-100 py-8 text-center text-[13px] text-slate-400">
        © 2026 Studently. Built for every Indian student.
      </footer>
    </div>
  );
}
