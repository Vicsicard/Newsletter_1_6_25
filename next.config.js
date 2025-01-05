/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
    // Exclude test files from the build
    exclude: ['playwright.config.ts', 'tests/**/*']
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    config.resolve = {
      ...config.resolve,
      preferRelative: true
    };
    return config;
  },
}

module.exports = nextConfig
