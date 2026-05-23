import mongoose, { Document, Schema } from "mongoose";

export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

export interface IJobRecord extends Document {
  _id: mongoose.Types.ObjectId;
  bullJobId: string;
  assignmentId: mongoose.Types.ObjectId;
  queueName: string;
  type: "generate_paper" | "generate_pdf" | "regenerate_paper";
  status: JobStatus;
  progress: number; // 0-100
  progressMessage?: string;
  attempts: number;
  maxAttempts: number;
  result?: {
    generatedPaperId?: string;
    pdfUrl?: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobRecordSchema = new Schema<IJobRecord>(
  {
    bullJobId: { type: String, required: true, unique: true, index: true },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    queueName: { type: String, required: true },
    type: {
      type: String,
      enum: ["generate_paper", "generate_pdf", "regenerate_paper"],
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "completed", "failed", "delayed"],
      default: "waiting",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    progressMessage: { type: String },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    result: {
      generatedPaperId: String,
      pdfUrl: String,
    },
    error: {
      message: String,
      stack: String,
      code: String,
    },
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

JobRecordSchema.index({ status: 1, createdAt: -1 });
JobRecordSchema.index({ assignmentId: 1, type: 1 });

export const JobRecord = mongoose.model<IJobRecord>(
  "JobRecord",
  JobRecordSchema
);
