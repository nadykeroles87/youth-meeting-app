"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { PowerPointViewer } from "pptx-react-viewer";
import "pptx-react-viewer/styles";
import { Loader2, FileText, Download, Maximize, Minimize } from "lucide-react";

// Fix for pptx-react-viewer production crash (CHART_PX_PER_PT is not defined)
if (typeof window !== "undefined") {
  (window as any).CHART_PX_PER_PT = 4 / 3;
}

export default function PptxViewer({ fileUrl }: { fileUrl: string }) {
  const [content, setContent] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);

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

  // ── Auto-hide toolbar on interaction ──
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleInteraction = () => {
      setShowToolbar(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowToolbar(false), 3000);
    };

    const container = viewerContainerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleInteraction);
      container.addEventListener("touchstart", handleInteraction, { passive: true });
    }
    
    timeout = setTimeout(() => setShowToolbar(false), 3000); // Initial hide

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleInteraction);
        container.removeEventListener("touchstart", handleInteraction);
      }
      clearTimeout(timeout);
    };
  }, [content]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-50 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 shadow-inner border border-stone-200 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-amber-600" />
          </div>
        </div>
        <p className="text-sm font-bold text-stone-600">جاري تحميل وتجهيز العرض التقديمي...</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-50 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <FileText size={32} className="text-red-400" />
        </div>
        <h3 className="font-bold text-stone-800 mb-2">تعذر عرض الملف</h3>
        <p className="text-xs text-stone-500 mb-5">{error}</p>
        <a
          href={fileUrl}
          download
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition-all"
        >
          <Download size={14} />
          تحميل مباشر
        </a>
      </div>
    );
  }

  return (
    <div 
      ref={viewerContainerRef}
      className={`flex flex-col w-full h-full bg-stone-50 overflow-hidden relative ${
        isFullscreen ? "fixed inset-0 z-[300]" : ""
      }`}
    >
      <div className="flex-1 min-h-0 relative pptx-viewer-container bg-stone-50">
        <PowerPointViewer content={content} canEdit={false} />
      </div>

      {/* ── Floating Minimalist Toolbar ── */}
      <div 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-stone-200 rounded-full flex items-center gap-2 px-3 py-2 transition-all duration-300 z-50 ${
          showToolbar ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
        }`}
        style={{ direction: "rtl" }}
      >
        <div className="px-2">
           <span className="text-xs font-bold text-orange-600">
             عرض تقديمي
           </span>
        </div>

        <div className="w-px h-6 bg-stone-300 mx-1" />

        <button 
          onClick={toggleFullscreen} 
          className="p-2 text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors active:scale-95 flex items-center gap-1" 
          aria-label="ملء الشاشة"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </div>
  );
}
