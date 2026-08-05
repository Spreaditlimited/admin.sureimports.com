/** @type {import('next').NextConfig} */
const nextConfig = {
    // PDFKit loads its built-in AFM font metrics from disk at runtime. Keeping
    // it external prevents Next from relocating the package into vendor-chunks.
    serverExternalPackages: ['pdfkit'],
    // Include the dynamically-read font metrics in Vercel's serverless output.
    outputFileTracingIncludes: {
      '/api/intelligence/reports/[pidReport]/generate': [
        './node_modules/pdfkit/js/data/*.afm',
      ],
    },
    async redirects() {
      return [
        {
          source: '/dashboard/corporate-gifts',
          destination: '/dashboard/corporate-sourcing',
          permanent: true,
        },
      ];
    },
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
