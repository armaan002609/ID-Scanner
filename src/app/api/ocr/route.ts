import { NextResponse } from 'next/server';
import { parseOCRText } from '@/lib/ocr-mapping';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body; // Base64 encoded image string

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check if Google Cloud credentials exist
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    let rawText = '';

    if (apiKey) {
      // Call Google Cloud Vision API
      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const visionResponse = await fetch(visionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Data },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
            }
          ]
        })
      });

      const visionData = await visionResponse.json();
      
      if (visionData.error) {
        throw new Error(visionData.error.message);
      }

      rawText = visionData.responses[0]?.fullTextAnnotation?.text || '';
    } else {
      // Mocked response for development when API key is not available
      console.log('No GOOGLE_CLOUD_VISION_API_KEY found, using mock OCR response.');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      rawText = `
        XYZ University
        Name: John Doe
        Course: B.Tech Computer Science
        Roll No: CS2024001
        DOB: 01/01/2000
      `;
    }

    const extractedFields = parseOCRText(rawText);

    return NextResponse.json({ 
      success: true, 
      rawText, 
      fields: extractedFields 
    });

  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
