import { backendGet, backendPost } from "@/app/lib/backend";

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
  return backendGet<OutlookStatus>("outlook/status");
}

export function getOutlookConnectUrl() {
  return backendGet<OutlookConnectUrl>("outlook/connect-url");
}

export function disconnectOutlook() {
  return backendPost<unknown>("outlook/disconnect");
}

export function syncOutlookClients() {
  return backendPost<unknown>("outlook/contacts/sync-clients");
}
