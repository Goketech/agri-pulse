import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-context";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ApiActivityIndicator from "./components/ApiActivityIndicator";

export const metadata = {
  title: "AgriPulse Hub",
  description: "Bridging the Agri-Tech gap for youth in Nigeria and Rwanda",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <ThemeProvider>
          <AuthProvider>
            <ApiActivityIndicator />
            <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
              <NavBar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
