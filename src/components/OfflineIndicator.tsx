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
      className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out pointer-events-none w-[90%] max-w-sm ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-10 opacity-0"
      }`}
    >
      {isOffline ? (
        /* ── Offline Banner ── */
        <div className="bg-stone-900/95 backdrop-blur-md text-white shadow-2xl rounded-2xl border border-stone-700/50 pointer-events-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
                <WifiOff size={16} className="text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-amber-200 leading-tight">
                  لا يوجد اتصال
                </span>
                <span className="text-[10px] text-stone-400 leading-tight mt-0.5">
                  وضع الأوفلاين نشط
                </span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          </div>
        </div>
      ) : showReconnected ? (
        /* ── Reconnected Banner ── */
        <div className="bg-emerald-600/95 backdrop-blur-md text-white shadow-2xl rounded-2xl border border-emerald-500/50 pointer-events-auto">
          <div className="px-4 py-3 flex items-center gap-3">
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
