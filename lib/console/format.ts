/** Kabisa Console formatters (FE-1) — ported from design/mockup/10-mock-data.js. */

export const fmtRWF = (n: number): string => 'RWF ' + Math.round(n).toLocaleString('en-US');

/** Compact RWF for chart axes/tooltips: 1.2M / 450k / 980.
 *  Tier is chosen AFTER rounding so boundary values never overflow their
 *  suffix (999_999 → "1.0M", not "1000k"; 999.5 → "1k", not "1000"). */
export const fmtRWFc = (n: number): string => {
  if (Math.round(n / 1000) >= 1000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.round(n) >= 1000) return Math.round(n / 1000) + 'k';
  return String(Math.round(n));
};

export const fmtKwh = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' kWh';

export const fmtTime = (d: Date): string =>
  // hourCycle 'h23' (not hour12:false) so midnight renders 00:00, not 24:00.
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const fmtMins = (mins: number): string =>
  mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
