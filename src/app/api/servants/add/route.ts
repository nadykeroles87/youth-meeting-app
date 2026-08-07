import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/db";
import { servants } from "@/db/schema";

// POST /api/servants - Add a new servant (super admin only)
export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { name, phone, email, role } = body;

    if (!name) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }

    const [newServant] = await db
      .insert(servants)
      .values({
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        role: role || "servant",
        isActive: true,
      })
      .returning({ id: servants.id, name: servants.name, phone: servants.phone, role: servants.role });

    return NextResponse.json({ success: true, servant: newServant });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "فشل إضافة الخادم" }, { status: 500 });
  }
}
