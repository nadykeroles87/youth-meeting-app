"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import { CalendarDays, ChevronRight, Save } from "lucide-react";

export default function NewMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    topic: "",
    speaker: "",
    meetingDate: new Date().toISOString().split("T")[0],
    location: "كنيسة العذراء - العاشر من رمضان",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/meetings/${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/meetings" className="hover:text-amber-700">الاجتماعات</Link>
          <ChevronRight size={14} />
          <span className="text-stone-800 font-medium">اجتماع جديد</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-700 to-amber-800 p-5 text-white">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays size={20} />
              اجتماع جديد
            </h1>
            <p className="text-amber-200 text-sm mt-1">أضف تفاصيل الاجتماع الجديد</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                عنوان الاجتماع <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: اجتماع الأحد الأول"
                className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                موضوع الاجتماع
              </label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder='مثال: "أنا هو القيامة والحياة"'
                className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  المتكلم
                </label>
                <input
                  type="text"
                  value={form.speaker}
                  onChange={(e) => setForm({ ...form, speaker: e.target.value })}
                  placeholder="اسم المتكلم"
                  className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  تاريخ الاجتماع <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.meetingDate}
                  onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                  className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                المكان
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                ملاحظات
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="أي ملاحظات إضافية..."
                className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/meetings"
                className="flex-1 text-center border border-amber-200 text-stone-600 hover:bg-amber-50 px-4 py-3 rounded-xl font-medium text-sm transition-colors"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white px-4 py-3 rounded-xl font-medium text-sm transition-colors"
              >
                <Save size={16} />
                {loading ? "جاري الحفظ..." : "حفظ الاجتماع"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
