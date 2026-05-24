import OpenAI from "openai";
import { IAssignment } from "../models/Assignment";
import { GeneratedPaper, ISection, IQuestion } from "../models/GeneratedPaper";
import fs from "fs";
import path from "path";
import os from "os";
import { v2 as cloudinary } from "cloudinary";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize client lazily to ensure env vars are loaded
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error("[AI] OPENAI_API_KEY not found in environment variables");
    console.error("[AI] Available env vars:", Object.keys(process.env).filter(k => k.includes("OPENAI")));
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  
  console.log("[AI] Initializing OpenAI client with API key");
  return new OpenAI({ apiKey });
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────
function buildPrompt(assignment: IAssignment): string {
  const sections = assignment.questionTypes
    .map(
      (qt, i) =>
        `Section ${String.fromCharCode(65 + i)} (${qt.type}): ${qt.count} questions × ${qt.marksPerQuestion} marks each`
    )
    .join("\n");

  return `You are an expert educator creating a CBSE-style examination paper.

ASSIGNMENT DETAILS:
- Title: ${assignment.title}
- Subject: ${assignment.subject}
- Class: ${assignment.className}
- School: ${assignment.schoolName}
- Time Allowed: ${assignment.timeAllowed} minutes
- Total Marks: ${assignment.totalMarks}
- Total Questions: ${assignment.totalQuestions}

SECTIONS REQUIRED:
${sections}

${assignment.additionalInstructions ? `ADDITIONAL INSTRUCTIONS: (Consider this strictly) ${assignment.additionalInstructions}` : ""}

Generate a complete, high-quality examination paper. Respond ONLY with a JSON object (no markdown, no preamble) matching this exact schema:

{
  "generalInstructions": ["instruction 1", "instruction 2", "instruction 3"],
  "sections": [
    {
      "label": "A",
      "title": "Short Answer Questions",
      "instruction": "Attempt all questions. Each question carries 2 marks.",
      "questionType": "Short Answer",
      "questions": [
        {
          "number": 1,
          "text": "Full question text here",
          "difficulty": "Easy",
          "marks": 2,
          "answerKey": "Complete model answer here",
          "hasSubParts": false,
          "imagePrompt": null
        }
      ]
    }
  ]
}

RULES:
1. difficulty must be one of: "Easy", "Moderate", "Hard", "Challenging"
2. Mix difficulties within sections (aim for 40% Easy, 35% Moderate, 20% Hard, 5% Challenging)
3. Questions must be subject-appropriate and syllabus-aligned
4. For MCQ sections, include 4 options in the text as (A) (B) (C) (D)
5. answerKey must be detailed and complete
6. generalInstructions should have 3-5 standard exam instructions
7. Section instructions must mention marks per question
8. imagePrompt: For questions which needed an image with it to understand the question completely, provide a detailed prompt for AI image generation. For non-visual questions, use null. Example: "A diagrma of Blast Furnace showing all the region with arrows pointing to each region and leave space to label them later". ALSO REMEMBER STRICTLY IF QUESTION ASKS A DIAGRAM TO BE DRAWN AS AN ANSWER, DO NOT GO FOR IMAGE GENERATION FOR THAT QUESTION.
9. Do NOT include any text outside the JSON object

`;
}

// ─── Response Parser ──────────────────────────────────────────────────────────
interface RawQuestion {
  number: number;
  text: string;
  difficulty: string;
  marks: number;
  answerKey?: string;
  hasSubParts?: boolean;
  subParts?: Array<{ label: string; text: string }>;
  imagePrompt?: string | null;
}

interface RawSection {
  label: string;
  title: string;
  instruction: string;
  questionType: string;
  questions: RawQuestion[];
}

interface RawPaper {
  generalInstructions: string[];
  sections: RawSection[];
}

function parseAIResponse(rawText: string): RawPaper {
  // Strip any accidental markdown fences
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as RawPaper;

  // Validate structure
  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error("Invalid AI response: missing sections array");
  }

  return parsed;
}

// ─── Main Generator ───────────────────────────────────────────────────────────
export async function generateQuestionPaper(assignment: IAssignment) {
  const startTime = Date.now();

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-5.4-mini",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "user",
        content: buildPrompt(assignment),
      },
    ],
  });

  const rawText = response.choices[0]?.message?.content || "";
  if (!rawText) {
    throw new Error("No response content from OpenAI API");
  }

  const parsed = parseAIResponse(rawText);
  const generationTimeMs = Date.now() - startTime;

  // Map to DB schema
  const sections: ISection[] = parsed.sections.map((s) => {
    const questions: IQuestion[] = s.questions.map((q) => ({
      number: q.number,
      text: q.text,
      type: s.questionType,
      difficulty: q.difficulty as IQuestion["difficulty"],
      marks: q.marks,
      hasSubParts: q.hasSubParts || false,
      subParts: q.subParts || [],
      answerKey: q.answerKey,
      imagePrompt: q.imagePrompt || undefined,
      imageGenerationStatus: q.imagePrompt ? "pending" : "none",
    }));

    const sectionTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    return {
      label: s.label,
      title: s.title,
      instruction: s.instruction,
      questionType: s.questionType,
      questions,
      sectionTotalMarks,
    };
  });

  // Get latest version for this assignment
  const latestPaper = await GeneratedPaper.findOne({
    assignmentId: assignment._id,
  }).sort({ version: -1 });
  const nextVersion = latestPaper ? latestPaper.version + 1 : 1;

  const paper = await GeneratedPaper.create({
    assignmentId: assignment._id,
    schoolName: assignment.schoolName,
    subject: assignment.subject,
    className: assignment.className,
    timeAllowed: assignment.timeAllowed,
    maximumMarks: assignment.totalMarks,
    generalInstructions: parsed.generalInstructions || [],
    sections,
    modelUsed: "gpt-5.4-mini",
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    generationTimeMs,
    version: nextVersion,
  });

  generateImagesForPaper(paper).catch(console.error);

  return paper;
}


