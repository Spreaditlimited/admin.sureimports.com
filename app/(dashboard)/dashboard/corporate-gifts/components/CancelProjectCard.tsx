'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ban, TriangleAlert } from 'lucide-react';

interface CancelProjectCardProps {
  pidRequest: string;
  action: (formData: FormData) => Promise<void>;
}

export default function CancelProjectCard({
  pidRequest,
  action,
}: CancelProjectCardProps) {
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [reason, setReason] = useState('');

  const trimmedReason = useMemo(() => reason.trim(), [reason]);
  const canContinue = trimmedReason.length > 0;

  // Escape key listener for modals
  useEffect(() => {
    if (!isReasonModalOpen && !isConfirmModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReasonModalOpen(false);
        setIsConfirmModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isReasonModalOpen, isConfirmModalOpen]);

  return (
    <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-destructive">
            Cancel Project (Administrative Action)
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            This can be used at any stage. A cancellation reason is required and will be sent to the customer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsReasonModalOpen(true)}
          className="whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 focus:ring-offset-card shadow-sm"
        >
          Cancel Project
        </button>
      </div>

      {/* STEP 1: REASON MODAL */}
      {isReasonModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg overflow-hidden rounded-xl bg-card border border-border shadow-soft animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                <Ban className="h-6 w-6 text-destructive" />
              </div>
              
              <h3 className="mb-2 text-center text-xl font-bold text-foreground tracking-tight">
                Cancel Project
              </h3>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                Enter a clear cancellation reason. This message will be sent directly to the customer.
              </p>

              <div className="space-y-2">
                <label
                  htmlFor={`cancel-reason-${pidRequest}`}
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Cancellation Reason
                </label>
                <textarea
                  id={`cancel-reason-${pidRequest}`}
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Example: Supplier production capacity changed and timeline no longer meets delivery commitment."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent transition-colors custom-scrollbar"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsReasonModalOpen(false)}
                  className="flex-1 rounded-md bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => {
                    setIsReasonModalOpen(false);
                    setIsConfirmModalOpen(true);
                  }}
                  className="flex-1 rounded-md bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                >
                  Continue
                </button>
              </div>
              
            </div>
          </div>
        </div>
      ) : null}

      {/* STEP 2: CONFIRMATION MODAL */}
      {isConfirmModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`cancel-title-${pidRequest}`}
        >
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-xl bg-card border border-border shadow-soft animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                <TriangleAlert className="h-6 w-6 text-destructive" />
              </div>
              
              <h3
                id={`cancel-title-${pidRequest}`}
                className="mb-2 text-center text-xl font-bold text-foreground tracking-tight"
              >
                Confirm Cancellation
              </h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                The customer will receive this exact reason:
              </p>
              
              <div className="mb-6 rounded-md border border-border bg-muted/30 p-4 text-sm text-foreground italic shadow-inner">
                "{trimmedReason}"
              </div>

              <form action={action} className="flex gap-3">
                <input type="hidden" name="pidRequest" value={pidRequest} />
                <input type="hidden" name="status" value="Cancelled" />
                <input
                  type="hidden"
                  name="cancellationReason"
                  value={trimmedReason}
                />
                
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setIsReasonModalOpen(true);
                  }}
                  className="flex-1 rounded-md bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Edit Reason
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                >
                  Cancel Project
                </button>
                
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}