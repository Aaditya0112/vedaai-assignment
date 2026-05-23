import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Assignment, GeneratedPaper, JobProgress } from "@/types";

interface AssignmentStore {
  // State
  assignments: Assignment[];
  currentAssignment: Assignment | null;
  currentPaper: GeneratedPaper | null;
  jobProgress: Record<string, JobProgress>; // assignmentId → progress
  isLoading: boolean;
  error: string | null;

  // Actions
  setAssignments: (assignments: Assignment[]) => void;
  addAssignment: (assignment: Assignment) => void;
  removeAssignment: (id: string) => void;
  setCurrentAssignment: (assignment: Assignment | null) => void;
  setCurrentPaper: (paper: GeneratedPaper | null) => void;
  updateJobProgress: (assignmentId: string, progress: JobProgress) => void;
  clearJobProgress: (assignmentId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateAssignmentStatus: (
    id: string,
    status: Assignment["status"],
    generatedPaperId?: string
  ) => void;
}

export const useAssignmentStore = create<AssignmentStore>()(
  devtools(
    (set) => ({
      assignments: [],
      currentAssignment: null,
      currentPaper: null,
      jobProgress: {},
      isLoading: false,
      error: null,

      setAssignments: (assignments) => set({ assignments }),

      addAssignment: (assignment) =>
        set((state) => ({
          assignments: [assignment, ...state.assignments],
        })),

      removeAssignment: (id) =>
        set((state) => ({
          assignments: state.assignments.filter((a) => a._id !== id),
        })),

      setCurrentAssignment: (assignment) =>
        set({ currentAssignment: assignment }),

      setCurrentPaper: (paper) => set({ currentPaper: paper }),

      updateJobProgress: (assignmentId, progress) =>
        set((state) => ({
          jobProgress: { ...state.jobProgress, [assignmentId]: progress },
        })),

      clearJobProgress: (assignmentId) =>
        set((state) => {
          const next = { ...state.jobProgress };
          delete next[assignmentId];
          return { jobProgress: next };
        }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      updateAssignmentStatus: (id, status, generatedPaperId) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a._id === id
              ? { ...a, status, ...(generatedPaperId ? { generatedPaperId } : {}) }
              : a
          ),
          currentAssignment:
            state.currentAssignment?._id === id
              ? {
                  ...state.currentAssignment,
                  status,
                  ...(generatedPaperId ? { generatedPaperId } : {}),
                }
              : state.currentAssignment,
        })),
    }),
    { name: "vedaai-store" }
  )
);
