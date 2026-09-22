import {
  ListChecks,
  AlertTriangle,
  CalendarClock,
  Layers,
  CalendarDays,
  CalendarRange,
} from 'lucide-react'

export function LandingFeatures() {
  const features = [
    {
      icon: ListChecks,
      title: 'Unified Maintenance Queue',
      description: 'View and manage maintenance tasks across Civil, S&T, and Electrical departments in one centralized feed.',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      icon: AlertTriangle,
      title: 'Smart Priority',
      description: 'Automatically identify urgent, critical, and overdue maintenance work before assets reach failure thresholds.',
      color: 'bg-red-50 text-red-700',
    },
    {
      icon: CalendarClock,
      title: 'Automatic Block Planning',
      description: 'Find optimal maintenance windows based on task requirements, durations, and train headway allowances.',
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      icon: Layers,
      title: 'Task Bundling',
      description: 'Group compatible maintenance activities from multiple teams into single coordinated block possessions.',
      color: 'bg-purple-50 text-purple-700',
    },
    {
      icon: CalendarDays,
      title: 'Weekly Planning',
      description: 'Create actionable weekly corridor schedules with detailed slot assignments, durations, and conflict flags.',
      color: 'bg-amber-50 text-amber-700',
    },
    {
      icon: CalendarRange,
      title: 'Monthly Planning',
      description: 'Review high-level monthly demand, corridor capacities, and seasonal asset maintenance targets.',
      color: 'bg-indigo-50 text-indigo-700',
    },
  ]

  return (
    <section id="features" className="py-16 sm:py-24 bg-slate-50/70 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Capabilities
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Key Features
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Six purpose-built tools engineered for railway traffic managers and departmental maintenance engineers.
          </p>
        </div>

        {/* 6 Feature Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div>
                <div className={`flex size-11 items-center justify-center rounded-lg ${feature.color} mb-4 transition-transform group-hover:scale-105`}>
                  <feature.icon className="size-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Feature 0{idx + 1}</span>
                <span className="text-primary font-sans font-medium text-xs">Ready in Prototype &rarr;</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
