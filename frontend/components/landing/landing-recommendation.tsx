'use client'

import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight,
  Info,
  MapPin,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function LandingRecommendation() {
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
    <section className="py-16 sm:py-24 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Prototype Demonstration
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            From Maintenance Tasks to a Better Block
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            See how the platform bundles multiple departmental tasks into an optimized,
            conflict-free corridor block window.
          </p>
        </div>

        {/* Product Demonstration Card */}
        <div className="mt-12 mx-auto max-w-3xl">
          <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-blue-50/40 via-white to-white p-6 sm:p-8 shadow-sm">
            
            {/* Top Bar of Demo Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended Block REC-101
                </span>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-semibold text-emerald-700">
                83% Window Utilization
              </span>
            </div>

            {/* Grid of Key Info */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              
              {/* Available Window */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  <Clock className="size-4 text-primary" />
                  <span>Available Window</span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-900">
                  10:00 AM – 12:00 PM
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Duration: 120 minutes (2.0 hours)
                </div>
              </div>

              {/* Corridor */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  <MapPin className="size-4 text-amber-600" />
                  <span>Corridor</span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  Kharagpur – Tatanagar
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Section: Midnapore – Jhargram · UP Line
                </div>
              </div>

            </div>

            {/* Bundled Tasks */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Layers className="size-4 text-purple-600" />
                  <span>Recommended Tasks (3 Bundled)</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Zero Conflict</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
                  <span className="text-xs font-mono font-bold text-primary block">ENG-221</span>
                  <span className="text-xs font-semibold text-slate-800 block">Rail Fracture Tamping</span>
                  <span className="text-xs text-slate-500 block mt-0.5">Civil &middot; 90 min</span>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5">
                  <span className="text-xs font-mono font-bold text-emerald-700 block">SNT-221</span>
                  <span className="text-xs font-semibold text-slate-800 block">Axle Counter Calibration</span>
                  <span className="text-xs text-slate-500 block mt-0.5">S&amp;T &middot; 45 min</span>
                </div>

                <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-2.5">
                  <span className="text-xs font-mono font-bold text-purple-700 block">TD-101</span>
                  <span className="text-xs font-semibold text-slate-800 block">OHE Isolator Inspection</span>
                  <span className="text-xs text-slate-500 block mt-0.5">Traction &middot; 60 min</span>
                </div>
              </div>
            </div>

            {/* Explainability / Reason */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start gap-2.5">
                <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Why This Block Was Recommended
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium italic">
                    &ldquo;These tasks are on the same corridor, fit within the available window and can be performed without a scheduling conflict.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* CTA & Disclaimer */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="size-4 text-slate-400 shrink-0" />
                <span>Simulated live corridor possession scenario</span>
              </div>

              <Button
                onClick={handleDashboardClick}
                className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/95 text-white font-semibold shadow-xs"
              >
                <span>Explore Dashboard</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
