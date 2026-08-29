"use client";

import React, { useState, useRef, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import {
  BookOpen, Sun, Sunset, Moon, Clock, ZoomIn, ZoomOut, Sparkles,
  Download, ChevronRight, ChevronLeft, Presentation, Check, Maximize, Minimize
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
  },
];

export default function AgpeyaPage() {
  const [selectedHourKey, setSelectedHourKey] = useState<HourKey>("baker");
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"slides" | "all">("slides");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);

  const hourMeta = HOURS.find((h) => h.id === selectedHourKey) || HOURS[0];
  const hourLinks = (agpeyaLinksData as any)[selectedHourKey];

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
  }, [currentSlideIndex, hourMeta.slidesCount, viewMode]);

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
  };

  const nextSlide = () => {
    if (currentSlideIndex < hourMeta.slidesCount - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 50;
    if (deltaX < -SWIPE_THRESHOLD) {
      prevSlide(); // swipe left = prev slide
    } else if (deltaX > SWIPE_THRESHOLD) {
      nextSlide(); // swipe right = next slide
    }
    setTouchStartX(null);
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="pr-12 md:pr-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
              <BookOpen size={14} />
              صلوات الأجبية القبطية (العروض المعتمدة)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">صلوات الأجبية المقدسة</h1>
            <p className="text-amber-200/80 text-xs sm:text-sm mt-1">
              "صلوا بلا انقطاع" (١تس ٥: ١٧) · عروض التقديم والصلوات الخاصة بالاجتماع
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Download PPTX file button */}
            <a
              href={`/agpeya/${encodeURIComponent(hourMeta.filename)}`}
              download
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer border border-amber-400/50"
            >
              <Download size={14} />
              تحميل ملف العرض PowerPoint
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
              {hourMeta.title} ({hourMeta.slidesCount} شريحة / سلايد)
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
            {/* Slide Header Toolbar - always visible */}
            <div className={`bg-amber-950 text-white px-6 py-3.5 flex items-center justify-between ${
              isFullscreen ? "border-b border-amber-900/40" : "border-b border-amber-900"
            }`}>
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles size={14} />
                شريحة {currentSlideIndex + 1} من {hourMeta.slidesCount}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-amber-700 hover:bg-amber-600 rounded-xl text-white transition-all cursor-pointer border border-amber-600"
                  title={isFullscreen ? "تصغير الشاشة" : "تكبير الشاشة - ملء الشاشة"}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
                <div className="flex items-center gap-1.5 border-r border-amber-800 pr-3">
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
              className={`flex items-center justify-center relative flex-1 overflow-hidden ${isFullscreen ? "bg-black" : "bg-black/5"}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Wrapper sized exactly to the slide's aspect ratio - overlays will be relative to this */}
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
                  src={`/agpeya/${hourMeta.imageFolder}/Slide${currentSlideIndex + 1}.JPG`}
                  alt={`شريحة ${currentSlideIndex + 1}`}
                  className="w-full h-full object-fill shadow-md"
                  style={{ display: "block" }}
                  loading="eager"
                />

                {/* Preload adjacent slides to prevent delay when navigating */}
                <div className="hidden" aria-hidden="true">
                  {currentSlideIndex > 0 && (
                    <img src={`/agpeya/${hourMeta.imageFolder}/Slide${currentSlideIndex}.JPG`} alt="preload prev" />
                  )}
                  {currentSlideIndex < hourMeta.slidesCount - 1 && (
                    <img src={`/agpeya/${hourMeta.imageFolder}/Slide${currentSlideIndex + 2}.JPG`} alt="preload next 1" />
                  )}
                  {currentSlideIndex < hourMeta.slidesCount - 2 && (
                    <img src={`/agpeya/${hourMeta.imageFolder}/Slide${currentSlideIndex + 3}.JPG`} alt="preload next 2" />
                  )}
                </div>

                {/* Hyperlinks Overlay - positioned as % of the slide's coordinate space */}
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

                <span className="text-xs font-bold text-amber-900">
                  {currentSlideIndex + 1} / {hourMeta.slidesCount}
                </span>

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
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
