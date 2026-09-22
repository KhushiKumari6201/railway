'use client'

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import type { MaintenanceTask, RecommendedBlock, Conflict } from '@/lib/types'
import { tasks as initialTasks } from '@/lib/data/tasks'
import { recommendedBlocks as initialRecommendedBlocks } from '@/lib/data/recommendations'
import { conflicts as initialConflicts } from '@/lib/data/conflicts'
import { api } from '@/lib/api'

interface AppStateContextType {
  tasks: MaintenanceTask[]
  recommendedBlocks: RecommendedBlock[]
  conflicts: Conflict[]
  approveBlock: (blockId: string) => void
  rejectBlock: (blockId: string) => void
  resolveConflict: (conflictId: string) => void
  addTaskToPlan: (taskId: string) => void
  scheduleTaskDate: (taskId: string, date: string) => void
  refreshData: () => Promise<void>
  isBackendConnected: boolean
  pendingTasksCount: number
  criticalTasksCount: number
  openConflictsCount: number
  resolvedConflictsCount: number
  approvedBlocksCount: number
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks)
  const [recommendedBlocks, setRecommendedBlocks] = useState<RecommendedBlock[]>(initialRecommendedBlocks)
  const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts)
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false)

  // Fetch live state from backend MongoDB on initial mount
  const refreshData = useCallback(async () => {
    try {
      const [backendTasks, backendBlocks, backendConflicts] = await Promise.all([
        api.getTasks(),
        api.getBlocks(),
        api.getConflicts(),
      ])

      if (backendTasks && backendTasks.length > 0) setTasks(backendTasks)
      if (backendBlocks && backendBlocks.length > 0) setRecommendedBlocks(backendBlocks)
      if (backendConflicts && backendConflicts.length > 0) setConflicts(backendConflicts)

      setIsBackendConnected(true)
      console.log('[AppState] Synced with MongoDB backend successfully.')
    } catch (err) {
      console.warn('[AppState] Backend not reached. Operating in client-side fallback mode.', err)
      setIsBackendConnected(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const approveBlock = (blockId: string) => {
    const targetBlock = recommendedBlocks.find((b) => b.id === blockId)
    const affectedTaskIds = targetBlock?.taskIds || []
    const scheduledDate = targetBlock?.date

    // Optimistic local update
    setRecommendedBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, status: 'Approved' } : block
      )
    )

    if (affectedTaskIds.length > 0) {
      setTasks((prev) =>
        prev.map((t) =>
          affectedTaskIds.includes(t.id)
            ? { ...t, status: 'Scheduled', scheduledDate: scheduledDate ?? t.scheduledDate }
            : t
        )
      )
    }

    // Persist to MongoDB backend
    api.approveBlock(blockId).catch((err) => {
      console.error('[API] Failed to approve block in backend:', err)
    })
  }

  const rejectBlock = (blockId: string) => {
    // Optimistic local update
    setRecommendedBlocks((prev) =>
      prev.map((block) => (block.id === blockId ? { ...block, status: 'Rejected' } : block))
    )

    // Persist to MongoDB backend
    api.rejectBlock(blockId).catch((err) => {
      console.error('[API] Failed to reject block in backend:', err)
    })
  }

  const resolveConflict = (conflictId: string) => {
    // Optimistic local update
    setConflicts((prev) =>
      prev.map((c) => (c.id === conflictId ? { ...c, resolved: true } : c))
    )

    // Persist to MongoDB backend
    api.resolveConflict(conflictId).catch((err) => {
      console.error('[API] Failed to resolve conflict in backend:', err)
    })
  }

  const addTaskToPlan = (taskId: string) => {
    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'Scheduled' } : t))
    )

    // Persist to MongoDB backend
    api.updateTask(taskId, { status: 'Scheduled' }).catch((err) => {
      console.error('[API] Failed to update task status in backend:', err)
    })
  }

  const scheduleTaskDate = (taskId: string, date: string) => {
    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: 'Scheduled', scheduledDate: date } : t
      )
    )

    // Persist to MongoDB backend
    api.updateTask(taskId, { status: 'Scheduled', scheduledDate: date }).catch((err) => {
      console.error('[API] Failed to schedule task date in backend:', err)
    })
  }

  const pendingTasksCount = useMemo(
    () => tasks.filter((t) => t.status === 'Open').length,
    [tasks]
  )

  const criticalTasksCount = useMemo(
    () => tasks.filter((t) => t.criticality === 'Critical' && t.status === 'Open').length,
    [tasks]
  )

  const openConflictsCount = useMemo(
    () => conflicts.filter((c) => !c.resolved).length,
    [conflicts]
  )

  const resolvedConflictsCount = useMemo(
    () => conflicts.filter((c) => c.resolved).length,
    [conflicts]
  )

  const approvedBlocksCount = useMemo(
    () => recommendedBlocks.filter((b) => b.status === 'Approved').length,
    [recommendedBlocks]
  )

  const value = {
    tasks,
    recommendedBlocks,
    conflicts,
    approveBlock,
    rejectBlock,
    resolveConflict,
    addTaskToPlan,
    scheduleTaskDate,
    refreshData,
    isBackendConnected,
    pendingTasksCount,
    criticalTasksCount,
    openConflictsCount,
    resolvedConflictsCount,
    approvedBlocksCount,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}
