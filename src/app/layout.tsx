import '~/styles/globals.css'

import { type Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

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
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NextThemesProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          storageKey="wayv-theme"
        >
          <TRPCReactProvider>
            <Header />
            {children}
            <Toaster />
          </TRPCReactProvider>
        </NextThemesProvider>
      </body>
    </html>
  )
}

