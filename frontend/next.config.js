/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://backend:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
  transpilePackages: [
    'lucide-react',
    'zustand',
    'dexie-react-hooks',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-slot',
    'dexie',
    'mermaid'
  ]
};

module.exports = nextConfig;
