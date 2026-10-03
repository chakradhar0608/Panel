import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastProvider from './toast-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NCCamp Main',
  description: 'NCCamp platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-brand-bg text-brand-textPrimary`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
