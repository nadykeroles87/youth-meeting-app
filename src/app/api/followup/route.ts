import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { followupNotes, members, servants, attendance, meetings } from "@/db/schema";
import { eq, desc, lt, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const absentWeeks = searchParams.get("absentWeeks");

    if (absentWeeks) {
      // Get members who haven't attended in X weeks
      const weeks = parseInt(absentWeeks);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);

      // Get all active members
      const allMembers = await db
        .select()
        .from(members)
        .where(eq(members.status, "active"));

      // For each member, check last attendance
      const absentMembers = await Promise.all(
        allMembers.map(async (member: any) => {
          const lastAttendance = await db
            .select({ checkedInAt: attendance.checkedInAt, meetingDate: meetings.meetingDate })
            .from(attendance)
            .leftJoin(meetings, eq(attendance.meetingId, meetings.id))
            .where(eq(attendance.memberId, member.id))
            .orderBy(desc(attendance.checkedInAt))
            .limit(1);

          const lastDate = lastAttendance[0]?.checkedInAt;
          const isAbsent = !lastDate || new Date(lastDate) < cutoffDate;

          if (isAbsent) {
            return {
              ...member,
              lastAttendance: lastDate || null,
              absentDays: lastDate
                ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
                : null,
            };
          }
          return null;
        })
      );

      return NextResponse.json(absentMembers.filter(Boolean));
    }

    if (memberId) {
      const notes = await db
        .select({
          id: followupNotes.id,
          note: followupNotes.note,
          createdAt: followupNotes.createdAt,
          servantName: servants.name,
        })
        .from(followupNotes)
        .leftJoin(servants, eq(followupNotes.servantId, servants.id))
        .where(eq(followupNotes.memberId, parseInt(memberId)))
        .orderBy(desc(followupNotes.createdAt));

      return NextResponse.json(notes);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch followup" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [note] = await db
      .insert(followupNotes)
      .values({
        memberId: parseInt(body.memberId),
        servantId: body.servantId ? parseInt(body.servantId) : null,
        note: body.note,
      })
      .returning();

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create followup note" }, { status: 500 });
  }
}
