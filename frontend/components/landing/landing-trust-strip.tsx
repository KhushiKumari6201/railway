import {
  Layers,
  Sparkles,
  CalendarRange,
  ShieldCheck,
} from 'lucide-react'

export function LandingTrustStrip() {
  const items = [
    {
      icon: Layers,
      title: 'Unified Maintenance Data',
      subtitle: 'TMS, SMMS & TDMS in one single pane',
    },
    {
      icon: Sparkles,
      title: 'Smart Block Recommendations',
      subtitle: 'Automated corridor window discovery',
    },
    {
      icon: CalendarRange,
      title: 'Weekly & Monthly Planning',
      subtitle: 'Corridor capacity & slot optimization',
    },
    {
      icon: ShieldCheck,
      title: 'Human-in-the-Loop Approval',
      subtitle: 'Safety & final decisions with planners',
    },
  ]

  return (
    <section className="border-y border-slate-200 bg-slate-50/70 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-200 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <item.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {item.title}
                </h2>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
