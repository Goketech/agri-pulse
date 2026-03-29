"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";

export default function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="mb-6 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-4">
      <div>
        <Link href="/">
          <h1 className="text-2xl font-bold tracking-tight text-brand-600 dark:text-brand-400">AgriPulse Hub</h1>
        </Link>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Youth-focused Agri-Tech for Nigeria and Rwanda
        </p>
      </div>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <button
          onClick={toggleTheme}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium hover:border-brand-500 dark:border-slate-700"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <Link href="/dashboard" className="rounded-full px-3 py-1 hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-800 dark:hover:text-brand-300">
          Dashboard
        </Link>
        <Link href="/mentorship" className="rounded-full px-3 py-1 hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-800 dark:hover:text-brand-300">
          Mentorship
        </Link>
        <Link href="/marketplace" className="rounded-full px-3 py-1 hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-800 dark:hover:text-brand-300">
          Marketplace
        </Link>
        <Link href="/analytics" className="rounded-full px-3 py-1 hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-800 dark:hover:text-brand-300">
          Analytics
        </Link>
        <Link href="/learning" className="rounded-full px-3 py-1 hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-800 dark:hover:text-brand-300">
          Learning
        </Link>
        {isAuthenticated ? (
          <>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {user?.name?.split(" ")[0]}
            </span>
            <button
              onClick={logout}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-red-500 hover:text-red-500 dark:border-slate-700 dark:hover:text-red-400"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-brand-400"
          >
            Login
          </Link>
        )}
      </nav>
      </div>
    </header>
  );
}
