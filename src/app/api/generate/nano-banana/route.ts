import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-3.1-flash-image-preview";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function stripDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return { mimeType: "image/jpeg", data: dataUrl };
  return { mimeType: match[1], data: match[2] };
}

// Map aspect ratios from our format to what Gemini supports
function mapAspectRatio(ratio: string): string {
  const map: Record<string, string> = {
    "16x9": "16:9",
    "1x1": "1:1",
    "4x3": "4:3",
    "3x2": "3:2",
    "9x16": "9:16",
  };
  return map[ratio] || "16:9";
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const {
      prompt,
      negativePrompt,
      faceImages = [],
      referenceImages = [],
      aspectRatio = "16x9",
    } = body;

    if (!prompt && faceImages.length === 0 && referenceImages.length === 0) {
      return NextResponse.json({ error: "Connect a prompt, face reference, or reference thumbnail" }, { status: 400 });
    }

    // Build the parts array: text first, then face images, then reference images
    // Gemini processes them in order, so labeling matters
    const parts: Array<Record<string, unknown>> = [];

    const hasFace = faceImages.length > 0;
    const hasRef = referenceImages.length > 0;

    let fullPrompt = "";

    const userPrompt = prompt ? ` ${prompt}` : "";

    if (hasFace && hasRef) {
      // Both face + reference thumbnail — the main use case
      fullPrompt = `Generate a YouTube thumbnail image. Recreate the style, composition, layout, and color scheme of the REFERENCE THUMBNAIL provided below, but replace the person in it with the face from the FACE REFERENCE image(s).${userPrompt}\n\nIMPORTANT: The person in the generated image MUST have the exact face from the FACE REFERENCE — same facial structure, eye shape, jawline, skin tone, and hair. The overall thumbnail layout, background, text placement, and visual style should closely match the REFERENCE THUMBNAIL.`;
    } else if (hasFace) {
      // Face only, no reference thumbnail
      fullPrompt = `Generate a YouTube thumbnail image featuring the person from the FACE REFERENCE image(s).${userPrompt}\n\nIMPORTANT: Preserve exact facial structure, eye shape, jawline, and skin texture from the FACE REFERENCE image(s).`;
    } else if (hasRef) {
      // Reference thumbnail only, no face
      fullPrompt = `Generate a YouTube thumbnail image. Use the REFERENCE THUMBNAIL below as a style and composition guide — match its layout, colors, and visual feel.${userPrompt}`;
    } else {
      // Just a text prompt
      fullPrompt = `Generate a YouTube thumbnail image.${userPrompt}`;
    }

    if (negativePrompt) {
      fullPrompt += `\n\nAvoid: ${negativePrompt}`;
    }

    parts.push({ text: fullPrompt });

    // Add face reference images (labeled so Gemini knows which is which)
    if (hasFace) {
      parts.push({ text: "FACE REFERENCE:" });
      for (const img of faceImages) {
        const { mimeType, data } = stripDataUrl(img);
        parts.push({ inline_data: { mime_type: mimeType, data } });
      }
    }

    // Add reference thumbnails
    if (hasRef) {
      parts.push({ text: "REFERENCE THUMBNAIL:" });
      for (const img of referenceImages) {
        const { mimeType, data } = stripDataUrl(img);
        parts.push({ inline_data: { mime_type: mimeType, data } });
      }
    }

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: mapAspectRatio(aspectRatio),
          imageSize: "2K",
        },
      },
    };

    const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: `Gemini API error: ${res.status}` },
        { status: res.status }
      );
    }

    const result = await res.json();
    const images: string[] = [];

    // Extract images from response (Gemini uses camelCase: inlineData, mimeType)
    const candidates = result.candidates || [];
    for (const candidate of candidates) {
      const contentParts = candidate.content?.parts || [];
      for (const part of contentParts) {
        const imgData = part.inlineData || part.inline_data;
        if (imgData) {
          const b64 = imgData.data;
          const mime = imgData.mimeType || imgData.mime_type || "image/png";
          images.push(`data:${mime};base64,${b64}`);
        }
      }
    }

    return NextResponse.json({ images });
  } catch (err) {
    console.error("Nano Banana generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
