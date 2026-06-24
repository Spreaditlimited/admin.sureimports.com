import { prisma } from "@/lib/prisma"

export type MarketingRange = "7d" | "30d" | "90d" | "all"

const rangeLabels: Record<MarketingRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
}

function resolveRange(range?: string | null): MarketingRange {
  if (range === "7d" || range === "30d" || range === "90d" || range === "all") {
    return range
  }
  return "30d"
}

function getStartDate(range: MarketingRange) {
  if (range === "all") return null

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const start = new Date()
  start.setDate(start.getDate() - days)
  return start
}

function normalizeLabel(value?: string | null, fallback = "Unknown") {
  const clean = value?.trim()
  return clean || fallback
}

function compactPath(pathname?: string | null, pageUrl?: string | null) {
  if (pathname?.trim()) return pathname.trim()

  if (pageUrl) {
    try {
      const url = new URL(pageUrl)
      return url.pathname || "/"
    } catch {
      return pageUrl
    }
  }

  return "Unknown page"
}

function aggregate(
  leads: Array<{
    pathname: string | null
    pageUrl: string | null
    pageType: string | null
    utmSource: string | null
    utmCampaign: string | null
    referrer: string | null
  }>,
  getKey: (lead: (typeof leads)[number]) => string,
  limit = 10,
) {
  const counts = new Map<string, number>()

  for (const lead of leads) {
    const key = getKey(lead)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export async function getMarketingLeadAnalytics(inputRange?: string | null) {
  const range = resolveRange(inputRange)
  const startDate = getStartDate(range)
  const where = startDate ? { createdAt: { gte: startDate } } : {}

  const [totalLeads, sampledLeads, recentLeads] = await Promise.all([
    prisma.marketing_leads.count({ where }),
    prisma.marketing_leads.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        email: true,
        pathname: true,
        pageUrl: true,
        pageType: true,
        utmSource: true,
        utmCampaign: true,
        referrer: true,
        createdAt: true,
      },
    }),
    prisma.marketing_leads.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        pidLead: true,
        firstName: true,
        email: true,
        pageType: true,
        pathname: true,
        pageUrl: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        referrer: true,
        createdAt: true,
      },
    }),
  ])

  const uniqueEmails = new Set(sampledLeads.map((lead) => lead.email.toLowerCase())).size
  const blogLeads = sampledLeads.filter((lead) => lead.pageType === "blog").length
  const siteLeads = sampledLeads.filter((lead) => lead.pageType !== "blog").length

  return {
    range,
    rangeLabel: rangeLabels[range],
    totals: {
      totalLeads,
      uniqueEmails,
      blogLeads,
      siteLeads,
    },
    topPages: aggregate(sampledLeads, (lead) => compactPath(lead.pathname, lead.pageUrl)),
    topSources: aggregate(sampledLeads, (lead) => normalizeLabel(lead.utmSource, "Direct / unknown")),
    topCampaigns: aggregate(sampledLeads, (lead) => normalizeLabel(lead.utmCampaign, "No campaign")),
    topReferrers: aggregate(sampledLeads, (lead) => normalizeLabel(lead.referrer, "Direct / none")),
    recentLeads,
  }
}
