"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandaloneMode = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone;
      
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS doesn't fire beforeinstallprompt, so we always show the banner if not installed
      // Let's add a small delay so it doesn't pop up immediately on first split second
      setTimeout(() => setShowInstall(true), 2000);
    }

    // Android/Chrome install event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstall(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert("لتثبيت التطبيق على الآيفون 🍎:\n\n1. اضغط على زر المشاركة (Share) في أسفل المتصفح.\n2. اختر 'إضافة للشاشة الرئيسية' (Add to Home Screen).");
    }
  };

  if (!showInstall || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80 bg-white border border-amber-200 shadow-2xl shadow-amber-900/10 rounded-2xl p-4 z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-500">
      <button 
        onClick={() => setShowInstall(false)}
        className="absolute top-3 left-3 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 mt-1">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
          <Download size={22} />
        </div>
        <div className="flex-1 pl-4">
          <h4 className="font-bold text-sm text-gray-900">تطبيق اجتماع الشباب</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            ثبّت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت!
          </p>
          <button
            onClick={handleInstallClick}
            className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-600/20 active:scale-95"
          >
            تثبيت التطبيق الآن
          </button>
        </div>
      </div>
    </div>
  );
}
