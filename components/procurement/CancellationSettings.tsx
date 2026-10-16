"use client";
import { useEffect, useState } from "react";
export default function CancellationSettings() {
  const [fee, setFee] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/procurement/cancellation-settings")
      .then(async (response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((data) => setFee(data.feePercent))
      .catch(() => setMessage("Unable to load cancellation settings."));
  }, []);
  return (
    <section className="max-w-2xl rounded-xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-semibold">Order cancellation fee</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Buy from Chinese websites: customers pay this fee when cancelling.
        Admins may waive it for each cancellation. The default is 2%.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const response = await fetch(
              "/api/procurement/cancellation-settings",
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feePercent: fee }),
              },
            );
            const data = await response.json();
            setMessage(data.message);
          } catch {
            setMessage("Unable to save. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm font-medium">
          Cancellation fee (%)
          <input
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            type="number"
            min="0"
            max="99.99"
            step="0.01"
            required
            className="mt-2 block w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          disabled={busy || fee === ""}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save cancellation fee"}
        </button>
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      </form>
    </section>
  );
}
