"use client";

import { useEffect, useState, use } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Users,
  MapPin,
  Mic,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Attendee = {
  attendanceId: number;
  memberId: number;
  memberName: string | null;
  memberPhone: string | null;
  memberGender: string | null;
  familyName: string | null;
  checkedInAt: string;
};

type Meeting = {
  id: number;
  title: string;
  topic: string | null;
  speaker: string | null;
  meetingDate: string;
  location: string | null;
  notes: string | null;
  imageUrl?: string | null;
  attendees: Attendee[];
  attendanceCount: number;
};

type Member = {
  id: number;
  name: string;
  phone: string | null;
  familyName: string | null;
  gender: string;
};

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { role } = useAuth();
  const isServant = role === "servant";
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  const fetchMeeting = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      setMeeting(data);
    } catch (err) {
      // Offline fallback: try to find the meeting in the bulk cache
      try {
        const cached = localStorage.getItem("offline_cache_meetings") || localStorage.getItem("offline_cache_attendance_meetings");
        if (cached) {
          const parsed = JSON.parse(cached);
          const meetingsList = parsed.data || parsed;
          const m = meetingsList.find((x: any) => x.id === parseInt(id));
          if (m) {
            // Fill missing arrays to prevent UI crash
            setMeeting({ ...m, attendees: [], attendanceCount: m.attendanceCount || 0 });
          }
        }
      } catch (e) { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members?status=active");
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      setAllMembers(data);
    } catch (err) {
      try {
        const cached = localStorage.getItem("offline_cache_members_servants") || localStorage.getItem("offline_cache_members");
        if (cached) {
          const parsed = JSON.parse(cached);
          const membersList = parsed.data || parsed;
          setAllMembers(membersList.filter((m: any) => m.status === "active"));
        }
      } catch (e) { /* ignore */ }
    }
  };

  useEffect(() => {
    fetchMeeting();
    fetchMembers();
  }, [id]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredMembers([]);
      return;
    }
    const s = searchQuery.toLowerCase();
    const attendeeIds = new Set(meeting?.attendees.map((a) => a.memberId) || []);
    setFilteredMembers(
      allMembers
        .filter((m) => !attendeeIds.has(m.id))
        .filter((m) => m.name.toLowerCase().includes(s) || (m.phone && m.phone.includes(s)))
        .slice(0, 8)
    );
  }, [searchQuery, allMembers, meeting]);

  const showMessage = (type: "success" | "error" | "warning", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddAttendance = async (memberId: number) => {
    setAddingId(memberId);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId: id, memberId }),
    });
    const data = await res.json();
    setAddingId(null);

    if (res.status === 409) {
      showMessage("warning", data.error);
    } else if (!res.ok) {
      showMessage("error", "حدث خطأ أثناء تسجيل الحضور");
    } else {
      showMessage("success", `✅ تم تسجيل حضور ${data.memberName}`);
      setSearchQuery("");
      fetchMeeting();
    }
  };

  const handleRemoveAttendance = async (memberId: number, memberName: string | null) => {
    if (!confirm(`هل تريد إلغاء حضور ${memberName}؟`)) return;
    await fetch(`/api/attendance?meetingId=${id}&memberId=${memberId}`, { method: "DELETE" });
    fetchMeeting();
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-amber-100 rounded-2xl" />
          <div className="h-64 bg-white rounded-2xl" />
        </div>
      </PageWrapper>
    );
  }

  if (!meeting) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <p className="text-stone-500">الاجتماع غير موجود</p>
          <Link href="/meetings" className="text-amber-600 mt-2 inline-block">
            العودة للاجتماعات
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const date = new Date(meeting.meetingDate);

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/meetings" className="hover:text-amber-700">الاجتماعات</Link>
          <ChevronRight size={14} />
          <span className="text-stone-800 font-medium">{meeting.title}</span>
        </div>

        {/* Meeting Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-900 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{meeting.title}</h1>
              {meeting.topic && (
                <p className="text-amber-200 text-lg mt-1">"{meeting.topic}"</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-amber-200 text-sm">
                  <CalendarDays size={14} />
                  {date.getDate()} {monthNames[date.getMonth()]} {date.getFullYear()}
                </span>
                {meeting.speaker && (
                  <span className="flex items-center gap-1.5 text-amber-200 text-sm">
                    <Mic size={14} />
                    {meeting.speaker}
                  </span>
                )}
                {meeting.location && (
                  <span className="flex items-center gap-1.5 text-amber-200 text-sm">
                    <MapPin size={14} />
                    {meeting.location}
                  </span>
                )}
              </div>
            </div>
            <div className="text-center bg-white/20 rounded-2xl p-4 flex-shrink-0">
              {isServant ? (
                <>
                  <p className="text-4xl font-bold">{meeting.attendanceCount}</p>
                  <p className="text-amber-200 text-xs mt-1">حاضر</p>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Meeting Image */}
        {meeting.imageUrl && (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-amber-100">
            <img src={meeting.imageUrl} alt={meeting.title} className="w-full h-auto object-cover max-h-96" />
          </div>
        )}

        {/* Toast Message */}
        {message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl font-medium text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : message.type === "warning"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            {message.text}
          </div>
        )}

        {/* Add Attendance — servants only */}
        {isServant && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
            <h2 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-amber-600" />
              تسجيل الحضور
            </h2>

            <div className="relative">
              <div className="flex items-center gap-2 border-2 border-amber-300 rounded-xl px-4 py-3 focus-within:border-amber-500 transition-colors">
                <Search size={18} className="text-amber-500 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  placeholder="ابحث باسم الشاب أو رقم الموبايل..."
                  className="flex-1 outline-none text-sm text-stone-700 placeholder-stone-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-stone-400 hover:text-stone-600">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchQuery && filteredMembers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-amber-200 rounded-xl shadow-lg z-10 overflow-hidden">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleAddAttendance(m.id)}
                      disabled={addingId === m.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-right border-b border-amber-50 last:border-0"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        m.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {m.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-semibold text-stone-800">{m.name}</p>
                        <p className="text-xs text-stone-400">{m.phone || "—"} {m.familyName ? `• ${m.familyName}` : ""}</p>
                      </div>
                      <span className="text-xs text-amber-600 font-medium">
                        {addingId === m.id ? "جاري..." : "تسجيل"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && filteredMembers.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-amber-200 rounded-xl shadow-lg z-10 p-4 text-center text-stone-400 text-sm">
                  لم يتم إيجاد نتائج
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendees List — servants only */}
        {isServant && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-amber-50">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <Users size={18} className="text-amber-600" />
                الحضور ({meeting.attendanceCount})
              </h2>
            </div>

            {meeting.attendees.length === 0 ? (
              <div className="p-12 text-center text-stone-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p>لم يتم تسجيل أي حضور بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-amber-50">
                {meeting.attendees.map((attendee, index) => (
                  <div key={attendee.attendanceId} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50 transition-colors group">
                    <span className="text-stone-300 text-sm w-6 text-center flex-shrink-0">{index + 1}</span>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      attendee.memberGender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {attendee.memberName?.slice(0, 1) || "؟"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{attendee.memberName}</p>
                      <p className="text-xs text-stone-400">
                        {attendee.familyName || "—"}
                        <span className="mx-1">•</span>
                        {new Date(attendee.checkedInAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAttendance(attendee.memberId, attendee.memberName)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
