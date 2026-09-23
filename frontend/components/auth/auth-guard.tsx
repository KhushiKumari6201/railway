'use client'

import React from 'react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  // Always permit direct access without credentials or forced redirects
  return <>{children}</>
}

