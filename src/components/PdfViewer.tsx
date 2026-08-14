"use client";

import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileText, Loader2, Download } from "lucide-react";

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto p-2">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
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
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={`page_${i + 1}`}
            pageNumber={i + 1}
            width={Math.max(containerWidth - 20, 300)}
            className="mx-auto mb-3 shadow-md"
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        ))}
      </Document>
    </div>
  );
}
