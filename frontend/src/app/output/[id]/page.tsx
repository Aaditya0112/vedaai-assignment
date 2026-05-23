"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Download, RefreshCw, CheckCircle2,
  Loader2, ChevronDown, ChevronUp, AlertTriangle,
  Printer, BookOpen,
} from "lucide-react";
import { useAssignmentStore } from "@/store/assignmentStore";
import { useAssignmentSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { GeneratedPaper, Assignment, JobProgress } from "@/types";
import dynamic from "next/dynamic"
import toast from "react-hot-toast";
// import { DownloadPDFButton } from "@/components/output/ExamPaperPDF";


const DIFFICULTY_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  Easy: { bg: "#e8f5e9", color: "#2e7d32", dot: "#4caf50" },
  Moderate: { bg: "#fff8e1", color: "#f57f17", dot: "#ffb300" },
  Hard: { bg: "#fce4ec", color: "#c62828", dot: "#e53935" },
  Challenging: { bg: "#f3e5f5", color: "#4527a0", dot: "#7e57c2" },
};

const DownloadPDFButton = dynamic(
  () => import("@/components/output/ExamPaperPDF").then(m => m.DownloadPDFButton),
  { ssr: false, loading: () => <button className="btn-primary" disabled>Loading…</button> }
);

function GeneratingView({ progress }: { progress?: JobProgress }) {
  const pct = progress?.progress || 0;
  const msg = progress?.message || "AI is crafting your question paper…";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 40 }}>
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: "linear-gradient(135deg, #fff5ed 0%, #fdf5e4 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 28, border: "1px solid rgba(232, 99, 42, 0.2)",
        position: "relative",
      }}>
        <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: 8 }}>
        Generating Your Paper
      </h2>
      <p style={{ color: "var(--slate-light)", fontSize: 14, marginBottom: 32, maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}>
        {msg}
      </p>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--slate-light)" }}>Progress</span>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{pct}%</span>
        </div>
        <div className="progress-track" style={{ height: 8 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {["Analyzing syllabus", "Structuring sections", "Crafting questions", "Setting difficulty"].map((s, i) => (
          <span key={s} style={{
            padding: "5px 14px", borderRadius: 100,
            background: i * 25 < pct ? "var(--ink)" : "var(--border)",
            color: i * 25 < pct ? "#fff" : "var(--slate-light)",
            fontSize: 12, fontWeight: 500,
            transition: "all 0.3s ease",
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const style = DIFFICULTY_STYLE[difficulty] || DIFFICULTY_STYLE.Moderate;
  return (
    <span className="badge" style={{ background: style.bg, color: style.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: style.dot, display: "inline-block" }} />
      {difficulty}
    </span>
  );
}

function PaperView({ paper, assignment }: { paper: GeneratedPaper; assignment: Assignment | null }) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [section, setSection] = useState("");
  const [isRegen, setIsRegen] = useState(false);

  // const handleDownloadPDF = () => {
  //   window.print();
  // };

  const handleRegenerate = async () => {
    if (!assignment) return;
    setIsRegen(true);
    const toastId = toast.loading("Regenerating your question paper...");
    try {
      await api.papers.regenerate(assignment._id);
      // toast.dismiss(toastId);
    } catch (err) {
      // toast.dismiss(toastId);
      toast.error("Failed to start regeneration. Please try again.");
      setIsRegen(false);
    }
  };

  return (
    <div>
      {/* Action bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid var(--border)",
        padding: "12px 32px", display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 30,
      }} className="no-print output-action-bar">
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            background: "var(--mint-pale)", color: "var(--mint)",
            fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 100,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <CheckCircle2 size={12} /> <span className="version-label">Generated </span>v{paper.version}
          </span>
          <span style={{ fontSize: 13, color: "var(--slate-light)" }}>
            {paper.sections.reduce((s, sec) => s + sec.questions.length, 0)} questions · {paper.maximumMarks} marks
          </span>
        </div>

        <button
          className="btn-ghost"
          onClick={() => setShowAnswers(!showAnswers)}
          style={{ fontSize: 13 }}
        >
          {showAnswers ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showAnswers ? "Hide" : "Show"} Answers
        </button>

        <button
          className="btn-ghost"
          onClick={handleRegenerate}
          disabled={isRegen}
          style={{ fontSize: 13 }}
        >
          <RefreshCw size={15} style={isRegen ? { animation: "spin 1s linear infinite" } : {}} />
          Regenerate
        </button>

        {/* <button className="btn-primary" onClick={handleDownloadPDF} style={{ fontSize: 13 }}>
          <Download size={15} />
          Download PDF
        </button> */}
        <DownloadPDFButton paper={paper} />
      </div>

      {/* Student info strip */}
      <div className="no-print output-student-strip" style={{ background: "var(--surface-warm)", borderBottom: "1px solid var(--border)", padding: "12px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", minWidth: "fit-content" }}>Preview as:</span>
          {[
            { label: "Name", value: studentName, setter: setStudentName, placeholder: "Student name" },
            { label: "Roll No.", value: rollNo, setter: setRollNo, placeholder: "Roll number" },
            { label: "Section", value: section, setter: setSection, placeholder: "Section" },
          ].map((field) => (
            <div key={field.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--slate-light)" }}>{field.label}:</span>
              <input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                style={{
                  border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px",
                  fontSize: 12, background: "#fff", outline: "none", width: 120,
                  fontFamily: "var(--font-body)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── The Exam Paper ── */}
      <div className="output-paper-wrap" style={{ padding: "32px 32px 64px", background: "var(--surface)" }}>
        <div
          ref={paperRef}
          className="exam-paper output-paper"
          style={{
            maxWidth: 860, margin: "0 auto",
            background: "#fff",
            boxShadow: "var(--shadow-xl)",
            borderRadius: 4,
            overflow: "hidden",
          }}
          id="exam-paper-print"
        >
          {/* Paper header */}
          <div style={{ padding: "32px 40px 24px", borderBottom: "3px double #1a1a1a" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "0.02em", marginBottom: 4 }}>
                {paper.schoolName}
              </h1>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Subject: {paper.subject}</p>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Class: {paper.className}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 12 }}>
              <span>Time Allowed: {paper.timeAllowed} minutes</span>
              <span>Maximum Marks: {paper.maximumMarks}</span>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, fontStyle: "italic", color: "#444" }}>
              All questions are compulsory unless stated otherwise.
            </div>

            {/* Student info */}
            <div style={{ display: "flex", gap: 32, marginTop: 16, fontSize: 12 }}>
              <span>Name: <span style={{ borderBottom: "1px solid #333", minWidth: 160, display: "inline-block" }}>{studentName}</span></span>
              <span>Roll Number: <span style={{ borderBottom: "1px solid #333", minWidth: 80, display: "inline-block" }}>{rollNo}</span></span>
              <span>Class: {paper.className} Section: <span style={{ borderBottom: "1px solid #333", minWidth: 40, display: "inline-block" }}>{section}</span></span>
            </div>
          </div>

          {/* General instructions */}
          {paper.generalInstructions?.length > 0 && (
            <div style={{ padding: "16px 40px", background: "#fafafa", borderBottom: "1px solid #e0e0e0", fontSize: 12 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>General Instructions:</p>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                {paper.generalInstructions.map((inst, i) => (
                  <li key={i} style={{ marginBottom: 3, lineHeight: 1.5 }}>{inst}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Sections */}
          <div style={{ padding: "0 40px 40px" }}>
            {paper.sections.map((section, si) => (
              <div key={section._id || si} style={{ marginTop: 32 }}>
                {/* Section header */}
                <div style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: 8, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.05em" }}>
                      SECTION {section.label}
                    </h2>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      [{section.sectionTotalMarks} Marks]
                    </span>
                  </div>
                  <p style={{ fontSize: 12, fontStyle: "italic", marginTop: 2, color: "#444" }}>
                    {section.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                    {section.instruction}
                  </p>
                </div>

                {/* Questions */}
                {section.questions.map((question, qi) => (
                  <div key={question._id || qi} style={{ marginBottom: 20 }}>
                    <div className="output-question-row" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span className="question-number" style={{ fontSize: 13 }}>
                        {question.number}.
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="output-question-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <p style={{ fontSize: 13, lineHeight: 1.65, flex: 1, margin: 0 }}>
                            {question.text}
                          </p>
                          {question.imageUrl && (
                            <div style={{ margin: "12px 0", textAlign: "center" }}>
                              <img
                                src={question.imageUrl}
                                alt={`Diagram for question ${question.number}`}
                                style={{ maxWidth: "100%", maxHeight: 280, border: "1px solid #ddd", borderRadius: 4 }}
                              />
                            </div>
                          )}
                          {question.imageGenerationStatus === "pending" && (
                            <div style={{ fontSize: 11, color: "var(--slate-light)", fontStyle: "italic", margin: "6px 0" }}>
                              ⏳ Generating diagram…
                            </div>
                          )}
                          <div className="output-marks-badge" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                              [{question.marks} {question.marks === 1 ? "Mark" : "Marks"}]
                            </span>
                            <DifficultyBadge difficulty={question.difficulty} />
                          </div>
                        </div>

                        {/* Sub-parts */}
                        {question.hasSubParts && question.subParts && (
                          <div style={{ marginTop: 8, paddingLeft: 16 }}>
                            {question.subParts.map((sp) => (
                              <p key={sp.label} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 4 }}>
                                ({sp.label}) {sp.text}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Answer key */}
                        {showAnswers && question.answerKey && (
                          <div style={{
                            marginTop: 10, padding: "10px 14px",
                            background: "#f0fdf4", border: "1px solid #86efac",
                            borderRadius: 6, fontSize: 12, color: "#15803d",
                            lineHeight: 1.6,
                          }} className="no-print">
                            <strong>Answer: </strong>{question.answerKey}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* End of paper */}
            <div style={{ marginTop: 48, textAlign: "center", borderTop: "2px solid #1a1a1a", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>— END OF QUESTION PAPER —</p>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

export default function OutputPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const { currentAssignment, setCurrentAssignment, currentPaper, setCurrentPaper, jobProgress } = useAssignmentStore();
  const progress = jobProgress[assignmentId];

  useAssignmentSocket(assignmentId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const assignment = await api.assignments.get(assignmentId);
        setCurrentAssignment(assignment);

        if (assignment.status === "completed" && assignment.generatedPaperId) {
          const paper = await api.papers.getByAssignment(assignmentId);
          setCurrentPaper(paper);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assignmentId, setCurrentAssignment, setCurrentPaper]);

  // Re-fetch paper when job completes
  useEffect(() => {
    if (progress?.status === "completed" && progress.result?.generatedPaperId) {
      api.papers.getByAssignment(assignmentId)
        .then(setCurrentPaper)
        .catch(console.error);
    }
  }, [progress, assignmentId, setCurrentPaper]);

  const isGenerating = currentAssignment?.status === "generating" || progress?.status === "active";
  const hasPaper = currentPaper && currentAssignment?.status === "completed";

  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface)" }}>
      {/* Top nav */}
      <div style={{
        background: "#fff", borderBottom: "1px solid var(--border)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
      }} className="no-print">
        <button onClick={() => router.push("/assignments")} className="btn-ghost" style={{ padding: "7px 12px" }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BookOpen size={16} color="var(--slate-light)" />
          <span style={{ fontSize: 13, color: "var(--slate-light)" }}>
            {currentAssignment?.title || "Assignment Output"}
          </span>
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {error && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
          <AlertTriangle size={40} color="#c62828" />
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: "var(--slate-light)" }}>{error}</p>
        </div>
      )}

      {!loading && !error && isGenerating && <GeneratingView progress={progress} />}

      {!loading && !error && hasPaper && (
        <PaperView paper={currentPaper!} assignment={currentAssignment} />
      )}

      {!loading && !error && !isGenerating && !hasPaper && currentAssignment?.status === "failed" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
          <AlertTriangle size={40} color="#c62828" />
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Generation Failed</h2>
          <p style={{ color: "var(--slate-light)" }}>The AI generation failed. Please try regenerating.</p>
          <button className="btn-accent" onClick={async () => {
            await api.papers.regenerate(assignmentId);
            setCurrentAssignment({ ...currentAssignment!, status: "generating" });
          }}>
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
