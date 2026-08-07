import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, attendance, meetings, followupNotes, servants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);

    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId));

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get attendance history
    const attendanceHistory = await db
      .select({
        id: attendance.id,
        checkedInAt: attendance.checkedInAt,
        meetingTitle: meetings.title,
        meetingDate: meetings.meetingDate,
      })
      .from(attendance)
      .leftJoin(meetings, eq(attendance.meetingId, meetings.id))
      .where(eq(attendance.memberId, memberId))
      .orderBy(desc(attendance.checkedInAt));

    // Get followup notes
    const notes = await db
      .select({
        id: followupNotes.id,
        note: followupNotes.note,
        createdAt: followupNotes.createdAt,
        servantName: servants.name,
      })
      .from(followupNotes)
      .leftJoin(servants, eq(followupNotes.servantId, servants.id))
      .where(eq(followupNotes.memberId, memberId))
      .orderBy(desc(followupNotes.createdAt));

    return NextResponse.json({
      ...member,
      attendanceHistory,
      followupNotes: notes,
      attendanceCount: attendanceHistory.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch member" }, { status: 500 });
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
      .update(members)
      .set({
        name: body.name,
        phone: body.phone || null,
        birthDate: body.birthDate || null,
        gender: body.gender,
        college: body.college || null,
        job: body.job || null,
        address: body.address || null,
        confessionFather: body.confessionFather || null,
        assignedServantId: body.assignedServantId ? parseInt(body.assignedServantId) : null,
        status: body.status,
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(members.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(members).where(eq(members.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
