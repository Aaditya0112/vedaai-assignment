"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  ClipboardList,
  Sparkles,
  BookOpen,
  Settings,
  GraduationCap,
  Plus,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/groups", label: "My Groups", icon: Users },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/toolkit", label: "AI Teacher's Toolkit", icon: Sparkles },
  { href: "/library", label: "My Library", icon: BookOpen },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #e8632a 0%, #f2845a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <GraduationCap size={18} color="#fff" />
          </div>
          <span style={{
            color: "#fff", fontFamily: "var(--font-display)",
            fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em",
          }}>
            VedaAI
          </span>
        </Link>
      </div>

      {/* Create Assignment CTA */}
      <div style={{ padding: "0 16px 20px" }}>
        <Link href="/create" style={{ textDecoration: "none" }}>
          <button className="btn-accent" style={{ width: "100%", justifyContent: "center", fontSize: 13, padding: "9px 16px" }}>
            <Plus size={16} />
            Create Assignment
          </button>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 16px 12px" }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`sidebar-link ${isActive ? "active" : ""}`}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "12px" }}>
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 12 }} />
        <Link href="/settings" className={`sidebar-link ${path === "/settings" ? "active" : ""}`}>
          <Settings size={16} />
          Settings
        </Link>

        {/* School info */}
        <div style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #4a5568, #2d3748)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>DPS</span>
          </div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 500 }}>
              Delhi Public School
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
              Bokaro Steel City
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
