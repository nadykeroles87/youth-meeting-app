import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetings, attendance, members } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";

export async function GET() {
  try {
    const allMeetings = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        topic: meetings.topic,
        speaker: meetings.speaker,
        meetingDate: meetings.meetingDate,
        location: meetings.location,
        notes: meetings.notes,
        isActive: meetings.isActive,
        createdAt: meetings.createdAt,
      })
      .from(meetings)
      .orderBy(desc(meetings.meetingDate));

    // Get attendance count for each meeting
    const meetingsWithCount = await Promise.all(
      allMeetings.map(async (meeting: any) => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(attendance)
          .where(eq(attendance.meetingId, meeting.id));
        return { ...meeting, attendanceCount: Number(value) };
      })
    );

    return NextResponse.json(meetingsWithCount);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [meeting] = await db
      .insert(meetings)
      .values({
        title: body.title,
        topic: body.topic || null,
        speaker: body.speaker || null,
        meetingDate: body.meetingDate,
        location: body.location || "كنيسة العذراء - العاشر من رمضان",
        notes: body.notes || null,
        isActive: body.isActive !== false,
      })
      .returning();

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
