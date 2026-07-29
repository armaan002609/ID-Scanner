// Simple heuristic-based mapping for demo purposes.
// In a real production app, this would be heavily customized per institution.

export interface ExtractedFields {
  name: string;
  course: string;
  rollNo: string;
  confidence: 'high' | 'low' | 'not_found';
}

export function parseOCRText(text: string): ExtractedFields {
  // Normalize whitespace
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Basic heuristics for a generic ID card
  // These regexes are highly dependent on the card format.
  
  // Look for something that resembles a Roll Number (e.g., 2-4 letters followed by numbers)
  const rollNoMatch = normalizedText.match(/([A-Z]{2,4}[- ]?\d{4,8})/i);
  const rollNo = rollNoMatch ? rollNoMatch[1].replace(/[- ]/g, '').toUpperCase() : '';

  // Look for keywords
  const nameMatch = normalizedText.match(/(?:Name|Student)[:\-\s]*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i);
  let name = nameMatch ? nameMatch[1] : '';

  const courseMatch = normalizedText.match(/(?:Course|Program|Branch)[:\-\s]*([A-Za-z.\- ]+)/i);
  let course = courseMatch ? courseMatch[1].trim() : '';

  // Fallbacks based on typical positional or structural features if keyword matching fails
  if (!name) {
    // Attempt to find capitalized words that might be a name
    const capsMatch = normalizedText.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
    if (capsMatch) name = capsMatch[1];
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
