"use client";

import React, { useEffect, useState } from "react";
import {
  Users, GraduationCap, Briefcase, Trophy, IndianRupee, ShieldAlert, Landmark
} from "lucide-react";

type Overview = {
  studentCount: number;
  scholarshipCount: number;
  jobCount: number;
  activeTests: number;
  totalRevenue: number;
  pendingFraudFlags: number;
  scholarshipPoolTotal: number;
};

const G = "linear-gradient(135deg,#4F46E5,#7C3AED)";

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-white border border-violet-100 p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="font-mono text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[12px] text-slate-500">{label}</div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-semibold text-2xl mb-1">Overview</h1>
      <p className="text-slate-400 text-[13.5px] mb-6">Live snapshot of the whole platform.</p>

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 max-w-md">
          {error} — this happens when there's no database connected yet. Set{" "}
          <code className="font-mono">DATABASE_URL</code> in <code className="font-mono">.env.local</code> and run{" "}
          <code className="font-mono">npx prisma migrate dev</code>.
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total students" value={data.studentCount.toLocaleString("en-IN")} accent="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]" />
          <StatCard icon={GraduationCap} label="Live scholarships" value={data.scholarshipCount.toLocaleString("en-IN")} accent="bg-gradient-to-br from-[#7C3AED] to-[#2563EB]" />
          <StatCard icon={Briefcase} label="Live jobs" value={data.jobCount.toLocaleString("en-IN")} accent="bg-gradient-to-br from-[#2563EB] to-[#4F46E5]" />
          <StatCard icon={Trophy} label="Active weekly tests" value={String(data.activeTests)} accent="bg-gradient-to-br from-[#4F46E5] to-[#2563EB]" />
          <StatCard icon={IndianRupee} label="Total revenue" value={`₹${data.totalRevenue.toLocaleString("en-IN")}`} accent="bg-gradient-to-br from-amber-400 to-amber-600" />
          <StatCard icon={Landmark} label="Scholarship pool (all-time)" value={`₹${data.scholarshipPoolTotal.toLocaleString("en-IN")}`} accent="bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]" />
          <StatCard icon={ShieldAlert} label="Unresolved fraud flags" value={String(data.pendingFraudFlags)} accent="bg-gradient-to-br from-red-400 to-red-600" />
        </div>
      )}
    </div>
  );
}
