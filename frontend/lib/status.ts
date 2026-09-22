import type {
  Criticality,
  Severity,
  TaskStatus,
  PlanTaskStatus,
} from '@/lib/types'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

// Soft (muted) badge classes per tone — themed via design tokens.
export const toneBadge: Record<Tone, string> = {
  success: 'bg-success-muted text-success border-success/30',
  warning: 'bg-warning-muted text-warning-foreground border-warning/40',
  danger: 'bg-danger-muted text-danger border-danger/30',
  info: 'bg-info-muted text-info border-info/30',
  neutral: 'bg-muted text-muted-foreground border-border',
}

export const toneDot: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
}

export const toneText: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning-foreground',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-muted-foreground',
}

export function criticalityTone(c: Criticality): Tone {
  switch (c) {
    case 'Critical':
      return 'danger'
    case 'High':
      return 'warning'
    case 'Medium':
      return 'info'
    default:
      return 'neutral'
  }
}

export function taskStatusTone(s: TaskStatus): Tone {
  switch (s) {
    case 'Completed':
      return 'success'
    case 'Scheduled':
      return 'info'
    default:
      return 'neutral'
  }
}

export function severityTone(s: Severity): Tone {
  switch (s) {
    case 'Critical':
      return 'danger'
    case 'Warning':
      return 'warning'
    default:
      return 'info'
  }
}

export function planStatusTone(s: PlanTaskStatus): Tone {
  switch (s) {
    case 'Approved':
      return 'success'
    case 'Rejected':
      return 'danger'
    default:
      return 'info'
  }
}

export function priorityTone(p: number): Tone {
  if (p >= 85) return 'danger'
  if (p >= 70) return 'warning'
  if (p >= 50) return 'info'
  return 'neutral'
}

export function priorityLabel(p: number): string {
  if (p >= 85) return 'Critical'
  if (p >= 70) return 'High'
  if (p >= 50) return 'Medium'
  return 'Low'
}

export function confidenceTone(c: 'Low' | 'Medium' | 'High'): Tone {
  return c === 'High' ? 'success' : c === 'Medium' ? 'warning' : 'neutral'
}

export function impactTone(c: 'Low' | 'Medium' | 'High'): Tone {
  return c === 'Low' ? 'success' : c === 'Medium' ? 'warning' : 'danger'
}
