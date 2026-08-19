"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Loader2, Download, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the PDF viewer (no SSR - avoids DOMMatrix/window errors)
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-stone-100">
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

  // Detect file type from URL extension, fallback to type param
  const urlLower = fileUrl.toLowerCase();
  const isPptx = urlLower.includes(".ppt") || urlLower.includes(".doc") || fileType === "presentation" || fileType === "document";
  const isPdf = !isPptx;

  // Proxy URL for PDF viewer (same-origin, avoids CORS)
  const proxyPath = `/api/file-proxy/document.pdf?url=${encodeURIComponent(fileUrl)}`;

  // Microsoft Office Viewer for PPTX/DOCX
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pptxLoaded, setPptxLoaded] = useState(false);
  const [pptxError, setPptxError] = useState(false);

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

  // PPTX iframe load timeout (if it takes more than 30s, show error)
  useEffect(() => {
    if (!isPptx || !isOnline) return;
    const timer = setTimeout(() => {
      if (!pptxLoaded) setPptxError(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [isPptx, isOnline, pptxLoaded]);

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4 bg-stone-50">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
          <FileText size={36} className="text-amber-600" />
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
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <Loader2 size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  const showOffline = !isOnline && isPptx;

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* ── Top Toolbar ── */}
      <div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-1 text-amber-700 hover:text-amber-900 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-amber-50 border border-amber-200"
          >
            <ArrowRight size={14} />
            <span className="hidden sm:inline">رجوع للمكتبة</span>
            <span className="sm:hidden">رجوع</span>
          </button>
          <h1 className="font-bold text-stone-800 text-xs truncate max-w-[140px] sm:max-w-[300px]">{title}</h1>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isPptx && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-stone-200"
              title="فتح في تبويب جديد"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <a
            href={fileUrl}
            download
            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-stone-200"
            title="تحميل الملف"
          >
            <Download size={14} />
          </a>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 w-full relative">
        {showOffline ? (
          /* ── Offline Fallback ── */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-50">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={32} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">تعذر عرض الملف</h3>
            <p className="text-stone-500 mb-6 max-w-sm text-sm">
              يحتاج عرض هذا الملف إلى اتصال بالإنترنت
            </p>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Download size={18} />
              تحميل الملف
            </a>
          </div>
        ) : isPdf ? (
          /* ── PDF Viewer ── */
          <PdfViewer fileUrl={proxyPath} />
        ) : (
          /* ── PPTX/DOCX Viewer (Microsoft Office Online) ── */
          <div className="w-full h-full relative bg-white">
            {/* Loading state */}
            {!pptxLoaded && !pptxError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-amber-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border-2 border-white">
                    <FileText size={14} className="text-green-600" />
                  </div>
                </div>
                <p className="text-sm font-bold text-stone-700">جاري تحميل العرض التقديمي...</p>
                <p className="text-xs text-stone-400 mt-1">يتم فتح الملف عبر Microsoft Office</p>
                <div className="mt-6 w-48 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            )}

            {/* Error state */}
            {pptxError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-100">
                  <FileText size={32} className="text-red-400" />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">تعذر عرض الملف</h3>
                <p className="text-xs text-stone-500 mb-5 max-w-xs text-center">
                  قد يكون الملف كبيراً أو غير مدعوم. جرّب تحميله وفتحه على جهازك.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPptxError(false); setPptxLoaded(false); }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all"
                  >
                    إعادة المحاولة
                  </button>
                  <a
                    href={fileUrl}
                    download
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    <Download size={14} />
                    تحميل
                  </a>
                </div>
              </div>
            )}

            {/* Office Viewer iframe */}
            <iframe
              src={officeViewerUrl}
              title={title}
              className={`w-full h-full border-0 transition-opacity duration-500 ${
                pptxLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => { setPptxLoaded(true); setPptxError(false); }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LibraryViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-stone-50">
          <Loader2 size={32} className="animate-spin text-amber-600" />
        </div>
      }
    >
      <FileViewerContent />
    </Suspense>
  );
}
