/** @type {import('next').NextConfig} */
const isCapacitor = process.env.CAPACITOR === "1"

const nextConfig = {
  ...(isCapacitor
    ? {
        output: "export",
        trailingSlash: true,
        distDir: "out",
      }
    : {}),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
