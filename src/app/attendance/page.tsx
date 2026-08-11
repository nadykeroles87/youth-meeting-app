"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { CheckSquare, QrCode, Search, CalendarDays, X, CheckCircle, AlertCircle, ArrowLeft, Camera } from "lucide-react";
import { Scanner } from '@yudiel/react-qr-scanner';

type Meeting = {
  id: number;
  title: string;
  meetingDate: string;
  attendanceCount: number;
};

type Member = {
  id: number;
  name: string;
  phone: string | null;
  qrCode: string | null;
  familyName: string | null;
  gender: string;
};

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function AttendancePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [recentAttendees, setRecentAttendees] = useState<{ name: string; time: string }[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    fetchMeetings();
    fetchMembers();
  }, []);

  const fetchMeetings = async () => {
    const res = await fetch("/api/meetings");
    const data = await res.json();
    setMeetings(data.slice(0, 10));
    // Auto-select most recent
    if (data.length > 0) setSelectedMeeting(data[0]);
    setLoadingMeetings(false);
  };

  const fetchMembers = async () => {
    const res = await fetch("/api/members");
    const data = await res.json();
    setAllMembers(data);
  };

  useEffect(() => {
    if (!searchQuery) {
      setFilteredMembers([]);
      return;
    }
    const s = searchQuery.toLowerCase();
    setFilteredMembers(
      allMembers
        .filter((m) => m.name.toLowerCase().includes(s) || (m.phone && m.phone.includes(s)))
        .slice(0, 8)
    );
  }, [searchQuery, allMembers]);

  const showMessage = (type: "success" | "error" | "warning", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const recordAttendance = async (memberId: number, memberName: string) => {
    if (!selectedMeeting) {
      showMessage("error", "اختر اجتماعًا أولاً");
      return;
    }

    setAddingId(memberId);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId: selectedMeeting.id, memberId }),
    });
    const data = await res.json();
    setAddingId(null);

    if (res.status === 409) {
      showMessage("warning", `⚠️ ${data.error}`);
    } else if (!res.ok) {
      showMessage("error", "حدث خطأ أثناء تسجيل الحضور");
    } else {
      showMessage("success", `✅ تم تسجيل حضور ${memberName}`);
      setSearchQuery("");
      const now = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      setRecentAttendees((prev) => [{ name: memberName, time: now }, ...prev].slice(0, 10));
      setSelectedMeeting((prev) =>
        prev ? { ...prev, attendanceCount: prev.attendanceCount + 1 } : prev
      );
    }
  };

  const submitQrCode = async (code: string) => {
    if (!code || !selectedMeeting) return;

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId: selectedMeeting.id, qrCode: code }),
    });
    const data = await res.json();
    setQrInput("");

    if (res.status === 409) {
      showMessage("warning", `⚠️ ${data.error}`);
    } else if (!res.ok) {
      showMessage("error", data.error || "QR Code غير معروف");
    } else {
      showMessage("success", `✅ تم تسجيل حضور ${data.memberName}`);
      const now = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      setRecentAttendees((prev) => [{ name: data.memberName, time: now }, ...prev].slice(0, 10));
      setSelectedMeeting((prev) =>
        prev ? { ...prev, attendanceCount: prev.attendanceCount + 1 } : prev
      );
    }
  };

  const handleQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQrCode(qrInput);
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
            <CheckSquare size={24} className="text-amber-600" />
            تسجيل الحضور
          </h1>
          <p className="text-stone-500 text-sm mt-1">سجّل حضور الشباب في الاجتماع</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Select Meeting */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
              <h2 className="font-bold text-stone-700 mb-3 text-sm flex items-center gap-2">
                <CalendarDays size={16} className="text-amber-600" />
                اختر الاجتماع
              </h2>
              {loadingMeetings ? (
                <div className="h-12 bg-amber-50 rounded-xl animate-pulse" />
              ) : meetings.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-stone-400 text-sm mb-2">لا توجد اجتماعات</p>
                  <Link href="/meetings/new" className="text-amber-600 text-sm hover:underline">
                    أضف اجتماعاً أولاً
                  </Link>
                </div>
              ) : (
                <div className="grid gap-2">
                  {meetings.map((m) => {
                    const date = new Date(m.meetingDate);
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMeeting(m)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right w-full ${
                          selectedMeeting?.id === m.id
                            ? "border-amber-500 bg-amber-50"
                            : "border-transparent bg-stone-50 hover:border-amber-200"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs flex-shrink-0 ${
                          selectedMeeting?.id === m.id ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"
                        }`}>
                          <span className="font-bold text-sm">{date.getDate()}</span>
                          <span>{monthNames[date.getMonth()].slice(0, 3)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-stone-800 text-sm truncate">{m.title}</p>
                          <p className="text-xs text-stone-400">{m.attendanceCount} حاضر حتى الآن</p>
                        </div>
                        {selectedMeeting?.id === m.id && (
                          <CheckCircle size={18} className="text-amber-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* QR Code Input */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
              <h2 className="font-bold text-stone-700 mb-3 text-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QrCode size={16} className="text-amber-600" />
                  تسجيل بـ QR Code
                </div>
                <button
                  onClick={() => setIsScannerOpen(!isScannerOpen)}
                  disabled={!selectedMeeting}
                  className="flex items-center gap-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Camera size={14} />
                  {isScannerOpen ? "إغلاق الكاميرا" : "فتح الكاميرا"}
                </button>
              </h2>
              
              {isScannerOpen && selectedMeeting && (
                <div className="mb-4 rounded-xl overflow-hidden border-2 border-amber-300 relative bg-black">
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        const scannedCode = result[0].rawValue;
                        setQrInput(scannedCode);
                        submitQrCode(scannedCode);
                        setIsScannerOpen(false); // Close camera after successful scan
                      }
                    }}
                  />
                  <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                    <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full">وجه الكاميرا نحو الكود</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleQrSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="امسح الـ QR Code أو اكتب الكود..."
                  className="flex-1 border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!qrInput || !selectedMeeting}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-200 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  تسجيل
                </button>
              </form>
              <p className="text-xs text-stone-400 mt-2">
                💡 يمكنك استخدام الكاميرا أو توصيل جهاز قارئ QR وسيعمل تلقائياً
              </p>
            </div>

            {/* Search by Name */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
              <h2 className="font-bold text-stone-700 mb-3 text-sm flex items-center gap-2">
                <Search size={16} className="text-amber-600" />
                بحث بالاسم
              </h2>
              <div className="relative">
                <div className="flex items-center gap-2 border-2 border-amber-200 rounded-xl px-4 py-2.5 focus-within:border-amber-500 transition-colors">
                  <Search size={16} className="text-amber-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="اكتب اسم الشاب أو رقم الموبايل..."
                    className="flex-1 outline-none text-sm text-stone-700 placeholder-stone-400"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}>
                      <X size={16} className="text-stone-400" />
                    </button>
                  )}
                </div>

                {filteredMembers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-amber-200 rounded-xl shadow-xl z-10 overflow-hidden">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => recordAttendance(m.id, m.name)}
                        disabled={addingId === m.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors border-b border-amber-50 last:border-0"
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          m.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {m.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-sm font-semibold text-stone-800">{m.name}</p>
                          <p className="text-xs text-stone-400">
                            {m.phone || "—"} {m.familyName ? `• ${m.familyName}` : ""}
                          </p>
                        </div>
                        <span className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg">
                          {addingId === m.id ? "..." : "تسجيل ✓"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Status & Recent */}
          <div className="space-y-4">
            {/* Toast */}
            {message && (
              <div
                className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : message.type === "warning"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                )}
                {message.text}
              </div>
            )}

            {/* Meeting Counter */}
            {selectedMeeting && (
              <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-5 text-white text-center">
                <p className="text-amber-200 text-sm mb-1">{selectedMeeting.title}</p>
                <p className="text-6xl font-bold">{selectedMeeting.attendanceCount}</p>
                <p className="text-amber-300 text-sm mt-1">شخص حاضر</p>
                <Link
                  href={`/meetings/${selectedMeeting.id}`}
                  className="inline-flex items-center gap-1 mt-4 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  عرض التفاصيل
                  <ArrowLeft size={12} />
                </Link>
              </div>
            )}

            {/* Recent Attendees */}
            {recentAttendees.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
                <div className="p-4 border-b border-amber-50">
                  <h3 className="font-bold text-stone-700 text-sm">آخر المسجلين</h3>
                </div>
                <div className="divide-y divide-amber-50">
                  {recentAttendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{a.name}</p>
                      </div>
                      <span className="text-xs text-stone-400">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
