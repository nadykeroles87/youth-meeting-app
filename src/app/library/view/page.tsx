"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Loader2, Download } from "lucide-react";

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";
  const fileType = searchParams.get("type") || "pdf";

  // Check file type strictly from URL extension if available, fallback to 'type' param
  const urlLower = fileUrl.toLowerCase();
  const isPptx = urlLower.includes(".ppt") || urlLower.includes(".doc") || fileType === "presentation" || fileType === "document";
  const isPdf = !isPptx;

  // Google Docs Viewer for PDF (renders as images - works perfectly on mobile)
  const googlePdfUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  // Microsoft Office Viewer for PPTX/DOCX
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4 bg-amber-50">
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

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-50">
        <Loader2 size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  // Choose the right viewer URL
  const viewerUrl = isPptx ? officeViewerUrl : googlePdfUrl;
  const showOffline = !isOnline;

  return (
    <div className="h-screen w-screen flex flex-col bg-amber-50 overflow-hidden">
      {/* ── Simple Toolbar ── */}
      <div className="bg-white shadow-sm border-b border-amber-200/70 px-3 py-2.5 flex items-center justify-between gap-2 flex-shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200"
          >
            <ArrowRight size={15} />
            رجوع
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
              <FileText size={14} />
            </div>
            <h1 className="font-bold text-stone-900 text-xs truncate max-w-[180px] sm:max-w-none">{title}</h1>
          </div>
        </div>

        <a
          href={fileUrl}
          download
          className="flex items-center gap-1.5 text-stone-600 hover:text-white hover:bg-amber-600 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-600 flex-shrink-0"
        >
          <Download size={14} />
        </a>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 w-full relative bg-white">
        {showOffline ? (
          /* Offline fallback */
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 p-6 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={32} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">تعذر عرض الملف</h3>
            <p className="text-stone-500 mb-6 max-w-sm text-sm leading-relaxed">
              عرض الملفات يحتاج إلى اتصال بالإنترنت. يرجى تحميل الملف لفتحه على جهازك.
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
          <>
            {/* Loading spinner - shown until iframe loads */}
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50 z-10">
                <Loader2 size={36} className="animate-spin text-amber-600 mb-3" />
                <p className="text-sm font-bold text-stone-500">جاري تحميل الملف...</p>
              </div>
            )}
            {/* The iframe - simple, reliable, works on all devices */}
            <iframe
              src={viewerUrl}
              title={title}
              className="w-full h-full border-0"
              onLoad={() => setIframeLoaded(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function LibraryViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-amber-50">
          <Loader2 size={32} className="animate-spin text-amber-600" />
        </div>
      }
    >
      <FileViewerContent />
    </Suspense>
  );
}
