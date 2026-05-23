import * as pdfParse from "pdf-parse";

export async function extractTextFromFile(
  buffer: Buffer,
  mimetype: string
): Promise<string | null> {
  if (mimetype === "application/pdf") {
    const data = await (pdfParse as any)(buffer);
    // Truncate to ~8000 chars to stay within prompt limits
    return data.text.slice(0, 8000).trim() || null;
  }
  // For images — return null; we pass the image directly to the model as base64
  return null;
}