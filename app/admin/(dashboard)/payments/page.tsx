"use client";

import React, { useEffect, useState } from "react";
import { IndianRupee, CreditCard } from "lucide-react";

type Payment = { id: string; amount: number; provider: string; status: string; planName: string; createdAt: string };

const statusColor: Record<string, string> = {
  SUCCESS: "#12B76A",
  PENDING: "#F0A93A",
  FAILED: "#EF4444",
  REFUNDED: "#94A3B8",
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [successfulCount, setSuccessfulCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load payments — is the database connected?");
        return r.json();
      })
      .then((d) => {
        setPayments(d.payments);
        setTotalRevenue(d.totalRevenue);
        setSuccessfulCount(d.successfulCount);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-semibold text-2xl mb-1">Payments</h1>
      <p className="text-slate-400 text-[13.5px] mb-5">Razorpay / UPI / card / net-banking transactions.</p>

      {error && <div className="rounded-xl bg-red-50 text-red-500 text-[13px] px-4 py-3 mb-4">{error}</div>}

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div className="rounded-2xl bg-white border border-violet-100 p-4">
          <div className="flex items-center gap-1.5 text-slate-400 text-[12px] mb-1"><IndianRupee size={13} /> Total revenue</div>
          <p className="font-mono font-semibold text-xl">₹{totalRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-2xl bg-white border border-violet-100 p-4">
          <div className="flex items-center gap-1.5 text-slate-400 text-[12px] mb-1"><CreditCard size={13} /> Successful payments</div>
          <p className="font-mono font-semibold text-xl">{successfulCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="bg-white border border-violet-100 rounded-2xl divide-y divide-violet-50">
          {payments.length === 0 && <p className="text-[13px] text-slate-400 px-4 py-6 text-center">No payments yet.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13.5px]">{p.planName}</p>
                <p className="text-[12px] text-slate-400">{p.provider} · {new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              <span className="font-mono font-semibold text-[13.5px]">₹{p.amount.toLocaleString("en-IN")}</span>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ color: statusColor[p.status], backgroundColor: statusColor[p.status] + "18" }}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
