/** @type {import('next').NextConfig} */
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
  experimental: {
    serverComponentsExternalPackages: [
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/filesystem',
      '@capacitor/push-notifications',
      '@capacitor/screen-orientation',
      '@capgo/capacitor-native-biometric',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        '@capacitor/core',
        '@capacitor/app',
        '@capacitor/filesystem',
        '@capacitor/push-notifications',
        '@capacitor/screen-orientation',
        '@capgo/capacitor-native-biometric'
      );
    }
    return config;
  },
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
        source: '/media/:path*',
        destination: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/:path*',
        permanent: false,
      },
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
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
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

module.exports = nextConfig;
