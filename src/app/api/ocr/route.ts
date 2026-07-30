import { NextResponse } from 'next/server';
import { parseOCRText } from '@/lib/ocr-mapping';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, geminiApiKey: clientApiKey } = body; // Base64 encoded image string and optional API key

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check if Gemini API credentials exist from client or server
    const geminiApiKey = clientApiKey || process.env.GEMINI_API_KEY;

    let rawText = '';
    let extractedFields: any = { name: '', course: '', rollNo: '', confidence: 'not_found' };

    if (geminiApiKey) {
      const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      
      const prompt = `Extract the text from this ID card. I need the name, course, and roll number (or student ID).
      Return ONLY a JSON object with the exact keys: "name", "course", "rollNo".
      If you cannot find a value, use an empty string.`;

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      const geminiData = await geminiResponse.json();
      
      if (geminiData.error) {
        throw new Error(geminiData.error.message);
      }

      const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      try {
        const parsed = JSON.parse(textOutput);
        extractedFields = {
          name: parsed.name || '',
          course: parsed.course || '',
          rollNo: parsed.rollNo || '',
          confidence: (parsed.name && parsed.course && parsed.rollNo) ? 'high' : 
                      (parsed.name || parsed.course || parsed.rollNo) ? 'low' : 'not_found'
        };
        rawText = textOutput;
      } catch (e) {
        console.error('Failed to parse Gemini JSON:', textOutput);
        rawText = textOutput;
        extractedFields = parseOCRText(rawText); // Fallback if it fails to give JSON
      }
      
    } else {
      // Mocked response for development when API key is not available
      console.log('No GEMINI_API_KEY found, using mock OCR response.');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      rawText = `
        XYZ University
        Name: John Doe
        Course: B.Tech Computer Science
        Roll No: CS2024001
        DOB: 01/01/2000
      `;
      extractedFields = parseOCRText(rawText);
    }

    return NextResponse.json({ 
      success: true, 
      rawText, 
      fields: extractedFields 
    });

  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process image. Check Vercel logs.' 
    }, { status: 500 });
  }
}
