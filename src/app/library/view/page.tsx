"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import {
  ArrowRight, Download, ExternalLink, FileText, Loader2,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw,
  Maximize, Minimize,
} from "lucide-react";

// We use PDF.js via CDN to render PDFs natively (works great on mobile)
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155";

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";
  const fileType = searchParams.get("type") || "pdf";

  const isPdf = fileType === "pdf" || fileUrl.toLowerCase().endsWith(".pdf");

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pdfjsLibRef = useRef<any>(null);

  // Fullscreen toggle (same as Agpeya)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && viewerRef.current) {
      viewerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Load PDF.js library
  useEffect(() => {
    if (!isPdf || !fileUrl) return;

    const loadPdfJs = async () => {
      try {
        // Check if already loaded
        if ((window as any).pdfjsLib) {
          pdfjsLibRef.current = (window as any).pdfjsLib;
          loadPdf();
          return;
        }

        // Load the script dynamically
        const script = document.createElement("script");
        script.src = `${PDFJS_CDN}/pdf.min.mjs`;
        script.type = "module";

        // Use a different approach - load via import()
        const pdfjsLib = await import(
          /* webpackIgnore: true */
          `${PDFJS_CDN}/pdf.min.mjs`
        );
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
        pdfjsLibRef.current = pdfjsLib;
        (window as any).pdfjsLib = pdfjsLib;
        loadPdf();
      } catch (err) {
        console.error("Failed to load PDF.js:", err);
        setPdfError("فشل تحميل عارض الـ PDF. جرّب تحميل الملف مباشرة.");
        setPdfLoading(false);
      }
    };

    loadPdfJs();
  }, [fileUrl, isPdf]);

  // Load the actual PDF document
  const loadPdf = async () => {
    if (!pdfjsLibRef.current || !fileUrl) return;

    setPdfLoading(true);
    setPdfError(null);

    try {
      const loadingTask = pdfjsLibRef.current.getDocument(fileUrl);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setPdfLoading(false);
    } catch (err: any) {
      console.error("Failed to load PDF:", err);
      setPdfError("فشل تحميل ملف الـ PDF. تأكد من صحة الرابط أو جرّب تحميل الملف.");
      setPdfLoading(false);
    }
  };

  // Calculate optimal scale for mobile
  const calculateFitScale = useCallback((page: any) => {
    if (!containerRef.current) return 1;
    const containerWidth = containerRef.current.clientWidth - 32; // padding
    const viewport = page.getViewport({ scale: 1 });
    return containerWidth / viewport.width;
  }, []);

  // Render a page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || rendering) return;

    setRendering(true);

    try {
      const page = await pdfDoc.getPage(pageNum);

      // On first render, calculate fit-to-width scale
      let renderScale = scale;
      if (scale === 1 && containerRef.current) {
        const fitScale = calculateFitScale(page);
        renderScale = fitScale;
        setScale(fitScale);
      }

      const viewport = page.getViewport({ scale: renderScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.scale(dpr, dpr);

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error("Failed to render page:", err);
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, scale, rendering, calculateFitScale]);

  // Render when page or doc changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage]);

  // Re-render when scale changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0 && !rendering) {
      renderPage(currentPage);
    }
  }, [scale]);

  // Navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const zoomIn = () => setScale((s) => Math.min(s * 1.25, 5));
  const zoomOut = () => setScale((s) => Math.max(s * 0.8, 0.3));
  const resetZoom = () => {
    if (pdfDoc && containerRef.current) {
      pdfDoc.getPage(currentPage).then((page: any) => {
        setScale(calculateFitScale(page));
      });
    }
  };

  // Touch gesture support for swipe navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

    // Only trigger on horizontal swipes (not vertical scrolling)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0) {
        // Swipe right → previous page (RTL layout)
        goToPage(currentPage + 1);
      } else {
        // Swipe left → next page (RTL layout)
        goToPage(currentPage - 1);
      }
    }
    touchStartRef.current = null;
  };

  if (!fileUrl) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="p-5 rounded-3xl bg-amber-100 text-amber-600 border border-amber-200">
            <FileText size={48} />
          </div>
          <h2 className="text-xl font-bold text-stone-800">لا يوجد ملف للعرض</h2>
          <p className="text-sm text-stone-500">يرجى العودة للمكتبة واختيار ملف لعرضه</p>
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer shadow-lg"
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
        ref={viewerRef}
        className={`flex flex-col space-y-2 ${
          isFullscreen
            ? "fixed inset-0 z-[200] bg-black h-screen w-screen p-0"
            : "h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)]"
        }`}
      >

        {/* ── Toolbar (hidden in fullscreen) ── */}
        {!isFullscreen && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/70 px-3 py-2.5 flex items-center justify-between gap-2 flex-shrink-0">
            {/* Right side - title & back */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => router.push("/library")}
                className="flex items-center gap-1 text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 border border-amber-200"
              >
                <ArrowRight size={14} />
                <span className="hidden sm:inline">رجوع</span>
              </button>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
                  <FileText size={14} />
                </div>
                <h1 className="font-bold text-stone-900 text-xs sm:text-sm truncate">{title}</h1>
              </div>
            </div>

            {/* Left side - actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1 text-stone-600 hover:text-white hover:bg-amber-700 p-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-700"
                title="ملء الشاشة للقراءة"
              >
                <Maximize size={14} />
              </button>
              <a
                href={fileUrl}
                download
                className="flex items-center gap-1 text-stone-600 hover:text-white hover:bg-amber-600 p-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-amber-600"
                title="تحميل الملف"
              >
                <Download size={14} />
              </a>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-stone-600 hover:text-white hover:bg-indigo-600 p-2 rounded-xl text-xs font-bold transition-all border border-amber-200 hover:border-indigo-600"
                title="فتح في تاب جديد"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}

        {/* ── PDF Controls (zoom + page nav) ── */}
        {isPdf && pdfDoc && (
          <div className={`flex items-center justify-between gap-2 flex-shrink-0 ${
            isFullscreen
              ? "absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-2xl border border-white/10 max-w-[95vw]"
              : "bg-white rounded-2xl shadow-sm border border-amber-200/70 px-3 py-2"
          }`}>
            {/* Fullscreen: Exit button */}
            {isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 flex-shrink-0"
                title="الخروج من ملء الشاشة"
              >
                <Minimize size={16} />
              </button>
            )}

            {/* Page Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
                  isFullscreen ? "hover:bg-white/10 text-white" : "hover:bg-amber-50 text-stone-600"
                }`}
              >
                <ChevronRight size={18} />
              </button>
              <div className={`flex items-center gap-1 text-xs font-bold ${
                isFullscreen ? "text-white" : "text-stone-700"
              }`}>
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => {
                    const p = parseInt(e.target.value);
                    if (p >= 1 && p <= totalPages) setCurrentPage(p);
                  }}
                  className={`w-10 text-center rounded-lg py-1 text-xs outline-none ${
                    isFullscreen
                      ? "bg-white/10 border border-white/20 text-white focus:border-amber-400"
                      : "border border-amber-200 focus:border-amber-500"
                  }`}
                  min={1}
                  max={totalPages}
                />
                <span className={isFullscreen ? "text-white/50" : "text-stone-400"}>/ {totalPages}</span>
              </div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
                  isFullscreen ? "hover:bg-white/10 text-white" : "hover:bg-amber-50 text-stone-600"
                }`}
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className={`p-1.5 rounded-lg transition-colors ${
                  isFullscreen ? "hover:bg-white/10 text-white" : "hover:bg-amber-50 text-stone-600"
                }`}
                title="تصغير"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={resetZoom}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                  isFullscreen ? "hover:bg-white/10 text-white" : "hover:bg-amber-50 text-stone-600"
                }`}
                title="ملائمة العرض"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={zoomIn}
                className={`p-1.5 rounded-lg transition-colors ${
                  isFullscreen ? "hover:bg-white/10 text-white" : "hover:bg-amber-50 text-stone-600"
                }`}
                title="تكبير"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── File Content Area ── */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-auto relative min-h-0 ${
            isFullscreen
              ? "bg-black rounded-none border-none"
              : "bg-stone-100 rounded-2xl shadow-sm border border-amber-200/70"
          }`}
          onTouchStart={isPdf ? handleTouchStart : undefined}
          onTouchEnd={isPdf ? handleTouchEnd : undefined}
        >
          {isPdf ? (
            /* ── Native PDF Renderer ── */
            <>
              {pdfLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 z-10">
                  <Loader2 size={36} className="animate-spin text-amber-600 mb-3" />
                  <p className="text-sm font-bold text-stone-600">جاري تحميل الملف...</p>
                  <p className="text-xs text-stone-400 mt-1">قد يستغرق بعض الوقت حسب حجم الملف</p>
                </div>
              )}

              {pdfError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 z-10 p-6 text-center">
                  <div className="p-4 rounded-2xl bg-red-50 text-red-500 border border-red-200 mb-4">
                    <FileText size={40} />
                  </div>
                  <h3 className="font-bold text-stone-800 text-base mb-1">لم يتم تحميل الملف</h3>
                  <p className="text-xs text-stone-500 mb-4 max-w-xs">{pdfError}</p>
                  <div className="flex gap-2">
                    <a
                      href={fileUrl}
                      download
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      <Download size={14} />
                      تحميل الملف مباشرة
                    </a>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      <ExternalLink size={14} />
                      فتح خارجيًا
                    </a>
                  </div>
                </div>
              )}

              {!pdfError && (
                <div className="flex justify-center p-4 min-h-full">
                  <canvas
                    ref={canvasRef}
                    className="shadow-lg rounded-lg bg-white max-w-full"
                    style={{ touchAction: "pan-y pinch-zoom" }}
                  />
                </div>
              )}

              {/* Rendering indicator */}
              {rendering && !pdfLoading && (
                <div className="absolute top-3 left-3 bg-amber-600 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-lg z-20">
                  <Loader2 size={12} className="animate-spin" />
                  جاري العرض...
                </div>
              )}
            </>
          ) : (
            /* ── Non-PDF: use Google Docs Viewer as fallback ── */
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              title={title}
              className="w-full h-full border-0 bg-stone-100"
              style={{ minHeight: "100%" }}
            />
          )}
        </div>

        {/* ── Mobile Bottom Bar with swipe hint ── */}
        {isPdf && pdfDoc && !isFullscreen && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200/50 px-4 py-2 flex items-center justify-between text-[11px] text-amber-800 flex-shrink-0 sm:hidden">
            <span className="text-amber-600 font-medium">👆 اسحب يمين/شمال للتنقل بين الصفحات</span>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold flex-shrink-0"
            >
              <Download size={12} />
              تحميل
            </a>
          </div>
        )}

        {/* ── Non-PDF bottom bar ── */}
        {!isPdf && !isFullscreen && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200/50 px-4 py-2.5 flex items-center justify-between text-[11px] text-amber-800 flex-shrink-0 sm:hidden">
            <span className="font-bold truncate">{title}</span>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold flex-shrink-0"
            >
              <Download size={12} />
              تحميل
            </a>
          </div>
        )}
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
