'use client';
import { useEffect, useState } from 'react';
import styles from './support.module.css';
type Report = {
  days: number;
  summary: Record<string, number | null>;
  daily: Array<{ date: string; conversations: number }>;
  workload: Array<{
    id: string;
    name: string;
    active: number;
    replies: number;
  }>;
};
const duration = (seconds: number | null) =>
  seconds === null
    ? '—'
    : seconds < 60
      ? '<1 min'
      : seconds < 3600
        ? `${Math.round(seconds / 60)} min`
        : `${(seconds / 3600).toFixed(1)} hr`;
export default function SupportReports({ revision }: { revision: number }) {
  const [days, setDays] = useState(30),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        if (!document.hidden) {
          const response = await fetch(`/api/support/reports?days=${days}`, {
            cache: 'no-store',
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          if (!controller.signal.aborted) {
            setReport(result);
            setError('');
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setError((error as Error).message);
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 30000);
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [days, revision, retry]);
  function download() {
    if (!report) return;
    const cell = (value: unknown) =>
      `"${String(value ?? '')
        .replace(/^[=+@-]/, (match) => "'" + match)
        .replace(/"/g, '""')}"`;
    const rows: unknown[][] = [
      ['Support report', `Last ${report.days} days`],
      ['Metric', 'Value'],
      ...Object.entries(report.summary),
      [],
      ['Date (UTC)', 'New conversations'],
      ...report.daily.map((d) => [d.date, d.conversations]),
      [],
      ['Admin', 'Current active assignments', 'Public replies in period'],
      ...report.workload.map((a) => [a.name, a.active, a.replies]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(cell).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `support-report-${report.days}-days.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className={styles.reports} aria-label="Support reporting">
      <div className={styles.reportToolbar}>
        <label>
          Reporting period
          <select
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setReport(null);
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <button type="button" onClick={download} disabled={!report}>
          Export CSV
        </button>
      </div>
      {error && (
        <p role="alert">
          {error}{' '}
          <button type="button" onClick={() => setRetry((v) => v + 1)}>
            Retry reports
          </button>
        </p>
      )}
      {!report && !error && <p role="status">Loading reports…</p>}
      {report && (
        <>
          <div className={styles.stats}>
            {[
              ['total', 'New conversations'],
              ['unanswered', 'Awaiting first reply'],
              ['resolved', 'Currently resolved'],
              ['backlog', 'All active conversations'],
            ].map(([key, label]) => (
              <div key={key}>
                <strong>{report.summary[key] || 0}</strong>
                <span>{label}</span>
                <small>
                  {key === 'backlog'
                    ? 'Across all dates'
                    : `Created in the last ${days} days`}
                </small>
              </div>
            ))}
          </div>
          <details className={styles.reportDetails}>
            <summary>Response times, daily volume and team workload</summary>
            <div className={styles.reportMetrics}>
              <p>
                Average first reply
                <strong>
                  {duration(report.summary.avgFirstResponseSeconds)}
                </strong>
              </p>
              <p>
                Average resolution
                <strong>{duration(report.summary.avgResolutionSeconds)}</strong>
              </p>
              <p>
                Unanswered for over 24 hours
                <strong>{report.summary.overdue || 0}</strong>
              </p>
            </div>
            <p className={styles.reportNote}>
              Response and resolution times use conversations created in this
              period and include nights and weekends. Resolution averages
              include currently resolved conversations. The 24-hour count and
              active assignments cover all dates.
            </p>
            <h3>Team workload</h3>
            <div className={styles.reportTable}>
              <table>
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Active assignments</th>
                    <th>Public replies in period</th>
                  </tr>
                </thead>
                <tbody>
                  {report.workload.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name || a.id}</td>
                      <td>{a.active}</td>
                      <td>{a.replies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>New conversations by day (UTC)</h3>
            <div className={styles.reportTable}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Conversations</th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.conversations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!report.daily.length && (
                <p>No new conversations in this period.</p>
              )}
            </div>
          </details>
        </>
      )}
    </section>
  );
}
