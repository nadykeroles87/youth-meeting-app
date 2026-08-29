"use client";

import { useEffect } from "react";

const ENDPOINTS_TO_CACHE = [
  { url: "/api/stats", key: "offline_cache_stats" },
  { url: "/api/prayer-requests", key: "offline_cache_prayers" },
  { url: "/api/servants", key: "offline_cache_servants_list" },
  { url: "/api/servants", key: "offline_cache_followup_servants" },
  { url: "/api/members", key: "offline_cache_members_servants" },
  { url: "/api/members", key: "offline_cache_attendance_members" },
  { url: "/api/meetings", key: "offline_cache_meetings" },
  { url: "/api/meetings", key: "offline_cache_attendance_meetings" },
  { url: "/api/media", key: "offline_cache_library" },
  { url: "/api/announcements", key: "offline_cache_announcements" },
  { url: "/api/followup?absentWeeks=2", key: "offline_cache_followup_absent_2_" },
];

const AGPEYA_PDFS = [
  "/agpeya/baker.pdf",
  "/agpeya/third.pdf",
  "/agpeya/sixth.pdf",
  "/agpeya/ninth.pdf",
  "/agpeya/sunset.pdf",
  "/agpeya/noom.pdf",
  "/agpeya/midnight.pdf",
];

export default function BackgroundSyncer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isCancelled = false;

    const runSync = async (force = false) => {
      if (!navigator.onLine || isCancelled) return;

      const lastSync = localStorage.getItem("last_bg_sync_time");
      const oneHour = 60 * 60 * 1000;
      if (!force && lastSync && Date.now() - parseInt(lastSync, 10) < oneHour) {
        return; // Already synced recently
      }

      // 1. Cache critical API endpoints
      for (const { url, key } of ENDPOINTS_TO_CACHE) {
        if (isCancelled) break;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(key, JSON.stringify(data));
          }
        } catch {
          // Ignore offline / background prefetch errors
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      // 2. Pre-cache Agpeya PDF prayers for 100% offline access
      if ("caches" in window && !isCancelled) {
        try {
          const agpeyaCache = await caches.open("agpeya-cache-v2");
          for (const pdfUrl of AGPEYA_PDFS) {
            if (isCancelled) break;
            const match = await agpeyaCache.match(pdfUrl);
            if (!match) {
              await agpeyaCache.add(pdfUrl).catch(() => {});
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
        } catch {
          // Ignore cache errors
        }
      }

      if (!isCancelled) {
        localStorage.setItem("last_bg_sync_time", Date.now().toString());
      }
    };

    // Delay start until 8 seconds after page load and when idle
    const timeoutId = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => runSync(false), { timeout: 15000 });
      } else {
        runSync(false);
      }
    }, 8000);

    (window as any).triggerBackgroundSync = () => {
      runSync(true);
    };

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      delete (window as any).triggerBackgroundSync;
    };
  }, []);

  return null;
}

