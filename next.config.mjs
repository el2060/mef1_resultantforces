const isScorm = process.env.BUILD_MODE === 'scorm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  ...(isScorm ? {
    output: 'export',
    assetPrefix: '.',
  } : {}),
}

export default nextConfig