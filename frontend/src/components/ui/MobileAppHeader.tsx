"use client";

import AppLogo from "@/components/ui/AppLogo";
import { Menu } from "lucide-react";

export default function MobileAppHeader() {
  return (
    <div
      className="mobile-app-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 66,
        padding: "10px 16px",
        display: "none",
        alignItems: "center",
        gap: 12,
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        zIndex: 60,
      }}
    >
      <AppLogo href="/" size={30} textSize={20} />
      <button
        type="button"
        className="mobile-drawer-trigger"
        onClick={() => window.dispatchEvent(new Event("vedaai-open-sidebar"))}
        style={{
          marginLeft: "auto",
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "#fff",
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--ink)",
        }}
        aria-label="Open navigation menu"
      >
        <Menu size={18} />
      </button>
    </div>
  );
}