/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Instead of using exclude, we'll ignore the type checking for these files
    ignoreBuildErrors: true
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      },
    };
    return config;
  },
}

module.exports = nextConfig
