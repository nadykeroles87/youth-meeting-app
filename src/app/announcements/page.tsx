"use client";

import { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { Bell, Plus, Trash2, Pin, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useOfflineCache } from "@/hooks/useOfflineCache";

type Announcement = {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
};

export default function AnnouncementsPage() {
  const { role } = useAuth();
  const isServant = role === "servant";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", imageUrl: "", isPinned: false });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const { data: announcements, loading, refresh: fetchAnnouncements } = useOfflineCache<Announcement[]>({
    cacheKey: "announcements",
    fetchFn: async () => {
      const res = await fetch("/api/announcements");
      return await res.json();
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm({ title: "", content: "", imageUrl: "", isPinned: false });
    setShowForm(false);
    fetchAnnouncements();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.fileUrl) {
        setForm({ ...form, imageUrl: data.fileUrl });
      } else {
        alert(data.error || "فشل رفع الصورة");
      }
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف هذا الإعلان؟")) return;
    await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    fetchAnnouncements();
  };

  const safeAnnouncements = announcements || [];
  const pinned = safeAnnouncements.filter((a) => a.isPinned);
  const regular = safeAnnouncements.filter((a) => !a.isPinned);

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Bell size={24} className="text-amber-600" />
              الإعلانات
            </h1>
            <p className="text-stone-500 text-sm mt-1">{safeAnnouncements.length} إعلان</p>
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
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">صورة الإعلان (اختياري)</label>
                  {form.imageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-amber-200 group">
                      <img src={form.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: "" })}
                        className="absolute top-2 left-2 bg-red-500/80 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="border-2 border-dashed border-amber-200 rounded-xl p-6 flex flex-col items-center justify-center text-amber-600 bg-amber-50/50 hover:bg-amber-50 transition-colors">
                        {uploading ? (
                          <>
                            <Loader2 size={24} className="animate-spin mb-2" />
                            <span className="text-sm font-medium">جاري الرفع...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={24} className="mb-2" />
                            <span className="text-sm font-medium">اضغط أو اسحب صورة هنا</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
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
        ) : safeAnnouncements.length === 0 ? (
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
                    <AnnouncementCard key={a.id} announcement={a} onDelete={handleDelete} canDelete={isServant} onClick={() => setSelectedAnnouncement(a)} />
                  ))}
                </div>
              </div>
            )}

            {regular.length > 0 && (
              <div>
                <h2 className="font-bold text-stone-500 text-sm uppercase tracking-wide mb-3">الإعلانات الأخرى</h2>
                <div className="space-y-3">
                  {regular.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} onDelete={handleDelete} canDelete={isServant} onClick={() => setSelectedAnnouncement(a)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Modal */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedAnnouncement(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  {selectedAnnouncement.isPinned && (
                    <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold mb-2">
                      <Pin size={12} />
                      مثبت
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-stone-800">{selectedAnnouncement.title}</h2>
                  <p className="text-xs text-stone-400 mt-2">
                    {new Date(selectedAnnouncement.createdAt).toLocaleDateString("ar-EG", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button onClick={() => setSelectedAnnouncement(null)} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors">
                  <X size={20} className="text-stone-600" />
                </button>
              </div>
              
              <div className="mt-6 space-y-6">
                <p className="text-stone-700 text-base leading-relaxed whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                
                {selectedAnnouncement.imageUrl && (
                  <div className="rounded-xl overflow-hidden border-2 border-stone-100">
                    <img src={selectedAnnouncement.imageUrl} alt={selectedAnnouncement.title} className="w-full h-auto object-contain" />
                  </div>
                )}
              </div>
            </div>
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
  onClick,
}: {
  announcement: Announcement;
  onDelete: (id: number) => void;
  canDelete?: boolean;
  onClick: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border transition-all hover:border-amber-300 hover:shadow-md cursor-pointer overflow-hidden ${
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
            <h3 className="font-bold text-stone-800 text-lg">{a.title}</h3>
            <p className="text-stone-500 text-sm mt-1 line-clamp-2">{a.content}</p>
            <div className="flex items-center gap-4 mt-4">
              <p className="text-xs text-stone-400 font-medium">
                {new Date(a.createdAt).toLocaleDateString("ar-EG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {a.imageUrl && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">
                  <ImageIcon size={14} />
                  مرفق صورة
                </span>
              )}
            </div>
          </div>
          {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(a.id);
            }}
            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
          >
            <Trash2 size={18} />
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
