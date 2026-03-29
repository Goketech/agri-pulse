"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth-context";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface SessionPreview {
  id: string;
  preview: string;
  messageCount: number;
  createdAt: string;
}

interface MentorResult {
  id: string;
  name: string;
  email: string;
  region: string;
  expertise: string;
  cropValueChain: string;
  yearsOfExperience: number;
  assignedCount: number;
}

export default function MentorshipPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<"chat" | "sessions" | "match">("chat");
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ChatMsg[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionPreview[]>([]);
  const [mentors, setMentors] = useState<MentorResult[]>([]);
  const [cropFilter, setCropFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const userMsg = message.trim();
    setMessage("");
    setConversation((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const res = await apiFetch("/mentorship/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionId(data.sessionId);
        setConversation(data.conversation);
      }
    } catch {
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get response. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await apiFetch("/mentorship/sessions");
      const data = await res.json();
      if (res.ok) setSessions(data.sessions);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  async function loadSession(id: string) {
    try {
      const res = await apiFetch(`/mentorship/sessions/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSessionId(data.id);
        setConversation(data.conversation);
        setTab("chat");
      }
    } catch { /* ignore */ }
  }

  async function findMentors() {
    setLoading(true);
    try {
      const res = await apiFetch("/mentorship/match", {
        method: "POST",
        body: JSON.stringify({ cropInterest: cropFilter }),
      });
      const data = await res.json();
      if (res.ok) setMentors(data.mentors);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  function newSession() {
    setSessionId(null);
    setConversation([]);
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-lg font-semibold">AI Mentorship</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please log in to access AI mentorship and mentor matching.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["chat", "sessions", "match"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "sessions") loadSessions();
              if (t === "match") findMentors();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-brand-500 text-slate-950"
                : "border border-slate-300 text-slate-700 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300"
            }`}
          >
            {t === "chat" ? "AI Chat" : t === "sessions" ? "Past Sessions" : "Find a Mentor"}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {sessionId ? "Conversation" : "New Conversation"}
            </h2>
            {sessionId && (
              <button onClick={newSession} className="text-xs font-medium text-brand-500 hover:text-brand-400 dark:text-brand-400 dark:hover:text-brand-300">
                + New
              </button>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "28rem" }}>
            {conversation.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Ask me anything about farming</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                  Crop management, soil health, market prices, business planning...
                </p>
                <div className="mx-auto mt-4 flex max-w-sm flex-wrap justify-center gap-2">
                  {["How do I improve cassava yield?", "Best crops for sandy soil?", "Market prices in Lagos"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setMessage(q)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-brand-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {conversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-brand-500/15 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">Thinking...</div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
            <input
              type="text"
              placeholder="Type your farming question..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400 disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {tab === "sessions" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Past Sessions</h2>
          {loading ? (
            <LoadingSpinner label="Loading sessions..." />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No past sessions yet. Start a new conversation!</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-brand-400 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <p className="text-sm text-slate-700 line-clamp-1 dark:text-slate-200">{s.preview || "Empty session"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.messageCount} messages · {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "match" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Find a Mentor</h2>
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Filter by crop (e.g. cassava, maize)"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
            />
            <button
              onClick={findMentors}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400"
            >
              Search
            </button>
          </div>
          {loading ? (
            <LoadingSpinner label="Searching mentors..." />
          ) : mentors.length === 0 ? (
            <p className="text-sm text-slate-500">No mentors found. Try a different crop filter.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {mentors.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.expertise && (
                      <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-300">
                        {m.expertise}
                      </span>
                    )}
                    {m.cropValueChain && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {m.cropValueChain}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {m.region === "NG" ? "Nigeria" : "Rwanda"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {m.yearsOfExperience ?? 0} yrs exp · {m.assignedCount} mentees
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
