"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { UserPlus, ChevronRight, Save } from "lucide-react";

type Servant = { id: number; name: string };

export default function NewMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [servants, setServants] = useState<Servant[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    birthDate: "",
    gender: "male",
    college: "",
    job: "",
    address: "",
    confessionFather: "",
    assignedServantId: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/servants").then((r) => r.json()).then(setServants);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push("/members");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/members" className="hover:text-amber-700">قاعدة الشباب</Link>
          <ChevronRight size={14} />
          <span className="text-stone-800 font-medium">إضافة شاب جديد</span>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-700 to-amber-900 p-6 text-white">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <UserPlus size={22} />
              إضافة شاب جديد
            </h1>
            <p className="text-amber-200 text-sm mt-1">أضف بيانات الشاب لقاعدة البيانات</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-3">البيانات الأساسية</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="الاسم بالكامل"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">الجنس</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, gender: "male" })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        form.gender === "male"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-stone-200 text-stone-500"
                      }`}
                    >
                      👨 شاب
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, gender: "female" })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        form.gender === "female"
                          ? "border-pink-500 bg-pink-50 text-pink-700"
                          : "border-stone-200 text-stone-500"
                      }`}
                    >
                      👩 شابة
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">رقم الموبايل</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">الخادم المسؤول عن الافتقاد</label>
                  <select
                    value={form.assignedServantId}
                    onChange={(e) => setForm({ ...form, assignedServantId: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="">اختر الخادم المسؤول</option>
                    {servants.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Education & Work */}
            <div>
              <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-3">التعليم والعمل</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">الكلية</label>
                  <input
                    type="text"
                    value={form.college}
                    onChange={(e) => setForm({ ...form, college: e.target.value })}
                    placeholder="اسم الكلية"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">الوظيفة</label>
                  <input
                    type="text"
                    value={form.job}
                    onChange={(e) => setForm({ ...form, job: e.target.value })}
                    placeholder="الوظيفة الحالية"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Church Info */}
            <div>
              <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-3">البيانات الكنسية</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">أب الاعتراف</label>
                  <input
                    type="text"
                    value={form.confessionFather}
                    onChange={(e) => setForm({ ...form, confessionFather: e.target.value })}
                    placeholder="اسم أب الاعتراف"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">الحالة</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="transferred">تحول لخدمة أخرى</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">العنوان</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="العنوان"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    placeholder="أي ملاحظات..."
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/members"
                className="flex-1 text-center border border-amber-200 text-stone-600 hover:bg-amber-50 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer shadow-md"
              >
                <Save size={16} />
                {loading ? "جاري الحفظ..." : "حفظ الشاب"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
