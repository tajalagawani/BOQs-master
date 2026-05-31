import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Effectively unlimited (1 GB) for ProcureX document uploads.
      // The actual storage layer (Vercel Blob or local disk) and the
      // browser will impose their own caps long before this triggers.
      bodySizeLimit: "1000mb",
    },
  },
};

export default nextConfig;
