"use client";

export default function LoadingSpinner({
  size = "md",
  label,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const sizeClass =
    size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-10 w-10 border-[3px]" : "h-6 w-6 border-2";

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-block animate-spin rounded-full border-brand-500 border-t-transparent ${sizeClass}`}
        aria-hidden="true"
      />
      {label && <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>}
    </div>
  );
}
