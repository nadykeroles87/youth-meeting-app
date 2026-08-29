import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaItems, servants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const fileType = searchParams.get("fileType");

    let results = await db
      .select({
        id: mediaItems.id,
        title: mediaItems.title,
        description: mediaItems.description,
        fileUrl: mediaItems.fileUrl,
        fileType: mediaItems.fileType,
        category: mediaItems.category,
        uploadedBy: mediaItems.uploadedBy,
        createdAt: mediaItems.createdAt,
        servantName: servants.name,
      })
      .from(mediaItems)
      .leftJoin(servants, eq(mediaItems.uploadedBy, servants.id))
      .orderBy(desc(mediaItems.createdAt));

    if (category) {
      results = results.filter((m: any) => m.category === category);
    }

    if (fileType) {
      results = results.filter((m: any) => m.fileType === fileType);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch media items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.fileUrl) {
      return NextResponse.json({ error: "العنوان ورابط الملف مطلوبان" }, { status: 400 });
    }

    let parsedUploadedBy = body.uploadedBy ? parseInt(body.uploadedBy) : null;
    if (parsedUploadedBy && isNaN(parsedUploadedBy)) {
      parsedUploadedBy = null;
    }

    let item;
    try {
      [item] = await db
        .insert(mediaItems)
        .values({
          title: body.title,
          description: body.description || null,
          fileUrl: body.fileUrl,
          fileType: body.fileType || "pdf",
          category: body.category || "general",
          uploadedBy: parsedUploadedBy,
        })
        .returning();
    } catch (insertError: any) {
      // If foreign key constraint fails on uploaded_by, retry with uploadedBy: null
      if (parsedUploadedBy && (insertError?.code === "23503" || insertError?.message?.includes("foreign key") || insertError?.message?.includes("violates foreign key"))) {
        [item] = await db
          .insert(mediaItems)
          .values({
            title: body.title,
            description: body.description || null,
            fileUrl: body.fileUrl,
            fileType: body.fileType || "pdf",
            category: body.category || "general",
            uploadedBy: null,
          })
          .returning();
      } else {
        throw insertError;
      }
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to add media item:", error);
    return NextResponse.json({ error: "فشل حفظ بيانات الملف في قاعدة البيانات" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await db.delete(mediaItems).where(eq(mediaItems.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete media item" }, { status: 500 });
  }
}
