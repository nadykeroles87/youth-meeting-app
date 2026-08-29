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

export default function BackgroundSyncer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isCancelled = false;

    const runSync = async () => {
      if (!navigator.onLine || isCancelled) return;

      // Sequentially cache critical API endpoints with delay between requests
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
        // Small delay between requests to keep the network free for user interactions
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    };

    // Delay start until 3 seconds after page load to prioritize initial render
    const timeoutId = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => runSync(), { timeout: 10000 });
      } else {
        runSync();
      }
    }, 3000);

    (window as any).triggerBackgroundSync = () => {
      runSync();
    };

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      delete (window as any).triggerBackgroundSync;
    };
  }, []);

  return null;
}

