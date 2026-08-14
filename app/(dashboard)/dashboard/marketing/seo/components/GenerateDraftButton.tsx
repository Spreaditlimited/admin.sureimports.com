"use client"

import { useFormStatus } from "react-dom"
import { Loader2, Sparkles } from "lucide-react"

export default function GenerateDraftButton() {
  const { pending } = useFormStatus()

  return (
    <div className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/15 disabled:cursor-wait disabled:opacity-80"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {pending ? "Generating Draft" : "Generate Draft"}
      </button>
      {pending && (
        <div className="overflow-hidden rounded-full bg-primary/10">
          <div className="h-1.5 w-1/2 animate-[seo-progress_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
          <style jsx>{`
            @keyframes seo-progress {
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
      {!pending && (
        <p className="text-center text-[9px] leading-relaxed text-muted-foreground">
          Creates a reviewable SEO proposal. Nothing is published.
        </p>
      )}
    </div>
  )
}
