/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

// ── Development variables ──────────────────────────────────────────────────
const devEnv = {
  PORT: '3000',

  // Database
  DATABASE_URL:
    'mysql://root:YOUR_LOCAL_PASSWORD@127.0.0.1:3306/nccamp_dev',
  DB_AUTO_SYNC: 'true',

  // Auth
  NEXTAUTH_SECRET:
    'minimum-32-char-secret-key-here',

  NEXTAUTH_URL:
    'http://localhost:3000',

  ADMIN_JWT_SECRET:
    'different-secret-for-admin-panel',

  ADMIN_EMAIL:
    'nchakradharreddy0@gmail.com',

  ADMIN_PASSWORD_HASH:
    process.env.ADMIN_PASSWORD_HASH,

  // App URLs
  NEXT_PUBLIC_MAIN_URL:
    'http://localhost:3000',

  NEXT_PUBLIC_BASE_URL:
    'http://localhost:3000',

  // Telegram
  TELEGRAM_BOT_TOKEN:
    process.env.TELEGRAM_BOT_TOKEN,

  TELEGRAM_ADMIN_CHAT_ID:
    process.env.TELEGRAM_ADMIN_CHAT_ID,

  // Email
  GMAIL_USER:
    process.env.GMAIL_USER,

  GMAIL_APP_PASSWORD:
    process.env.GMAIL_APP_PASSWORD,
}

// ── Production variables ───────────────────────────────────────────────────
const prodEnv = {
  PORT: '3000',

  // Database
  // Add DATABASE_URL in Vercel Environment Variables
  DATABASE_URL:
    process.env.DATABASE_URL,

  DB_AUTO_SYNC:
    'false',

  // Auth
  NEXTAUTH_SECRET:
    process.env.NEXTAUTH_SECRET,

  NEXTAUTH_URL:
    process.env.NEXTAUTH_URL,

  ADMIN_JWT_SECRET:
    process.env.ADMIN_JWT_SECRET,

  ADMIN_EMAIL:
    process.env.ADMIN_EMAIL,

  ADMIN_PASSWORD_HASH:
    process.env.ADMIN_PASSWORD_HASH,

  // App URLs
  NEXT_PUBLIC_MAIN_URL:
    process.env.NEXT_PUBLIC_MAIN_URL,

  NEXT_PUBLIC_BASE_URL:
    process.env.NEXT_PUBLIC_BASE_URL,

  // Telegram
  TELEGRAM_BOT_TOKEN:
    process.env.TELEGRAM_BOT_TOKEN,

  TELEGRAM_ADMIN_CHAT_ID:
    process.env.TELEGRAM_ADMIN_CHAT_ID,

  // Email
  GMAIL_USER:
    process.env.GMAIL_USER,

  GMAIL_APP_PASSWORD:
    process.env.GMAIL_APP_PASSWORD,
}

const nextConfig = {
  reactStrictMode: true,

  optimizeFonts: false,

  // IMPORTANT:
  // Keep Sequelize external.
  // DO NOT externalize mysql2.
  //
  // This allows Next.js/Vercel to bundle mysql2
  // instead of Sequelize trying to load it from
  // the external runtime.
  experimental: {
    serverComponentsExternalPackages: ['sequelize'],
  },

  webpack: (config) => {
    config.module.exprContextCritical = false

    return config
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Automatically select development or production variables
  env: isProd ? prodEnv : devEnv,
}

export default nextConfig
