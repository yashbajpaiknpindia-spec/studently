"use client";

import React, { useEffect, useState } from "react";
import { Plus, ListChecks, X, Loader2, ChevronRight, Clock, Trophy } from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";
// Weekly scholarship tests are school & college only for now. The other exam
// categories (BANKING/SSC/UPSC/JEE/NEET) still exist in the schema/DB for any
// legacy tests, but new tests can only be created for these two audiences —
// re-add categories here later if/when those tracks launch.
const CATEGORIES = ["SCHOOL", "COLLEGE"];

type Test = {
  id: string; title: string; category: string; weekNumber: number;
  startsAt: string; endsAt: string; durationMins: number; scholarshipPoolAmount: number;
  _count: { questions: number; attempts: number };
};

export default function AdminWeeklyScholarshipTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTestForm, setShowTestForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testForm, setTestForm] = useState({
    title: "", category: "SCHOOL", weekNumber: "", startsAt: "", endsAt: "",
    durationMins: "45", scholarshipPoolAmount: "",
  });

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [qForm, setQForm] = useState({ text: "", options: ["", "", "", ""], correctIndex: 0 });
  const [savingQ, setSavingQ] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/weekly-tests")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load tests — is the database connected?");
        return r.json();
      })
      .then((d) => setTests(d.tests))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/weekly-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testForm,
          weekNumber: Number(testForm.weekNumber),
          durationMins: Number(testForm.durationMins) || 45,
          scholarshipPoolAmount: Number(testForm.scholarshipPoolAmount) || 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create test.");
      setShowTestForm(false);
      setTestForm({ title: "", category: "SCHOOL", weekNumber: "", startsAt: "", endsAt: "", durationMins: "45", scholarshipPoolAmount: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTestId) return;
    setSavingQ(true);
    try {
      const res = await fetch(`/api/weekly-tests/${activeTestId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...qForm, options: qForm.options.filter(Boolean) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add question.");
      setQForm({ text: "", options: ["", "", "", ""], correctIndex: 0 });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingQ(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-semibold text-2xl mb-1">Weekly Scholarship Tests</h1>
          <p className="text-slate-400 text-[13.5px]">Create weekly tests for School and College students, add their questions, and set the timer and scholarship pool.</p>
        </div>
        <button onClick={() => setShowTestForm(true)} className="flex items-center gap-1.5 text-white text-[13px] font-medium rounded-full px-4 py-2.5" style={{ background: G }}>
          <Plus size={15} /> New weekly test
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
          {tests.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No weekly tests yet.</p>}
          {tests.map((t) => (
            <button key={t.id} onClick={() => setActiveTestId(activeTestId === t.id ? null : t.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-violet-50/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"><ListChecks size={15} className="text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[14px] truncate">{t.title}</p>
                <p className="text-[12px] text-slate-400 flex items-center gap-1 flex-wrap">
                  <span>{t.category} · Week {t.weekNumber} · {t._count.questions} questions · {t._count.attempts} attempts</span>
                  <span className="flex items-center gap-0.5 text-slate-500"><Clock size={11} /> {t.durationMins}m</span>
                  {t.scholarshipPoolAmount > 0 && (
                    <span className="flex items-center gap-0.5 text-violet-600 font-medium"><Trophy size={11} /> ₹{t.scholarshipPoolAmount.toLocaleString("en-IN")} pool</span>
                  )}
                </p>
              </div>
              <ChevronRight size={15} className={`text-slate-300 transition-transform ${activeTestId === t.id ? "rotate-90" : ""}`} />
            </button>
          ))}
        </div>
      )}

      {activeTestId && (
        <form onSubmit={submitQuestion} className="mt-4 bg-white border border-violet-100 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-[14px] mb-1">Add question</h3>
          <input required value={qForm.text} onChange={(e) => setQForm({ ...qForm, text: e.target.value })} placeholder="Question text" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
          {qForm.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={qForm.correctIndex === i} onChange={() => setQForm({ ...qForm, correctIndex: i })} />
              <input
                value={opt}
                onChange={(e) => {
                  const options = [...qForm.options];
                  options[i] = e.target.value;
                  setQForm({ ...qForm, options });
                }}
                placeholder={`Option ${i + 1}`}
                className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-[13.5px] outline-none focus:border-violet-400"
              />
            </div>
          ))}
          <p className="text-[11px] text-slate-400">Select the radio button next to the correct option.</p>
          <button disabled={savingQ} type="submit" className="flex items-center gap-2 text-white font-medium text-[13.5px] rounded-full px-4 py-2.5 disabled:opacity-60" style={{ background: G }}>
            {savingQ ? <Loader2 size={14} className="animate-spin" /> : "Add question"}
          </button>
        </form>
      )}

      {showTestForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowTestForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitTest} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[16px]">New weekly test</h2>
              <button type="button" onClick={() => setShowTestForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <input required value={testForm.title} onChange={(e) => setTestForm({ ...testForm, title: e.target.value })} placeholder="Title" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <select value={testForm.category} onChange={(e) => setTestForm({ ...testForm, category: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input required type="number" value={testForm.weekNumber} onChange={(e) => setTestForm({ ...testForm, weekNumber: e.target.value })} placeholder="Week number" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <label className="block text-[12px] text-slate-400">Starts at</label>
            <input required type="datetime-local" value={testForm.startsAt} onChange={(e) => setTestForm({ ...testForm, startsAt: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <label className="block text-[12px] text-slate-400">Ends at</label>
            <input required type="datetime-local" value={testForm.endsAt} onChange={(e) => setTestForm({ ...testForm, endsAt: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-slate-400 mb-1">Timer (minutes)</label>
                <input required type="number" min={1} value={testForm.durationMins} onChange={(e) => setTestForm({ ...testForm, durationMins: e.target.value })} placeholder="45" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-[12px] text-slate-400 mb-1">Scholarship pool (₹)</label>
                <input type="number" min={0} value={testForm.scholarshipPoolAmount} onChange={(e) => setTestForm({ ...testForm, scholarshipPoolAmount: e.target.value })} placeholder="0" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-1">The timer is how long students get to complete the quiz once they start — it counts down live on the test page.</p>
            <button disabled={saving} type="submit" className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3 mt-2 disabled:opacity-60" style={{ background: G }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : "Create test"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
