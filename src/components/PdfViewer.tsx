"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileText, Loader2, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  onError?: () => void;
}

export default function PdfViewer({ fileUrl, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [scale, setScale] = useState<number>(1.0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 2000);
  }, []);

  useEffect(() => {
    startHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [startHideTimer]);

  // Measure the container width so pages fill it edge-to-edge
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1.0);

  const pageWidth = Math.max((containerWidth - 20) * scale, 300);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-auto relative"
      onMouseMove={startHideTimer}
      onTouchStart={startHideTimer}
    >
      {/* Floating zoom controls */}
      {numPages > 0 && (
        <div 
          className={`sticky top-3 z-20 flex justify-center pointer-events-none transition-all duration-500 ${
            showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-amber-200/70 px-2 py-1.5 pointer-events-auto">
            <button
              onClick={zoomOut}
              className="p-1.5 rounded-lg hover:bg-amber-50 text-stone-600 transition-colors"
              title="تصغير"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={resetZoom}
              className="px-2 py-1 rounded-lg hover:bg-amber-50 text-stone-700 text-xs font-bold transition-colors min-w-[48px]"
              title="إعادة ضبط"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded-lg hover:bg-amber-50 text-stone-600 transition-colors"
              title="تكبير"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      )}

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(error) => {
          console.error("PDF load error:", error);
          if (onError) onError();
        }}
        loading={
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 size={36} className="animate-spin text-amber-600 mb-3" />
            <p className="text-sm font-bold text-stone-500">جاري تحميل الملف...</p>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <div className="p-4 rounded-2xl bg-red-50 text-red-500 border border-red-200 mb-4">
              <FileText size={40} />
            </div>
            <h3 className="font-bold text-stone-800 text-base mb-2">فشل تحميل الملف</h3>
            <p className="text-xs text-stone-500 mb-4">جرّب تحميل الملف مباشرة</p>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <Download size={14} />
              تحميل مباشر
            </a>
          </div>
        }
      >
        <div className="flex flex-col items-center py-4 px-2">
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={`page_${i + 1}`}
              pageNumber={i + 1}
              width={pageWidth}
              className="mb-4 shadow-lg rounded-sm"
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          ))}
        </div>
      </Document>
    </div>
  );
}
