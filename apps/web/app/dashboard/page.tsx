"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Mentorship
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Ask questions, review past sessions, and connect with mentors.
          </p>
          <Link
            href="/mentorship"
            className="mt-3 inline-flex text-xs font-medium text-brand-300 hover:text-brand-200"
          >
            Open AI Mentorship →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Marketplace
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Browse verified equipment listings filtered by distance from you.
          </p>
          <Link
            href="/marketplace"
            className="mt-3 inline-flex text-xs font-medium text-brand-300 hover:text-brand-200"
          >
            Open Marketplace →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Monitor soil health, yields, and prices for your region.
          </p>
          <Link
            href="/analytics"
            className="mt-3 inline-flex text-xs font-medium text-brand-300 hover:text-brand-200"
          >
            View Analytics →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Learning
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Complete modules, track progress, and earn badges.
          </p>
          <Link
            href="/learning"
            className="mt-3 inline-flex text-xs font-medium text-brand-300 hover:text-brand-200"
          >
            Open Learning →
          </Link>
        </div>
      </section>
    </div>
  );
}

