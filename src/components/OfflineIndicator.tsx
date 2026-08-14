"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
      setVisible(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setShowReconnected(true);
        setVisible(true);
        // Hide the reconnected banner after 4 seconds
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(() => {
            setShowReconnected(false);
          }, 500); // wait for fade-out animation
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true);
      setWasOffline(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [wasOffline]);

  // Nothing to show
  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-in-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      {isOffline ? (
        /* ── Offline Banner ── */
        <div className="bg-gradient-to-r from-stone-800 via-stone-900 to-stone-800 text-white shadow-2xl">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
              <WifiOff size={16} className="text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-amber-200">
                أنت غير متصل بالإنترنت
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                يتم عرض آخر بيانات محفوظة • ستتحدث البيانات تلقائيًا عند الاتصال
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          </div>
        </div>
      ) : showReconnected ? (
        /* ── Reconnected Banner ── */
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-600 text-white shadow-2xl">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 border border-white/30 flex-shrink-0">
              <Wifi size={16} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">
                ✅ تم الاتصال بالإنترنت
              </p>
              <p className="text-xs text-emerald-100 mt-0.5 flex items-center justify-center gap-1">
                <RefreshCw size={11} className="animate-spin" />
                جاري تحديث البيانات...
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
