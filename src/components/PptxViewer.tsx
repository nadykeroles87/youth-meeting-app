"use client";

import React, { useEffect, useState } from "react";
import { PowerPointViewer } from "pptx-react-viewer";
import "pptx-react-viewer/styles";
import { Loader2, FileText, Download } from "lucide-react";

export default function PptxViewer({ fileUrl }: { fileUrl: string }) {
  const [content, setContent] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-white text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-orange-600" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm">
            <FileText size={14} className="text-orange-600" />
          </div>
        </div>
        <p className="text-sm font-bold text-stone-700">جاري تحميل وتجهيز العرض التقديمي...</p>
        <p className="text-xs text-stone-400 mt-1">يتم الآن تهيئة الملف ليعمل داخل التطبيق</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-50 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100">
          <FileText size={32} className="text-red-400" />
        </div>
        <h3 className="font-bold text-stone-800 mb-2">تعذر عرض الملف</h3>
        <p className="text-xs text-stone-500 mb-5 max-w-xs">{error}</p>
        <a
          href={fileUrl}
          download
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <Download size={16} />
          تحميل الملف بدلاً من ذلك
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative pptx-viewer-container bg-stone-100 overflow-hidden">
      <PowerPointViewer content={content} canEdit={false} />
    </div>
  );
}
