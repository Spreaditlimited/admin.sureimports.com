import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { 
  BarChart3, 
  FileText, 
  Megaphone, 
  Users, 
  Globe, 
  Link2, 
  LayoutTemplate, 
  MousePointerClick,
  Calendar,
  Fingerprint,
  TrendingUp,
  Activity
} from "lucide-react"

import { isSuperAdminStatus } from "@/lib/accessControl"
import { verifyToken } from "@/lib/jwt"
import { getMarketingLeadAnalytics, type MarketingRange } from "@/lib/marketing/leadAnalytics"
import { prisma } from "@/lib/prisma"

const rangeOptions: Array<{ label: string; value: MarketingRange }> = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "All Time", value: "all" },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatDate(value?: Date | null) {
  if (!value) return "Unknown"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)
}

function shortUrl(value?: string | null) {
  if (!value) return "Direct / None"
  try {
    const url = new URL(value)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return value
  }
}

async function requireSuperAdminPageAccess() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  if (!token) redirect("/auth/login")

  const payload = verifyToken(token) as { pidUser?: string } | null
  if (!payload?.pidUser) redirect("/auth/login")

  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { userStatus: true },
  })

  if (!admin || !isSuperAdminStatus(admin.userStatus)) {
    redirect("/dashboard")
  }
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string
  value: number
  note: string
  icon: any
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-soft flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground font-mono">{formatNumber(value)}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="mt-4 pt-3 border-t border-border/50 text-[10px] leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  )
}

function BarList({
  title,
  items,
  icon: Icon
}: {
  title: string
  items: Array<{ label: string; value: number }>
  icon: any
}) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-soft flex flex-col">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-6">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h2>
      <div className="space-y-4 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 py-4">
             <Activity className="w-8 h-8 mb-2 opacity-50" />
             <p className="text-[10px] font-bold uppercase tracking-widest">No Telemetry Recorded</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={`${title}-${item.label}`} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-bold text-foreground pr-4">{item.label}</span>
                <span className="shrink-0 font-mono font-bold text-muted-foreground">{formatNumber(item.value)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default async function MarketingPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>
}) {
  await requireSuperAdminPageAccess()

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const analytics = await getMarketingLeadAnalytics(resolvedSearchParams.range)

  return (
    <main className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6 px-1">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Lead Acquisition Ledger</h1>
            <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              Marketing Operations Pipeline
            </p>
          </div>
        </div>

        {/* Temporal Range Toggle */}
        <div className="flex items-center bg-muted/30 border border-border rounded-lg p-1 shrink-0 overflow-x-auto">
          {rangeOptions.map((option) => {
            const isActive = analytics.range === option.value;
            return (
              <Link
                key={option.value}
                href={`/dashboard/marketing?range=${option.value}`}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-card text-primary shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Statistical Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        <MetricCard
          title="Total Inbound Leads"
          value={analytics.totals.totalLeads}
          note={`Gross captures via global popups within the ${analytics.rangeLabel.toLowerCase()} window.`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Unique Identities"
          value={analytics.totals.uniqueEmails}
          note="Deduplicated metric string filtering out multi-submissions."
          icon={Fingerprint}
        />
        <MetricCard
          title="Editorial Conversions"
          value={analytics.totals.blogLeads}
          note="Acquisitions originating from blog manuscripts and guides."
          icon={FileText}
        />
        <MetricCard
          title="Funnel Conversions"
          value={analytics.totals.siteLeads}
          note="Acquisitions originating from core service and catalog nodes."
          icon={BarChart3}
        />
      </div>

      {/* 3. Acquisition Vectors */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-1">
        <BarList title="Top Converting Topologies" items={analytics.topPages} icon={LayoutTemplate} />
        <BarList title="Primary Traffic Origins" items={analytics.topSources} icon={Globe} />
        <BarList title="Top Campaign Vectors" items={analytics.topCampaigns} icon={MousePointerClick} />
        <BarList title="Top External Referrers" items={analytics.topReferrers} icon={Link2} />
      </div>

      {/* 4. Telemetry Ledger Table */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden mx-1">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-primary" /> Acquisition Telemetry Log
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            Showing latest {analytics.recentLeads.length} successful captures
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 border-b border-border text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Subscriber Identity</th>
                <th className="px-6 py-4">Conversion Node</th>
                <th className="px-6 py-4">UTM Source</th>
                <th className="px-6 py-4">UTM Campaign</th>
                <th className="px-6 py-4">Referrer String</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics.recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground italic border-b border-dashed border-border/50 bg-muted/5">
                    No acquisition records discovered for the active temporal range.
                  </td>
                </tr>
              ) : (
                analytics.recentLeads.map((lead) => (
                  <tr key={lead.pidLead} className="hover:bg-muted/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground truncate max-w-[150px]">
                        {lead.firstName || "Unidentified User"}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {lead.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate font-medium text-foreground" title={lead.pathname || lead.pageUrl || "Unknown"}>
                        {lead.pathname || lead.pageUrl || "Unknown Path"}
                      </div>
                      <div className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-border bg-muted/50 text-muted-foreground">
                        {lead.pageType || "General"}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground text-[10px]">
                      {lead.utmSource || "Direct / Unknown"}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground text-[10px]">
                      {lead.utmCampaign || "No Campaign ID"}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground text-[10px]">
                      {shortUrl(lead.referrer)}
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground font-mono text-[10px]">
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar className="w-3 h-3" /> {formatDate(lead.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}