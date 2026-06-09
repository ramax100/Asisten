import type { Metadata } from 'next'
import './globals.css'
import WelcomePopup from './WelcomePopup'
import LoadingCat from './LoadingCat'

export const metadata: Metadata = {
  title: 'Rich Bot - Telegram Bot Panel',
  description: 'Rich Bot - Multi-bot Telegram management panel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <LoadingCat />
        {children}
        <WelcomePopup />
      </body>
    </html>
  )
}
