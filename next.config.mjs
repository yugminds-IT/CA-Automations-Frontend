/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    // next dev's on-disk cache (on by default since 16.1) corrupts on Windows here: ".sst" files vanish,
    // Turbopack panics and grows to 6 GB. Dev only; production builds don't use it.
    turbopackFileSystemCacheForDev: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
