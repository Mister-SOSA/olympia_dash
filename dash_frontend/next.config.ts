import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Service worker must be served from root with correct headers
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        // Manifest should not be cached aggressively
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Static assets can be cached longer
        source: '/:path*.(png|jpg|jpeg|gif|svg|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Font files
        source: '/:path*.(woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async rewrites() {
    // Use environment variable for Docker/production, fallback to localhost for local dev
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
    console.log('[Next.js Config] API Base URL for rewrites:', apiBaseUrl);

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${apiBaseUrl}/auth/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiBaseUrl}/socket.io/:path*`,
      },
      {
        source: '/admin/:path((?!_next).*)',
        destination: '/admin/page',
      },
    ];
  },
  // Increase timeout for API routes in production
  serverRuntimeConfig: {
    // Will only be available on the server side
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001',
  },
};

export default nextConfig;
