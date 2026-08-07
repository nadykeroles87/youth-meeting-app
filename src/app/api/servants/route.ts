import { NextResponse } from "next/server";
import { db } from "@/db";
import { servants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select({
        id: servants.id,
        name: servants.name,
        phone: servants.phone,
        email: servants.email,
        role: servants.role,
      })
      .from(servants)
      .where(eq(servants.isActive, true))
      .orderBy(desc(servants.createdAt));

    return NextResponse.json(list);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch servants" }, { status: 500 });
  }
}
