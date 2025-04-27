/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // This is necessary for using web3 libraries with webpack 5
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      zlib: require.resolve("browserify-zlib"),
      os: require.resolve("os-browserify"),
      path: require.resolve("path-browserify"),
      encoding: false, // Add this to handle @metamask/sdk encoding issues
    };

    return config;
  },
  // Updated experimental features - appDir is now the default in newer Next.js
  experimental: {
    serverComponentsExternalPackages: ["ethers"],
  },
};

module.exports = nextConfig;
