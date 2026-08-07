"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { Heart, ChevronRight, Save, Lock, User } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Member = { id: number; name: string };

export default function NewPrayerPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const isServant = role === "servant";
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({
    request: "",
    memberId: user?.id ? String(user.id) : "",
    isAnonymous: false,
  });

  useEffect(() => {
    if (user?.id) {
      setForm((prev) => ({ ...prev, memberId: String(user.id) }));
    }
  }, [user]);

  useEffect(() => {
    // Only fetch members list if servant
    if (isServant) {
      fetch("/api/members?status=active").then((r) => r.json()).then(setMembers);
    }
  }, [isServant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/prayer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          memberId: form.isAnonymous ? undefined : (form.memberId || (user?.id ? String(user.id) : undefined)),
        }),
      });
      if (res.ok) {
        router.push("/prayers");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/prayers" className="hover:text-amber-700">طلبات الصلاة</Link>
          <ChevronRight size={14} />
          <span className="text-stone-800 font-medium">طلب جديد</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-700 p-5 text-white">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Heart size={20} />
              طلب صلاة جديد
            </h1>
            <p className="text-red-200 text-sm mt-1">
              "صلوا بعضكم لأجل بعض" (يعقوب 5: 16)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                طلب الصلاة <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={form.request}
                onChange={(e) => setForm({ ...form, request: e.target.value })}
                rows={5}
                placeholder="اكتب طلب الصلاة هنا..."
                className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-3">الخصوصية</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isAnonymous: false })}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    !form.isAnonymous
                      ? "border-amber-500 bg-amber-50"
                      : "border-stone-200 hover:border-amber-200"
                  }`}
                >
                  <User size={20} className={!form.isAnonymous ? "text-amber-600" : "text-stone-400"} />
                  <span className="text-xs font-medium">باسمي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isAnonymous: true })}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    form.isAnonymous
                      ? "border-purple-500 bg-purple-50"
                      : "border-stone-200 hover:border-purple-200"
                  }`}
                >
                  <Lock size={20} className={form.isAnonymous ? "text-purple-600" : "text-stone-400"} />
                  <span className="text-xs font-medium">مجهول الهوية</span>
                </button>
              </div>
            </div>

            {!form.isAnonymous && (
              <div>
                {isServant ? (
                  <>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">الاسم</label>
                    <select
                      value={form.memberId}
                      onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                      className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      <option value="">اختر الاسم (اختياري)</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  user && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                      <span className="font-semibold">سيتم إرسال الطلب باسم:</span>
                      <span className="font-bold text-amber-950">{user.name}</span>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href="/prayers"
                className="flex-1 text-center border border-amber-200 text-stone-600 hover:bg-amber-50 px-4 py-3 rounded-xl font-medium text-sm transition-colors"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-3 rounded-xl font-medium text-sm transition-colors"
              >
                <Save size={16} />
                {loading ? "جاري الإرسال..." : "إرسال الطلب 🙏"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
