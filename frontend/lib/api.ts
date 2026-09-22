import type { MaintenanceTask, RecommendedBlock, Conflict } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const api = {
  // --- Tasks ---
  async getTasks(): Promise<MaintenanceTask[]> {
    const res = await fetch(`${API_BASE}/tasks`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.statusText}`)
    return res.json()
  },

  async updateTask(id: string, data: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Failed to update task ${id}: ${res.statusText}`)
    return res.json()
  },

  // --- Recommended Blocks ---
  async getBlocks(): Promise<RecommendedBlock[]> {
    const res = await fetch(`${API_BASE}/blocks`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch blocks: ${res.statusText}`)
    return res.json()
  },

  async approveBlock(id: string): Promise<{ success: boolean; block: RecommendedBlock }> {
    const res = await fetch(`${API_BASE}/blocks/${id}/approve`, {
      method: 'PATCH',
    })
    if (!res.ok) throw new Error(`Failed to approve block ${id}: ${res.statusText}`)
    return res.json()
  },

  async rejectBlock(id: string): Promise<{ success: boolean; block: RecommendedBlock }> {
    const res = await fetch(`${API_BASE}/blocks/${id}/reject`, {
      method: 'PATCH',
    })
    if (!res.ok) throw new Error(`Failed to reject block ${id}: ${res.statusText}`)
    return res.json()
  },

  // --- Conflicts ---
  async getConflicts(): Promise<Conflict[]> {
    const res = await fetch(`${API_BASE}/conflicts`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch conflicts: ${res.statusText}`)
    return res.json()
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
}
