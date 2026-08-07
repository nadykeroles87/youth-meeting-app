import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetings, attendance, members, servants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meetingId = parseInt(id);

    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Get attendees
    const attendees = await db
      .select({
        attendanceId: attendance.id,
        checkedInAt: attendance.checkedInAt,
        memberId: members.id,
        memberName: members.name,
        memberPhone: members.phone,
        memberGender: members.gender,
        servantName: servants.name,
      })
      .from(attendance)
      .leftJoin(members, eq(attendance.memberId, members.id))
      .leftJoin(servants, eq(members.assignedServantId, servants.id))
      .where(eq(attendance.meetingId, meetingId))
      .orderBy(desc(attendance.checkedInAt));

    return NextResponse.json({ ...meeting, attendees, attendanceCount: attendees.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch meeting" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(meetings)
      .set({
        title: body.title,
        topic: body.topic || null,
        speaker: body.speaker || null,
        meetingDate: body.meetingDate,
        location: body.location || null,
        notes: body.notes || null,
        isActive: body.isActive !== false,
      })
      .where(eq(meetings.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(meetings).where(eq(meetings.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
