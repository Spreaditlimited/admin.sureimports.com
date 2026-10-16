"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Quote = {
  feePercent: string;
  token: string;
  amounts: { currency: string; gross: string; fee: string; net: string }[];
};
export default function CancellationPanel({
  pidOrder,
  admin = false,
  onCancelled,
}: {
  pidOrder: string;
  admin?: boolean;
  onCancelled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [chargeFee, setChargeFee] = useState(!admin);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [revision, setRevision] = useState(0);
  const endpoint = admin
    ? "/api/procurement/cancellation"
    : "/api/crud/procurement-cancel-order";
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setQuote(null);
    setConfirmed(false);
    setError("");
    fetch(
      `${endpoint}?pidOrder=${encodeURIComponent(pidOrder)}&chargeFee=${chargeFee}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.message);
        return data;
      })
      .then(setQuote)
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error.message || "Unable to load cancellation amounts.");
      });
    return () => controller.abort();
  }, [open, chargeFee, pidOrder, endpoint, revision]);
  async function cancel() {
    if (!quote || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pidOrder,
          chargeFee,
          confirmed,
          token: quote.token,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setConfirmed(false);
        throw Error(data.message);
      }
      setDone(true);
      onCancelled?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Refresh the order and refund balance before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  const sectionClass = admin
    ? "rounded-lg border border-border bg-card p-5 text-foreground shadow-sm sm:p-6"
    : "border-t border-slate-100 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white";
  const secondaryButtonClass =
    "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
  if (done)
    return (
      <section role="status" className={sectionClass}>
        <p className="font-semibold">
          Order cancelled. The refund balance has been credited.
        </p>
        <Link
          className="mt-3 inline-flex text-primary underline"
          href="/dashboard/refunds"
        >
          View refunds
        </Link>
      </section>
    );
  return (
    <section className={sectionClass} aria-label="Cancel order">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold tracking-tight">
            Order cancellation
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {admin
              ? "Review the refund and choose whether to apply the cancellation fee."
              : "Review the cancellation fee and the amount that will be credited to your refund balance."}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            className={`${secondaryButtonClass} shrink-0`}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            Review cancellation
          </button>
        )}
      </div>
      {open && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <p className="text-sm leading-6 text-muted-foreground">
            {admin
              ? "Cancellation immediately credits the customer’s refund balance."
              : "Cancellation immediately credits your refund balance. You can request a payout from Refunds or transfer an eligible balance to your wallet."}
          </p>
          {admin && (
            <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-6">
              <input
                className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                type="checkbox"
                checked={chargeFee}
                disabled={busy}
                onChange={(event) => {
                  setQuote(null);
                  setConfirmed(false);
                  setChargeFee(event.target.checked);
                }}
              />
              Charge the configured cancellation fee
            </label>
          )}
          {quote ? (
            <div className="space-y-3">
              {quote.amounts.map((amount) => (
                <dl
                  key={amount.currency}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 rounded-lg border border-border bg-background p-4 text-sm"
                >
                  <dt>Refundable payment</dt>
                  <dd className="text-right tabular-nums">
                    {amount.currency} {amount.gross}
                  </dd>
                  <dt>Cancellation fee ({quote.feePercent}%)</dt>
                  <dd className="text-right tabular-nums">
                    −{amount.currency} {amount.fee}
                  </dd>
                  <dt className="border-t border-border pt-3 font-semibold">
                    Refund credit
                  </dt>
                  <dd className="border-t border-border pt-3 text-right font-semibold tabular-nums">
                    {amount.currency} {amount.net}
                  </dd>
                </dl>
              ))}
              <label className="flex items-start gap-3 text-sm leading-6">
                <input
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  I confirm cancellation and the {quote.feePercent}% fee shown
                  above. The order cannot be restored.
                </span>
              </label>
            </div>
          ) : (
            !error && (
              <p role="status" className="text-sm text-muted-foreground">
                Calculating refund…
              </p>
            )
          )}
          {error && (
            <div role="alert" className="text-sm text-destructive">
              <p>{error}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRevision((value) => value + 1)}
                className="mt-2 underline"
              >
                Refresh cancellation amounts
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 items-stretch gap-3 border-t border-border pt-5 sm:grid-cols-[repeat(2,minmax(0,12rem))] sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className={secondaryButtonClass}
            >
              Keep order
            </button>
            <button
              type="button"
              disabled={!quote || !confirmed || busy}
              onClick={cancel}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-transparent bg-destructive px-4 py-2.5 text-center text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Cancelling…" : "Confirm cancellation"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
