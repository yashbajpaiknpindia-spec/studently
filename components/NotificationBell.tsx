"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

type Notification = { id: string; title: string; body: string; read: boolean; createdAt: string };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markOne = async (id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  };

  const markAll = async () => {
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-white border border-violet-100 flex items-center justify-center relative"
        aria-label="Notifications"
      >
        <Bell size={16} className="text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-violet-100 rounded-2xl shadow-[0_12px_40px_-12px_rgba(79,70,229,0.3)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-violet-50">
            <span className="font-medium text-[13.5px]">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-[11.5px] font-medium text-violet-500 hover:text-violet-700">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!loaded ? (
              <p className="text-[12.5px] text-slate-400 text-center py-8">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-[12.5px] text-slate-400 text-center py-8">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markOne(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-violet-50 last:border-0 transition-colors ${n.read ? "bg-white" : "bg-violet-50/50 hover:bg-violet-50"}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium text-[13px] truncate">{n.title}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10.5px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
