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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
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
