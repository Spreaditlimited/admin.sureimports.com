"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, MessageCircle, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import styles from "./report-layout.module.css";
import { ReportSelect, ReportDate } from "./ReportPickers";

type Lead = {
  id?: string;
  name: string;
  phone: string;
  site: string;
  status: string;
  clickId: string | null;
  notes: string;
  receivedAt: string;
};
type Count = { label: string; value: number };
type Report = {
  cards: { period: string; clicks: number; leads: number }[];
  totals: { clicks: number; sessions: number; measurable: number };
  leadCount: number;
  leadRecordCount: number;
  matched: number;
  trend: Count[];
  pages: Count[];
  sources: Count[];
  destinations: Count[];
  clicks: {
    id: string;
    site: string;
    path: string;
    service: string;
    placement: string;
    createdAt: string;
  }[];
  leads: Lead[];
  page: number;
  start: string;
  end: string;
  timezone: string;
};
const sites = ["sureimports", "linescout", "affiliate", "partner", "unknown"];
const labels: Record<string, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  sureimports: "Sure Imports",
  linescout: "LineScout",
  affiliate: "Affiliate",
  partner: "Partner",
  unknown: "Unknown / other",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
const blank = (): Lead => ({
  name: "",
  phone: "",
  site: "unknown",
  status: "NEW",
  clickId: "",
  notes: "",
  receivedAt: new Date(Date.now() + 3600000).toISOString().slice(0, 19),
});
function Breakdown({ title, rows }: { title: string; rows: Count[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {!rows.length ? (
        <p className={styles.muted}>No recorded clicks in this period.</p>
      ) : (
        rows.map((row) => (
          <div className={styles.bar} key={row.label}>
            <div>
              <span>{row.label}</span>
              <strong>{row.value.toLocaleString()}</strong>
            </div>
            <meter
              min={0}
              max={max}
              value={row.value}
              aria-label={`${row.label}: ${row.value} clicks`}
            />
          </div>
        ))
      )}
    </section>
  );
}
export default function WhatsAppReport({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [period, setPeriod] = useState("month"),
    [site, setSite] = useState(""),
    [audience, setAudience] = useState("sales");
  const [lookupInput, setLookupInput] = useState(""),
    [lookup, setLookup] = useState("");
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0),
    [lead, setLead] = useState<Lead | null>(null),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const modalOpen = !!lead;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled),input,select,textarea",
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modalOpen]);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (period === "custom" && (!from || !to)) {
        setLoading(false);
        setData(null);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams({
          period,
          site,
          audience,
          from,
          to,
          lookup,
          page: String(page),
        });
        const response = await fetch(`/api/marketing/whatsapp?${q}`, {
          signal,
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({
          error:
            "Unable to complete this request. Please refresh and try again.",
        }));
        if (!response.ok)
          throw Error(result.error || "You do not have access to this report.");
        setData(result);
      } catch (e) {
        if (!signal.aborted) {
          setData(null);
          setError(
            e instanceof Error ? e.message : "Could not load the report.",
          );
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [period, site, audience, from, to, page, lookup],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refresh]);
  function open(value: Lead) {
    setFormError("");
    setLead(value);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!lead || saving) return;
    setSaving(true);
    setFormError("");
    try {
      const { id, name, phone, site, status, notes, clickId, receivedAt } =
        lead;
      const response = await fetch("/api/marketing/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          phone,
          site,
          status,
          notes,
          clickId: clickId || "",
          receivedAt: new Date(receivedAt + "+01:00").toISOString(),
        }),
      });
      const result = await response.json().catch(() => ({
        error: "Unable to complete this request. Please refresh and try again.",
      }));
      if (!response.ok)
        throw Error(result.error || "Could not save this lead.");
      toast.success(lead.id ? "Lead updated." : "Confirmed lead recorded.");
      setLead(null);
      setRefresh((v) => v + 1);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not save this lead.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }
  function download() {
    if (!data) return;
    const rows = [
      ["Date (Africa/Lagos)", "WhatsApp clicks"],
      ...data.trend.map((r) => [r.label, String(r.value)]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-clicks-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className={styles.root}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Marketing</span>
          <h1>WhatsApp performance</h1>
          <p>See contact intent and confirmed enquiries separately.</p>
        </div>
        <div className={styles.actions}>
          <button onClick={() => setRefresh((v) => v + 1)} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button onClick={download} disabled={!data || loading}>
            <Download size={16} />
            Export clicks
          </button>
          {canEdit && (
            <button className={styles.primary} onClick={() => open(blank())}>
              <Plus size={16} />
              Record lead
            </button>
          )}
        </div>
      </header>
      <section className={styles.filters} aria-label="Report filters">
        <div className={styles.field}>
          <span>Website</span>
          <ReportSelect
            label="Website"
            value={site}
            options={[
              { value: "", label: "All websites" },
              ...sites.map((s) => ({ value: s, label: labels[s] })),
            ]}
            onChange={(value) => {
              setSite(value);
              setPage(1);
            }}
          />
        </div>
        <div className={styles.field}>
          <span>Enquiry type</span>
          <ReportSelect
            label="Enquiry type"
            value={audience}
            options={[
              { value: "sales", label: "Sales enquiries" },
              { value: "support", label: "Customer support" },
            ]}
            onChange={(value) => {
              setAudience(value);
              setPage(1);
            }}
          />
        </div>
        <div className={styles.field}>
          <span>Period</span>
          <ReportSelect
            label="Period"
            value={period}
            options={[
              ...["today", "week", "month", "year"].map((p) => ({
                value: p,
                label: labels[p],
              })),
              { value: "custom", label: "Custom dates" },
            ]}
            onChange={(value) => {
              setPeriod(value);
              setPage(1);
            }}
          />
        </div>
        {period === "custom" && (
          <>
            <div className={styles.field}>
              <span>From</span>
              <ReportDate
                label="From date"
                value={from}
                onChange={(value) => {
                  setFrom(value);
                  setPage(1);
                }}
              />
            </div>
            <div className={styles.field}>
              <span>To</span>
              <ReportDate
                label="To date"
                value={to}
                onChange={(value) => {
                  setTo(value);
                  setPage(1);
                }}
              />
            </div>
          </>
        )}
        <p>
          Calendar periods · Africa/Lagos
          <br />
          Weeks start on Monday.
        </p>
      </section>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {loading ? (
        <div role="status" className={styles.empty}>
          Loading WhatsApp performance…
        </div>
      ) : !data ? (
        <div className={styles.empty}>Select dates to view this report.</div>
      ) : (
        <>
          <div className={styles.cards}>
            {data.cards.map((card) => (
              <section key={card.period} className={styles.panel}>
                <h2>{labels[card.period]}</h2>
                <strong className={styles.number}>
                  {card.clicks.toLocaleString()}
                </strong>
                <span className={styles.muted}>WhatsApp clicks</span>
                <div className={styles.leadCount}>
                  <MessageCircle size={17} />
                  <strong>{card.leads.toLocaleString()}</strong> confirmed{" "}
                  {audience === "support" ? "support contacts" : "leads"}
                </div>
              </section>
            ))}
          </div>
          <section className={styles.panel}>
            <h2>Selected period</h2>
            <div className={styles.summary}>
              <div>
                <strong>{data.totals.clicks}</strong>
                <span>Clicks</span>
              </div>
              <div>
                <strong>{data.leadCount}</strong>
                <span>
                  Confirmed{" "}
                  {audience === "support" ? "support contacts" : "leads"}
                </span>
              </div>
              <div>
                <strong>{data.totals.sessions}</strong>
                <span>Measured sessions*</span>
              </div>
              <div>
                <strong>{data.matched}</strong>
                <span>Clicks linked to a confirmed enquiry</span>
              </div>
              <div>
                <strong>
                  {data.totals.clicks
                    ? ((data.matched / data.totals.clicks) * 100).toFixed(1) +
                      "%"
                    : "—"}
                </strong>
                <span>Attributed click-to-enquiry rate</span>
              </div>
            </div>
            <p className={styles.muted}>
              *Sessions are measured only where analytics consent is available.
              Clicks are not people or messages. Staff record confirmed
              enquiries; unlinked enquiries are excluded from the conversion
              rate. Repeated messages from one number do not create new leads
              for the same website.
            </p>
          </section>
          <div className={styles.grid}>
            <Breakdown title="Top pages" rows={data.pages} />
            <Breakdown title="Traffic sources" rows={data.sources} />
            <Breakdown
              title="Contact destinations and buttons"
              rows={data.destinations}
            />
            <section className={styles.panel}>
              <h2>Daily activity</h2>
              <div className={styles.trend}>
                {data.trend.length ? (
                  data.trend.map((row) => (
                    <div key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value} clicks</strong>
                    </div>
                  ))
                ) : (
                  <p className={styles.muted}>
                    Your first recorded click will appear here.
                  </p>
                )}
              </div>
            </section>
          </div>
          <section className={styles.panel}>
            <h2>
              {lookup
                ? "Matching contacts — all dates and statuses"
                : "Confirmed enquiries"}
            </h2>
            <form
              className={styles.leadSearch}
              onSubmit={(e) => {
                e.preventDefault();
                setLookup(lookupInput);
                setPage(1);
              }}
            >
              <label htmlFor="whatsapp-lead-search">
                Find an existing lead
              </label>
              <div className={styles.leadSearchRow}>
                <input
                  id="whatsapp-lead-search"
                  type="search"
                  placeholder="Name or international phone number"
                  maxLength={80}
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                />
              <div className={styles.leadSearchButtons}>
              <button type="submit" className={styles.primary}>Search leads</button>
              {lookup && (
                <button
                  type="button"
                  onClick={() => {
                    setLookup("");
                    setLookupInput("");
                    setPage(1);
                  }}
                >
                  Clear search
                </button>
              )}
              </div>
              </div>
            </form>
            <h2 className={styles.srOnly}>
              Confirmed {audience === "support" ? "support contacts" : "leads"}
            </h2>
            <p className={styles.muted}>
              Record only enquiries your team has actually received. No
              automatic WhatsApp inbox connection is enabled.
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Website</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Attribution</th>
                    <th>
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.phone}</small>
                      </td>
                      <td>{labels[item.site]}</td>
                      <td>{item.status.toLowerCase()}</td>
                      <td>{date(item.receivedAt)}</td>
                      <td>
                        {item.clickId ? "Linked to click" : "Not attributed"}
                      </td>
                      <td>
                        {canEdit && (
                          <button
                            onClick={() =>
                              open({
                                ...item,
                                receivedAt: new Date(
                                  +new Date(item.receivedAt) + 3600000,
                                )
                                  .toISOString()
                                  .slice(0, 19),
                              })
                            }
                          >
                            Edit lead
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.leads.length && (
                <div className={styles.empty}>
                  <MessageCircle />
                  <h3>No confirmed enquiries in this period</h3>
                  <p>
                    Received a WhatsApp enquiry? Record it here to keep your
                    lead figures accurate.
                  </p>
                  {canEdit && (
                    <button onClick={() => open(blank())}>
                      Record a received enquiry
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
          <section className={styles.panel}>
            <h2>Recent WhatsApp clicks</h2>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Service</th>
                    <th>Button</th>
                    <th>Clicked</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clicks.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{labels[c.site]}</strong>
                        <small>{c.path}</small>
                      </td>
                      <td>{c.service}</td>
                      <td>{c.placement}</td>
                      <td>{date(c.createdAt)}</td>
                      <td>
                        <button
                          onClick={() =>
                            navigator.clipboard
                              .writeText("WA-" + c.id)
                              .then(() => toast.success("Reference copied."))
                              .catch(() =>
                                toast.error("Unable to copy the reference."),
                              )
                          }
                        >
                          Copy reference
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.clicks.length && (
                <p className={styles.empty}>
                  No recorded clicks yet. Local tests are excluded.
                </p>
              )}
            </div>
          </section>
          <nav className={styles.actions} aria-label="Records pagination">
            <button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
              Previous
            </button>
            <span>Page {page} · 20 records per list</span>
            <button
              disabled={
                page * 20 >= Math.max(data.totals.clicks, data.leadRecordCount)
              }
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
      {lead && (
        <div
          className={styles.overlay}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !saving) setLead(null);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-lead-title"
            className={styles.dialog}
          >
            <header className={styles.heading}>
              <div>
                <h2 id="wa-lead-title">
                  {lead.id
                    ? "Edit confirmed lead"
                    : "Record a received enquiry"}
                </h2>
                <p>Only record someone who has contacted your team.</p>
              </div>
              <button
                aria-label="Close"
                disabled={saving}
                onClick={() => setLead(null)}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={save}>
              <div className={styles.formGrid}>
                <label>
                  Name
                  <input
                    autoFocus
                    required
                    maxLength={120}
                    value={lead.name}
                    onChange={(e) => setLead({ ...lead, name: e.target.value })}
                  />
                </label>
                <label>
                  WhatsApp number
                  <input
                    required
                    type="tel"
                    placeholder="+2348031234567"
                    value={lead.phone}
                    onChange={(e) =>
                      setLead({ ...lead, phone: e.target.value })
                    }
                  />
                </label>
                <div className={styles.field}>
                  <span>Website</span>
                  <ReportSelect
                    label="Website"
                    value={lead.site}
                    options={sites.map((s) => ({ value: s, label: labels[s] }))}
                    onChange={(value) => {
                      setLead({ ...lead, site: value });
                    }}
                  />
                </div>
                <div className={styles.field}>
                  <span>Status</span>
                  <ReportSelect
                    label="Status"
                    value={lead.status}
                    options={[
                      "NEW",
                      "QUALIFIED",
                      "WON",
                      "LOST",
                      "SUPPORT",
                      "INVALID",
                    ].map((s) => ({
                      value: s,
                      label:
                        s === "INVALID"
                          ? "Recorded in error"
                          : s.charAt(0) + s.slice(1).toLowerCase(),
                    }))}
                    onChange={(value) => {
                      setLead({ ...lead, status: value });
                    }}
                  />
                </div>
                <div className={styles.field}>
                  <span>Enquiry received (Africa/Lagos)</span>
                  <ReportDate
                    label="Enquiry received"
                    value={lead.receivedAt}
                    withTime
                    onChange={(value) =>
                      setLead({ ...lead, receivedAt: value })
                    }
                  />
                </div>
                <label>
                  Click reference (optional)
                  <input
                    placeholder="WA-… from the message"
                    value={lead.clickId || ""}
                    onChange={(e) =>
                      setLead({ ...lead, clickId: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Notes
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={lead.notes}
                  onChange={(e) => setLead({ ...lead, notes: e.target.value })}
                />
              </label>
              {formError && (
                <p role="alert" className={styles.error}>
                  {formError}
                </p>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setLead(null)}
                >
                  Cancel
                </button>
                <button className={styles.primary} disabled={saving}>
                  {saving ? "Saving…" : "Save confirmed lead"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
