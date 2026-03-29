"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function ApiActivityIndicator() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ pendingRequests: number }>;
      setActive((custom.detail?.pendingRequests || 0) > 0);
    };

    window.addEventListener("agripulse:api-activity", handler as EventListener);
    return () => window.removeEventListener("agripulse:api-activity", handler as EventListener);
  }, []);

  return (
    <>
      <div
        className={`pointer-events-none fixed left-0 top-0 z-[70] h-0.5 bg-brand-500 transition-all duration-300 ${
          active ? "w-full opacity-100" : "w-0 opacity-0"
        }`}
      />
      {active && (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <LoadingSpinner size="sm" label="Loading" />
        </div>
      )}
    </>
  );
}
