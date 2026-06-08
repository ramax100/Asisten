/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
// pro deploy trigger

// force redeploy 1780876126
// redeploy: add /spamdebug command + anti-spam send-time window
// redeploy: anti-spam sliding window (fix oscillating counter)
// redeploy: optimize anti-spam latency (fewer DB ops + parallel mute)
