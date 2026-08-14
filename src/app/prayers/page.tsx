"use client";

import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { Heart, Plus, CheckCircle, Clock, Lock, User } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useOfflineCache } from "@/hooks/useOfflineCache";

type PrayerRequest = {
  id: number;
  request: string;
  isAnonymous: boolean;
  isPrayed: boolean;
  createdAt: string;
  memberName: string | null;
  memberId: number | null;
};

export default function PrayersPage() {
  const { user, role } = useAuth();
  const isServant = role === "servant";

  const { data: prayers, loading, refresh: fetchPrayers } = useOfflineCache<PrayerRequest[]>({
    cacheKey: "prayers",
    fetchFn: async () => {
      const res = await fetch("/api/prayer-requests");
      return await res.json();
    },
  });

  const handleTogglePrayed = async (id: number, current: boolean) => {
    if (!isServant) return; // Only servants can mark as prayed
    await fetch("/api/prayer-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isPrayed: !current }),
    });
    fetchPrayers();
  };

  const pending = (prayers || []).filter((p) => !p.isPrayed);
  const prayed = (prayers || []).filter((p) => p.isPrayed);

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Heart size={24} className="text-red-500 fill-red-500" />
              طلبات الصلاة
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              {pending.length} طلب في انتظار الصلاة
            </p>
          </div>
          <Link
            href="/prayers/new"
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md"
          >
            <Plus size={16} />
            طلب جديد
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
            <p className="text-3xl font-bold text-red-500">{pending.length}</p>
            <p className="text-stone-500 text-sm mt-1">في انتظار الصلاة</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
            <p className="text-3xl font-bold text-green-500">{prayed.length}</p>
            <p className="text-stone-500 text-sm mt-1">تمت الصلاة عليها</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white h-24 rounded-2xl animate-pulse" />)}
          </div>
        ) : (prayers || []).length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-amber-100">
            <Heart size={60} className="mx-auto text-red-200 mb-4" />
            <h3 className="text-xl font-bold text-stone-700 mb-2">لا توجد طلبات صلاة</h3>
            <Link href="/prayers/new" className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium mt-4">
              <Plus size={16} />
              أضف طلب صلاة
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <h2 className="font-bold text-stone-600 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" />
                  في انتظار الصلاة ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((prayer) => (
                    <PrayerCard
                      key={prayer.id}
                      prayer={prayer}
                      isServant={isServant}
                      currentUserId={user?.id}
                      onToggle={handleTogglePrayed}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Prayed */}
            {prayed.length > 0 && (
              <div>
                <h2 className="font-bold text-stone-400 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  تمت الصلاة عليها ({prayed.length})
                </h2>
                <div className="space-y-3">
                  {prayed.map((prayer) => (
                    <PrayerCard
                      key={prayer.id}
                      prayer={prayer}
                      isServant={isServant}
                      currentUserId={user?.id}
                      onToggle={handleTogglePrayed}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function PrayerCard({
  prayer,
  isServant,
  currentUserId,
  onToggle,
}: {
  prayer: PrayerRequest;
  isServant: boolean;
  currentUserId?: number;
  onToggle: (id: number, current: boolean) => void;
}) {
  // Hide specific names from members unless it is their own request
  const displayName = () => {
    if (prayer.isAnonymous) return "طلب مجهول";
    if (isServant) return prayer.memberName || "شاب/ة";
    if (prayer.memberId === currentUserId) return "طلبي الشخصي";
    return "طلب صلاة (أحد الشباب)";
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all ${
      prayer.isPrayed ? "border-green-100 opacity-70" : "border-amber-100 hover:border-amber-300"
    }`}>
      <div className="flex items-start gap-4 p-4">
        {isServant ? (
          <button
            onClick={() => onToggle(prayer.id, prayer.isPrayed)}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              prayer.isPrayed
                ? "bg-green-500 border-green-500 text-white"
                : "border-amber-300 hover:border-amber-500"
            }`}
          >
            {prayer.isPrayed && <CheckCircle size={16} />}
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200">
            <Heart size={15} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed ${prayer.isPrayed ? "line-through text-stone-400" : "text-stone-800"}`}>
            {prayer.request}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-stone-500">
              {prayer.isAnonymous ? (
                <>
                  <Lock size={11} />
                  {displayName()}
                </>
              ) : (
                <>
                  <User size={11} />
                  {displayName()}
                </>
              )}
            </span>
            <span className="text-xs text-stone-300">
              {new Date(prayer.createdAt).toLocaleDateString("ar-EG")}
            </span>
          </div>
        </div>

        {prayer.isPrayed && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg flex-shrink-0 font-medium">
            ✅ تمت الصلاة
          </span>
        )}
      </div>
    </div>
  );
}
