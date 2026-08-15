import { createHash, randomBytes, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import {
  isSuperAdmin,
  requireAdmin,
  unauthorized,
} from '@/app/api/invoicing/_lib/invoicing'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

type ImportRunRow = {
  pidRun: string
  siteUrl: string
  startDate: Date
  endDate: Date
  rowCount: number
  status: string
  errorMessage: string | null
  startedAt: Date | null
  completedAt: Date | null
  updatedAt: Date | null
}

function validDate(value: unknown) {
  const date = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? null
    : date
}

function importServiceOrigin(localOverride?: unknown) {
  const requested = String(localOverride || '').trim()
  if (process.env.NODE_ENV !== 'production' && requested) {
    const localUrl = new URL(requested)
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
    if (!localHosts.has(localUrl.hostname) || (localUrl.protocol !== 'http:' && localUrl.protocol !== 'https:')) {
      throw new Error('The local public service origin must be an HTTP(S) localhost URL.')
    }
    return localUrl.origin
  }

  const configured = String(
    process.env.SUREIMPORTS_SITE_URL ||
      process.env.ROOT_URL ||
      'https://www.sureimports.com',
  ).trim()

  const url = new URL(configured)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The Search Console import service URL must use HTTP or HTTPS.')
  }
  return url.origin
}

async function createManualDispatchToken(input: {
  pidUser: string
  startDate: string
  endDate: string
}) {
  const pidToken = `GSCJOBTOKEN${randomUUID().replace(/-/g, '')}`
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  const now = new Date()

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO seo_manual_gsc_dispatch_tokens (
        pidToken, tokenHash, pidUser, startDate, endDate, status, expiresAt, createdAt, updatedAt
      ) VALUES (
        ${pidToken}, ${tokenHash}, ${input.pidUser},
        ${new Date(`${input.startDate}T00:00:00.000Z`)},
        ${new Date(`${input.endDate}T00:00:00.000Z`)},
        'pending', ${expiresAt}, ${now}, ${now}
      )
    `,
  )

  return { pidToken, token }
}

function elapsedSeconds(startedAt: Date | null) {
  return startedAt
    ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000))
    : 0
}

function statusPayload(run: ImportRunRow) {
  const elapsed = elapsedSeconds(run.startedAt)
  const completed = run.status === 'completed'
  const failed = run.status === 'failed'
  const percent = completed || failed
    ? 100
    : run.rowCount > 0
      ? 82
      : elapsed < 5
        ? 12
        : elapsed < 20
          ? 35
          : 60
  const stage = completed
    ? 'Import completed and SEO opportunities refreshed'
    : failed
      ? 'Import stopped with an error'
      : run.rowCount > 0
        ? 'GSC rows saved; refreshing SEO opportunities'
        : elapsed < 5
          ? 'Connecting securely to Google Search Console'
          : 'Downloading Search Console performance rows'

  return {
    pidRun: run.pidRun,
    siteUrl: run.siteUrl,
    startDate: run.startDate.toISOString().slice(0, 10),
    endDate: run.endDate.toISOString().slice(0, 10),
    rowCount: Number(run.rowCount || 0),
    status: run.status,
    error: run.errorMessage,
    startedAt: run.startedAt?.toISOString() || null,
    completedAt: run.completedAt?.toISOString() || null,
    updatedAt: run.updatedAt?.toISOString() || null,
    elapsedSeconds: elapsed,
    percent,
    stage,
    ready: completed || failed,
  }
}

async function getRun(pidRun: string) {
  const rows = await prisma.$queryRaw<ImportRunRow[]>(
    Prisma.sql`
      SELECT pidRun, siteUrl, startDate, endDate, rowCount, status, errorMessage,
             startedAt, completedAt, updatedAt
      FROM search_console_import_runs
      WHERE pidRun = ${pidRun}
      LIMIT 1
    `,
  )
  return rows[0] || null
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin || !isSuperAdmin(admin.userStatus)) return unauthorized()

  const body = await request.json().catch(() => null)
  const startDate = validDate(body?.startDate)
  const endDate = validDate(body?.endDate)
  if (!startDate || !endDate || startDate > endDate) {
    return NextResponse.json({ error: 'Choose a valid import date range.' }, { status: 400 })
  }

  const latestAvailable = new Date()
  latestAvailable.setUTCDate(latestAvailable.getUTCDate() - 2)
  if (endDate > latestAvailable.toISOString().slice(0, 10)) {
    return NextResponse.json(
      { error: 'Search Console data is available only through two days ago.' },
      { status: 400 },
    )
  }

  let serviceOrigin = ''
  let dispatch: { pidToken: string; token: string } | null = null
  try {
    serviceOrigin = importServiceOrigin(body?.serviceOrigin)
    dispatch = await createManualDispatchToken({ pidUser: admin.pidUser, startDate, endDate })
    const response = await fetch(`${serviceOrigin}/api/internal/seo/search-console-import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dispatch.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startDate, endDate }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok && !result?.pidRun) {
      throw new Error(result?.error || `The import service returned status ${response.status}.`)
    }

    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    if (dispatch) {
      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE seo_manual_gsc_dispatch_tokens
          SET status = 'cancelled', updatedAt = ${new Date()}
          WHERE pidToken = ${dispatch.pidToken}
            AND status = 'pending'
        `,
      ).catch(() => undefined)
    }
    const message = error instanceof Error ? error.message : 'Could not start the GSC import.'
    const serviceUnavailable = error instanceof TypeError || /fetch failed|timed out|abort/i.test(message)
    return NextResponse.json(
      {
        error: serviceUnavailable
          ? `The public SureImports import service is not reachable at ${serviceOrigin || 'the selected origin'}. Start that service or enter its current local origin on the SEO page. No import job was created.`
          : message,
      },
      { status: serviceUnavailable ? 503 : 502 },
    )
  }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin || !isSuperAdmin(admin.userStatus)) return unauthorized()

  const pidRun = String(request.nextUrl.searchParams.get('pidRun') || '').trim()
  if (!pidRun) return NextResponse.json({ error: 'Import run ID is required.' }, { status: 400 })

  const run = await getRun(pidRun)
  if (!run) return NextResponse.json({ error: 'Import run was not found.' }, { status: 404 })
  return NextResponse.json(statusPayload(run))
}
