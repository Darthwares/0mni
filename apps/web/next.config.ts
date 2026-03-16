import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@omni/ui'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion/react', '@base-ui/react'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent module concatenation from creating TDZ errors with large barrel exports
      // (e.g. SpacetimeDB generated bindings, motion/react)
      config.optimization.concatenateModules = false
    }
    return config
  },
}

export default nextConfig
