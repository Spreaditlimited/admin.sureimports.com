"use client";

import React, { useDeferredValue, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Clock3,
  Copy,
  Eye,
  MessageCircle,
  Package,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Loader from "@/app/uix/Loader";
import ServiceOrderSearch from "@/app/(dashboard)/dashboard/components/ServiceOrderSearch";
import { useAuth } from "@/lib/AuthContext";
import { getTimeDifference } from "@/lib/getTimeDifference";
import { buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp";

import TableProcurementProducts from "./TableProcurementProducts";

interface Order {
  id: number;
  pidOrder: string;
  pidUser: string;
  orderName: string;
  destinationCountry: string;
  currencyType: string;
  shippingPlan: string;
  orderCategory: string;
  shippingAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  claimedByAdmin: {
    pidAdmin: string;
    adminName: string;
    claimedAt: string;
  } | null;
}

interface User {
  pidUser: string;
  userFirstname: string;
  userLastname: string;
  userEmail: string;
  gender: string;
  phone: string | number | null;
  address: string;
  country: string;
  userPhone: string | number | null;
  userCountry: string;
}

type WhatsAppContact = {
  display: string;
  digits: string;
  href: string;
};

function customerName(user: User) {
  return (
    [user.userFirstname, user.userLastname].filter(Boolean).join(" ").trim() ||
    user.userEmail ||
    "Customer"
  );
}

function whatsappContacts(order: Order): WhatsAppContact[] {
  const country = [order.user.userCountry, order.user.country]
    .filter(Boolean)
    .join(" ");
  const message = `Hello ${customerName(order.user)}, this is Sure Imports regarding your procurement order ${order.pidOrder}.`;
  const contacts = [order.user.userPhone, order.user.phone]
    .map((phone) => normalizeWhatsAppNumber(phone, country))
    .filter(
      (phone): phone is { display: string; digits: string } => phone !== null,
    );

  return Array.from(
    new Map(contacts.map((phone) => [phone.digits, phone])).values(),
  ).map((phone) => ({
    ...phone,
    href: buildWhatsAppUrl(phone.digits, message),
  }));
}

function statusLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function DetailItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children || (
        <span className="block break-words text-sm font-semibold text-foreground">
          {value || "N/A"}
        </span>
      )}
    </div>
  );
}

