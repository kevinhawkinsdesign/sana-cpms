'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Gauge,
  HelpCircle,
  Info,
  LayoutDashboard,
  Pause,
  Play,
  Plug,
  PlugZap,
  RadioTower,
  RefreshCw,
  Timer,
  Trash2,
  Unplug,
  XCircle,
  Zap,
} from 'lucide-react'

import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getCitrineStatus,
  getCitrineEvents,
  type CitrineCounters,
  type CitrineEvent,
  type CitrineEventKind,
  type CitrineLatencyBucket,
  type CitrineStatusData,
} from '@/lib/api/admin'
import { useCitrineEventStream } from '@/lib/hooks/useCitrineEventStream'

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmtMs = (v: number | null | undefined): string =>
  v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`

const fmtNum = (n: number | null | undefined): string =>
  n == null ? '—' : new Intl.NumberFormat().format(n)

function humanDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

function relTime(iso: string | null | undefined, now: number): string {
  if (!iso) return 'never'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'never'
  const diff = Math.max(0, now - t)
  return `${humanDuration(diff)} ago`
}

// ---------------------------------------------------------------------------
// SLO thresholds (per docs/CITRINE_METRICS_EXPLAINED.md §6)
// ---------------------------------------------------------------------------

type Tier = 'green' | 'amber' | 'red' | 'neutral'

const SLO = {
  start:              { green: 500,  amber: 1500 },
  end:                { green: 500,  amber: 1500 },
  startHandler:       { green: 300,  amber: 800 },
  endHandler:         { green: 300,  amber: 800 },
  telemetryFlush:     { green: 100,  amber: 300 },
  writeBackRoundTrip: { green: 500,  amber: 1500 },
} as const

function tierForP95(p95: number | null | undefined, slo: { green: number; amber: number }): Tier {
  if (p95 == null) return 'neutral'
  if (p95 <= slo.green) return 'green'
  if (p95 <= slo.amber) return 'amber'
  return 'red'
}

const tierCardClass: Record<Tier, string> = {
  green:   'border-emerald-200 bg-emerald-50/50',
  amber:   'border-amber-200 bg-amber-50/50',
  red:     'border-red-200 bg-red-50/50',
  neutral: 'border-muted bg-muted/20',
}

const tierDotClass: Record<Tier, string> = {
  green:   'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  neutral: 'bg-muted-foreground/30',
}

const tierTextClass: Record<Tier, string> = {
  green:   'text-emerald-700',
  amber:   'text-amber-700',
  red:     'text-red-700',
  neutral: 'text-muted-foreground',
}

const tierBadge: Record<Tier, string> = {
  green:   'bg-emerald-100 text-emerald-800 border-emerald-300',
  amber:   'bg-amber-100 text-amber-800 border-amber-300',
  red:     'bg-red-100 text-red-800 border-red-300',
  neutral: 'bg-slate-100 text-slate-700 border-slate-300',
}

// ---------------------------------------------------------------------------
// Event kind → plain-English label + colour (per §6 "Events feed")
// ---------------------------------------------------------------------------

const eventKindMeta: Record<
  CitrineEventKind,
  { label: string; icon: React.ReactNode; className: string; severity: 'info' | 'warn' | 'error' | 'ok' }
> = {
  'start-handled':     { label: 'Session started',              icon: <PlugZap className="h-3.5 w-3.5" />, className: 'bg-blue-100 text-blue-800 border-blue-200',       severity: 'info' },
  'end-handled':       { label: 'Session ended',                icon: <Unplug className="h-3.5 w-3.5" />,  className: 'bg-indigo-100 text-indigo-800 border-indigo-200',  severity: 'info' },
  'row-received':      { label: 'Event received',               icon: <Activity className="h-3.5 w-3.5" />, className: 'bg-slate-100 text-slate-700 border-slate-200',     severity: 'info' },
  'telemetry-flushed': { label: 'Live update saved',            icon: <Zap className="h-3.5 w-3.5" />,      className: 'bg-slate-100 text-slate-700 border-slate-200',     severity: 'info' },
  'orphan-created':    { label: 'Retroactive session created',  icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'bg-amber-100 text-amber-800 border-amber-200', severity: 'warn' },
  'stale-close':       { label: 'Stuck session closed',         icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'bg-amber-100 text-amber-800 border-amber-200', severity: 'warn' },
  'write-back-failed': { label: 'Citrine notification failed',  icon: <XCircle className="h-3.5 w-3.5" />, className: 'bg-red-100 text-red-800 border-red-200',           severity: 'error' },
  'ws-connected':      { label: 'Connected to Citrine',         icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: 'bg-emerald-100 text-emerald-800 border-emerald-200', severity: 'ok' },
  'ws-disconnected':   { label: 'Disconnected from Citrine',    icon: <XCircle className="h-3.5 w-3.5" />, className: 'bg-red-100 text-red-800 border-red-200',           severity: 'error' },
  'error':             { label: 'Internal error',               icon: <XCircle className="h-3.5 w-3.5" />, className: 'bg-red-100 text-red-800 border-red-200',           severity: 'error' },
}

// ---------------------------------------------------------------------------
// Latency card
// ---------------------------------------------------------------------------

interface LatencyCardProps {
  title: string
  subtitle: string
  help: string
  bucket: CitrineLatencyBucket | undefined
  slo: { green: number; amber: number }
  isLoading?: boolean
}

const LatencyCard: React.FC<LatencyCardProps> = ({ title, subtitle, help, bucket, slo, isLoading }) => {
  const tier = tierForP95(bucket?.p95 ?? null, slo)
  return (
    <Card className={`border ${tierCardClass[tier]} transition-all`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{help}</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
          </div>
          <span className={`inline-block h-2.5 w-2.5 rounded-full mt-1 ${tierDotClass[tier]}`} aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <LatencyCell label="typical" sub="p50" value={fmtMs(bucket?.p50 ?? null)} />
            <LatencyCell label="most people's worst" sub="p95" value={fmtMs(bucket?.p95 ?? null)} emphasized tier={tier} />
            <LatencyCell label="rare bad" sub="p99" value={fmtMs(bucket?.p99 ?? null)} />
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
          <span>from last 500 events</span>
          <span>
            max {fmtMs(bucket?.max ?? null)} · n={fmtNum(bucket?.count ?? 0)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

const LatencyCell: React.FC<{ label: string; sub: string; value: string; emphasized?: boolean; tier?: Tier }> = ({
  label, sub, value, emphasized, tier,
}) => (
  <div
    className={`rounded-md border bg-white/70 px-2 py-1.5 ${
      emphasized ? 'border-foreground/20 shadow-sm' : 'border-transparent'
    }`}
  >
    <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
    <div
      className={`font-mono ${
        emphasized ? `text-base font-bold ${tier ? tierTextClass[tier] : ''}` : 'text-sm'
      }`}
    >
      {value}
    </div>
    <div className="text-[9px] uppercase tracking-wide text-muted-foreground/70 mt-0.5">{sub}</div>
  </div>
)

// ---------------------------------------------------------------------------
// Counter tile
// ---------------------------------------------------------------------------

interface CounterTileProps {
  label: string
  value: number
  icon?: React.ReactNode
  help?: string
  tone?: 'neutral' | 'alert' | 'ok'
}

const CounterTile: React.FC<CounterTileProps> = ({ label, value, icon, help, tone = 'neutral' }) => {
  const alert = tone === 'alert' && value > 0
  const ok = tone === 'ok'
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        alert
          ? 'border-red-300 bg-red-50'
          : ok
            ? 'border-emerald-200 bg-emerald-50/40'
            : 'border-muted bg-muted/20'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
        {help ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">{help}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div
        className={`text-lg font-bold font-mono mt-0.5 ${
          alert ? 'text-red-700' : ok ? 'text-emerald-700' : 'text-foreground'
        }`}
      >
        {fmtNum(value)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Banners + pills
// ---------------------------------------------------------------------------

const StatusBanner: React.FC<{ kind: 'danger' | 'warn'; icon: React.ReactNode; children: React.ReactNode }> = ({
  kind,
  icon,
  children,
}) => (
  <div
    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
      kind === 'danger' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-800'
    }`}
  >
    <span className="mt-0.5">{icon}</span>
    <div className="flex-1">{children}</div>
  </div>
)

const StreamStatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; className: string }> = {
    connected:    { label: '● live',        className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    connecting:   { label: 'connecting…',   className: 'bg-slate-100 text-slate-700 border-slate-300' },
    reconnecting: { label: 'reconnecting…', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    paused:       { label: '⏸ paused',       className: 'bg-slate-100 text-slate-700 border-slate-300' },
    error:        { label: 'stream error',  className: 'bg-red-100 text-red-800 border-red-300' },
    idle:         { label: 'idle',          className: 'bg-slate-100 text-slate-600 border-slate-300' },
  }
  const entry = map[status] ?? map.idle
  return <Badge variant="outline" className={entry.className}>{entry.label}</Badge>
}

// ---------------------------------------------------------------------------
// Overall health
// ---------------------------------------------------------------------------

type HealthTier = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

interface HealthResult {
  tier: HealthTier
  headline: string
  reasons: string[]
}

function computeHealth(status: CitrineStatusData | undefined): HealthResult {
  if (!status) return { tier: 'unknown', headline: 'Loading…', reasons: [] }

  const reasons: string[] = []
  let unhealthy = false
  let degraded = false

  if (!status.connected) { unhealthy = true; reasons.push('Disconnected from Citrine') }
  if (status.counters.writeBackFailed > 0) { unhealthy = true; reasons.push(`${status.counters.writeBackFailed} write-back(s) failed permanently`) }
  if (status.counters.errors > 0) { degraded = true; reasons.push(`${status.counters.errors} internal error(s)`) }
  if (status.writeBackQueueDepth > 100) { unhealthy = true; reasons.push(`Citrine sync backlog is ${status.writeBackQueueDepth}`) }
  else if (status.writeBackQueueDepth > 50) { degraded = true; reasons.push(`Citrine sync backlog is ${status.writeBackQueueDepth}`) }

  const startTier = tierForP95(status.latency.start?.p95 ?? null, SLO.start)
  const endTier   = tierForP95(status.latency.end?.p95 ?? null,   SLO.end)
  if (startTier === 'red' || endTier === 'red') { unhealthy = true; reasons.push('Session start/end latency is elevated') }
  else if (startTier === 'amber' || endTier === 'amber') { degraded = true; reasons.push('Session start/end latency is higher than normal') }

  if (unhealthy) return { tier: 'unhealthy', headline: 'Needs attention', reasons }
  if (degraded)  return { tier: 'degraded',  headline: 'Running, with warnings', reasons }
  return { tier: 'healthy', headline: 'All systems normal', reasons }
}

const healthColorMap: Record<HealthTier, { pill: string; dot: string; ring: string }> = {
  healthy:   { pill: 'bg-emerald-50 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  degraded:  { pill: 'bg-amber-50 text-amber-800 border-amber-300',       dot: 'bg-amber-500',   ring: 'ring-amber-200' },
  unhealthy: { pill: 'bg-red-50 text-red-800 border-red-300',             dot: 'bg-red-500',     ring: 'ring-red-200' },
  unknown:   { pill: 'bg-slate-50 text-slate-700 border-slate-200',       dot: 'bg-slate-400',   ring: 'ring-slate-200' },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const POLL_STATUS_MS = 5_000

const CitrineObservabilityPage: React.FC = () => {
  const [now, setNow] = useState(() => Date.now())
  const [streamPaused, setStreamPaused] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('overview')

  // Tick "now" so relative timestamps refresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  const { data: status, isLoading, isError, error, refetch, isFetching } = useQuery<CitrineStatusData>({
    queryKey: ['citrine', 'status'],
    queryFn: getCitrineStatus,
    refetchInterval: POLL_STATUS_MS,
    refetchIntervalInBackground: false,
  })

  const { data: seedEvents } = useQuery<CitrineEvent[]>({
    queryKey: ['citrine', 'events', 'seed'],
    queryFn: () => getCitrineEvents(50),
    staleTime: 60_000,
  })

  const { events: liveEvents, status: streamStatus, setEvents: setLiveEvents, clear: clearEvents } =
    useCitrineEventStream({ backfill: 20, ringSize: 500, paused: streamPaused })

  useEffect(() => {
    if (seedEvents && seedEvents.length && liveEvents.length === 0) {
      setLiveEvents(seedEvents)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedEvents])

  const counters = status?.counters
  const latency = status?.latency
  const telemetry = status?.telemetry

  const health = useMemo(() => computeHealth(status), [status])
  const healthStyle = healthColorMap[health.tier]

  const showWriteBackBanner = !!counters && (counters.writeBackFailed > 0 || (status?.writeBackQueueDepth ?? 0) > 100)
  const showDisconnectBanner = !!status && status.connected === false
  const showErrorsBanner = !!counters && counters.errors > 0

  const uptime = status?.wsConnectedAt ? humanDuration(now - new Date(status.wsConnectedAt).getTime()) : '—'

  const anomalyCount = (c?: CitrineCounters) =>
    c ? c.writeBackFailed + c.errors + c.orphanCreated + c.staleClosed : 0

  return (
    <AdminAccessGuard>
      <TooltipProvider delayDuration={150}>
        <div className="space-y-5 p-4 md:p-6 max-w-[1400px] mx-auto">
          {/* Heading ------------------------------------------------------- */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <RadioTower className="h-6 w-6 text-[#1E3A8A]" />
                Citrine Sync Health
              </h1>
              <p className="text-sm text-muted-foreground">
                How quickly session events flow from the chargers into the app — in plain English.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StreamStatusPill status={streamStatus} />
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Headline health card ----------------------------------------- */}
          <Card className={`border-2 ${healthStyle.pill.split(' ').filter(c => c.startsWith('border-')).join(' ')}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`relative flex items-center justify-center h-14 w-14 rounded-full ${healthStyle.pill}`}>
                  <span className={`h-4 w-4 rounded-full ${healthStyle.dot} ring-4 ${healthStyle.ring}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold">{health.headline}</h2>
                    <Badge variant="outline" className={healthStyle.pill}>{health.tier}</Badge>
                  </div>
                  {health.reasons.length > 0 ? (
                    <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      {health.reasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      Link is up, latency is within target, and no anomalies recorded.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banners ------------------------------------------------------- */}
          {(showDisconnectBanner || showWriteBackBanner || showErrorsBanner) && (
            <div className="space-y-2">
              {showDisconnectBanner && (
                <StatusBanner kind="danger" icon={<XCircle className="h-4 w-4" />}>
                  <strong>Disconnected from Citrine.</strong> New session start/end events are paused until the link recovers.
                </StatusBanner>
              )}
              {showWriteBackBanner && (
                <StatusBanner kind="warn" icon={<AlertTriangle className="h-4 w-4" />}>
                  <strong>Citrine sync backlog:</strong> {fmtNum(status?.writeBackQueueDepth ?? 0)} background jobs waiting
                  {counters && counters.writeBackFailed > 0 ? (
                    <> · <strong>{fmtNum(counters.writeBackFailed)}</strong> gave up after retries</>
                  ) : null}
                  . Final &ldquo;session complete&rdquo; reports may be delayed.
                </StatusBanner>
              )}
              {showErrorsBanner && (
                <StatusBanner kind="warn" icon={<AlertTriangle className="h-4 w-4" />}>
                  <strong>{fmtNum(counters?.errors ?? 0)}</strong> internal error(s) since last restart. Check the server logs.
                </StatusBanner>
              )}
            </div>
          )}

          {isError && !status && (
            <StatusBanner kind="danger" icon={<XCircle className="h-4 w-4" />}>
              Failed to load status: {(error as Error)?.message || 'unknown error'}
            </StatusBanner>
          )}

          {/* Tabs ---------------------------------------------------------- */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
            <TabsList className="w-full md:w-auto grid grid-cols-2 md:grid-cols-5 md:inline-flex h-auto md:h-9">
              <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
              <TabsTrigger value="latency"  className="gap-1.5"><Timer className="h-4 w-4" /> Speed</TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-4 w-4" /> Activity</TabsTrigger>
              <TabsTrigger value="feed"     className="gap-1.5"><RadioTower className="h-4 w-4" /> Live feed</TabsTrigger>
              <TabsTrigger value="glossary" className="gap-1.5"><BookOpen className="h-4 w-4" /> Glossary</TabsTrigger>
            </TabsList>

            {/* OVERVIEW -------------------------------------------------- */}
            <TabsContent value="overview" className="space-y-4">
              <section>
                <SectionTitle
                  title="At a glance"
                  help="Right-now numbers. Refreshed every 5 seconds."
                />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <GlanceCard
                    icon={<Plug className="h-4 w-4" />}
                    label="Live link"
                    value={
                      isLoading ? (
                        <Skeleton className="h-5 w-20" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${status?.connected ? 'bg-emerald-500' : 'bg-red-500'}`}
                            aria-hidden
                          />
                          {status?.connected ? 'Connected' : 'Disconnected'}
                        </span>
                      )
                    }
                    hint={status?.wsConnectedAt ? `up ${humanDuration(now - new Date(status.wsConnectedAt).getTime())}` : undefined}
                    help="The real-time connection to Citrine. If this is down, no new start/end events reach us."
                    alert={status?.connected === false}
                  />
                  <GlanceCard
                    icon={<Activity className="h-4 w-4" />}
                    label="Active sessions"
                    value={isLoading ? <Skeleton className="h-5 w-12" /> : fmtNum(telemetry?.activeTxCount ?? 0)}
                    hint={telemetry ? `${fmtNum(telemetry.debouncedTxCount)} pending live updates` : undefined}
                    help="Customers currently charging that we're tracking live."
                  />
                  <GlanceCard
                    icon={<Database className="h-4 w-4" />}
                    label="Citrine sync backlog"
                    value={isLoading ? <Skeleton className="h-5 w-12" /> : fmtNum(status?.writeBackQueueDepth ?? 0)}
                    hint="background 'session complete' reports waiting"
                    help="After each session ends we tell Citrine the final details in the background. Zero-ish is healthy."
                    alert={(status?.writeBackQueueDepth ?? 0) > 50}
                  />
                  <GlanceCard
                    icon={<Zap className="h-4 w-4" />}
                    label="Last event"
                    value={isLoading ? <Skeleton className="h-5 w-20" /> : relTime(status?.lastRowAt, now)}
                    help="Most recent event of any kind from Citrine (start/end/telemetry)."
                  />
                  <GlanceCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Uptime"
                    value={isLoading ? <Skeleton className="h-5 w-20" /> : uptime}
                    hint={status?.wsConnectedAt ?? undefined}
                    help="How long the current connection to Citrine has been open."
                  />
                </div>
              </section>

              {/* Mini latency summary */}
              <section>
                <SectionTitle
                  title="Session events feel fast?"
                  help="The time between Citrine recording a session start/end and us reflecting it in the app. This is what users feel when they plug in or unplug. Green is good."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MiniLatency
                    title="Time to show session start"
                    caption="From plug-in → app shows 'Charging started'"
                    bucket={latency?.start}
                    slo={SLO.start}
                    isLoading={isLoading}
                  />
                  <MiniLatency
                    title="Time to show session end"
                    caption="From stop → app shows 'Charging stopped'"
                    bucket={latency?.end}
                    slo={SLO.end}
                    isLoading={isLoading}
                  />
                </div>
              </section>

              {/* Activity teaser */}
              <section>
                <SectionTitle title="Activity so far" help="Totals since the server last restarted." />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <CounterTile
                    label="Sessions started"
                    value={counters?.startHandled ?? 0}
                    icon={<PlugZap className="h-3.5 w-3.5" />}
                    help="How many session starts we processed."
                  />
                  <CounterTile
                    label="Sessions ended"
                    value={counters?.endHandled ?? 0}
                    icon={<Unplug className="h-3.5 w-3.5" />}
                    help="How many session ends we processed."
                  />
                  <CounterTile
                    label="Live updates saved"
                    value={counters?.telemetryFlushed ?? 0}
                    icon={<Zap className="h-3.5 w-3.5" />}
                    help="kWh/battery updates written to the database (one batch every few seconds per session)."
                  />
                  <CounterTile
                    label="Citrine reports sent"
                    value={counters?.writeBackSucceeded ?? 0}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    help="Final 'session complete' reports successfully delivered to Citrine."
                    tone="ok"
                  />
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-xs text-[#1E3A8A] hover:underline inline-flex items-center gap-1"
                    onClick={() => setActiveTab('activity')}
                  >
                    See all counters and anomalies <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </section>

              {/* Anomaly teaser if any */}
              {counters && anomalyCount(counters) > 0 && (
                <section>
                  <SectionTitle
                    title="Anomalies"
                    help="Situations that shouldn't happen, or that indicate upstream issues."
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <CounterTile
                      label="Retroactive sessions"
                      value={counters.orphanCreated}
                      help="Citrine sent an 'end' for a session we never saw a start for. We created the record anyway. A few = normal. Many = race / connectivity issue."
                      tone="alert"
                    />
                    <CounterTile
                      label="Stuck sessions closed"
                      value={counters.staleClosed}
                      help="Sessions Citrine forgot to close. We closed them automatically after a long idle."
                      tone="alert"
                    />
                    <CounterTile
                      label="Failed Citrine reports"
                      value={counters.writeBackFailed}
                      help="'Session complete' reports we gave up on after multiple retries."
                      tone="alert"
                    />
                    <CounterTile
                      label="Internal errors"
                      value={counters.errors}
                      help="Unhandled errors in our own code. Any non-zero value is worth checking the logs."
                      tone="alert"
                    />
                  </div>
                </section>
              )}
            </TabsContent>

            {/* LATENCY --------------------------------------------------- */}
            <TabsContent value="latency" className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardContent className="p-3 text-sm text-blue-900 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    Each card shows three numbers: <strong>p50</strong> (the typical case),{' '}
                    <strong>p95</strong> (what most people&apos;s worst day looks like), and <strong>p99</strong> (rare bad
                    cases). The p95 is the one to watch. The green/amber/red dot is driven by the p95 against its target.
                    Numbers are milliseconds (1000ms = 1s). See the <strong>Glossary</strong> tab for full definitions.
                  </div>
                </CardContent>
              </Card>

              <section>
                <SectionTitle title="What the user feels" help="End-to-end — from Citrine recording the event to the app showing it." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <LatencyCard
                    title="Time to show session start"
                    subtitle="Citrine records start → app shows 'Charging started'"
                    help="The headline number. This is what the user feels when they plug in. Green ≤ 500ms · Amber ≤ 1500ms · Red > 1500ms."
                    bucket={latency?.start}
                    slo={SLO.start}
                    isLoading={isLoading}
                  />
                  <LatencyCard
                    title="Time to show session end"
                    subtitle="Citrine records stop → app shows 'Charging stopped'"
                    help="Same idea, for when the session ends. Green ≤ 500ms · Amber ≤ 1500ms · Red > 1500ms."
                    bucket={latency?.end}
                    slo={SLO.end}
                    isLoading={isLoading}
                  />
                </div>
              </section>

              <section>
                <SectionTitle
                  title="Just our server's time"
                  help="Same events minus network time from Citrine to us. Lets you tell infrastructure issues apart from our own code."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <LatencyCard
                    title="Our processing time (start)"
                    subtitle="How long our server spends handling a new session"
                    help="If 'Time to show session start' is slow but this is fast, the bottleneck is the network or Citrine — not us."
                    bucket={latency?.startHandler}
                    slo={SLO.startHandler}
                    isLoading={isLoading}
                  />
                  <LatencyCard
                    title="Our processing time (end)"
                    subtitle="How long our server spends handling a session end"
                    help="Same, for session ends. Targets: green ≤ 300ms, amber ≤ 800ms."
                    bucket={latency?.endHandler}
                    slo={SLO.endHandler}
                    isLoading={isLoading}
                  />
                </div>
              </section>

              <section>
                <SectionTitle title="Behind-the-scenes writes" help="Not things users directly see — but if these climb, the system is stressed." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <LatencyCard
                    title="Live update write time"
                    subtitle="How long each kWh / battery-% update takes to save"
                    help="Live telemetry is grouped into small batches (one write every few seconds per session). Should be under 100ms. If it climbs, the database is busy."
                    bucket={latency?.telemetryFlush}
                    slo={SLO.telemetryFlush}
                    isLoading={isLoading}
                  />
                  <LatencyCard
                    title="Time to notify Citrine"
                    subtitle="Background 'session complete' report round-trip"
                    help="After a session ends we send the final details (amount, duration, customer) back to Citrine. This runs in the background so the UI never waits. If it balloons, Citrine's side is slow — not ours."
                    bucket={latency?.writeBackRoundTrip}
                    slo={SLO.writeBackRoundTrip}
                    isLoading={isLoading}
                  />
                </div>
              </section>
            </TabsContent>

            {/* ACTIVITY -------------------------------------------------- */}
            <TabsContent value="activity" className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardContent className="p-3 text-sm text-blue-900 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    These are running totals since the server last restarted — they only go up. To see a rate
                    (per-minute), watch two refreshes and subtract.
                  </div>
                </CardContent>
              </Card>

              <section>
                <SectionTitle title="Normal activity" help="Traffic health. These should tick up while chargers are in use." />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <CounterTile
                    label="Sessions started"
                    value={counters?.startHandled ?? 0}
                    icon={<PlugZap className="h-3.5 w-3.5" />}
                    help="Session starts processed."
                  />
                  <CounterTile
                    label="Sessions ended"
                    value={counters?.endHandled ?? 0}
                    icon={<Unplug className="h-3.5 w-3.5" />}
                    help="Session ends processed."
                  />
                  <CounterTile
                    label="Live updates saved"
                    value={counters?.telemetryFlushed ?? 0}
                    icon={<Zap className="h-3.5 w-3.5" />}
                    help="Batches of kWh/battery-% updates written to the database."
                  />
                  <CounterTile
                    label="Citrine reports sent"
                    value={counters?.writeBackSucceeded ?? 0}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    help="Final 'session complete' reports delivered to Citrine."
                    tone="ok"
                  />
                  <CounterTile
                    label="Lifecycle rows received"
                    value={counters?.rowsReceivedLifecycle ?? 0}
                    help="Start/end rows streamed from Citrine. If this stays flat while sessions are happening, the subscription is dead."
                  />
                  <CounterTile
                    label="Telemetry rows received"
                    value={counters?.rowsReceivedTelemetry ?? 0}
                    help="Live kWh/battery-% rows streamed from Citrine."
                  />
                  <CounterTile
                    label="Transitions handled"
                    value={counters?.transitionsHandled ?? 0}
                    help="Starts + ends. Should equal Sessions started + Sessions ended."
                  />
                  <CounterTile
                    label="Updates dropped (ok)"
                    value={counters?.telemetryDropped ?? 0}
                    help="Pending live-update batches we cancelled because the session ended first. NOT an error — the batch would have been out-of-date."
                  />
                </div>
              </section>

              <section>
                <SectionTitle title="Anomalies" help="Red flags. A few are normal; a lot mean something's off." />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <CounterTile
                    label="Retroactive sessions"
                    value={counters?.orphanCreated ?? 0}
                    help="Citrine sent an 'end' without a matching 'start'. We created the session record anyway. A few = normal. Many = connectivity/race issue."
                    tone="alert"
                  />
                  <CounterTile
                    label="Stuck sessions closed"
                    value={counters?.staleClosed ?? 0}
                    help="Sessions Citrine forgot to close. We close them automatically after a long idle."
                    tone="alert"
                  />
                  <CounterTile
                    label="Failed Citrine reports"
                    value={counters?.writeBackFailed ?? 0}
                    help="Reports we gave up on after exhausting retries. Any non-zero deserves attention."
                    tone="alert"
                  />
                  <CounterTile
                    label="Internal errors"
                    value={counters?.errors ?? 0}
                    help="Unhandled errors in our own code. Check the logs if non-zero."
                    tone="alert"
                  />
                  <CounterTile
                    label="Reconnect attempts"
                    value={counters?.reconnectAttempts ?? 0}
                    help="How many times we tried to re-establish the Citrine link. Growing fast = network flapping."
                    tone="alert"
                  />
                  <CounterTile
                    label="WS disconnects"
                    value={counters?.wsDisconnects ?? 0}
                    help="Times the Citrine link dropped."
                  />
                  <CounterTile
                    label="WS connects"
                    value={counters?.wsConnects ?? 0}
                    help="Times we connected to Citrine."
                    tone="ok"
                  />
                  <CounterTile
                    label="Citrine report retries"
                    value={counters?.writeBackRetries ?? 0}
                    help="Individual retry attempts (one report can retry several times)."
                  />
                </div>
              </section>

              <section>
                <SectionTitle title="Under the hood" help="Current-moment snapshot numbers (not totals)." />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <CounterTile
                    label="Active sessions"
                    value={telemetry?.activeTxCount ?? 0}
                    icon={<Activity className="h-3.5 w-3.5" />}
                    help="Sessions currently charging that we're tracking live."
                  />
                  <CounterTile
                    label="Pending live updates"
                    value={telemetry?.debouncedTxCount ?? 0}
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    help="Live updates waiting for their batch window to close. Small and fluctuating is normal."
                  />
                  <CounterTile
                    label="Pedestal/gun cache"
                    value={telemetry?.pedestalGunCacheSize ?? 0}
                    icon={<Cpu className="h-3.5 w-3.5" />}
                    help="Cached pedestal/gun mappings — a performance optimisation."
                  />
                  <CounterTile
                    label="Operator-shift cache"
                    value={telemetry?.operatorShiftCacheSize ?? 0}
                    icon={<Cpu className="h-3.5 w-3.5" />}
                    help="Cached 'who's on shift' lookups."
                  />
                </div>
              </section>

              {counters && (
                <section>
                  <SectionTitle title="Derived health ratios" help="Helpful percentages computed from the counters above." />
                  <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <DerivedRow
                        label="Live update drop ratio"
                        help="Dropped ÷ (flushed + dropped). Small drop-rates are normal — sessions ending cancels their in-flight update batch."
                        value={
                          counters.telemetryFlushed + counters.telemetryDropped > 0
                            ? `${((counters.telemetryDropped / (counters.telemetryFlushed + counters.telemetryDropped)) * 100).toFixed(1)}%`
                            : '—'
                        }
                      />
                      <DerivedRow
                        label="Citrine report success ratio"
                        help="Succeeded ÷ enqueued. Should be close to 100%."
                        value={
                          counters.writeBackEnqueued > 0
                            ? `${((counters.writeBackSucceeded / counters.writeBackEnqueued) * 100).toFixed(1)}%`
                            : '—'
                        }
                      />
                      <DerivedRow
                        label="Event ring"
                        help="Most-recent-events buffer. Caps at 500."
                        value={status ? `${fmtNum(status.eventRingSize)} / 500 (${fmtNum(status.eventTotal)} total)` : '—'}
                      />
                    </CardContent>
                  </Card>
                </section>
              )}
            </TabsContent>

            {/* LIVE FEED ------------------------------------------------- */}
            <TabsContent value="feed" className="space-y-3">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardContent className="p-3 text-sm text-blue-900 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    Live feed of events happening inside the sync. Newest at the top. Delivered via server push (SSE) —
                    no polling needed.
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StreamStatusPill status={streamStatus} />
                  <span>
                    Showing <strong>{liveEvents.length}</strong> event{liveEvents.length === 1 ? '' : 's'} (capped at 500)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStreamPaused((p) => !p)}>
                    {streamPaused ? <Play className="h-4 w-4 mr-1.5" /> : <Pause className="h-4 w-4 mr-1.5" />}
                    {streamPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearEvents} disabled={liveEvents.length === 0}>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Clear
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {liveEvents.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      {streamStatus === 'connecting' || streamStatus === 'reconnecting'
                        ? 'Waiting for the first event…'
                        : 'No events yet. They will appear here as they happen.'}
                    </div>
                  ) : (
                    <div className="max-h-[650px] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-background">
                          <TableRow>
                            <TableHead className="w-[130px]">When</TableHead>
                            <TableHead className="w-[220px]">What happened</TableHead>
                            <TableHead className="w-[140px]">Reference</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {liveEvents.map((ev, idx) => (
                            <EventRow key={`${ev.ts}-${idx}`} event={ev} now={now} />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* GLOSSARY -------------------------------------------------- */}
            <TabsContent value="glossary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#1E3A8A]" />
                    What these numbers mean
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-relaxed">
                  <div>
                    <h3 className="font-semibold">Why we use percentiles instead of an average</h3>
                    <p className="text-muted-foreground mt-1">
                      Say 99 sessions start in 300ms and one gets stuck for 30 seconds. The average is around
                      600ms — <em>looks fine</em>. But one real person waited 30 seconds and got angry. Percentiles
                      expose that tail.
                    </p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li><strong>p50</strong> — half of people had it faster, half slower. The <em>typical</em> experience.</li>
                      <li><strong>p95</strong> — 95% of people had it faster. This is <em>most people&apos;s worst day</em>. The one to care about.</li>
                      <li><strong>p99</strong> — 99% of people had it faster. The rare horror stories.</li>
                      <li><strong>max</strong> — the slowest single event in the window. One-off outlier.</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold">Rolling window — why numbers shift between refreshes</h3>
                    <p className="text-muted-foreground mt-1">
                      Percentiles are computed over the last <strong>500 events</strong>, not since the server started.
                      That keeps the dashboard reflecting <em>now</em> instead of being dragged down by a bad morning
                      three days ago. Two refreshes showing different numbers is correct behaviour.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold">Milliseconds</h3>
                    <p className="text-muted-foreground mt-1">
                      All latency values are in milliseconds. <strong>1000ms = 1 second.</strong> 500ms is &ldquo;fast&rdquo; for a
                      user-facing event.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold">Key terms</h3>
                    <dl className="mt-2 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-x-4 gap-y-2">
                      <GlossaryRow
                        term="Citrine"
                        def="The charger-side software. It owns the chargers and raw meter data. We pull session events from it in real time."
                      />
                      <GlossaryRow
                        term="Kabisa backend"
                        def="Our server. It turns Citrine events into app-visible sessions, handles payments, operators, vehicles."
                      />
                      <GlossaryRow
                        term="Session"
                        def="One person plugging in a car and charging."
                      />
                      <GlossaryRow
                        term="Start event / End event"
                        def="Citrine's notification that a session began / finished. Our goal: reflect them in the app as fast as possible."
                      />
                      <GlossaryRow
                        term="Telemetry"
                        def="Live updates during a session — kWh charged, battery %. Not the start/end events themselves."
                      />
                      <GlossaryRow
                        term="Write-back"
                        def="Us reporting the final session details back to Citrine after the session ends. Runs in the background so it never slows down the UI."
                      />
                      <GlossaryRow
                        term="Queue depth"
                        def="How many background jobs are waiting to run. Zero-ish is healthy."
                      />
                      <GlossaryRow
                        term="Latency"
                        def="The delay between something happening and us showing it. Measured in milliseconds (1000ms = 1s)."
                      />
                      <GlossaryRow
                        term="SSE (Server-Sent Events)"
                        def="How the live feed on this page works — the server pushes events to the browser in real time, like a one-way chat."
                      />
                    </dl>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold">Health-light rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      <GlossaryHealth tier="healthy" title="All systems normal" body="Link is up, latency is within target, no anomalies." />
                      <GlossaryHealth tier="degraded" title="Running, with warnings" body="Latency higher than normal, small backlog, or some errors — but still flowing." />
                      <GlossaryHealth tier="unhealthy" title="Needs attention" body="Link down, write-backs failing, large backlog, or red-tier latency." />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </AdminAccessGuard>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionTitle: React.FC<{ title: string; help?: string }> = ({ title, help }) => (
  <div className="flex items-center gap-1.5 mb-2">
    <h2 className="text-base md:text-lg font-semibold">{title}</h2>
    {help ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-xs">{help}</TooltipContent>
      </Tooltip>
    ) : null}
  </div>
)

const GlanceCard: React.FC<{
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: string
  help?: string
  alert?: boolean
}> = ({ icon, label, value, hint, help, alert }) => (
  <div
    className={`rounded-lg border px-3 py-2.5 ${
      alert ? 'border-red-300 bg-red-50' : 'border-muted bg-white'
    }`}
  >
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{label}</span>
      {help ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] text-xs">{help}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
    <div className="text-base md:text-lg font-bold mt-0.5">{value}</div>
    {hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div> : null}
  </div>
)

const MiniLatency: React.FC<{
  title: string
  caption: string
  bucket: CitrineLatencyBucket | undefined
  slo: { green: number; amber: number }
  isLoading?: boolean
}> = ({ title, caption, bucket, slo, isLoading }) => {
  const tier = tierForP95(bucket?.p95 ?? null, slo)
  const badgeText =
    tier === 'green' ? 'fast' : tier === 'amber' ? 'a bit slow' : tier === 'red' ? 'slow' : 'not enough data'
  return (
    <Card className={`border ${tierCardClass[tier]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{caption}</p>
          </div>
          <Badge variant="outline" className={tierBadge[tier]}>
            {badgeText}
          </Badge>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-40 mt-3" />
        ) : (
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <div className={`font-mono text-2xl font-bold ${tierTextClass[tier]}`}>{fmtMs(bucket?.p95 ?? null)}</div>
              <div className="text-[11px] text-muted-foreground">most people&apos;s worst (p95)</div>
            </div>
            <div className="text-xs text-muted-foreground">
              typical {fmtMs(bucket?.p50 ?? null)} · rare bad {fmtMs(bucket?.p99 ?? null)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const DerivedRow: React.FC<{ label: string; help?: string; value: string }> = ({ label, help, value }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span>{label}</span>
      {help ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-xs">{help}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
    <span className="font-mono font-medium text-foreground">{value}</span>
  </div>
)

const GlossaryRow: React.FC<{ term: string; def: string }> = ({ term, def }) => (
  <>
    <dt className="font-semibold">{term}</dt>
    <dd className="text-muted-foreground">{def}</dd>
  </>
)

const GlossaryHealth: React.FC<{ tier: HealthTier; title: string; body: string }> = ({ tier, title, body }) => {
  const s = healthColorMap[tier]
  return (
    <div className={`rounded-lg border p-3 ${s.pill}`}>
      <div className="flex items-center gap-1.5 font-semibold text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
        {title}
      </div>
      <p className="text-xs mt-1 opacity-90">{body}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Event row (expandable)
// ---------------------------------------------------------------------------

const EventRow: React.FC<{ event: CitrineEvent; now: number }> = ({ event, now }) => {
  const [open, setOpen] = useState(false)
  const meta = eventKindMeta[event.kind] ?? eventKindMeta['row-received']
  const hasDetails = !!event.meta && Object.keys(event.meta).length > 0

  const localTime = useMemo(() => {
    try { return new Date(event.ts).toLocaleTimeString() } catch { return event.ts }
  }, [event.ts])

  return (
    <>
      <TableRow className={hasDetails ? 'cursor-pointer hover:bg-muted/40' : ''} onClick={hasDetails ? () => setOpen((o) => !o) : undefined}>
        <TableCell className="align-top">
          <div className="flex items-center gap-1.5">
            {hasDetails ? (
              open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ) : <span className="w-3" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-xs">{relTime(event.ts, now)}</span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="font-mono text-xs">{event.ts}</div>
                <div className="text-xs text-muted-foreground">local: {localTime}</div>
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
        <TableCell className="align-top">
          <Badge variant="outline" className={`${meta.className} inline-flex items-center gap-1`}>
            {meta.icon}
            {meta.label}
          </Badge>
        </TableCell>
        <TableCell className="align-top">
          <div className="text-xs font-mono text-muted-foreground space-y-0.5">
            {event.citrineSourceId != null ? <div>src #{event.citrineSourceId}</div> : null}
            {event.sessionId ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="hover:text-foreground truncate max-w-[110px] block"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(event.sessionId!).catch(() => {})
                      }
                    }}
                  >
                    {event.sessionId.slice(0, 8)}…
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="font-mono text-xs">{event.sessionId}</div>
                  <div className="text-xs text-muted-foreground">click to copy</div>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="align-top">
          <EventSummary event={event} />
        </TableCell>
      </TableRow>
      {open && hasDetails && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={4}>
            <pre className="text-[11px] font-mono overflow-x-auto">
{JSON.stringify(event.meta, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

/**
 * Human-readable one-liner per event kind, derived from meta when possible.
 */
const EventSummary: React.FC<{ event: CitrineEvent }> = ({ event }) => {
  const meta = (event.meta ?? {}) as Record<string, unknown>
  switch (event.kind) {
    case 'start-handled': {
      const total = typeof meta.startLatencyMs === 'number' ? fmtMs(meta.startLatencyMs) : null
      const handler = typeof meta.handlerMs === 'number' ? fmtMs(meta.handlerMs) : null
      return (
        <span className="text-xs text-muted-foreground">
          shown to app in {total ?? '—'} <span className="opacity-70">(our code {handler ?? '—'})</span>
        </span>
      )
    }
    case 'end-handled': {
      const total = typeof meta.endLatencyMs === 'number' ? fmtMs(meta.endLatencyMs) : null
      const handler = typeof meta.handlerMs === 'number' ? fmtMs(meta.handlerMs) : null
      const final = typeof meta.finalStatus === 'string' ? meta.finalStatus : null
      return (
        <span className="text-xs text-muted-foreground">
          shown in {total ?? '—'} <span className="opacity-70">(our code {handler ?? '—'})</span>
          {final ? <> · {final}</> : null}
        </span>
      )
    }
    case 'telemetry-flushed': {
      return <span className="text-xs text-muted-foreground">live update written</span>
    }
    case 'stale-close': {
      const kwh = meta.chargedKwh != null ? `${meta.chargedKwh} kWh` : '—'
      return <span className="text-xs text-muted-foreground">auto-closed · {kwh}</span>
    }
    case 'orphan-created':
      return <span className="text-xs text-muted-foreground">record created retroactively</span>
    case 'write-back-failed': {
      const k = typeof meta.kind === 'string' ? meta.kind : 'job'
      const a = typeof meta.attempts === 'number' ? meta.attempts : null
      return <span className="text-xs text-red-700">gave up on {k}{a != null ? ` after ${a} attempts` : ''}</span>
    }
    case 'ws-connected':
      return <span className="text-xs text-emerald-700">link to Citrine is up</span>
    case 'ws-disconnected':
      return <span className="text-xs text-red-700">link to Citrine dropped</span>
    case 'error':
      return <span className="text-xs text-red-700">{event.message ?? 'error'}</span>
    default:
      return <span className="text-xs text-muted-foreground">{event.message ?? '—'}</span>
  }
}

export default CitrineObservabilityPage
