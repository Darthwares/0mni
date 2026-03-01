import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@omni/ui'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
