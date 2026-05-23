"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, MoreVertical, Eye, Trash2,
  FileText, Clock, Calendar, CheckCircle2, Loader2, XCircle,
  BookOpen, Zap,
} from "lucide-react";
import { useAssignmentStore } from "@/store/assignmentStore";
import { api } from "@/lib/api";
import { Assignment } from "@/types";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  draft: { label: "Draft", color: "#4a5568", icon: FileText, bg: "#f7f7f7" },
  generating: { label: "Generating…", color: "#c05621", icon: Loader2, bg: "#fff5ed" },
  completed: { label: "Ready", color: "#2e7d6b", icon: CheckCircle2, bg: "#e8f5f1" },
  failed: { label: "Failed", color: "#c62828", icon: XCircle, bg: "#ffebee" },
};

function AssignmentCard({ assignment, onDelete }: { assignment: Assignment; onDelete: (id: string) => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const sc = statusConfig[assignment.status] || statusConfig.draft;
  const StatusIcon = sc.icon;

  return (
    <div className="card card-hover" style={{ padding: "20px 24px", cursor: "pointer" }}
      onClick={() => {
        if (assignment.status === "completed" && assignment.generatedPaperId) {
          router.push(`/output/${assignment._id}`);
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Subject chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              background: "var(--accent-pale)", color: "var(--accent)",
              fontSize: 11, fontWeight: 600, padding: "2px 10px",
              borderRadius: 100, letterSpacing: "0.04em",
            }}>
              {assignment.subject}
            </span>
            <span style={{
              background: sc.bg, color: sc.color,
              fontSize: 11, fontWeight: 600, padding: "2px 10px",
              borderRadius: 100, display: "flex", alignItems: "center", gap: 4,
            }}>
              <StatusIcon size={10} style={assignment.status === "generating" ? { animation: "spin 1s linear infinite" } : {}} />
              {sc.label}
            </span>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6, lineHeight: 1.3 }}>
            {assignment.title}
          </h3>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--slate-light)" }}>
              <Calendar size={12} />
              Assigned: {format(new Date(assignment.createdAt), "dd-MM-yyyy")}
            </span>
            {assignment.dueDate && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--slate-light)" }}>
                <Clock size={12} />
                Due: {format(new Date(assignment.dueDate), "dd-MM-yyyy")}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--slate-light)" }}>
              <FileText size={12} />
              {assignment.totalQuestions}Q · {assignment.totalMarks}M
            </span>
          </div>
        </div>

        {/* Menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--slate-light)" }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: 28, zIndex: 50,
              background: "#fff", border: "1px solid var(--border)",
              borderRadius: 10, boxShadow: "var(--shadow-lg)",
              minWidth: 160, overflow: "hidden",
            }}
              onClick={(e) => e.stopPropagation()}
            >
              {assignment.status === "completed" && (
                <button
                  onClick={() => { router.push(`/output/${assignment._id}`); setMenuOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, color: "var(--ink)", background: "none", border: "none", cursor: "pointer", width: "100%" }}
                >
                  <Eye size={14} /> View Assignment
                </button>
              )}
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  if (confirm("Delete this assignment?")) onDelete(assignment._id);
                }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, color: "#c62828", background: "none", border: "none", cursor: "pointer", width: "100%" }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for generating */}
      {assignment.status === "generating" && (
        <div style={{ marginTop: 14 }}>
          <div className="progress-track">
            <div className="progress-fill animate-pulse-soft" style={{ width: "60%" }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--slate-light)", marginTop: 4 }}>
            AI is crafting your question paper…
          </p>
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  const { assignments, setAssignments, removeAssignment, isLoading, setLoading } = useAssignmentStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api.assignments.list()
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setAssignments, setLoading]);

  const filtered = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    await api.assignments.delete(id);
    removeAssignment(id);
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface)" }}>
      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid var(--border)",
        padding: "20px 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16,
        position: "sticky", top: 0, zIndex: 30,
      }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--slate-light)", marginBottom: 2 }}>
            Manage and review assignments for your classes.
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            Assignments
          </h1>
        </div>
        <Link href="/create">
          <button className="btn-primary">
            <Plus size={16} />
            Create Assignment
          </button>
        </Link>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
        {/* Search + Filter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--slate-light)" }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search assignments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-ghost" style={{ flexShrink: 0 }}>
            <Filter size={15} /> Filter
          </button>
        </div>

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="empty-state animate-fade-up">
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "var(--surface-warm)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <BookOpen size={32} color="var(--border-strong)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--font-display)", marginBottom: 8 }}>
              {search ? "No assignments found" : "No assignments yet"}
            </h3>
            <p style={{ color: "var(--slate-light)", fontSize: 14, maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>
              {search
                ? `No results for "${search}". Try a different search term.`
                : "Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading."}
            </p>
            {!search && (
              <Link href="/create">
                <button className="btn-primary">
                  <Plus size={16} /> Create Your First Assignment
                </button>
              </Link>
            )}
          </div>
        )}

        {/* Skeleton */}
        {isLoading && (
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ padding: 24, height: 120 }}>
                <div className="skeleton" style={{ height: 16, width: "40%", marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: "50%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Assignments grid */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((a, i) => (
              <div key={a._id} className="animate-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <AssignmentCard assignment={a} onDelete={handleDelete} />
              </div>
            ))}
          </div>
        )}

        {/* Note callout */}
        {!isLoading && (
          <div style={{
            marginTop: 32, padding: "16px 20px",
            background: "var(--gold-pale)", border: "1px solid #e8d8a0",
            borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <Zap size={16} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: "#7d6520", lineHeight: 1.6 }}>
              <strong>Note:</strong> Created assignments will appear here. Click any completed assignment to view the generated question paper, download as PDF, or regenerate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
