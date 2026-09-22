'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { TrainFront } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true)
      router.replace('/auth')
    }
  }, [isLoading, isAuthenticated, hasRedirected, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background select-none">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <TrainFront className="size-7" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">RailSanket</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              South Eastern Railway · Kharagpur Division
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Checking session…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
