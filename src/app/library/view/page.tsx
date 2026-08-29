"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Loader2, Download, WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useFileCache } from "@/hooks/useFileCache";

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
  const typeParam = searchParams.get("type")?.toLowerCase() || "";

  // Detect file type rigorously
  const urlLower = fileUrl.toLowerCase();
  
  let detectedType: FileExtensionType = "unknown";
  if (typeParam === "pptx" || urlLower.includes(".pptx") || urlLower.includes(".ppt")) {
    detectedType = "pptx";
  } else if (typeParam === "pdf" || urlLower.includes(".pdf")) {
    detectedType = "pdf";
  } else if (typeParam === "docx" || urlLower.includes(".docx") || urlLower.includes(".doc")) {
    detectedType = "docx";
  } else if (typeParam === "xlsx" || urlLower.includes(".xlsx") || urlLower.includes(".xls") || urlLower.includes(".csv")) {
    detectedType = "xlsx";
  } else if (typeParam === "document") {
    // If generic document, check url or default to pptx/pdf
    if (urlLower.includes(".ppt")) detectedType = "pptx";
    else if (urlLower.includes(".doc")) detectedType = "docx";
    else if (urlLower.includes(".xls")) detectedType = "xlsx";
    else detectedType = "pdf";
  } else {
    detectedType = "pdf"; // Default fallback
  }

  // Normalize URLs to get raw binary data instead of HTML wrapper pages
  let normalizedUrl = fileUrl;
  
  // 1. GitHub Blob URLs
  if (normalizedUrl.includes("github.com") && normalizedUrl.includes("/blob/")) {
    normalizedUrl = normalizedUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  }
  
  // 2. Google Drive URLs
  if (normalizedUrl.includes("drive.google.com/file/d/")) {
    const match = normalizedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      normalizedUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  // Proxy URL (same-origin, avoids CORS)
  const proxyPath = `/api/file-proxy?type=${detectedType}&url=${encodeURIComponent(normalizedUrl)}`;

  const { data, blobUrl, loading, error, fromCache, isOfflineReady } = useFileCache(proxyPath);

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
      className="h-[100dvh] w-screen flex flex-col bg-stone-950 overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ── Top Toolbar ── */}
      <div className="bg-stone-900 border-b border-stone-800 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 flex-shrink-0 z-20 shadow-md text-white">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-200 px-2 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-stone-800 border border-stone-700 flex-shrink-0"
          >
            <ArrowRight size={14} />
            <span className="hidden sm:inline">رجوع للمكتبة</span>
            <span className="sm:hidden">رجوع</span>
          </button>
          <h1 className="font-bold text-stone-100 text-[11px] sm:text-xs truncate max-w-[140px] sm:max-w-[300px]">{title}</h1>
          {isOfflineReady && (
            <div className="flex items-center gap-1 bg-emerald-950/70 border border-emerald-700 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold" title="محفوظ للعرض بدون إنترنت">
              <WifiOff size={10} />
              <span className="hidden sm:inline">محفوظ</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={async () => {
              try {
                const res = await fetch(proxyPath);
                if (!res.ok) throw new Error("Download failed");
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                // Extract filename from URL
                const urlParts = fileUrl.split("/");
                a.download = decodeURIComponent(urlParts[urlParts.length - 1].split("?")[0]) || "file";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
              } catch {
                // Fallback to direct link
                window.open(fileUrl, "_blank");
              }
            }}
            className="p-1.5 rounded-lg text-stone-300 hover:text-amber-400 hover:bg-stone-800 transition-colors border border-stone-700"
            title="تحميل الملف"
          >
            <Download size={13} className="sm:w-[14px] sm:h-[14px]" />
          </button>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 w-full relative bg-stone-950">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-center px-6">
            <Loader2 size={32} className="animate-spin text-amber-600 mb-4" />
            <h3 className="font-bold text-stone-800 text-base mb-2">جاري تجهيز الملف...</h3>
            <p className="text-xs text-stone-500 mb-5">يرجى الانتظار بينما نقوم بتهيئة المستند للعرض.</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <FileText size={32} className="text-red-400" />
            </div>
            <h3 className="font-bold text-stone-800 text-base mb-2">فشل تحميل المستند</h3>
            <p className="text-xs text-stone-500 mb-5">{error}</p>
          </div>
        ) : (
          <>
            {detectedType === "pdf" && <PdfViewer fileUrl={proxyPath} cachedBlobUrl={blobUrl} fromCache={fromCache} />}
            {detectedType === "pptx" && <PptxViewer fileUrl={proxyPath} cachedData={data} fromCache={fromCache} />}
            {detectedType === "docx" && <DocxViewer fileUrl={proxyPath} />}
            {detectedType === "xlsx" && <XlsxViewer fileUrl={proxyPath} />}
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
        <div className="flex items-center justify-center min-h-screen bg-stone-50">
          <Loader2 size={32} className="animate-spin text-amber-600" />
        </div>
      }
    >
      <FileViewerContent />
    </Suspense>
  );
}
