"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { apiFetch } from "../../lib/api";

export default function MfaSetupPage() {
  const { isAuthenticated } = useAuth();
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/auth/mfa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Setup failed");
      } else {
        setOtpauthUrl(data.otpauthUrl);
        setSecret(data.secret);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
        <p className="text-slate-400">Please log in to set up MFA.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-lg font-semibold text-slate-50">Two-Factor Authentication</h2>
      <p className="mt-1 text-sm text-slate-400">
        Secure your account with TOTP-based multi-factor authentication.
      </p>

      {success ? (
        <div className="mt-4 rounded-lg border border-brand-500/30 bg-brand-500/10 p-4">
          <p className="text-sm font-medium text-brand-300">MFA enabled successfully!</p>
          <p className="mt-1 text-xs text-slate-400">
            You will need your authenticator app code on your next login.
          </p>
        </div>
      ) : !otpauthUrl ? (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="mt-4 w-full rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60"
        >
          {loading ? "Setting up..." : "Set up MFA"}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
            <p className="text-xs font-medium text-slate-300">
              Scan the QR code or enter this secret in your authenticator app:
            </p>
            <div className="mt-2 flex items-center justify-center rounded bg-white p-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`}
                alt="MFA QR Code"
                className="h-48 w-48"
              />
            </div>
            <p className="mt-2 break-all rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center font-mono text-xs text-brand-300">
              {secret}
            </p>
          </div>

          <form onSubmit={handleEnable} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Enter 6-digit code to verify
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 tracking-widest focus:border-brand-400 focus:outline-none"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Enable MFA"}
            </button>
          </form>
        </div>
      )}

      {error && !otpauthUrl && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
