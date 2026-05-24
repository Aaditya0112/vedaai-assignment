"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ArrowLeft, ArrowRight, Plus, X, Upload,
  AlertCircle, CheckCircle2, ChevronDown,
  BookOpen, Calendar, Clock, FileText, Sparkles, Layers,
} from "lucide-react";
import { useAssignmentStore } from "@/store/assignmentStore";
import { api } from "@/lib/api";
import { CreateAssignmentForm, QuestionTypeName } from "@/types";
import { toast } from "react-hot-toast";

const QUESTION_TYPE_OPTIONS: QuestionTypeName[] = [
  "MCQ", "Short Answer", "Long Answer", "Diagram/Graph", "Numerical",
];

const STEPS = [
  { id: 1, label: "Details", icon: BookOpen, description: "Assignment metadata" },
  { id: 2, label: "Material", icon: Upload, description: "Upload content" },
  { id: 3, label: "Questions", icon: Layers, description: "Configure sections" },
  { id: 4, label: "Generate", icon: Sparkles, description: "Create with AI" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
      {STEPS.map((step, i) => {
        const state = step.id < current ? "done" : step.id === current ? "active" : "pending";
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div className={`step-dot ${state}`} style={{ position: "relative" }}>
                {state === "done" ? <CheckCircle2 size={14} /> : <span>{step.id}</span>}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: state === "pending" ? "var(--slate-light)" : state === "active" ? "var(--accent)" : "var(--ink)",
                }}>{step.label}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 12px",
                background: step.id < current ? "var(--ink)" : "var(--border)",
                marginBottom: 22, transition: "background 0.3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FormField({ label, error, children, hint }: {
  label: string; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 12, color: "var(--slate-light)", marginTop: 4 }}>{hint}</p>}
      {error && (
        <p style={{ fontSize: 12, color: "#c62828", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    used: number;
    max: number;
    isAtLimit: boolean;
    isApproachingLimit: boolean;
    remaining: number;
  } | null>(null);
  const { addAssignment } = useAssignmentStore();

  // Fetch creation quota info on mount
  useEffect(() => {
    const fetchQuotaInfo = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const response = await fetch(`${baseUrl}/api/assignments/quota/status`);
        const result = await response.json();
        if (result.success) {
          setQuotaInfo(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch quota info:", err);
      }
    };
    fetchQuotaInfo();
  }, []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<CreateAssignmentForm>({
    defaultValues: {
      title: "",
      subject: "",
      className: "",
      schoolName: "Delhi Public School, Bokaro Steel City",
      dueDate: "",
      timeAllowed: 45,
      questionTypes: [
        { type: "MCQ", count: 4, marksPerQuestion: 1 },
        { type: "Short Answer", count: 5, marksPerQuestion: 2 },
      ],
      additionalInstructions: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "questionTypes" });
  const watchQTypes = watch("questionTypes");

  const totalQuestions = watchQTypes.reduce((s, q) => s + (Number(q.count) || 0), 0);
  const totalMarks = watchQTypes.reduce((s, q) => s + (Number(q.count) || 0) * (Number(q.marksPerQuestion) || 0), 0);

  const goNext = async () => {
    const fieldsToValidate: Record<number, (keyof CreateAssignmentForm)[]> = {
      1: ["title", "subject", "className", "schoolName"],
      2: [],
      3: ["questionTypes"],
    };
    const valid = await trigger(fieldsToValidate[step] as (keyof CreateAssignmentForm)[]);
    if (valid) setStep((s) => Math.min(s + 1, 4));
  };

  const onSubmit = async (data: CreateAssignmentForm) => {
    
    const toastId = toast.loading("Generating your question paper...");
    
    try {
      const assignment = await api.assignments.create(data);
      addAssignment(assignment);
      // toast.dismiss(toastId);
      router.push(`/output/${assignment._id}`);
    } catch (err: any) {
      // toast.dismiss(toastId);
      if (err.status === 400 && err.data?.code === "QUOTA_EXCEEDED") {
        toast.error(`Creation quota exceeded (${err.data.max} max lifetime creations)`);
      } else {
        toast.error(err.message || "Failed to create assignment. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface)" }}>
      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid var(--border)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 30,
      }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: "7px 12px" }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <p style={{ fontSize: 11, color: "var(--slate-light)" }}>Step {step} of {STEPS.length}</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Create Assignment
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── Step 1: Assignment Details ── */}
          {step === 1 && (
            <div className="card animate-fade-up" style={{ padding: 32 }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--ink)", marginBottom: 4 }}>
                  Assignment Details
                </h2>
                <p style={{ fontSize: 13, color: "var(--slate-light)" }}>Basic information about your assignment</p>
              </div>

              <FormField label="Assignment Title *" error={errors.title?.message}>
                <input
                  className={`input ${errors.title ? "input-error" : ""}`}
                  placeholder="e.g. Quiz on Electricity"
                  {...register("title", { required: "Title is required" })}
                />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="Subject *" error={errors.subject?.message}>
                  <input
                    className={`input ${errors.subject ? "input-error" : ""}`}
                    placeholder="e.g. Science"
                    {...register("subject", { required: "Subject is required" })}
                  />
                </FormField>
                <FormField label="Class *" error={errors.className?.message}>
                  <input
                    className={`input ${errors.className ? "input-error" : ""}`}
                    placeholder="e.g. 8th, 10th"
                    {...register("className", { required: "Class is required" })}
                  />
                </FormField>
              </div>

              <FormField label="School Name *" error={errors.schoolName?.message}>
                <input
                  className={`input ${errors.schoolName ? "input-error" : ""}`}
                  placeholder="e.g. Delhi Public School"
                  {...register("schoolName", { required: "School name is required" })}
                />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="Due Date" error={errors.dueDate?.message}>
                  <div style={{ position: "relative" }}>
                    <Calendar size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--slate-light)", pointerEvents: "none" }} />
                    <input
                      type="date"
                      className="input"
                      style={{ paddingLeft: 36 }}
                      {...register("dueDate")}
                    />
                  </div>
                </FormField>
                <FormField label="Time Allowed (minutes)" error={errors.timeAllowed?.message}>
                  <div style={{ position: "relative" }}>
                    <Clock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--slate-light)", pointerEvents: "none" }} />
                    <input
                      type="number"
                      className="input"
                      style={{ paddingLeft: 36 }}
                      {...register("timeAllowed", { required: true, min: 5, valueAsNumber: true })}
                    />
                  </div>
                </FormField>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload Material ── */}
          {step === 2 && (
            <div className="card animate-fade-up" style={{ padding: 32 }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: 4 }}>
                  Upload Material
                </h2>
                <p style={{ fontSize: 13, color: "var(--slate-light)" }}>
                  Upload reference material for better AI question generation (optional)
                </p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) setUploadedFile(file);
                }}
                style={{
                  border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 14,
                  padding: "48px 32px",
                  textAlign: "center",
                  background: isDragging ? "var(--accent-pale)" : "var(--surface)",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: uploadedFile ? "var(--mint-pale)" : "var(--surface-warm)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  {uploadedFile
                    ? <FileText size={24} color="var(--mint)" />
                    : <Upload size={24} color="var(--slate-light)" />
                  }
                </div>
                {uploadedFile ? (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mint)", marginBottom: 4 }}>
                      {uploadedFile.name}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--slate-light)" }}>
                      {(uploadedFile.size / 1024).toFixed(1)} KB · Click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
                      Choose a file or drag & drop it here
                    </p>
                    <p style={{ fontSize: 12, color: "var(--slate-light)", marginBottom: 16 }}>
                      PDF, PNG, JPG, DOCX
                    </p>
                    <button type="button" className="btn-ghost" style={{ fontSize: 12 }}>
                      Browse Files
                    </button>
                  </>
                )}
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  style={{ display: "none" }}
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                />
              </div>

              <p style={{ fontSize: 12, color: "var(--slate-light)", textAlign: "center", marginTop: 16 }}>
                Upload images of your preferred document/image
              </p>

              <FormField label="Additional Instructions" hint="e.g. Focus on NCERT chapters, include diagram-based questions">
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Any specific instructions for the AI to follow while generating the question paper..."
                  style={{ resize: "vertical" }}
                  {...register("additionalInstructions")}
                />
              </FormField>
            </div>
          )}

          {/* ── Step 3: Question Types ── */}
          {step === 3 && (
            <div className="animate-fade-up">
              <div className="card" style={{ padding: 32, marginBottom: 16 }}>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: 4 }}>
                    Question Configuration
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--slate-light)" }}>
                    Define sections and mark distribution
                  </p>
                </div>

                {/* Column headers */}
                <div style={{
                  display: window.innerWidth < 768 ? "none" : "grid",
                  gridTemplateColumns: "1fr 140px 140px 40px",
                  gap: 12, marginBottom: 10, padding: "0 4px",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--slate-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Question Type</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--slate-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>No. of Questions</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--slate-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Marks</span>
                  <span />
                </div>

                {fields.map((field, i) => (
                  <div key={field.id} style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginBottom: 16,
                    padding: window.innerWidth < 768 ? "12px" : "0",
                    background: window.innerWidth < 768 ? "var(--surface-light)" : "transparent",
                    borderRadius: window.innerWidth < 768 ? "8px" : "0",
                    border: window.innerWidth < 768 ? "1px solid var(--border)" : "none",
                  }}>
                    {/* Type selector - full width */}
                    <div>
                      {window.innerWidth < 768 && <label style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", marginBottom: 6, display: "block" }}>Question Type</label>}
                      <div style={{ position: "relative" }}>
                        <select
                          className="input"
                          style={{ appearance: "none", paddingRight: 32, cursor: "pointer", width: "100%" }}
                          {...register(`questionTypes.${i}.type` as const, { required: true })}
                        >
                          {QUESTION_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--slate-light)" }} />
                      </div>
                    </div>

                    {/* Count and Marks on same row */}
                    <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr 1fr" : "140px 140px", gap: 12, alignItems: window.innerWidth < 768 ? "flex-start" : "center" }}>
                      {/* Count with stepper */}
                      <div>
                        {window.innerWidth < 768 && <label style={{ fontSize: 11, fontWeight: 500, color: "var(--ink)", marginBottom: 4, display: "block" }}>No. of Questions</label>}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button type="button"
                            onClick={() => {
                              const currentValue = watchQTypes[i]?.count || 1;
                              if (currentValue > 1) {
                                setValue(`questionTypes.${i}.count`, currentValue - 1);
                              }
                            }}
                            style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", flexShrink: 0, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >−</button>
                          <input
                            id={`count-${i}`}
                            type="number"
                            className="input"
                            style={{ textAlign: "center", padding: "6px 4px", flex: 1 }}
                            {...register(`questionTypes.${i}.count` as const, {
                              required: true, min: 1, valueAsNumber: true,
                            })}
                          />
                          <button type="button"
                            onClick={() => {
                              const currentValue = watchQTypes[i]?.count || 1;
                              setValue(`questionTypes.${i}.count`, currentValue + 1);
                            }}
                            style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", flexShrink: 0, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >+</button>
                        </div>
                      </div>

                      {/* Marks stepper */}
                      <div>
                        {window.innerWidth < 768 && <label style={{ fontSize: 11, fontWeight: 500, color: "var(--ink)", marginBottom: 4, display: "block" }}>Marks</label>}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button type="button"
                            onClick={() => {
                              const currentValue = watchQTypes[i]?.marksPerQuestion || 1;
                              if (currentValue > 1) {
                                setValue(`questionTypes.${i}.marksPerQuestion`, currentValue - 1);
                              }
                            }}
                            style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", flexShrink: 0, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >−</button>
                          <input
                            id={`marks-${i}`}
                            type="number"
                            className="input"
                            style={{ textAlign: "center", padding: "6px 4px", flex: 1 }}
                            {...register(`questionTypes.${i}.marksPerQuestion` as const, {
                              required: true, min: 1, valueAsNumber: true,
                            })}
                          />
                          <button type="button"
                            onClick={() => {
                              const currentValue = watchQTypes[i]?.marksPerQuestion || 1;
                              setValue(`questionTypes.${i}.marksPerQuestion`, currentValue + 1);
                            }}
                            style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", flexShrink: 0, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >+</button>
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)}
                        style={{ width: "100%", height: 32, borderRadius: 6, border: "none", background: "#ffebee", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#c62828", fontWeight: 500, gap: 6 }}>
                        <X size={14} /> Remove
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => append({ type: "Short Answer", count: 5, marksPerQuestion: 2 })}
                  className="btn-ghost"
                  style={{ marginTop: 8, fontSize: 13 }}
                >
                  <Plus size={14} /> Add Question Type
                </button>
              </div>

              {/* Summary */}
              <div className="card" style={{ padding: "16px 24px", background: "var(--ink)", border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Total Questions</span>
                  <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {totalQuestions}
                  </span>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "10px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Total Marks</span>
                  <span style={{ color: "var(--accent-soft)", fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {totalMarks}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Generate ── */}
          {step === 4 && (
            <div className="card animate-fade-up" style={{ padding: 40, textAlign: "center" }}>
              <div style={{
                width: 80, height: 80,
                background: "linear-gradient(135deg, var(--accent-pale) 0%, var(--gold-pale) 100%)",
                borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
                border: "1px solid rgba(232, 99, 42, 0.2)",
              }}>
                <Sparkles size={36} color="var(--accent)" />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: 12 }}>
                Ready to Generate
              </h2>
              <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 32px" }}>
                AI will craft a comprehensive, curriculum-aligned question paper with {totalQuestions} questions worth {totalMarks} marks total.
              </p>

              {/* Quota Warning */}
              {quotaInfo?.isApproachingLimit && !quotaInfo?.isAtLimit && (
                <div style={{
                  background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8,
                  padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <AlertCircle size={18} style={{ color: "#ff9800", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ textAlign: "left", fontSize: 13, color: "#856404" }}>
                    <strong>Approaching Quota:</strong> You have {quotaInfo?.remaining} creation(s) remaining ({quotaInfo?.used}/{quotaInfo?.max})
                  </div>
                </div>
              )}

              {/* Quota Exceeded */}
              {quotaInfo?.isAtLimit && (
                <div style={{
                  background: "#ffebee", border: "1px solid #f44336", borderRadius: 8,
                  padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <AlertCircle size={18} style={{ color: "#f44336", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ textAlign: "left", fontSize: 13, color: "#c62828" }}>
                    <strong>Quota Exceeded:</strong> You have reached your lifetime creation limit ({quotaInfo?.max}). Cannot create more assignments.
                  </div>
                </div>
              )}

              {/* Summary chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32 }}>
                {[
                  { label: `${totalQuestions} Questions`, icon: "📝" },
                  { label: `${totalMarks} Total Marks`, icon: "🎯" },
                  { label: `${watch("timeAllowed")} Minutes`, icon: "⏱" },
                  { label: watch("subject") || "Subject", icon: "📚" },
                ].map((chip) => (
                  <span key={chip.label} style={{
                    background: "var(--surface-warm)", border: "1px solid var(--border)",
                    borderRadius: 100, padding: "6px 14px", fontSize: 13, fontWeight: 500,
                  }}>
                    {chip.icon} {chip.label}
                  </span>
                ))}
              </div>

              <button
                type="submit"
                className="btn-accent"
                disabled={isSubmitting || quotaInfo?.isAtLimit}
                style={{
                  fontSize: 15, padding: "13px 32px", width: "100%", justifyContent: "center",
                  opacity: quotaInfo?.isAtLimit ? 0.5 : 1,
                  cursor: quotaInfo?.isAtLimit ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Creating assignment…
                  </>
                ) : quotaInfo?.isAtLimit ? (
                  <><AlertCircle size={18} /> Quota Exceeded</>
                ) : (
                  <><Sparkles size={18} /> Generate Question Paper</>
                )}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(s - 1, 1))}
              className="btn-ghost"
              style={{ visibility: step > 1 ? "visible" : "hidden" }}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            {step < 4 && (
              <button type="button" onClick={goNext} className="btn-primary">
                Next <ArrowRight size={16} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
