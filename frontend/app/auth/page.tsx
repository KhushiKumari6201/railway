'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  TrainFront,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  ArrowLeft,
  UserCheck,
  Layers,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, defaultOfficers } from '@/lib/auth-context'

function AuthCard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, login } = useAuth()

  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(defaultOfficers[0].id)
  const [email, setEmail] = useState<string>(defaultOfficers[0].email)
  const [password, setPassword] = useState<string>('ser•planner•2026')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  // Direct redirection if user is already signed in (no clicking required)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/command-center')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm animate-pulse">
          <TrainFront className="size-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800">Signing in to Railway Block Planner…</p>
        <p className="text-xs text-slate-500">Redirecting directly to Kharagpur Dashboard</p>
      </div>
    )
  }

  // When dropdown changes, update email field
  const handleSelectChange = (officerId: string) => {
    setSelectedOfficerId(officerId)
    const officer = defaultOfficers.find((o) => o.id === officerId)
    if (officer) {
      setEmail(officer.email)
      setErrorMsg('')
    }
  }

  // 1-Click Demo Login
  const handleContinueDemoOfficer = () => {
    const target = defaultOfficers.find((o) => o.id === selectedOfficerId) || defaultOfficers[0]
    setIsProcessing(true)
    setTimeout(() => {
      login(target, '/dashboard')
    }, 200)
  }

  // Standard Email/Password Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const trimmedEmail = email.trim()
    const trimmedPass = password.trim()

    if (!trimmedEmail || !trimmedPass) {
      setErrorMsg('Please enter both official email and password.')
      return
    }

    setIsProcessing(true)

    setTimeout(() => {
      const matched = defaultOfficers.find(
        (acc) => acc.email.toLowerCase() === trimmedEmail.toLowerCase()
      )

      if (!matched && !trimmedEmail.includes('@')) {
        setIsProcessing(false)
        setErrorMsg('Invalid officer credentials.')
        return
      }

      const officerToLogin = matched || {
        id: 'officer-custom',
        name: trimmedEmail.split('@')[0].toUpperCase(),
        cadre: 'IRTS',
        designation: 'Duty Block Planner',
        department: 'Operating Control',
        email: trimmedEmail,
        division: 'Kharagpur Division, SER',
        initials: 'IR',
        loginTime: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      }

      login(officerToLogin, '/command-center')
    }, 300)
  }

  return (
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl grid grid-cols-1 lg:grid-cols-12">
      
      {/* LEFT COLUMN: Railway Track Image + Information Overlay */}
      <div className="relative lg:col-span-6 bg-slate-950 p-5 sm:p-6 flex flex-col justify-between overflow-hidden lg:min-h-[520px] text-white">
        
        {/* Background Railway Track Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/railway-track-hero.jpg"
            alt="Indian Railways Track & OHE Corridor"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/45" />
          <div className="absolute inset-0 bg-blue-950/30 backdrop-blur-[1px]" />
        </div>

        {/* Top Info Header */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-sky-200 backdrop-blur-md">
            <Building2 className="size-3 text-sky-400" />
            <span>Kharagpur Division · SER</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              Automatic Block Planning System
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              AI-assisted corridor possession, maintenance bundling &amp; traffic regulation.
            </p>
          </div>
        </div>

        {/* Middle Information Cards */}
        <div className="relative z-10 my-4 space-y-2">
          <div className="rounded-xl border border-white/15 bg-slate-950/65 p-2.5 backdrop-blur-md space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
              <Layers className="size-3.5 text-sky-400 shrink-0" />
              <span>Cross-Department Normalization</span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              Unifies Track (TMS), Signalling (SMMS), and Traction (TDMS) into one coordinated backlog.
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-slate-950/65 p-2.5 backdrop-blur-md space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
              <span>83%+ Window Utilization</span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              Bundles concurrent engineering tasks into single corridor block windows to avoid train detention.
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-slate-950/65 p-2.5 backdrop-blur-md space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <ShieldCheck className="size-3.5 text-amber-400 shrink-0" />
              <span>Zero-Conflict Timetable Protection</span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              Validates headway, station interlocking and passenger timetable paths before planner approval.
            </p>
          </div>
        </div>

        {/* Bottom Division Tag */}
        <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-slate-400">
          <span>CRIS Railnet Secure Portal</span>
          <span className="font-mono text-slate-300">KGP Division Portal v2.4</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Clean Officer Login & Demo Selector */}
      <div className="lg:col-span-6 p-5 sm:p-6 flex flex-col justify-between space-y-4">
        <div>
          {/* Header */}
          <div className="space-y-1 mb-4">
            <div className="inline-flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs mb-1">
              <TrainFront className="size-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Railway Block Planner
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              AI-Assisted Maintenance &amp; Block Planning
            </p>
          </div>

          {errorMsg && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Officer Login Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Official Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="officer@ser.railnet.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs h-9 bg-white border-slate-200 focus:border-primary"
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-xs h-9 bg-white border-slate-200 focus:border-primary"
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full font-semibold text-xs h-9 bg-primary hover:bg-primary/95 text-white shadow-xs cursor-pointer mt-1"
            >
              {isProcessing ? 'Signing In…' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-3 text-center text-xs">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-slate-400 uppercase tracking-wider text-xs font-bold">
              OR
            </span>
          </div>

          {/* Demo Officer Selection Card (1-Click) */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <UserCheck className="size-4 text-primary" />
                <span>Demo Officer</span>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                1-Click Instant Login
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="demo-officer-select" className="text-xs font-medium text-slate-600 block">
                Select Officer
              </label>
              <select
                id="demo-officer-select"
                value={selectedOfficerId}
                onChange={(e) => handleSelectChange(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
              >
                {defaultOfficers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name} · {officer.cadre} ({officer.department.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              onClick={handleContinueDemoOfficer}
              disabled={isProcessing}
              className="w-full text-xs h-9 font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer gap-2"
            >
              <span>Continue as Demo Officer</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Return to Public Website */}
        <div className="pt-1.5 text-center border-t border-slate-100">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Public Website</span>
          </Link>
        </div>

      </div>

    </div>
  )
}

export default function AuthPage() {
  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden bg-slate-950 select-none">
      {/* FULL PAGE BACKGROUND: Indian Railways Train with Dark Light Overlay */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/train-hero.png"
          alt="Indian Railways Train Background"
          fill
          className="object-cover object-center scale-105"
          priority
        />
        {/* Dark Light Overlay with Backdrop Blur */}
        <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/40" />
      </div>

      {/* FOREGROUND CARD CONTAINER */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center max-h-full">
        <Suspense fallback={<div className="p-6 text-center text-xs text-white/80">Loading portal…</div>}>
          <AuthCard />
        </Suspense>

        <div className="mt-3 text-center text-xs text-slate-200/90 font-medium drop-shadow-md">
          Ministry of Railways &middot; South Eastern Railway
        </div>
      </div>
    </div>
  )
}
