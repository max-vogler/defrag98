const SI_PREFIXES = [
  { value: 1e24, symbol: "Y" },
  { value: 1e21, symbol: "Z" },
  { value: 1e18, symbol: "E" },
  { value: 1e15, symbol: "P" },
  { value: 1e12, symbol: "T" },
  { value: 1e9, symbol: "G" },
  { value: 1e6, symbol: "M" },
  { value: 1e3, symbol: "k" },
];

const NBSP = "\u00A0";

/**
 * Formats numbers using standard SI prefixes (k, M, G, T, P, E, Z, Y).
 */
export function unit(n: number, suffix: string = ""): string {
  if (!Number.isFinite(n)) return `∞${suffix ? NBSP + suffix : ""}`;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  const item = SI_PREFIXES.find((entry) => abs >= entry.value);
  if (item) {
    const scaled = abs / item.value;
    const decimals = scaled >= 100 ? 1 : scaled >= 10 ? 2 : 2;
    const formatted = scaled.toFixed(decimals).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1");
    return `${sign}${formatted}${NBSP}${item.symbol}${suffix}`;
  }

  const rounded = abs >= 100 ? Math.round(abs) : Math.round(abs * 10) / 10;
  return suffix ? `${sign}${rounded}${NBSP}${suffix}` : `${sign}${rounded}`;
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "<1s";
  if (seconds < 1) return "<1s";
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

export function formatClock(level: number, elapsedSeconds: number): { dateStr: string; timeStr: string; year: number } {
  const baseYears = [1998, 2001, 2006, 2015, 2026];
  const year =
    level <= baseYears.length
      ? baseYears[level - 1]
      : 2026 + (level - baseYears.length) * 11;
  const totalMinutes = 23 * 60 + 58 + Math.floor(elapsedSeconds / 60);
  const hh24 = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  const ampm = hh24 >= 12 ? "PM" : "AM";
  const hh12 = hh24 % 12 || 12;
  const timeStr = `${hh12}:${mm.toString().padStart(2, "0")} ${ampm}`;
  const dateStr = `${year}-11-24 ${hh24.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}:${Math.floor(elapsedSeconds % 60).toString().padStart(2, "0")}`;
  return { dateStr, timeStr, year };
}
