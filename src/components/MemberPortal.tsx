"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "./AuthProvider";
import { QrCode, CalendarDays, Heart, Bell, Send, CheckCircle2, Loader2, Mic, MapPin, Sparkles } from "lucide-react";

export default function MemberPortal() {
  const { user } = useAuth();
  const [memberData, setMemberData] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestText, setRequestText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [prayerSending, setPrayerSending] = useState(false);
  const [prayerSuccess, setPrayerSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [rMem, rMeet, rAnn] = await Promise.all([
          fetch(`/api/members/${user.id}`),
          fetch("/api/meetings"),
          fetch("/api/announcements"),
        ]);
        if (rMem.ok) setMemberData(await rMem.json());
        if (rMeet.ok) setMeetings(await rMeet.json());
        if (rAnn.ok) setAnnouncements(await rAnn.json());
      } finally { setLoading(false); }
    })();
  }, [user]);

  const handlePrayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim() || !user) return;
    setPrayerSending(true);
    try {
      const res = await fetch("/api/prayer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: user.id, isAnonymous, request: requestText.trim() }),
      });
      if (res.ok) {
        setPrayerSuccess(true);
        setRequestText("");
        setTimeout(() => setPrayerSuccess(false), 4000);
      }
    } finally { setPrayerSending(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-9 h-9 text-amber-600 animate-spin" />
      <p className="text-amber-800 text-sm font-semibold">جاري تحميل بياناتك وكارت الحضور...</p>
    </div>
  );

  const qrValue = memberData?.qrCode || user?.qrCode || `MNK-${user?.id || 1}`;

  return (
    <div className="space-y-6 text-stone-900 font-sans">
      
      {/* ── Welcome Banner (Rich Dark Brown to match Sidebar) ── */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border border-amber-800/50 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-28 h-28 opacity-15 pointer-events-none">
          <Image src="/logo.png" alt="Logo" fill className="object-contain" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-400/30 inline-flex items-center gap-1.5 font-bold">
              <Sparkles size={13} />
              بوابة المخدوم الشخصية
            </span>
            <h1 className="text-2xl lg:text-3xl font-black mt-2 text-white">
              أهلاً بك، {user?.name} ✋
            </h1>
            <p className="text-amber-200/80 text-xs sm:text-sm mt-1">
              كنيسة السيدة العذراء - العاشر من رمضان | اجتماع الشباب
            </p>
          </div>
          {memberData?.family && (
            <span className="bg-amber-400/20 text-amber-200 text-xs font-bold px-4 py-1.5 rounded-full border border-amber-400/30 self-start sm:self-center">
              عائلة {memberData.family.name}
            </span>
          )}
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── QR Personal Attendance Card ── */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-md border border-amber-200/70 text-center space-y-5">
          <div className="flex items-center justify-center gap-2 text-amber-950 font-bold text-base">
            <QrCode size={20} className="text-amber-600" />
            كارت الحضور الشخصي (QR)
          </div>

          {/* QR Box */}
          <div className="bg-amber-950 p-5 rounded-2xl shadow-lg border border-amber-800 inline-block mx-auto">
            <div className="bg-white p-3 rounded-xl shadow-inner">
              <QRCodeSVG value={qrValue} size={170} level="H" className="mx-auto" />
            </div>
            <div className="mt-3 bg-amber-500/20 text-amber-300 font-mono text-xs font-bold py-1.5 px-4 rounded-xl border border-amber-500/30 tracking-wider">
              {qrValue}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="font-extrabold text-lg text-slate-900">{user?.name}</p>
            {memberData?.family && (
              <p className="text-xs text-amber-800 font-bold bg-amber-100/80 inline-block px-3 py-1 rounded-full border border-amber-200">
                {memberData.family.name}
              </p>
            )}
            <p className="text-xs text-stone-500 mt-2 leading-relaxed">
              📲 أظهر هذا الكود للخادم المسؤول عند مدخل القاعة لتسجيل حضورك أسبوعياً
            </p>
          </div>
        </div>

        {/* ── Middle & Right Content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Quick Prayer Request Form ── */}
          <div className="bg-white rounded-3xl p-6 shadow-md border border-amber-200/70 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <Heart size={18} className="text-rose-500 fill-rose-500" />
                تقديم طلب صلاة (سرية وأمانة)
              </h2>
            </div>

            {prayerSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                تم إرسال طلب الصلاة بنجاح. سنصلي من أجلك دائماً! 🙏
              </div>
            )}

            <form onSubmit={handlePrayerSubmit} className="space-y-3.5">
              <textarea
                required
                rows={3}
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder="اكتب طلب الصلاة هنا... (مثال: اذكروني في صلواتكم لأجل الامتحانات / الشفاء / اتخاذ قرار)"
                className="w-full bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none font-medium"
              />

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  إرسال بدون ذكر الاسم (طلب مجهول)
                </label>

                <button
                  type="submit"
                  disabled={prayerSending || !requestText.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {prayerSending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  إرسال طلب الصلاة
                </button>
              </div>
            </form>
          </div>

          {/* ── Announcements & Next Meetings ── */}
          <div className="grid sm:grid-cols-2 gap-5">

            {/* Announcements */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-amber-200/70 space-y-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell size={16} className="text-amber-600" />
                آخر الإعلانات
              </h2>
              <div className="space-y-2.5 max-h-52 overflow-y-auto">
                {announcements.length === 0 ? (
                  <p className="text-stone-400 text-xs text-center py-6">لا توجد إعلانات حالياً</p>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-950">{a.title}</p>
                      <p className="text-[11px] text-stone-600 mt-1 leading-relaxed line-clamp-2">{a.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-amber-200/70 space-y-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarDays size={16} className="text-amber-600" />
                الاجتماعات القادمة
              </h2>
              <div className="space-y-2.5 max-h-52 overflow-y-auto">
                {meetings.length === 0 ? (
                  <p className="text-stone-400 text-xs text-center py-6">لا توجد اجتماعات مضافة</p>
                ) : (
                  meetings.slice(0, 4).map((m) => (
                    <div key={m.id} className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{m.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {m.speaker && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold truncate">
                              <Mic size={11} /> {m.speaker}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap flex-shrink-0">
                        {m.meetingDate}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
