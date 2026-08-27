"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import JSZip from "jszip";
import { Loader2, FileText, Download, Maximize, Minimize, ChevronLeft, ChevronRight } from "lucide-react";

// Simple PPTX viewer that extracts slide images from PPTX files using JSZip
// Replaces pptx-react-viewer which had critical i18next dependency issues
export default function PptxViewer({ fileUrl }: { fileUrl: string }) {
  const [slides, setSlides] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
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

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("فشل تحميل العرض التقديمي");

        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Extract slide images from ppt/media/
        const imageFiles: { name: string; blob: Blob }[] = [];
        const mediaFolder = zip.folder("ppt/media");

        if (mediaFolder) {
          const entries = Object.keys(zip.files)
            .filter(name => name.startsWith("ppt/media/image") && /\.(png|jpg|jpeg|gif|bmp|svg|emf|wmf)$/i.test(name))
            .sort();

          for (const name of entries) {
            const file = zip.files[name];
            if (file && !file.dir) {
              const blob = await file.async("blob");
              imageFiles.push({ name, blob });
            }
          }
        }

        // Also try to extract slide thumbnails from docProps/thumbnail.jpeg
        const thumbnail = zip.files["docProps/thumbnail.jpeg"];
        if (thumbnail && imageFiles.length === 0) {
          const blob = await thumbnail.async("blob");
          imageFiles.push({ name: "thumbnail", blob });
        }

        if (isMounted) {
          if (imageFiles.length > 0) {
            const urls = imageFiles.map(f => URL.createObjectURL(f.blob));
            setSlides(urls);
          } else {
            // No images found - show slide count info
            const slideFiles = Object.keys(zip.files).filter(
              name => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
            );
            setError(`العرض التقديمي يحتوي على ${slideFiles.length} شريحة. لعرض أفضل، يرجى تحميل الملف.`);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading PPTX:", err);
        if (isMounted) {
          setError("لم نتمكن من فتح الملف. قد يكون غير متوفر أو بصيغة غير مدعومة.");
          setLoading(false);
        }
      }
    };

    fetchFile();

    return () => {
      isMounted = false;
      // Cleanup blob URLs
      slides.forEach(url => URL.revokeObjectURL(url));
    };
  }, [fileUrl]);

  // Fullscreen
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

  // Auto-hide toolbar
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
    timeout = setTimeout(() => setShowToolbar(false), 3000);

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleInteraction);
        container.removeEventListener("touchstart", handleInteraction);
      }
      clearTimeout(timeout);
    };
  }, [slides]);

  // Touch swipe for slides
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide < slides.length - 1) setCurrentSlide(c => c + 1);
      if (diff < 0 && currentSlide > 0) setCurrentSlide(c => c - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-50 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 shadow-inner border border-stone-200 flex items-center justify-center mb-6">
          <Loader2 size={28} className="animate-spin text-amber-600" />
        </div>
        <p className="text-sm font-bold text-stone-600">جاري تحميل العرض التقديمي...</p>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-50 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <FileText size={32} className="text-amber-400" />
        </div>
        <h3 className="font-bold text-stone-800 mb-2">عرض تقديمي</h3>
        <p className="text-xs text-stone-500 mb-5">{error || "لا توجد صور للعرض"}</p>
      </div>
    );
  }

  return (
    <div
      ref={viewerContainerRef}
      className={`flex flex-col w-full h-full bg-stone-900 overflow-hidden relative ${
        isFullscreen ? "fixed inset-0 z-[300]" : ""
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide display */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <img
          src={slides[currentSlide]}
          alt={`شريحة ${currentSlide + 1}`}
          className="w-full h-full object-contain"
          style={{ maxHeight: '100%', maxWidth: '100%' }}
        />
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrentSlide(c => Math.max(0, c - 1))}
            disabled={currentSlide === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-20 z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => setCurrentSlide(c => Math.min(slides.length - 1, c + 1))}
            disabled={currentSlide === slides.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-20 z-10"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Floating toolbar */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-stone-200 rounded-full flex items-center gap-2 px-3 py-2 transition-all duration-300 z-50 ${
          showToolbar ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
        }`}
      >
        {slides.length > 1 && (
          <>
            <span className="text-sm font-bold text-stone-800 tabular-nums min-w-[3rem] text-center">
              {currentSlide + 1} / {slides.length}
            </span>
            <div className="w-px h-6 bg-stone-300 mx-1" />
          </>
        )}

        <button
          onClick={toggleFullscreen}
          className="p-2 text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors active:scale-95"
          aria-label="ملء الشاشة"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </div>
  );
}
