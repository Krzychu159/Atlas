"use client";

import { useEffect, useState } from "react";

const eventName = "atlas-trainer-rates-changed";

export function notifyTrainerRatesChanged() {
  window.dispatchEvent(new Event(eventName));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(eventName);
      channel.postMessage("refresh");
      channel.close();
    } catch {
      // A notification failure must not invalidate a successful save.
    }
  }
}

export function useTrainerRatesRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener(eventName, refresh);
    let channel: BroadcastChannel | null = null;
    try {
      channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(eventName) : null;
      if (channel) channel.onmessage = refresh;
    } catch {
      // Refresh in the current tab remains available.
    }
    return () => {
      window.removeEventListener(eventName, refresh);
      channel?.close();
    };
  }, []);
  return revision;
}
