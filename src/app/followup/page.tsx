"use client";

import { useState, useMemo } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import {
  UserSearch, Phone, AlertTriangle, Clock, ChevronLeft,
  Users, UserCheck, Search, X, MessageCircle
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useOfflineCache } from "@/hooks/useOfflineCache";

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

type FilterPeriod = {
  id: string;
  label: string;
  sublabel: string;
  type: "weeks" | "months";
  value: number;
  urgencyLevel: "low" | "medium" | "high" | "critical";
};

const PERIODS: FilterPeriod[] = [
  { id: "1w", label: "أسبوع", sublabel: "7 أيام", type: "weeks", value: 1, urgencyLevel: "low" },
  { id: "2w", label: "أسبوعان", sublabel: "14 يوم", type: "weeks", value: 2, urgencyLevel: "low" },
  { id: "3w", label: "3 أسابيع", sublabel: "21 يوم", type: "weeks", value: 3, urgencyLevel: "medium" },
  { id: "1m", label: "شهر", sublabel: "30 يوم", type: "months", value: 1, urgencyLevel: "medium" },
  { id: "2m", label: "شهرين ⚠️", sublabel: "60 يوم", type: "months", value: 2, urgencyLevel: "high" },
  { id: "3m", label: "3 شهور 🚨", sublabel: "90 يوم", type: "months", value: 3, urgencyLevel: "critical" },
  { id: "6m", label: "6 شهور ⏳", sublabel: "180 يوم", type: "months", value: 6, urgencyLevel: "critical" },
];

