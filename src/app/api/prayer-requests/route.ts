import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prayerRequests, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const requests = await db
      .select({
        id: prayerRequests.id,
        request: prayerRequests.request,
        isAnonymous: prayerRequests.isAnonymous,
        isPrayed: prayerRequests.isPrayed,
        createdAt: prayerRequests.createdAt,
        memberName: members.name,
        memberId: prayerRequests.memberId,
      })
      .from(prayerRequests)
      .leftJoin(members, eq(prayerRequests.memberId, members.id))
      .orderBy(desc(prayerRequests.createdAt));

    return NextResponse.json(requests);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch prayer requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [request] = await db
      .insert(prayerRequests)
      .values({
        memberId: body.memberId ? parseInt(body.memberId) : null,
        isAnonymous: body.isAnonymous || false,
        request: body.request,
        isPrayed: false,
      })
      .returning();

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create prayer request" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const [updated] = await db
      .update(prayerRequests)
      .set({ isPrayed: body.isPrayed })
      .where(eq(prayerRequests.id, parseInt(body.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update prayer request" }, { status: 500 });
  }
}
