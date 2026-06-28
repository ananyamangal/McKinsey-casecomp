/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Consume workspace packages as TypeScript source — no separate build step.
  transpilePackages: ["@halo/ui", "@halo/types", "@halo/utils"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
  eslint: {
    // Keep `next build` from failing the demo on lint nits; lint runs separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
