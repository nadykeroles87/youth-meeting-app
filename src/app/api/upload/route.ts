import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Max file size: 5MB
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم اختيار أي ملف" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "حجم الملف كبير جداً (الحد الأقصى 5MB)، استخدم رابطاً خارجياً بدلاً من ذلك" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "application/octet-stream";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // In production (Vercel), store as base64 data URL directly
    // In development, also try to save to local filesystem
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === "production";
    
    if (!isProduction) {
      try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const filename = `${timestamp}_${safeName}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
        return NextResponse.json({
          success: true,
          fileUrl: `/uploads/${filename}`,
          fileName: file.name,
          fileSize: file.size,
        });
      } catch {
        // Fall through to base64 if local write fails
      }
    }

    // Return the base64 data URL - stored in DB via the library API
    return NextResponse.json({
      success: true,
      fileUrl: dataUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
