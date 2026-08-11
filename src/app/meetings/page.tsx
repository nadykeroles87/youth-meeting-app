"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { CalendarDays, Plus, Users, ChevronLeft, MapPin, Mic, Trash2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Meeting = {
  id: number;
  title: string;
  topic: string | null;
  speaker: string | null;
  meetingDate: string;
  location: string | null;
  attendanceCount: number;
  imageUrl?: string | null;
  isActive: boolean;
};

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const isServant = role === "servant";

  const fetchMeetings = async () => {
    const res = await fetch("/api/meetings");
    const data = await res.json();
    setMeetings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاجتماع؟")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    fetchMeetings();
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <CalendarDays size={24} className="text-amber-600" />
              الاجتماعات
            </h1>
            <p className="text-stone-500 text-sm mt-1">إجمالي {meetings.length} اجتماع</p>
          </div>
          {isServant && (
            <Link
              href="/meetings/new"
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md"
            >
              <Plus size={16} />
              اجتماع جديد
            </Link>
          )}
        </div>

        {/* Meetings Grid */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-amber-100">
            <CalendarDays size={60} className="mx-auto text-amber-200 mb-4" />
            <h3 className="text-xl font-bold text-stone-700 mb-2">لا توجد اجتماعات</h3>
            {isServant ? (
              <>
                <p className="text-stone-400 mb-6">ابدأ بإضافة أول اجتماع</p>
                <Link
                  href="/meetings/new"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm"
                >
                  <Plus size={16} />
                  إضافة اجتماع
                </Link>
              </>
            ) : (
              <p className="text-stone-400">سيتم إضافة الاجتماعات قريباً من قبل الخدام.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => {
              const date = new Date(meeting.meetingDate);
              return (
                <div
                  key={meeting.id}
                  className="bg-white rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 transition-all overflow-hidden group"
                >
                  <div className="flex items-stretch">
                    {/* Date Badge */}
                    <div className="w-20 bg-gradient-to-b from-amber-600 to-amber-700 flex flex-col items-center justify-center text-white flex-shrink-0 py-4">
                      <span className="text-3xl font-bold">{date.getDate()}</span>
                      <span className="text-xs text-amber-200">{monthNames[date.getMonth()]}</span>
                      <span className="text-xs text-amber-300">{date.getFullYear()}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-stone-800 text-base">{meeting.title}</h3>
                          {meeting.topic && (
                            <p className="text-amber-700 text-sm mt-0.5 font-medium">"{meeting.topic}"</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {meeting.speaker && (
                              <span className="flex items-center gap-1 text-xs text-stone-500">
                                <Mic size={12} className="text-amber-500" />
                                {meeting.speaker}
                              </span>
                            )}
                            {meeting.location && (
                              <span className="flex items-center gap-1 text-xs text-stone-500">
                                <MapPin size={12} className="text-amber-500" />
                                {meeting.location}
                              </span>
                            )}
                            {isServant && (
                              <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                <Users size={11} />
                                {meeting.attendanceCount} حاضر
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isServant && (
                            <button
                              onClick={() => handleDelete(meeting.id)}
                              className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <Link
                            href={`/meetings/${meeting.id}`}
                            className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
                          >
                            التفاصيل
                            <ChevronLeft size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