// ─── Image Generation ───────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, "../../public/diagrams");

// Ensure public/diagrams directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  console.log(`[IMG] Created public diagrams directory: ${PUBLIC_DIR}`);
}

async function generateImagesForPaper(paper: any) {
  const totalQuestions = paper.sections.reduce((sum: number, s: any) => sum + s.questions.length, 0);
  const questionsWithImages = paper.sections.reduce(
    (sum: number, s: any) => sum + s.questions.filter((q: any) => q.imagePrompt).length,
    0
  );

  console.log(`[IMG] Starting image generation for paper ${paper._id}`);
  console.log(`[IMG] Total questions: ${totalQuestions}, Questions with images: ${questionsWithImages}`);

  const client = getOpenAIClient();

  for (const section of paper.sections) {
    for (const question of section.questions) {
      if (!question.imagePrompt) {
        console.log(`[IMG] Question ${question._id} has no imagePrompt, skipping`);
        continue;
      }

      console.log(`[IMG] Processing question ${question.number}: "${question.imagePrompt.substring(0, 50)}..."`);

      // 1. Mark as pending
      await GeneratedPaper.updateOne(
        { _id: paper._id, "sections.questions._id": question._id },
        { $set: { "sections.$[].questions.$[q].imageGenerationStatus": "pending" } },
        { arrayFilters: [{ "q._id": question._id }] }
      );

      try {
        // 2. Generate image using OpenAI GPT-4 with image generation tool
        console.log(`[IMG] Calling OpenAI GPT-5.4-mini for image generation for question ${question._id}`);
        
        const response = await client.responses.create({
          model: "gpt-5.4-mini",
          input :  `Generate an educational diagram image based on this description. The image should be black and white with clean lines and no text labels:\n\n${question.imagePrompt}`,
          tools: [
            {
              type: "image_generation",
            }
          ],
        });

        const imageData = response.output
          .filter((output) => output.type === "image_generation_call")
          .map((output) => output.result);

        if (imageData.length > 0) {
          console.log(`[IMG] Decoding and saving image to temp file`);
          const imageBase64 = imageData[0];

          if (!imageBase64) {
            console.error(`[IMG] Image data is null or undefined`);
            continue;
          }
          const tmpPath = path.join(PUBLIC_DIR, `q_${question._id}.png`);
          fs.writeFileSync(tmpPath, Buffer.from(imageBase64, "base64"));
          console.log(`[IMG] Downloaded and saved to ${tmpPath}`);


          // 4. Upload to Cloudinary
          console.log(`[IMG] Uploading to Cloudinary...`);
          const uploaded = await cloudinary.uploader.upload(tmpPath, {
            folder: "vedaai/diagrams",
            public_id: `question_${question._id}`,
            overwrite: true,
          });

          fs.unlinkSync(tmpPath);
          // Keep file in public folder, don't delete
          console.log(`[IMG] Uploaded to Cloudinary: ${uploaded.secure_url}`);
          console.log(`[IMG] File also saved locally: ${tmpPath}`);

          // 5. Save cloudinary URL to DB
          await GeneratedPaper.updateOne(
            { _id: paper._id },
            {
              $set: {
                "sections.$[].questions.$[q].imageUrl": uploaded.secure_url,
                "sections.$[].questions.$[q].imageGenerationStatus": "completed",
              },
            },
            { arrayFilters: [{ "q._id": question._id }] }
          );
          console.log(`[IMG] ✓ Completed for question ${question._id}`);
    
        }

        // // 3. Save base64 image to temp file
        // console.log(`[IMG] Decoding and saving image to temp file`);
        // const buffer = Buffer.from(imageBase64, "base64");
        // const tmpPath = path.join("/tmp", `q_${question._id}.png`);
        // fs.writeFileSync(tmpPath, buffer);
        // console.log(`[IMG] Downloaded and saved to ${tmpPath}`);

        

      } catch (err) {
        console.error(`[IMG] ✗ Failed for question ${question._id}:`, err);
        await GeneratedPaper.updateOne(
          { _id: paper._id },
          { $set: { "sections.$[].questions.$[q].imageGenerationStatus": "failed" } },
          { arrayFilters: [{ "q._id": question._id }] }
        );
      }
    }
  }
  console.log(`[IMG] Image generation complete for paper ${paper._id}`);
}
