import {
  FileSpreadsheet,
  Clock,
  UserCheck,
  Split,
} from 'lucide-react'

export function LandingChallenge() {
  const challenges = [
    {
      icon: FileSpreadsheet,
      title: 'Fragmented Maintenance Information',
      description: 'Maintenance tasks come from different departments and independent legacy systems.',
      tag: 'Data Silos',
    },
    {
      icon: Clock,
      title: 'Limited Block Availability',
      description: 'Maintenance must fit around heavy train operations, timetable paths, and tight corridors.',
      tag: 'Capacity Limits',
    },
    {
      icon: UserCheck,
      title: 'Manual Planning',
      description: 'Finding the best combination of tasks, durations, and windows takes significant planning effort.',
      tag: 'Time-Intensive',
    },
    {
      icon: Split,
      title: 'Conflicting Requirements',
      description: 'Multiple maintenance activities may compete for the same corridor, section, or time window.',
      tag: 'Route Overlaps',
    },
  ]

  return (
    <section className="py-16 sm:py-20 bg-slate-50/60 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 uppercase tracking-wider">
            The Challenge
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Key Bottlenecks in Traditional Block Planning
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Railway operations require seamless train movement while safety demands timely maintenance blocks.
            Reconciling both requires resolving four key operational challenges:
          </p>
        </div>

        {/* 4 Challenge Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {challenges.map((c, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <c.icon className="size-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {c.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {c.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">0{idx + 1}</span>
                <span className="text-xs text-slate-500 font-medium">Operational Friction</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
