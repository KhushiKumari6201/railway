import {
  Inbox,
  Filter,
  Search,
  Sparkles,
  CheckCheck,
  ArrowRight,
} from 'lucide-react'

export function LandingHowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Collect Maintenance Tasks',
      description: 'Maintenance requirements from Engineering, S&T and Traction are represented in one planning queue.',
      icon: Inbox,
      badge: 'TMS / SMMS / TDMS',
    },
    {
      num: '02',
      title: 'Prioritize Work',
      description: 'Tasks are prioritized using factors such as criticality, urgency, overdue status and operational impact.',
      icon: Filter,
      badge: 'Urgency & Risk Weighting',
    },
    {
      num: '03',
      title: 'Find Available Windows',
      description: 'The system checks available maintenance block windows against timetabled passenger and freight trains.',
      icon: Search,
      badge: 'Timetable Clearance',
    },
    {
      num: '04',
      title: 'Recommend the Best Plan',
      description: 'Compatible tasks are bundled into suitable windows to maximize line possession utilization.',
      icon: Sparkles,
      badge: 'Smart Bundling',
    },
    {
      num: '05',
      title: 'Planner Reviews & Approves',
      description: 'The railway planner can approve, adjust durations, or modify the recommendation before line sanction.',
      icon: CheckCheck,
      badge: 'Human Authorization',
    },
  ]

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Workflow Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A transparent, 5-stage automated planning sequence designed to turn fragmented
            maintenance requests into verified, conflict-free block recommendations.
          </p>
        </div>

        {/* 5-Step Process Flow Cards */}
        <div className="mt-14 relative">
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
            {steps.map((step, idx) => (
              <div
                key={step.num}
                className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Step Number & Icon Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-2xl font-black text-primary/70 group-hover:text-primary transition-colors">
                      {step.num}
                    </span>
                    <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs group-hover:bg-primary group-hover:text-white transition-colors">
                      <step.icon className="size-4" />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/70">
                  <span className="inline-block text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded px-2 py-0.5">
                    {step.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom connecting summary bar */}
          <div className="mt-10 mx-auto max-w-2xl rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center">
            <p className="text-xs sm:text-sm text-slate-700 font-medium">
              <span className="font-bold text-primary">Continuous Loop:</span> Planners retain 100% control to adjust task priorities, change corridor dates, and approve only feasible maintenance possessions.
            </p>
          </div>

        </div>

      </div>
    </section>
  )
}
