import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth-context'
import { AppStateProvider } from '@/lib/app-state-context'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'RailSanket — Railway Maintenance Block Planning',
  description:
    'Coordinated maintenance block planning across Engineering, S&T and Traction departments. Maximize asset availability while protecting train operations on Indian Railways.',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <AuthProvider>
          <AppStateProvider>
            {children}
            <Toaster richColors position="top-right" />
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </AppStateProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
