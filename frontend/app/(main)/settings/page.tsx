'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  UserCheck,
  Users,
  FileClock,
  KeyRound,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { UserAccount, AuditLogEntry, UserRole } from '@/lib/types'
import { useAuth, defaultOfficers } from '@/lib/auth-context'
import { toast } from 'sonner'

export default function SettingsGovernancePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'safeguards'>('users')

  // User Directory State
  const [usersList, setUsersList] = useState<UserAccount[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true)

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [totalLogs, setTotalLogs] = useState<number>(0)
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false)
  const [actionFilter, setActionFilter] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // Load users from backend
  const loadUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const res = await api.getUsers()
      if (res.success && res.users) {
        setUsersList(res.users)
      }
    } catch (err: any) {
      console.warn('Backend user endpoint query error:', err)
      // Fallback display from defaultOfficers
      const mappedDefaults: UserAccount[] = defaultOfficers.map((o) => ({
        userId: o.id,
        name: o.name,
        email: o.email,
        role: (o.role as UserRole) || 'PLANNER',
        department: o.department,
        employeeCode: `EMP-${o.cadre}`,
        active: true,
      }))
      setUsersList(mappedDefaults)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Load audit logs from backend
  const loadAuditLogs = async () => {
    setIsLoadingAudit(true)
    try {
      const params: Record<string, string> = {}
      if (actionFilter) params.action = actionFilter
      if (roleFilter) params.role = roleFilter
      const res = await api.getAuditLogs(params)
      if (res.success) {
        setAuditLogs(res.logs)
        setTotalLogs(res.total)
      }
    } catch (err: any) {
      console.warn('Audit logs query error:', err)
      toast.info('Audit trail requires Controller or Admin role permissions')
    } finally {
      setIsLoadingAudit(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs()
    }
  }, [activeTab, actionFilter, roleFilter])

  // Handle Role Change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await api.updateUserRole(userId, newRole)
      if (res.success) {
        toast.success(`Role updated to ${newRole} for ${userId}`)
        loadUsers()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role')
    }
  }

  // Handle Status Toggle
  const handleStatusToggle = async (userId: string, currentActive: boolean) => {
    try {
      const res = await api.toggleUserStatus(userId, !currentActive)
      if (res.success) {
        toast.success(`Officer account ${!currentActive ? 'activated' : 'deactivated'}`)
        loadUsers()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle account status')
    }
  }

  const roleBadgeColor: Record<string, string> = {
    ADMIN: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    CONTROLLER: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    PLANNER: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    MAINTENANCE_OFFICER: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    VIEWER: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Kharagpur Control Office
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Phase 8 Secure Operational Workflow
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            Security, Cadre Governance & Divisional Audit Trail
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Role-Based Access Control (RBAC), Four-Eyes principle enforcement, and immutable audit logs of all block decisions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-card border rounded-lg p-1 text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'users' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cadre Directory (RBAC)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'audit' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Divisional Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('safeguards')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'safeguards' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Four-Eyes Safeguards
          </button>
        </div>
      </div>

      {/* Tab 1: Cadre Directory (RBAC) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Railway Officers & Engineering Cadres
              </h2>
              <p className="text-xs text-muted-foreground">
                Assigned roles dictate block proposal, review authority, and traffic sanction rights.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoadingUsers} className="gap-1.5 text-xs">
              <RefreshCw className={`size-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 border-b font-medium text-muted-foreground">
                <tr>
                  <th className="p-3">Officer Name</th>
                  <th className="p-3">Department & Code</th>
                  <th className="p-3">Official Railnet Email</th>
                  <th className="p-3">Role Authority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">RBAC Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usersList.map((u) => (
                  <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.userId}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{u.department}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{u.employeeCode}</div>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[11px] ${roleBadgeColor[u.role] || ''}`}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          u.active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {u.active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Role Selector */}
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                          className="bg-muted/60 border rounded px-2 py-1 text-[11px] outline-none cursor-pointer"
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="MAINTENANCE_OFFICER">MAINTENANCE</option>
                          <option value="PLANNER">PLANNER</option>
                          <option value="CONTROLLER">CONTROLLER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>

                        {/* Status Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(u.userId, u.active)}
                          className="text-[11px] h-7 px-2"
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Divisional Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileClock className="size-4 text-primary" />
                Immutable Operational Audit Trail ({totalLogs} recorded events)
              </h2>
              <p className="text-xs text-muted-foreground">
                Sanitized audit records tracing every block creation, review, approval, rejection, and conflict override.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-card border rounded-lg px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">All Actions</option>
                <option value="BLOCK_APPROVED">BLOCK_APPROVED</option>
                <option value="BLOCK_REJECTED">BLOCK_REJECTED</option>
                <option value="BLOCK_CREATED">BLOCK_CREATED</option>
                <option value="CONFLICT_RESOLVED">CONFLICT_RESOLVED</option>
                <option value="DISRUPTION_CREATED">DISRUPTION_CREATED</option>
                <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-card border rounded-lg px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="CONTROLLER">CONTROLLER</option>
                <option value="PLANNER">PLANNER</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={loadAuditLogs}
                disabled={isLoadingAudit}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`size-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {auditLogs.length > 0 ? (
            <div className="space-y-2.5">
              {auditLogs.map((log) => {
                const isExpanded = expandedLogId === log.auditId
                return (
                  <Card key={log.auditId} className="border-border/60 bg-card/60 transition-all">
                    <div
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.auditId)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            log.action.includes('APPROVED')
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : log.action.includes('REJECTED')
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {log.action}
                        </Badge>
                        <div>
                          <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                            <span>{log.userName}</span>
                            <span className="text-[10px] text-muted-foreground">({log.role})</span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[11px] font-mono text-primary">
                              {log.entityType}: {log.entityId}
                            </span>
                          </div>
                          {log.reason && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              <strong>Reason:</strong> {log.reason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                        </span>
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 border-t bg-muted/20 text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-semibold text-muted-foreground">Audit ID:</span>{' '}
                            <span className="font-mono">{log.auditId}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Client IP:</span>{' '}
                            <span className="font-mono">{log.ipAddress || '127.0.0.1'}</span>
                          </div>
                        </div>

                        {log.previousState && (
                          <div>
                            <div className="font-semibold text-muted-foreground mb-1">Previous State:</div>
                            <pre className="p-2 rounded bg-background border font-mono text-[10px] overflow-x-auto">
                              {JSON.stringify(log.previousState, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.newState && (
                          <div>
                            <div className="font-semibold text-muted-foreground mb-1">New State:</div>
                            <pre className="p-2 rounded bg-background border font-mono text-[10px] overflow-x-auto">
                              {JSON.stringify(log.newState, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="py-12 border rounded-xl text-center space-y-3 bg-card">
              <FileClock className="size-8 text-muted-foreground mx-auto" />
              <div className="text-sm font-semibold">No Audit Records Matching Filter</div>
              <p className="text-xs text-muted-foreground">
                Audit entries are recorded automatically on task creation, block sanctioning, and conflict overrides.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Four-Eyes Safeguards */}
      {activeTab === 'safeguards' && (
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary" />
                Active Safety & Governance Safeguards
              </CardTitle>
              <CardDescription className="text-xs">
                Deterministic security rules enforced at both API route and database levels to prevent human error.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl bg-card/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="font-semibold text-sm">Four-Eyes Approval Safeguard</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A planner or engineering officer who proposes a maintenance block is strictly prohibited from approving it. Approval requires independent Controller or Admin sanction.
                  </p>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    HTTP 403 SelfApprovalProhibited
                  </Badge>
                </div>

                <div className="p-4 border rounded-xl bg-card/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="font-semibold text-sm">Blocking Conflict Invariance</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Blocks with active timetable passenger train conflicts or overlapping section sanctions cannot be approved. Officers must resolve conflicts or adjust windows first.
                  </p>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                    HTTP 409 ConflictError
                  </Badge>
                </div>

                <div className="p-4 border rounded-xl bg-card/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="font-semibold text-sm">Mandatory Rejection Documentation</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Whenever an officer rejects a proposed block, an operational rationale (e.g. Vande Bharat punctuality, heavy freight rush) must be documented in the permanent audit trail.
                  </p>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                    HTTP 400 RejectionReasonRequired
                  </Badge>
                </div>

                <div className="p-4 border rounded-xl bg-card/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="font-semibold text-sm">Safe Backlog State Reversion</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When a block is rejected, all bundled maintenance tasks are automatically reverted to the Open backlog and their scheduled dates are cleared safely.
                  </p>
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                    Atomic State Synchronization
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

