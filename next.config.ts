import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb', // Установите нужный размер, например, 10 МБ
    },
  },
};

export default nextConfig;
