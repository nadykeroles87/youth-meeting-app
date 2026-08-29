"use client";

import { useEffect } from "react";

const ESSENTIAL_ENDPOINTS = [
  { url: "/api/stats", key: "offline_cache_stats" },
  { url: "/api/prayer-requests", key: "offline_cache_prayers" },
  { url: "/api/servants", key: "offline_cache_servants_list" },
  { url: "/api/servants", key: "offline_cache_followup_servants" },
  { url: "/api/members", key: "offline_cache_members_servants" },
  { url: "/api/meetings", key: "offline_cache_meetings" },
  { url: "/api/media", key: "offline_cache_library" },
  { url: "/api/announcements", key: "offline_cache_announcements" },
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
        return; // Already synced recently, don't waste network/CPU
      }

      // Sequentially cache lightweight API endpoints with gentle delays
      for (const { url, key } of ESSENTIAL_ENDPOINTS) {
        if (isCancelled) break;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(key, JSON.stringify(data));
          }
        } catch {
          // Ignore
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (!isCancelled) {
        localStorage.setItem("last_bg_sync_time", Date.now().toString());
      }
    };

    // Run only when idle, 6 seconds after page load
    const timeoutId = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => runSync(false), { timeout: 15000 });
      } else {
        runSync(false);
      }
    }, 6000);

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
