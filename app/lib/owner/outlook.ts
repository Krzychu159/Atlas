import { backendFetch } from "../backend";

export type OutlookStatus = {
  isConnected: boolean;
  provider: string | null;
  email: string | null;
  connectedAt: string | null;
};

export type OutlookConnectUrl = {
  url: string | null;
};

export function getOutlookStatus() {
  return backendFetch<OutlookStatus>("outlook/status");
}

export function getOutlookConnectUrl() {
  return backendFetch<OutlookConnectUrl>("outlook/connect-url");
}

export function disconnectOutlook() {
  return backendFetch<unknown>("outlook/disconnect", {
    method: "POST",
  });
}
