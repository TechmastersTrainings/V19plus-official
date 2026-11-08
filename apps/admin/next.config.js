/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || 'https://v19plus-official.onrender.com';

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
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.supabase.co' },
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
    ];
  },
};

module.exports = nextConfig;
