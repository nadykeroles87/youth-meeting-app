import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import InstallPWA from "@/components/InstallPWA";
import OfflineIndicator from "@/components/OfflineIndicator";
import BackgroundSyncer from "@/components/BackgroundSyncer";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منقوش على كفك - اجتماع الشباب",
  description: "تطبيق اجتماع شباب كنيسة العذراء - العاشر من رمضان",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "اجتماع الشباب",
  },
};

export const viewport = {
  themeColor: "#d97706",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className={`${cairo.className} bg-amber-50 text-stone-900 antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <OfflineIndicator />
        <InstallPWA />
        <BackgroundSyncer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
