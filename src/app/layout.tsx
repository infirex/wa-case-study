import '~/styles/globals.css'

import { type Metadata } from 'next'
import { Geist } from 'next/font/google'

import { Header } from '~/components/header'
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
    <html lang="en" className={`${geist.variable}`}>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <TRPCReactProvider>
          <Header />
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  )
}
