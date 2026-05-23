"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X, Loader2 } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "error" | "loading";
  title: string;
  message: string;
}

// Global toast state — simple pub/sub without extra library
type Listener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
const listeners: Listener[] = [];

const notify = (listeners: Listener[], toasts: Toast[]) =>
  listeners.forEach((l) => l([...toasts]));

export const toast = {
  success: (title: string, message: string) => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, type: "success", title, message }];
    notify(listeners, toasts);
    setTimeout(() => toast.dismiss(id), 5000);
  },
  error: (title: string, message: string) => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, type: "error", title, message }];
    notify(listeners, toasts);
    setTimeout(() => toast.dismiss(id), 7000);
  },
  loading: (title: string, message: string): string => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, type: "loading", title, message }];
    notify(listeners, toasts);
    return id;
  },
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify(listeners, toasts);
  },
};

const ICONS = {
  success: <CheckCircle2 size={18} color="#2e7d32" />,
  error: <XCircle size={18} color="#c62828" />,
  loading: <Loader2 size={18} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />,
};

const COLORS = {
  success: { border: "#86efac", bg: "#f0fdf4", title: "#166534" },
  error: { border: "#fca5a5", bg: "#fff5f5", title: "#c62828" },
  loading: { border: "var(--border)", bg: "#fff", title: "var(--ink)" },
};

export function NotificationToastContainer() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => setActiveToasts(t);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  if (!activeToasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      zIndex: 9999, display: "flex", flexDirection: "column", gap: 10,
      maxWidth: 360,
    }}>
      {activeToasts.map((t) => {
        const color = COLORS[t.type];
        return (
          <div key={t.id} className="animate-fade-up" style={{
            background: color.bg,
            border: `1px solid ${color.border}`,
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "var(--shadow-lg)",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <div style={{ flexShrink: 0, marginTop: 1 }}>{ICONS[t.type]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: color.title, marginBottom: 2 }}>
                {t.title}
              </p>
              <p style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5 }}>
                {t.message}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0, color: "var(--slate-light)" }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}