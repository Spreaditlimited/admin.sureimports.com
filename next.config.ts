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
    reactStrictMode: true,
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
