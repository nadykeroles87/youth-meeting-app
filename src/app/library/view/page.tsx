"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import PageWrapper from "@/components/PageWrapper";
import { ArrowRight, FileText, Loader2, Maximize2, Minimize, Download } from "lucide-react";

// Dynamically import react-pdf to avoid SSR issues (DOMMatrix not available on server)
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 size={36} className="animate-spin text-amber-600 mb-3" />
      <p className="text-sm font-bold text-stone-500">جاري تحميل العارض...</p>
    </div>
  ),
});

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";
  const fileType = searchParams.get("type") || "pdf";

  const isPdf = fileType === "pdf" || fileUrl.toLowerCase().endsWith(".pdf");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitBtn, setShowExitBtn] = useState(true);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && viewerContainerRef.current) {
      viewerContainerRef.current.requestFullscreen().catch(console.error);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (isFull) startHideTimer();
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const startHideTimer = useCallback(() => {
    setShowExitBtn(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowExitBtn(false), 2000);
  }, []);

  useEffect(() => {
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  if (!fileUrl) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-5 rounded-3xl bg-amber-100 text-amber-600 border border-amber-200">
            <FileText size={48} />
          </div>
          <h2 className="text-xl font-bold text-stone-800">لا يوجد ملف للعرض</h2>
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all"
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
      <div
        ref={viewerContainerRef}
        className={`flex flex-col ${
          isFullscreen
            ? "fixed inset-0 z-[200] bg-stone-800 h-screen w-screen"
            : "h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)]"
        }`}
      >
        {/* ── App Toolbar ── */}
        {!isFullscreen && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/70 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push("/library")}
                className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200"
              >
                <ArrowRight size={15} />
                <span className="hidden sm:inline">رجوع للمكتبة</span>
                <span className="sm:hidden">رجوع</span>
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
                  <FileText size={16} />
                </div>
                <h1 className="font-bold text-stone-900 text-sm truncate">{title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 text-stone-600 hover:text-white hover:bg-amber-700 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-700"
              >
                <Maximize2 size={14} />
                <span className="hidden sm:inline">ملء الشاشة</span>
              </button>
              <a
                href={fileUrl}
                download
                className="flex items-center gap-1.5 text-stone-600 hover:text-white hover:bg-amber-600 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-600"
              >
                <Download size={14} />
                <span className="hidden sm:inline">تحميل</span>
              </a>
            </div>
          </div>
        )}

        {/* Floating Exit Button (Only in fullscreen, auto-hides) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className={`fixed top-4 left-4 z-[210] p-2.5 rounded-full bg-black/50 hover:bg-black/90 text-white shadow-xl backdrop-blur-sm border border-white/20 transition-all duration-500 ${
              showExitBtn ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
            title="الخروج من ملء الشاشة"
          >
            <Minimize size={20} />
          </button>
        )}

        {/* ── Clean Content Area ── */}
        <div
          onMouseMove={isFullscreen ? startHideTimer : undefined}
          onTouchStart={isFullscreen ? startHideTimer : undefined}
          className={`flex-1 overflow-auto min-h-0 ${
            isFullscreen ? "bg-stone-800" : "bg-stone-200 rounded-2xl border border-amber-200/70"
          }`}>
          {isPdf ? (
            <PdfViewer fileUrl={fileUrl} />
          ) : (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>
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
