"use client";

import { useEffect, useState } from "react";

const eventName = "atlas-session-corrected";

export function notifySessionCorrected() {
  window.dispatchEvent(new Event(eventName));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(eventName);
      channel.postMessage("refresh");
      channel.close();
    } catch {
      // Cross-tab notifications must not invalidate a successful correction.
    }
  }
}

// Mounted views re-fetch backend data, including views open in another tab.
export function useSessionCorrectionRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener(eventName, refresh);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(eventName) : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      window.removeEventListener(eventName, refresh);
      channel?.close();
    };
  }, []);
  return revision;
}

const paymentDateEvent = "atlas-payment-date-corrected";

export function notifyPaymentDateCorrected(clientId: number) {
  window.dispatchEvent(new CustomEvent(paymentDateEvent, { detail: { clientId } }));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(paymentDateEvent);
      channel.postMessage({ clientId }); channel.close();
    } catch { /* A notification failure must not invalidate a saved correction. */ }
  }
}

export function usePaymentDateCorrectionRevision(clientId?: number) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = (changedClientId?: number) => { if (clientId === undefined || changedClientId === clientId) setRevision(value => value + 1); };
    const listener = (event: Event) => refresh((event as CustomEvent<{ clientId: number }>).detail?.clientId);
    window.addEventListener(paymentDateEvent, listener);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(paymentDateEvent) : null;
    if (channel) channel.onmessage = event => refresh(event.data?.clientId);
    return () => { window.removeEventListener(paymentDateEvent, listener); channel?.close(); };
  }, [clientId]);
  return revision;
}
