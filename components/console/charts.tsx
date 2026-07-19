'use client';

/**
 * Kabisa Console chart kit (FE-1 / KAB-106).
 * ApexCharts implementation matching TailAdmin chart configurations.
 * ConnectorDots is a non-chart UI element and is kept as-is.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <ChartSkeleton h={120} />,
});

/* --------- dark-mode detection hook --------- */

function useChartTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const el = document.querySelector('[data-kc-theme]');
    if (el) setIsDark(el.getAttribute('data-kc-theme') === 'dark');

    const observer = new MutationObserver(() => {
      const target = document.querySelector('[data-kc-theme]');
      setIsDark(target?.getAttribute('data-kc-theme') === 'dark');
    });

    const root = document.querySelector('[data-kc-theme]') ?? document.documentElement;
    observer.observe(root, { attributes: true, attributeFilter: ['data-kc-theme'] });
    return () => observer.disconnect();
  }, []);

  return {
    isDark,
    gridColor: isDark ? '#2A2A2A' : '#e4e7ec',
    labelColor: isDark ? '#98a2b3' : '#667085',
  };
}

/* --------- loading skeleton --------- */

function ChartSkeleton({ h }: { h: number }) {
  return (
    <div
      style={{
        height: h,
        borderRadius: 8,
        background: 'var(--sunken, #f3f4f6)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

/* --------- constants --------- */

const PRIMARY = '#0B4F42';
const SECONDARY = '#00C2A8';
const FONT = '"Space Grotesk", sans-serif';

/* ========================================================================= */
/*  AreaChart                                                                 */
/* ========================================================================= */

export function AreaChart({ data, h = 180, format = String, labels, unit = '', yMin, yMax }: Readonly<{
  data: number[];
  h?: number;
  format?: (v: number) => string;
  labels?: (string | null)[];
  unit?: string;
  accentLast?: boolean;
  /** Y-axis domain overrides. Default is a 0-baseline with an auto max
   *  (the power curve). Pass both for metrics whose signal lives far from
   *  zero (voltage, energy register) or needs a fixed scale (SoC -> 0..100),
   *  so the line isn't squashed against the baseline. */
  yMin?: number;
  yMax?: number;
}>) {
  const { isDark, gridColor, labelColor } = useChartTheme();

  if (data.length === 0) return null;

  const series: ApexOptions['series'] = [{ name: 'Value', data }];

  const categories = labels?.map((l) => l ?? '') ?? data.map((_, i) => String(i));

  const options: ApexOptions = {
    chart: {
      type: 'area' as const,
      fontFamily: FONT,
      height: h,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
    },
    colors: [PRIMARY, SECONDARY],
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.55, opacityTo: 0 },
    },
    stroke: { curve: 'straight', width: 2 },
    markers: { size: 0 },
    grid: {
      borderColor: gridColor,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { style: { colors: labelColor, fontFamily: FONT } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: yMin,
      max: yMax,
      labels: {
        style: { colors: labelColor, fontFamily: FONT },
        formatter: (v: number) => format(v),
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => `${format(v)}${unit}` },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  return (
    <div>
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={h}
      />
    </div>
  );
}

/* ========================================================================= */
/*  TelemetryChart                                                            */
/* ========================================================================= */

export interface TelemetryPoint {
  /** seconds since the session's first reading (X axis) */
  elapsedSec: number;
  /** ISO clock time, kept for the tooltip */
  t: string;
  value: number;
}

/** Format elapsed seconds for the X axis / tooltip: "0s", "45s", "15m", "1h 5m".
 *  Mirrors CitrineOS `formatTimeLabel`. */
function fmtElapsedAxis(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) {
    const s = sec % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  }
  const hr = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${hr}h ${rm}m` : `${hr}h`;
}

/**
 * Adaptive X-axis tick interval (seconds), ported from CitrineOS
 * `generateTimeTicks`: spacing grows with session length so a 90s session ticks
 * every 15s and a 3h session every hour — instead of the old fixed 5-minute
 * grid that gave short sessions only two ticks.
 */
function timeTickInterval(totalSeconds: number): number {
  if (totalSeconds < 30) return 5;
  if (totalSeconds < 90) return 15;
  if (totalSeconds < 360) return 60;
  if (totalSeconds < 2100) return 300;
  if (totalSeconds < 6300) return 900;
  if (totalSeconds < 12600) return 1800;
  return 3600;
}

/** Apex numeric-axis bounds (min/max/tickAmount) so ticks land on the adaptive
 *  interval above. */
function elapsedAxisBounds(maxSec: number): { min: number; max: number; tickAmount: number } {
  const interval = timeTickInterval(maxSec);
  const tickAmount = Math.max(1, Math.ceil(maxSec / interval));
  return { min: 0, max: tickAmount * interval, tickAmount };
}

/** Shared animation config: live sessions append-draw new points smoothly
 *  instead of re-flashing the whole series on each refetch. */
function liveAnimations(live?: boolean): NonNullable<NonNullable<ApexOptions['chart']>['animations']> {
  return {
    enabled: true,
    speed: 350,
    animateGradually: { enabled: !live, delay: 80 },
    dynamicAnimation: { enabled: true, speed: 350 },
  };
}

/** Format an ISO timestamp as Kigali (CAT, UTC+2) wall-clock time for tooltips,
 *  e.g. "Jun 8, 12:24 PM". Africa/Kigali has no DST, and the explicit timeZone
 *  keeps the label correct regardless of the viewer's browser timezone.
 *  `day: 'numeric'` (no leading zero) matches the rest of the console formatters. */
export function fmtKigaliClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    timeZone: 'Africa/Kigali',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Compact CitrineOS-style telemetry chart: a labelled Y axis, an X axis in
 * elapsed time ("Time Elapsed", minutes), and a coloured line + dots. The real
 * clock time is preserved in the hover tooltip. Used for the five session
 * graphs (power / energy / SoC / voltage / current).
 *
 * `showTime` adds the point's Kigali wall-clock time to the tooltip — handy for
 * live curves (e.g. the station power chart) where the X axis is elapsed time
 * but operators want to know the actual clock time of a reading.
 */
export function TelemetryChart({
  points,
  color,
  yLabel,
  unit = '',
  format = String,
  yMin,
  yMax,
  live,
  showTime,
}: Readonly<{
  points: TelemetryPoint[];
  color: string;
  yLabel: string;
  unit?: string;
  format?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  live?: boolean;
  showTime?: boolean;
}>) {
  const { isDark, gridColor, labelColor } = useChartTheme();

  if (points.length === 0) return null;

  const series: ApexOptions['series'] = [
    { name: yLabel, data: points.map((p) => ({ x: p.elapsedSec, y: p.value })) },
  ];

  // Adaptive elapsed-time axis (CitrineOS-style): ticks scale to session length.
  const maxX = points.at(-1)?.elapsedSec ?? 0;
  const { min, max, tickAmount } = elapsedAxisBounds(maxX);

  const options: ApexOptions = {
    chart: {
      // Stable id keeps the series identity across refetches so live updates
      // animate the new tail instead of redrawing the whole line.
      id: `tele-${yLabel}`,
      type: 'area' as const,
      fontFamily: FONT,
      height: 190,
      toolbar: { show: false },
      // Don't hijack two-finger / wheel scroll — no zoom or pan on these charts.
      zoom: { enabled: false },
      animations: liveAnimations(live),
      background: 'transparent',
    },
    colors: [color],
    fill: {
      // Faint wash so the bold line dominates (was .55 → looked washed-out/faded).
      type: 'gradient',
      gradient: { opacityFrom: 0.15, opacityTo: 0.02 },
    },
    stroke: { curve: 'straight', width: 3, lineCap: 'round' },
    markers: { size: 0, strokeWidth: 0, hover: { size: 4 } },
    grid: {
      borderColor: gridColor,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'numeric',
      min,
      max: max || undefined,
      tickAmount,
      title: { text: 'Time elapsed', style: { color: labelColor, fontFamily: FONT, fontSize: '11px' } },
      labels: {
        style: { colors: labelColor, fontFamily: FONT },
        formatter: (v: string) => fmtElapsedAxis(Math.round(Number(v))),
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: yMin,
      max: yMax,
      title: { text: yLabel, style: { color: labelColor, fontFamily: FONT, fontSize: '11px' } },
      labels: {
        style: { colors: labelColor, fontFamily: FONT },
        formatter: (v: number) => format(v),
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      custom: ({ dataPointIndex }: { series: number[][]; seriesIndex: number; dataPointIndex: number; w: unknown }) => {
        const point = points[dataPointIndex];
        if (!point) return '';
        // Elapsed time is on the X axis; optionally add the Kigali clock time.
        const timeLine =
          showTime && point.t
            ? `<div style="font-size:11px;opacity:.7;margin-top:2px">${fmtKigaliClock(point.t)} CAT</div>`
            : '';
        return `<div style="padding:6px 10px;font-size:12px;font-family:${FONT}">
          <strong>${format(point.value)}${unit}</strong>${timeLine}
        </div>`;
      },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  return (
    <div>
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={190}
      />
    </div>
  );
}

/* ========================================================================= */
/*  DualTelemetryChart — two series, two Y axes (Voltage & Current)           */
/* ========================================================================= */

/** Two telemetry series sharing one elapsed-time X axis, each on its own Y
 *  axis (left + right). Used for the combined "Voltage (V) & Current (A)" card
 *  in the session-detail performance grid. */
export function DualTelemetryChart({
  seriesA,
  seriesB,
  live,
}: Readonly<{
  seriesA: { label: string; unit: string; color: string; points: TelemetryPoint[] };
  seriesB: { label: string; unit: string; color: string; points: TelemetryPoint[] };
  live?: boolean;
}>) {
  const { isDark, gridColor, labelColor } = useChartTheme();

  if (seriesA.points.length === 0 && seriesB.points.length === 0) return null;

  const series: ApexOptions['series'] = [
    { name: seriesA.label, data: seriesA.points.map((p) => ({ x: p.elapsedSec, y: p.value })) },
    { name: seriesB.label, data: seriesB.points.map((p) => ({ x: p.elapsedSec, y: p.value })) },
  ];

  const axisTitle = (text: string, color: string) => ({
    text,
    style: { color, fontFamily: FONT, fontSize: '11px' },
  });

  // Adaptive elapsed-time axis (CitrineOS-style), spanning whichever series is longer.
  const lastA = seriesA.points.at(-1)?.elapsedSec ?? 0;
  const lastB = seriesB.points.at(-1)?.elapsedSec ?? 0;
  const maxX = Math.max(lastA, lastB);
  const { min, max, tickAmount } = elapsedAxisBounds(maxX);

  // Compact custom tooltip — the default multi-axis box ballooned over the plot.
  // Time is on the X axis already; each series shown as a colour dot + value
  // (the colour identifies voltage vs current, so no text label needed).
  // Pair by the hovered X (elapsed seconds), NOT by array index: the two series
  // are null-filtered independently, so equal indices need not be the same time.
  const renderTooltip = ({
    seriesIndex,
    dataPointIndex,
    w,
  }: {
    seriesIndex: number;
    dataPointIndex: number;
    w?: { globals?: { seriesX?: number[][] } };
  }): string => {
    // With shared:true Apex pins seriesIndex (usually 0), so seriesX[0][dpi] is
    // undefined when hovering a point that only exists in the longer series.
    // Resolve the hovered X across both series' X-arrays — first defined wins.
    const sx = w?.globals?.seriesX ?? [];
    const xVal = [seriesIndex, 0, 1].map((i) => sx[i]?.[dataPointIndex]).find((v) => v != null);
    if (xVal == null) return '';
    const at = (pts: TelemetryPoint[]) => pts.find((p) => p.elapsedSec === xVal);
    const a = at(seriesA.points);
    const b = at(seriesB.points);
    if (!a && !b) return '';
    const row = (s: typeof seriesA, p?: TelemetryPoint) =>
      p
        ? `<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:99px;background:${s.color};display:inline-block"></span><strong>${p.value.toFixed(1)}${s.unit}</strong></div>`
        : '';
    return `<div style="padding:7px 10px;font-size:12px;font-family:${FONT};line-height:1.5">
      ${row(seriesA, a)}${row(seriesB, b)}
    </div>`;
  };

  const options: ApexOptions = {
    chart: {
      id: 'tele-voltage-current',
      type: 'line' as const,
      fontFamily: FONT,
      height: 190,
      toolbar: { show: false },
      // Don't hijack two-finger / wheel scroll — no zoom or pan.
      zoom: { enabled: false },
      animations: liveAnimations(live),
      background: 'transparent',
    },
    colors: [seriesA.color, seriesB.color],
    stroke: { curve: 'straight', width: 3, lineCap: 'round' },
    markers: { size: 0, hover: { size: 4 } },
    grid: {
      borderColor: gridColor,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'numeric',
      min,
      max: max || undefined,
      tickAmount,
      title: axisTitle('Time elapsed', labelColor),
      labels: { style: { colors: labelColor, fontFamily: FONT }, formatter: (v: string) => fmtElapsedAxis(Math.round(Number(v))) },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        seriesName: seriesA.label,
        title: axisTitle(seriesA.label, seriesA.color),
        labels: { style: { colors: labelColor, fontFamily: FONT } },
      },
      {
        seriesName: seriesB.label,
        opposite: true,
        title: axisTitle(seriesB.label, seriesB.color),
        labels: { style: { colors: labelColor, fontFamily: FONT } },
      },
    ],
    legend: { show: true, position: 'top', fontFamily: FONT, labels: { colors: labelColor } },
    tooltip: { theme: isDark ? 'dark' : 'light', shared: true, intersect: false, custom: renderTooltip },
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  return (
    <div>
      <ReactApexChart options={options} series={series} type="line" height={190} />
    </div>
  );
}

/* ========================================================================= */
/*  Gauge — semicircle radial (Power Utilization)                            */
/* ========================================================================= */

/** Semicircle gauge: `value` of `max` as a percentage arc, with the raw value
 *  (e.g. live kW) shown in the center. Used for station "Power Utilization". */
export function Gauge({
  value,
  max,
  label,
  unit = '',
  color = '#f59e0b',
  format = (v: number) => v.toFixed(1),
}: Readonly<{
  value: number;
  max: number;
  label?: string;
  unit?: string;
  color?: string;
  format?: (v: number) => string;
}>) {
  const { isDark } = useChartTheme();
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  const options: ApexOptions = {
    chart: { type: 'radialBar' as const, fontFamily: FONT, background: 'transparent', sparkline: { enabled: true } },
    colors: [color],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: '62%' },
        track: { background: isDark ? '#2A2A2A' : '#e4e7ec', strokeWidth: '100%' },
        dataLabels: {
          name: { show: !!label, offsetY: 22, fontSize: '11px', color: isDark ? '#98a2b3' : '#667085', fontFamily: FONT },
          value: {
            show: true,
            offsetY: -10,
            fontSize: '20px',
            fontWeight: 700,
            color: isDark ? '#e5e7eb' : '#1f2937',
            fontFamily: FONT,
            formatter: () => `${format(value)}${unit}`,
          },
        },
      },
    },
    fill: { type: 'solid' },
    stroke: { lineCap: 'round' },
    labels: label ? [label] : [],
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  return (
    <div>
      <ReactApexChart options={options} series={[pct]} type="radialBar" height={190} />
    </div>
  );
}

/* ========================================================================= */
/*  Bars                                                                      */
/* ========================================================================= */

export function Bars({
  data,
  h = 120,
  format = String,
  labels,
  highlight = -1,
}: Readonly<{
  data: number[];
  h?: number;
  format?: (v: number) => string;
  labels?: (string | number | null)[];
  highlight?: number;
}>) {
  const { isDark, gridColor, labelColor } = useChartTheme();

  if (data.length === 0) return null;

  // When highlight >= 0, use distributed mode so each bar can have its own color
  const useHighlight = highlight >= 0;

  const series: ApexOptions['series'] = [{ name: 'Value', data }];

  const categories = labels?.map((l) => (l == null ? '' : String(l))) ?? data.map((_, i) => String(i));

  const options: ApexOptions = {
    chart: {
      type: 'bar' as const,
      fontFamily: FONT,
      height: h,
      toolbar: { show: false },
      background: 'transparent',
    },
    colors: useHighlight
      ? data.map((_, i) => (i === highlight ? PRIMARY : SECONDARY))
      : [PRIMARY],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '39%',
        borderRadius: 5,
        borderRadiusApplication: 'end',
        distributed: useHighlight,
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ['transparent'] },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: labelColor, fontFamily: FONT, fontSize: '10px' } },
    },
    yaxis: {
      labels: {
        style: { colors: labelColor, fontFamily: FONT },
        formatter: (v: number) => format(v),
      },
    },
    grid: {
      borderColor: gridColor,
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    legend: { show: false },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => format(v) },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  return (
    <div>
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={h}
      />
    </div>
  );
}

