"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";

interface Module {
  id: string;
  createdAt: string;
  title: string;
  content: string;
  cropValueChain: string;
  durationMinutes: number;
  difficultyLevel: string;
  badgeName: string | null;
  enrollmentCount: number;
  lessonCount: number;
  quizId: string | null;
  questionCount: number;
  passingScore: number | null;
}

interface Enrollment {
  id: string;
  moduleId: string;
  moduleTitle: string;
  cropValueChain: string;
  difficultyLevel: string;
  progressPercent: number;
  currentLesson: number;
  totalLessons: number;
  lastViewedAt: string | null;
  timeSpentMinutes: number;
  completed: boolean;
  completedAt: string | null;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  awardedAt: string;
}

interface Lesson {
  id: string;
  order: number;
  title: string;
  body: string;
  estimatedMinutes: number;
}

interface ModuleDetail extends Module {
  lessons: Lesson[];
  enrollment: Enrollment | null;
  quiz: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number;
    questionCount: number;
  } | null;
}

interface QuizQuestion {
  id: string;
  order: number;
  prompt: string;
  type: string;
  options: string[];
}

export default function LearningPage() {
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState<"modules" | "progress" | "badges">("modules");
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cropFilter, setCropFilter] = useState("");
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleModalLoading, setModuleModalLoading] = useState(false);
  const [moduleTab, setModuleTab] = useState<"overview" | "lessons" | "quiz">("overview");
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  async function fetchModules() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cropFilter) params.set("cropValueChain", cropFilter);
      const res = await apiFetch(`/learning/modules?${params}`);
      const data = await res.json();
      if (res.ok) setModules(data.modules);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchEnrollments() {
    setLoading(true);
    try {
      const res = await apiFetch("/learning/enrollments");
      const data = await res.json();
      if (res.ok) setEnrollments(data.enrollments);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchBadges() {
    setLoading(true);
    try {
      const res = await apiFetch("/learning/badges");
      const data = await res.json();
      if (res.ok) setBadges(data.badges);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === "modules") fetchModules();
    else if (tab === "progress") fetchEnrollments();
    else fetchBadges();
  }, [isAuthenticated, tab]);

  const difficultyColor: Record<string, string> = useMemo(
    () => ({
      beginner: "text-brand-500 bg-brand-100 dark:text-brand-300 dark:bg-brand-500/10",
      intermediate: "text-amber-700 bg-amber-100 dark:text-yellow-300 dark:bg-yellow-500/10",
      advanced: "text-rose-700 bg-rose-100 dark:text-red-300 dark:bg-red-500/10",
    }),
    [],
  );

  function closeModuleModal() {
    setModuleModalOpen(false);
    setModuleDetail(null);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizFeedback(null);
    setActiveLesson(0);
    setModuleTab("overview");
  }

  async function openModule(moduleId: string, preferredTab: "overview" | "lessons" | "quiz" = "overview") {
    setModuleModalOpen(true);
    setModuleModalLoading(true);
    setQuizFeedback(null);
    setQuizQuestions([]);
    setQuizAnswers({});
    setModuleTab(preferredTab);
    try {
      const res = await apiFetch(`/learning/modules/${moduleId}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load module");
        return;
      }
      const mod = modules.find((m) => m.id === moduleId);
      const composed: ModuleDetail = {
        id: data.id,
        createdAt: mod?.createdAt ?? new Date().toISOString(),
        title: data.title,
        content: data.content ?? "",
        cropValueChain: data.cropValueChain,
        durationMinutes: data.durationMinutes,
        difficultyLevel: data.difficultyLevel,
        badgeName: data.badgeName ?? null,
        enrollmentCount: data.enrollmentCount ?? 0,
        lessonCount: (data.lessons ?? []).length,
        quizId: data.quiz?.id ?? null,
        questionCount: data.quiz?.questionCount ?? 0,
        passingScore: data.quiz?.passingScore ?? null,
        lessons: data.lessons ?? [],
        enrollment: data.enrollment
          ? {
              ...data.enrollment,
              moduleId,
              moduleTitle: data.title,
              cropValueChain: data.cropValueChain,
              difficultyLevel: data.difficultyLevel,
            }
          : null,
        quiz: data.quiz
          ? {
              id: data.quiz.id,
              title: data.quiz.title,
              description: data.quiz.description ?? null,
              passingScore: data.quiz.passingScore,
              questionCount: data.quiz.questionCount ?? 0,
            }
          : null,
      };
      setModuleDetail(composed);
      setActiveLesson(Math.max((composed.enrollment?.currentLesson || 1) - 1, 0));
    } catch {
      alert("Network error while loading module");
    } finally {
      setModuleModalLoading(false);
    }
  }

  async function handleEnroll(moduleId: string) {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/learning/enroll/${moduleId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok && !String(data.error || "").toLowerCase().includes("already enrolled")) {
        alert(data.error || "Enrollment failed");
        return;
      }
      await Promise.all([fetchEnrollments(), fetchModules()]);
      await openModule(moduleId, "lessons");
    } catch {
      alert("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function markLessonProgress(nextLesson: number) {
    if (!moduleDetail?.enrollment) return;
    try {
      const res = await apiFetch(`/learning/enrollments/${moduleDetail.enrollment.id}/lesson`, {
        method: "PATCH",
        body: JSON.stringify({
          currentLesson: nextLesson + 1,
          timeSpentMinutes: moduleDetail.lessons[nextLesson]?.estimatedMinutes ?? 10,
        }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setModuleDetail((prev) => (prev ? { ...prev, enrollment: { ...prev.enrollment!, ...updated } } : prev));
      setEnrollments((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
    } catch {
      // ignore
    }
  }

  async function fetchQuiz() {
    if (!moduleDetail?.quiz || !moduleDetail.enrollment) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/learning/quizzes/${moduleDetail.quiz.id}`);
      const data = await res.json();
      if (!res.ok) {
        setQuizFeedback(data.error || "Unable to load quiz");
        return;
      }
      setQuizQuestions(data.questions || []);
      setQuizFeedback(null);
    } catch {
      setQuizFeedback("Network error loading quiz");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitQuiz() {
    if (!moduleDetail?.quiz || quizQuestions.length === 0) return;
    if (quizQuestions.some((q) => quizAnswers[q.id] === undefined)) {
      setQuizFeedback("Please answer every question before submitting.");
      return;
    }
    setActionLoading(true);
    try {
      const ordered = [...quizQuestions].sort((a, b) => a.order - b.order).map((q) => quizAnswers[q.id] ?? -1);
      const res = await apiFetch(`/learning/quizzes/${moduleDetail.quiz.id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answers: ordered }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuizFeedback(data.error || "Quiz submission failed.");
        return;
      }
      setQuizFeedback(
        data.result.passed
          ? `Passed with ${data.result.score}%. Great work!`
          : `Score ${data.result.score}%. You need at least ${data.result.passingScore}% to pass.`,
      );
      if (data.enrollment) {
        setModuleDetail((prev) => (prev ? { ...prev, enrollment: { ...prev.enrollment!, ...data.enrollment } } : prev));
        setEnrollments((prev) => prev.map((e) => (e.id === data.enrollment.id ? { ...e, ...data.enrollment } : e)));
      }
      await Promise.all([fetchEnrollments(), fetchBadges()]);
    } catch {
      setQuizFeedback("Network error submitting quiz.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-lg font-semibold">Agri-Learning</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please log in to access learning modules.</p>
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
                : "border border-slate-300 text-slate-700 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300"
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
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchModules()}
            />
            <button onClick={fetchModules} className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              Search
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading modules...</p>
          ) : modules.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-sm text-slate-500">
                {user?.role === "admin" ? "No modules created yet. Create one via the API." : "No modules available yet. Check back soon!"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openModule(m.id, "overview")}
                  className="flex flex-col items-stretch rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-500/60 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">{m.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyColor[m.difficultyLevel] || "text-slate-400"}`}>
                      {m.difficultyLevel}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{m.cropValueChain}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{m.durationMinutes} min</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-500">{m.lessonCount} lessons</span>
                  </div>
                  <span className="mt-3 inline-flex text-xs text-brand-400 dark:text-brand-300">Open module details</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "progress" && (
        <div>
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <LoadingSpinner label="Loading learning progress..." />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-sm text-slate-500">You haven&apos;t enrolled in any modules yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => (
                <button key={e.id} type="button" onClick={() => openModule(e.moduleId, e.completed ? "overview" : "lessons")} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-500/60 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">{e.moduleTitle}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{e.cropValueChain} · {e.difficultyLevel}</p>
                    </div>
                    <span className={`rounded-md px-3 py-1 text-xs ${e.completed ? "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border border-brand-500 text-brand-600 dark:text-brand-300"}`}>
                      {e.completed ? "Completed" : "Resume module"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Progress</span>
                      <span>{e.progressPercent}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${e.progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-500/30 bg-brand-100/60 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {e.progressPercent}%
                    </span>
                    <span className="capitalize">{e.cropValueChain} learning track</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">Lesson {Math.max(e.currentLesson, 1)} of {Math.max(e.totalLessons, 1)} • {e.timeSpentMinutes} mins tracked</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "badges" && (
        <div>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
          ) : badges.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-sm text-slate-500">No badges yet. Complete a module to earn your first badge!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {badges.map((b) => (
                <div key={b.id} className="rounded-xl border border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-white p-4 text-center dark:to-slate-900/70">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/20 text-2xl">
                    <span className="text-brand-400">&#9733;</span>
                  </div>
                  <h3 className="mt-2 font-medium text-brand-700 dark:text-brand-200">{b.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{b.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(moduleModalOpen || moduleModalLoading) && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close module details" onClick={closeModuleModal} className="absolute inset-0 bg-black/70" />
          <div className="absolute left-1/2 top-1/2 max-h-[90vh] w-[min(980px,95vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-800 bg-white dark:bg-slate-950">
            {moduleModalLoading || !moduleDetail ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading module...</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{moduleDetail.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{moduleDetail.cropValueChain} • {moduleDetail.lessonCount} lessons • {moduleDetail.durationMinutes} mins</p>
                  </div>
                  <button type="button" onClick={closeModuleModal} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-slate-500 dark:border-slate-700 dark:text-slate-400">Close</button>
                </div>

                <div className="border-b border-slate-200 px-4 pb-3 pt-2 dark:border-slate-800">
                  <div className="flex gap-2 text-xs">
                    {(["overview", "lessons", "quiz"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => { setModuleTab(t); if (t === "quiz") fetchQuiz(); }} className={`rounded-full px-3 py-1 ${moduleTab === t ? "bg-brand-500 text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {t === "overview" ? "Overview" : t === "lessons" ? "Lessons" : "Quiz"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[62vh] overflow-y-auto p-4">
                  {moduleTab === "overview" && (
                    <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                      <p>{moduleDetail.content}</p>
                      {!moduleDetail.enrollment ? (
                        <button type="button" disabled={actionLoading} onClick={() => handleEnroll(moduleDetail.id)} className="rounded-md bg-brand-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60">
                          Enroll in module
                        </button>
                      ) : (
                        <p className="text-xs text-brand-400">Enrolled • Progress {moduleDetail.enrollment.progressPercent}%</p>
                      )}
                    </div>
                  )}

                  {moduleTab === "lessons" && (
                    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                      <div className="space-y-2">
                        {moduleDetail.lessons.map((lesson, idx) => (
                          <button key={lesson.id} type="button" onClick={() => { setActiveLesson(idx); if (moduleDetail.enrollment) markLessonProgress(idx); }} className={`w-full rounded-md px-3 py-2 text-left text-xs ${activeLesson === idx ? "bg-brand-500 text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                            {lesson.order}. {lesson.title}
                          </button>
                        ))}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                        {moduleDetail.lessons[activeLesson] ? (
                          <>
                            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{moduleDetail.lessons[activeLesson].title}</h4>
                            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{moduleDetail.lessons[activeLesson].body}</p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">No lessons available yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {moduleTab === "quiz" && (
                    <div>
                      {!moduleDetail.enrollment ? (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-600 dark:text-slate-300">Enroll in this module to take the quiz and earn completion credit.</p>
                          <button type="button" disabled={actionLoading} onClick={() => handleEnroll(moduleDetail.id)} className="rounded-md bg-brand-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60">
                            Enroll in module
                          </button>
                        </div>
                      ) : quizQuestions.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-500">No quiz questions loaded yet.</p>
                          <button type="button" disabled={actionLoading} onClick={fetchQuiz} className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300">
                            Load quiz
                          </button>
                          {actionLoading && <LoadingSpinner size="sm" label="Preparing quiz..." />}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {quizQuestions.map((q, idx) => (
                            <div key={q.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{idx + 1}. {q.prompt}</p>
                              <div className="mt-2 space-y-2">
                                {q.options.map((opt, optIdx) => (
                                  <label key={optIdx} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <input type="radio" name={`q-${q.id}`} checked={quizAnswers[q.id] === optIdx} onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))} />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button type="button" disabled={actionLoading || moduleDetail.enrollment.completed} onClick={submitQuiz} className="rounded-md bg-brand-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60">
                            {moduleDetail.enrollment.completed ? "Module completed" : "Submit quiz"}
                          </button>
                        </div>
                      )}
                      {quizFeedback && <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{quizFeedback}</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
