import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Telegram Bot Panel',
  description: 'Multi-bot Telegram management panel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>{children}</body>
    </html>
  )
}
