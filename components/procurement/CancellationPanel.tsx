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
  if (done)
    return (
      <section
        role="status"
        className="rounded-xl border border-border bg-card p-5 text-foreground"
      >
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
    <section
      className="rounded-xl border border-border bg-card p-5 text-foreground shadow-sm"
      aria-label="Cancel order"
    >
      <h3 className="font-semibold">Cancel order</h3>
      {!open ? (
        <button
          type="button"
          className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen(true)}
        >
          Review cancellation and refund
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {admin
              ? "Cancellation immediately credits the customer’s refund balance."
              : "Cancellation immediately credits your refund balance. You can request a payout from Refunds or transfer an eligible balance to your wallet."}
          </p>
          {admin && (
            <label className="flex items-center gap-3 text-sm">
              <input
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
                  className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-4 text-sm"
                >
                  <dt>Refundable payment</dt>
                  <dd className="text-right">
                    {amount.currency} {amount.gross}
                  </dd>
                  <dt>Cancellation fee ({quote.feePercent}%)</dt>
                  <dd className="text-right">
                    −{amount.currency} {amount.fee}
                  </dd>
                  <dt className="font-semibold">Refund credit</dt>
                  <dd className="text-right font-semibold">
                    {amount.currency} {amount.net}
                  </dd>
                </dl>
              ))}
              <label className="flex items-start gap-3 text-sm">
                <input
                  className="mt-1"
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
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Keep order
            </button>
            <button
              type="button"
              disabled={!quote || !confirmed || busy}
              onClick={cancel}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            >
              {busy ? "Cancelling…" : "Confirm cancellation"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
