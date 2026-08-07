import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Files are uploaded as base64 through a Server Action and stored
      // in Postgres until real object storage is wired up (see
      // FileAttachment in schema.prisma) — raised from the 1MB default
      // to fit typical contracts/PDFs plus base64/multipart overhead.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
