import {
  TrendingUp,
  Timer,
  Network,
  HelpCircle,
} from 'lucide-react'

export function LandingBenefits() {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Better Asset Availability',
      description: 'Use available maintenance windows more effectively to keep track, signaling, and OHE assets in peak condition.',
      stat: 'Maximized Uptime',
    },
    {
      icon: Timer,
      title: 'Reduced Planning Effort',
      description: 'Reduce manual effort in identifying suitable blocks and cross-referencing multi-departmental requests against train timetables.',
      stat: 'Hours Saved Weekly',
    },
    {
      icon: Network,
      title: 'Better Task Coordination',
      description: 'Bundle compatible maintenance activities from Engineering, S&T, and Traction into single coordinated line possessions.',
      stat: 'Multi-Discipline Harmony',
    },
    {
      icon: HelpCircle,
      title: 'More Explainable Decisions',
      description: 'Clearly see why a block or task was recommended, which trains are impacted, and what alternatives were evaluated.',
      stat: 'Transparent & Auditable',
    },
  ]

  return (
    <section className="py-16 sm:py-24 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Impact
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Why This Matters
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Practical, measurable benefits designed for Indian Railways operational efficiency,
            punctuality preservation, and asset safety.
          </p>
        </div>

        {/* 4 Benefits Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-6 shadow-2xs hover:bg-white hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-primary">
                    <b.icon className="size-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-primary bg-blue-50/60 border border-blue-100 rounded px-2 py-0.5">
                    {b.stat}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {b.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {b.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">0{idx + 1}</span>
                <span className="text-xs font-semibold text-slate-500">Divisional Benefit</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
