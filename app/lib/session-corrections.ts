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
