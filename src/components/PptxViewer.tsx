"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import JSZip from "jszip";
import {
  Loader2, FileText, Maximize, Minimize,
  ChevronLeft, ChevronRight, WifiOff, Grid3X3
} from "lucide-react";

/**
 * Real PPTX Viewer that parses PPTX XML and renders slides as HTML.
 * Supports: text, images, backgrounds, shapes, and basic formatting.
 * Works 100% client-side and offline.
 */

interface SlideData {
  index: number;
  texts: TextItem[];
  images: ImageItem[];
  background: string | null;
  bgImage: string | null;
}

interface TextItem {
  text: string;
  x: number; y: number; w: number; h: number;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  fontColor: string;
  align: string;
  fontFamily: string;
}

interface ImageItem {
  blobUrl: string;
  x: number; y: number; w: number; h: number;
}

// EMU to percentage conversion (PPTX uses EMUs - English Metric Units)
// Standard slide size: 9144000 x 6858000 EMU (10" x 7.5" at 914400 EMU/inch)
const SLIDE_W = 9144000;
const SLIDE_H = 6858000;

function emuToPctX(emu: number) { return (emu / SLIDE_W) * 100; }
function emuToPctY(emu: number) { return (emu / SLIDE_H) * 100; }
function emuToPctW(emu: number) { return (emu / SLIDE_W) * 100; }
function emuToPctH(emu: number) { return (emu / SLIDE_H) * 100; }
function emuToPt(emu: number) { return emu / 12700; }

// Parse color from PPTX XML (handles srgbClr, schemeClr, etc.)
function parseColor(colorNode: Element | null, defaultColor = "#333333"): string {
  if (!colorNode) return defaultColor;
  
  const srgb = colorNode.querySelector("srgbClr, a\\:srgbClr");
  if (srgb) {
    return "#" + (srgb.getAttribute("val") || "333333");
  }
  
  // Scheme colors - map to reasonable defaults
  const scheme = colorNode.querySelector("schemeClr, a\\:schemeClr");
  if (scheme) {
    const schemeColorMap: Record<string, string> = {
      "tx1": "#333333", "tx2": "#555555",
      "bg1": "#ffffff", "bg2": "#f0f0f0",
      "dk1": "#333333", "dk2": "#555555",
      "lt1": "#ffffff", "lt2": "#eeeeee",
      "accent1": "#4472c4", "accent2": "#ed7d31",
      "accent3": "#a5a5a5", "accent4": "#ffc000",
      "accent5": "#5b9bd5", "accent6": "#70ad47",
      "hlink": "#0563c1", "folHlink": "#954f72",
    };
    return schemeColorMap[scheme.getAttribute("val") || ""] || defaultColor;
  }

  return defaultColor;
}

// Parse text properties from XML
function parseTextProps(rPr: Element | null) {
  let fontSize = 18;
  let fontBold = false;
  let fontItalic = false;
  let fontColor = "#333333";
  let fontFamily = "Cairo, Arial, sans-serif";

  if (rPr) {
    const sz = rPr.getAttribute("sz");
    if (sz) fontSize = parseInt(sz) / 100;
    
    fontBold = rPr.getAttribute("b") === "1";
    fontItalic = rPr.getAttribute("i") === "1";

    const solidFill = rPr.querySelector("solidFill, a\\:solidFill");
    if (solidFill) {
      fontColor = parseColor(solidFill);
    }

    const latin = rPr.querySelector("latin, a\\:latin");
    if (latin) {
      const typeface = latin.getAttribute("typeface");
      if (typeface && typeface !== "+mj-lt" && typeface !== "+mn-lt") {
        fontFamily = `"${typeface}", Cairo, Arial, sans-serif`;
      }
    }
  }

  return { fontSize, fontBold, fontItalic, fontColor, fontFamily };
}

