"use client";

export default function Footer() {
  return (
    <footer className="relative mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-brand-50 via-white to-emerald-50 px-4 py-4 text-xs text-slate-600 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 dark:text-slate-400">
      <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 animate-float text-lg opacity-70">
        🌸
      </div>
      <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 animate-float-delayed text-lg opacity-70">
        🌼
      </div>
      <div className="pointer-events-none absolute right-24 top-1/2 -translate-y-1/2 animate-float text-lg opacity-60">
        🌺
      </div>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-8">
        <p>
          © {new Date().getFullYear()} AgriPulse Hub — Growing youth-led agriculture with technology.
        </p>
        <p className="font-medium text-brand-700 dark:text-brand-300">Built for Nigeria & Rwanda</p>
      </div>
    </footer>
  );
}
