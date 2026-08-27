"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * IndexedDB-based file cache for offline support.
 * Stores large files (PDF, PPTX, DOCX, etc.) in IndexedDB
 * so they can be opened without internet after the first load.
 */

const DB_NAME = "youth_meeting_file_cache";
const DB_VERSION = 1;
const STORE_NAME = "files";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedFile(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function cacheFile(key: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("[FileCache] Failed to cache file:", e);
  }
}

export async function isFileCached(key: string): Promise<boolean> {
  const data = await getCachedFile(key);
  return data !== null;
}

interface UseFileCacheResult {
  /** The file data as ArrayBuffer, or null if not loaded yet */
  data: ArrayBuffer | null;
  /** Blob URL for the file (for viewers that need a URL) */
  blobUrl: string | null;
  /** True while loading */
  loading: boolean;
  /** Error message if failed */
  error: string | null;
  /** True if the file was loaded from local cache */
  fromCache: boolean;
  /** True if the file is available offline */
  isOfflineReady: boolean;
}

/**
 * Hook to fetch a file with IndexedDB caching.
 * First time: fetches from network, stores in IndexedDB.
 * Subsequent times: loads from IndexedDB (instant, offline-ready).
 * If network fails and no cache: shows error.
 */
export function useFileCache(fileUrl: string): UseFileCacheResult {
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!fileUrl) {
      setLoading(false);
      setError("لا يوجد رابط للملف");
      return;
    }

    let isMounted = true;

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      setFromCache(false);

      const cacheKey = fileUrl;

      // 1. Try loading from IndexedDB cache first
      try {
        const cached = await getCachedFile(cacheKey);
        if (cached && isMounted) {
          setData(cached);
          setFromCache(true);
          setIsOfflineReady(true);
          const url = URL.createObjectURL(new Blob([cached]));
          cleanup();
          blobUrlRef.current = url;
          setBlobUrl(url);
          setLoading(false);

          // Try to refresh from network in background (silent update)
          try {
            const response = await fetch(fileUrl);
            if (response.ok && isMounted) {
              const freshData = await response.arrayBuffer();
              await cacheFile(cacheKey, freshData);
              // Don't update state - user is already viewing the cached version
            }
          } catch {
            // Silently ignore background refresh failure
          }
          return;
        }
      } catch {
        // Cache read failed, continue to network
      }

      // 2. Fetch from network
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`فشل تحميل الملف (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        
        if (isMounted) {
          setData(arrayBuffer);
          const url = URL.createObjectURL(new Blob([arrayBuffer]));
          cleanup();
          blobUrlRef.current = url;
          setBlobUrl(url);
          setLoading(false);

          // Cache in IndexedDB for offline use
          await cacheFile(cacheKey, arrayBuffer);
          if (isMounted) setIsOfflineReady(true);
        }
      } catch (err: any) {
        console.error("[FileCache] Load error:", err);
        if (isMounted) {
          setError(`فشل تحميل الملف: ${err.message || "خطأ غير معروف"}`);
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [fileUrl, cleanup]);

  return { data, blobUrl, loading, error, fromCache, isOfflineReady };
}
