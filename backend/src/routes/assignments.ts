import { Router, Request, Response } from "express";
import { Assignment } from "../models/Assignment";
import { GeneratedPaper } from "../models/GeneratedPaper";
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

// GET /api/assignments/limit/status - get assignment limit info (must be before /:id)
router.get("/limit/status", async (_req: Request, res: Response) => {
  try {
    const MAX_ASSIGNMENTS = parseInt(process.env.MAX_ASSIGNMENTS || "10", 10);
    const currentCount = await Assignment.countDocuments();
    const isAtLimit = currentCount >= MAX_ASSIGNMENTS;
    const isApproachingLimit = currentCount >= MAX_ASSIGNMENTS - 1;
    
    res.json({
      success: true,
      data: {
        current: currentCount,
        max: MAX_ASSIGNMENTS,
        isAtLimit,
        isApproachingLimit,
        remaining: Math.max(0, MAX_ASSIGNMENTS - currentCount),
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

    // ─── Check Global Assignment Limit ──────────────────────────────────────
    const MAX_ASSIGNMENTS = parseInt(process.env.MAX_ASSIGNMENTS || "10", 10);
    const currentCount = await Assignment.countDocuments();
    
    if (currentCount >= MAX_ASSIGNMENTS) {
      return res.status(400).json({
        success: false,
        error: `Assignment limit reached (${MAX_ASSIGNMENTS} max)`,
        code: "LIMIT_EXCEEDED",
        current: currentCount,
        max: MAX_ASSIGNMENTS,
      });
    }

    // Warn if approaching limit
    const isApproachingLimit = currentCount >= MAX_ASSIGNMENTS - 2;

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

    const response: any = { success: true, data: assignment };
    if (isApproachingLimit) {
      response.warning = `Approaching assignment limit (${currentCount + 1}/${MAX_ASSIGNMENTS})`;
      response.limitInfo = { current: currentCount + 1, max: MAX_ASSIGNMENTS };
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
