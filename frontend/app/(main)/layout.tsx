import { AppShell } from '@/components/shell/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
