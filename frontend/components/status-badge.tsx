import { cn } from '@/lib/utils'
import { toneBadge, toneDot, type Tone } from '@/lib/status'

interface StatusBadgeProps {
  tone: Tone
  children: React.ReactNode
  dot?: boolean
  pulse?: boolean
  className?: string
}

export function StatusBadge({
  tone,
  children,
  dot = true,
  pulse = false,
  className,
}: StatusBadgeProps) {
  const isPulse = pulse || tone === 'danger'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        toneBadge[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-2 shrink-0 items-center justify-center">
          {isPulse && (
            <span
              className={cn(
                'absolute inline-flex size-full animate-ping rounded-full opacity-75',
                toneDot[tone],
              )}
            />
          )}
          <span className={cn('relative inline-flex size-1.5 rounded-full', toneDot[tone])} />
        </span>
      )}
      {children}
    </span>
  )
}
