"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Loader2, Download } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import viewers (no SSR - avoids DOMMatrix/window errors)
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-stone-100">
      <Loader2 size={36} className="animate-spin text-amber-600 mb-3" />
      <p className="text-sm font-bold text-stone-500">جاري تحميل عارض الـ PDF...</p>
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

const DocxViewer = dynamic(() => import("@/components/DocxViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-stone-100">
      <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
      <p className="text-sm font-bold text-stone-500">جاري تحميل عارض المستندات...</p>
    </div>
  ),
});

const XlsxViewer = dynamic(() => import("@/components/XlsxViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-stone-100">
      <Loader2 size={36} className="animate-spin text-green-600 mb-3" />
      <p className="text-sm font-bold text-stone-500">جاري تحميل عارض الجداول...</p>
    </div>
  ),
});

type FileExtensionType = "pdf" | "pptx" | "docx" | "xlsx" | "unknown";

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";

  // Detect file type rigorously
  const urlLower = fileUrl.toLowerCase();
  
  let detectedType: FileExtensionType = "unknown";
  if (urlLower.includes(".pdf")) {
    detectedType = "pdf";
  } else if (urlLower.includes(".ppt")) {
    detectedType = "pptx";
  } else if (urlLower.includes(".doc")) {
    detectedType = "docx";
  } else if (urlLower.includes(".xls") || urlLower.includes(".csv")) {
    detectedType = "xlsx";
  } else {
    detectedType = "pdf"; // Default fallback
  }

  // Proxy URL (same-origin, avoids CORS)
  const proxyPath = `/api/file-proxy/document.pdf?url=${encodeURIComponent(fileUrl)}`;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        {detectedType === "pdf" && <PdfViewer fileUrl={proxyPath} />}
        {detectedType === "pptx" && <PptxViewer fileUrl={proxyPath} />}
        {detectedType === "docx" && <DocxViewer fileUrl={proxyPath} />}
        {detectedType === "xlsx" && <XlsxViewer fileUrl={proxyPath} />}
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
