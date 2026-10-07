import { version } from "./package.json";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  env: {
    version,
  },
  // Cloudflare build only (NEXT_OUTPUT=export): static export served by
  // Workers Assets. The default Node build (`bun run build`) is unchanged.
  ...(process.env.NEXT_OUTPUT === "export"
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {}),
};

const withMDX = createMDX();

export default withMDX(nextConfig);
