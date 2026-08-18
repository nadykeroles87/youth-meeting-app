"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Loader2, Maximize2, Minimize, Download } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the custom PDF viewer (no SSR to avoid DOMMatrix errors)
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

  // Check file type from both the 'type' parameter and the URL extension
  const urlLower = fileUrl.toLowerCase();
  const isPdf = fileType === "pdf" || urlLower.includes(".pdf");
  const isPptx = fileType === "presentation" || fileType === "document" || 
                 urlLower.includes(".ppt") || urlLower.includes(".doc");

  // Proxy URL for PDF viewer
  const proxyPath = `/api/file-proxy/document.pdf?url=${encodeURIComponent(fileUrl)}`;
  const absoluteProxyUrl = typeof window !== "undefined" 
    ? `${window.location.origin}${proxyPath}`
    : `https://youth-meeting-app.vercel.app${proxyPath}`;

  // Google Docs Viewer URL for PPTX/DOCX files
  const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitBtn, setShowExitBtn] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && viewerContainerRef.current) {
      viewerContainerRef.current.requestFullscreen().catch(console.error);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  const startHideTimer = useCallback(() => {
    setShowExitBtn(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowExitBtn(false), 2000);
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
      startHideTimer();
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [startHideTimer]);

  useEffect(() => {
    startHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [startHideTimer]);

  if (!fileUrl) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center text-center space-y-4 p-4">
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
    );
  }

  // Determine which viewer to use
  const usePdfViewer = isPdf;
  const useGoogleViewer = isPptx && isOnline;
  const showOfflineFallback = isPptx && !isOnline;

  return (
    <div className="min-h-screen bg-amber-50">
      <div
        ref={viewerContainerRef}
        onMouseMove={startHideTimer}
        onTouchStart={startHideTimer}
        className={`flex flex-col relative overflow-hidden ${
          isFullscreen
            ? "fixed inset-0 z-[200] bg-stone-900 h-screen w-screen"
            : "h-screen"
        }`}
      >
        {/* ── App Toolbar ── */}
        {!isFullscreen && (
          <div className="bg-white shadow-sm border-b border-amber-200/70 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
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
              </button>
              <a
                href={fileUrl}
                download
                className="flex items-center gap-1.5 text-stone-600 hover:text-white hover:bg-amber-600 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-600"
              >
                <Download size={14} />
              </a>
            </div>
          </div>
        )}

        {/* Floating Exit Button (auto-hides) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className={`absolute top-4 left-4 z-[210] p-2.5 rounded-full bg-black/50 hover:bg-black/90 text-white shadow-xl backdrop-blur-sm border border-white/20 transition-all duration-500 ${
              showExitBtn ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
            title="الخروج من ملء الشاشة"
          >
            <Minimize size={20} />
          </button>
        )}

        {/* ── Content Area ── */}
        <div className={`flex-1 overflow-auto min-h-0 ${
          isFullscreen ? "bg-stone-900" : "bg-white"
        }`}>
          {usePdfViewer ? (
            /* PDF files: use react-pdf viewer */
            <PdfViewer fileUrl={absoluteProxyUrl} />
          ) : useGoogleViewer ? (
            /* PPTX/DOCX files when online: use Google Docs Viewer */
            <iframe
              src={googleDocsUrl}
              title={title}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : showOfflineFallback ? (
            /* PPTX/DOCX files when offline: show download option */
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 p-6 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">تعذر عرض الملف</h3>
              <p className="text-stone-500 mb-6 max-w-sm text-sm leading-relaxed">
                ملفات الوورد والباوربوينت تحتاج إلى اتصال بالإنترنت لعرضها. يرجى تحميل الملف لفتحه على جهازك.
              </p>
              <a
                href={fileUrl}
                download
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-amber-600/30"
              >
                <Download size={18} />
                تحميل الملف
              </a>
            </div>
          ) : (
            <PdfViewer fileUrl={absoluteProxyUrl} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LibraryViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-amber-50 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-amber-600" />
        </div>
      }
    >
      <FileViewerContent />
    </Suspense>
  );
}
