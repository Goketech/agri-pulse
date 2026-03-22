"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export default function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <Link href="/">
          <h1 className="text-2xl font-bold text-brand-400">AgriPulse Hub</h1>
        </Link>
        <p className="text-sm text-slate-400">
          Youth-focused Agri-Tech for Nigeria and Rwanda
        </p>
      </div>
      <nav className="flex items-center gap-3 text-sm text-slate-300">
        <Link href="/dashboard" className="hover:text-brand-300">
          Dashboard
        </Link>
        <Link href="/mentorship" className="hover:text-brand-300">
          Mentorship
        </Link>
        <Link href="/marketplace" className="hover:text-brand-300">
          Marketplace
        </Link>
        <Link href="/analytics" className="hover:text-brand-300">
          Analytics
        </Link>
        <Link href="/learning" className="hover:text-brand-300">
          Learning
        </Link>
        {isAuthenticated ? (
          <>
            <span className="text-brand-300">{user?.name?.split(" ")[0]}</span>
            <button
              onClick={logout}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:border-red-500 hover:text-red-400"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-brand-400"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
