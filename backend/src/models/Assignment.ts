import mongoose, { Document, Schema } from "mongoose";

export interface IQuestionType {
  type:
    | "MCQ"
    | "Short Answer"
    | "Long Answer"
    | "Diagram/Graph"
    | "Numerical";
  count: number;
  marksPerQuestion: number; 
}

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  subject: string;
  className: string;
  schoolName: string;
  teacherId: string; // future auth
  dueDate: Date;
  timeAllowed: number; // minutes
  totalQuestions: number;
  totalMarks: number;
  questionTypes: IQuestionType[];
  additionalInstructions?: string;
  uploadedFileUrl?: string;
  uploadedFileName?: string;
  status: "draft" | "generating" | "completed" | "failed";
  jobId?: string; // BullMQ job reference
  generatedPaperId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionTypeSchema = new Schema<IQuestionType>(
  {
    type: {
      type: String,
      enum: ["MCQ", "Short Answer", "Long Answer", "Diagram/Graph", "Numerical"],
      required: true,
    },
    count: { type: Number, required: true, min: 1 },
    marksPerQuestion: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    schoolName: { type: String, required: true, trim: true },
    teacherId: { type: String, default: "demo-teacher" },
    dueDate: { type: Date, required: true },
    timeAllowed: { type: Number, required: true, min: 5, default: 45 },
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 1 },
    questionTypes: {
      type: [QuestionTypeSchema],
      required: true,
      validate: {
        validator: (v: IQuestionType[]) => v.length > 0,
        message: "At least one question type is required",
      },
    },
    additionalInstructions: { type: String, maxlength: 1000 },
    uploadedFileUrl: { type: String },
    uploadedFileName: { type: String },
    status: {
      type: String,
      enum: ["draft", "generating", "completed", "failed"],
      default: "draft",
    },
    jobId: { type: String },
    generatedPaperId: { type: Schema.Types.ObjectId, ref: "GeneratedPaper" }, // URLs of generated images (for MCQs with diagrams) - virtual field, not stored in DB
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: computed status label
AssignmentSchema.virtual("statusLabel").get(function () {
  const map: Record<string, string> = {
    draft: "Draft",
    generating: "Generating...",
    completed: "Ready",
    failed: "Failed",
  };
  return map[this.status] || this.status;
});

AssignmentSchema.index({ teacherId: 1, createdAt: -1 });
AssignmentSchema.index({ status: 1 });
AssignmentSchema.index({ jobId: 1 });

export const Assignment = mongoose.model<IAssignment>(
  "Assignment",
  AssignmentSchema
);
