"use client";

import React, { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import {
  ArrowRight, Download, ExternalLink, FileText, Loader2, Maximize2, Minimize,
} from "lucide-react";

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";
  const fileType = searchParams.get("type") || "pdf";

  const isPdf = fileType === "pdf" || fileUrl.toLowerCase().endsWith(".pdf");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && viewerRef.current) {
      viewerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (!fileUrl) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-5 rounded-3xl bg-amber-100 text-amber-600 border border-amber-200">
            <FileText size={48} />
          </div>
          <h2 className="text-xl font-bold text-stone-800">لا يوجد ملف للعرض</h2>
          <p className="text-sm text-stone-500">يرجى العودة للمكتبة واختيار ملف لعرضه</p>
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer shadow-lg"
          >
            <ArrowRight size={16} />
            العودة للمكتبة
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className={`flex flex-col space-y-3 ${
        isFullscreen ? "" : "h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)]"
      }`}>

        {/* ── Toolbar ── */}
        {!isFullscreen && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/70 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
            {/* Right side - title & back */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push("/library")}
                className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 border border-amber-200"
              >
                <ArrowRight size={15} />
                <span className="hidden sm:inline">رجوع للمكتبة</span>
                <span className="sm:hidden">رجوع</span>
              </button>
              <div className="h-6 w-px bg-amber-200 flex-shrink-0 hidden sm:block" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold text-stone-900 text-sm truncate">{title}</h1>
                  <span className="text-[10px] text-stone-400 hidden sm:block">
                    {isPdf ? "ملف PDF" : "مستند"} — يُعرض داخل التطبيق
                  </span>
                </div>
              </div>
            </div>

            {/* Left side - actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 text-stone-600 hover:text-white hover:bg-amber-700 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-700"
                title="ملء الشاشة"
              >
                <Maximize2 size={14} />
                <span className="hidden sm:inline">ملء الشاشة</span>
              </button>
              <a
                href={fileUrl}
                download
                className="flex items-center gap-1.5 text-stone-600 hover:text-white hover:bg-amber-600 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-600"
                title="تحميل الملف"
              >
                <Download size={14} />
                <span className="hidden sm:inline">تحميل</span>
              </a>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-stone-600 hover:text-white hover:bg-indigo-600 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-indigo-600"
                title="فتح في تاب جديد"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">فتح في تاب جديد</span>
              </a>
            </div>
          </div>
        )}

        {/* ── File Content Area ── */}
        <div 
          ref={viewerRef}
          className={`flex-1 overflow-hidden relative min-h-0 ${
            isFullscreen 
              ? "fixed inset-0 z-[200] bg-stone-100 h-screen w-screen p-0" 
              : "bg-white rounded-2xl shadow-sm border border-amber-200/70"
          }`}
        >
          {isPdf || fileType === "document" ? (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              title={title}
              className="w-full h-full border-0 bg-stone-100"
              style={{ minHeight: "100%" }}
            />
          ) : (
            <iframe
              src={fileUrl}
              title={title}
              className="w-full h-full border-0"
              style={{ minHeight: "100%" }}
            />
          )}

          {/* ── Fullscreen exit button (floating) ── */}
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-6 left-6 z-[210] p-3 rounded-xl bg-black/80 hover:bg-black text-white transition-all shadow-2xl flex items-center gap-2 border border-white/20"
              title="الخروج من ملء الشاشة"
            >
              <Minimize size={18} />
              <span className="text-sm font-bold">إنهاء ملء الشاشة</span>
            </button>
          )}
        </div>

        {/* ── Bottom info bar (mobile-friendly) ── */}
        {!isFullscreen && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200/50 px-4 py-2.5 flex items-center justify-between text-[11px] text-amber-800 flex-shrink-0 sm:hidden">
            <span className="font-bold truncate">{title}</span>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold flex-shrink-0"
            >
              <Download size={12} />
              تحميل
            </a>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default function LibraryViewPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 size={32} className="animate-spin text-amber-600" />
          </div>
        </PageWrapper>
      }
    >
      <FileViewerContent />
    </Suspense>
  );
}
