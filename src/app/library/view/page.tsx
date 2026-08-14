"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import { ArrowRight, FileText, Loader2, Maximize2, Minimize, Download, ZoomIn, ZoomOut } from "lucide-react";

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";
  const fileType = searchParams.get("type") || "pdf";

  // Check file type from both the 'type' parameter and the URL extension
  const urlLower = fileUrl.toLowerCase();
  const isPdf = fileType === "pdf" || urlLower.includes(".pdf");
  
  // Use Microsoft Office Viewer for non-PDF files (pptx, docx, etc.)
  // Use browser's native embed for actual PDF files
  const useOfficeViewer = !isPdf;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [zoom, setZoom] = useState(100);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && viewerContainerRef.current) {
      viewerContainerRef.current.requestFullscreen().catch(console.error);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  const startHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 2000);
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
    // Start hide timer initially
    startHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [startHideTimer]);

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const resetZoom = () => setZoom(100);

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
        onMouseMove={startHideTimer}
        onTouchStart={startHideTimer}
        className={`flex flex-col relative overflow-hidden ${
          isFullscreen
            ? "fixed inset-0 z-[200] bg-stone-900 h-screen w-screen"
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

        {/* Floating Exit Button (auto-hides after 2s) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className={`fixed top-4 left-4 z-[210] p-2.5 rounded-full bg-black/50 hover:bg-black/90 text-white shadow-xl backdrop-blur-sm border border-white/20 transition-all duration-500 ${
              showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
            title="الخروج من ملء الشاشة"
          >
            <Minimize size={20} />
          </button>
        )}

        {/* ── Floating Zoom Controls (auto-hides) ── */}
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[210] transition-all duration-500 ${
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md rounded-2xl px-3 py-2 shadow-2xl border border-white/10">
            <button
              onClick={zoomOut}
              className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
              title="تصغير"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={resetZoom}
              className="px-3 py-1.5 rounded-xl hover:bg-white/10 text-white text-xs font-bold transition-colors min-w-[50px]"
            >
              {zoom}%
            </button>
            <button
              onClick={zoomIn}
              className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
              title="تكبير"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        </div>

        {/* ── Content Area ── */}
        <div className={`flex-1 overflow-auto min-h-0 ${
          isFullscreen ? "bg-stone-900" : "bg-white rounded-2xl shadow-sm border border-amber-200/70"
        }`}>
          <div
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: "top center",
              width: `${10000 / zoom}%`,
              minHeight: "100%",
            }}
          >
            {useOfficeViewer ? (
              /* Microsoft Office Online Viewer for non-PDF files (PPTX, DOCX, etc.) */
              <div className="w-full relative" style={{ height: `${100 * 100 / zoom}vh` }}>
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                  title={title}
                  className="w-full h-full absolute top-0 left-0 border-0"
                />
              </div>
            ) : (
              /* Browser's native PDF viewer via embed */
              <embed
                src={fileUrl}
                type="application/pdf"
                className="w-full"
                style={{ border: "none", height: `${100 * 100 / zoom}vh` }}
              />
            )}
          </div>
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
