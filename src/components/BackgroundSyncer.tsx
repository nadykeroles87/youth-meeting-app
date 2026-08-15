"use client";

import { useEffect } from "react";

const ENDPOINTS_TO_CACHE = [
  { url: "/api/stats", key: "offline_cache_stats" },
  { url: "/api/prayer-requests", key: "offline_cache_prayers" },
  { url: "/api/servants", key: "offline_cache_servants_list" },
  { url: "/api/members", key: "offline_cache_members_servants" },
  { url: "/api/members", key: "offline_cache_attendance_members" },
  { url: "/api/meetings", key: "offline_cache_meetings" },
  { url: "/api/meetings", key: "offline_cache_attendance_meetings" },
  { url: "/api/media", key: "offline_cache_library" },
  { url: "/api/announcements", key: "offline_cache_announcements" },
];

export default function BackgroundSyncer() {
  useEffect(() => {
    // Only run this on the client side and if the browser is online
    if (typeof window === "undefined" || !navigator.onLine) return;

    // Small delay to ensure this doesn't block the initial page load
    const timeoutId = setTimeout(() => {
      ENDPOINTS_TO_CACHE.forEach(async ({ url, key }) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(key, JSON.stringify(data));
          }
        } catch (err) {
          console.warn(`[BackgroundSyncer] Failed to prefetch ${url}`, err);
        }
      });
    }, 5000); // 5 seconds after load

    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
