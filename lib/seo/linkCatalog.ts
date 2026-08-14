import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { normalizeLinkableUrl } from "@/lib/seo/linkPolicy"

export interface SeoLinkCatalogItem {
  label: string
  url: string
  useWhen: string
}

export const systemSeoLinkCatalog: SeoLinkCatalogItem[] = [
  {
    label: "Supplier Intelligence",
    url: "/supplier-intelligence",
    useWhen:
      "Readers need supplier leads, product category research, supplier checks, quote review, invoice review, or help reducing supplier risk before payment. Prioritize this link in most China sourcing and importing articles where it fits naturally.",
  },
  {
    label: "Corporate Sourcing",
    url: "/corporate-sourcing",
    useWhen:
      "Readers need Sure Imports to find suppliers, compare manufacturers, handle bulk sourcing, custom production, product comparison, or quote/cost review.",
  },
  {
    label: "Buy From Chinese Websites",
    url: "/buy-from-chinese-websites",
    useWhen:
      "Readers already have product links from 1688, Taobao, Tmall or another Chinese website and need Sure Imports to buy on their behalf.",
  },
  {
    label: "LineScout",
    url: "https://linescout.sureimports.com/",
    useWhen:
      "Readers are sourcing machines, equipment, production lines, industrial tools, or technical machinery from China.",
  },
  {
    label: "Ship With Us",
    url: "/ship-with-us",
    useWhen:
      "Readers already have goods or a supplier and mainly need China-to-Nigeria shipping, warehouse receiving, consolidation, or freight support.",
  },
  {
    label: "Import Hub",
    url: "/import-from-china-to-nigeria",
    useWhen:
      "Readers need a broad learning path for importing from China to Nigeria, calculators, guides, tools and next steps.",
  },
]

interface LinkablePageRow {
  label: string
  url: string
}

export async function getSeoLinkCatalog(): Promise<SeoLinkCatalogItem[]> {
  const rows = await prisma.$queryRaw<LinkablePageRow[]>(
    Prisma.sql`
      SELECT label, url
      FROM seo_linkable_pages
      WHERE status = 'active'
      ORDER BY id ASC
    `,
  )

  const systemByUrl = new Map(
    systemSeoLinkCatalog.map((item) => [normalizeLinkableUrl(item.url), item]),
  )

  return rows.map((row) => {
    const systemItem = systemByUrl.get(normalizeLinkableUrl(row.url))
    return {
      label: row.label,
      url: row.url,
      useWhen: systemItem?.useWhen || "Use when this approved page is directly relevant to the reader.",
    }
  })
}

