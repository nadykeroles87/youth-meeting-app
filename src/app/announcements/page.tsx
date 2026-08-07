"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { Bell, Plus, Trash2, Pin, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Announcement = {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
};

export default function AnnouncementsPage() {
  const { role } = useAuth();
  const isServant = role === "servant";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", isPinned: false });
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = async () => {
    const res = await fetch("/api/announcements");
    setAnnouncements(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm({ title: "", content: "", isPinned: false });
    setShowForm(false);
    fetchAnnouncements();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف هذا الإعلان؟")) return;
    await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    fetchAnnouncements();
  };

  const pinned = announcements.filter((a) => a.isPinned);
  const regular = announcements.filter((a) => !a.isPinned);

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Bell size={24} className="text-amber-600" />
              الإعلانات
            </h1>
            <p className="text-stone-500 text-sm mt-1">{announcements.length} إعلان</p>
          </div>
          {isServant && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-md"
          >
            <Plus size={16} />
            إعلان جديد
          </button>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-stone-800">إعلان جديد</h2>
                <button onClick={() => setShowForm(false)}>
                  <X size={20} className="text-stone-400" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    العنوان <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="عنوان الإعلان"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    المحتوى <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={4}
                    placeholder="محتوى الإعلان..."
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span className="text-sm text-stone-700">تثبيت الإعلان في الأعلى</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border border-amber-200 text-stone-600 py-2.5 rounded-xl text-sm font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:bg-amber-300"
                  >
                    {saving ? "جاري النشر..." : "نشر الإعلان"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white h-28 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-amber-100">
            <Bell size={60} className="mx-auto text-amber-200 mb-4" />
            <h3 className="text-xl font-bold text-stone-700 mb-2">لا توجد إعلانات</h3>
            {isServant && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium mt-4"
            >
              <Plus size={16} />
              أضف أول إعلان
            </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div>
                <h2 className="font-bold text-stone-600 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Pin size={14} className="text-amber-600" />
                  الإعلانات المثبتة
                </h2>
                <div className="space-y-3">
                  {pinned.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} onDelete={handleDelete} canDelete={isServant} />
                  ))}
                </div>
              </div>
            )}

            {regular.length > 0 && (
              <div>
                <h2 className="font-bold text-stone-500 text-sm uppercase tracking-wide mb-3">الإعلانات الأخرى</h2>
                <div className="space-y-3">
                  {regular.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} onDelete={handleDelete} canDelete={isServant} />
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

function AnnouncementCard({
  announcement: a,
  onDelete,
  canDelete = true,
}: {
  announcement: Announcement;
  onDelete: (id: number) => void;
  canDelete?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all hover:border-amber-300 overflow-hidden ${
      a.isPinned ? "border-amber-300" : "border-amber-100"
    }`}>
      {a.isPinned && (
        <div className="bg-amber-600 px-4 py-1 flex items-center gap-1.5">
          <Pin size={11} className="text-amber-200" />
          <span className="text-xs text-amber-100 font-medium">مثبت</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-stone-800">{a.title}</h3>
            <p className="text-stone-600 text-sm mt-2 leading-relaxed">{a.content}</p>
            <p className="text-xs text-stone-400 mt-3">
              {new Date(a.createdAt).toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {canDelete && (
          <button
            onClick={() => onDelete(a.id)}
            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
          >
            <Trash2 size={16} />
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
