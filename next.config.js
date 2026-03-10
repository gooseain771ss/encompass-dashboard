/** @type {import('next').NextConfig} */
const nextConfig = {

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'flyencompass.com', '*.flyencompass.com'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
