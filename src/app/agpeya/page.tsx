"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import {
  BookOpen, Sun, Sunset, Moon, Clock, Sparkles,
  Download, ChevronRight, ChevronLeft, Presentation, Check,
  Maximize, Minimize, Wifi, WifiOff, Loader2, RefreshCw, FileText
} from "lucide-react";
import agpeyaLinksData from "@/data/agpeya_links.json";

type HourKey = "baker" | "third" | "sixth" | "ninth" | "sunset" | "noom" | "midnight";

type PrayerMetadata = {
  id: HourKey;
  title: string;
  subTitle: string;
  icon: any;
  timeLabel: string;
  filename: string;
  imageFolder: string;
  slidesCount: number;
  pdfFilename: string;
};

const HOURS: PrayerMetadata[] = [
  {
    id: "baker",
    title: "صلاة باكر",
    subTitle: "تُصلى في الصباح الباكر تذكاراً لقيامة الرب يسوع من بين الأموات",
    icon: Sun,
    timeLabel: "٦:٠٠ صباحاً",
    filename: "00 باكر.pptx",
    imageFolder: "baker",
    slidesCount: 79,
    pdfFilename: "baker.pdf",
  },
  {
    id: "third",
    title: "صلاة الساعة الثالثة",
    subTitle: "تُصلى تذكاراً لحلول الروح القدس على التلاميذ وتجربة المسيح في المحاكمة",
    icon: Clock,
    timeLabel: "٩:٠٠ صباحاً",
    filename: "01 الساعة الثالثة.pptx",
    imageFolder: "third",
    slidesCount: 51,
    pdfFilename: "third.pdf",
  },
  {
    id: "sixth",
    title: "صلاة الساعة السادسة",
    subTitle: "تُصلى تذكاراً لصلب ربنا يسوع المسيح على عود الصليب لأجل خلاصنا",
    icon: Sun,
    timeLabel: "١٢:٠٠ ظهراً",
    filename: "02 الساعة السادسة.pptx",
    imageFolder: "sixth",
    slidesCount: 52,
    pdfFilename: "sixth.pdf",
  },
  {
    id: "ninth",
    title: "صلاة الساعة التاسعة",
    subTitle: "تُصلى تذكاراً لموت المسيح بالجسد على الصليب وقبول اللص اليمين في الفردوس",
    icon: Clock,
    timeLabel: "٣:٠٠ عصراً",
    filename: "03 الساعة التاسعة.pptx",
    imageFolder: "ninth",
    slidesCount: 50,
    pdfFilename: "ninth.pdf",
  },
  {
    id: "sunset",
    title: "صلاة الغروب",
    subTitle: "تُصلى عند غروب الشمس تذكاراً لإنزال جثمان المسيح من على الصليب",
    icon: Sunset,
    timeLabel: "٥:٠٠ مساءً",
    filename: "04 الغروب.pptx",
    imageFolder: "sunset",
    slidesCount: 44,
    pdfFilename: "sunset.pdf",
  },
  {
    id: "noom",
    title: "صلاة النوم",
    subTitle: "تُصلى قبل النوم تذكاراً لوضع جثمان المسيح في القبر والاستعداد للقاء الرب",
    icon: Moon,
    timeLabel: "٩:٠٠ مساءً",
    filename: "05 النوم.pptx",
    imageFolder: "noom",
    slidesCount: 55,
    pdfFilename: "noom.pdf",
  },
  {
    id: "midnight",
    title: "صلاة نصف الليل",
    subTitle: "تُصلى في نصف الليل تذكاراً لصلاة المسيح في جثسيماني والاستعداد للمجيء الثاني",
    icon: Moon,
    timeLabel: "١٢:٠٠ منتصف الليل",
    filename: "06 نصف الليل.pptx",
    imageFolder: "midnight",
    slidesCount: 159,
    pdfFilename: "midnight.pdf",
  },
];

