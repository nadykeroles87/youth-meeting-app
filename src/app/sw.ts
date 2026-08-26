import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin, RangeRequestsPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// Fix Windows backslash issue in precache manifest
const precacheManifest = (self.__SW_MANIFEST || []).map((entry) => {
  if (typeof entry === "string") {
    return entry.replace(/\\/g, "/");
  }
  return {
    ...entry,
    url: entry.url.replace(/\\/g, "/"),
  };
});

const serwist = new Serwist({
  precacheEntries: precacheManifest,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
  runtimeCaching: [
    // Cache API routes with NetworkFirst strategy
    // This ensures we get the fresh data when online, but fallback to cache when offline.
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "api-cache-v2",
        matchOptions: {
          ignoreVary: true,
        },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1000,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          }),
          new RangeRequestsPlugin(),
        ],
      }),
    },
    // RSC Payload Cache
    {
      matcher: ({ request }: { request: Request }) => request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: "rsc-cache-v2",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1000,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // Cache all HTML pages with NetworkFirst for offline access
    // StaleWhileRevalidate causes stale JS chunks to break the Next.js app on new deployments.
    {
      matcher: ({ request, url }: { request: Request; url: URL }) => {
        const isAppPage = [
          "/", "/library", "/library/view", "/meetings", "/meetings/new",
          "/members", "/members/new", "/families", "/followup", 
          "/attendance", "/prayers", "/prayers/new", "/announcements", 
          "/servants", "/agpeya"
        ].includes(url.pathname);
        
        return isAppPage || 
               request.mode === "navigate" || 
               request.headers.get("Accept")?.includes("text/html");
      },
      handler: new NetworkFirst({
        cacheName: "pages-cache-v2",
        matchOptions: {
          ignoreSearch: true,
        },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1000,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // Cache Agpeya static files (slide images, PPTX downloads)
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/agpeya/"),
      handler: new StaleWhileRevalidate({
        cacheName: "agpeya-cache-v2",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1000,
            maxAgeSeconds: 90 * 24 * 60 * 60, // 90 days
          }),
        ],
      }),
    },
    ...defaultCache,
    // Cache uploaded images/files
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/uploads/"),
      handler: new StaleWhileRevalidate({
        cacheName: "uploads-cache-v2",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1000,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
          new RangeRequestsPlugin(),
        ],
      }),
    },
    // Cache external images and media (e.g., from Cloudinary)
    {
      matcher: ({ url }: { url: URL }) => {
        const isSameOrigin = url.origin === (self as unknown as { location: Location }).location.origin;
        return (
          !isSameOrigin &&
          (url.hostname.includes("cloudinary.com") ||
            url.hostname.includes("vercel-storage.com") ||
            url.hostname.includes("unpkg.com") ||
            url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|pdf|mp4|webm|pptx)$/i) !== null)
        );
      },
      handler: new StaleWhileRevalidate({
        cacheName: "external-media-cache-v2",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1000,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
          new RangeRequestsPlugin(),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
