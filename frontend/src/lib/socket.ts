"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAssignmentStore } from "@/store/assignmentStore";
import { JobProgress } from "@/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, { transports: ["websocket", "polling"] });
  }
  return socket;
}

export function useAssignmentSocket(assignmentId: string | null) {
  const { updateJobProgress, updateAssignmentStatus, assignments } = useAssignmentStore();
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;

    const s = getSocket();

    if (joinedRef.current !== assignmentId) {
      if (joinedRef.current) {
        s.emit("leave:assignment", joinedRef.current);
      }
      s.emit("join:assignment", assignmentId);
      joinedRef.current = assignmentId;
    }

    const handleProgress = (data: JobProgress) => {
      updateJobProgress(assignmentId, data);

      // Get assignment title for notification
      const assignment = assignments.find((a) => a._id === assignmentId);
      const title = assignment?.title || "Assignment";

      if (data.status === "completed" && data.result?.generatedPaperId) {
        updateAssignmentStatus(assignmentId, "completed", data.result.generatedPaperId);
        toast.success(`✓ "${title}" is ready!`, {
          duration: 5000,
          position: "bottom-right",
          style: {
            background: "#e8f5f1",
            color: "#2e7d6b",
            border: "1px solid #2e7d6b",
          },
        });
      } else if (data.status === "failed") {
        updateAssignmentStatus(assignmentId, "failed");
        toast.error(`✗ Failed to generate "${title}"`, {
          duration: 5000,
          position: "bottom-right",
          style: {
            background: "#ffebee",
            color: "#c62828",
            border: "1px solid #c62828",
          },
        });
      } else if (data.status === "active") {
        updateAssignmentStatus(assignmentId, "generating");
      }
    };

    s.on("job:progress", handleProgress);

    return () => {
      s.off("job:progress", handleProgress);
    };
  }, [assignmentId, updateJobProgress, updateAssignmentStatus, assignments]);
}
