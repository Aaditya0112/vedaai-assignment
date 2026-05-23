import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "VedaAI – AI Assessment Creator",
  description: "Create intelligent, curriculum-aligned exam papers in seconds",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 2000,        // ← 2 seconds for all toasts
            success: { duration: 2000 },
            error: { duration: 2000 },
            loading: { duration: 2000 }, // loading stays until dismissed manually
            style: {
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            },
          }}
        />

      </body>
    </html>
  );
}
