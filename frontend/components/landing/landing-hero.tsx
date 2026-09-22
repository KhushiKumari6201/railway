'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  CalendarClock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function LandingHero() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const handleDashboardClick = () => {
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      router.push('/auth')
    }
  }

  return (
    <section id="home" className="relative overflow-hidden min-h-[560px] lg:min-h-[620px] flex items-center pt-10 pb-14 sm:pt-14 sm:pb-18 lg:pt-16 lg:pb-20">
      
      {/* FULL BACKGROUND IMAGE: Mountain viaduct railway bridge with locomotive */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/nilgiri-train-bridge.jpg"
          alt="Indian Railways train crossing mountain viaduct bridge"
          fill
          className="object-cover object-center lg:object-[center_30%]"
          priority
        />
        
        {/* REFINED BALANCED GRADIENTS:
            - Rich slate-black on the left for maximum contrast & crisp readability
            - Smooth feathering so the locomotive and scenery are bright and clear on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent sm:to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30" />
      </div>

      {/* FOREGROUND CONTENT: Clean Left-Aligned with Elegant Proportion */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-xl lg:max-w-2xl space-y-5">
          
          {/* Refined Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/70 px-3.5 py-1 text-xs font-semibold text-sky-200 shadow-sm backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="tracking-wide">AI-Assisted Railway Maintenance Planning</span>
          </div>

          {/* Main Heading: Scaled down to sophisticated, balanced size */}
          <h1 className="text-2xl sm:text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-extrabold tracking-tight text-white leading-[1.18] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            AI-Powered Automatic Block Planning{' '}
            <span className="block mt-1 bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent font-extrabold">
              for Smarter Railway Maintenance
            </span>
          </h1>

          {/* Supporting Text: Smaller, elegant, highly readable */}
          <p className="text-xs sm:text-sm md:text-[15px] text-slate-200/90 font-normal leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)] max-w-lg">
            A decision-support platform that combines maintenance requirements,
            available railway block windows and operational constraints to create
            efficient weekly and monthly maintenance plans.
          </p>

          {/* Action CTAs: High-taste matching buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={handleDashboardClick}
              className="gap-2 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm px-5 sm:px-6 h-10 sm:h-11 rounded-xl shadow-lg shadow-blue-900/40 border border-sky-300/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="size-3.5 sm:size-4" />
            </Button>

            <Button
              variant="outline"
              asChild
              className="gap-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-white/35 backdrop-blur-md font-medium text-xs sm:text-sm px-4 sm:px-5 h-10 sm:h-11 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <a href="#how-it-works">
                <span>How It Works</span>
                <ChevronRight className="size-3.5 sm:size-4 text-slate-300" />
              </a>
            </Button>
          </div>

          {/* Tech Feature Badges Strip */}
          <div className="pt-4 border-t border-white/15 flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-200">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 border border-white/15 px-2.5 py-1 backdrop-blur-sm shadow-xs">
              <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
              <span>Human-in-the-Loop Safe Sanction</span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 border border-white/15 px-2.5 py-1 backdrop-blur-sm shadow-xs">
              <CheckCircle2 className="size-3.5 text-sky-400 shrink-0" />
              <span>Multi-Department Bundling (TMS, SMMS, TDMS)</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 border border-white/15 px-2.5 py-1 backdrop-blur-sm shadow-xs">
              <CalendarClock className="size-3.5 text-amber-400 shrink-0" />
              <span>Weekly &amp; Monthly Schedules</span>
            </div>
          </div>

        </div>
      </div>

      {/* Heritage Badge */}
      <div className="absolute bottom-3 right-4 z-10 hidden sm:block">
        <div className="rounded-full bg-black/45 border border-white/15 px-3 py-1 text-xs text-slate-200 backdrop-blur-md shadow-xs">
          Kharagpur Division · South Eastern Railway
        </div>
      </div>

    </section>
  )
}
