import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

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
  runtimeCaching: [
    // Cache API routes with StaleWhileRevalidate strategy
    // This ensures instant loading from cache while offline, and background updates when online.
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
      handler: new StaleWhileRevalidate({
        cacheName: "api-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          }),
        ],
      }),
    },
    // Cache all HTML pages and RSC payloads with StaleWhileRevalidate for offline access
    {
      matcher: ({ request, url }: { request: Request; url: URL }) => {
        const isAppPage = [
          "/", "/library", "/meetings", "/members", 
          "/followup", "/attendance", "/prayers", 
          "/announcements", "/servants", "/agpeya"
        ].includes(url.pathname);
        
        return isAppPage || 
               request.mode === "navigate" || 
               request.headers.get("RSC") === "1" || 
               request.headers.get("Accept")?.includes("text/html");
      },
      handler: new StaleWhileRevalidate({
        cacheName: "pages-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    ...defaultCache,
    // Cache uploaded images/files
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/uploads/"),
      handler: new StaleWhileRevalidate({
        cacheName: "uploads-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // Cache external images (e.g., from Cloudinary)
    {
      matcher: ({ url }: { url: URL }) => {
        const isSameOrigin = url.origin === (self as unknown as { location: Location }).location.origin;
        return (
          !isSameOrigin &&
          (url.pathname.endsWith(".jpg") ||
            url.pathname.endsWith(".jpeg") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".webp") ||
            url.pathname.endsWith(".gif"))
        );
      },
      handler: new StaleWhileRevalidate({
        cacheName: "external-images-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
