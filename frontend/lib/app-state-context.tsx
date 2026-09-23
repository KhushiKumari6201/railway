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
  approveBlock: (blockId: string) => Promise<{ success: boolean; block: RecommendedBlock }>
  rejectBlock: (blockId: string) => void
  saveBlock: (block: RecommendedBlock) => void
  checkConflicts: (
    block: Partial<RecommendedBlock>,
    persist?: boolean
  ) => Promise<{ hasConflict: boolean; hasBlockingConflict: boolean; conflicts: Conflict[] }>
  resolveConflict: (conflictId: string) => void
  resolveAllConflicts: () => void
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

  const approveBlock = async (blockId: string) => {
    try {
      const res = await api.approveBlock(blockId)
      const approvedBlock = res.block || recommendedBlocks.find((b) => b.id === blockId)
      const affectedTaskIds = approvedBlock?.taskIds || []
      const scheduledDate = approvedBlock?.date

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

      refreshData().catch(() => {})
      return res
    } catch (err) {
      console.error('[API] Failed to approve block:', err)
      throw err
    }
  }

  const checkConflicts = async (
    block: Partial<RecommendedBlock>,
    persist = false
  ) => {
    try {
      const res = await api.checkConflicts(block, persist)
      if (persist && res.conflicts && res.conflicts.length > 0) {
        setConflicts((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]))
          for (const c of res.conflicts) {
            map.set(c.id, c)
          }
          return Array.from(map.values())
        })
      }
      return res
    } catch (err) {
      console.warn('[API] Conflict check failed:', err)
      return { hasConflict: false, hasBlockingConflict: false, conflicts: [] }
    }
  }

  const rejectBlock = (blockId: string) => {
    const targetBlock = recommendedBlocks.find((b) => b.id === blockId)
    const affectedTaskIds = targetBlock?.taskIds || []
    const scheduledDate = targetBlock?.date

    // Optimistic local update
    setRecommendedBlocks((prev) =>
      prev.map((block) => (block.id === blockId ? { ...block, status: 'Rejected' } : block))
    )

    // STEP 7 FIX: Revert bundled tasks scheduled for this block back to Open
    if (affectedTaskIds.length > 0) {
      setTasks((prev) =>
        prev.map((t) =>
          affectedTaskIds.includes(t.id) && t.status === 'Scheduled' && (!scheduledDate || t.scheduledDate === scheduledDate)
            ? { ...t, status: 'Open', scheduledDate: undefined }
            : t
        )
      )
    }

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

  const resolveAllConflicts = () => {
    // Optimistic local update
    setConflicts((prev) => prev.map((c) => ({ ...c, resolved: true })))

    // Persist to MongoDB backend via single atomic bulk endpoint
    api.resolveAllConflicts().catch((err) => {
      console.error('[API] Failed to resolve all conflicts in backend:', err)
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

  const saveBlock = (newBlock: RecommendedBlock) => {
    // Optimistic local update
    setRecommendedBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === newBlock.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = newBlock
        return next
      }
      return [newBlock, ...prev]
    })

    // Persist to MongoDB backend
    api.saveBlock(newBlock).catch((err) => {
      console.error('[API] Failed to save block in backend:', err)
    })
  }

  const value = {
    tasks,
    recommendedBlocks,
    conflicts,
    approveBlock,
    rejectBlock,
    saveBlock,
    checkConflicts,
    resolveConflict,
    resolveAllConflicts,
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
