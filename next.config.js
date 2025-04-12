/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        has: [
          {
            type: 'cookie',
            key: 'supabase-auth-token',
          },
        ],
        permanent: false,
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.devtool = 'eval-source-map';
    }
    return config;
  },
};

module.exports = nextConfig;
