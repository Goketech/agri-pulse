import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AgriPulse Hub",
  description: "Bridging the Agri-Tech gap for youth in Nigeria and Rwanda",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-brand-400">
                AgriPulse Hub
              </h1>
              <p className="text-sm text-slate-400">
                Youth-focused Agri-Tech for Nigeria and Rwanda
              </p>
            </div>
            <nav className="flex gap-3 text-sm text-slate-300">
              <a href="/dashboard" className="hover:text-brand-300">
                Dashboard
              </a>
              <a href="/mentorship" className="hover:text-brand-300">
                Mentorship
              </a>
              <a href="/marketplace" className="hover:text-brand-300">
                Marketplace
              </a>
              <a href="/analytics" className="hover:text-brand-300">
                Analytics
              </a>
              <a href="/learning" className="hover:text-brand-300">
                Learning
              </a>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

