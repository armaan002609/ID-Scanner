// Simple heuristic-based mapping for demo purposes.
// In a real production app, this would be heavily customized per institution.

export interface ExtractedFields {
  name: string;
  course: string;
  rollNo: string;
  confidence: 'high' | 'low' | 'not_found';
}

export function parseOCRText(text: string): ExtractedFields {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let name = '';
  let course = '';
  let rollNo = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('name') && !name) {
      name = line.replace(/.*name[\s:-]*/i, '').trim();
    } else if (lowerLine.includes('course') && !course) {
      course = line.replace(/.*course[\s:-]*/i, '').trim();
    } else if ((lowerLine.includes('roll') || lowerLine.includes('enroll')) && !rollNo) {
      rollNo = line.replace(/.*roll(?: no| number)?[\s:-]*/i, '').trim();
    }
  }

  // Fallbacks if newlines were destroyed by Tesseract
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  if (!rollNo) {
    const rollNoMatch = normalizedText.match(/([A-Z]{2,4}[- ]?\d{4,8})/i);
    if (rollNoMatch) rollNo = rollNoMatch[1];
  }

  if (!name) {
    // Attempt to find capitalized words that might be a name
    const capsMatch = normalizedText.match(/(?:Name|Student)[:\-\s]*([A-Za-z\s]+)/i);
    if (capsMatch) name = capsMatch[1].trim();
  }

  // Determine overall confidence
  let confidence: 'high' | 'low' | 'not_found' = 'not_found';
  const foundFields = [name, rollNo, course].filter(Boolean).length;
  
  if (foundFields === 3) confidence = 'high';
  else if (foundFields > 0) confidence = 'low';

  return {
    name,
    course,
    rollNo,
    confidence
  };
}
