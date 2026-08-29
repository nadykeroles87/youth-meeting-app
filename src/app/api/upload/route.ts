import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

// Large file uploads handled manually by formData()

// Increase the maximum duration for uploads (useful on Vercel)
export const maxDuration = 60;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم اختيار أي ملف" }, { status: 400 });
    }

    // Check file size - max 100MB
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `حجم الملف كبير جداً (${(file.size / 1024 / 1024).toFixed(1)} MB). الحد الأقصى هو 100 MB` 
      }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Priority 1: Cloudinary (25GB free, supports all file types)
    if (cloudName && apiKey && apiSecret && cloudName !== "YOUR_CLOUD_NAME_HERE") {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "youth-meeting-app/uploads",
            resource_type: "auto",
            access_mode: "public",
            // Use original filename for better identification
            public_id: `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").replace(/\.[^/.]+$/, "")}`,
          },
          (error, uploaded) => {
            if (error || !uploaded) {
              console.error("Cloudinary upload error:", error);
              reject(error || new Error("Cloudinary upload failed"));
              return;
            }
            resolve({ secure_url: uploaded.secure_url });
          }
        );

        uploadStream.end(buffer);
      });

      return NextResponse.json({
        success: true,
        fileUrl: result.secure_url,
        fileName: file.name,
        fileSize: file.size,
        provider: "cloudinary",
      });
    }

    // Priority 2: Vercel Blob (fallback)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const filename = `uploads/${timestamp}_${safeName}`;

      const blob = await put(filename, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });

      return NextResponse.json({
        success: true,
        fileUrl: blob.url,
        fileName: file.name,
        fileSize: file.size,
        provider: "vercel-blob",
      });
    }

    // Priority 3: Local storage (development only)
    if (process.env.NODE_ENV !== "production") {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const filename = `${timestamp}_${safeName}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);

      return NextResponse.json({
        success: true,
        fileUrl: `/uploads/${filename}`,
        fileName: file.name,
        fileSize: file.size,
        provider: "local",
      });
    }

    return NextResponse.json({
      error: "لم يتم إعداد مزود رفع الملفات. أضف CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET في إعدادات البيئة.",
    }, { status: 500 });
  } catch (error: any) {
    console.error("Upload error:", error);
    
    // More specific error messages
    const message = error?.message || "";
    if (message.includes("size") || message.includes("limit") || message.includes("too large")) {
      return NextResponse.json({ 
        error: "حجم الملف كبير جداً. حاول ملف أصغر أو اضغطه الأول." 
      }, { status: 413 });
    }
    
    return NextResponse.json({ 
      error: "فشل رفع الملف. تأكد من إعداد مزود التخزين (Cloudinary) في بيئة الإنتاج." 
    }, { status: 500 });
  }
}

