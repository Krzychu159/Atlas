import { backendFetch } from "../backend";

export type OwnerSession = {
  id?: string | number;
  title?: string;
  sessionName?: string;
  name?: string;
  trainerName?: string;
  trainer?: string;
  clientName?: string;
  client?: string;
  startTime?: string;
  time?: string;
  hour?: string;
  durationMinutes?: number;
  duration?: number;
  status?: string;
};

export type RecentClient = {
  id?: string | number;
  fullName?: string;
  name?: string;
  activity?: string;
  status?: string;
  createdAt?: string;
};

export type OwnerDashboard = {
  trainersCount: number;
  activeClientsCount: number;
  plannedSessionsCount: number;
  activePackagesCount: number;
  todaySessions: OwnerSession[];
  tomorrowSessions: OwnerSession[];
  recentClients: RecentClient[];
};

export function getOwnerDashboard() {
  return backendFetch<OwnerDashboard>("Dashboard/owner");
}
