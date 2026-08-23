/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
