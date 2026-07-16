"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight, Mail, Lock, User, GraduationCap, ChevronLeft, CheckCircle2,
  Sparkles, Phone, Loader2
} from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED,#2563EB)";
const steps = ["Profile", "Goals"];
const goals = ["Scholarships", "Internships", "Fresher jobs", "Government jobs", "Higher studies"];

function AuthOnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<"signup" | "login" | "onboarding">("signup");
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [signupForm, setSignupForm] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [profileForm, setProfileForm] = useState({ qualification: "Undergraduate", institution: "", city: "" });

  const toggleGoal = (g: string) => setSelectedGoals((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  // The Google OAuth callback redirects back here (the session cookie is already
  // set by then) rather than handling anything client-side. A new account lands
  // in onboarding to fill in the same profile/goals steps as manual signup;
  // a returning account goes straight through. Any OAuth error surfaces inline.
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (searchParams.get("newUser") === "1") {
      setMode("onboarding");
      setStep(0);
    } else if (searchParams.get("googleLogin") === "1") {
      // Returning Google user — the session cookie is already set by the
      // callback, just continue straight into the app.
      router.push(next);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Signup failed.");
      setMode("onboarding");
      setStep(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed.");
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/students/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save your profile.");
      setStep(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const finishOnboarding = () => {
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white text-[#120F1F] flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .font-display{font-family:'Space Grotesk',sans-serif}
        @keyframes floatSlow{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-14px) rotate(3deg)}}
        .float{animation:floatSlow 7s ease-in-out infinite}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .animate-fadeUp{animation:fadeUp .45s cubic-bezier(.22,1,.36,1) both}
      `}</style>

      <div className="hidden lg:flex w-[42%] relative overflow-hidden text-white flex-col justify-between p-10" style={{ background: "linear-gradient(135deg,#120F1F,#241B4E 60%,#1E2A6E)" }}>
        <div className="float absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: "#7C3AED" }} />
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm" style={{ background: G }}>S</div>
          <span className="font-display font-semibold text-[17px]">Studently</span>
        </div>
        <div className="relative z-10">
          <h2 className="font-display font-semibold text-3xl leading-tight mb-4">Join students earning their way forward.</h2>
          <div className="space-y-3">
            {["Verified scholarships, matched to you", "Real jobs and internships", "Weekly tests across 7 categories"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-[14px] text-white/70">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" /> {t}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-white/30 relative z-10">© 2026 Studently</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-10">
        <div className="w-full max-w-sm">
          {mode !== "onboarding" ? (
            <div className="animate-fadeUp">
              <div className="flex items-center justify-between lg:justify-start gap-2 mb-8">
                <div className="lg:hidden flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-display font-bold text-xs" style={{ background: G }}>S</div>
                  <span className="font-display font-semibold text-[15px]">Studently</span>
                </div>
                <button onClick={() => router.push("/")} className="flex items-center gap-1 text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronLeft size={16} /> Home
                </button>
              </div>
              <h1 className="font-display font-semibold text-2xl mb-1.5">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
              <p className="text-slate-400 text-[13.5px] mb-7">{mode === "signup" ? "Free forever. No card required." : "Log in to continue your journey."}</p>

              {mode === "signup" ? (
                <form onSubmit={submitSignup} className="space-y-3">
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
                    <User size={16} className="text-slate-400" />
                    <input required value={signupForm.fullName} onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })} placeholder="Full name" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
                    <Phone size={16} className="text-slate-400" />
                    <input required value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} placeholder="Phone number" inputMode="numeric" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
                    <Mail size={16} className="text-slate-400" />
                    <input value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} placeholder="Email address (optional)" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
                    <Lock size={16} className="text-slate-400" />
                    <input required minLength={8} value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} type="password" placeholder="Password (min. 8 characters)" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                  </div>

                  {error && <p className="text-[12.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3.5 mt-2 disabled:opacity-60" style={{ background: G }}>
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitLogin} className="space-y-3">
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
                    <Phone size={16} className="text-slate-400" />
                    <input required value={loginForm.phone} onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })} placeholder="Phone number" inputMode="numeric" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-violet-400 transition-colors">
                    <Lock size={16} className="text-slate-400" />
                    <input required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} type="password" placeholder="Password" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                  </div>

                  {error && <p className="text-[12.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3.5 mt-2 disabled:opacity-60" style={{ background: G }}>
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <>Log in <ArrowRight size={15} /></>}
                  </button>
                </form>
              )}

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[12px] text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <a
                href={`/api/auth/google?next=${encodeURIComponent(next)}`}
                className="w-full flex items-center justify-center gap-2.5 border border-slate-200 rounded-full py-3.5 text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
                </svg>
                Continue with Google
              </a>

              <p className="text-center text-[13px] text-slate-400 mt-6">
                {mode === "signup" ? "Already have an account?" : "New to Studently?"}{" "}
                <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }} className="text-[#4F46E5] font-medium">
                  {mode === "signup" ? "Log in" : "Sign up"}
                </button>
              </p>
            </div>
          ) : (
            <div className="animate-fadeUp">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 flex gap-1.5">
                  {steps.map((_, i) => <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? "linear-gradient(90deg,#4F46E5,#7C3AED)" : "#EDE9FE" }} />)}
                </div>
              </div>

              {step === 0 && (
                <form onSubmit={submitProfile}>
                  <h1 className="font-display font-semibold text-2xl mb-1.5">Tell us about you</h1>
                  <p className="text-slate-400 text-[13.5px] mb-7">This helps us match the right opportunities.</p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3">
                      <GraduationCap size={16} className="text-slate-400" />
                      <select value={profileForm.qualification} onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })} className="flex-1 outline-none text-[14px] text-slate-600 bg-transparent">
                        <option>Undergraduate</option><option>Postgraduate</option><option>Class 12</option><option>Diploma</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3">
                      <input value={profileForm.institution} onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })} placeholder="College / school name" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-3">
                      <input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} placeholder="City" className="flex-1 outline-none text-[14px] placeholder:text-slate-400" />
                    </div>
                  </div>
                  {error && <p className="text-[12.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3.5 disabled:opacity-60" style={{ background: G }}>
                    {loading ? <Loader2 size={15} className="animate-spin" /> : "Continue"}
                  </button>
                </form>
              )}

              {step === 1 && (
                <div>
                  <button onClick={() => setStep(0)} className="flex items-center gap-1 text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors mb-4">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <h1 className="font-display font-semibold text-2xl mb-1.5">What are you here for?</h1>
                  <p className="text-slate-400 text-[13.5px] mb-6">Pick as many as you like.</p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {goals.map((g) => (
                      <button key={g} type="button" onClick={() => toggleGoal(g)} className={`px-4 py-2.5 rounded-full text-[13px] font-medium border transition-all ${selectedGoals.includes(g) ? "text-white border-transparent" : "text-slate-600 border-slate-200"}`} style={selectedGoals.includes(g) ? { background: G } : {}}>
                        {g}
                      </button>
                    ))}
                  </div>
                  <button onClick={finishOnboarding} className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3.5" style={{ background: G }}>
                    <Sparkles size={15} /> Go to my dashboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthOnboarding() {
  return (
    <Suspense fallback={null}>
      <AuthOnboardingInner />
    </Suspense>
  );
}