export default function FollowupPage() {
  const { user } = useAuth();
  const [selectedServant, setSelectedServant] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>(PERIODS[1]); // default: 2 weeks
  const [search, setSearch] = useState("");

  const { data: servants } = useOfflineCache<Servant[]>({
    cacheKey: "followup_servants",
    fetchFn: async () => {
      const res = await fetch("/api/servants");
      return await res.json();
    },
  });

  const { data: absentMembers, loading } = useOfflineCache<AbsentMember[]>({
    cacheKey: `followup_absent_${selectedPeriod.id}_${selectedServant}`,
    fetchFn: async () => {
      const params = new URLSearchParams();
      if (selectedPeriod.type === "months") {
        params.set("absentMonths", String(selectedPeriod.value));
      } else {
        params.set("absentWeeks", String(selectedPeriod.value));
      }
      if (selectedServant) params.set("servantId", selectedServant);
      const res = await fetch(`/api/followup?${params}`);
      return await res.json();
    },
  });

  const filteredMembers = useMemo(() => {
    if (!absentMembers) return [];
    if (!search.trim()) return absentMembers;
    const q = search.toLowerCase().trim();
    return absentMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.servantName && m.servantName.toLowerCase().includes(q))
    );
  }, [absentMembers, search]);

  const urgencyBadge = (days: number | null) => {
    if (days === null) {
      return {
        cls: "bg-rose-100 text-rose-800 border-rose-300 font-black",
        label: "لم يحضر قط 🚨",
      };
    }
    if (days >= 90) {
      return {
        cls: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
        label: `${days} يوم (أكثر من 3 شهور)`,
      };
    }
    if (days >= 60) {
      return {
        cls: "bg-orange-100 text-orange-800 border-orange-300 font-bold",
        label: `${days} يوم (أكثر من شهرين)`,
      };
    }
    if (days >= 30) {
      return {
        cls: "bg-amber-100 text-amber-800 border-amber-300 font-semibold",
        label: `${days} يوم (أكثر من شهر)`,
      };
    }
    if (days >= 14) {
      return {
        cls: "bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold",
        label: `${days} يوم غياب`,
      };
    }
    return {
      cls: "bg-stone-100 text-stone-700 border-stone-200",
      label: `${days} يوم غياب`,
    };
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-6xl mx-auto w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-950 flex items-center gap-2">
              <UserSearch size={26} className="text-amber-600" />
              الافتقاد ومتابعة الغائبين
            </h1>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">
              متابعة الشباب الغائبين وتسهيل التواصل والافتقاد الدوري
            </p>
          </div>
          {user && (
            <button
              onClick={() => setSelectedServant(selectedServant === String(user.id) ? "" : String(user.id))}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                selectedServant === String(user.id)
                  ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20"
                  : "bg-white text-amber-900 border-amber-200 hover:bg-amber-50 shadow-xs"
              }`}
            >
              <UserCheck size={16} />
              {selectedServant === String(user.id) ? "عرض كل المجموعات" : "مجموعتي فقط (متابعتي)"}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-amber-200/80 p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h2 className="font-bold text-stone-800 text-xs sm:text-sm flex items-center gap-1.5">
                <Clock size={16} className="text-amber-600" />
                تحديد فترة الغياب:
              </h2>
              <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg font-bold">
                الفترة الحالية: {selectedPeriod.label} ({selectedPeriod.sublabel})
              </span>
            </div>
            
            {/* Period Pills */}
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => {
                const isActive = selectedPeriod.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-[1.02]"
                        : p.urgencyLevel === "critical"
                        ? "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/70"
                        : p.urgencyLevel === "high"
                        ? "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/70"
                        : "bg-amber-50/70 text-amber-900 hover:bg-amber-100 border border-amber-200/70"
                    }`}
                  >
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-100">
            {/* Search Input */}
            <div className="flex items-center gap-2 border border-amber-200 rounded-2xl px-3.5 py-2 text-xs bg-amber-50/30">
              <Search size={15} className="text-amber-600 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو التليفون..."
                className="w-full bg-transparent outline-none text-stone-800 text-xs"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={14} className="text-stone-400" />
                </button>
              )}
            </div>

            {/* Servant Selector */}
            <div>
              <select
                value={selectedServant}
                onChange={(e) => setSelectedServant(e.target.value)}
                className="w-full border border-amber-200 rounded-2xl px-3.5 py-2 text-xs text-stone-700 bg-white outline-none focus:border-amber-500 font-medium"
              >
                <option value="">كل الخدام (جميع المجموعات)</option>
                {(servants || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    مجموعة الخادم: {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Banner */}
        <div className={`rounded-3xl p-5 text-white flex items-center justify-between gap-4 shadow-lg ${
          selectedPeriod.urgencyLevel === "critical"
            ? "bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950"
            : selectedPeriod.urgencyLevel === "high"
            ? "bg-gradient-to-r from-amber-950 via-orange-900 to-amber-950"
            : "bg-gradient-to-r from-amber-900 via-amber-850 to-amber-950"
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-xs rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20">
              <AlertTriangle size={28} className="text-amber-300" />
            </div>
            <div>
              <p className="text-amber-200 text-xs font-semibold">عدد الشباب المحتاجين افتقاد</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black">{filteredMembers.length}</span>
                <span className="text-xs text-amber-200">شاب / فتاة</span>
              </div>
              <p className="text-amber-300/90 text-xs mt-0.5">
                غائبين منذ أكثر من <span className="font-bold underline">{selectedPeriod.label}</span>
                {selectedServant && " (في المجموعة المحددة)"}
              </p>
            </div>
          </div>
        </div>

        {/* List of Absent Members */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-3xl h-24 animate-pulse border border-amber-100" />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-amber-200/80">
            <Users size={56} className="mx-auto text-emerald-500 mb-3" />
            <h3 className="text-lg font-bold text-stone-800 mb-1">🎉 لا يوجد غائبين في هذه الفترة!</h3>
            <p className="text-stone-500 text-xs">
              جميع الشباب حضروا خلال آخر {selectedPeriod.label}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const badge = urgencyBadge(member.absentDays);
              return (
                <div
                  key={member.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-200/70 hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black flex-shrink-0 shadow-xs ${
                        member.gender === "female"
                          ? "bg-pink-100 text-pink-700 border border-pink-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {member.name.slice(0, 1)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug truncate">
                          {member.name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] sm:text-xs ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-stone-500">
                        {member.phone && (
                          <a
                            href={`tel:${member.phone}`}
                            className="flex items-center gap-1 hover:text-amber-700 font-mono font-semibold"
                          >
                            <Phone size={12} className="text-amber-600" />
                            {member.phone}
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-stone-400" />
                          {member.lastAttendance
                            ? `آخر حضور: ${new Date(member.lastAttendance).toLocaleDateString("ar-EG")}`
                            : "لم يحضر من قبل"}
                        </span>
                        {member.servantName && (
                          <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-amber-200/50">
                            الخادم: {member.servantName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {member.phone && (
                      <a
                        href={`https://wa.me/2${member.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="تواصل واتساب"
                      >
                        <MessageCircle size={14} />
                        <span className="hidden sm:inline">واتساب</span>
                      </a>
                    )}
                    <Link
                      href={`/members/${member.id}`}
                      className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      تسجيل افتقاد
                      <ChevronLeft size={14} />
                    </Link>
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
