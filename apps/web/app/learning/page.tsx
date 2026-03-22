"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { apiFetch } from "../lib/api";

interface Module {
  id: string;
  title: string;
  cropValueChain: string;
  durationMinutes: number;
  difficultyLevel: string;
  badgeName: string | null;
  enrollmentCount: number;
}

interface Enrollment {
  id: string;
  moduleId: string;
  moduleTitle: string;
  cropValueChain: string;
  difficultyLevel: string;
  progressPercent: number;
  completed: boolean;
  completedAt: string | null;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  awardedAt: string;
}

export default function LearningPage() {
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState<"modules" | "progress" | "badges">("modules");
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);
  const [cropFilter, setCropFilter] = useState("");

  async function fetchModules() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cropFilter) params.set("cropValueChain", cropFilter);
      const res = await apiFetch(`/learning/modules?${params}`);
      const data = await res.json();
      if (res.ok) setModules(data.modules);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  async function fetchEnrollments() {
    setLoading(true);
    try {
      const res = await apiFetch("/learning/enrollments");
      const data = await res.json();
      if (res.ok) setEnrollments(data.enrollments);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  async function fetchBadges() {
    setLoading(true);
    try {
      const res = await apiFetch("/learning/badges");
      const data = await res.json();
      if (res.ok) setBadges(data.badges);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === "modules") fetchModules();
    else if (tab === "progress") fetchEnrollments();
    else fetchBadges();
  }, [isAuthenticated, tab]);

  async function handleEnroll(moduleId: string) {
    try {
      const res = await apiFetch(`/learning/enroll/${moduleId}`, { method: "POST" });
      if (res.ok) {
        setTab("progress");
        fetchEnrollments();
      } else {
        const data = await res.json();
        alert(data.error || "Enrollment failed");
      }
    } catch {
      alert("Network error");
    }
  }

  async function handleProgress(enrollmentId: string, current: number) {
    const next = Math.min(current + 25, 100);
    try {
      const res = await apiFetch(`/learning/progress/${enrollmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ progressPercent: next }),
      });
      if (res.ok) {
        fetchEnrollments();
        if (next >= 100) fetchBadges();
      }
    } catch { /* ignore */ }
  }

  const difficultyColor: Record<string, string> = {
    beginner: "text-brand-400 bg-brand-500/10",
    intermediate: "text-yellow-400 bg-yellow-500/10",
    advanced: "text-red-400 bg-red-500/10",
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <h2 className="text-lg font-semibold">Agri-Learning</h2>
        <p className="mt-2 text-sm text-slate-400">Please log in to access learning modules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["modules", "progress", "badges"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-brand-500 text-slate-950"
                : "border border-slate-700 text-slate-300 hover:border-brand-400"
            }`}
          >
            {t === "modules" ? "Browse Modules" : t === "progress" ? "My Progress" : "My Badges"}
          </button>
        ))}
      </div>

      {tab === "modules" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter by crop value chain..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchModules()}
            />
            <button onClick={fetchModules} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700">
              Search
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading modules...</p>
          ) : modules.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
              <p className="text-sm text-slate-500">
                {user?.role === "admin"
                  ? "No modules created yet. Create one via the API."
                  : "No modules available yet. Check back soon!"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-slate-100">{m.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        difficultyColor[m.difficultyLevel] || "text-slate-400"
                      }`}
                    >
                      {m.difficultyLevel}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {m.cropValueChain}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {m.durationMinutes} min
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                      {m.enrollmentCount} enrolled
                    </span>
                  </div>
                  {m.badgeName && (
                    <p className="mt-2 text-xs text-brand-300">Badge: {m.badgeName}</p>
                  )}
                  <button
                    onClick={() => handleEnroll(m.id)}
                    className="mt-3 rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-brand-400"
                  >
                    Enroll
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "progress" && (
        <div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : enrollments.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
              <p className="text-sm text-slate-500">You haven&apos;t enrolled in any modules yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => (
                <div key={e.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-100">{e.moduleTitle}</h3>
                      <p className="text-xs text-slate-400">
                        {e.cropValueChain} · {e.difficultyLevel}
                      </p>
                    </div>
                    {e.completed ? (
                      <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-300">
                        Completed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleProgress(e.id, e.progressPercent)}
                        className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-brand-400"
                      >
                        Continue (+25%)
                      </button>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Progress</span>
                      <span>{e.progressPercent}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          e.completed ? "bg-brand-400" : "bg-brand-500"
                        }`}
                        style={{ width: `${e.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  {e.completedAt && (
                    <p className="mt-2 text-[10px] text-slate-500">
                      Completed on {new Date(e.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "badges" && (
        <div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : badges.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
              <p className="text-sm text-slate-500">No badges yet. Complete a module to earn your first badge!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-slate-900/70 p-4 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/20 text-2xl">
                    <span className="text-brand-400">&#9733;</span>
                  </div>
                  <h3 className="mt-2 font-medium text-brand-200">{b.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{b.description}</p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    {new Date(b.awardedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
