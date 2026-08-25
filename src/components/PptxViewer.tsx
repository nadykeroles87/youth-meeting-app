"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { PowerPointViewer } from "pptx-react-viewer";
import "pptx-react-viewer/styles";
import { Loader2, FileText, Download, Maximize, Minimize } from "lucide-react";

export default function PptxViewer({ fileUrl }: { fileUrl: string }) {
  const [content, setContent] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchFile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the file as an ArrayBuffer
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error("فشل تحميل العرض التقديمي");
        }
        
        const arrayBuffer = await response.arrayBuffer();
        if (isMounted) {
          setContent(new Uint8Array(arrayBuffer));
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading PPTX:", err);
        if (isMounted) {
          setError("لم نتمكن من فتح الملف. قد يكون غير متوفر أوفلاين.");
          setLoading(false);
        }
      }
    };

    fetchFile();

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  // ── Fullscreen ──
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && viewerContainerRef.current) {
      viewerContainerRef.current.requestFullscreen().catch(console.error);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-100 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-white shadow-inner border border-stone-200 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-orange-600" />
          </div>
        </div>
        <p className="text-sm font-bold text-stone-600">جاري تحميل وتجهيز العرض التقديمي...</p>
        <p className="text-xs text-stone-400 mt-1">يتم الآن تهيئة الملف ليعمل داخل التطبيق</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-100 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-100">
          <FileText size={32} className="text-red-400" />
        </div>
        <h3 className="font-bold text-stone-800 mb-2">تعذر عرض الملف</h3>
        <p className="text-xs text-stone-500 mb-5 max-w-xs">{error}</p>
        <a
          href={fileUrl}
          download
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg"
        >
          <Download size={14} />
          تحميل الملف بدلاً من ذلك
        </a>
      </div>
    );
  }

  return (
    <div 
      ref={viewerContainerRef}
      className={`flex flex-col w-full h-full bg-stone-100 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-[300]" : ""
      }`}
    >
      {/* ── Professional Top Toolbar ── */}
      <div className="flex items-center justify-between bg-stone-900 text-stone-300 px-2 sm:px-4 py-2 flex-shrink-0 shadow-md border-b border-stone-800 z-20">
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700 text-white">
             عرض تقديمي (PowerPoint)
           </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleFullscreen} 
            className="p-1.5 hover:bg-stone-800 rounded-lg text-white transition-colors cursor-pointer flex items-center gap-1.5" 
            title="ملء الشاشة"
          >
            {isFullscreen ? (
              <>
                <Minimize size={18} />
                <span className="text-[11px] font-bold hidden sm:inline">إنهاء ملء الشاشة</span>
              </>
            ) : (
              <>
                <Maximize size={18} />
                <span className="text-[11px] font-bold hidden sm:inline">ملء الشاشة</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative pptx-viewer-container bg-stone-100">
        <PowerPointViewer content={content} canEdit={false} />
      </div>
    </div>
  );
}
