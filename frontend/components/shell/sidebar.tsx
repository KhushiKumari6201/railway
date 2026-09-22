'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  TrainFront,
  ChevronsLeft,
  LogOut,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems, navSections } from '@/lib/nav'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none">
        {/* Branding Header */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-sidebar-border px-4 transition-all',
            collapsed ? 'justify-center px-0' : 'gap-3',
          )}
        >
          {collapsed ? (
            <div
              title="Railway Block Planner"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs"
            >
              <TrainFront className="size-5" />
            </div>
          ) : (
            <div className="flex flex-col justify-center min-w-0 py-0.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 shadow-xs">
                  <TrainFront className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs font-black tracking-tight text-slate-900 leading-tight uppercase">
                    RAILWAY BLOCK PLANNER
                  </h1>
                  <span className="text-xs font-bold text-slate-500 tracking-wide uppercase block">
                    Kharagpur Division
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => {
            const items = navItems.filter((i) => i.section === section)
            return (
              <div key={section}>
                {!collapsed && (
                  <p className="mb-2 px-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                    {section}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.href)
                    const link = (
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                          collapsed && 'justify-center px-0 size-10 mx-auto',
                          active
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                      >
                        {/* Active left accent bar */}
                        {active && !collapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary" />
                        )}
                        <item.icon
                          className={cn(
                            'size-4 shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                              active
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right" className="flex items-center gap-2 font-medium">
                              {item.label}
                              {item.badge && (
                                <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                                  {item.badge}
                                </span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Public Home Page Button */}
        <div className="px-3 pb-2 pt-1">
          <Link
            href="/"
            onClick={onNavigate}
            title="Return to Public Home Page"
            className={cn(
              'flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-primary hover:border-blue-200 transition-all shadow-2xs group',
              collapsed && 'justify-center px-0 size-9 mx-auto'
            )}
          >
            <Home className="size-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
            {!collapsed && <span>Public Home Page</span>}
          </Link>
        </div>

        {/* Bottom Officer info & Logout (Section 10) */}
        <div className="border-t border-sidebar-border p-3 bg-slate-50/70">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Officer
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="size-8 ring-1 ring-border shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {user?.initials || 'SM'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user?.name || 'S. K. Mukherjee'}
                  </div>
                  <div className="text-xs font-medium text-slate-500 truncate">
                    {user?.department || 'Operating Control'}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full h-8 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5 cursor-pointer mt-1"
              >
                <LogOut className="size-3.5" />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <button
              onClick={logout}
              title="Logout"
              className="flex size-8 mx-auto items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>

        {/* Bottom collapse control */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'hidden w-full text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex',
              collapsed ? 'justify-center p-0 size-8' : 'justify-start gap-2.5 px-2.5 h-7',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft
              className={cn(
                'size-3.5 transition-transform duration-300',
                collapsed && 'rotate-180',
              )}
            />
            {!collapsed && <span className="text-xs font-medium">Collapse</span>}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
