'use client';

import { useState } from 'react';

type FingerprintResponse = {
  ok?: boolean;
  databaseName?: string | null;
  hostName?: string | null;
  corporateGiftCount?: number;
  runtime?: {
    nodeEnv?: string | null;
    vercelEnv?: string | null;
  };
  error?: string;
  message?: string;
};

export default function DbFingerprintPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FingerprintResponse | null>(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/debug/db-fingerprint', {
        method: 'GET',
        cache: 'no-store',
      });
      const data = (await res.json()) as FingerprintResponse;
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch fingerprint',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-amber-800 dark:text-amber-300">
          DB Fingerprint Debug
        </div>
        <button
          type="button"
          onClick={runCheck}
          disabled={loading}
          className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
        >
          {loading ? 'Checking...' : 'Check DB Fingerprint'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-white/70 p-3 text-xs dark:bg-slate-900/60">
        {result
          ? JSON.stringify(result, null, 2)
          : 'Click the button to fetch runtime database info.'}
      </pre>
    </div>
  );
}
