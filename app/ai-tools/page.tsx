"use client";

import React, { useState } from "react";
import {
  Sparkles, FileText, Send, Mic, Target, Landmark, ArrowRight,
  Wand2, AlertCircle, Copy, Check, RotateCw
} from "lucide-react";
import BackBar from "@/components/BackBar";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

const tools: {
  icon: React.ElementType;
  title: string;
  desc: string;
  cta: string;
  key: "resume" | "sop" | "cover-letter" | "interview-prep" | "career-roadmap" | "scholarship-match";
  placeholder: string;
}[] = [
  { icon: FileText, title: "AI Resume Builder", desc: "Recruiter-ready resume from your profile in under 2 minutes.", cta: "Build resume", key: "resume", placeholder: "Optional: paste your skills, projects, internships, or anything else to include..." },
  { icon: Send, title: "AI SOP Builder", desc: "Statement of purpose tailored to your target course & university.", cta: "Write SOP", key: "sop", placeholder: "Target course & university, and why you want to study it..." },
  { icon: Wand2, title: "AI Cover Letter", desc: "A personalised cover letter for every job you apply to.", cta: "Generate letter", key: "cover-letter", placeholder: "Paste the role/company you're applying to..." },
  { icon: Mic, title: "AI Interview Prep", desc: "Practice with role-specific mock questions and instant feedback.", cta: "Start practice", key: "interview-prep", placeholder: "What role/exam are you preparing for?" },
  { icon: Target, title: "AI Career Roadmap", desc: "A step-by-step plan based on your goals and current skill level.", cta: "Get roadmap", key: "career-roadmap", placeholder: "Optional: your target career or exam..." },
  { icon: Landmark, title: "AI Scholarship Match", desc: "See your match score against every scholarship, instantly.", cta: "Check matches", key: "scholarship-match", placeholder: "" },
];

type MatchResult = { id: string; title: string; score: number; reason: string }[];

export default function AIToolsPage() {
  const [active, setActive] = useState(0);
  const [details, setDetails] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult | null>(null);
  const [copied, setCopied] = useState(false);

  const tool = tools[active];

  const switchTool = (i: number) => {
    setActive(i);
    setResult(null);
    setMatches(null);
    setError(null);
    setDetails("");
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    setMatches(null);
    try {
      const res = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: tool.key, details }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (tool.key === "scholarship-match") {
        setMatches(data.result ?? []);
      } else {
        setResult(data.result ?? "");
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
          <p className="text-[12px] font-medium text-violet-600 mb-1.5 flex items-center gap-1.5"><Sparkles size={13} /> AI CAREER TOOLS</p>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">Let AI handle the busywork</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Tool list */}
        <div className="space-y-2">
          {tools.map((t, i) => (
            <button key={t.title} onClick={() => switchTool(i)} className={`w-full flex items-start gap-3 text-left p-3.5 rounded-xl border transition-all ${active === i ? "border-violet-300 bg-violet-50/60" : "border-violet-100 bg-white hover:border-violet-200"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active === i ? "text-white" : "bg-violet-50 text-violet-600"}`} style={active === i ? { background: G } : {}}>
                <t.icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[13.5px]">{t.title}</p>
                <p className="text-[11.5px] text-slate-400 truncate">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Active tool panel */}
        <div className="bg-white border border-violet-100 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: G }}>
              {React.createElement(tool.icon, { size: 19 })}
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">{tool.title}</h2>
              <p className="text-[13px] text-slate-400">{tool.desc}</p>
            </div>
          </div>

          {tool.placeholder && !generating && !result && !matches && (
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={tool.placeholder}
              rows={3}
              className="w-full resize-none rounded-xl border border-violet-100 px-3.5 py-3 text-[13.5px] outline-none focus:border-violet-300 mb-4 placeholder:text-slate-400"
            />
          )}

          {error && (
            <div className="flex items-start gap-2 text-[13px] text-red-600 bg-red-50 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {generating ? (
            <div className="space-y-2.5">
              <div className="h-3.5 rounded skeleton w-full" />
              <div className="h-3.5 rounded skeleton w-[92%]" />
              <div className="h-3.5 rounded skeleton w-[85%]" />
              <div className="h-3.5 rounded skeleton w-[60%]" />
              <p className="text-[12px] text-violet-500 flex items-center gap-1.5 mt-4"><RotateCw size={12} className="animate-spin" /> Generating with AI...</p>
            </div>
          ) : matches ? (
            <div className="space-y-3">
              {matches.length === 0 && <p className="text-[13px] text-slate-400">No published scholarships to match against yet.</p>}
              {matches.map((m) => (
                <div key={m.id} className="rounded-xl bg-violet-50/60 p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-[13.5px] truncate pr-3">{m.title}</p>
                    <span className="font-mono font-semibold text-[#4F46E5] flex-shrink-0">{m.score}%</span>
                  </div>
                  <p className="text-[12px] text-slate-500">{m.reason}</p>
                </div>
              ))}
              <button onClick={generate} className="text-[12.5px] font-medium text-violet-500 hover:text-violet-700 transition-colors">Re-check matches</button>
            </div>
          ) : result ? (
            <div>
              <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed whitespace-pre-wrap text-slate-700 bg-violet-50/40 rounded-xl p-4 mb-4">{result}</div>
              <div className="flex items-center gap-3">
                <button onClick={copyResult} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600 border border-slate-200 rounded-full px-4 py-2 hover:border-violet-300 transition-colors">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={generate} className="text-[12.5px] font-medium text-violet-500 hover:text-violet-700 transition-colors">Regenerate</button>
              </div>
            </div>
          ) : (
            <button onClick={generate} className="flex items-center gap-2 text-white font-medium text-[14px] rounded-full px-5 py-3" style={{ background: G }}>
              <Sparkles size={15} /> {tool.cta} <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
