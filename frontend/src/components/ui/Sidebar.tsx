"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Users,
  ClipboardList,
  Sparkles,
  BookOpen,
  Settings,
  GraduationCap,
  Plus,
  Book,
  X,
} from "lucide-react";
import { useAssignmentStore } from "@/store/assignmentStore";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/groups", label: "My Groups", icon: Users },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/toolkit", label: "AI Teacher's Toolkit", icon: Book},
  { href: "/library", label: "My Library", icon: BookOpen },
];

export default function Sidebar() {
  const path = usePathname();
  const { assignments, setAssignments } = useAssignmentStore();
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.assignments.list()
      .then((data) => {
        setAssignments(data);
        setAssignmentCount(data.length);
      })
      .catch(console.error);
  }, [setAssignments]);

  useEffect(() => {
    const openSidebar = () => setMobileOpen(true);
    const closeSidebar = () => setMobileOpen(false);

    window.addEventListener("vedaai-open-sidebar", openSidebar);
    window.addEventListener("vedaai-close-sidebar", closeSidebar);
    return () => {
      window.removeEventListener("vedaai-open-sidebar", openSidebar);
      window.removeEventListener("vedaai-close-sidebar", closeSidebar);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const NAV_ITEMS = [
    { href: "/", label: "Home", icon: LayoutGrid },
    { href: "/groups", label: "My Groups", icon: Users },
    { href: "/assignments", label: `Assignments ${assignmentCount > 0 ? `(${assignmentCount})` : ""}`, icon: ClipboardList },
    { href: "/toolkit", label: "AI Teacher's Toolkit", icon: Book },
    { href: "/library", label: "My Library", icon: BookOpen },
  ];

  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      {/* Logo */}
      <div style={{ padding: "40px 20px 16px", position: "relative" }}>
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
            color: "#000000", fontFamily: "var(--font-body)",
            fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em",
          }}>
            VedaAI
          </span>
        </Link>

        <button
          type="button"
          className="sidebar-mobile-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          style={{
            position: "absolute",
            right: 16,
            top: 16,
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
        >
          <X size={16} />
        </button>
      </div>

      {/* Create Assignment CTA */}
      <div style={{ padding: "0 16px 20px" }}>
        <Link href="/create" style={{ textDecoration: "none" }}>
          <button className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 13, padding: "9px 16px" }}>
            <Sparkles size={16} />
            Create Assignment
          </button>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(0,0,0,0.1)", margin: "0 16px 12px" }} />

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
          background: "#a8a5a547",
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
            <div style={{ color: "rgba(0, 0, 0, 0.85)", fontSize: 12, fontWeight: 500 }}>
              Delhi Public School
            </div>
            <div style={{ color: "rgba(0, 0, 0, 0.4)", fontSize: 11 }}>
              Bokaro Steel City
            </div>
          </div>
        </div>
      </div>
    </aside>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link href="/" className={`mobile-bottom-nav-item ${path === "/" ? "active" : ""}`}>
          <LayoutGrid size={18} />
          <span>Home</span>
        </Link>
        <Link href="/assignments" className={`mobile-bottom-nav-item ${path.startsWith("/assignments") || path.startsWith("/output") ? "active" : ""}`}>
          <ClipboardList size={18} />
          <span>Assignments</span>
        </Link>
        <Link href="/library" className={`mobile-bottom-nav-item ${path.startsWith("/library") ? "active" : ""}`}>
          <BookOpen size={18} />
          <span>Library</span>
        </Link>
        <Link href="/toolkit" className={`mobile-bottom-nav-item ${path.startsWith("/toolkit") ? "active" : ""}`}>
          <Book size={18} />
          <span>AI Toolkit</span>
        </Link>
      </nav>
    </>
  );
}
