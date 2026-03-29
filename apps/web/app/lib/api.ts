const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
let pendingRequests = 0;

function emitApiActivity() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("agripulse:api-activity", { detail: { pendingRequests } }),
  );
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("agripulse_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  pendingRequests += 1;
  emitApiActivity();
  try {
    return await fetch(`${API_URL}${path}`, { ...options, headers });
  } finally {
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitApiActivity();
  }
}
