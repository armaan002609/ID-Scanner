/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow local network IP for testing HMR
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
  experimental: {
    // Note: In Next.js 15+, allowedDevOrigins might be under experimental or top-level depending on the exact minor version.
  }
};

// In Next.js 16 (Turbopack), allowing dev origins is done differently depending on version.
// Usually adding it top-level is safe.
// @ts-ignore
nextConfig.allowedDevOrigins = ['10.200.4.7', '10.240.214.139'];

export default nextConfig;
