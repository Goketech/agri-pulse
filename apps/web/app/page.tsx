"use client";

import Link from "next/link";

const cards = [
  {
    title: "AI Mentorship",
    description:
      "Ask farming questions 24/7 and get guidance from AI and human mentors.",
    href: "/mentorship",
  },
  {
    title: "P2P Marketplace",
    description:
      "Rent or sell equipment and inputs with distance-based search.",
    href: "/marketplace",
  },
  {
    title: "Crop Analytics",
    description:
      "Track soil health, yields, and prices in Lagos and Kigali in real time.",
    href: "/analytics",
  },
  {
    title: "Agri-Learning",
    description:
      "Complete practical, tech-focused modules and earn badges as you go.",
    href: "/learning",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-brand-50/50 to-emerald-100/60 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-900/30">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-40 w-40 rounded-full bg-emerald-400/25 blur-3xl" />
        <p className="inline-flex rounded-full border border-brand-300/50 bg-brand-100/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
          Agri-tech for youth impact
        </p>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-brand-100">
          Agriculture, Upgraded for the Next Generation
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          AgriPulse Hub connects aspiring agripreneurs in Nigeria and Rwanda
          with mentorship, resources, and real-time crop intelligence—turning
          agriculture into a modern, tech-driven profession.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/auth/register"
            className="rounded-full bg-brand-500 px-5 py-2 font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-400"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-300 px-5 py-2 font-medium text-slate-700 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:text-brand-200"
          >
            Go to Dashboard
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          {["Mentorship", "Marketplace", "Analytics", "Learning"].map((chip) => (
            <span key={chip} className="rounded-full bg-white/80 px-3 py-1 font-medium text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-300">
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Core Modules
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
            >
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {card.title}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{card.description}</p>
              <span className="mt-4 inline-flex text-xs font-semibold text-brand-600 group-hover:text-brand-500 dark:text-brand-300 dark:group-hover:text-brand-200">
                Open module →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

