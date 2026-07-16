"use client";

import React, { useState } from "react";
import { Send, Bell, Loader2 } from "lucide-react";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";
const CHANNELS = ["IN_APP", "EMAIL", "SMS", "PUSH"];

export default function AdminNotificationsPage() {
  const [form, setForm] = useState({ title: "", body: "", channel: "IN_APP" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult("");
    setError("");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send.");
      setResult(`Sent to ${data.sent} students.`);
      setForm({ title: "", body: "", channel: "IN_APP" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-semibold text-2xl mb-1">Notifications</h1>
      <p className="text-slate-400 text-[13.5px] mb-6">Broadcast a message to all students.</p>

      <form onSubmit={submit} className="bg-white border border-violet-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2.5 mb-1 text-[13px] font-medium text-slate-600"><Bell size={15} className="text-violet-600" /> New broadcast</div>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400" />
        <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message" rows={4} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400 resize-none" />
        <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none">
          {CHANNELS.map((c) => <option key={c} value={c}>{c.replace("_", "-")}</option>)}
        </select>

        {result && <p className="text-[12.5px] text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{result}</p>}
        {error && <p className="text-[12.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button disabled={sending} type="submit" className="w-full flex items-center justify-center gap-2 text-white font-medium text-[14px] rounded-full py-3 disabled:opacity-60" style={{ background: G }}>
          {sending ? <Loader2 size={15} className="animate-spin" /> : <>Send to all students <Send size={14} /></>}
        </button>
      </form>
    </div>
  );
}
