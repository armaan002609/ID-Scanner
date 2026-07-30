import { NextResponse } from 'next/server';
import { parseOCRText } from '@/lib/ocr-mapping';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, geminiApiKey: clientApiKey, openRouterApiKey } = body; 

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const geminiApiKey = clientApiKey || process.env.GEMINI_API_KEY;

    let rawText = '';
    let extractedFields: any = { name: '', course: '', rollNo: '', confidence: 'not_found' };

    const prompt = `Extract the text from this ID card. I need the name, course, and roll number (or student ID).
    Return ONLY a JSON object with the exact keys: "name", "course", "rollNo".
    If you cannot find a value, use an empty string.`;

    if (openRouterApiKey) {
      console.log('Using OpenRouter API');
      const orUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const orResponse = await fetch(orUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          response_format: { type: "json_object" },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: image } }
              ]
            }
          ]
        })
      });

      const orData = await orResponse.json();
      if (orData.error) {
        throw new Error(orData.error.message || 'OpenRouter API Error');
      }

      const textOutput = orData.choices?.[0]?.message?.content || '{}';
      rawText = textOutput;
      try {
        const parsed = JSON.parse(textOutput);
        extractedFields = {
          name: parsed.name || '',
          course: parsed.course || '',
          rollNo: parsed.rollNo || '',
          confidence: (parsed.name && parsed.course && parsed.rollNo) ? 'high' : 
                      (parsed.name || parsed.course || parsed.rollNo) ? 'low' : 'not_found'
        };
      } catch (e) {
        console.error('Failed to parse OR JSON:', textOutput);
        extractedFields = parseOCRText(textOutput);
      }

    } else if (geminiApiKey) {
      console.log('Using direct Gemini API');
      const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      // Dynamically determine the best available model
      let selectedModel = 'gemini-1.5-flash'; // Fallback
      try {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        const modelsData = await modelsRes.json();
        
        if (modelsData && modelsData.models) {
          const availableModels = modelsData.models.map((m: any) => m.name);
          const preferredModels = [
            'models/gemini-3.5-flash',
            'models/gemini-3.1-flash',
            'models/gemini-3.0-flash',
            'models/gemini-2.5-flash',
            'models/gemini-2.0-flash',
            'models/gemini-1.5-flash-latest',
            'models/gemini-1.5-flash',
            'models/gemini-pro-vision'
          ];
          
          for (const model of preferredModels) {
            if (availableModels.includes(model)) {
              selectedModel = model.replace('models/', '');
              break;
            }
          }
        }
      } catch (e) {
        console.error('Failed to list models, using fallback.', e);
      }

      console.log(`Using model: ${selectedModel}`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`;

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
      rawText = textOutput;
      try {
        const parsed = JSON.parse(textOutput);
        extractedFields = {
          name: parsed.name || '',
          course: parsed.course || '',
          rollNo: parsed.rollNo || '',
          confidence: (parsed.name && parsed.course && parsed.rollNo) ? 'high' : 
                      (parsed.name || parsed.course || parsed.rollNo) ? 'low' : 'not_found'
        };
      } catch (e) {
        console.error('Failed to parse Gemini JSON:', textOutput);
        extractedFields = parseOCRText(textOutput); 
      }
      
    } else {
      console.log('No API key found, using mock OCR response.');
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