/* ========================================================================= */
/*  Donut                                                                     */
/* ========================================================================= */

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/** Donut chart -- segments + a center total. Legend lists each segment. */
export function Donut({
  segments,
  size = 150,
  centerLabel,
}: Readonly<{
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}>) {
  const { isDark } = useChartTheme();

  const total = segments.reduce((a, s) => a + s.value, 0);
  const seriesData = segments.map((s) => s.value);
  const colors = segments.map((s) => s.color);
  const labelsList = segments.map((s) => s.label);

  const options: ApexOptions = {
    chart: {
      type: 'donut' as const,
      fontFamily: FONT,
      height: size,
      background: 'transparent',
    },
    colors,
    labels: labelsList,
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: centerLabel ?? 'Total',
              fontSize: '13px',
              fontWeight: '600',
              color: isDark ? '#e5e7eb' : '#1f2937',
              formatter: () => String(total),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'right',
      fontFamily: FONT,
      fontSize: '12px',
      labels: { colors: isDark ? '#98a2b3' : '#667085' },
      markers: { size: 5, shape: 'square' },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
    },
    stroke: { show: false },
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  return (
    <div>
      <ReactApexChart
        options={options}
        series={seriesData}
        type="donut"
        height={size + 30}
        width="100%"
      />
    </div>
  );
}

