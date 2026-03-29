"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { apiFetch } from "../lib/api";

interface NotificationItem {
  id: string;
  type: string;
  content: string;
  channel: string;
  read: boolean;
  sentAt: string;
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    apiFetch("/notifications?unreadOnly=true")
      .then((r) => r.json())
      .then((d) => { if (d.notifications) setNotifications(d.notifications.slice(0, 5)); })
      .catch(() => {});

    apiFetch("/learning/enrollments")
      .then((r) => r.json())
      .then((d) => { if (d.enrollments) setEnrollmentCount(d.enrollments.length); })
      .catch(() => {});

    apiFetch("/learning/badges")
      .then((r) => r.json())
      .then((d) => { if (d.badges) setBadgeCount(d.badges.length); })
      .catch(() => {});
  }, [isAuthenticated]);

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const modules = [
    {
      title: "AI Mentorship",
      description: "Ask questions, review past sessions, and connect with mentors.",
      href: "/mentorship",
      stat: "24/7 AI + human mentors",
    },
    {
      title: "P2P Marketplace",
      description: "Browse verified equipment listings filtered by distance from you.",
      href: "/marketplace",
      stat: "Rent or sell equipment",
    },
    {
      title: "Crop Analytics",
      description: "Monitor soil health, yields, and prices for your region.",
      href: "/analytics",
      stat: "Lagos & Kigali data",
    },
    {
      title: "Agri-Learning",
      description: "Complete modules, track progress, and earn badges.",
      href: "/learning",
      stat: `${enrollmentCount} enrolled · ${badgeCount} badges`,
    },
  ];

  return (
    <div className="space-y-6">
      {isAuthenticated && (
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-brand-50/60 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-emerald-900/20">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back, {user?.name?.split(" ")[0]}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {user?.region === "NG" ? "Nigeria" : "Rwanda"} · {user?.role}
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/auth/mfa"
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-brand-300"
            >
              Security Settings
            </Link>
          </div>
        </section>
      )}

      {notifications.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Notifications
          </h3>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{n.content}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">
                    {n.type} · {n.channel} · {new Date(n.sentAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => markRead(n.id)}
                  className="text-xs font-medium text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {modules.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 group-hover:text-brand-600 dark:text-slate-400 dark:group-hover:text-brand-300">
              {card.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{card.description}</p>
            <p className="mt-2 text-xs text-slate-500">{card.stat}</p>
            <span className="mt-4 inline-flex text-xs font-semibold text-brand-600 group-hover:text-brand-500 dark:text-brand-300 dark:group-hover:text-brand-200">
              Open →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
