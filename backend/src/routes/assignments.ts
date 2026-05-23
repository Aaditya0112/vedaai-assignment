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

    res.status(201).json({ success: true, data: assignment });

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
