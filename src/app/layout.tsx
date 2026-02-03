import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QuizApp - Kahoot Lite',
  description: 'A real-time, mobile-first quiz application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
        {children}
      </body>
    </html>
  )
}