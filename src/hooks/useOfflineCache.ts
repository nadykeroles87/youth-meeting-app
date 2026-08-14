"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CACHE_PREFIX = "offline_cache_";

interface UseOfflineCacheOptions<T> {
  /** Unique key for this cache entry */
  cacheKey: string;
  /** Function that fetches data from the server */
  fetchFn: () => Promise<T>;
  /** Whether to start fetching immediately (default: true) */
  enabled?: boolean;
}

interface UseOfflineCacheResult<T> {
  /** The cached/fetched data */
  data: T | null;
  /** True while the initial load is happening (no cached data yet) */
  loading: boolean;
  /** True if we're showing cached data and haven't successfully fetched fresh data yet */
  isStale: boolean;
  /** True if the browser is offline */
  isOffline: boolean;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Update data locally (useful after mutations) */
  setData: (data: T | null) => void;
}

/**
 * Hook that implements offline-first caching strategy:
 * 1. Load cached data from localStorage immediately (instant render)
 * 2. Attempt to fetch fresh data from server in background
 * 3. If fetch succeeds: update state + cache
 * 4. If fetch fails (offline): keep showing cached data
 * 5. When connection is restored: auto-refresh
 */
export function useOfflineCache<T>({
  cacheKey,
  fetchFn,
  enabled = true,
}: UseOfflineCacheOptions<T>): UseOfflineCacheResult<T> {
  const fullKey = CACHE_PREFIX + cacheKey;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  // Load cached data on mount
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      const cached = localStorage.getItem(fullKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed.data);
        setIsStale(true); // cached data is always stale initially
        setLoading(false); // we have data to show
      }
    } catch (e) {
      console.warn("[OfflineCache] Failed to load cache for", cacheKey, e);
    }
  }, [fullKey, cacheKey, enabled]);

  // Save to cache helper
  const saveToCache = useCallback(
    (newData: T) => {
      try {
        localStorage.setItem(
          fullKey,
          JSON.stringify({
            data: newData,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.warn("[OfflineCache] Failed to save cache for", cacheKey, e);
      }
    },
    [fullKey, cacheKey]
  );

  // Fetch fresh data
  const refresh = useCallback(async () => {
    if (!enabled) return;

    try {
      const freshData = await fetchFnRef.current();
      setData(freshData);
      setIsStale(false);
      setIsOffline(false);
      saveToCache(freshData);
    } catch (error) {
      // Fetch failed - we're probably offline
      console.warn("[OfflineCache] Fetch failed for", cacheKey, "- using cached data");
      setIsOffline(!navigator.onLine);
    } finally {
      setLoading(false);
    }
  }, [enabled, cacheKey, saveToCache]);

  // Initial fetch on mount
  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-refresh when connection is restored
      refresh();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh]);

  return {
    data,
    loading: loading && data === null, // only show loading if we have NO data at all
    isStale,
    isOffline,
    refresh,
    setData,
  };
}
