import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["pino", "pino-pretty", "next-logger"],
  images: {
    // Add specific hostnames here when using external image sources.
    // Do NOT use hostname: "*" — it enables SSRF and image proxy abuse.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:locale/inventory/products/stock-monitoring",
        destination: "/:locale/inventory/products/reports/stock-monitoring",
        permanent: true,
      },
      {
        source: "/:locale/inventory/products/stock-monitoring/:productId",
        destination:
          "/:locale/inventory/products/reports/stock-monitoring/:productId",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
