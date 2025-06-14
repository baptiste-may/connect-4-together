import {version} from "./package.json";
import type {NextConfig} from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
    env: {
        version
    }
};

const withMDX = createMDX();

export default withMDX(nextConfig);
