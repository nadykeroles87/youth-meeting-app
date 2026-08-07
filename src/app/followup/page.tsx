"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { UserSearch, Phone, AlertTriangle, Clock, ChevronLeft, Users, UserCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Servant = { id: number; name: string };

type AbsentMember = {
  id: number;
  name: string;
  phone: string | null;
  gender: string;
  assignedServantId: number | null;
  servantName: string | null;
  lastAttendance: string | null;
  absentDays: number | null;
};

export default function FollowupPage() {
  const { user } = useAuth();
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [servants, setServants] = useState<Servant[]>([]);
  const [selectedServant, setSelectedServant] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState(2);

  const fetchServants = async () => {
    const res = await fetch("/api/servants");
    const data = await res.json();
    setServants(data);
  };

  const fetchAbsent = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("absentWeeks", String(weeks));
    if (selectedServant) params.set("servantId", selectedServant);
    const res = await fetch(`/api/followup?${params}`);
    const data = await res.json();
    setAbsentMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServants();
  }, []);

  useEffect(() => {
    fetchAbsent();
  }, [weeks, selectedServant]);

  const urgencyColor = (days: number | null) => {
    if (!days) return "bg-red-100 text-red-700 border-red-200";
    if (days >= 30) return "bg-red-100 text-red-700 border-red-200";
    if (days >= 14) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const urgencyLabel = (days: number | null) => {
    if (!days) return "لم يحضر قط";
    return `${days} يوم غياب`;
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <UserSearch size={24} className="text-amber-600" />
              الافتقاد ومتابعة الشباب
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              متابعة مجموعة كل خادم والشباب الغائبين عن الاجتماع
            </p>
          </div>
          {user && (
            <button
              onClick={() => setSelectedServant(selectedServant === String(user.id) ? "" : String(user.id))}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                selectedServant === String(user.id)
                  ? "bg-amber-600 text-white border-amber-600 shadow-md"
                  : "bg-white text-amber-900 border-amber-200 hover:bg-amber-50"
              }`}
            >
              <UserCheck size={16} />
              {selectedServant === String(user.id) ? "عرض الكل" : "مجموعتي فقط (متابعتي)"}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-stone-700 mb-2 text-sm">عرض الغائبين منذ أكثر من:</h2>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeeks(w)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      weeks === w
                        ? "bg-amber-600 text-white shadow-md"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    {w === 1 ? "أسبوع" : w === 2 ? "أسبوعان" : `${w} أسابيع`}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full sm:w-64">
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">الخادم المسؤول:</label>
              <select
                value={selectedServant}
                onChange={(e) => setSelectedServant(e.target.value)}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs text-stone-700 bg-white outline-none focus:border-amber-500"
              >
                <option value="">كل الخدام (جميع المجموعات)</option>
                {servants.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 rounded-2xl p-5 text-white flex items-center gap-5 shadow-lg">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-amber-200 text-sm">عدد الشباب المحتاجين افتقاد</p>
            <p className="text-3xl font-black">{absentMembers.length}</p>
            <p className="text-amber-300 text-xs mt-1">
              شاب/ة غائب/ة أكثر من {weeks === 1 ? "أسبوع" : weeks === 2 ? "أسبوعين" : `${weeks} أسابيع`}
            </p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : absentMembers.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-amber-100">
            <Users size={60} className="mx-auto text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-stone-700 mb-2">🎉 ممتـاز!</h3>
            <p className="text-stone-500 text-sm">
              جميع الشباب حضروا خلال آخر {weeks === 1 ? "أسبوع" : weeks === 2 ? "أسبوعين" : `${weeks} أسابيع`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {absentMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 transition-all overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0 ${
                      member.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {member.name.slice(0, 1)}
                    </div>

                    <div>
                      <h3 className="font-bold text-stone-800 text-sm">{member.name}</h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-stone-500">
                        {member.phone && (
                          <a href={`tel:${member.phone}`} className="flex items-center gap-1 hover:text-amber-700 font-mono">
                            <Phone size={11} /> {member.phone}
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {member.lastAttendance
                            ? `آخر حضور: ${new Date(member.lastAttendance).toLocaleDateString("ar-EG")}`
                            : "لم يحضر من قبل"}
                        </span>
                        {member.servantName && (
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            الخادم: {member.servantName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className={`px-3 py-1 rounded-xl border text-xs font-bold whitespace-nowrap ${urgencyColor(member.absentDays)}`}>
                      {urgencyLabel(member.absentDays)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {member.phone && (
                        <a
                          href={`https://wa.me/2${member.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors text-xs font-bold"
                          title="تواصل واتساب"
                        >
                          واتساب 💬
                        </a>
                      )}
                      <Link
                        href={`/members/${member.id}`}
                        className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        الملف والافتفاد
                        <ChevronLeft size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
