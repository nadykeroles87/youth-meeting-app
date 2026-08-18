"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import {
  Library, FileText, Video, Link as LinkIcon, Download, Plus,
  Trash2, Search, Loader2, X, UploadCloud, FileUp, Eye, ExternalLink
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useOfflineCache } from "@/hooks/useOfflineCache";

type MediaItem = {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: "pdf" | "video" | "document" | "link";
  category: string;
  createdAt: string;
  servantName: string | null;
};

export default function LibraryPage() {
  const { user, role } = useAuth();
  const isServant = role === "servant";
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  // Upload mode: 'file' or 'url'
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileType: "pdf",
    category: "general",
  });

  const { data: items, loading, refresh: fetchItems } = useOfflineCache<MediaItem[]>({
    cacheKey: "library",
    fetchFn: async () => {
      const res = await fetch("/api/media");
      if (res.ok) return await res.json();
      throw new Error("Failed to load media");
    },
  });

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("يرجى إدخال عنوان المحتوى");
      return;
    }

    if (uploadMode === "file") {
      if (!selectedFile) {
        setFormError("يرجى اختيار ملف من جهازك أولاً");
        return;
      }
    } else if (!form.fileUrl.trim()) {
      setFormError("يرجى إدخال رابط الملف أو الفيديو");
      return;
    }

    setSubmitting(true);
    try {
      let finalUrl = form.fileUrl.trim();

      if (uploadMode === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.fileUrl) {
          setFormError(uploadData.error || "فشل رفع الملف من الجهاز");
          return;
        }
        finalUrl = uploadData.fileUrl;
      }

      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), fileUrl: finalUrl, uploadedBy: user?.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "فشل حفظ المحتوى");
        return;
      }

      setShowAddModal(false);
      setForm({ title: "", description: "", fileUrl: "", fileType: "pdf", category: "general" });
      setSelectedFile(null);
      setFormError(null);
      fetchItems();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت تأكد من حذف هذا الملف؟")) return;
    await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    fetchItems();
  };

  const safeItems = items || [];
  const filteredItems = safeItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !filterType || item.fileType === filterType;
    return matchesSearch && matchesType;
  });

  // Convert YouTube links to embeddable URLs
  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    }
    return url;
  };

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
              <Library size={14} />
              المكتبة الرقمية والملفات
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">مكتبة الاجتماع والصلوات</h1>
            <p className="text-amber-200/80 text-xs sm:text-sm mt-1">
              حَمِّل كتب الصلوات والـ PDF وفيديوهات الاجتماع لمتابعتها والصلاة منها
            </p>
          </div>

          {isServant && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all border border-amber-400/50 self-start sm:self-center"
            >
              <Plus size={16} />
              رفع ملف / فيديو جديد
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 border border-amber-200 rounded-xl px-3 py-2 text-xs w-full sm:w-72 bg-amber-50/30">
            <Search size={15} className="text-amber-600 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالعنوان أو الوصف..."
              className="w-full bg-transparent outline-none text-stone-800"
            />
            {search && <button onClick={() => setSearch("")}><X size={14} className="text-stone-400" /></button>}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterType("")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                !filterType ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-900 border border-amber-200"
              }`}
            >
              كل الملفات ({safeItems.length})
            </button>
            <button
              onClick={() => setFilterType("pdf")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterType === "pdf" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-900 border border-amber-200"
              }`}
            >
              <FileText size={13} />
              ملفات PDF
            </button>
            <button
              onClick={() => setFilterType("video")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterType === "video" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-900 border border-amber-200"
              }`}
            >
              <Video size={13} />
              فيديوهات
            </button>
          </div>
        </div>

        {/* ── Media Grid ── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-44 animate-pulse" />)}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-amber-200/80">
            <Library size={60} className="mx-auto text-amber-200 mb-3" />
            <h3 className="text-lg font-bold text-stone-700">لا توجد ملفات في المكتبة حالياً</h3>
            <p className="text-stone-400 text-xs mt-1">سيتم إضافة كتب الصلوات والـ PDF والفيديوهات قريبًا</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const isPdf = item.fileType === "pdf";
              const isVid = item.fileType === "video";

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 shadow-md border border-amber-200/70 hover:border-amber-400 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`p-3 rounded-2xl ${
                        isPdf ? "bg-rose-50 text-rose-600 border border-rose-100" :
                        isVid ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                        "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {isPdf ? <FileText size={22} /> : isVid ? <Video size={22} /> : <LinkIcon size={22} />}
                      </div>

                      {isServant && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200/60 inline-block mb-1">
                        {isPdf ? "كتاب / PDF" : isVid ? "فيديو اجتماع" : "مستند"}
                      </span>
                      <h3 className="font-bold text-stone-900 text-base leading-snug">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-amber-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-400">
                      {new Date(item.createdAt).toLocaleDateString("ar-EG")}
                    </span>

                    <div className="flex items-center gap-2">
                      {isVid ? (
                        <button
                          onClick={() => setActiveVideoUrl(item.fileUrl)}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          مشاهدة الفيديو 🎬
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/library/view?url=${encodeURIComponent(item.fileUrl)}&title=${encodeURIComponent(item.title)}&type=${encodeURIComponent(item.fileType)}`)}
                          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <Eye size={13} />
                          فتح الملف
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Video Player Modal ── */}
        {activeVideoUrl && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 text-white">
                <span className="font-bold text-sm">مشاهدة الفيديو</span>
                <button onClick={() => setActiveVideoUrl(null)} className="text-slate-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="aspect-video w-full bg-black">
                {activeVideoUrl.startsWith("/uploads/") && (activeVideoUrl.endsWith(".mp4") || activeVideoUrl.endsWith(".webm")) ? (
                  <video src={activeVideoUrl} controls className="w-full h-full" autoPlay />
                ) : (
                  <iframe
                    src={getEmbedUrl(activeVideoUrl)}
                    title="Video Player"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          </div>
        )}



        {/* ── Servant Upload Modal ── */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white border border-amber-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <h2 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <Plus size={18} className="text-amber-600" />
                  إضافة ملف أو فيديو جديد
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError(null);
                  }}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                  aria-live="polite"
                >
                  {formError}
                </div>
              )}

              {/* Upload Mode Selector */}
              <div className="flex bg-amber-50 p-1 rounded-xl border border-amber-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("file");
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    uploadMode === "file" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <FileUp size={14} />
                  رفع ملف من الجهاز
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("url");
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    uploadMode === "url" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <LinkIcon size={14} />
                  إدخال رابط خارجي
                </button>
              </div>

              <form onSubmit={handleAddMedia} noValidate className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">نوع المحتوى <span className="text-red-500">*</span></label>
                  <select
                    value={form.fileType}
                    onChange={(e: any) => {
                      setForm({ ...form, fileType: e.target.value });
                      setFormError(null);
                    }}
                    className="w-full border border-amber-200 rounded-xl p-2.5 bg-white text-stone-800 text-xs outline-none"
                  >
                    <option value="pdf">ملف PDF / كتاب صلاة</option>
                    <option value="video">فيديو (يوتيوب أو مقطع)</option>
                    <option value="document">عرض تقديمى / مستند</option>
                    <option value="link">رابط موقع</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">العنوان <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      setFormError(null);
                    }}
                    placeholder="مثال: كتاب ترانيم / عرض صلاة باكر"
                    className="w-full border border-amber-200 rounded-xl p-2.5 text-stone-800 text-xs outline-none"
                  />
                </div>

                {uploadMode === "file" ? (
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">اختر الملف من جهازك <span className="text-red-500">*</span></label>
                    <div className="border-2 border-dashed border-amber-300 rounded-2xl p-4 text-center bg-amber-50/40 hover:bg-amber-50 transition-colors">
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                            setFormError(null);
                            if (!form.title) setForm({ ...form, title: e.target.files[0].name.split(".")[0] });
                          }
                        }}
                        className="hidden"
                        id="local-file-input"
                      />
                      <label htmlFor="local-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                        <UploadCloud size={28} className="text-amber-600" />
                        <span className="font-bold text-amber-900 text-xs">اضغط هنا لاختيار الملف من جهازك</span>
                        <span className="text-[10px] text-stone-500">تدعم جميع الملفات: PDF, PPTX, MP4, Docx...</span>
                        <div className="mt-2 p-1.5 bg-amber-100 rounded border border-amber-200 text-[10px] text-amber-800 font-bold max-w-xs leading-snug">
                          ⚠️ هام: لكي تعمل ملفات الباوربوينت والوورد بدون إنترنت، يجب عليك حفظها كـ PDF من الكمبيوتر قبل رفعها هنا.
                        </div>
                      </label>
                      {selectedFile && (
                        <p className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-100 p-1.5 rounded-lg border border-emerald-200 truncate">
                          📁 تم اختيار: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">رابط المحتوى (URL) <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      value={form.fileUrl}
                      onChange={(e) => {
                        setForm({ ...form, fileUrl: e.target.value });
                        setFormError(null);
                      }}
                      placeholder="https://..."
                      className="w-full border border-amber-200 rounded-xl p-2.5 text-stone-800 text-xs outline-none text-left"
                      dir="ltr"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-stone-700 mb-1">الوصف المختصر</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => {
                      setForm({ ...form, description: e.target.value });
                      setFormError(null);
                    }}
                    placeholder="ملاحظات أو وصف للمحتوى..."
                    className="w-full border border-amber-200 rounded-xl p-2.5 text-stone-800 text-xs outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormError(null);
                    }}
                    className="flex-1 border border-amber-200 text-stone-600 p-2.5 rounded-xl font-bold hover:bg-amber-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-amber-600 text-white p-2.5 rounded-xl font-bold hover:bg-amber-700 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "حفظ ورفع المحتوى"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
