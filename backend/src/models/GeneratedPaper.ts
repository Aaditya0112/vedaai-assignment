import mongoose, { Document, Schema } from "mongoose";

export type Difficulty = "Easy" | "Moderate" | "Hard" | "Challenging";

export interface IQuestion {
  _id?: mongoose.Types.ObjectId;
  number: number;
  text: string;
  type: string;
  difficulty: Difficulty;
  marks: number;
  hasSubParts?: boolean;
  subParts?: Array<{ label: string; text: string }>;
  answerKey?: string;
  hint?: string;

  // In IQuestion interface — add:
  imagePrompt?: string;      // the prompt sent to image model
  imageUrl?: string;         // final cloudinary URL
  imageGenerationStatus?: "none" | "pending" | "completed" | "failed";
}

export interface ISection {
  _id?: mongoose.Types.ObjectId;
  label: string; // "A", "B", "C"
  title: string; // "Short Answer Questions"
  instruction: string; // "Attempt all questions. Each question carries 2 marks."
  questionType: string;
  questions: IQuestion[];
  sectionTotalMarks: number;
}

export interface IGeneratedPaper extends Document {
  _id: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  schoolName: string;
  subject: string;
  className: string;
  timeAllowed: number;
  maximumMarks: number;
  generalInstructions: string[];
  sections: ISection[];
  answerKey: Map<string, string>;
  modelUsed: string;
  promptTokens?: number;
  completionTokens?: number;
  generationTimeMs?: number;
  version: number; // for regeneration tracking
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    number: { type: Number, required: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Moderate", "Hard", "Challenging"],
      required: true,
    },
    marks: { type: Number, required: true, min: 1 },
    hasSubParts: { type: Boolean, default: false },
    subParts: [
      {
        label: String,
        text: String,
        _id: false,
      },
    ],
    answerKey: { type: String },
    hint: { type: String },
    // In QuestionSchema — add inside the schema definition:
    imagePrompt: { type: String },
    imageUrl: { type: String },
    imageGenerationStatus: {
      type: String,
      enum: ["none", "pending", "completed", "failed"],
      default: "none",
    },
  },
  { _id: true }
);

const SectionSchema = new Schema<ISection>(
  {
    label: { type: String, required: true }, // A, B, C
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questionType: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true },
    sectionTotalMarks: { type: Number, required: true },
  },
  { _id: true }
);

const GeneratedPaperSchema = new Schema<IGeneratedPaper>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    schoolName: { type: String, required: true },
    subject: { type: String, required: true },
    className: { type: String, required: true },
    timeAllowed: { type: Number, required: true },
    maximumMarks: { type: Number, required: true },
    generalInstructions: { type: [String], default: [] },
    sections: { type: [SectionSchema], required: true },
    answerKey: { type: Map, of: String, default: {} },
    modelUsed: { type: String, required: true },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    generationTimeMs: { type: Number },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

GeneratedPaperSchema.virtual("totalQuestions").get(function () {
  return this.sections.reduce((sum, s) => sum + s.questions.length, 0);
});

GeneratedPaperSchema.index({ assignmentId: 1, version: -1 });

export const GeneratedPaper = mongoose.model<IGeneratedPaper>(
  "GeneratedPaper",
  GeneratedPaperSchema
);
