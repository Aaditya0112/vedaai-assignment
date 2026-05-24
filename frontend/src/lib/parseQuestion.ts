export interface ParsedQuestion {
  stem: string;
  options: { label: string; text: string }[] | null;
  isMCQ: boolean;
}

export function parseQuestionText(text: string): ParsedQuestion {
  // Split on option markers (A) (B) (C) (D) at word boundaries
  // Handles options containing brackets, symbols, math expressions
  const optionMarkerRegex = /\(\s*([A-Da-d])\s*\)/g;
  
  const markers: { label: string; index: number }[] = [];
  let match;

  while ((match = optionMarkerRegex.exec(text)) !== null) {
    markers.push({ label: match[1].toUpperCase(), index: match.index });
  }

  // Need at least 2 markers to be MCQ
  if (markers.length < 2) {
    return { stem: text, options: null, isMCQ: false };
  }

  // First marker must be A or a
  if (markers[0].label !== "A") {
    return { stem: text, options: null, isMCQ: false };
  }

  // Extract stem — everything before first (A)
  const stem = text.slice(0, markers[0].index).trim();

  // Extract each option text — from after its marker to before next marker
  const options: { label: string; text: string }[] = markers.map((marker, i) => {
    const start = marker.index + text.slice(marker.index).indexOf(")") + 1;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    return {
      label: marker.label,
      text: text.slice(start, end).trim(),
    };
  });

  return { stem, options, isMCQ: true };
}