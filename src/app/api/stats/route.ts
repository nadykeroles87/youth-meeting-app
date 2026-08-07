import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, meetings, attendance, servants, prayerRequests, announcements, mediaItems } from "@/db/schema";
import { eq, count, desc, and } from "drizzle-orm";

export async function GET() {
  try {
    const [totalMembers] = await db
      .select({ value: count() })
      .from(members)
      .where(eq(members.status, "active"));

    const [totalMeetings] = await db
      .select({ value: count() })
      .from(meetings);

    const [totalServants] = await db
      .select({ value: count() })
      .from(servants);

    const [totalPrayers] = await db
      .select({ value: count() })
      .from(prayerRequests);

    const [totalMedia] = await db
      .select({ value: count() })
      .from(mediaItems);

    // Last meeting attendance
    const lastMeeting = await db
      .select()
      .from(meetings)
      .orderBy(desc(meetings.meetingDate))
      .limit(1);

    let lastMeetingAttendance = 0;
    let lastMeetingTitle = "";
    if (lastMeeting[0]) {
      const [{ value }] = await db
        .select({ value: count() })
        .from(attendance)
        .where(eq(attendance.meetingId, lastMeeting[0].id));
      lastMeetingAttendance = Number(value);
      lastMeetingTitle = lastMeeting[0].title;
    }

    // Birthdays this month
    const today = new Date();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, "0");

    const allMembers = await db
      .select({ name: members.name, birthDate: members.birthDate, phone: members.phone })
      .from(members)
      .where(eq(members.status, "active"));

    const birthdaysThisMonth = allMembers.filter((m: any) => {
      if (!m.birthDate) return false;
      const month = m.birthDate.slice(5, 7);
      return month === currentMonth;
    });

    const maleMembers = await db
      .select({ value: count() })
      .from(members)
      .where(and(eq(members.status, "active"), eq(members.gender, "male")));

    const femaleMembers = await db
      .select({ value: count() })
      .from(members)
      .where(and(eq(members.status, "active"), eq(members.gender, "female")));

    // Recent meetings with attendance
    const recentMeetings = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        meetingDate: meetings.meetingDate,
      })
      .from(meetings)
      .orderBy(desc(meetings.meetingDate))
      .limit(6);

    const recentMeetingsWithCount = await Promise.all(
      recentMeetings.map(async (m: any) => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(attendance)
          .where(eq(attendance.meetingId, m.id));
        return { ...m, attendanceCount: Number(value) };
      })
    );

    const latestAnnouncements = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
      .limit(3);

    return NextResponse.json({
      totalMembers: Number(totalMembers.value),
      totalMeetings: Number(totalMeetings.value),
      totalServants: Number(totalServants.value),
      totalPrayers: Number(totalPrayers.value),
      totalMedia: Number(totalMedia.value),
      lastMeetingAttendance,
      lastMeetingTitle,
      birthdaysThisMonth,
      latestAnnouncements,
      maleCount: Number(maleMembers[0].value),
      femaleCount: Number(femaleMembers[0].value),
      recentMeetings: recentMeetingsWithCount,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
