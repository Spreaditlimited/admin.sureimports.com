"use client"

import { useFormStatus } from "react-dom"
import { CheckCircle2, Loader2 } from "lucide-react"

type ApplyDraftButtonProps = {
  label: string
}

export default function ApplyDraftButton({ label }: ApplyDraftButtonProps) {
  const { pending } = useFormStatus()

  return (
    <div className="min-w-[11rem] space-y-2">
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 hover:bg-emerald-500/15 disabled:cursor-wait disabled:opacity-80 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        {pending ? "Applying Draft" : label}
      </button>

      {pending ? (
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-full bg-emerald-500/10">
            <div className="h-1.5 w-1/2 animate-[apply-draft-progress_1.2s_ease-in-out_infinite] rounded-full bg-emerald-500" />
          </div>
          <p className="text-[10px] font-semibold leading-relaxed text-emerald-700 dark:text-emerald-300">
            Rewriting content, applying links and saving SEO updates...
          </p>
          <style jsx>{`
            @keyframes apply-draft-progress {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(220%);
              }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  )
}
