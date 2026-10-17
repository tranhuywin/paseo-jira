const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

function pluralize({ count, unit }: { count: number; unit: string }): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export function formatRelativeTime({ isoDate, nowMs }: { isoDate: string; nowMs: number }): string {
  const elapsedMs = Math.max(0, nowMs - Date.parse(isoDate));
  if (elapsedMs < HOUR_MS) return pluralize({ count: Math.max(1, Math.floor(elapsedMs / MINUTE_MS)), unit: "minute" });
  if (elapsedMs < DAY_MS) return pluralize({ count: Math.floor(elapsedMs / HOUR_MS), unit: "hour" });
  if (elapsedMs < MONTH_MS) return pluralize({ count: Math.floor(elapsedMs / DAY_MS), unit: "day" });
  return pluralize({ count: Math.floor(elapsedMs / MONTH_MS), unit: "month" });
}
