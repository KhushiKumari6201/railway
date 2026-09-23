import type {
  MaintenanceTask,
  RecommendedBlock,
  Conflict,
  NetworkIntelligenceResponse,
  WhatIfScenario,
  WhatIfSimulationResult,
  WhatIfComparisonResponse,
  NetworkCoordinationScenario,
  NetworkCoordinationResult,
  NetworkCoordinationComparison,
  NetworkCorridorNode,
  OperationalIncident,
  DisruptionImpact,
  ReschedulingSimulationResult,
  ReschedulingComparison,
  OperationalRequisitionReport,
  UserAccount,
  AuditLogsResponse,
  OperationalAnalyticsResponse,
  ManagementReportResponse,
  OptimizationCandidate,
  OptimizationResult,
  OptimizationComparison,
  OptimizationApplyResponse,
  CommandCenterOverview,
  OperationalAlert,
  AlertsResponse,
  AlertSummaryResponse,
  AlertEvaluationResult,
  AlertDecisionTrace,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export function getAuthHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('railsanket_auth_token')
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
  }
  return {}
}

export const api = {
  // --- Health Check ---
  async getHealth(): Promise<{ status: string; database: string }> {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`)
    return res.json()
  },

  // --- Tasks ---
  async getTasks(): Promise<MaintenanceTask[]> {
    const res = await fetch(`${API_BASE}/tasks`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.statusText}`)
    const json = await res.json()
    return Array.isArray(json) ? json : json.tasks || []
  },

  async updateTask(id: string, data: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Failed to update task ${id}: ${res.statusText}`)
    const json = await res.json()
    return json.task || json
  },

  // --- Recommended Blocks ---
  async getBlocks(): Promise<RecommendedBlock[]> {
    const res = await fetch(`${API_BASE}/blocks`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch blocks: ${res.statusText}`)
    const json = await res.json()
    return Array.isArray(json) ? json : json.blocks || []
  },

  async saveBlock(block: Partial<RecommendedBlock>): Promise<{ success: boolean; block: RecommendedBlock }> {
    const res = await fetch(`${API_BASE}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(block),
    })
    if (!res.ok) throw new Error(`Failed to save block: ${res.statusText}`)
    return res.json()
  },

  async approveBlock(id: string, remarks?: string): Promise<{ success: boolean; block: RecommendedBlock }> {
    const res = await fetch(`${API_BASE}/blocks/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ remarks }),
    })
    if (!res.ok) throw new Error(`Failed to approve block ${id}: ${res.statusText}`)
    return res.json()
  },

  async rejectBlock(id: string, reason?: string): Promise<{ success: boolean; block: RecommendedBlock }> {
    const res = await fetch(`${API_BASE}/blocks/${id}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) throw new Error(`Failed to reject block ${id}: ${res.statusText}`)
    return res.json()
  },

  // --- Conflicts ---
  async getConflicts(): Promise<Conflict[]> {
    const res = await fetch(`${API_BASE}/conflicts`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch conflicts: ${res.statusText}`)
    const json = await res.json()
    return Array.isArray(json) ? json : json.conflicts || []
  },

  async resolveConflict(id: string): Promise<{ success: boolean; conflict: Conflict }> {
    const res = await fetch(`${API_BASE}/conflicts/${id}/resolve`, {
      method: 'PATCH',
    })
    if (!res.ok) throw new Error(`Failed to resolve conflict ${id}: ${res.statusText}`)
    return res.json()
  },

  async resolveAllConflicts(): Promise<{ success: boolean; conflicts: Conflict[] }> {
    const res = await fetch(`${API_BASE}/conflicts/resolve-all`, {
      method: 'PATCH',
    })
    if (!res.ok) throw new Error(`Failed to resolve all conflicts: ${res.statusText}`)
    return res.json()
  },

  async checkConflicts(
    block: Partial<RecommendedBlock>,
    persist = false
  ): Promise<{
    hasConflict: boolean
    hasBlockingConflict: boolean
    conflicts: Conflict[]
  }> {
    const res = await fetch(`${API_BASE}/conflicts/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block, persist }),
    })
    if (!res.ok) throw new Error(`Conflict check failed: ${res.statusText}`)
    return res.json()
  },

  // --- Network Intelligence ---
  async getNetworkIntelligence(corridorId?: string): Promise<NetworkIntelligenceResponse> {
    const url = corridorId
      ? `${API_BASE}/network/intelligence?corridorId=${encodeURIComponent(corridorId)}`
      : `${API_BASE}/network/intelligence`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch network intelligence: ${res.statusText}`)
    return res.json()
  },

  // --- What-If Scenario Simulation ---
  async simulateWhatIf(
    scenario: Partial<WhatIfScenario>,
    baseBlockId?: string | null
  ): Promise<WhatIfSimulationResult> {
    const res = await fetch(`${API_BASE}/what-if/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseBlockId: baseBlockId || null, scenario }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `What-If simulation failed: ${res.statusText}`)
    }
    return res.json()
  },

  async compareWhatIf(
    baseline: Partial<WhatIfScenario>,
    scenarios: Partial<WhatIfScenario>[]
  ): Promise<WhatIfComparisonResponse> {
    const res = await fetch(`${API_BASE}/what-if/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline, scenarios }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `What-If comparison failed: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Multi-Corridor Network Coordination (Phase 6) ---
  async getNetworkTopology(): Promise<{
    success: boolean
    corridors: NetworkCorridorNode[]
    topology: Record<string, NetworkCorridorNode>
  }> {
    const res = await fetch(`${API_BASE}/network/topology`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch network topology: ${res.statusText}`)
    return res.json()
  },

  async checkNetworkCoordination(
    scenario: NetworkCoordinationScenario
  ): Promise<NetworkCoordinationResult> {
    const res = await fetch(`${API_BASE}/network/coordination/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Network coordination check failed: ${res.statusText}`)
    }
    return res.json()
  },

  async compareNetworkCoordination(
    scenarios: NetworkCoordinationScenario[]
  ): Promise<NetworkCoordinationComparison> {
    const res = await fetch(`${API_BASE}/network/coordination/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarios }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Multi-scenario coordination comparison failed: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Real-Time Operational Feedback & Disruption Rescheduling (Phase 7) ---
  async getDisruptions(params: Record<string, string> = {}): Promise<{
    success: boolean
    mode: string
    count: number
    data: OperationalIncident[]
  }> {
    const q = new URLSearchParams(params).toString()
    const url = `${API_BASE}/disruptions${q ? `?${q}` : ''}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch disruptions: ${res.statusText}`)
    return res.json()
  },

  async simulateDisruption(incident: Partial<OperationalIncident>): Promise<{
    success: boolean
    mode: string
    incident: OperationalIncident
    impact: DisruptionImpact
  }> {
    const res = await fetch(`${API_BASE}/disruptions/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Incident simulation failed: ${res.statusText}`)
    }
    return res.json()
  },

  async getDisruption(id: string): Promise<{
    success: boolean
    mode: string
    incident: OperationalIncident
    impact: DisruptionImpact
  }> {
    const res = await fetch(`${API_BASE}/disruptions/${id}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch incident ${id}: ${res.statusText}`)
    return res.json()
  },

  async resolveDisruption(id: string): Promise<{
    success: boolean
    mode: string
    message: string
    incident: OperationalIncident
  }> {
    const res = await fetch(`${API_BASE}/disruptions/${id}/resolve`, {
      method: 'PATCH',
    })
    if (!res.ok) throw new Error(`Failed to resolve incident ${id}: ${res.statusText}`)
    return res.json()
  },

  async getDisruptionReport(id: string): Promise<OperationalRequisitionReport> {
    const res = await fetch(`${API_BASE}/disruptions/${id}/report`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to generate report for ${id}: ${res.statusText}`)
    return res.json()
  },

  async simulateRescheduling(scenario: any): Promise<ReschedulingSimulationResult> {
    const res = await fetch(`${API_BASE}/rescheduling/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Rescheduling simulation failed: ${res.statusText}`)
    }
    return res.json()
  },

  async compareRescheduling(scenarios: any[]): Promise<ReschedulingComparison> {
    const res = await fetch(`${API_BASE}/rescheduling/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarios }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Rescheduling comparison failed: ${res.statusText}`)
    }
    return res.json()
  },

  async applyReschedulingScenario(selectedScenario: any): Promise<{
    success: boolean
    mode: string
    message: string
    requiresApproval: boolean
    plannerParameters: any
    evaluation: any
  }> {
    const res = await fetch(`${API_BASE}/rescheduling/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ selectedScenario }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to apply rescheduling scenario: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Phase 8: Operational Analytics & Management Reporting ---
  async getOperationalAnalytics(filters: { corridorId?: string; department?: string } = {}): Promise<OperationalAnalyticsResponse> {
    const q = new URLSearchParams()
    if (filters.corridorId) q.append('corridorId', filters.corridorId)
    if (filters.department) q.append('department', filters.department)
    const queryString = q.toString()
    const url = `${API_BASE}/analytics/overview${queryString ? `?${queryString}` : ''}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to fetch operational analytics: ${res.statusText}`)
    }
    return res.json()
  },

  async generateManagementReport(payload: { type: string; corridorId?: string }): Promise<ManagementReportResponse> {
    const res = await fetch(`${API_BASE}/analytics/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to generate management report: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Phase 8: Divisional Audit Trail ---
  async getAuditLogs(params: Record<string, string | number> = {}): Promise<AuditLogsResponse> {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        q.append(k, String(v))
      }
    })
    const queryString = q.toString()
    const url = `${API_BASE}/audit${queryString ? `?${queryString}` : ''}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to fetch audit logs: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Phase 8: User & Cadre Directory ---
  async getUsers(): Promise<{ success: boolean; users: UserAccount[] }> {
    const res = await fetch(`${API_BASE}/users`, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to fetch users: ${res.statusText}`)
    }
    return res.json()
  },

  async createUser(data: {
    userId: string
    name: string
    email: string
    password: string
    role: string
    department: string
    employeeCode: string
  }): Promise<{ success: boolean; user: UserAccount }> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to create user: ${res.statusText}`)
    }
    return res.json()
  },

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean; user: UserAccount }> {
    const res = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to update user role: ${res.statusText}`)
    }
    return res.json()
  },

  async toggleUserStatus(userId: string, active: boolean): Promise<{ success: boolean; user: UserAccount }> {
    const res = await fetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ active }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to update user status: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Phase 8: Authentication ---
  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: any; permissions: string[] }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Login failed: ${res.statusText}`)
    }
    return res.json()
  },

  async getMe(): Promise<{ success: boolean; user: any; permissions: string[] }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to fetch current user profile: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Phase 9: Constraint-Based Network Optimization ---
  async generateOptimization(payload: {
    taskIds: string[]
    corridorIds: string[]
    date: string
    planningHorizon?: { start?: string; end?: string }
    availableWindows?: { start: string; end: string; label?: string }[]
    scenario?: any
    disruptionContext?: any
  }): Promise<OptimizationResult> {
    const res = await fetch(`${API_BASE}/optimization/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Optimization candidate generation failed: ${res.statusText}`)
    }
    return res.json()
  },

  async validateOptimization(schedule: {
    corridorId: string
    date: string
    start: string
    end: string
    taskIds?: string[]
  }): Promise<{ success: boolean; mode: string; isFeasible: boolean; candidate: OptimizationCandidate | null }> {
    const res = await fetch(`${API_BASE}/optimization/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ schedule }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Schedule validation failed: ${res.statusText}`)
    }
    return res.json()
  },

  async compareOptimization(candidates: OptimizationCandidate[]): Promise<OptimizationComparison> {
    const res = await fetch(`${API_BASE}/optimization/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ candidates }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Candidate comparison failed: ${res.statusText}`)
    }
    return res.json()
  },

  async getOptimization(id: string): Promise<OptimizationResult> {
    const res = await fetch(`${API_BASE}/optimization/${id}`, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to fetch optimization ${id}: ${res.statusText}`)
    }
    return res.json()
  },

  async applyOptimization(candidate: OptimizationCandidate): Promise<OptimizationApplyResponse> {
    const res = await fetch(`${API_BASE}/optimization/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ candidate }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to stage optimization candidate: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Phase 10: Integrated Operations Command Center ---
  async getCommandCenterOverview(params?: {
    corridorId?: string
    date?: string
    department?: string
    severity?: string
    search?: string
    traceId?: string
  }): Promise<CommandCenterOverview> {
    const qs = new URLSearchParams()
    if (params?.corridorId) qs.set('corridorId', params.corridorId)
    if (params?.date) qs.set('date', params.date)
    if (params?.department) qs.set('department', params.department)
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.search) qs.set('search', params.search)
    if (params?.traceId) qs.set('traceId', params.traceId)

    const url = `${API_BASE}/command-center/overview${qs.toString() ? `?${qs.toString()}` : ''}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || `Failed to fetch command center overview: ${res.statusText}`)
    }
    return res.json()
  },

  // --- Phase 11: Operational Alert Intelligence & Action Center ---
  async getAlerts(params?: {
    severity?: string
    type?: string
    status?: string
    corridorId?: string
    section?: string
    trainNumber?: string
    taskId?: string
    blockId?: string
    disruptionId?: string
    search?: string
    limit?: number
    skip?: number
  }): Promise<AlertsResponse> {
    const qs = new URLSearchParams()
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.type) qs.set('type', params.type)
    if (params?.status) qs.set('status', params.status)
    if (params?.corridorId && params.corridorId !== 'ALL') qs.set('corridorId', params.corridorId)
    if (params?.section) qs.set('section', params.section)
    if (params?.trainNumber) qs.set('trainNumber', params.trainNumber)
    if (params?.taskId) qs.set('taskId', params.taskId)
    if (params?.blockId) qs.set('blockId', params.blockId)
    if (params?.disruptionId) qs.set('disruptionId', params.disruptionId)
    if (params?.search) qs.set('search', params.search)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.skip) qs.set('skip', String(params.skip))

    const url = `${API_BASE}/alerts${qs.toString() ? `?${qs.toString()}` : ''}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to fetch operational alerts: ${res.statusText}`)
    }
    return res.json()
  },

  async getAlertSummary(params?: { corridorId?: string }): Promise<AlertSummaryResponse> {
    const qs = new URLSearchParams()
    if (params?.corridorId && params.corridorId !== 'ALL') qs.set('corridorId', params.corridorId)
    const url = `${API_BASE}/alerts/summary${qs.toString() ? `?${qs.toString()}` : ''}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to fetch alerts summary: ${res.statusText}`)
    }
    return res.json()
  },

  async getAlert(alertId: string): Promise<{ success: boolean; alert: OperationalAlert }> {
    const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}`, {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to fetch alert ${alertId}: ${res.statusText}`)
    }
    return res.json()
  },

  async evaluateAlerts(params?: { corridorId?: string }): Promise<AlertEvaluationResult> {
    const res = await fetch(`${API_BASE}/alerts/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(params || {}),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to evaluate alerts: ${res.statusText}`)
    }
    return res.json()
  },

  async acknowledgeAlert(alertId: string): Promise<{ success: boolean; alert: OperationalAlert; message: string }> {
    const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to acknowledge alert: ${res.statusText}`)
    }
    return res.json()
  },

  async reviewAlert(
    alertId: string,
    notes?: string
  ): Promise<{ success: boolean; alert: OperationalAlert; message: string }> {
    const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ notes }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to start alert review: ${res.statusText}`)
    }
    return res.json()
  },

  async resolveAlert(
    alertId: string,
    notes?: string
  ): Promise<{ success: boolean; alert: OperationalAlert; message: string }> {
    const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ notes }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to resolve alert: ${res.statusText}`)
    }
    return res.json()
  },

  async dismissAlert(
    alertId: string,
    reason: string
  ): Promise<{ success: boolean; alert: OperationalAlert; message: string }> {
    const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/dismiss`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to dismiss alert: ${res.statusText}`)
    }
    return res.json()
  },

  async getAlertDecisionTrace(alertId: string): Promise<{ success: boolean; trace: AlertDecisionTrace }> {
    const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/trace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Failed to fetch decision trace: ${res.statusText}`)
    }
    return res.json()
  },
}


