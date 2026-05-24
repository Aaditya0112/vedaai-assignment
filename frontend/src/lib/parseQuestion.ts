export interface ParsedQuestion {
  stem: string;
  options: { label: string; text: string }[] | null;
  isMCQ: boolean;
}

export function parseQuestionText(text: string): ParsedQuestion {
  // Match (A) (B) (C) (D) or (a) (b) (c) (d)
  const optionRegex = /\(([A-Da-d])\)\s*([^(]+?)(?=\s*\([A-Da-d]\)|$)/g;
  const options: { label: string; text: string }[] = [];
  let match;

  while ((match = optionRegex.exec(text)) !== null) {
    options.push({
      label: match[1].toUpperCase(),
      text: match[2].trim(),
    });
  }

  if (options.length < 2) {
    return { stem: text, options: null, isMCQ: false };
  }

  // Extract stem — everything before first (A)
  const firstOptionIndex = text.search(/\([A-Da-d]\)/);
  const stem = text.slice(0, firstOptionIndex).trim();

  return { stem, options, isMCQ: true };
}