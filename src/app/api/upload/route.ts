import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

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
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract file extension and safe name
    const originalName = file.name || "file";
    const ext = path.extname(originalName).toLowerCase();
    const rawBaseName = path.basename(originalName, ext);
    const safeBaseName = rawBaseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "upload";
    const timestamp = Date.now();
    const finalFileName = `${timestamp}_${safeBaseName}${ext}`;

    const isPdf = ext === ".pdf";

    // ── For PDF files: Prioritize Vercel Blob / Local storage to bypass Cloudinary's default PDF ACL lock ──
    if (isPdf && blobToken) {
      try {
        const blob = await put(`uploads/${finalFileName}`, file, {
          access: "public",
          contentType: "application/pdf",
        });

        return NextResponse.json({
          success: true,
          fileUrl: blob.url,
          fileName: file.name,
          fileSize: file.size,
          provider: "vercel-blob",
        });
      } catch (blobErr) {
        console.warn("Vercel blob upload for PDF failed, trying Cloudinary/Local:", blobErr);
      }
    }

    // ── Cloudinary (Ideal for PPTX, Videos, Images, Docs) ──
    if (cloudName && apiKey && apiSecret && cloudName !== "YOUR_CLOUD_NAME_HERE") {
      try {
        // Determine Cloudinary resource_type
        let resourceType: "auto" | "raw" | "image" | "video" = "auto";
        if (ext === ".pptx" || ext === ".ppt" || ext === ".docx" || ext === ".doc" || ext === ".xlsx" || ext === ".xls" || ext === ".txt") {
          resourceType = "raw";
        } else if (ext === ".mp4" || ext === ".webm" || ext === ".mov" || ext === ".avi") {
          resourceType = "video";
        } else if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp" || ext === ".svg") {
          resourceType = "image";
        } else if (isPdf) {
          resourceType = "raw";
        }

        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "youth-meeting-app/uploads",
              resource_type: resourceType,
              access_mode: "public",
              // Keep extension in public_id so URL maintains .pdf / .pptx / etc.
              public_id: `${timestamp}_${safeBaseName}${ext}`,
              use_filename: true,
              unique_filename: false,
            },
            (error, uploaded) => {
              if (error || !uploaded) {
                reject(error || new Error("Cloudinary upload failed"));
                return;
              }
              resolve({ secure_url: uploaded.secure_url });
            }
          );

          uploadStream.end(buffer);
        });

        if (result?.secure_url) {
          return NextResponse.json({
            success: true,
            fileUrl: result.secure_url,
            fileName: file.name,
            fileSize: file.size,
            provider: "cloudinary",
          });
        }
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, falling back to backup storage:", cloudErr);
      }
    }

    // ── Vercel Blob (Fallback for non-PDFs) ──
    if (blobToken) {
      try {
        const blob = await put(`uploads/${finalFileName}`, file, {
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
      } catch (blobErr) {
        console.warn("Vercel blob upload failed, trying local fallback:", blobErr);
      }
    }

    // ── Priority 3: Local Storage (Fallback) ──
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, finalFileName), buffer);

      return NextResponse.json({
        success: true,
        fileUrl: `/uploads/${finalFileName}`,
        fileName: file.name,
        fileSize: file.size,
        provider: "local",
      });
    } catch (localErr) {
      console.error("Local file storage failed:", localErr);
    }

    return NextResponse.json({
      error: "تعذر حفظ الملف على أي من مزودات التخزين المتاحة.",
    }, { status: 500 });
  } catch (error: any) {
    console.error("Upload handler error:", error);
    
    const message = error?.message || "";
    if (message.includes("size") || message.includes("limit") || message.includes("too large")) {
      return NextResponse.json({ 
        error: "حجم الملف كبير جداً. حاول تقليل حجم الملف أو ضغطه أولاً." 
      }, { status: 413 });
    }
    
    return NextResponse.json({ 
      error: "حدث خطأ غير متوقع أثناء رفع الملف. يرجى المحاولة مرة أخرى." 
    }, { status: 500 });
  }
}

