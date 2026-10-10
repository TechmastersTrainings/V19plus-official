/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) =>
          url.pathname.endsWith('.m3u8') ||
          url.pathname.endsWith('.ts') ||
          url.hostname.includes('r2.dev'),
        handler: 'NetworkOnly',
      },
      ...require('@ducanh2912/next-pwa').runtimeCaching,
    ],
  },
});
const backendUrl =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://v19plus-official.onrender.com'
    : 'http://localhost:8000');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@v19plus/types', '@v19plus/utils'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/deletion',
        destination: '/delete-account',
        permanent: true,
      },
      {
        source: '/account/delete',
        destination: '/delete-account',
        permanent: true,
      },
      {
        source: '/data-deletion',
        destination: '/delete-account',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
