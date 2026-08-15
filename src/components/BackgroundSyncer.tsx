"use client";

import { useEffect } from "react";

const ENDPOINTS_TO_CACHE = [
  { url: "/api/stats", key: "offline_cache_stats" },
  { url: "/api/prayer-requests", key: "offline_cache_prayers" },
  { url: "/api/servants", key: "offline_cache_servants_list" },
  { url: "/api/servants", key: "offline_cache_followup_servants" }, // Followup page uses this key
  { url: "/api/members", key: "offline_cache_members_servants" },
  { url: "/api/members", key: "offline_cache_attendance_members" },
  { url: "/api/meetings", key: "offline_cache_meetings" },
  { url: "/api/meetings", key: "offline_cache_attendance_meetings" },
  { url: "/api/media", key: "offline_cache_library" },
  { url: "/api/announcements", key: "offline_cache_announcements" },
  { url: "/api/followup?absentWeeks=2", key: "offline_cache_followup_absent_2_" }, // Default followup list
];

const PAGES_TO_CACHE = [
  "/",
  "/library",
  "/meetings",
  "/members",
  "/followup",
  "/attendance",
  "/prayers",
  "/announcements",
  "/servants",
  "/agpeya"
];

export default function BackgroundSyncer() {
  useEffect(() => {
    // Only run this on the client side and if the browser is online
    if (typeof window === "undefined" || !navigator.onLine) return;

    // Small delay to ensure this doesn't block the initial page load
    const timeoutId = setTimeout(() => {
      // 1. Cache API endpoints data in localStorage
      ENDPOINTS_TO_CACHE.forEach(async ({ url, key }) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(key, JSON.stringify(data));
          }
        } catch (err) {
          console.warn(`[BackgroundSyncer] Failed to prefetch data ${url}`, err);
        }
      });

      // 2. Cache HTML pages via Service Worker interception
      PAGES_TO_CACHE.forEach(async (url) => {
        try {
          // Fetching these will cause the Service Worker to intercept and store them in pages-cache
          await fetch(url, { headers: { Accept: "text/html" } });
        } catch (err) {
          console.warn(`[BackgroundSyncer] Failed to prefetch page ${url}`, err);
        }
      });
    }, 5000); // 5 seconds after load

    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
