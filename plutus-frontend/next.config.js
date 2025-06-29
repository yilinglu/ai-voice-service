/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Temporarily disable React Strict Mode to prevent double-mounting authorization issues
  reactStrictMode: false,
  
  // Configure headers for CORS when communicating with backend
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.BACKEND_URL || 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },

  // Configure rewrites to proxy API calls to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
  
  // Configure Sass for Carbon Design System
  sassOptions: {
    includePaths: ['node_modules'],
  },
  
  // Environment variables for frontend
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID,
  },

  // Webpack optimization for Carbon components
  webpack: (config) => {
    // Optimize bundle size for Carbon components
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        carbon: {
          test: /[\\/]node_modules[\\/]@carbon[\\/]/,
          name: 'carbon',
          chunks: 'all',
        },
      },
    };
    return config;
  },
};

module.exports = nextConfig; 