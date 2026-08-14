"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import {
  ArrowRight, Download, ExternalLink, FileText, Loader2,
  ZoomIn, ZoomOut, RotateCw, Maximize, Minimize,
} from "lucide-react";

// We use PDF.js via CDN to render PDFs natively
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155";

const PdfPage = React.memo(({ 
  pdfDoc, 
  pageNum, 
  scale 
}: { 
  pdfDoc: any; 
  pageNum: number; 
  scale: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection observer to only render pages when they are near the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px" } // Render when within 800px of scrolling into view
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !pdfDoc || !canvasRef.current) return;
    
    let active = true;
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.scale(dpr, dpr);

        await page.render({ canvasContext: context, viewport }).promise;
        if (active) setRendered(true);
      } catch (err) {
        console.error(`Failed to render page ${pageNum}:`, err);
      }
    };
    render();
    return () => { active = false; };
  }, [pdfDoc, pageNum, scale, isVisible]);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center mb-6 relative w-full"
      style={{ minHeight: rendered ? 'auto' : '800px' }} // Placeholder height before rendering
    >
      <canvas 
        ref={canvasRef} 
        className="shadow-lg bg-white rounded-sm max-w-full"
      />
      {!rendered && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      )}
    </div>
  );
});

function FileViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "عرض الملف";
  const fileType = searchParams.get("type") || "pdf";

  const isPdf = fileType === "pdf" || fileUrl.toLowerCase().endsWith(".pdf");

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2); // Default scale
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pdfjsLibRef = useRef<any>(null);

  // Fullscreen toggle
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
        if ((window as any).pdfjsLib) {
          pdfjsLibRef.current = (window as any).pdfjsLib;
          loadPdf();
          return;
        }

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
      
      // Calculate fit scale based on first page width
      if (containerRef.current) {
        const firstPage = await pdf.getPage(1);
        const containerWidth = containerRef.current.clientWidth - 32;
        const viewport = firstPage.getViewport({ scale: 1 });
        // Set scale to fit width, but don't zoom in excessively on large screens
        const fitScale = Math.min(containerWidth / viewport.width, 2.5);
        setScale(fitScale);
      }
      
      setPdfLoading(false);
    } catch (err: any) {
      console.error("Failed to load PDF:", err);
      setPdfError("فشل تحميل ملف الـ PDF. تأكد من صحة الرابط أو جرّب تحميل الملف.");
      setPdfLoading(false);
    }
  };

  const zoomIn = () => setScale((s) => Math.min(s * 1.25, 5));
  const zoomOut = () => setScale((s) => Math.max(s * 0.8, 0.3));
  const resetZoom = () => {
    if (pdfDoc && containerRef.current) {
      pdfDoc.getPage(1).then((page: any) => {
        const containerWidth = containerRef.current!.clientWidth - 32;
        const viewport = page.getViewport({ scale: 1 });
        setScale(Math.min(containerWidth / viewport.width, 2.5));
      });
    }
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
            ? "fixed inset-0 z-[200] bg-stone-900 h-screen w-screen p-0"
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

        {/* ── PDF Controls (Floating in fullscreen) ── */}
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

            <div className={`text-xs font-bold px-2 ${isFullscreen ? "text-white" : "text-stone-700"}`}>
              {totalPages} صفحة
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
              ? "bg-stone-900 rounded-none border-none p-4"
              : "bg-stone-200 rounded-2xl shadow-sm border border-amber-200/70 p-4"
          }`}
        >
          {isPdf && !useFallback ? (
            /* ── Native PDF Renderer (Continuous Scrolling) ── */
            <div className="flex flex-col items-center max-w-5xl mx-auto">
              {pdfLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <Loader2 size={36} className="animate-spin text-amber-600 mb-3" />
                  <p className="text-sm font-bold text-stone-600">جاري تحميل الملف...</p>
                </div>
              )}

              {pdfError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
                  <div className="p-4 rounded-2xl bg-red-50 text-red-500 border border-red-200 mb-4">
                    <FileText size={40} />
                  </div>
                  <h3 className="font-bold text-stone-800 text-base mb-1">لم يتم تحميل الملف</h3>
                  <p className="text-xs text-stone-500 mb-4 max-w-xs">{pdfError}</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <button
                      onClick={() => setUseFallback(true)}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      <FileText size={14} />
                      استخدام العارض البديل
                    </button>
                    <a
                      href={fileUrl}
                      download
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      <Download size={14} />
                      تحميل مباشر
                    </a>
                  </div>
                </div>
              )}

              {/* Render all pages stacked vertically */}
              {!pdfError && pdfDoc && totalPages > 0 && Array.from({ length: totalPages }).map((_, i) => (
                <PdfPage 
                  key={i + 1} 
                  pageNum={i + 1} 
                  pdfDoc={pdfDoc} 
                  scale={scale} 
                />
              ))}
            </div>
          ) : (
            /* ── Non-PDF: use Google Docs Viewer as fallback ── */
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              title={title}
              className="w-full h-full border-0 bg-white rounded-xl"
              style={{ minHeight: "100%" }}
            />
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
