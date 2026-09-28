"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, RefreshCcw, ExternalLink, Package } from "lucide-react";
import {
  type VehicleModel,
  type VehicleSpec,
  type Rates,
  priceVehicle,
  STAGE_LABELS,
  VEHICLE_STAGES,
  naira,
} from "@/lib/vehicles/policy";
import "./vehicles-admin.css";

type Order = {
  id: string;
  vehicleName: string;
  quantity: number;
  customerName: string;
  email: string;
  phone: string;
  destination: string;
  notes: string | null;
  status: string;
  eta: string | null;
  createdAt: string;
  invoice: {
    invoiceNumber: string;
    grandTotal: string;
    balanceDue: string;
    paymentClaims: {
      pidClaim: string;
      claimedAmount: string;
      status: string;
      paymentReference: string | null;
      note: string | null;
    }[];
  } | null;
  proofs: { id: string; claimId: string }[];
  events: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
    notifications: {
      id: string;
      channel: string;
      status: string;
      attempts: number;
      lastError: string | null;
    }[];
  }[];
};
const freshVariant = (): VehicleSpec => ({
  id: crypto.randomUUID(),
  name: "New configuration",
  manufacturerRmb: null,
  lengthMm: null,
  widthMm: null,
  heightMm: null,
  batteryKwh: null,
  rangeKm: null,
  rangeStandard: "",
  seats: null,
  cargoM3: null,
  priceConfirmed: false,
  specificationsConfirmed: false,
  source: "",
});
export default function VehicleAdminWorkspace() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState({ search: "", status: "" });
  const [tab, setTab] = useState("orders");
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rates, setRates] = useState<Rates>({ ngnPerRmb: 0, ngnPerCbm: 0 });
  const [edit, setEdit] = useState<VehicleModel | null>(null);
  const [orderId, setOrderId] = useState("");
  const order = orders.find((o) => o.id === orderId);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetch("/api/vehicles/catalogue"),
        fetch("/api/vehicles/orders"),
      ]);
      const [c, o] = await Promise.all(responses.map((r) => r.json()));
      if (responses.some((r) => !r.ok))
        throw new Error(c.message || o.message || "Unable to load vehicles.");
      setModels(c.models);
      setRates(c.rates);
      setOrders(o.orders);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(url: string, body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Unable to save.");
      setNotice("Saved successfully.");
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function uploadImages(files: FileList | null) {
    if (!files || !edit) return;
    setBusy(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 10)) {
        const body = new FormData();
        body.set("image", file);
        const response = await fetch("/api/vehicles/media", {
          method: "POST",
          body,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        urls.push(result.url);
      }
      setEdit((model) =>
        model ? { ...model, images: [...model.images, ...urls] } : model,
      );
      setNotice("Photos uploaded. Save the model to publish these changes.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const updateVariant = (index: number, patch: Partial<VehicleSpec>) =>
    setEdit((m) =>
      m
        ? {
            ...m,
            variants: m.variants.map((v, i) =>
              i === index ? { ...v, ...patch } : v,
            ),
          }
        : m,
    );
  const filteredOrders = orders.filter(
    (o) =>
      (!filter.status || o.status === filter.status) &&
      `${o.id} ${o.vehicleName} ${o.customerName} ${o.email}`
        .toLowerCase()
        .includes(filter.search.toLowerCase().trim()),
  );
  return (
    <main className="va-workspace">
      <div className="va-heading">
        <div>
          <h1>Vehicle Requests</h1>
          <p>Review vehicle enquiries, quotations, payments and shipments.</p>
        </div>
        <div className="va-header-actions">
          <div className="va-count">
            {filteredOrders.length}{" "}
            {filter.search || filter.status ? "Matching" : "Total"} Requests
          </div>
          <a
            href="https://sureimports.com/cars"
            target="_blank"
            rel="noreferrer"
            className="va-secondary"
          >
            Open storefront <ExternalLink size={16} />
          </a>
        </div>
      </div>
      <div className="va-stats">
        <div>
          <small>Requests loaded</small>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <small>Awaiting quotation</small>
          <strong>{orders.filter((o) => o.status === "ENQUIRY").length}</strong>
        </div>
        <div>
          <small>Payments to review</small>
          <strong>
            {orders.reduce(
              (n, o) =>
                n +
                (o.invoice?.paymentClaims.filter(
                  (c) => c.status === "PENDING_CONFIRMATION",
                ).length || 0),
              0,
            )}
          </strong>
        </div>
        <div>
          <small>Manufacturer × 1.2 × RMB rate</small>
          <strong>₦{rates.ngnPerRmb}/RMB</strong>
          <Link href="/dashboard/exchange-rates">Manage central rates ↗</Link>
        </div>
      </div>
      <div className="va-tabs">
        <button
          aria-pressed={tab === "orders"}
          onClick={() => setTab("orders")}
        >
          Orders & enquiries
        </button>
        <button
          aria-pressed={tab === "catalogue"}
          onClick={() => setTab("catalogue")}
        >
          Vehicle catalogue
        </button>
      </div>
      {error && (
        <p className="va-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="va-notice" role="status">
          {notice}
        </p>
      )}
      {loading && <p>Loading vehicle workspace…</p>}
      {tab === "catalogue" && (
        <>
          <div className="va-toolbar">
            <p>
              Shipping: {naira(rates.ngnPerCbm)}/CBM, including clearing, duties
              and taxes.
            </p>
            <button
              disabled={busy}
              className="va-secondary"
              onClick={() =>
                action("/api/vehicles/catalogue", { action: "import" })
              }
            >
              Import supplied Ruichi catalogue
            </button>
            <button
              className="va-primary"
              onClick={() =>
                setEdit({
                  slug: "",
                  name: "",
                  category: "Cargo vans",
                  powertrain: "Electric",
                  description: "",
                  images: [],
                  youtubeUrls: [],
                  published: false,
                  variants: [freshVariant()],
                })
              }
            >
              Add model
            </button>
          </div>
          <div className="va-models">
            {models.map((m) => (
              <button
                key={m.slug}
                className="va-model"
                onClick={() => setEdit(structuredClone(m))}
              >
                <span>{m.published ? "Published" : "Draft"}</span>
                <h3>{m.name}</h3>
                <p>
                  {m.variants.length} configurations · {m.category}
                </p>
                <small>
                  {
                    m.variants.filter(
                      (v) => v.priceConfirmed && v.specificationsConfirmed,
                    ).length
                  }{" "}
                  confirmed for quotation
                </small>
              </button>
            ))}
          </div>
          {edit && (
            <form
              className="va-panel"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await action("/api/vehicles/catalogue", { model: edit }))
                  setEdit(null);
              }}
            >
              <div className="va-heading">
                <h2>{edit.name || "New vehicle model"}</h2>
                <button
                  type="button"
                  className="va-secondary"
                  onClick={() => setEdit(null)}
                >
                  Close editor
                </button>
              </div>
              <div className="va-fields">
                <label>
                  Model name
                  <input
                    required
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </label>
                <label>
                  URL slug
                  <input
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    value={edit.slug}
                    onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
                  />
                </label>
                <label>
                  Category
                  <input
                    required
                    value={edit.category}
                    onChange={(e) =>
                      setEdit({ ...edit, category: e.target.value })
                    }
                  />
                </label>
                <label>
                  Powertrain
                  <select
                    value={edit.powertrain}
                    onChange={(e) =>
                      setEdit({ ...edit, powertrain: e.target.value })
                    }
                  >
                    {["Electric", "Hybrid", "Petrol", "Diesel"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Description
                <textarea
                  required
                  value={edit.description}
                  onChange={(e) =>
                    setEdit({ ...edit, description: e.target.value })
                  }
                />
              </label>
              <label>
                Upload vehicle photos
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => void uploadImages(e.target.files)}
                />
              </label>
              <div className="va-fields">
                <label>
                  Gallery URLs (one per line; local or Cloudinary)
                  <textarea
                    value={edit.images.join("\n")}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        images: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                  />
                </label>
                <label>
                  YouTube links (one per line)
                  <textarea
                    value={edit.youtubeUrls.join("\n")}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        youtubeUrls: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                  />
                </label>
              </div>
              <label className="va-check">
                <input
                  type="checkbox"
                  checked={edit.published}
                  onChange={(e) =>
                    setEdit({ ...edit, published: e.target.checked })
                  }
                />
                Publish this model in the storefront
              </label>
              <h2>Configurations</h2>
              {edit.variants.map((v, i) => {
                let price = null;
                try {
                  price = priceVehicle(v, rates);
                } catch {
                  /* Invalid input stays unpriced until corrected. */
                }
                return (
                  <fieldset key={v.id} className="va-variant">
                    <legend>{v.name}</legend>
                    <label>
                      Configuration name
                      <input
                        required
                        value={v.name}
                        onChange={(e) =>
                          updateVariant(i, { name: e.target.value })
                        }
                      />
                    </label>
                    <div className="va-fields">
                      {(
                        [
                          ["manufacturerRmb", "Manufacturer price (RMB)"],
                          ["lengthMm", "Exterior length (mm)"],
                          ["widthMm", "Exterior width (mm)"],
                          ["heightMm", "Exterior height (mm)"],
                          ["batteryKwh", "Battery (kWh)"],
                          ["rangeKm", "Stated range (km)"],
                          ["seats", "Seats"],
                          ["cargoM3", "Interior cargo capacity (m³)"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={v[key] ?? ""}
                            onChange={(e) =>
                              updateVariant(i, {
                                [key]:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      ))}
                      <label>
                        Range test standard
                        <input
                          value={v.rangeStandard}
                          onChange={(e) =>
                            updateVariant(i, { rangeStandard: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Supplier source / price reference
                        <input
                          value={v.source}
                          onChange={(e) =>
                            updateVariant(i, { source: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="va-check">
                      <input
                        type="checkbox"
                        checked={v.priceConfirmed}
                        onChange={(e) =>
                          updateVariant(i, { priceConfirmed: e.target.checked })
                        }
                      />
                      Manufacturer price confirmed
                    </label>
                    <label className="va-check">
                      <input
                        type="checkbox"
                        checked={v.specificationsConfirmed}
                        onChange={(e) =>
                          updateVariant(i, {
                            specificationsConfirmed: e.target.checked,
                          })
                        }
                      />
                      Configuration and exterior dimensions confirmed
                    </label>
                    <p className="va-price-preview">
                      {price
                        ? `${price.cbm.toFixed(3)} CBM · Vehicle ${naira(price.vehicleNgn)} + shipping ${naira(price.shippingNgn)} = ${naira(price.totalNgn)} estimated landed`
                        : "Complete the manufacturer price, exterior dimensions and central rates to calculate a price."}
                    </p>
                  </fieldset>
                );
              })}
              <div className="va-toolbar">
                <button
                  className="va-secondary"
                  type="button"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      variants: [...edit.variants, freshVariant()],
                    })
                  }
                >
                  Add configuration
                </button>
                <button className="va-primary" disabled={busy}>
                  Save model
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {tab === "orders" && (
        <>
          <form
            className="va-filters"
            onSubmit={(e) => {
              e.preventDefault();
              setFilter({ search, status });
              setOrderId("");
            }}
          >
            <label className="va-search">
              <span className="sr-only">Search vehicle requests</span>
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, vehicle or reference…"
              />
            </label>
            <label>
              <span className="sr-only">Filter by order stage</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All stages</option>
                {Object.entries(STAGE_LABELS)
                  .filter(([key]) => key !== "UPDATE")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className="va-primary">
              <Search size={16} />
              Search
            </button>
          </form>
          <div className="va-toolbar">
            <p>
              {filteredOrders.length} request
              {filteredOrders.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              className="va-secondary"
              onClick={() => void load()}
              disabled={loading || busy}
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              Sync
            </button>
          </div>
          <div className="va-orders-layout" data-selected={!!order}>
            <div className="va-order-list">
              {!loading && !filteredOrders.length && (
                <div className="va-empty">
                  <Package size={48} />
                  <h2>No vehicle requests found</h2>
                  <p>
                    {filter.search || filter.status
                      ? "Try another search or choose all stages."
                      : "Customer vehicle requests will appear here."}
                  </p>
                </div>
              )}
              {filteredOrders.map((o) => (
                <button
                  key={o.id}
                  aria-pressed={o.id === orderId}
                  onClick={() => setOrderId(o.id)}
                >
                  <small>{STAGE_LABELS[o.status] || o.status}</small>
                  <strong>{o.vehicleName}</strong>
                  <span>
                    {o.customerName} · {o.quantity} vehicle(s)
                  </span>
                  <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
            {order && (
              <div>
                <section className="va-panel">
                  <p className="va-kicker">{order.id}</p>
                  <h2>{order.vehicleName}</h2>
                  <p>
                    {order.customerName} · {order.email} · {order.phone}
                  </p>
                  <p>{order.quantity} vehicle(s) · Arrival: Lagos</p>
                  {order.notes && <p>Customer note: {order.notes}</p>}
                  {order.status === "ENQUIRY" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void action(`/api/vehicles/orders/${order.id}`, {
                          action: "quote",
                          ...Object.fromEntries(f),
                        });
                      }}
                    >
                      <h3>Issue a Naira quotation</h3>
                      <p>
                        Uses confirmed catalogue prices and current central
                        rates. Values are frozen on this order.
                      </p>
                      <label>
                        Estimated delivery window
                        <input
                          name="eta"
                          required
                          placeholder="e.g. 8–12 weeks after payment confirmation"
                        />
                      </label>
                      <label>
                        Validity (hours)
                        <input
                          type="number"
                          name="validityHours"
                          min="1"
                          max="168"
                          defaultValue="24"
                          required
                        />
                      </label>
                      <label>
                        Confirmed configuration, availability, warranty and
                        delivery terms
                        <textarea
                          name="notes"
                          required
                          placeholder="Confirm the supplied vehicle, colour, charging equipment, support and delivery arrangements."
                        />
                      </label>
                      <button className="va-primary" disabled={busy}>
                        Issue quotation & invoice
                      </button>
                    </form>
                  )}
                  {order.invoice && (
                    <div>
                      <h3>Invoice {order.invoice.invoiceNumber}</h3>
                      <p>
                        Total: {naira(Number(order.invoice.grandTotal))} ·
                        Balance: {naira(Number(order.invoice.balanceDue))}
                      </p>
                      {order.invoice.paymentClaims.map((c) => (
                        <div className="va-payment" key={c.pidClaim}>
                          <strong>
                            {naira(Number(c.claimedAmount))} ·{" "}
                            {c.status.replaceAll("_", " ")}
                          </strong>
                          <p>Bank reference: {c.paymentReference}</p>
                          <p>{c.note}</p>
                          {order.proofs.find(
                            (p) => p.claimId === c.pidClaim,
                          ) && (
                            <a
                              href={`/api/vehicles/proofs/${order.proofs.find((p) => p.claimId === c.pidClaim)!.id}`}
                            >
                              Download private payment proof ↗
                            </a>
                          )}
                          {c.status === "PENDING_CONFIRMATION" && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const form = new FormData(e.currentTarget);
                                const decision = (
                                  e.nativeEvent as SubmitEvent
                                ).submitter?.getAttribute("value");
                                void action(
                                  `/api/invoicing/payment-claims/${c.pidClaim}/${decision}`,
                                  { reviewNote: form.get("reviewNote") },
                                );
                              }}
                            >
                              <label>
                                Review note / rejection reason
                                <input name="reviewNote" maxLength={2000} />
                              </label>
                              <label className="va-check">
                                <input type="checkbox" required />I have checked
                                this payment against the bank statement.
                              </label>
                              <div className="va-toolbar">
                                <button
                                  className="va-primary"
                                  disabled={busy}
                                  value="approve"
                                >
                                  Confirm bank credit
                                </button>
                                <button
                                  className="va-secondary"
                                  disabled={busy}
                                  value="reject"
                                >
                                  Reject with reason
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className="va-panel">
                  {["ENQUIRY", "QUOTED"].includes(order.status) && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const actionName = (
                          e.nativeEvent as SubmitEvent
                        ).submitter?.getAttribute("value");
                        void action(`/api/vehicles/orders/${order.id}`, {
                          action: actionName,
                          message: f.get("message"),
                        });
                      }}
                    >
                      <h2>Quotation management</h2>
                      <label>
                        Reason / confirmation of unchanged price and
                        availability
                        <textarea name="message" required maxLength={2000} />
                      </label>
                      <div className="va-toolbar">
                        {order.status === "QUOTED" && (
                          <button
                            value="extend"
                            className="va-secondary"
                            disabled={busy}
                          >
                            Extend original quote by 24 hours
                          </button>
                        )}
                        <button
                          value="cancel"
                          className="va-secondary"
                          disabled={busy}
                        >
                          Cancel unpaid request
                        </button>
                      </div>
                      <p>
                        Received or pending payments must be reconciled before
                        cancellation. Extending a quote keeps its original
                        price.
                      </p>
                    </form>
                  )}
                  <h2>Customer updates</h2>
                  {!["DELIVERED", "CANCELLED"].includes(order.status) && (
                    <form
                      key={order.id + order.status}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void action(`/api/vehicles/orders/${order.id}`, {
                          action: "update",
                          ...Object.fromEntries(new FormData(e.currentTarget)),
                        });
                      }}
                    >
                      <label>
                        Stage
                        <select name="status" defaultValue={order.status}>
                          <option value={order.status}>
                            Keep current stage — {STAGE_LABELS[order.status]}
                          </option>
                          {VEHICLE_STAGES[
                            VEHICLE_STAGES.indexOf(
                              order.status as (typeof VEHICLE_STAGES)[number],
                            ) + 1
                          ] &&
                            VEHICLE_STAGES.includes(
                              order.status as (typeof VEHICLE_STAGES)[number],
                            ) && (
                              <option
                                value={
                                  VEHICLE_STAGES[
                                    VEHICLE_STAGES.indexOf(
                                      order.status as (typeof VEHICLE_STAGES)[number],
                                    ) + 1
                                  ]
                                }
                              >
                                {
                                  STAGE_LABELS[
                                    VEHICLE_STAGES[
                                      VEHICLE_STAGES.indexOf(
                                        order.status as (typeof VEHICLE_STAGES)[number],
                                      ) + 1
                                    ]
                                  ]
                                }
                              </option>
                            )}
                        </select>
                      </label>
                      <label>
                        Delivery estimate
                        <input name="eta" defaultValue={order.eta || ""} />
                      </label>
                      <label>
                        Customer-visible update
                        <textarea name="message" required maxLength={4000} />
                      </label>
                      <button disabled={busy} className="va-primary">
                        Publish update & notify customer
                      </button>
                    </form>
                  )}
                  <div
                    key={order.id}
                    className="va-update-history"
                    role="region"
                    aria-label="Customer update history"
                    tabIndex={0}
                  >
                    {order.events.map((ev) => (
                      <article className="va-event" key={ev.id}>
                        <small>{new Date(ev.createdAt).toLocaleString()}</small>
                        <h3>{STAGE_LABELS[ev.type] || ev.type}</h3>
                        <p>{ev.message}</p>
                        <div>
                          {ev.notifications.map((n) => (
                            <p key={n.id} className="va-delivery">
                              {n.channel}: {n.status} · {n.attempts} attempts
                              {n.lastError ? ` — ${n.lastError}` : ""}
                            </p>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  <button
                    disabled={busy}
                    className="va-secondary"
                    onClick={() =>
                      action(`/api/vehicles/orders/${order.id}`, {
                        action: "retry",
                      })
                    }
                  >
                    Retry failed notifications
                  </button>
                </section>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
