"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

const regions = [
  { value: "NG", label: "Nigeria" },
  { value: "RW", label: "Rwanda" },
];

const roles = [
  { value: "agripreneur", label: "Aspiring Agripreneur" },
  { value: "mentor", label: "Professional Mentor" },
  { value: "admin", label: "Administrator" },
];

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("NG");
  const [role, setRole] = useState("agripreneur");
  const [cropInterest, setCropInterest] = useState("");
  const [expertise, setExpertise] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          region,
          role,
          ...(role === "agripreneur" && { cropInterest }),
          ...(role === "mentor" && { expertise, cropValueChain: cropInterest }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Registration failed");
      } else {
        router.push("/auth/login?registered=true");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-lg font-semibold text-slate-50">Create an account</h2>
      <p className="mt-1 text-sm text-slate-400">
        Join the AgriPulse Hub community of youth agripreneurs.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300">Full name</label>
          <input
            type="text"
            required
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            minLength={6}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300">Region</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {regions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Role</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {role === "agripreneur" && (
          <div>
            <label className="block text-xs font-medium text-slate-300">Crop interest</label>
            <input
              type="text"
              placeholder="e.g. cassava, maize, coffee"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
              value={cropInterest}
              onChange={(e) => setCropInterest(e.target.value)}
            />
          </div>
        )}

        {role === "mentor" && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300">Expertise</label>
              <input
                type="text"
                placeholder="e.g. Soil science, Agribusiness"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Crop value chain</label>
              <input
                type="text"
                placeholder="e.g. cassava, rice"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={cropInterest}
                onChange={(e) => setCropInterest(e.target.value)}
              />
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-red-400" role="alert">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
          Login
        </Link>
      </p>
    </div>
  );
}
