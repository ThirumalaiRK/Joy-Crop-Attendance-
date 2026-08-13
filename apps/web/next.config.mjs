/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hrms/biometrics-sdk'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/hr',
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/hr/:path*',
        destination: '/admin',
        permanent: false,
      },
    ];
  },
}

export default nextConfig
