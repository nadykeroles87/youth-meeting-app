"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  FileText, Loader2, Download, ZoomIn, ZoomOut, RotateCw,
  ChevronUp, ChevronDown, Maximize, Minimize
} from "lucide-react";

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  onError?: () => void;
}

export default function PdfViewer({ fileUrl, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Use window.innerWidth directly (this component is dynamically imported, no SSR)
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Measure container width ──
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setPageWidth(w);
      } else {
        setPageWidth(window.innerWidth);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ── Auto-hide controls ──
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [resetHideTimer]);

  // ── Fullscreen ──
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && viewerRef.current) {
      viewerRef.current.requestFullscreen().catch(console.error);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  // ── Track current page via scroll ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      resetHideTimer();
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const middle = scrollTop + containerHeight / 3;

      let closestPage = 1;
      let closestDist = Infinity;

      pageRefs.current.forEach((el, pageNum) => {
        const dist = Math.abs(el.offsetTop - middle);
        if (dist < closestDist) {
          closestDist = dist;
          closestPage = pageNum;
        }
      });

      setCurrentPage(closestPage);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages, resetHideTimer]);

  // ── Controls ──
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1.0);
  const fitWidth = () => setScale(1.0);

  const goToPage = (page: number) => {
    const el = pageRefs.current.get(page);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scaledWidth = pageWidth * scale;

  return (
    <div
      ref={viewerRef}
      className={`flex flex-col h-full w-full relative ${
        isFullscreen ? "fixed inset-0 z-[300] bg-stone-900" : ""
      }`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* ── Floating Toolbar ── */}
      {numPages > 0 && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
            showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-0.5 bg-stone-900/85 backdrop-blur-xl text-white rounded-2xl shadow-2xl px-2 py-1.5 border border-white/10">
            {/* Page Navigation */}
            <button
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-white/15 disabled:opacity-30 transition-colors"
              title="الصفحة السابقة"
            >
              <ChevronUp size={16} />
            </button>

            <span className="text-[11px] font-bold min-w-[60px] text-center tabular-nums">
              {currentPage} / {numPages}
            </span>

            <button
              onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg hover:bg-white/15 disabled:opacity-30 transition-colors"
              title="الصفحة التالية"
            >
              <ChevronDown size={16} />
            </button>

            <div className="w-px h-5 bg-white/20 mx-1" />

            {/* Zoom Controls */}
            <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors" title="تصغير">
              <ZoomOut size={15} />
            </button>

            <button
              onClick={resetZoom}
              className="px-1.5 py-1 rounded-lg hover:bg-white/15 text-[11px] font-bold min-w-[40px] text-center transition-colors tabular-nums"
              title="إعادة ضبط"
            >
              {Math.round(scale * 100)}%
            </button>

            <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors" title="تكبير">
              <ZoomIn size={15} />
            </button>

            <div className="w-px h-5 bg-white/20 mx-1" />

            {/* Fit & Fullscreen */}
            <button onClick={fitWidth} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors" title="ملائمة العرض">
              <RotateCw size={15} />
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors" title="ملء الشاشة">
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable Pages Container ── */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto scroll-smooth ${
          isFullscreen ? "bg-stone-800" : "bg-stone-100"
        }`}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(error) => {
            console.error("PDF load error:", error);
            if (onError) onError();
          }}
          loading={
            <div className="flex flex-col items-center justify-center py-32">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <Loader2 size={28} className="animate-spin text-amber-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-stone-500">جاري تحميل الملف...</p>
              <p className="text-xs text-stone-400 mt-1">يرجى الانتظار</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-32 text-center px-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-100">
                <FileText size={32} className="text-red-400" />
              </div>
              <h3 className="font-bold text-stone-800 text-base mb-2">فشل تحميل الملف</h3>
              <p className="text-xs text-stone-500 mb-5 max-w-xs">تأكد من اتصالك بالإنترنت أو جرّب تحميل الملف مباشرة</p>
              <a
                href={fileUrl}
                download
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/25"
              >
                <Download size={14} />
                تحميل مباشر
              </a>
            </div>
          }
        >
          <div className="flex flex-col items-center py-3 gap-3">
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={`page_${i + 1}`}
                ref={(el) => {
                  if (el) pageRefs.current.set(i + 1, el);
                }}
                className="relative"
              >
                <Page
                  pageNumber={i + 1}
                  width={scaledWidth}
                  className="shadow-xl rounded-sm bg-white"
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
                {/* Page number badge */}
                <div className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  );
}
