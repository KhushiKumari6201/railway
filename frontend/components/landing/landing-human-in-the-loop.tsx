import {
  Cpu,
  Sparkles,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

export function LandingHumanInTheLoop() {
  const steps = [
    {
      title: 'System Analyzes',
      description: 'Ingests tasks from TMS, SMMS, TDMS and cross-references them against timetabled train paths.',
      icon: Cpu,
      tag: 'Step 1 · AI Engine',
    },
    {
      title: 'System Recommends',
      description: 'Generates bundled block proposals with clear utilization scores and explainable rationale.',
      icon: Sparkles,
      tag: 'Step 2 · Recommendation',
    },
    {
      title: 'Planner Reviews',
      description: 'Divisional Traffic Controller inspects the proposed window, affected trains, and corridor constraints.',
      icon: UserCheck,
      tag: 'Step 3 · Human Review',
    },
    {
      title: 'Planner Approves / Modifies',
      description: 'The railway officer authorizes the block, alters timings, or reschedules tasks as operational safety dictates.',
      icon: CheckCircle2,
      tag: 'Step 4 · Final Decision',
    },
  ]

  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Banner Heading */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 tracking-wide uppercase">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Safety-First Principle</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            AI RECOMMENDS. <span className="text-primary">THE PLANNER DECIDES.</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            The platform supports railway planners by identifying suitable maintenance opportunities.
            Final approval remains with the human planner.
          </p>
        </div>

        {/* 4-Stage Operational Flow */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
                    {step.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Stage 0{idx + 1}</span>
                {idx < steps.length - 1 && (
                  <span className="hidden lg:inline text-xs font-semibold text-slate-400">&rarr;</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Safety & Operational Assurance Callout */}
        <div className="mt-10 mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-2xs text-center sm:text-left sm:flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mx-auto sm:mx-0">
            <ShieldCheck className="size-6" />
          </div>
          <div className="mt-3 sm:mt-0">
            <h4 className="text-sm font-bold text-slate-900">Zero Black-Box Decisions</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Every recommendation includes explicit rationale, timetable clearance checks, and impacted passenger trains so officers make informed, safety-compliant block decisions.
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
