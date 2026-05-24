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
    // swcMinify is removed in Next.js 15 (SWC is now the default minifier)
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Server Actions are stable in Next.js 15, no experimental flag needed
    // experimental: {
    //     serverActions: true,
    // },


      images: {
        //domains: ['hebbkx1anhila5yf.public.blob.vercel-storage.com'],
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'res.cloudinary.com',
            port: '',
            pathname: '/**',
          },
        ],
      },
};

module.exports = nextConfig;
