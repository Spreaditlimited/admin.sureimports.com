/** @type {import('next').NextConfig} */
const nextConfig = {
  // typescript: {
  //   // !! WARN !!
  //   // Dangerously allow production builds to successfully complete even if
  //   // your project has type errors.
  //   // !! WARN !!
  //   ignoreBuildErrors: true,
  // },
    reactStrictMode: true,
    swcMinify: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        serverActions: true,
      },

      images: {
        //domains: ['hebbkx1anhila5yf.public.blob.vercel-storage.com'],
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'pub-247616faa6844212baab97800caf56b6.r2.dev',
            port: '',
            pathname: '/**',
          },
        ],
      },
};

module.exports = nextConfig;
