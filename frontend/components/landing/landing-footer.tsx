'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { TrainFront, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export function LandingFooter() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      router.push('/auth')
    }
  }

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          
          {/* Brand & Mission Statement */}
          <div className="space-y-4 md:col-span-6">
            <div className="relative h-9 w-48">
              <Image
                src="/images/rail-sanket-logo.png"
                alt="Rail Sanket"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              AI-assisted maintenance planning for smarter railway operations.
              Coordinating Engineering, S&amp;T, and Traction demands into optimized block windows.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>South Eastern Railway &middot; Kharagpur Division Operational Portal</span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#home" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="text-slate-600 hover:text-slate-900 transition-colors">
                  About Our Solution
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Key Features
                </a>
              </li>
              <li>
                <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Contact Inquiries
                </a>
              </li>
            </ul>
          </div>

          {/* Prototype Platform Access */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Platform Access
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Divisional planning officers and jury members can inspect live scenario tools:
            </p>
            <div className="pt-1">
              <button
                onClick={handleDashboardClick}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                <span>Access Dashboard</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Pre-configured demo officer credentials available at login.
            </p>
          </div>

        </div>

        {/* Bottom Legal / Disclaimer Strip */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Rail Sanket &middot; South Eastern Railway Operations
          </div>
          <div className="text-xs text-slate-400 text-center sm:text-right max-w-lg">
            Decision-support system engineered for Indian Railways corridor block planning.
            Integrated Division Operations &amp; Engineering Portal.
          </div>
        </div>

      </div>
    </footer>
  )
}
