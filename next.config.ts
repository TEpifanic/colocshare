import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  staticPageGenerationTimeout: 90,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
};

export default nextConfig;
