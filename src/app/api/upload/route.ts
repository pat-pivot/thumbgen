import { NextRequest, NextResponse } from "next/server";
import { uploadImage, getImageUrl, dataUrlToBuffer } from "@/lib/r2";
import { v4 as uuid } from "uuid";

// POST /api/upload — upload a base64 image to R2, return the key and signed URL
export async function POST(request: NextRequest) {
  try {
    const { dataUrl, folder = "uploads" } = await request.json();

    if (!dataUrl) {
      return NextResponse.json({ error: "dataUrl is required" }, { status: 400 });
    }

    const { buffer, contentType } = dataUrlToBuffer(dataUrl);
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
      ? "webp"
      : "jpg";
    const key = `${folder}/${uuid()}.${ext}`;

    await uploadImage(key, buffer, contentType);
    const url = await getImageUrl(key);

    return NextResponse.json({ key, url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
