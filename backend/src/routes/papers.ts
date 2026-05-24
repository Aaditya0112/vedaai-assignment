import { Router, Request, Response } from "express";
import { GeneratedPaper } from "../models/GeneratedPaper";
import { Assignment } from "../models/Assignment";
import { generateQuestionPaper } from "../controllers/aiController";
import { emitJobProgress } from "../index";
import { paperGenerationQueue } from "../workers/queues";
import { JobRecord } from "../models/JobRecord";
import { GlobalQuota } from "../models/CreationQuota";

const router = Router();

// GET /api/papers/by-assignment/:assignmentId
router.get("/by-assignment/:assignmentId", async (req: Request, res: Response) => {
  try {
    const paper = await GeneratedPaper.findOne({
      assignmentId: req.params.assignmentId,
    })
      .sort({ version: -1 })
      .lean();

    if (!paper) {
      return res.status(404).json({ success: false, error: "Paper not found" });
    }
    res.json({ success: true, data: paper });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/papers/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const paper = await GeneratedPaper.findById(req.params.id).lean();
    if (!paper) {
      return res.status(404).json({ success: false, error: "Paper not found" });
    }
    res.json({ success: true, data: paper });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/papers/regenerate/:assignmentId
router.post("/regenerate/:assignmentId", async (req: Request, res: Response) => {
  try {
    const MAX_CREATIONS = parseInt(process.env.MAX_CREATIONS || "10", 10);
    
    let globalQuota = await GlobalQuota.findOne();
    if (!globalQuota) {
      globalQuota = await GlobalQuota.create({ totalGenerations: 0 });
    }

    const generationCount = globalQuota.totalGenerations ?? (globalQuota as any).totalCreations ?? 0;

    if (generationCount >= MAX_CREATIONS) {
      return res.status(400).json({
        success: false,
        error: `Global generation quota exceeded (${MAX_CREATIONS} max total generations)`,
        code: "QUOTA_EXCEEDED",
        used: generationCount,
        max: MAX_CREATIONS,
      });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: "Assignment not found" });
    }

    await GlobalQuota.findByIdAndUpdate(globalQuota._id, {
      $inc: { totalGenerations: 1 },
      lastCreatedAt: new Date(),
    });

    await Assignment.findByIdAndUpdate(assignment._id, { status: "generating" });

    // Send initial response
    res.json({ success: true, message: "Regeneration started" });

    // Enqueue to BullMQ regeneration queue
    const job = await paperGenerationQueue.add(
      "regenerate",
      { assignmentId: assignment._id.toString() },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );

    await Assignment.findByIdAndUpdate(assignment._id, { jobId: job.id });

    await JobRecord.create({
      bullJobId: job.id,
      assignmentId: assignment._id,
      queueName: "paper-generation",
      type: "regenerate_paper",
      status: "waiting",
      maxAttempts: 3,
    });

    console.log(`[Papers] Regeneration job ${job.id} enqueued for assignment ${assignment._id}`);
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
