"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, Loader2 } from "lucide-react";

const severityColor: Record<string, string> = { HIGH: "#EF4444", MEDIUM: "#F0A93A", LOW: "#94A3B8" };

type Flag = { id: string; entityType: string; entityId: string; reason: string; severity: string; resolved: boolean; createdAt: string };

export default function AdminFraudDetectionPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/fraud-flags?resolved=false")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load fraud flags — is the database connected?");
        return r.json();
      })
      .then((d) => setFlags(d.flags))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const runScan = async () => {
    setScanning(true);
    try {
      await fetch("/api/fraud-flags", { method: "POST" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-semibold text-2xl mb-1">Fraud Detection</h1>
          <p className="text-slate-400 text-[13.5px]">Automated flags on suspicious test attempts.</p>
        </div>
        <button onClick={runScan} disabled={scanning} className="flex items-center gap-1.5 text-white text-[13px] font-medium rounded-full px-4 py-2.5 disabled:opacity-60" style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Run scan
        </button>
      </div>

      <p className="text-[12px] text-slate-400 mb-5 max-w-xl">
        The scan flags device fingerprints shared across multiple student accounts, and test
        submissions completed implausibly fast relative to the test duration. Extend the
        heuristics in <code className="font-mono">app/api/fraud-flags/route.ts</code> as needed.
      </p>

      {error && <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
          {flags.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No unresolved flags. Run a scan after test attempts come in.</p>}
          {flags.map((f) => (
            <div key={f.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><ShieldAlert size={15} className="text-red-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13.5px]">{f.entityType} · {f.entityId.slice(0, 8)}</p>
                <p className="text-[12.5px] text-slate-500">{f.reason}</p>
              </div>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0" style={{ color: severityColor[f.severity], backgroundColor: severityColor[f.severity] + "18" }}>{f.severity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
