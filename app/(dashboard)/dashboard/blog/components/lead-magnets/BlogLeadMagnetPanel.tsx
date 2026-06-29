"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react"

interface LeadMagnet {
  pidMagnet: string
  status: string
  title: string
  offerHeadline: string | null
  description: string | null
  buttonText: string | null
  bullets: string[]
  recommendedCta: string | null
  sourceQuery: string | null
  updatedAt: string | null
}

function ctaLabel(value?: string | null) {
  if (!value) return "General procurement"
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function BlogLeadMagnetPanel({ pidBlog }: { pidBlog: string }) {
  const [leadMagnet, setLeadMagnet] = useState<LeadMagnet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!pidBlog) return

    let cancelled = false
    async function loadLeadMagnet() {
      setIsLoading(true)
      setError("")
      try {
        const response = await fetch(`/api/marketing/blog-lead-magnets?pidBlog=${encodeURIComponent(pidBlog)}`)
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || "Could not load lead magnet.")
        if (!cancelled) setLeadMagnet(data?.data || null)
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : "Could not load lead magnet.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadLeadMagnet()
    return () => {
      cancelled = true
    }
  }, [pidBlog])

  const generateLeadMagnet = async () => {
    if (!pidBlog || isGenerating) return
    setIsGenerating(true)
    setError("")
    try {
      const response = await fetch("/api/marketing/blog-lead-magnets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pidBlog }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Lead magnet generation failed.")
      setLeadMagnet(data?.data || null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Lead magnet generation failed.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="lg:col-span-12">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="flex flex-col gap-4 border-b border-border bg-muted/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Lead Magnet Generator</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Create the blog-specific offer that will power capture and Flodesk routing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateLeadMagnet}
            disabled={isGenerating || !pidBlog}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/15 disabled:cursor-wait disabled:opacity-75"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {leadMagnet ? (isGenerating ? "Regenerating" : "Regenerate") : isGenerating ? "Generating" : "Generate Lead Magnet"}
          </button>
        </div>

        {isGenerating && (
          <div className="border-b border-border px-6 py-3">
            <div className="overflow-hidden rounded-full bg-primary/10">
              <div className="h-1.5 w-1/2 animate-[lead-magnet-progress_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
            <style jsx>{`
              @keyframes lead-magnet-progress {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(220%);
                }
              }
            `}</style>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="animate-pulse rounded-lg border border-border bg-background p-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Loading lead magnet...
            </div>
          ) : leadMagnet ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      {leadMagnet.status}
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      CTA: {ctaLabel(leadMagnet.recommendedCta)}
                    </span>
                  </div>
                  <h4 className="mt-4 text-lg font-bold leading-tight text-foreground">{leadMagnet.title}</h4>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                    {leadMagnet.offerHeadline}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{leadMagnet.description}</p>
                </div>
                <div className="grid gap-2">
                  {leadMagnet.bullets?.map((item) => (
                    <div key={item} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-lg border border-border bg-background p-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Capture Button</p>
                <p className="mt-1 text-sm font-bold text-foreground">{leadMagnet.buttonText || "Send me the guide"}</p>
                <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Search Context</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{leadMagnet.sourceQuery || "No Search Console query attached."}</p>
              </aside>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              No lead magnet has been generated for this blog post yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