function WhatsAppLinks({ order }: { order: Order }) {
  const contacts = whatsappContacts(order);
  if (!contacts.length) {
    const rawNumbers = [order.user.userPhone, order.user.phone]
      .filter(Boolean)
      .join(" / ");
    return (
      <span className="break-words text-sm font-semibold">
        {rawNumbers || "N/A"}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {contacts.map((contact) => (
        <a
          key={contact.digits}
          href={contact.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-700 transition hover:border-emerald-500/50 hover:bg-emerald-500/15 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-emerald-300"
          aria-label={`Chat with ${customerName(order.user)} on WhatsApp at ${contact.display}`}
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="break-all">{contact.display}</span>
        </a>
      ))}
    </div>
  );
}

export default function OrdersBoxProcurement() {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState("");
  const [claimingOrderId, setClaimingOrderId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const status = useSearchParams().get("status") || "none";
  const { user } = useAuth();
  const canRunCleanup =
    user?.userStatus === "superadmin" || user?.userStatus === "L1";
  const selectedOrder = orders.find(
    (order) => order.pidOrder === selectedOrderId,
  );

  async function fetchOrders() {
    try {
      const params = new URLSearchParams({ status });
      if (deferredSearchQuery) params.set("search", deferredSearchQuery);
      const response = await fetch(`/api/get-data/order-many?${params}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.ok) setOrders(await response.json());
    } catch (error) {
      console.error("Error fetching procurement orders:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void fetchOrders();
    const intervalId = window.setInterval(() => void fetchOrders(), 15_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchOrders();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // fetchOrders intentionally follows the selected status filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, deferredSearchQuery]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedOrder && !dialog.open) dialog.showModal();
    if (!selectedOrder && dialog.open) dialog.close();
  }, [selectedOrder]);

  const closeWorkspace = () => {
    setSelectedOrderId("");
    if (dialogRef.current?.open) dialogRef.current.close();
  };

  const copyOrderId = async (pidOrder: string) => {
    try {
      await navigator.clipboard.writeText(pidOrder);
      setCopiedOrderId(pidOrder);
      toast.success(`Copied ${pidOrder}`);
      window.setTimeout(() => {
        setCopiedOrderId((current) => (current === pidOrder ? "" : current));
      }, 1600);
    } catch {
      toast.error("Unable to copy order ID");
    }
  };

  const claimOrder = async (pidOrder: string) => {
    setClaimingOrderId(pidOrder);
    try {
      const response = await fetch(
        `/api/procurement/orders/${encodeURIComponent(pidOrder)}/claim`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok || data.statusx !== "SUCCESS") {
        toast.error(data.message || "Unable to claim this order.");
        await fetchOrders();
        return;
      }
      setOrders((current) =>
        current.map((order) =>
          order.pidOrder === pidOrder
            ? { ...order, claimedByAdmin: data.claim }
            : order,
        ),
      );
      toast.success("Order claimed successfully.");
    } catch {
      toast.error("Unable to claim this order.");
    } finally {
      setClaimingOrderId("");
    }
  };

  const formatClaimedAt = (value: string) =>
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Order workspace
          </p>
          <h2 className="mt-1 text-xl font-bold capitalize text-foreground">
            {statusLabel(status)} orders
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} order{orders.length === 1 ? "" : "s"} in this view
          </p>
        </div>
        {canRunCleanup ? (
          <button
            type="button"
            disabled={cleanupRunning}
            onClick={async () => {
              setCleanupRunning(true);
              try {
                const response = await fetch("/api/cron/cleanup-saved-orders");
                const data = await response.json();
                if (!response.ok || data.statusx !== "SUCCESS") {
                  toast.error(data?.message || "Cleanup failed");
                  return;
                }
                toast.success(
                  `Cleanup completed. Deleted ${data.deletedCount || 0} stale saved orders.`,
                );
                await fetchOrders();
              } catch {
                toast.error("Cleanup failed");
              } finally {
                setCleanupRunning(false);
              }
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            {cleanupRunning ? "Running cleanup…" : "Run cleanup now"}
          </button>
        ) : null}
      </div>

      <ServiceOrderSearch
        value={searchQuery}
        onChange={setSearchQuery}
        resultCount={orders.length}
        placeholder="Search this stage by order ID, customer, phone, destination or product…"
      />

      {orders.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
          <div>
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">
              {searchQuery.trim()
                ? "No orders match your search in this stage."
                : `No ${statusLabel(status).toLowerCase()} orders available.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order, index) => {
            const contacts = whatsappContacts(order);
            return (
              <article
                key={order.pidOrder}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
                <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                          {statusLabel(order.status)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>
                      <h3 className="mt-3 break-words text-lg font-bold text-foreground">
                        {order.orderName}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground">
                          {order.pidOrder}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copyOrderId(order.pidOrder)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-semibold text-foreground transition hover:bg-muted"
                          aria-label={`Copy order ID ${order.pidOrder}`}
                        >
                          {copiedOrderId === order.pidOrder ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedOrderId === order.pidOrder ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                    {order.claimedByAdmin ? (
                      <div className="max-w-full rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-left sm:max-w-56 sm:text-right">
                        <span className="block break-words text-xs font-bold text-primary">
                          Claimed by {order.claimedByAdmin.adminName}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {formatClaimedAt(order.claimedByAdmin.claimedAt)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 border-y border-border py-4 sm:grid-cols-3">
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Customer
                      </span>
                      <span className="mt-1 block truncate text-sm font-semibold text-foreground">
                        {customerName(order.user)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Destination
                      </span>
                      <span className="mt-1 block truncate text-sm font-semibold text-foreground">
                        {order.destinationCountry || "Not specified"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Updated
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-foreground">
                        {getTimeDifference(order.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {contacts.slice(0, 1).map((contact) => (
                        <a
                          key={contact.digits}
                          href={contact.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order.pidOrder)}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-auto"
                    >
                      <Eye className="h-4 w-4" /> View order
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setSelectedOrderId("")}
        onCancel={() => setSelectedOrderId("")}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeWorkspace();
        }}
        aria-labelledby="procurement-workspace-title"
        aria-describedby="procurement-workspace-description"
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm sm:inset-4 sm:m-auto sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[1440px] sm:rounded-2xl sm:border sm:border-border"
      >
        {selectedOrder ? (
          <div className="flex h-full min-h-0 flex-col">
            <header className="z-20 shrink-0 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                      {statusLabel(selectedOrder.status)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedOrder.pidOrder}
                    </span>
                  </div>
                  <h2
                    id="procurement-workspace-title"
                    className="mt-2 truncate text-lg font-bold text-foreground sm:text-xl"
                  >
                    {selectedOrder.orderName}
                  </h2>
                  <p
                    id="procurement-workspace-description"
                    className="mt-1 hidden text-xs text-muted-foreground sm:block"
                  >
                    Review customer information, products, pricing, shipping and
                    workflow actions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeWorkspace}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Close order workspace"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto max-w-[1380px] space-y-5 p-4 pb-24 sm:p-6 sm:pb-12">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                    <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                          Customer details
                        </p>
                        <h3 className="mt-1 text-lg font-bold">
                          {customerName(selectedOrder.user)}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" /> Updated{" "}
                        {getTimeDifference(selectedOrder.updatedAt)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailItem
                        label="Customer ID"
                        value={selectedOrder.user.pidUser}
                      />
                      <DetailItem
                        label="Email"
                        value={selectedOrder.user.userEmail}
                      />
                      <DetailItem
                        label="Gender"
                        value={selectedOrder.user.gender}
                      />
                      <DetailItem
                        label="Country"
                        value={
                          [
                            selectedOrder.user.userCountry,
                            selectedOrder.user.country,
                          ]
                            .filter(Boolean)
                            .join(" ") || "N/A"
                        }
                      />
                      <DetailItem label="Phone / WhatsApp">
                        <WhatsAppLinks order={selectedOrder} />
                      </DetailItem>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <DetailItem
                          label="Address"
                          value={selectedOrder.user.address}
                        />
                      </div>
                    </div>
                  </section>

                  {status === "pending" ? (
                    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:min-w-72 sm:p-5">
                      {selectedOrder.claimedByAdmin ? (
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              Claimed by{" "}
                              {selectedOrder.claimedByAdmin.adminName}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              Since{" "}
                              {formatClaimedAt(
                                selectedOrder.claimedByAdmin.claimedAt,
                              )}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            This order is unclaimed
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Claim it so other admins know you are treating it.
                          </p>
                          <button
                            type="button"
                            disabled={
                              claimingOrderId === selectedOrder.pidOrder
                            }
                            onClick={() =>
                              void claimOrder(selectedOrder.pidOrder)
                            }
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                          >
                            <UserCheck className="h-4 w-4" />
                            {claimingOrderId === selectedOrder.pidOrder
                              ? "Claiming…"
                              : "Claim order"}
                          </button>
                        </div>
                      )}
                    </section>
                  ) : null}
                </div>

                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailItem
                      label="Destination"
                      value={selectedOrder.destinationCountry}
                    />
                    <DetailItem
                      label="Shipping plan"
                      value={selectedOrder.shippingPlan}
                    />
                    <DetailItem
                      label="Order category"
                      value={selectedOrder.orderCategory}
                    />
                    <DetailItem
                      label="Created"
                      value={getTimeDifference(selectedOrder.createdAt)}
                    />
                    <div className="sm:col-span-2 lg:col-span-4">
                      <DetailItem
                        label="Delivery address"
                        value={selectedOrder.shippingAddress}
                      />
                    </div>
                  </div>
                </section>

                <TableProcurementProducts
                  key={selectedOrder.pidOrder}
                  pidOrder={selectedOrder.pidOrder}
                  pidUser={selectedOrder.pidUser}
                  orderName={selectedOrder.orderName}
                  shippingAddress={selectedOrder.shippingAddress}
                />
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
