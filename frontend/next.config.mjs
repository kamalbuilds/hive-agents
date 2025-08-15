/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // !! WARN: Production deployment - TypeScript errors should be fixed !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // !! WARN: Production deployment - ESLint warnings should be fixed !!
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
