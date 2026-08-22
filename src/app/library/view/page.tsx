"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Loader2, Download, ExternalLink, RefreshCw } from "lucide-react";
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

type ViewerType = "office" | "google" | "none";

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

  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [viewerError, setViewerError] = useState(false);
  const [activeViewer, setActiveViewer] = useState<ViewerType>("none");
  const [retryKey, setRetryKey] = useState(0);

  // Get absolute URL for external viewers
  const getAbsoluteUrl = (url: string) => {
    if (!mounted || !url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const absoluteFileUrl = getAbsoluteUrl(fileUrl);
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteFileUrl)}`;
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(absoluteFileUrl)}&embedded=true`;

  // Detect mobile
  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);
    setIsMobile(/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Choose initial viewer for PPTX/DOCX
  useEffect(() => {
    if (!isPptx || !mounted) return;
    // On mobile, start with Google Docs Viewer (more reliable)
    // On desktop, start with Office Viewer
    setActiveViewer(isMobile ? "google" : "office");
    setViewerLoaded(false);
    setViewerError(false);
  }, [isPptx, mounted, isMobile]);

  // Timeout for viewer loading (45s instead of 15s)
  useEffect(() => {
    if (!isPptx || !isOnline || activeViewer === "none") return;
    const timer = setTimeout(() => {
      if (!viewerLoaded) {
        // If current viewer failed, try the other one
        if (activeViewer === "office") {
          setActiveViewer("google");
          setViewerLoaded(false);
          setViewerError(false);
        } else if (activeViewer === "google") {
          setViewerError(true);
        }
      }
    }, 45000);
    return () => clearTimeout(timer);
  }, [isPptx, isOnline, viewerLoaded, activeViewer, retryKey]);

  const handleRetry = useCallback(() => {
    setViewerLoaded(false);
    setViewerError(false);
    setActiveViewer(isMobile ? "google" : "office");
    setRetryKey((k) => k + 1);
  }, [isMobile]);

  const switchViewer = useCallback(() => {
    setViewerLoaded(false);
    setViewerError(false);
    setActiveViewer((prev) => prev === "office" ? "google" : "office");
    setRetryKey((k) => k + 1);
  }, []);

  const currentViewerUrl = activeViewer === "office" ? officeViewerUrl : googleViewerUrl;

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
    <div
      className="h-[100dvh] w-screen flex flex-col bg-stone-50 overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ── Top Toolbar ── */}
      <div className="bg-white border-b border-stone-200 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-1 text-amber-700 hover:text-amber-900 px-2 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-amber-50 border border-amber-200 flex-shrink-0"
          >
            <ArrowRight size={14} />
            <span className="hidden sm:inline">رجوع للمكتبة</span>
            <span className="sm:hidden">رجوع</span>
          </button>
          <h1 className="font-bold text-stone-800 text-[11px] sm:text-xs truncate max-w-[120px] sm:max-w-[300px]">{title}</h1>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isPptx && activeViewer !== "none" && (
            <button
              onClick={switchViewer}
              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-stone-200"
              title={activeViewer === "office" ? "جرّب Google Viewer" : "جرّب Office Viewer"}
            >
              <RefreshCw size={13} className="sm:w-[14px] sm:h-[14px]" />
            </button>
          )}
          {isPptx && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-stone-200"
              title="فتح في تبويب جديد"
            >
              <ExternalLink size={13} className="sm:w-[14px] sm:h-[14px]" />
            </a>
          )}
          <a
            href={fileUrl}
            download
            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-stone-200"
            title="تحميل الملف"
          >
            <Download size={13} className="sm:w-[14px] sm:h-[14px]" />
          </a>
        </div>
      </div>

      {/* ── Active Viewer Indicator ── */}
      {isPptx && viewerLoaded && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-1 text-center flex-shrink-0">
          <span className="text-[10px] font-bold text-emerald-700">
            {activeViewer === "office" ? "📄 Microsoft Office Viewer" : "📄 Google Docs Viewer"}
          </span>
        </div>
      )}

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
          /* ── PPTX/DOCX Viewer with auto-fallback ── */
          <div className="w-full h-full relative bg-white">
            {/* Loading state */}
            {!viewerLoaded && !viewerError && (
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
                <p className="text-xs text-stone-400 mt-1">
                  {activeViewer === "office" ? "يتم فتح الملف عبر Microsoft Office" : "يتم فتح الملف عبر Google Docs"}
                </p>
                <div className="mt-6 w-48 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
                <p className="text-[10px] text-stone-300 mt-3">
                  لو ما اشتغل هيتم تجربة عارض تاني تلقائياً...
                </p>
              </div>
            )}

            {/* Error state - both viewers failed */}
            {viewerError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-6">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-100">
                  <FileText size={32} className="text-red-400" />
                </div>
                <h3 className="font-bold text-stone-800 mb-2 text-center">تعذر عرض الملف</h3>
                <p className="text-xs text-stone-500 mb-5 max-w-xs text-center">
                  قد يكون الملف كبيراً أو غير مدعوم. جرّب تحميله وفتحه على جهازك أو جرّب عارض تاني.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-xs">
                  <button
                    onClick={handleRetry}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={13} />
                    إعادة المحاولة
                  </button>
                  <a
                    href={fileUrl}
                    download
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    <Download size={13} />
                    تحميل الملف
                  </a>
                </div>
                {/* Direct links as last resort */}
                <div className="mt-4 flex flex-col items-center gap-1.5">
                  <a
                    href={googleViewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={11} />
                    فتح في Google Docs Viewer
                  </a>
                  <a
                    href={officeViewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={11} />
                    فتح في Office Online
                  </a>
                </div>
              </div>
            )}

            {/* Viewer iframe */}
            <iframe
              key={`viewer-${activeViewer}-${retryKey}`}
              src={currentViewerUrl}
              title={title}
              className={`w-full h-full border-0 transition-opacity duration-500 ${
                viewerLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => { setViewerLoaded(true); setViewerError(false); }}
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
