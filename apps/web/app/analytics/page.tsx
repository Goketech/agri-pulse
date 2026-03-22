"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { apiFetch } from "../lib/api";

interface AnalyticsEntry {
  id: string;
  cropType: string;
  soilHealthIndex: number | null;
  historicalYield: number | null;
  currentMarketPrice: number | null;
  region: string;
  createdAt: string;
}

interface Alert {
  id: string;
  cropType: string;
  region: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
}

interface CropSummary {
  cropType: string;
  avgSoilHealth: number;
  avgYield: number;
  latestPrice: number;
  entries: number;
}

export default function AnalyticsPage() {
  const { isAuthenticated, user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summaries, setSummaries] = useState<CropSummary[]>([]);
  const [region, setRegion] = useState("NG");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    cropType: "",
    soilHealthIndex: "",
    historicalYield: "",
    currentMarketPrice: "",
    alertThreshold: "5",
  });
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [analyticsRes, alertsRes, summaryRes] = await Promise.all([
        apiFetch(`/analytics?region=${region}`),
        apiFetch("/analytics/alerts"),
        apiFetch(`/analytics/summary?region=${region}`),
      ]);

      const [aData, alData, sData] = await Promise.all([
        analyticsRes.json(),
        alertsRes.json(),
        summaryRes.json(),
      ]);

      if (analyticsRes.ok) setAnalytics(aData.analytics);
      if (alertsRes.ok) setAlerts(alData.alerts);
      if (summaryRes.ok) setSummaries(sData.summaries);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, region]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await apiFetch("/analytics", {
        method: "POST",
        body: JSON.stringify({
          cropType: form.cropType,
          soilHealthIndex: form.soilHealthIndex ? parseFloat(form.soilHealthIndex) : undefined,
          historicalYield: form.historicalYield ? parseFloat(form.historicalYield) : undefined,
          currentMarketPrice: form.currentMarketPrice ? parseFloat(form.currentMarketPrice) : undefined,
          alertThreshold: form.alertThreshold ? parseFloat(form.alertThreshold) : undefined,
          region,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Failed to add data");
      } else {
        setShowForm(false);
        setForm({ cropType: "", soilHealthIndex: "", historicalYield: "", currentMarketPrice: "", alertThreshold: "5" });
        fetchData();
      }
    } catch {
      setFormError("Network error");
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <h2 className="text-lg font-semibold">Crop Analytics</h2>
        <p className="mt-2 text-sm text-slate-400">Please log in to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-50">Crop Analytics</h2>
        <div className="flex gap-2">
          {[
            { code: "NG", label: "Lagos, Nigeria" },
            { code: "RW", label: "Kigali, Rwanda" },
          ].map((r) => (
            <button
              key={r.code}
              onClick={() => setRegion(r.code)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                region === r.code
                  ? "bg-brand-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:border-brand-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400"
        >
          {showForm ? "Cancel" : "+ Add Data"}
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Price Alerts</h3>
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg border px-4 py-3 ${
                a.changePercent > 0
                  ? "border-brand-500/30 bg-brand-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200">{a.cropType}</span>
                <span
                  className={`text-sm font-semibold ${
                    a.changePercent > 0 ? "text-brand-400" : "text-red-400"
                  }`}
                >
                  {a.changePercent > 0 ? "+" : ""}
                  {a.changePercent}%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {a.previousPrice.toLocaleString()} → {a.currentPrice.toLocaleString()} ({a.region === "NG" ? "NGN" : "RWF"})
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300">Crop type</label>
              <input
                type="text"
                required
                placeholder="e.g. cassava, maize"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={form.cropType}
                onChange={(e) => setForm({ ...form, cropType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Soil health index (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={form.soilHealthIndex}
                onChange={(e) => setForm({ ...form, soilHealthIndex: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Historical yield (tons/ha)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={form.historicalYield}
                onChange={(e) => setForm({ ...form, historicalYield: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Current market price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={form.currentMarketPrice}
                onChange={(e) => setForm({ ...form, currentMarketPrice: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Alert threshold (%)</label>
            <input
              type="number"
              min="1"
              className="mt-1 w-32 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
              value={form.alertThreshold}
              onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
            />
          </div>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400">
            Submit
          </button>
        </form>
      )}

      {summaries.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-300">
            Crop Summary — {region === "NG" ? "Lagos, Nigeria" : "Kigali, Rwanda"}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {summaries.map((s) => (
              <div key={s.cropType} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <h4 className="font-medium text-slate-100 capitalize">{s.cropType}</h4>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Soil Health</span>
                    <span className="text-slate-200">{s.avgSoilHealth}</span>
                  </div>
                  <div className="w-full rounded-full bg-slate-800 h-1.5">
                    <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${s.avgSoilHealth}%` }} />
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Avg Yield</span>
                    <span className="text-slate-200">{s.avgYield} t/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latest Price</span>
                    <span className="text-brand-300">
                      {region === "NG" ? "NGN" : "RWF"} {s.latestPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data Points</span>
                    <span className="text-slate-200">{s.entries}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Recent Entries</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr className="text-xs text-slate-400">
                  <th className="px-4 py-2 text-left">Crop</th>
                  <th className="px-4 py-2 text-right">Soil Health</th>
                  <th className="px-4 py-2 text-right">Yield</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.slice(0, 20).map((a) => (
                  <tr key={a.id} className="border-t border-slate-800/50">
                    <td className="px-4 py-2 capitalize text-slate-200">{a.cropType}</td>
                    <td className="px-4 py-2 text-right text-slate-300">{a.soilHealthIndex ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-slate-300">{a.historicalYield ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-brand-300">
                      {a.currentMarketPrice?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && analytics.length === 0 && summaries.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <p className="text-sm text-slate-500">No analytics data yet. Add your first crop data entry above.</p>
        </div>
      )}
    </div>
  );
}
