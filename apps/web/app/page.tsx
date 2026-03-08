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
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-900/40 p-6">
        <h2 className="text-xl font-semibold text-brand-100">
          Agriculture, Upgraded for the Youth
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          AgriPulse Hub connects aspiring agripreneurs in Nigeria and Rwanda
          with mentorship, resources, and real-time crop intelligence—turning
          agriculture into a modern, tech-driven profession.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/auth/register"
            className="rounded-full bg-brand-500 px-4 py-2 font-medium text-slate-950 hover:bg-brand-400"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 hover:border-brand-400 hover:text-brand-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Core Modules
        </h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-brand-400 hover:bg-slate-900"
            >
              <h4 className="text-base font-semibold text-slate-50">
                {card.title}
              </h4>
              <p className="mt-1 text-sm text-slate-300">{card.description}</p>
              <span className="mt-3 inline-flex text-xs font-medium text-brand-300 group-hover:text-brand-200">
                Open module →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

