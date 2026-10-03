/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

// ── Development variables ──────────────────────────────────────────────────
const devEnv = {
  PORT: '3000',

  // Database
  DATABASE_URL: 'mysql://root:charan%2330@127.0.0.1:3306/nccamp_dev',
  DB_AUTO_SYNC: 'true',

  // Auth
  NEXTAUTH_SECRET: 'minimum-32-char-secret-key-here',
  NEXTAUTH_URL: 'http://localhost:3000',
  ADMIN_JWT_SECRET: 'different-secret-for-admin-panel',
  ADMIN_EMAIL: 'nchakradharreddy0@gmail.com',
  ADMIN_PASSWORD_HASH: '$2a$10$cE1Lg4ROwJKwkm1EQAa.zOjXqQVyLv1sbur74bszkEqS9xMRDWOMy',

  // App URLs
  NEXT_PUBLIC_MAIN_URL: 'http://localhost:3000',
  NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',

  // Telegram
  TELEGRAM_BOT_TOKEN: '7570376985:AAH5Us-TZabBEmplb_rdDEPflk1yFqoWKyE',
  TELEGRAM_ADMIN_CHAT_ID: '667801339',

  // Email
  GMAIL_USER: 'support@nccamp.in',
  GMAIL_APP_PASSWORD: 'gmail-app-password',
}

// ── Production variables ───────────────────────────────────────────────────
const prodEnv = {
  PORT: '3000',

  // Database
  DATABASE_URL: 'mysql://bsptsyni_charan:charan%2330@localhost:3306/bsptsyni_ncpartners',
  DB_AUTO_SYNC: 'true',

  // Auth
  NEXTAUTH_SECRET: 'minimum-32-char-secret-key-here',
  NEXTAUTH_URL: 'https://partnersnccamps.xyz',
  ADMIN_JWT_SECRET: 'different-secret-for-admin-panel',
  ADMIN_EMAIL: 'nchakradharreddy0@gmail.com',
  ADMIN_PASSWORD_HASH: '$2a$10$cE1Lg4ROwJKwkm1EQAa.zOjXqQVyLv1sbur74bszkEqS9xMRDWOMy',

  // App URLs
  NEXT_PUBLIC_MAIN_URL: 'https://partnersnccamps.xyz',
  NEXT_PUBLIC_BASE_URL: 'https://partnersnccamps.xyz',

  // Telegram
  TELEGRAM_BOT_TOKEN: '7570376985:AAH5Us-TZabBEmplb_rdDEPflk1yFqoWKyE',
  TELEGRAM_ADMIN_CHAT_ID: '667801339',

  // Email
  GMAIL_USER: 'support@nccamp.in',
  GMAIL_APP_PASSWORD: ' your actual gmail app password',
}

const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false,
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'mysql2'],
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

  // Automatically picks dev or prod vars based on NODE_ENV
  env: isProd ? prodEnv : devEnv,
}

export default nextConfig
