import '~/styles/globals.css'

import { type Metadata } from 'next'
import { Geist } from 'next/font/google'

import { Header } from '~/components/header'
import { Toaster } from '~/components/ui/toast'
import { TRPCReactProvider } from '~/trpc/react'

export const metadata: Metadata = {
  title: 'Wayv Clipping Marketplace',
  description: 'Creator marketplace for short-form clipping campaigns',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${geist.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <TRPCReactProvider>
          <Header />
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  )
}
