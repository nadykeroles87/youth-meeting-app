"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  FileText, Loader2, Download, ZoomIn, ZoomOut,
  Maximize, Minimize, PanelLeft, PanelLeftClose, ChevronUp, ChevronDown
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
  const [showSidebar, setShowSidebar] = useState(true);

  // Use window.innerWidth directly (this component is dynamically imported, no SSR)
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Measure container width (full width) ──
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setPageWidth(Math.max(w - 32, 200)); // padding allowance
      } else {
        setPageWidth(Math.max(window.innerWidth - 32, 200));
      }
      
      // Auto-hide sidebar on small screens
      if (window.innerWidth < 768) {
        setShowSidebar(false);
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

  // ── Track current page via scroll ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
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
  }, [numPages]);

  // Sync thumbnail scroll with main scroll
  useEffect(() => {
    if (thumbnailContainerRef.current && showSidebar) {
      const activeThumb = thumbnailContainerRef.current.querySelector(`[data-thumb-page="${currentPage}"]`);
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [currentPage, showSidebar]);

  // ── Controls ──
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const fitWidth = () => setScale(1.0);

  const goToPage = (page: number) => {
    const el = pageRefs.current.get(page);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scaledWidth = Math.min(pageWidth * scale, 1200); // cap max width for readability

  return (
    <div
      ref={viewerRef}
      className={`flex flex-col h-full w-full bg-stone-100 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-[300]" : ""
      }`}
    >
      {/* ── Professional Top Toolbar ── */}
      <div className="flex items-center justify-between bg-stone-900 text-stone-300 px-2 sm:px-4 py-2 flex-shrink-0 shadow-md border-b border-stone-800 z-20">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-white transition-colors"
            title="إظهار/إخفاء الشريط الجانبي"
          >
            {showSidebar ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
          
          <div className="w-px h-5 bg-stone-700 mx-1 sm:mx-2 hidden sm:block" />
          
          <div className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-lg border border-stone-700">
            <button
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronUp size={14} />
            </button>
            <span className="text-[11px] sm:text-xs font-bold tabular-nums text-white min-w-[50px] text-center">
              {currentPage} / {numPages || "-"}
            </span>
            <button
              onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 bg-stone-800 rounded-lg border border-stone-700 p-0.5">
          <button onClick={zoomOut} className="p-1.5 hover:bg-stone-700 hover:text-white rounded-md transition-colors cursor-pointer" title="تصغير">
            <ZoomOut size={16} />
          </button>
          <button onClick={fitWidth} className="text-[11px] sm:text-xs font-bold w-10 sm:w-12 text-center tabular-nums hover:text-white transition-colors cursor-pointer" title="إعادة ضبط">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={zoomIn} className="p-1.5 hover:bg-stone-700 hover:text-white rounded-md transition-colors cursor-pointer" title="تكبير">
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-stone-800 rounded-lg text-white transition-colors cursor-pointer" title="ملء الشاشة">
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* ── Sidebar (Thumbnails) ── */}
        {showSidebar && numPages > 0 && (
          <div
            ref={thumbnailContainerRef}
            className="w-32 sm:w-48 bg-stone-900/95 flex-shrink-0 border-l border-stone-800 overflow-y-auto hidden md:flex flex-col items-center py-4 gap-4 scroll-smooth"
            style={{ direction: "ltr" }} // Force LTR for standard scrolling experience in sidebar
          >
            <Document file={fileUrl}>
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={`thumb_${i + 1}`}
                  data-thumb-page={i + 1}
                  onClick={() => goToPage(i + 1)}
                  className={`relative cursor-pointer transition-all border-2 rounded-sm overflow-hidden ${
                    currentPage === i + 1 ? "border-amber-500 scale-105 shadow-lg shadow-amber-900/20" : "border-transparent hover:border-stone-500 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Page
                    pageNumber={i + 1}
                    width={140}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    className="bg-white pointer-events-none"
                  />
                  <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-md">
                    {i + 1}
                  </div>
                </div>
              ))}
            </Document>
          </div>
        )}

        {/* ── Main Content Area ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-auto scroll-smooth bg-stone-200/80"
          style={{ 
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
          }}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(error) => {
              console.error("PDF load error:", error);
              if (onError) onError();
            }}
            loading={
              <div className="flex flex-col items-center justify-center h-full py-32">
                <div className="w-16 h-16 rounded-full bg-stone-100 shadow-inner flex items-center justify-center mb-4 border border-stone-200">
                  <Loader2 size={28} className="animate-spin text-amber-600" />
                </div>
                <p className="text-sm font-bold text-stone-600">جاري تحميل المستند...</p>
                <p className="text-xs text-stone-400 mt-1">يرجى الانتظار</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full py-32 text-center px-6">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-100">
                  <FileText size={32} className="text-red-400" />
                </div>
                <h3 className="font-bold text-stone-800 text-base mb-2">فشل تحميل المستند</h3>
                <p className="text-xs text-stone-500 mb-5 max-w-xs">يرجى التحقق من اتصالك بالإنترنت أو محاولة تحميل الملف مباشرة</p>
                <a
                  href={fileUrl}
                  download
                  className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  <Download size={14} />
                  تحميل مباشر
                </a>
              </div>
            }
          >
            <div className="flex flex-col items-center py-6 gap-6 min-h-full" style={{ minWidth: scaledWidth > pageWidth ? `${scaledWidth}px` : "auto" }}>
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={`page_${i + 1}`}
                  ref={(el) => {
                    if (el) pageRefs.current.set(i + 1, el);
                  }}
                  className="relative shadow-xl shadow-stone-300/50 bg-white"
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
        </div>
      </div>
    </div>
  );
}
