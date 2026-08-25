"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Loader2, FileText, Download, Maximize, Minimize } from "lucide-react";

export default function XlsxViewer({ fileUrl }: { fileUrl: string }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-100 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-white shadow-inner border border-stone-200 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-green-600" />
          </div>
        </div>
        <p className="text-sm font-bold text-stone-600">جاري تحميل وتجهيز جدول البيانات...</p>
        <p className="text-xs text-stone-400 mt-1">يتم الآن معالجة الجداول לעرضها</p>
      </div>
    );
  }

  if (error || htmlContent === null) {
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
           <span className="text-xs font-bold bg-green-700 px-3 py-1.5 rounded-lg border border-green-600 text-white">
             جدول بيانات (Excel)
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

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 relative bg-white overflow-auto scroll-smooth p-4 sm:p-8" style={{ direction: "rtl" }}>
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
    </div>
  );
}
