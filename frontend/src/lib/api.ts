import { Assignment, GeneratedPaper, CreateAssignmentForm } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
//   const res = await fetch(`${BASE}${path}`, {
//     headers: { "Content-Type": "application/json" },
//     ...init,
//   });
//   const json = await res.json();
//   if (!json.success) throw new Error(json.error || "Request failed");
//   return json.data as T;
// }

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 10s timeout

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...init,
    });
    clearTimeout(timeout);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Request failed");
    return json.data as T;
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      throw new Error("Request timed out — backend may be starting up, please refresh.");
    }
    throw err;
  }
}

export const api = {
  assignments: {
    list: () => apiFetch<Assignment[]>("/api/assignments"),
    get: (id: string) => apiFetch<Assignment>(`/api/assignments/${id}`),
    create: (data: CreateAssignmentForm) =>
      apiFetch<Assignment>("/api/assignments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/api/assignments/${id}`, { method: "DELETE" }),
    getQuotaStatus: () =>
      apiFetch<{ used: number; max: number; isAtLimit: boolean; isApproachingLimit: boolean; remaining: number }>("/api/assignments/quota/status"),
  },
  papers: {
    getByAssignment: (assignmentId: string) =>
      apiFetch<GeneratedPaper>(`/api/papers/by-assignment/${assignmentId}`),
    regenerate: (assignmentId: string) =>
      apiFetch<void>(`/api/papers/regenerate/${assignmentId}`, {
        method: "POST",
      }),
  },
};