// Parse a single slide XML into structured data
async function parseSlide(
  slideXml: string,
  rels: Record<string, string>,
  mediaBlobs: Record<string, string>,
  slideIndex: number
): Promise<SlideData> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(slideXml, "application/xml");
  
  const texts: TextItem[] = [];
  const images: ImageItem[] = [];
  let background: string | null = null;
  let bgImage: string | null = null;

  // Parse background
  const bgEl = doc.querySelector("bg, p\\:bg");
  if (bgEl) {
    const solidFill = bgEl.querySelector("solidFill, a\\:solidFill");
    if (solidFill) {
      background = parseColor(solidFill, "#ffffff");
    }
    const gradFill = bgEl.querySelector("gradFill, a\\:gradFill");
    if (gradFill) {
      const stops = gradFill.querySelectorAll("gs, a\\:gs");
      if (stops.length >= 2) {
        const colors: string[] = [];
        stops.forEach(stop => {
          const fill = stop.querySelector("srgbClr, a\\:srgbClr");
          if (fill) colors.push("#" + (fill.getAttribute("val") || "ffffff"));
        });
        if (colors.length >= 2) {
          background = `linear-gradient(135deg, ${colors.join(", ")})`;
        }
      }
    }
    // Background image
    const blipFill = bgEl.querySelector("blipFill blip, a\\:blipFill a\\:blip, p\\:bgPr a\\:blipFill a\\:blip");
    if (blipFill) {
      const rId = blipFill.getAttribute("r:embed") || blipFill.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
      if (rId && rels[rId]) {
        bgImage = mediaBlobs[rels[rId]] || null;
      }
    }
  }

  // Parse shapes (sp elements) — contains text and shape data
  const shapes = doc.querySelectorAll("sp, p\\:sp");
  shapes.forEach(shape => {
    // Position from spPr > xfrm
    const xfrm = shape.querySelector("xfrm, a\\:xfrm, p\\:spPr a\\:xfrm");
    let x = 0, y = 0, w = SLIDE_W, h = SLIDE_H;
    
    if (xfrm) {
      const off = xfrm.querySelector("off, a\\:off");
      const ext = xfrm.querySelector("ext, a\\:ext");
      if (off) {
        x = parseInt(off.getAttribute("x") || "0");
        y = parseInt(off.getAttribute("y") || "0");
      }
      if (ext) {
        w = parseInt(ext.getAttribute("cx") || String(SLIDE_W));
        h = parseInt(ext.getAttribute("cy") || String(SLIDE_H));
      }
    }

    // Parse text body
    const txBody = shape.querySelector("txBody, p\\:txBody");
    if (txBody) {
      const paragraphs = txBody.querySelectorAll("p, a\\:p");
      let combinedText = "";
      let mainFontSize = 18;
      let mainBold = false;
      let mainItalic = false;
      let mainColor = "#333333";
      let mainFamily = "Cairo, Arial, sans-serif";
      let mainAlign = "right";
      let hasText = false;

      paragraphs.forEach((para, pIdx) => {
        // Paragraph alignment
        const pPr = para.querySelector("pPr, a\\:pPr");
        if (pPr) {
          const algn = pPr.getAttribute("algn");
          if (algn === "ctr") mainAlign = "center";
          else if (algn === "l") mainAlign = "left";
          else if (algn === "r") mainAlign = "right";
          else if (algn === "just") mainAlign = "justify";
        }

        const runs = para.querySelectorAll("r, a\\:r");
        runs.forEach(run => {
          const rPr = run.querySelector("rPr, a\\:rPr");
          const t = run.querySelector("t, a\\:t");
          const text = t?.textContent || "";
          
          if (text.trim()) {
            hasText = true;
            const props = parseTextProps(rPr);
            mainFontSize = Math.max(mainFontSize, props.fontSize);
            if (props.fontBold) mainBold = true;
            if (props.fontItalic) mainItalic = true;
            mainColor = props.fontColor;
            mainFamily = props.fontFamily;
          }

          combinedText += text;
        });

        if (pIdx < paragraphs.length - 1) combinedText += "\n";
      });

      if (hasText && combinedText.trim()) {
        texts.push({
          text: combinedText.trim(),
          x: emuToPctX(x), y: emuToPctY(y),
          w: emuToPctW(w), h: emuToPctH(h),
          fontSize: mainFontSize,
          fontBold: mainBold,
          fontItalic: mainItalic,
          fontColor: mainColor,
          align: mainAlign,
          fontFamily: mainFamily,
        });
      }
    }
  });

  // Parse picture elements
  const pics = doc.querySelectorAll("pic, p\\:pic");
  pics.forEach(pic => {
    const xfrm = pic.querySelector("xfrm, a\\:xfrm, p\\:spPr a\\:xfrm");
    let x = 0, y = 0, w = SLIDE_W / 2, h = SLIDE_H / 2;
    
    if (xfrm) {
      const off = xfrm.querySelector("off, a\\:off");
      const ext = xfrm.querySelector("ext, a\\:ext");
      if (off) {
        x = parseInt(off.getAttribute("x") || "0");
        y = parseInt(off.getAttribute("y") || "0");
      }
      if (ext) {
        w = parseInt(ext.getAttribute("cx") || String(SLIDE_W / 2));
        h = parseInt(ext.getAttribute("cy") || String(SLIDE_H / 2));
      }
    }

    const blip = pic.querySelector("blip, a\\:blip");
    if (blip) {
      const rId = blip.getAttribute("r:embed") || blip.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
      if (rId && rels[rId] && mediaBlobs[rels[rId]]) {
        images.push({
          blobUrl: mediaBlobs[rels[rId]],
          x: emuToPctX(x), y: emuToPctY(y),
          w: emuToPctW(w), h: emuToPctH(h),
        });
      }
    }
  });

  return { index: slideIndex, texts, images, background, bgImage };
}

