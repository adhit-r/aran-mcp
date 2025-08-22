/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  typescript: {
    // Enable TypeScript type checking during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Run ESLint during builds
    ignoreDuringBuilds: false,
  },
  // Enable static exports for standalone deployment
  output: 'standalone',
  // Configure images if needed
  images: {
    domains: ['localhost'],
  },
  // Environment variables
  env: {
    APP_NAME: 'Aran MCP Sentinel',
    APP_DESCRIPTION: 'MCP Security Monitoring and Analysis',
  },
};

module.exports = nextConfig;
