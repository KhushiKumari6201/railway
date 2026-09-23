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
  Share2,
  Radio,
  Cpu,
  Compass,
  ShieldAlert,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  section: 'Command' | 'Planning' | 'Intelligence'
  badge?: string
}

export const navItems: NavItem[] = [
  { label: 'Command Center', href: '/command-center', icon: Compass, section: 'Command', badge: 'LIVE' },
  { label: 'Alert Center', href: '/alerts', icon: ShieldAlert, section: 'Command', badge: 'ACTIVE' },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Planning' },
  { label: 'Maintenance Queue', href: '/queue', icon: ListChecks, section: 'Planning' },
  { label: 'Block Planner', href: '/planner', icon: CalendarClock, section: 'Planning' },
  { label: 'Monthly Plan', href: '/monthly', icon: CalendarRange, section: 'Planning' },
  { label: 'Management Reports', href: '/reports', icon: FileText, section: 'Planning', badge: 'LIVE' },
  { label: 'Smart Recommendations', href: '/recommendations', icon: Sparkles, section: 'Intelligence', badge: '5' },
  { label: 'Conflicts', href: '/conflicts', icon: TriangleAlert, section: 'Intelligence', badge: '6' },
  { label: 'Network Intelligence', href: '/network-intelligence', icon: Network, section: 'Intelligence' },
  { label: 'What-If Simulation', href: '/what-if', icon: SlidersHorizontal, section: 'Intelligence' },
  { label: 'Network Coordination', href: '/network-coordination', icon: Share2, section: 'Intelligence' },
  { label: 'Disruptions & Rescheduling', href: '/disruptions', icon: Radio, section: 'Intelligence', badge: 'LIVE' },
  { label: 'Constraint Optimization', href: '/optimization', icon: Cpu, section: 'Intelligence', badge: 'NEW' },
  { label: 'Governance & Audit', href: '/settings', icon: Settings, section: 'Planning' },
]

export const navSections: NavItem['section'][] = ['Command', 'Planning', 'Intelligence']

export function activeNav(pathname: string): NavItem | undefined {
  return (
    navItems.find((i) => i.href !== '/dashboard' && i.href !== '/command-center' && pathname.startsWith(i.href)) ??
    navItems.find((i) => i.href === pathname)
  )
}
