"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { Users, Plus, Search, Filter, Phone, QrCode, Trash2, ChevronLeft, X } from "lucide-react";
import { useOfflineCache } from "@/hooks/useOfflineCache";

type Member = {
  id: number;
  name: string;
  phone: string | null;
  gender: string;
  college: string | null;
  job: string | null;
  birthDate: string | null;
  qrCode: string | null;
  assignedServantId: number | null;
  servantName: string | null;
  status: string;
  confessionFather: string | null;
};

type Servant = {
  id: number;
  name: string;
};

export default function MembersPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFamily, setFilterFamily] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [members, setMembers] = useState<Member[]>([]);

  const { data: servants } = useOfflineCache<Servant[]>({
    cacheKey: "members_servants",
    fetchFn: async () => {
      const res = await fetch("/api/servants");
      return await res.json();
    },
  });

  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterFamily) params.set("servantId", filterFamily);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      let filtered = data;
      if (filterGender) filtered = data.filter((m: Member) => m.gender === filterGender);
      setMembers(filtered);
      // Cache members for offline
      try {
        localStorage.setItem("offline_cache_members", JSON.stringify({ data: filtered, timestamp: Date.now() }));
      } catch (e) { /* ignore */ }
    } catch (error) {
      // Load from cache if offline
      try {
        const cached = localStorage.getItem("offline_cache_members");
        if (cached) {
          const parsed = JSON.parse(cached);
          let filtered = parsed.data;
          if (filterGender) filtered = filtered.filter((m: Member) => m.gender === filterGender);
          setMembers(filtered);
        }
      } catch (e) { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => fetchMembers(), 300);
    return () => clearTimeout(timer);
  }, [search, filterFamily, filterGender, filterStatus]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`هل تريد حذف ${name}؟`)) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    fetchMembers();
  };

  const maleCount = members.filter((m) => m.gender === "male").length;
  const femaleCount = members.filter((m) => m.gender === "female").length;

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Users size={24} className="text-amber-600" />
              قاعدة الشباب
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              {members.length} شخص | {maleCount} شاب | {femaleCount} شابة
            </p>
          </div>
          <Link
            href="/members/new"
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md whitespace-nowrap"
          >
            <Plus size={16} />
            شاب جديد
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 border border-amber-200 rounded-xl px-3 py-2.5 focus-within:border-amber-500 transition-colors sm:col-span-2 lg:col-span-1">
              <Search size={16} className="text-amber-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الموبايل..."
                className="flex-1 outline-none text-sm text-stone-700 placeholder-stone-400"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={14} className="text-stone-400" />
                </button>
              )}
            </div>

            {/* Servant Filter */}
            <select
              value={filterFamily}
              onChange={(e) => setFilterFamily(e.target.value)}
              className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-amber-500 transition-colors bg-white"
            >
              <option value="">كل الخدام المسؤولين</option>
              {(servants || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Gender Filter */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-amber-500 transition-colors bg-white"
            >
              <option value="">الجنسان</option>
              <option value="male">الشباب (ذكور)</option>
              <option value="female">الشابات (إناث)</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-amber-500 transition-colors bg-white"
            >
              <option value="">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="transferred">تحول</option>
            </select>
          </div>
        </div>

        {/* Members Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-36 animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-amber-100">
            <Users size={60} className="mx-auto text-amber-200 mb-4" />
            <h3 className="text-xl font-bold text-stone-700 mb-2">لا توجد نتائج</h3>
            <p className="text-stone-400 mb-6">جرب تغيير معايير البحث أو أضف شاباً جديداً</p>
            <Link
              href="/members/new"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm"
            >
              <Plus size={16} />
              إضافة شاب
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 transition-all overflow-hidden group card-hover"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                      member.gender === "female"
                        ? "bg-pink-100 text-pink-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {member.name.slice(0, 1)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-stone-800 text-sm truncate">{member.name}</h3>
                        {member.status !== "active" && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            member.status === "inactive"
                              ? "bg-stone-100 text-stone-500"
                              : "bg-blue-100 text-blue-600"
                          }`}>
                            {member.status === "inactive" ? "غير نشط" : "تحوّل"}
                          </span>
                        )}
                      </div>

                      {member.servantName && (
                        <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                          خادم الافتقاد: {member.servantName}
                        </span>
                      )}

                      <div className="mt-2 space-y-1">
                        {member.phone && (
                          <p className="flex items-center gap-1.5 text-xs text-stone-500">
                            <Phone size={11} />
                            {member.phone}
                          </p>
                        )}
                        {(member.college || member.job) && (
                          <p className="text-xs text-stone-400 truncate">
                            🎓 {member.college || member.job}
                          </p>
                        )}
                        {member.qrCode && (
                          <p className="flex items-center gap-1 text-xs text-amber-600 font-mono">
                            <QrCode size={11} />
                            {member.qrCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex border-t border-amber-50">
                  <button
                    onClick={() => handleDelete(member.id, member.name)}
                    className="flex-none px-3 py-2.5 text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <Link
                    href={`/members/${member.id}`}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 text-amber-600 hover:bg-amber-50 transition-colors text-sm font-medium"
                  >
                    الملف الشخصي
                    <ChevronLeft size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