export default function AgpeyaPage() {
  const [selectedHourKey, setSelectedHourKey] = useState<HourKey>("baker");
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"slides" | "all">("slides");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);

  // Offline caching states
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState<{ current: number; total: number } | null>(null);
  const [isHourCached, setIsHourCached] = useState<boolean>(false);

  const viewerRef = useRef<HTMLDivElement>(null);

  const hourMeta = HOURS.find((h) => h.id === selectedHourKey) || HOURS[0];
  const hourLinks = (agpeyaLinksData as any)[selectedHourKey];

  // Check if current prayer is cached
  const checkCacheStatus = useCallback(async () => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    try {
      const cache = await caches.open("agpeya-cache-v2");
      // Check first slide and PDF
      const slide1 = await cache.match(`/agpeya/${hourMeta.imageFolder}/Slide1.JPG`);
      const pdf = await cache.match(`/agpeya/${hourMeta.pdfFilename}`);
      setIsHourCached(!!slide1 || !!pdf);
    } catch {
      setIsHourCached(false);
    }
  }, [hourMeta]);

  useEffect(() => {
    checkCacheStatus();
    setImageError(false);
  }, [selectedHourKey, checkCacheStatus]);

  // Background caching of current prayer slides (low priority)
  useEffect(() => {
    if (typeof window === "undefined" || !("caches" in window) || !navigator.onLine) return;

    let isCancelled = false;

    const prefetchSlides = async () => {
      try {
        const cache = await caches.open("agpeya-cache-v2");
        // Always pre-cache the light PDF version first
        const pdfUrl = `/agpeya/${hourMeta.pdfFilename}`;
        const hasPdf = await cache.match(pdfUrl);
        if (!hasPdf) {
          cache.add(pdfUrl).catch(() => {});
        }

        // Preload first 5 slides immediately
        for (let i = 1; i <= Math.min(5, hourMeta.slidesCount); i++) {
          if (isCancelled) break;
          const url = `/agpeya/${hourMeta.imageFolder}/Slide${i}.JPG`;
          const match = await cache.match(url);
          if (!match) {
            await cache.add(url).catch(() => {});
          }
        }
      } catch {
        // Silently ignore prefetch errors
      }
    };

    const timeout = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(prefetchSlides);
      } else {
        prefetchSlides();
      }
    }, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [hourMeta]);

  // Manual offline download trigger for the whole prayer
  const downloadHourForOffline = async () => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    setIsCaching(true);
    setCacheProgress({ current: 0, total: hourMeta.slidesCount + 1 });

    try {
      const cache = await caches.open("agpeya-cache-v2");

      // 1. Cache PDF
      await cache.add(`/agpeya/${hourMeta.pdfFilename}`).catch(() => {});
      setCacheProgress({ current: 1, total: hourMeta.slidesCount + 1 });

      // 2. Cache all slides
      for (let i = 1; i <= hourMeta.slidesCount; i++) {
        const url = `/agpeya/${hourMeta.imageFolder}/Slide${i}.JPG`;
        try {
          await cache.add(url);
        } catch (e) {
          console.warn(`Failed to cache slide ${i}:`, e);
        }
        setCacheProgress({ current: i + 1, total: hourMeta.slidesCount + 1 });
      }

      setIsHourCached(true);
    } catch (err) {
      console.error("Cache error:", err);
    } finally {
      setIsCaching(false);
      setTimeout(() => setCacheProgress(null), 3000);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const nextSlide = useCallback(() => {
    if (currentSlideIndex < hourMeta.slidesCount - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setImageError(false);
    }
  }, [currentSlideIndex, hourMeta.slidesCount]);

  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
      setImageError(false);
    }
  }, [currentSlideIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === "slides") {
        if (e.key === "ArrowLeft" || e.key === " ") {
          e.preventDefault();
          nextSlide();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          prevSlide();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, viewMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && viewerRef.current) {
      viewerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const handleHourSelect = (key: HourKey) => {
    setSelectedHourKey(key);
    setCurrentSlideIndex(0);
    setImageError(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 45;
    if (deltaX < -SWIPE_THRESHOLD) {
      nextSlide(); // In RTL, swipe left = Next slide
    } else if (deltaX > SWIPE_THRESHOLD) {
      prevSlide(); // Swipe right = Prev slide
    }
    setTouchStartX(null);
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6 w-full min-w-0">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
              <BookOpen size={14} />
              صلوات الأجبية القبطية (تعمل بدون إنترنت 100%)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">صلوات الأجبية المقدسة</h1>
            <p className="text-amber-200/80 text-xs sm:text-sm mt-1">
              "صلوا بلا انقطاع" (١تس ٥: ١٧) · عروض التقديم والصلوات المعتمدة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Offline Cache Button */}
            <button
              onClick={downloadHourForOffline}
              disabled={isCaching}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer border ${
                isHourCached
                  ? "bg-emerald-600/90 text-white border-emerald-500 hover:bg-emerald-600"
                  : "bg-amber-600 hover:bg-amber-700 text-white border-amber-500"
              }`}
            >
              {isCaching ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-200" />
                  جاري الحفظ للأوفلاين ({cacheProgress?.current}/{cacheProgress?.total})...
                </>
              ) : isHourCached ? (
                <>
                  <Check size={14} className="text-emerald-200" />
                  محفوظة للأوفلاين ✅
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-amber-200" />
                  حفظ الصلاة للأوفلاين
                </>
              )}
            </button>

            {/* Read as PDF link */}
            <Link
              href={`/library/view?url=${encodeURIComponent(`/agpeya/${hourMeta.pdfFilename}`)}&title=${encodeURIComponent(hourMeta.title)}&type=pdf`}
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md border border-amber-400/50 cursor-pointer"
            >
              <FileText size={14} />
              قراءة كـ PDF
            </Link>

            {/* Download PPTX */}
            <a
              href={`/agpeya/${encodeURIComponent(hourMeta.filename)}`}
              download
              className="p-2 rounded-2xl bg-amber-800/80 hover:bg-amber-700 text-amber-200 transition-all border border-amber-600/60"
              title="تحميل ملف الباوربوينت"
            >
              <Download size={14} />
            </a>
          </div>
        </div>

        {/* ── Prayer Hour Tabs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {HOURS.map((hour) => {
            const Icon = hour.icon;
            const isSelected = hour.id === selectedHourKey;
            return (
              <button
                key={hour.id}
                onClick={() => handleHourSelect(hour.id)}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/30 font-bold scale-102"
                    : "bg-white border-amber-200/80 text-stone-700 hover:border-amber-400 hover:bg-amber-50/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Icon size={16} className={isSelected ? "text-amber-200" : "text-amber-600"} />
                </div>
                <p className="text-xs font-bold truncate">{hour.title}</p>
                <span className={`text-[10px] mt-1 font-semibold ${isSelected ? "text-amber-100" : "text-stone-400"}`}>
                  {hour.timeLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── View Mode Control & Current Hour Title ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Presentation size={18} className="text-amber-600" />
              {hourMeta.title} ({hourMeta.slidesCount} شريحة)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">{hourMeta.subTitle}</p>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 p-1 rounded-xl border border-amber-200">
            <button
              onClick={() => setViewMode("slides")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "slides" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100"
              }`}
            >
              عرض الشريحة تلو الأخرى
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "all" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100"
              }`}
            >
              عرض الكل في قائمة واحدة
            </button>
          </div>
        </div>

        {/* ── Content View ── */}
        {viewMode === "slides" ? (
          /* Slide by Slide Viewer */
          <div
            ref={viewerRef}
            className={`bg-white rounded-3xl shadow-md border overflow-hidden flex flex-col ${
              isFullscreen ? "border-none !rounded-none w-screen h-screen bg-black" : "border-amber-200/80"
            }`}
          >
            {/* Slide Header Toolbar */}
            <div className={`bg-amber-950 text-white px-4 sm:px-6 py-3 flex items-center justify-between ${
              isFullscreen ? "border-b border-amber-900/40" : "border-b border-amber-900"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  شريحة {currentSlideIndex + 1} من {hourMeta.slidesCount}
                </span>
                {isHourCached && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">
                    <WifiOff size={10} />
                    أوفلاين
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-amber-700 hover:bg-amber-600 rounded-xl text-white transition-all cursor-pointer border border-amber-600"
                  title={isFullscreen ? "تصغير الشاشة" : "تكبير الشاشة - ملء الشاشة"}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
                <div className="flex items-center gap-1.5 border-r border-amber-800 pr-2 sm:pr-3">
                  <button
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                    className="p-1.5 bg-amber-900 hover:bg-amber-800 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
                    title="الشريحة السابقة"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={nextSlide}
                    disabled={currentSlideIndex === hourMeta.slidesCount - 1}
                    className="p-1.5 bg-amber-900 hover:bg-amber-800 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
                    title="الشريحة التالية"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Slide Image Card */}
            <div
              className={`flex items-center justify-center relative flex-1 overflow-hidden min-h-[300px] ${
                isFullscreen ? "bg-black" : "bg-black/5"
              }`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {imageError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-stone-900 text-white rounded-2xl m-4 border border-stone-700">
                  <WifiOff size={36} className="text-amber-500 mb-3" />
                  <h3 className="font-bold text-sm mb-1">تعذر تحميل الشريحة (أنت غير متصل بالإنترنت)</h3>
                  <p className="text-xs text-stone-400 mb-4 max-w-sm">
                    لم يتم تخزين هذه الشريحة مؤقتاً بعد. يمكنك حفظ الصلاة عند الاتصال بالإنترنت أو استخدام نسخة الـ PDF.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setImageError(false)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-xs font-bold transition-all"
                    >
                      إعادة المحاولة
                    </button>
                    <Link
                      href={`/library/view?url=${encodeURIComponent(`/agpeya/${hourMeta.pdfFilename}`)}&title=${encodeURIComponent(hourMeta.title)}&type=pdf`}
                      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-xl text-xs font-bold transition-all"
                    >
                      فتح كـ PDF
                    </Link>
                  </div>
                </div>
              ) : (
                <div
                  className="relative"
                  style={{
                    aspectRatio: "720 / 540",
                    maxWidth: "100%",
                    maxHeight: isFullscreen ? "calc(100vh - 56px)" : "65vh",
                    width: "auto",
                  }}
                >
                  <img
                    key={`slide_${selectedHourKey}_${currentSlideIndex + 1}`}
                    src={`/agpeya/${hourMeta.imageFolder}/Slide${currentSlideIndex + 1}.JPG`}
                    alt={`شريحة ${currentSlideIndex + 1}`}
                    className="w-full h-full object-fill shadow-md"
                    style={{ display: "block" }}
                    loading="eager"
                    onError={() => setImageError(true)}
                  />

                  {/* Preload adjacent slides */}
                  <div className="hidden" aria-hidden="true">
                    {currentSlideIndex > 0 && (
                      <img src={`/agpeya/${hourMeta.imageFolder}/Slide${currentSlideIndex}.JPG`} alt="preload prev" />
                    )}
                    {currentSlideIndex < hourMeta.slidesCount - 1 && (
                      <img src={`/agpeya/${hourMeta.imageFolder}/Slide${currentSlideIndex + 2}.JPG`} alt="preload next 1" />
                    )}
                  </div>

                  {/* Hyperlinks Overlay */}
                  {hourLinks?.slides?.[(currentSlideIndex + 1).toString()]?.map((link: any, i: number) => {
                    const left = (link.x / hourLinks.slideSize.width) * 100;
                    const top = (link.y / hourLinks.slideSize.height) * 100;
                    const width = (link.w / hourLinks.slideSize.width) * 100;
                    const height = (link.h / hourLinks.slideSize.height) * 100;

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentSlideIndex(link.targetSlide - 1)}
                        style={{
                          position: "absolute",
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                        }}
                        title={`الذهاب إلى شريحة ${link.targetSlide}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Slide Footer Navigator */}
            {!isFullscreen && (
              <div className="p-4 bg-amber-50/70 border-t border-amber-200/60 flex items-center justify-between gap-3">
                <button
                  onClick={prevSlide}
                  disabled={currentSlideIndex === 0}
                  className="flex items-center gap-1 bg-white hover:bg-amber-100 disabled:opacity-40 text-amber-950 px-4 py-2 rounded-xl text-xs font-bold border border-amber-200 transition-all cursor-pointer"
                >
                  <ChevronRight size={14} />
                  السابقة
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={hourMeta.slidesCount}
                    value={currentSlideIndex + 1}
                    onChange={(e) => setCurrentSlideIndex(parseInt(e.target.value, 10) - 1)}
                    className="w-24 sm:w-44 accent-amber-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-900 tabular-nums min-w-[3.5rem] text-center">
                    {currentSlideIndex + 1} / {hourMeta.slidesCount}
                  </span>
                </div>

                <button
                  onClick={nextSlide}
                  disabled={currentSlideIndex === hourMeta.slidesCount - 1}
                  className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  التالية
                  <ChevronLeft size={14} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Full Continuous List View */
          <div className="space-y-4">
            {Array.from({ length: hourMeta.slidesCount }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-amber-200/70 hover:border-amber-400 transition-all"
              >
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full inline-block">
                    سلايد {idx + 1}
                  </span>
                </div>
                <img
                  src={`/agpeya/${hourMeta.imageFolder}/Slide${idx + 1}.JPG`}
                  alt={`شريحة ${idx + 1}`}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
