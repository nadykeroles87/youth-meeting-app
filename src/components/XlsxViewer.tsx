"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Loader2, FileText, Download, Maximize, Minimize } from "lucide-react";

export default function XlsxViewer({ fileUrl }: { fileUrl: string }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchFile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error("فشل تحميل الملف");
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse the workbook
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to HTML
        const html = XLSX.utils.sheet_to_html(worksheet, { id: "excel-table", header: "" });
        
        if (isMounted) {
          setHtmlContent(html);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading XLSX:", err);
        if (isMounted) {
          setError("تعذر عرض هذا الملف. تأكد أنه بصيغة جدول بيانات صالحة.");
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

  // ── Auto-hide toolbar on scroll ──
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !htmlContent) return;

    let timeout: NodeJS.Timeout;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      
      if (scrollTop > lastScrollY && scrollTop > 50) {
        setShowToolbar(false);
      } else {
        setShowToolbar(true);
      }
      setLastScrollY(scrollTop);

      clearTimeout(timeout);
      timeout = setTimeout(() => setShowToolbar(true), 1500);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [htmlContent, lastScrollY]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-50 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 shadow-inner border border-stone-200 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-green-600" />
          </div>
        </div>
        <p className="text-sm font-bold text-stone-600">جاري تحميل وتجهيز جدول البيانات...</p>
      </div>
    );
  }

  if (error || htmlContent === null) {
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
      {/* ── Content Area ── */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 min-h-0 relative bg-white overflow-auto scroll-smooth p-4 sm:p-8" 
        style={{ direction: "rtl" }}
      >
        <div 
           className="xlsx-content"
           dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .xlsx-content table { 
          border-collapse: collapse; 
          width: 100%; 
          font-size: 14px; 
          border: 1px solid #d6d3d1;
        }
        .xlsx-content th, .xlsx-content td { 
          border: 1px solid #d6d3d1; 
          padding: 8px 12px; 
          text-align: right;
        }
        .xlsx-content th {
          background-color: #f5f5f4;
          font-weight: bold;
          color: #44403c;
        }
        .xlsx-content tr:nth-child(even) {
          background-color: #fafaf9;
        }
        .xlsx-content tr:hover {
          background-color: #f0fdf4;
        }
      `}} />

      {/* ── Floating Minimalist Toolbar ── */}
      <div 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-stone-200 rounded-full flex items-center gap-2 px-3 py-2 transition-all duration-300 z-50 ${
          showToolbar ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
        }`}
        style={{ direction: "rtl" }}
      >
        <div className="px-2">
           <span className="text-xs font-bold text-green-700">
             جدول بيانات
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
