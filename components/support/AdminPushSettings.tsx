"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import styles from "./support.module.css";
async function request(body?: unknown) {
  const response = await fetch("/api/support/push", {
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Unable to update notifications.");
  return data;
}
function keyBytes(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
export default function AdminPushSettings() {
  const [key, setKey] = useState(""),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [hint, setHint] = useState("Checking this device…"),
    [error, setError] = useState(""),
    [needsHomeScreen, setNeedsHomeScreen] = useState(false);
  useEffect(() => {
    let mounted = true;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (
      ios &&
      !window.matchMedia("(display-mode: standalone)").matches &&
      !(navigator as Navigator & { standalone?: boolean }).standalone
    ) {
      setNeedsHomeScreen(true);
      setHint("iPhone and iPad notifications work from the Home Screen app.");
      return;
    }
    if (
      !window.isSecureContext ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setHint(
        "This browser does not support push notifications. You can still use the inbox and email alerts.",
      );
      return;
    }
    async function check() {
      try {
        const config = await request();
        if (!mounted) return;
        if (!config.configured) {
          setHint("Push notifications are not available yet.");
          return;
        }
        setKey(config.publicKey);
        const registration =
          await navigator.serviceWorker.getRegistration("/dashboard/");
        const subscription = await registration?.pushManager.getSubscription();
        const status = subscription
          ? await request({ action: "status", endpoint: subscription.endpoint })
          : { enabled: false };
        if (!mounted) return;
        setEnabled(status.enabled);
        setReady(true);
        setHint(
          Notification.permission === "denied"
            ? "Notifications are blocked. Allow them in your browser settings to enable alerts."
            : "Get an alert on this device when a customer sends a message. Message contents stay in the inbox.",
        );
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    }
    void check();
    return () => {
      mounted = false;
    };
  }, []);
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      if (enabled) {
        const registration =
          await navigator.serviceWorker.getRegistration("/dashboard/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await request({
            action: "unsubscribe",
            endpoint: subscription.endpoint,
          });
          await subscription.unsubscribe();
        }
        setEnabled(false);
        return;
      }
      // Permission is requested only in direct response to this device owner's click.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setHint(
          permission === "denied"
            ? "Notifications are blocked. Allow them in your browser settings to enable alerts."
            : "Notifications remain off. You can enable them whenever you’re ready.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.register(
        "/support-sw.js",
        { scope: "/dashboard/" },
      );
      if (!registration.active)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () =>
              reject(new Error("Notification setup timed out. Please retry.")),
            10000,
          );
          const worker = registration.installing || registration.waiting;
          if (!worker) {
            clearTimeout(timer);
            resolve();
            return;
          }
          worker.addEventListener("statechange", () => {
            if (worker.state === "activated") {
              clearTimeout(timer);
              resolve();
            } else if (worker.state === "redundant") {
              clearTimeout(timer);
              reject(new Error("Notification setup failed. Please retry."));
            }
          });
        });
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(key),
        }));
      await request({
        action: "subscribe",
        subscription: subscription.toJSON(),
      });
      setEnabled(true);
      setHint(
        "Notifications are on for this device. You can turn them off here at any time.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.pushSettings} aria-label="Support notifications">
      <div>
        <h2>
          {enabled ? <Bell size={18} /> : <BellOff size={18} />}{" "}
          {needsHomeScreen
            ? "Set up iPhone and iPad notifications"
            : enabled
              ? "Notifications on"
              : "Stay up to date"}
        </h2>
        <p>{hint}</p>
        {needsHomeScreen && (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>Open this dashboard in Safari.</li>
            <li>
              Tap Share, then Add to Home Screen. Keep Open as Web App enabled
              if shown.
            </li>
            <li>Open the new SI Support icon and sign in if asked.</li>
            <li>Tap Enable notifications, then Allow.</li>
          </ol>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      {!needsHomeScreen && (
        <button
          type="button"
          className={styles.primary}
          disabled={!ready || busy}
          onClick={() => void toggle()}
        >
          {busy
            ? "Updating…"
            : enabled
              ? "Turn off on this device"
              : "Enable notifications"}
        </button>
      )}
    </section>
  );
}
