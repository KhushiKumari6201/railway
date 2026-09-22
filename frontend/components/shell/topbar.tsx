'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth, defaultOfficers } from '@/lib/auth-context'
import {
  Menu,
  Bell,
  ChevronDown,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowLeftRight,
  LogOut,
  Shield,
  Home,
} from 'lucide-react'
import { activeNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

const divisions = [
  { id: 'KGP', name: 'Kharagpur Division', zone: 'South Eastern Railway', active: true },
  { id: 'HWH', name: 'Howrah Division', zone: 'Eastern Railway', active: false },
  { id: 'CKP', name: 'Chakradharpur Division', zone: 'South Eastern Railway', active: false },
  { id: 'ADRA', name: 'Adra Division', zone: 'South Eastern Railway', active: false },
]

const notificationsList = [
  { id: '1', title: 'ENG-221 flagged as exception', meta: 'No feasible window in corridor C01 · 2m ago', unread: true },
  { id: '2', title: 'Conflict CF-01 needs resolution', meta: 'Overlaps with Coromandel Exp · 14m ago', unread: true },
  { id: '3', title: 'Recommendation REC-102 generated', meta: 'Bridge bearing block on C03 · 1h ago', unread: false },
  { id: '4', title: 'Timetable feed synced', meta: 'All 5 corridors updated with latest paths · 2h ago', unread: false },
]

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname()
  const current = activeNav(pathname)
  const { user, login, logout } = useAuth()

  const handleSwitchOfficer = (officer: typeof defaultOfficers[0]) => {
    login(officer, pathname)
    toast.success(`Switched to Officer ${officer.name}`, {
      description: `${officer.cadre} · ${officer.department}`,
    })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 md:px-6 select-none">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>

        {/* State Emblem of India */}
        <div className="relative h-8 w-6 shrink-0 hidden sm:block">
          <Image
            src="/images/emblem-india.png"
            alt="State Emblem of India"
            fill
            className="object-contain"
          />
        </div>

        {/* Page Title & Division */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-sm font-bold text-slate-900">
              {current?.label ?? 'Operations & Block Planning'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-primary">
              <Building2 className="size-3 text-primary" />
              Kharagpur Division
            </span>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            South Eastern Railway · AI Automatic Block Planning
          </p>
        </div>
      </div>

      {/* Right Controls: Officer Info & Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Officer Name & Department Display */}
        <div className="hidden md:flex flex-col text-right leading-tight">
          <span className="text-xs font-bold text-slate-900">
            {user?.name || 'S. K. Mukherjee'}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {user?.department || 'Operating Control'}
          </span>
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2.5 py-1.5 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all outline-none cursor-pointer shadow-2xs">
            <Avatar className="size-6 ring-1 ring-primary/30 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {user?.initials || 'SM'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-slate-700 sm:inline hidden">
              Profile
            </span>
            <ChevronDown className="size-3 text-slate-400" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 p-2 rounded-xl shadow-lg border border-slate-200 bg-white">
            {/* Officer Details Card */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-9 ring-1 ring-slate-300 shrink-0">
                  <AvatarFallback className="bg-primary text-white text-xs font-bold">
                    {user?.initials || 'SM'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user?.name || 'S. K. Mukherjee'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate">
                    {user?.designation || 'Sr. Divisional Operations Manager'}
                  </div>
                  <div className="text-xs text-primary font-semibold truncate mt-0.5">
                    {user?.cadre || 'IRTS'} · {user?.department || 'Operating'}
                  </div>
                </div>
              </div>
            </div>

            {/* Switch Demo Officer Sub-list */}
            <div className="px-1 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Switch Demo Officer
            </div>
            <div className="space-y-0.5">
              {defaultOfficers.map((officer) => {
                const isActive = user?.id === officer.id
                return (
                  <button
                    key={officer.id}
                    onClick={() => handleSwitchOfficer(officer)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <div>
                      <div className="font-medium truncate">{officer.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {officer.cadre} · {officer.department.split(' ')[0]}
                      </div>
                    </div>
                    {isActive && <CheckCircle2 className="size-3.5 text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>

            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer w-full"
              >
                <Home className="size-3.5 text-slate-500" />
                <span>Return to Public Website</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={logout}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer w-full"
            >
              <LogOut className="size-3.5 text-red-600" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
