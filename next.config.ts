import type { NextConfig } from "next";

process.env.NEXT_TELEMETRY_DISABLED = "1";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "*.airoapp.ai",
    "**.airoapp.ai",
    "83pwmz1x5e.preview.c24.airoapp.ai",
    "*.godaddy.com",
    "localhost",
    "127.0.0.1",
    "192.168.1.4",
    "192.168.*.*",
    "10.*.*.*",
    "100.*.*.*",
    "100.116.*.*",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        followSymlinks: false,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "/",
          "/sys/**",
          "/proc/**",
          "/dev/**",
          "/etc/**",
          "/root/**",
          "/var/**",
          "/data/**",
          "/usr/**",
          "/tmp/**",
        ],
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              "font-src 'self' https://fonts.gstatic.com;",
              "img-src 'self' data: blob: https:;",
              "media-src 'self' data: blob: https:;",
              "connect-src 'self' ws: wss: https:;",
              "frame-ancestors 'self' https://*.godaddy.com https://*.airoapp.ai;",
            ].join(" "),
          },
        ],
      },
    ];
  },
};


export default nextConfig;
