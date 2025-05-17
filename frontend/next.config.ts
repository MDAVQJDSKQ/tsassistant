import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    const backendApiUrl = process.env.BACKEND_API_URL;

    if (!backendApiUrl) {
      console.warn(
        "Warning: BACKEND_API_URL environment variable is not set. " +
        "Rewrites for /api/* will not be configured. " +
        "Ensure it is set in your environment (e.g., .env.local for development)."
      );
      return []; // No rewrites if the backend URL isn't set
    }

    return [
      {
        // This will match any request starting with /api/
        // e.g., /api/chat, /api/conversations/config, /api/conversations/new
        source: '/api/:path*',
        // The destination will be the backend server's URL followed by the matched path
        destination: `${backendApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
