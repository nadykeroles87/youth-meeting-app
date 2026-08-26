import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

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
  webpack: (config) => {
    // Required for react-pdf to work in Next.js (webpack fallback)
    config.resolve.alias.canvas = false;
    
    // Force single instance of i18next/react-i18next across all packages
    // This fixes pptx-react-viewer crash: "Cannot read properties of undefined (reading 'resources')"
    // Without this, pptx-react-viewer uses its own bundled copy which doesn't see our i18n.init()
    const path = require("path");
    config.resolve.alias["i18next"] = path.resolve(__dirname, "node_modules/i18next");
    config.resolve.alias["react-i18next"] = path.resolve(__dirname, "node_modules/react-i18next");
    
    return config;
  },
};

export default withSerwist(nextConfig);
