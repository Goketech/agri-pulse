"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { apiFetch } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mfaToken) {
        const res = await apiFetch("/auth/mfa/validate", {
          method: "POST",
          body: JSON.stringify({ mfaToken, code: mfaCode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "MFA validation failed");
        } else {
          login(data.token);
          router.push("/dashboard");
        }
      } else {
        const res = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Login failed");
        } else if (data.mfaRequired) {
          setMfaToken(data.mfaToken);
        } else {
          login(data.token);
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-lg font-semibold text-slate-50">Login</h2>
      <p className="mt-1 text-sm text-slate-400">
        Access your AgriPulse Hub dashboard.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {!mfaToken ? (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300">Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                required
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div>
            <p className="mb-2 text-sm text-brand-300">
              Enter the 6-digit code from your authenticator app.
            </p>
            <label className="block text-xs font-medium text-slate-300">TOTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 tracking-widest focus:border-brand-400 focus:outline-none"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        )}
        {error && (
          <p className="text-xs text-red-400" role="alert">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60"
        >
          {loading ? "Logging in..." : mfaToken ? "Verify" : "Login"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="text-brand-400 hover:text-brand-300">
          Register
        </Link>
      </p>
    </div>
  );
}
