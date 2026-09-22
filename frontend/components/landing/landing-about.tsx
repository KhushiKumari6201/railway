import {
  Wrench,
  Clock,
  Cpu,
  CheckCircle2,
  Plus,
  ArrowDown,
  ArrowRight,
} from 'lucide-react'

export function LandingAbout() {
  return (
    <section id="about" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            About Our Solution
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            One Platform for Smarter Maintenance Planning
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Railway maintenance teams receive tasks from different maintenance departments
            while train operations continuously change the available time for maintenance blocks.
          </p>
        </div>

        {/* Narrative Paragraphs */}
        <div className="mt-8 mx-auto max-w-3xl text-center text-sm sm:text-base text-slate-600 leading-relaxed space-y-3">
          <p>
            Our platform brings these requirements together and helps planners identify
            suitable maintenance windows across Engineering, S&amp;T, and Traction departments.
          </p>
          <p>
            It prioritizes important work, groups compatible tasks into single corridor possessions,
            and recommends maintenance blocks while keeping the final authorization with the railway planner.
          </p>
        </div>

        {/* Visual 3-Part Architecture Pipeline */}
        <div className="mt-12 mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 shadow-xs">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
              How The Solution Bridges Operational Demands
            </p>

            <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4">
              
              {/* Box 1: Maintenance Tasks */}
              <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-blue-50 text-primary mb-2">
                  <Wrench className="size-5" />
                </div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Input 01</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Maintenance Tasks</div>
                <div className="text-xs text-slate-500 mt-1">TMS · SMMS · TDMS</div>
              </div>

              {/* Plus Symbol */}
              <div className="md:col-span-1 flex justify-center text-slate-400">
                <div className="flex size-8 items-center justify-center rounded-full bg-slate-200/80 text-slate-600 font-bold">
                  <Plus className="size-4" />
                </div>
              </div>

              {/* Box 2: Operational Availability */}
              <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 mb-2">
                  <Clock className="size-5" />
                </div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Input 02</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Operational Availability</div>
                <div className="text-xs text-slate-500 mt-1">Timetables &amp; Line Windows</div>
              </div>

              {/* Arrow Symbol */}
              <div className="md:col-span-1 flex justify-center text-primary">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-primary font-bold">
                  <ArrowDown className="size-4 md:hidden" />
                  <ArrowRight className="size-4 hidden md:block" />
                </div>
              </div>

              {/* Box 3: Smart Block Planning */}
              <div className="md:col-span-3 rounded-xl border-2 border-primary/40 bg-white p-4 text-center shadow-xs">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-white mb-2">
                  <Cpu className="size-5" />
                </div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wide">Processing Engine</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Smart Block Planning</div>
                <div className="text-xs text-slate-500 mt-1">Conflict Detection &amp; Bundling</div>
              </div>

            </div>

            {/* Downward step to final outcome */}
            <div className="my-5 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="h-4 w-0.5 bg-slate-300" />
                <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <ArrowDown className="size-3.5" />
                </div>
              </div>
            </div>

            {/* Final Output Banner */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
              <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span>Approved Maintenance Plan</span>
              </div>
              <p className="text-xs text-emerald-700/90 mt-1 max-w-md mx-auto">
                Validated and authorized by Divisional Traffic Controllers and Operating Planners for execution.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
