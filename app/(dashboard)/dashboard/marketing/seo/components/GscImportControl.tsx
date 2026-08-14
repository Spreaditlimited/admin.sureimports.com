'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, Loader2, Play, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

type ImportRun = {
  pidRun: string
  startDate: string
  endDate: string
  rowCount: number
  status: string
  error?: string | null
  startedAt?: string | null
  completedAt?: string | null
  elapsedSeconds?: number
  percent?: number
  stage?: string
  ready?: boolean
}

type GscImportControlProps = {
  latestCompletedEndDate: string | null
  initialRun: ImportRun | null
}

function dateDaysAgo(days: number) {
  const value = new Date()
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}

function dayAfter(value: string | null) {
  if (!value) return dateDaysAgo(31)
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function formatElapsed(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export default function GscImportControl({
  latestCompletedEndDate,
  initialRun,
}: GscImportControlProps) {
  const router = useRouter()
  const latestAvailable = useMemo(() => dateDaysAgo(2), [])
  const suggestedStart = useMemo(() => {
    const nextDate = dayAfter(latestCompletedEndDate)
    return nextDate <= latestAvailable ? nextDate : dateDaysAgo(4)
  }, [latestAvailable, latestCompletedEndDate])
  const [startDate, setStartDate] = useState(suggestedStart)
  const [endDate, setEndDate] = useState(latestAvailable)
  const [run, setRun] = useState<ImportRun | null>(initialRun)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const running = Boolean(run && run.status === 'started' && !run.ready)

  useEffect(() => {
    if (!running || !run?.pidRun) return

    let stopped = false
    let timer: number | undefined
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/marketing/seo/gsc-import?pidRun=${encodeURIComponent(run.pidRun)}`,
          { cache: 'no-store' },
        )
        const result = (await response.json()) as ImportRun & { error?: string }
        if (!response.ok) throw new Error(result.error || 'Could not check the import status.')
        if (stopped) return

        setRun(result)
        setError('')
        if (result.ready) {
          router.refresh()
          return
        }
      } catch (pollError) {
        if (!stopped) {
          setError(pollError instanceof Error ? pollError.message : 'Could not check the import status.')
        }
      }

      if (!stopped) timer = window.setTimeout(poll, 3000)
    }

    timer = window.setTimeout(poll, 700)
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [run?.pidRun, running, router])

  async function startImport() {
    setStarting(true)
    setError('')
    try {
      const response = await fetch('/api/marketing/seo/gsc-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const result = (await response.json()) as ImportRun & {
        error?: string
        alreadyRunning?: boolean
      }
      if (!response.ok && !result.pidRun) {
        throw new Error(result.error || 'Could not start the GSC import.')
      }

      setRun({
        ...result,
        rowCount: Number(result.rowCount || 0),
        status: 'started',
        ready: false,
        percent: 8,
        stage: result.alreadyRunning
          ? 'Reconnected to the import already in progress'
          : 'Manual import accepted by the public service',
      })
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Could not start the GSC import.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <section className="mx-1 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Manual Search Console Import</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Import a chosen GSC date range and refresh SEO opportunities. This runs only when a super-admin clicks the button; it is not scheduled.
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            The job ID and progress are saved before processing starts. Refreshing this page reconnects to the same job, and this import does not call OpenAI.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Start date
            <input
              type="date"
              value={startDate}
              max={endDate}
              disabled={running || starting}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 font-mono text-xs font-medium normal-case tracking-normal text-foreground disabled:opacity-60"
            />
          </label>
          <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            End date
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={latestAvailable}
              disabled={running || starting}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 font-mono text-xs font-medium normal-case tracking-normal text-foreground disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            disabled={running || starting || !startDate || !endDate || startDate > endDate}
            onClick={startImport}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running || starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? 'Import Running' : starting ? 'Starting Import' : 'Import GSC Data'}
          </button>
        </div>
      </div>

      {run && (
        <div className={`mt-5 rounded-lg border p-4 ${run.status === 'failed' ? 'border-red-500/20 bg-red-500/10' : run.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-blue-500/20 bg-blue-500/10'}`}>
          <div className="flex items-start gap-3">
            {run.status === 'failed' ? (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : run.status === 'completed' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-600" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-foreground">{run.stage || 'Search Console import'}</p>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Number(run.rowCount || 0).toLocaleString()} rows · {formatElapsed(run.elapsedSeconds)}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {run.startDate} through {run.endDate} · Job ID {run.pidRun}
              </p>
              {run.status === 'started' && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-500/15">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width] duration-500"
                    style={{ width: `${Math.max(5, Number(run.percent || 8))}%` }}
                  />
                </div>
              )}
              {run.error && <p className="mt-2 text-xs text-red-700 dark:text-red-300">{run.error}</p>}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  )
}
