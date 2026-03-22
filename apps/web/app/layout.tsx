import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "./lib/auth-context";
import NavBar from "./components/NavBar";

export const metadata = {
  title: "AgriPulse Hub",
  description: "Bridging the Agri-Tech gap for youth in Nigeria and Rwanda",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <AuthProvider>
          <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
            <NavBar />
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
