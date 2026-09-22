import { PageHeader } from '@/components/page-header'
import { PlannerView } from '@/components/planner/planner-view'

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        badge="SOUTH EASTERN RAILWAY · KHARAGPUR DIVISION"
        title="Automatic Block Planner"
        description="Select a corridor and find the best maintenance window."
      />
      <PlannerView />
    </div>
  )
}