// Parse relationships XML file
function parseRels(relsXml: string): Record<string, string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(relsXml, "application/xml");
  const rels: Record<string, string> = {};
  
  doc.querySelectorAll("Relationship").forEach(rel => {
    const id = rel.getAttribute("Id") || "";
    const target = rel.getAttribute("Target") || "";
    // Normalize path: ../media/image1.png -> ppt/media/image1.png
    const normalizedTarget = target.startsWith("../") 
      ? "ppt/" + target.slice(3)
      : target.startsWith("/") 
        ? target.slice(1)
        : "ppt/slides/" + target;
    rels[id] = normalizedTarget;
  });

  return rels;
}

interface PptxViewerProps {
  fileUrl: string;
  /** Pre-loaded ArrayBuffer from useFileCache */
  cachedData?: ArrayBuffer | null;
  /** Whether the file was loaded from cache */
  fromCache?: boolean;
}

export default function PptxViewer({ fileUrl, cachedData, fromCache }: PptxViewerProps) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const blobUrls: string[] = [];

    const processData = async (arrayBuffer: ArrayBuffer) => {
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // 1. Extract all media files as blob URLs
      const mediaBlobs: Record<string, string> = {};
      const mediaFiles = Object.keys(zip.files).filter(
        name => name.startsWith("ppt/media/") && !zip.files[name].dir
      );
      
      for (const name of mediaFiles) {
        const blob = await zip.files[name].async("blob");
        const url = URL.createObjectURL(blob);
        mediaBlobs[name] = url;
        blobUrls.push(url);
      }

      // 2. Find all slide files in order
      const slideFiles = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
          const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
          return numA - numB;
        });

      if (slideFiles.length === 0) {
        throw new Error("لم يتم العثور على شرائح في الملف");
      }

      // 3. Parse each slide
      const parsedSlides: SlideData[] = [];
      
      for (let i = 0; i < slideFiles.length; i++) {
        const slideName = slideFiles[i];
        const slideXml = await zip.files[slideName].async("string");
        
        // Get slide relationships
        const slideNum = slideName.match(/slide(\d+)/)?.[1] || "1";
        const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
        let rels: Record<string, string> = {};
        
        if (zip.files[relsPath]) {
          const relsXml = await zip.files[relsPath].async("string");
          rels = parseRels(relsXml);
        }

        const slideData = await parseSlide(slideXml, rels, mediaBlobs, i);
        parsedSlides.push(slideData);
      }

      return parsedSlides;
    };

    const fetchAndProcess = async () => {
      try {
        setLoading(true);
        setError(null);

        let arrayBuffer: ArrayBuffer;
        
        if (cachedData) {
          arrayBuffer = cachedData;
        } else {
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error("فشل تحميل العرض التقديمي");
          arrayBuffer = await response.arrayBuffer();
        }

        const parsedSlides = await processData(arrayBuffer);

        if (isMounted) {
          setSlides(parsedSlides);
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

    fetchAndProcess();

    return () => {
      isMounted = false;
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, cachedData]);

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
      timeout = setTimeout(() => setShowToolbar(false), 4000);
    };

    const container = viewerContainerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleInteraction);
      container.addEventListener("touchstart", handleInteraction, { passive: true });
    }
    timeout = setTimeout(() => setShowToolbar(false), 4000);

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleInteraction);
        container.removeEventListener("touchstart", handleInteraction);
      }
      clearTimeout(timeout);
    };
  }, [slides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setCurrentSlide(c => Math.min(slides.length - 1, c + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentSlide(c => Math.max(0, c - 1));
      } else if (e.key === "Home") {
        setCurrentSlide(0);
      } else if (e.key === "End") {
        setCurrentSlide(slides.length - 1);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, toggleFullscreen]);

  // Touch swipe for slides
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    
    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0 && currentSlide < slides.length - 1) {
        setCurrentSlide(c => c + 1);
      }
      if (diffX < 0 && currentSlide > 0) {
        setCurrentSlide(c => c - 1);
      }
    }
  };

  // Current slide data
  const slide = slides[currentSlide];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-900 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 shadow-inner border border-stone-200 flex items-center justify-center mb-6">
          <Loader2 size={28} className="animate-spin text-amber-600" />
        </div>
        <p className="text-sm font-bold text-stone-300">جاري تحميل العرض التقديمي...</p>
        <p className="text-xs text-stone-500 mt-1">يتم تحليل الشرائح وتجهيزها للعرض</p>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-stone-900 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <FileText size={32} className="text-amber-400" />
        </div>
        <h3 className="font-bold text-white mb-2">عرض تقديمي</h3>
        <p className="text-xs text-stone-400 mb-5">{error || "لا توجد شرائح في هذا الملف"}</p>
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
      {/* Slide display area */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden p-2 sm:p-4">
        {slide && (
          <div
            className="relative w-full overflow-hidden rounded-lg shadow-2xl transition-all duration-300"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              aspectRatio: "16 / 9",
              background: slide.bgImage 
                ? `url(${slide.bgImage}) center/cover no-repeat` 
                : slide.background || "#ffffff",
            }}
          >
            {/* Render images */}
            {slide.images.map((img, idx) => (
              <img
                key={`img-${idx}`}
                src={img.blobUrl}
                alt=""
                className="absolute object-contain"
                style={{
                  left: `${img.x}%`,
                  top: `${img.y}%`,
                  width: `${img.w}%`,
                  height: `${img.h}%`,
                }}
              />
            ))}

            {/* Render text items */}
            {slide.texts.map((item, idx) => (
              <div
                key={`text-${idx}`}
                className="absolute overflow-hidden flex items-center"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: `${item.w}%`,
                  height: `${item.h}%`,
                  padding: "0.5% 1%",
                }}
              >
                <div
                  className="w-full whitespace-pre-wrap break-words leading-snug"
                  style={{
                    fontSize: `clamp(8px, ${item.fontSize * 0.12}vw, ${item.fontSize * 1.5}px)`,
                    fontWeight: item.fontBold ? 700 : 400,
                    fontStyle: item.fontItalic ? "italic" : "normal",
                    color: item.fontColor,
                    textAlign: item.align as any,
                    fontFamily: item.fontFamily,
                    direction: /[\u0600-\u06FF]/.test(item.text) ? "rtl" : "ltr",
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}

            {/* Empty slide indicator */}
            {slide.texts.length === 0 && slide.images.length === 0 && !slide.bgImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-stone-400 text-sm">شريحة فارغة</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnails panel */}
      {showThumbnails && (
        <div className="absolute top-0 right-0 h-full w-48 sm:w-56 bg-stone-800/95 backdrop-blur-md border-l border-stone-700 z-40 overflow-y-auto p-2 space-y-2">
          <div className="flex items-center justify-between p-2">
            <span className="text-xs font-bold text-stone-300">الشرائح</span>
            <button onClick={() => setShowThumbnails(false)} className="text-stone-400 hover:text-white text-xs">✕</button>
          </div>
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrentSlide(idx); setShowThumbnails(false); }}
              className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentSlide 
                  ? "border-amber-500 shadow-lg shadow-amber-500/20" 
                  : "border-transparent hover:border-stone-600"
              }`}
            >
              <div
                className="relative w-full aspect-video"
                style={{
                  background: s.bgImage 
                    ? `url(${s.bgImage}) center/cover` 
                    : s.background || "#ffffff",
                }}
              >
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 text-center font-bold">
                  {idx + 1}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrentSlide(c => Math.max(0, c - 1))}
            disabled={currentSlide === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-20 z-10 backdrop-blur-sm"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => setCurrentSlide(c => Math.min(slides.length - 1, c + 1))}
            disabled={currentSlide === slides.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-20 z-10 backdrop-blur-sm"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Floating toolbar */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-stone-200 rounded-full flex items-center gap-2 px-3 py-2 transition-all duration-300 z-50 ${
          showToolbar ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
        }`}
      >
        {/* Offline indicator */}
        {fromCache && (
          <>
            <div className="flex items-center gap-1 px-1" title="محفوظ للعرض بدون إنترنت">
              <WifiOff size={13} className="text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700">محفوظ</span>
            </div>
            <div className="w-px h-6 bg-stone-300 mx-0.5" />
          </>
        )}

        {/* Thumbnails toggle */}
        <button
          onClick={() => setShowThumbnails(v => !v)}
          className={`p-2 rounded-full transition-colors active:scale-95 ${
            showThumbnails ? "bg-amber-100 text-amber-700" : "text-stone-600 hover:bg-amber-50 hover:text-amber-600"
          }`}
          aria-label="عرض الشرائح"
          title="عرض جميع الشرائح"
        >
          <Grid3X3 size={18} />
        </button>

        {slides.length > 1 && (
          <>
            <div className="w-px h-6 bg-stone-300 mx-0.5" />
            <span className="text-sm font-bold text-stone-800 tabular-nums min-w-[3rem] text-center">
              {currentSlide + 1} / {slides.length}
            </span>
          </>
        )}

        <div className="w-px h-6 bg-stone-300 mx-0.5" />

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
