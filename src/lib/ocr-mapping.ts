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
    
    // Fuzzy match for 'name' (could be 'nane', 'n4me', 'nme')
    if (lowerLine.match(/n[a4m]?me/i) && !name) {
      name = line.replace(/.*n[a4m]?me[\s:-]*/i, '').trim();
    } 
    // Fuzzy match for 'course'
    else if (lowerLine.match(/c[o0]ur[s5]e/i) && !course) {
      course = line.replace(/.*c[o0]ur[s5]e[\s:-]*/i, '').trim();
    } 
    // Fuzzy match for 'roll no'
    else if (lowerLine.match(/r[o0]ll|enr[o0]ll/i) && !rollNo) {
      rollNo = line.replace(/.*(?:r[o0]ll|enr[o0]ll)(?:\s*(?:n[o0]|number))?[\s:-]*/i, '').trim();
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
