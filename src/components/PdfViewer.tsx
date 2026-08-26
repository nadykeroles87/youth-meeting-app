"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  FileText, Loader2, Download, ZoomIn, ZoomOut,
  Maximize, Minimize, ChevronUp, ChevronDown
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
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Use window.innerWidth directly (this component is dynamically imported, no SSR)
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl = "";

    const loadPdf = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("فشل تحميل الملف");
        const blob = await response.blob();
        currentBlobUrl = URL.createObjectURL(blob);
        if (isMounted) setBlobUrl(currentBlobUrl);
      } catch (err) {
        console.error("PDF load error:", err);
        if (isMounted) {
          setLoadError("فشل تحميل الملف. يرجى التحقق من الاتصال بالإنترنت.");
          if (onError) onError();
        }
      }
    };
    
    loadPdf();

    return () => {
      isMounted = false;
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [fileUrl, onError]);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Measure container width ──
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setPageWidth(w - 16); // minimal padding allowance
      } else {
        setPageWidth(window.innerWidth - 16);
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

  // ── Track current page and toolbar visibility via scroll ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    let timeout: NodeJS.Timeout;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      
      // Auto-hide toolbar logic
      if (scrollTop > lastScrollY && scrollTop > 50) {
        setShowToolbar(false);
      } else {
        setShowToolbar(true);
      }
      setLastScrollY(scrollTop);

      // Keep toolbar visible if scrolling stops
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowToolbar(true), 1500);

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
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [numPages, lastScrollY]);

  // ── Controls ──
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const goToPage = (page: number) => {
    const el = pageRefs.current.get(page);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scaledWidth = Math.min(pageWidth * scale, 1200);

  return (
    <div
      ref={viewerRef}
      className={`flex flex-col h-full w-full bg-stone-50 overflow-hidden relative ${
        isFullscreen ? "fixed inset-0 z-[300]" : ""
      }`}
    >
      {/* ── Main Content Area ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto scroll-smooth bg-stone-50"
        style={{ 
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y",
        }}
      >
        {!blobUrl && !loadError && (
          <div className="flex flex-col items-center justify-center h-full py-32">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 shadow-inner border border-stone-200">
              <Loader2 size={28} className="animate-spin text-amber-600" />
            </div>
            <p className="text-sm font-bold text-stone-600">جاري جلب المستند...</p>
          </div>
        )}
        {loadError && (
          <div className="flex flex-col items-center justify-center h-full py-32 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <FileText size={32} className="text-red-400" />
            </div>
            <h3 className="font-bold text-stone-800 text-base mb-2">فشل تحميل المستند</h3>
            <p className="text-xs text-stone-500 mb-5">{loadError}</p>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition-all"
            >
              <Download size={14} />
              تحميل مباشر
            </a>
          </div>
        )}
        {blobUrl && (
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(error) => {
              console.error("PDF load error:", error);
              setLoadError("لم نتمكن من قراءة الملف كـ PDF");
              if (onError) onError();
            }}
            loading={
              <div className="flex flex-col items-center justify-center h-full py-32">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Loader2 size={28} className="animate-spin text-amber-600" />
                </div>
                <p className="text-sm font-bold text-stone-600">جاري معالجة المستند...</p>
              </div>
            }
            error={null}
          >
            <div className="flex flex-col items-center py-4 gap-4 min-h-full" style={{ minWidth: scaledWidth > pageWidth ? `${scaledWidth}px` : "auto" }}>
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={`page_${i + 1}`}
                ref={(el) => {
                  if (el) pageRefs.current.set(i + 1, el);
                }}
                className="relative bg-white shadow-sm border border-stone-200"
              >
                <Page
                  pageNumber={i + 1}
                  width={scaledWidth}
                  className="bg-white"
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                />
              </div>
            ))}
          </div>
        </Document>
        )}
      </div>

      {/* ── Floating Minimalist Toolbar ── */}
      {numPages > 0 && (
        <div 
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-stone-200 rounded-full flex items-center gap-2 px-3 py-2 transition-all duration-300 z-50 ${
            showToolbar ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
          }`}
          style={{ direction: "rtl" }}
        >
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={zoomIn} className="p-2 text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors active:scale-95" aria-label="تكبير">
              <ZoomIn size={18} />
            </button>
            <button onClick={zoomOut} className="p-2 text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors active:scale-95" aria-label="تصغير">
              <ZoomOut size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-stone-300 mx-1" />

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="p-1.5 text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors disabled:opacity-30 active:scale-95"
            >
              <ChevronDown size={18} />
            </button>
            
            <span className="text-sm font-bold text-stone-800 tabular-nums min-w-[3rem] text-center">
              {currentPage} / {numPages}
            </span>

            <button
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors disabled:opacity-30 active:scale-95"
            >
              <ChevronUp size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-stone-300 mx-1" />

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-2 text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors active:scale-95" aria-label="ملء الشاشة">
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}
