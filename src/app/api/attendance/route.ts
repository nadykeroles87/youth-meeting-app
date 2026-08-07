import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, members, meetings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, memberId, qrCode, recordedBy } = body;

    let resolvedMemberId = memberId;

    // If QR code provided, find member
    if (qrCode && !memberId) {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.qrCode, qrCode));

      if (!member) {
        return NextResponse.json({ error: "QR Code غير معروف" }, { status: 404 });
      }
      resolvedMemberId = member.id;
    }

    if (!resolvedMemberId) {
      return NextResponse.json({ error: "يجب تحديد الشخص" }, { status: 400 });
    }

    // Check if already checked in
    const existing = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.meetingId, parseInt(meetingId)),
          eq(attendance.memberId, parseInt(resolvedMemberId))
        )
      );

    if (existing.length > 0) {
      // Get member name
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.id, parseInt(resolvedMemberId)));
      return NextResponse.json(
        { error: `${member?.name || "الشخص"} تم تسجيل حضوره بالفعل`, alreadyRecorded: true },
        { status: 409 }
      );
    }

    const [record] = await db
      .insert(attendance)
      .values({
        meetingId: parseInt(meetingId),
        memberId: parseInt(resolvedMemberId),
        recordedBy: recordedBy ? parseInt(recordedBy) : null,
        checkedInAt: new Date(),
      })
      .returning();

    // Return with member name
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, parseInt(resolvedMemberId)));

    return NextResponse.json({ ...record, memberName: member?.name }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");
    const memberId = searchParams.get("memberId");

    if (!meetingId || !memberId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await db
      .delete(attendance)
      .where(
        and(
          eq(attendance.meetingId, parseInt(meetingId)),
          eq(attendance.memberId, parseInt(memberId))
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to remove attendance" }, { status: 500 });
  }
}
