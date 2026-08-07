"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import SeedButton from "@/components/SeedButton";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  CheckSquare,
  Heart,
  Bell,
  ChevronLeft,
  Cake,
  Loader2,
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import AuthPortal from "@/components/AuthPortal";
import MemberPortal from "@/components/MemberPortal";

export default function HomePage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-amber-950 text-amber-100">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  // If not logged in, show AuthPortal
  if (!user) {
    return <AuthPortal />;
  }

  // If logged in as Member, show MemberPortal
  if (role === "member") {
    return (
      <PageWrapper>
        <MemberPortal />
      </PageWrapper>
    );
  }

  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const currentMonthName = monthNames[new Date().getMonth()];

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          <p className="text-amber-800 text-sm font-medium">جاري تحميل لوحة التحكم...</p>
        </div>
      </PageWrapper>
    );
  }

  const attendanceRate =
    data && data.totalMembers > 0
      ? Math.round((data.lastMeetingAttendance / data.totalMembers) * 100)
      : 0;

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-amber-900">
              ✋ منقوش على كفك
            </h1>
            <p className="text-amber-700 mt-1 text-sm lg:text-base">
              كنيسة العذراء - العاشر من رمضان | لوحة التحكم
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/attendance"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-md"
            >
              <CheckSquare size={16} />
              تسجيل الحضور
            </Link>
            {data?.totalMembers === 0 && (
              <SeedButton onSuccess={fetchStats} />
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="الشباب النشطين"
            value={data?.totalMembers || 0}
            icon={<Users size={22} />}
            color="amber"
            sub={`${data?.maleCount || 0} شاب | ${data?.femaleCount || 0} شابة`}
            href="/members"
          />
          <StatCard
            label="الاجتماعات"
            value={data?.totalMeetings || 0}
            icon={<CalendarDays size={22} />}
            color="orange"
            sub="إجمالي الاجتماعات"
            href="/meetings"
          />
          <StatCard
            label="آخر اجتماع"
            value={data?.lastMeetingAttendance || 0}
            icon={<CheckSquare size={22} />}
            color="yellow"
            sub={`${attendanceRate}% من الشباب`}
            href="/attendance"
          />
          <StatCard
            label="طلبات الصلاة"
            value={data?.totalPrayers || 0}
            icon={<Heart size={22} />}
            color="red"
            sub="في انتظار الصلاة"
            href="/prayers"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Meetings */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-amber-50">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <CalendarDays size={18} className="text-amber-600" />
                آخر الاجتماعات
              </h2>
              <Link href="/meetings" className="text-amber-600 text-sm hover:text-amber-800 flex items-center gap-1">
                عرض الكل <ChevronLeft size={14} />
              </Link>
            </div>
            <div className="divide-y divide-amber-50">
              {!data?.recentMeetings || data.recentMeetings.length === 0 ? (
                <div className="p-8 text-center text-stone-400">
                  <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                  <p>لا توجد اجتماعات بعد</p>
                  <Link href="/meetings" className="text-amber-600 text-sm mt-2 inline-block">
                    أضف أول اجتماع →
                  </Link>
                </div>
              ) : (
                data.recentMeetings.map((m: any) => {
                  const rate = data.totalMembers > 0
                    ? Math.round((m.attendanceCount / data.totalMembers) * 100)
                    : 0;
                  return (
                    <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center gap-4 p-4 hover:bg-amber-50 transition-colors group">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-sm flex-shrink-0">
                        {new Date(m.meetingDate).getDate()}
                        <br />
                        <span className="text-xs font-normal">{monthNames[new Date(m.meetingDate).getMonth()]?.slice(0, 3)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800 text-sm truncate">{m.title}</p>
                        <p className="text-stone-400 text-xs mt-1">{m.speaker || "—"}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-amber-100 rounded-full h-1.5">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-stone-500 whitespace-nowrap">
                            {m.attendanceCount} شخص ({rate}%)
                          </span>
                        </div>
                      </div>
                      <ChevronLeft size={16} className="text-stone-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Birthdays */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-amber-50">
                <h2 className="font-bold text-stone-800 flex items-center gap-2 text-sm">
                  <Cake size={16} className="text-pink-500" />
                  أعياد ميلاد {currentMonthName}
                </h2>
                <span className="bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {data?.birthdaysThisMonth?.length || 0}
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
                {!data?.birthdaysThisMonth || data.birthdaysThisMonth.length === 0 ? (
                  <p className="text-stone-400 text-sm text-center py-4">لا توجد أعياد هذا الشهر</p>
                ) : (
                  data.birthdaysThisMonth.map((m: any) => (
                    <div
                      key={m.name}
                      className={`flex items-center gap-3 p-2.5 rounded-xl ${
                        m.isToday ? "bg-pink-50 border border-pink-200" : "hover:bg-amber-50"
                      }`}
                    >
                      <span className="text-xl">{m.isToday ? "🎂" : "🎁"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{m.name}</p>
                        <p className="text-xs text-stone-400">
                          {m.birthDate?.slice(8)}/{m.birthDate?.slice(5, 7)}
                          {m.isToday && (
                            <span className="text-pink-600 font-bold mr-1">🎉 اليوم!</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-amber-50">
                <h2 className="font-bold text-stone-800 flex items-center gap-2 text-sm">
                  <Bell size={16} className="text-amber-600" />
                  آخر الإعلانات
                </h2>
                <Link href="/announcements" className="text-amber-600 text-xs hover:underline">
                  عرض الكل
                </Link>
              </div>
              <div className="p-3 space-y-2">
                {!data?.latestAnnouncements || data.latestAnnouncements.length === 0 ? (
                  <p className="text-stone-400 text-sm text-center py-4">لا توجد إعلانات</p>
                ) : (
                  data.latestAnnouncements.map((a: any) => (
                    <div key={a.id} className="p-3 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        {a.isPinned && (
                          <span className="text-xs bg-amber-600 text-white px-1.5 py-0.5 rounded font-medium">
                            مثبت
                          </span>
                        )}
                        <p className="text-sm font-semibold text-stone-800 truncate">{a.title}</p>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-2">{a.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-amber-800 to-amber-900 rounded-2xl p-5 text-white">
          <h2 className="font-bold mb-4 text-amber-200 text-sm uppercase tracking-wide">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/meetings/new", label: "اجتماع جديد", emoji: "📅" },
              { href: "/members/new", label: "شاب جديد", emoji: "👤" },
              { href: "/followup", label: "قائمة الافتقاد", emoji: "🔍" },
              { href: "/prayers/new", label: "طلب صلاة", emoji: "🙏" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
              >
                <span className="text-2xl">{action.emoji}</span>
                <span className="text-xs font-medium text-amber-100">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "amber" | "orange" | "yellow" | "red";
  sub: string;
  href: string;
}) {
  const colors = {
    amber: "from-amber-500 to-amber-600",
    orange: "from-orange-500 to-orange-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-400 to-red-500",
  };

  return (
    <Link href={href} className="card-hover block">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className="text-2xl lg:text-3xl font-bold text-stone-800">{value}</p>
        <p className="text-sm font-medium text-stone-600 mt-0.5">{label}</p>
        <p className="text-xs text-stone-400 mt-1">{sub}</p>
      </div>
    </Link>
  );
}
