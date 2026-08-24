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

const PptxViewer = dynamic(() => import("@/components/PptxViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-stone-100">
      <Loader2 size={36} className="animate-spin text-orange-600 mb-3" />
      <p className="text-sm font-bold text-stone-500">جاري تحميل عارض الباوربوينت...</p>
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

  // Detect mobile & online
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

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 w-full relative">
        {isPdf ? (
          /* ── PDF Viewer ── */
          <PdfViewer fileUrl={proxyPath} />
        ) : (
          /* ── PPTX Viewer (Local Render) ── */
          <PptxViewer fileUrl={proxyPath} />
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
