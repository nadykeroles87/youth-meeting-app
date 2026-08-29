"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  FileText, Loader2, ZoomIn, ZoomOut,
  Maximize, Minimize, ChevronLeft, ChevronRight,
  WifiOff, Layers, BookOpen, StretchHorizontal
} from "lucide-react";

// PDF.js worker — local copy first (offline), then CDN fallback
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  /** Pre-loaded blob URL from useFileCache (for offline support) */
  cachedBlobUrl?: string | null;
  /** Whether the file was loaded from cache */
  fromCache?: boolean;
  onError?: () => void;
}

export default function PdfViewer({ fileUrl, cachedBlobUrl, fromCache, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "continuous">("single");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [fetchedBlobUrl, setFetchedBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const blobUrl = cachedBlobUrl || fetchedBlobUrl;

  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 640 ? window.innerWidth : Math.min(window.innerWidth - 32, 1000);
    }
    return 800;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Fetch blob if not provided via cache
  useEffect(() => {
    if (cachedBlobUrl) return;

    let isMounted = true;
    let currentBlobUrl = "";

    const loadPdf = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("فشل تحميل الملف");
        const blob = await response.blob();
        currentBlobUrl = URL.createObjectURL(blob);
        if (isMounted) setFetchedBlobUrl(currentBlobUrl);
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
  }, [fileUrl, onError, cachedBlobUrl]);

  // Responsive width measurement - fills 100% on mobile
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          // On mobile (< 640px), fill 100% of container with zero padding
          // On desktop (>= 640px), max comfortable width up to 1000px
          if (w < 640) {
            setContainerWidth(w);
          } else {
            setContainerWidth(Math.min(w - 32, 1000));
          }
        }
      } else if (typeof window !== "undefined") {
        if (window.innerWidth < 640) {
          setContainerWidth(window.innerWidth);
        } else {
          setContainerWidth(Math.min(window.innerWidth - 32, 1000));
        }
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

  // Fullscreen support
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setCurrentPage((c) => Math.min(numPages, c + 1));
      } else if (e.key === "ArrowRight" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((c) => Math.max(1, c - 1));
      } else if (e.key === "Home") {
        setCurrentPage(1);
      } else if (e.key === "End") {
        setCurrentPage(numPages);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, toggleFullscreen]);

  // Touch Swipe for single page mode
  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode !== "single") return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (viewMode !== "single" || touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Horizontal swipe threshold
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        // Swipe left -> Next Page (in RTL context)
        setCurrentPage((c) => Math.min(numPages, c + 1));
      } else {
        // Swipe right -> Prev Page
        setCurrentPage((c) => Math.max(1, c - 1));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const fitWidth = () => setScale(1.0);

  const isMobile = containerWidth < 640;
  const baseWidth = isMobile ? containerWidth : Math.min(containerWidth, 1000);
  const scaledWidth = Math.round(baseWidth * scale);

  // Auto-hide toolbar timer
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleInteract = () => {
      setShowToolbar(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowToolbar(false), 4500);
    };

    const el = viewerRef.current;
    if (el) {
      el.addEventListener("mousemove", handleInteract);
      el.addEventListener("touchstart", handleInteract, { passive: true });
    }
    timeout = setTimeout(() => setShowToolbar(false), 4500);

    return () => {
      if (el) {
        el.removeEventListener("mousemove", handleInteract);
        el.removeEventListener("touchstart", handleInteract);
      }
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      ref={viewerRef}
      className={`flex flex-col h-full w-full bg-stone-950 overflow-hidden relative select-none ${
        isFullscreen ? "fixed inset-0 z-[300]" : ""
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Main Content Area (Edge-to-Edge on Mobile) ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto scroll-smooth bg-stone-950 flex items-center justify-center p-0 sm:p-4"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        {!blobUrl && !loadError && (
          <div className="flex flex-col items-center justify-center h-full py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center mb-3 border border-stone-800">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
            <p className="text-xs font-bold text-stone-300">جاري جلب المستند...</p>
          </div>
        )}

        {loadError && (
          <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center mb-3">
              <FileText size={28} className="text-red-400" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1.5">فشل تحميل المستند</h3>
            <p className="text-xs text-stone-400 mb-4 max-w-xs">{loadError}</p>
            <button
              onClick={() => {
                setLoadError(null);
                setFetchedBlobUrl(null);
                fetch(fileUrl)
                  .then((res) => res.blob())
                  .then((b) => setFetchedBlobUrl(URL.createObjectURL(b)))
                  .catch(() => setLoadError("تعذر إعادة تحميل الملف"));
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {blobUrl && (
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setLoadError(null);
            }}
            onLoadError={(error) => {
              console.error("PDF load error:", error);
              setLoadError("لم نتمكن من قراءة الملف كـ PDF");
              if (onError) onError();
            }}
            loading={
              <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center mb-3 border border-stone-800">
                  <Loader2 size={24} className="animate-spin text-amber-500" />
                </div>
                <p className="text-xs font-bold text-stone-300">جاري تهيئة صفحات الـ PDF...</p>
              </div>
            }
            error={null}
          >
            {/* ── Single Page Mode (Ultra-Fast, Zero Lag, 100% Screen Width) ── */}
            {viewMode === "single" && numPages > 0 && (
              <div className="flex flex-col items-center justify-center w-full min-h-full p-0 sm:py-2">
                <div className="relative bg-white shadow-2xl overflow-hidden sm:rounded-lg border-0 sm:border sm:border-stone-800 transition-transform duration-200 w-full flex justify-center">
                  <Page
                    pageNumber={currentPage}
                    width={scaledWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    className="max-w-full flex justify-center"
                    loading={
                      <div
                        style={{ width: scaledWidth, height: scaledWidth * 1.35 }}
                        className="flex items-center justify-center bg-stone-900 text-stone-400 text-xs font-bold"
                      >
                        <Loader2 size={20} className="animate-spin text-amber-500" />
                      </div>
                    }
                  />
                </div>
              </div>
            )}

            {/* ── Continuous Scroll Mode (Virtualized Window Rendering) ── */}
            {viewMode === "continuous" && numPages > 0 && (
              <div className="flex flex-col items-center py-2 sm:py-4 gap-2 sm:gap-4 w-full">
                {Array.from({ length: numPages }, (_, i) => {
                  const pageNum = i + 1;
                  // Only render active page +/- 2 to prevent memory bloat and lag
                  const isNear = Math.abs(pageNum - currentPage) <= 2;

                  return (
                    <div
                      key={`page_${pageNum}`}
                      id={`pdf_page_${pageNum}`}
                      className="relative bg-white shadow-xl sm:rounded-lg overflow-hidden border-0 sm:border sm:border-stone-800 min-h-[200px] w-full flex justify-center"
                      style={{ minWidth: isMobile ? "100%" : `${Math.min(scaledWidth, containerWidth)}px` }}
                    >
                      {isNear ? (
                        <Page
                          pageNumber={pageNum}
                          width={scaledWidth}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                          className="max-w-full flex justify-center"
                          loading={
                            <div
                              style={{ width: scaledWidth, height: scaledWidth * 1.35 }}
                              className="flex items-center justify-center bg-stone-900 text-stone-400 text-xs font-bold"
                            >
                              صفحة {pageNum}
                            </div>
                          }
                        />
                      ) : (
                        <div
                          style={{ width: scaledWidth, height: scaledWidth * 1.35 }}
                          className="flex flex-col items-center justify-center bg-stone-900/80 text-stone-400 text-xs font-bold border border-dashed border-stone-800 rounded-lg cursor-pointer hover:bg-stone-900"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          <FileText size={24} className="mb-2 text-stone-500 opacity-50" />
                          <span>اضغط لعرض صفحة {pageNum}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Document>
        )}
      </div>

      {/* ── Navigation Arrow Buttons (Single Page Mode) ── */}
      {viewMode === "single" && numPages > 1 && (
        <>
          <button
            onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
            disabled={currentPage <= 1}
            className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/60 hover:bg-black/85 disabled:opacity-15 text-white rounded-full transition-all z-20 backdrop-blur-xs cursor-pointer shadow-lg"
            title="الصفحة السابقة"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={() => setCurrentPage((c) => Math.min(numPages, c + 1))}
            disabled={currentPage >= numPages}
            className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/60 hover:bg-black/85 disabled:opacity-15 text-white rounded-full transition-all z-20 backdrop-blur-xs cursor-pointer shadow-lg"
            title="الصفحة التالية"
          >
            <ChevronRight size={20} className="sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* ── Floating Minimalist Control Pill ── */}
      {numPages > 0 && (
        <div
          className={`absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/95 backdrop-blur-md text-white shadow-2xl border border-stone-700/80 rounded-full flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 transition-all duration-300 z-30 max-w-[96vw] ${
            showToolbar ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
          }`}
          style={{ direction: "rtl" }}
        >
          {/* Offline Badge */}
          {fromCache && (
            <>
              <div className="flex items-center gap-1 px-1" title="محفوظ للعرض بدون إنترنت">
                <WifiOff size={13} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 hidden sm:inline">محفوظ</span>
              </div>
              <div className="w-px h-5 bg-stone-700 mx-0.5" />
            </>
          )}

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode((m) => (m === "single" ? "continuous" : "single"))}
            className={`p-1.5 sm:p-2 rounded-full transition-colors active:scale-95 ${
              viewMode === "single" ? "bg-amber-600 text-white" : "text-stone-300 hover:bg-stone-800"
            }`}
            title={viewMode === "single" ? "عرض صفحة بصفحة (سريع)" : "عرض تمرير مستمر"}
          >
            {viewMode === "single" ? <BookOpen size={15} /> : <Layers size={15} />}
          </button>

          {/* Fit to Screen / Reset Zoom */}
          <button
            onClick={fitWidth}
            className={`p-1.5 sm:p-2 rounded-full transition-colors active:scale-95 ${
              scale === 1.0 ? "text-amber-400 bg-amber-950/40" : "text-stone-300 hover:bg-stone-800"
            }`}
            title="ملء عرض الشاشة (100%)"
          >
            <StretchHorizontal size={15} />
          </button>

          <div className="w-px h-5 bg-stone-700 mx-0.5" />

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={zoomIn}
              className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-full transition-colors active:scale-95"
              aria-label="تكبير"
              title="تكبير"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-full transition-colors active:scale-95"
              aria-label="تصغير"
              title="تصغير"
            >
              <ZoomOut size={15} />
            </button>
          </div>

          <div className="w-px h-5 bg-stone-700 mx-0.5" />

          {/* Page Selector / Input */}
          <div className="flex items-center gap-1 text-xs">
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= numPages) {
                  setCurrentPage(val);
                  if (viewMode === "continuous") {
                    const el = document.getElementById(`pdf_page_${val}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }
              }}
              className="w-9 sm:w-10 text-center bg-stone-800 border border-stone-700 rounded-lg py-0.5 text-amber-300 font-bold text-xs outline-none"
            />
            <span className="text-stone-400 font-bold text-[10px] sm:text-[11px]">/ {numPages}</span>
          </div>

          <div className="w-px h-5 bg-stone-700 mx-0.5" />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-full transition-colors active:scale-95"
            aria-label="ملء الشاشة"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}