/* ========================================================================= */
/*  Spark                                                                     */
/* ========================================================================= */

export function Spark({
  data,
  w = 72,
  h = 26,
}: Readonly<{
  data: number[];
  w?: number;
  h?: number;
  stroke?: string;
}>) {
  if (data.length < 2) return null;

  const series: ApexOptions['series'] = [{ name: 'Spark', data }];

  const options: ApexOptions = {
    chart: {
      type: 'area' as const,
      sparkline: { enabled: true },
      toolbar: { show: false },
      background: 'transparent',
    },
    colors: [PRIMARY],
    stroke: { curve: 'smooth', width: 1.5 },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.3, opacityTo: 0 },
    },
    tooltip: { enabled: false },
    grid: { show: false },
    xaxis: { labels: { show: false } },
    yaxis: { labels: { show: false } },
  };

  return (
    <div style={{ width: w, height: h }}>
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={h}
        width={w}
      />
    </div>
  );
}

/* ========================================================================= */
/*  ConnectorDots -- kept as-is (not a chart)                                 */
/* ========================================================================= */

export interface ConnectorInfo {
  std: string;
  status: string;
}

const CONNECTOR_COLORS: Record<string, string> = {
  Charging: 'var(--accent)',
  Available: 'var(--ok)',
  Faulted: 'var(--err)',
  Preparing: 'var(--info)',
};

export function ConnectorDots({ connectors }: Readonly<{ connectors: ConnectorInfo[] }>) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {connectors.map((c, i) => (
        <span
          key={`${c.std}-${c.status}-${i}`}
          title={`${c.std} — ${c.status}`}
          className={c.status === 'Charging' ? 'kc-pulse' : ''}
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: CONNECTOR_COLORS[c.status] ?? 'var(--border-strong)',
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  );
}
