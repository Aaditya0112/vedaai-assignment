export type Difficulty = "Easy" | "Moderate" | "Hard" | "Challenging";

export type QuestionTypeName =
  | "MCQ"
  | "Short Answer"
  | "Long Answer"
  | "Diagram/Graph"
  | "Numerical";

export interface QuestionType {
  type: QuestionTypeName;
  count: number;
  marksPerQuestion: number;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  className: string;
  schoolName: string;
  dueDate: string;
  timeAllowed: number;
  totalQuestions: number;
  totalMarks: number;
  questionTypes: QuestionType[];
  additionalInstructions?: string;
  status: "draft" | "generating" | "completed" | "failed";
  generatedPaperId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  _id?: string;
  number: number;
  text: string;
  type: string;
  difficulty: Difficulty;
  marks: number;
  hasSubParts?: boolean;
  subParts?: Array<{ label: string; text: string }>;
  answerKey?: string;
  imageUrl?: string; // URL of the generated image (for questions with diagrams)
  imageGenerationStatus?: "none" | "pending" | "completed" | "failed"; // Status of the image generation process
}

export interface Section {
  _id?: string;
  label: string;
  title: string;
  instruction: string;
  questionType: string;
  questions: Question[];
  sectionTotalMarks: number;
}

export interface GeneratedPaper {
  _id: string;
  assignmentId: string;
  schoolName: string;
  subject: string;
  className: string;
  timeAllowed: number;
  maximumMarks: number;
  generalInstructions: string[];
  sections: Section[];
  version: number;
  createdAt: string;
}

export interface JobProgress {
  jobId: string;
  status: "waiting" | "active" | "completed" | "failed";
  progress: number;
  message?: string;
  result?: { generatedPaperId?: string };
  error?: string;
}

export interface CreateAssignmentForm {
  title: string;
  subject: string;
  className: string;
  schoolName: string;
  dueDate: string;
  timeAllowed: number;
  questionTypes: QuestionType[];
  additionalInstructions: string;
}
