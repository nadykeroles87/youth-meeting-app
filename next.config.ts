import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import CopyPlugin from "copy-webpack-plugin";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision: "1" }],
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  turbopack: {
    resolveAlias: {
      canvas: { browser: "" },
    },
  },
  webpack: (config, { isServer }) => {
    // Required for react-pdf to work in Next.js (webpack fallback)
    config.resolve.alias.canvas = false;

    // Copy PDF.js worker to public/ for offline support
    // This ensures the PDF viewer works without internet
    if (!isServer) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
              to: "../public/pdf.worker.min.mjs",
            },
          ],
        })
      );
    }
    
    return config;
  },
};

export default withSerwist(nextConfig);
