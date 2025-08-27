/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export', // REMOVED: Static export doesn't support dynamic routing
  trailingSlash: true,
  // distDir: 'out', // REMOVED: Not needed without static export
  images: {
    unoptimized: true
  },
  transpilePackages: ['leaflet'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://aidoc.onrender.com/api',
  },
};

module.exports = nextConfig; 