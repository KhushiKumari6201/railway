'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Menu,
  X,
  ArrowRight,
  TrainFront,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function LandingNavbar() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      router.push('/auth')
    }
  }

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs'
          : 'bg-white border-b border-slate-100'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* LEFT: Branding */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none cursor-pointer">
            <div className="relative h-9 w-6 shrink-0">
              <Image
                src="/images/emblem-india.png"
                alt="State Emblem of India"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="relative h-9 w-36 sm:w-44 shrink-0">
              <Image
                src="/images/rail-sanket-logo.png"
                alt="Rail Sanket"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="hidden xl:flex flex-col border-l border-slate-200 pl-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Government of India
              </span>
              <span className="text-xs font-semibold text-slate-800">
                SER Kharagpur Division
              </span>
            </div>
          </Link>

          {/* CENTER: Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* RIGHT: Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              onClick={handleDashboardClick}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shadow-xs"
            >
              <LayoutDashboard className="size-4" />
              <span>Dashboard</span>
              <ArrowRight className="size-3.5 opacity-80" />
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDashboardClick}
              className="text-xs px-2.5 h-8 gap-1.5"
            >
              Dashboard
            </Button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-5 space-y-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100">
            <Button
              onClick={handleDashboardClick}
              className="w-full justify-center gap-2 bg-primary text-white font-semibold"
            >
              <LayoutDashboard className="size-4" />
              Open Dashboard
              <ArrowRight className="size-4" />
            </Button>
            <p className="mt-2 text-center text-xs text-slate-500">
              Prototype session &middot; Kharagpur Division SER
            </p>
          </div>
        </div>
      )}
    </header>
  )
}
