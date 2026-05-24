import { Router, Request, Response } from "express";
import { Assignment } from "../models/Assignment";
import { GeneratedPaper } from "../models/GeneratedPaper";
import { GlobalQuota } from "../models/CreationQuota";
import { generateQuestionPaper } from "../controllers/aiController";
import { emitJobProgress } from "../index";
import { paperGenerationQueue } from "../workers/queues";
import { JobRecord } from "../models/JobRecord";

const router = Router();

// GET /api/assignments - list all assignments
router.get("/", async (_req: Request, res: Response) => {
  try {
    const assignments = await Assignment.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: assignments });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/assignments/quota/status - get global creation quota info (must be before /:id)
router.get("/quota/status", async (req: Request, res: Response) => {
  try {
    const MAX_CREATIONS = parseInt(process.env.MAX_CREATIONS || "10", 10);
    
    let globalQuota = await GlobalQuota.findOne();
    if (!globalQuota) {
      globalQuota = await GlobalQuota.create({ totalCreations: 0 });
    }
    
    const creationCount = globalQuota.totalCreations;
    const isAtLimit = creationCount >= MAX_CREATIONS;
    const isApproachingLimit = creationCount >= MAX_CREATIONS - 1;
    
    res.json({
      success: true,
      data: {
        used: creationCount,
        max: MAX_CREATIONS,
        isAtLimit,
        isApproachingLimit,
        remaining: Math.max(0, MAX_CREATIONS - creationCount),
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/assignments/:id - get single assignment
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) {
      return res.status(404).json({ success: false, error: "Assignment not found" });
    }
    res.json({ success: true, data: assignment });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/assignments - create assignment and trigger generation
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      title,
      subject,
      className,
      schoolName,
      dueDate,
      timeAllowed,
      questionTypes,
      additionalInstructions,
    } = req.body;

    // ─── Check Global Creation Quota ──────────────────────────────────────
    const MAX_CREATIONS = parseInt(process.env.MAX_CREATIONS || "10", 10);
    
    let globalQuota = await GlobalQuota.findOne();
    if (!globalQuota) {
      globalQuota = await GlobalQuota.create({ totalCreations: 0 });
    }
    
    if (globalQuota.totalCreations >= MAX_CREATIONS) {
      return res.status(400).json({
        success: false,
        error: `Global creation quota exceeded (${MAX_CREATIONS} max total creations)`,
        code: "QUOTA_EXCEEDED",
        used: globalQuota.totalCreations,
        max: MAX_CREATIONS,
      });
    }

    // Warn if approaching global limit
    const isApproachingLimit = globalQuota.totalCreations >= MAX_CREATIONS - 1;

    // Compute totals
    const totalQuestions = questionTypes.reduce(
      (sum: number, qt: { count: number }) => sum + qt.count,
      0
    );
    const totalMarks = questionTypes.reduce(
      (sum: number, qt: { count: number; marksPerQuestion: number }) =>
        sum + qt.count * qt.marksPerQuestion,
      0
    );

    const assignment = await Assignment.create({
      title,
      subject,
      className,
      schoolName,
      dueDate,
      timeAllowed,
      questionTypes,
      additionalInstructions,
      totalQuestions,
      totalMarks,
      status: "generating",
    });

    // Increment global quota after successful creation
    await GlobalQuota.findByIdAndUpdate(globalQuota._id, {
      $inc: { totalCreations: 1 },
      lastCreatedAt: new Date(),
    });

    const response: any = { success: true, data: assignment };
    if (isApproachingLimit) {
      response.warning = `Approaching global quota limit (${globalQuota.totalCreations + 1}/${MAX_CREATIONS})`;
      response.quotaInfo = { used: globalQuota.totalCreations + 1, max: MAX_CREATIONS };
    }

    res.status(201).json(response);

    // ─── Trigger AI Generation (inline for now) ───────────────────────────

    const job = await paperGenerationQueue.add(
      "generate",
      { assignmentId: assignment._id.toString() },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );

    await Assignment.findByIdAndUpdate(assignment._id, { jobId: job.id });

    await JobRecord.create({
      bullJobId: job.id,
      assignmentId: assignment._id,
      queueName: "paper-generation",
      type: "generate_paper",
      status: "waiting",
      maxAttempts: 3,
    });

    console.log(`[Assignments] Job ${job.id} enqueued for assignment ${assignment._id}`);

  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// DELETE /api/assignments/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    // Also clean up generated paper
    if (assignment.generatedPaperId) {
      await GeneratedPaper.findByIdAndDelete(assignment.generatedPaperId);
    }
    res.json({ success: true, message: "Assignment deleted" });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
