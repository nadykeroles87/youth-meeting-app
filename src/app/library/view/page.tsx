"use client";

import React, { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import { ArrowRight, FileText, Loader2, Maximize2, Minimize } from "lucide-react";

// Import React PDF Viewer
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";
  const fileType = searchParams.get("type") || "pdf";

  const isPdf = fileType === "pdf" || fileUrl.toLowerCase().endsWith(".pdf");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  
  // Create new plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && viewerContainerRef.current) {
      viewerContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

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
        className={`flex flex-col space-y-2 ${
          isFullscreen 
            ? "fixed inset-0 z-[200] bg-stone-100 h-screen w-screen p-0" 
            : "h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)]"
        }`}
      >
        {/* ── Custom App Toolbar (Only outside fullscreen) ── */}
        {!isFullscreen && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/70 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push("/library")}
                className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200"
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
            </div>
          </div>
        )}

        {/* Floating Custom Exit Button (Only in fullscreen) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 left-4 z-[210] p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-xl backdrop-blur-sm border border-white/20 transition-all"
            title="الخروج من ملء الشاشة"
          >
            <Minimize size={20} />
          </button>
        )}

        <div className={`flex-1 overflow-hidden relative min-h-0 bg-white ${!isFullscreen && "rounded-2xl shadow-sm border border-amber-200/70"}`}>
          {isPdf ? (
            <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
              <div style={{ height: '100%', direction: 'ltr' }}>
                <Viewer
                  fileUrl={fileUrl}
                  plugins={[defaultLayoutPluginInstance]}
                  theme="light"
                  defaultScale={1}
                />
              </div>
            </Worker>
          ) : (
            <div className="w-full h-full overflow-hidden relative">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                title={title}
                className="w-full absolute top-0 left-0 border-0"
                style={{ height: "calc(100% + 100px)" }} // Crop Google Toolbar for non-PDFs
              />
            </div>
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
