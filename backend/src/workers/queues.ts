import { Queue, Worker, QueueEvents, Job } from "bullmq";
// import IORedis from "ioredis";
import { generateQuestionPaper } from "../controllers/aiController";
import { Assignment } from "../models/Assignment";
import { JobRecord } from "../models/JobRecord";
import { emitJobProgress } from "../index";
import { ConnectionOptions } from "bullmq";

// ─── Redis Connection ─────────────────────────────────────────────────────────
export const connection : ConnectionOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  maxRetriesPerRequest: null, // required by BullMQ
};

// connection.on("connect", () => console.log("[Redis] Connected"));
// connection.on("error", (err : Error) => console.error("[Redis] Error:", err.message));

// ─── Queue Definitions ────────────────────────────────────────────────────────
export const paperGenerationQueue = new Queue("paper-generation", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// ─── Worker ───────────────────────────────────────────────────────────────────
const paperWorker = new Worker(
  "paper-generation",
  async (job: Job) => {
    const { assignmentId } = job.data;
    console.log(`[BullMQ] Processing job ${job.id} for assignment ${assignmentId}`);

    // Mark job active in MongoDB
    await JobRecord.findOneAndUpdate(
      { bullJobId: job.id },
      {
        status: "active",
        startedAt: new Date(),
        progress: 10,
        progressMessage: "Starting AI generation...",
      }
    );

    emitJobProgress(assignmentId, {
      jobId: job.id!,
      status: "active",
      progress: 10,
      message: "Starting AI generation...",
    });

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await job.updateProgress(20);
    emitJobProgress(assignmentId, {
      jobId: job.id!,
      status: "active",
      progress: 20,
      message: "Building prompt...",
    });

    const paper = await generateQuestionPaper(assignment);

    await job.updateProgress(90);
    emitJobProgress(assignmentId, {
      jobId: job.id!,
      status: "active",
      progress: 90,
      message: "Saving to database...",
    });

    await Assignment.findByIdAndUpdate(assignmentId, {
      status: "completed",
      generatedPaperId: paper._id,
    });

    await JobRecord.findOneAndUpdate(
      { bullJobId: job.id },
      {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        result: { generatedPaperId: paper._id.toString() },
      }
    );

    emitJobProgress(assignmentId, {
      jobId: job.id!,
      status: "completed",
      progress: 100,
      message: "Paper ready!",
      result: { generatedPaperId: paper._id.toString() },
    });

    return { generatedPaperId: paper._id.toString() };
  },
  { connection, concurrency: 3 }
);

// ─── Queue Event Listeners ────────────────────────────────────────────────────
const queueEvents = new QueueEvents("paper-generation", { connection });

queueEvents.on("failed", async ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
  console.error(`[BullMQ] Job ${jobId} failed: ${failedReason}`);

  const jobRecord = await JobRecord.findOne({ bullJobId: jobId });
  if (jobRecord) {
    await JobRecord.findOneAndUpdate(
      { bullJobId: jobId },
      { status: "failed", error: { message: failedReason } }
    );
    await Assignment.findByIdAndUpdate(jobRecord.assignmentId, {
      status: "failed",
    });
    emitJobProgress(jobRecord.assignmentId.toString(), {
      jobId,
      status: "failed",
      progress: 0,
      error: failedReason,
    });
  }
});

paperWorker.on("error", (err: Error) => {
  console.error("[BullMQ] Worker error:", err.message);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
export const initQueues = () => {
  console.log("[BullMQ] paper-generation queue ready");
  console.log("[BullMQ] paper-generation worker listening (concurrency: 3)");
};