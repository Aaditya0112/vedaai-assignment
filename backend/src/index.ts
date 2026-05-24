import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import assignmentRoutes from "./routes/assignments";
import paperRoutes from "./routes/papers";
import { initQueues } from "./workers/queues";
import { connection } from "./workers/queues";


// Load environment variables from .env file
// const envPath = path.resolve(__dirname, "../.env");
// console.log(`[INIT] Loading .env from: ${envPath}`);
// const result = dotenv.config({ path: envPath });
// if (result.error) {
//   console.warn(`[INIT] .env file not found or error reading it:`, result.error.message);
// } else {
//   console.log(`[INIT] .env loaded successfully`);
// }

console.log(`[INIT] OPENAI_API_KEY set: ${process.env.OPENAI_API_KEY ? "YES" : "NO"}`);
if (process.env.OPENAI_API_KEY) {
  console.log(`[INIT] API Key preview: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
}

const app = express();
const httpServer = createServer(app);

// ─── WebSocket Setup ────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Join assignment room for targeted updates
  socket.on("join:assignment", (assignmentId: string) => {
    socket.join(`assignment:${assignmentId}`);
    console.log(`[WS] ${socket.id} joined room assignment:${assignmentId}`);
  });

  socket.on("leave:assignment", (assignmentId: string) => {
    socket.leave(`assignment:${assignmentId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Helper: emit job progress to all clients watching an assignment
export const emitJobProgress = (
  assignmentId: string,
  payload: {
    jobId: string;
    status: string;
    progress: number;
    message?: string;
    result?: unknown;
    error?: string;
  }
) => {
  io.to(`assignment:${assignmentId}`).emit("job:progress", payload);
};

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/assignments", assignmentRoutes);
app.use("/api/papers", paperRoutes);

app.get("/api/health", async (_req, res) => {
  const redisStatus = connection.status;
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisStatus === "ready" ? "connected" : redisStatus,
  });
})

// ─── MongoDB ─────────────────────────────────────────────────────────────────
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vedaai";
  await mongoose.connect(uri);
  console.log(`[DB] MongoDB connected: ${uri}`);
};

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[WS] WebSocket ready`);

      initQueues();
    });
  })
  .catch((err) => {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  });

export default app;
