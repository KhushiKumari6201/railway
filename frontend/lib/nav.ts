import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ListChecks,
  CalendarClock,
  Sparkles,
  TriangleAlert,
  CalendarRange,
  FileText,
  Settings,
  Network,
  SlidersHorizontal,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  section: 'Planning' | 'Intelligence'
  badge?: string
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Planning' },
  { label: 'Maintenance Queue', href: '/queue', icon: ListChecks, section: 'Planning' },
  { label: 'Block Planner', href: '/planner', icon: CalendarClock, section: 'Planning' },
  { label: 'Monthly Plan', href: '/monthly', icon: CalendarRange, section: 'Planning' },
  { label: 'Reports', href: '/reports', icon: FileText, section: 'Planning' },
  { label: 'Smart Recommendations', href: '/recommendations', icon: Sparkles, section: 'Intelligence', badge: '5' },
  { label: 'Conflicts', href: '/conflicts', icon: TriangleAlert, section: 'Intelligence', badge: '6' },
  { label: 'Network Intelligence', href: '/network-intelligence', icon: Network, section: 'Intelligence' },
  { label: 'What-If Simulation', href: '/what-if', icon: SlidersHorizontal, section: 'Intelligence' },
  { label: 'Settings', href: '/settings', icon: Settings, section: 'Planning' },
]

export const navSections: NavItem['section'][] = ['Planning', 'Intelligence']

export function activeNav(pathname: string): NavItem | undefined {
  return (
    navItems.find((i) => i.href !== '/dashboard' && pathname.startsWith(i.href)) ??
    navItems.find((i) => i.href === pathname)
  )
}
