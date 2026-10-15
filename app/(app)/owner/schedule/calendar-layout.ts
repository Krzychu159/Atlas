import type { CalendarSession } from "./types";

const MINUTE = 60_000;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;

export type PositionedSession<TSession extends CalendarSession> = {
  session: TSession;
  /** Minutes from the start of the visible range, clipped to the day. */
  top: number;
  height: number;
  column: number;
  columns: number;
  durationMinutes: number;
};

function dayRange(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export function overlapsDay(session: CalendarSession, day: Date) {
  const { start, end } = dayRange(day);
  return Date.parse(session.startAt) < end && Date.parse(session.endAt) > start;
}

/** Minutes since local midnight of `day`, clipped to that day. */
function clippedMinutes(session: CalendarSession, day: Date) {
  const { start, end } = dayRange(day);
  const from = Math.max(Date.parse(session.startAt), start);
  const to = Math.min(Math.max(Date.parse(session.endAt), from), end);
  return { from: (from - start) / MINUTE, to: (to - start) / MINUTE };
}

/** Visible hour range: a fixed working day, widened to fit every visible session. */
export function getHourRange(sessions: CalendarSession[], days: Date[]) {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const day of days) {
    for (const session of sessions) {
      if (!overlapsDay(session, day)) continue;
      const { from, to } = clippedMinutes(session, day);
      startHour = Math.min(startHour, Math.floor(from / 60));
      endHour = Math.max(endHour, Math.ceil(to / 60));
    }
  }
  return { startHour, endHour: Math.min(Math.max(endHour, startHour + 1), 24) };
}

/**
 * Places a day's sessions on the time axis. Overlapping sessions share the width side by side
 * (classic calendar columns) instead of covering each other.
 */
export function layoutDay<TSession extends CalendarSession>(sessions: TSession[], day: Date, startHour: number) {
  const items = sessions
    .filter((session) => overlapsDay(session, day))
    .map((session) => ({ session, ...clippedMinutes(session, day) }))
    .sort((first, second) => first.from - second.from || second.to - first.to);

  const positioned: PositionedSession<TSession>[] = [];
  let cluster: { item: (typeof items)[number]; column: number }[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const columns = Math.max(columnEnds.length, 1);
    for (const { item, column } of cluster) {
      positioned.push({
        session: item.session,
        top: item.from - startHour * 60,
        height: item.to - item.from,
        column,
        columns,
        durationMinutes: Math.round((Date.parse(item.session.endAt) - Date.parse(item.session.startAt)) / MINUTE),
      });
    }
    cluster = [];
    columnEnds = [];
  };

  for (const item of items) {
    if (item.from >= clusterEnd) flush();
    let column = columnEnds.findIndex((end) => end <= item.from);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = Math.max(item.to, item.from + 1);
    cluster.push({ item, column });
    clusterEnd = Math.max(clusterEnd, item.to, item.from + 1);
  }
  flush();

  return positioned;
}
