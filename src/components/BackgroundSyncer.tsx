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
  "/library/view",
  "/meetings",
  "/meetings/new",
  "/members",
  "/members/new",
  "/families",
  "/followup",
  "/attendance",
  "/prayers",
  "/prayers/new",
  "/announcements",
  "/servants",
  "/agpeya"
];

export default function BackgroundSyncer() {
  useEffect(() => {
    // Only run this on the client side
    if (typeof window === "undefined") return;

    const runSync = () => {
      if (!navigator.onLine) return;
      
      // Small delay to ensure this doesn't block the initial page load
      setTimeout(() => {
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
          await fetch(url, { headers: { Accept: "text/html" } });
        } catch (err) {
          console.warn(`[BackgroundSyncer] Failed to prefetch page ${url}`, err);
        }
      });

      // 3. Dynamically fetch and cache subpages (Meetings and Members) sequentially
      const prefetchDynamicPages = async () => {
        try {
          // Meetings
          const meetingsRes = await fetch("/api/meetings");
          if (meetingsRes.ok) {
            const meetings = await meetingsRes.json();
            for (const m of meetings) {
              await fetch(`/api/meetings/${m.id}`).catch(() => {});
              await fetch(`/meetings/${m.id}`, { headers: { Accept: "text/html" } }).catch(() => {});
              await fetch(`/meetings/${m.id}`, { headers: { RSC: "1" } }).catch(() => {});
              if (m.imageUrl) {
                await fetch(m.imageUrl, { mode: "no-cors" }).catch(() => {});
              }
            }
          }
          
          // Members
          const membersRes = await fetch("/api/members");
          if (membersRes.ok) {
            const members = await membersRes.json();
            for (const m of members) {
              await fetch(`/api/members/${m.id}`).catch(() => {});
              await fetch(`/members/${m.id}`, { headers: { Accept: "text/html" } }).catch(() => {});
              await fetch(`/members/${m.id}`, { headers: { RSC: "1" } }).catch(() => {});
            }
          }

          // Library Media Files
          const mediaRes = await fetch("/api/media");
          if (mediaRes.ok) {
            const media = await mediaRes.json();
            for (const item of media) {
              if (item.fileUrl) {
                // Fetch direct URL for download capability
                await fetch(item.fileUrl, { mode: "no-cors" }).catch(() => {});
                
                // Cache the proxy URL (used by PdfViewer for all file types)
                const proxyUrl = `/api/file-proxy/document.pdf?url=${encodeURIComponent(item.fileUrl)}`;
                await fetch(proxyUrl).catch(() => {});

                // Cache the RSC payload and HTML for the specific view page
                const viewUrl = `/library/view?url=${encodeURIComponent(item.fileUrl)}&title=${encodeURIComponent(item.title)}&type=${encodeURIComponent(item.fileType)}`;
                await fetch(viewUrl, { headers: { Accept: "text/html" } }).catch(() => {});
                await fetch(viewUrl, { headers: { RSC: "1" } }).catch(() => {});
              }
            }
          }

          // Announcements
          const announcementsRes = await fetch("/api/announcements");
          if (announcementsRes.ok) {
            const announcements = await announcementsRes.json();
            for (const a of announcements) {
              if (a.imageUrl) {
                await fetch(a.imageUrl, { mode: "no-cors" }).catch(() => {});
              }
            }
          }
          
          // Agpeya Slides - fetch WITHOUT no-cors so SW can cache them properly
          try {
            const agpeyaFolders = ["baker", "third", "sixth", "ninth", "sunset", "noom", "midnight"];
            const slideCounts = [79, 51, 52, 50, 44, 55, 159];
            for (let i = 0; i < agpeyaFolders.length; i++) {
              for (let j = 1; j <= slideCounts[i]; j++) {
                await fetch(`/agpeya/${agpeyaFolders[i]}/Slide${j}.JPG`).catch(() => {});
              }
            }
            // Also cache the PPTX files for download
            const pptxFiles = ["00 باكر.pptx", "01 الساعة الثالثة.pptx", "02 الساعة السادسة.pptx", "03 الساعة التاسعة.pptx", "04 الغروب.pptx", "05 النوم.pptx", "06 نصف الليل.pptx"];
            for (const f of pptxFiles) {
              await fetch(`/agpeya/${encodeURIComponent(f)}`).catch(() => {});
            }
          } catch (err) {
            console.warn("Agpeya prefetch failed", err);
          }
        } catch (err) {
          console.warn("[BackgroundSyncer] Failed to prefetch dynamic pages", err);
        }
      };
      
      prefetchDynamicPages();
    }, 500);
  };

    // Run initial sync after 5 seconds
    const timeoutId = setTimeout(runSync, 5000);

    // Expose sync function to window so OfflineIndicator can trigger it
    (window as any).triggerBackgroundSync = () => {
      runSync();
    };

    return () => {
      clearTimeout(timeoutId);
      delete (window as any).triggerBackgroundSync;
    };
  }, []);

  return null;
}
