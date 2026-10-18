import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the Docker image (madhurya-vastra/Dockerfile).
  output: "standalone",
  // instrumentation.ts: fail fast at startup when required settings are missing.
  experimental: { instrumentationHook: true },
};

export default withPWA(nextConfig);
