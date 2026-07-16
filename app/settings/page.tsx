"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, GraduationCap, Building2, BookOpen, Save, Check, LogOut } from "lucide-react";
import BackBar from "@/components/BackBar";

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

type StudentProfile = {
  fullName: string;
  city: string | null;
  qualification: string | null;
  institution: string | null;
  branch: string | null;
  profileCompletion: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [contact, setContact] = useState<{ email: string | null; phone: string | null }>({ email: null, phone: null });
  const [form, setForm] = useState({ city: "", qualification: "", institution: "", branch: "" });

  useEffect(() => {
    fetch("/api/students/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.student) return;
        setStudent(d.student);
        setContact({ email: d.email, phone: d.phone });
        setForm({
          city: d.student.city ?? "",
          qualification: d.student.qualification ?? "",
          institution: d.student.institution ?? "",
          branch: d.student.branch ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/students/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setStudent((s) => (s ? { ...s, ...data.student } : s));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const Field = ({ icon: Icon, label, value, onChange, placeholder }: any) => (
    <div>
      <label className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 mb-1.5">
        <Icon size={13} /> {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-violet-100 px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-300 placeholder:text-slate-400"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-[#120F1F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display{font-family:'Space Grotesk',sans-serif}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .skeleton{background:linear-gradient(90deg,#f1eefc 25%,#e5e0fb 37%,#f1eefc 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
      `}</style>

      <BackBar label="Dashboard" fallbackHref="/dashboard" />

      <div className="bg-[#F8F7FD] border-b border-violet-100 px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-[12px] font-medium text-violet-600 mb-1.5">ACCOUNT</p>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">Settings & Profile</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-xl skeleton" />)}</div>
        ) : !student ? (
          <p className="text-[13.5px] text-slate-400 text-center py-10">Couldn't load your profile. Try refreshing the page.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white border border-violet-100 rounded-2xl p-5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl flex-shrink-0" style={{ background: G }}>
                {student.fullName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-[17px] truncate">{student.fullName}</p>
                <p className="text-[13px] text-slate-400">Profile {student.profileCompletion}% complete</p>
              </div>
            </div>

            <div className="bg-white border border-violet-100 rounded-2xl p-5 space-y-4">
              <h2 className="font-display font-semibold text-[15px]">Contact</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-[13.5px]">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={14} className="text-slate-400" /> {contact.email ?? "Not added"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={14} className="text-slate-400" /> {contact.phone ?? "Not added"}
                </div>
              </div>
              <p className="text-[11.5px] text-slate-400">Email and phone are tied to how you sign in and can't be changed here.</p>
            </div>

            <div className="bg-white border border-violet-100 rounded-2xl p-5 space-y-4">
              <h2 className="font-display font-semibold text-[15px]">Academic profile</h2>
              <Field icon={MapPin} label="City" value={form.city} onChange={(v: string) => setForm((f) => ({ ...f, city: v }))} placeholder="e.g. Kanpur" />
              <Field icon={GraduationCap} label="Qualification" value={form.qualification} onChange={(v: string) => setForm((f) => ({ ...f, qualification: v }))} placeholder="e.g. Undergraduate" />
              <Field icon={Building2} label="Institution" value={form.institution} onChange={(v: string) => setForm((f) => ({ ...f, institution: v }))} placeholder="e.g. IIT Kanpur" />
              <Field icon={BookOpen} label="Branch / stream" value={form.branch} onChange={(v: string) => setForm((f) => ({ ...f, branch: v }))} placeholder="e.g. Computer Science" />

              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 text-white font-medium text-[13.5px] rounded-full px-5 py-2.5 disabled:opacity-60"
                style={{ background: G }}
              >
                {saved ? <Check size={15} /> : <Save size={15} />} {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
              </button>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 text-[13.5px] font-medium text-red-500 border border-red-100 rounded-2xl py-3 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} /> Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
