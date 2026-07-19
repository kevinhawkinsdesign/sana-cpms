'use client';

/** FE-1 kit gallery — eyeball every primitive/chart in both themes & densities.
 *  Dev-only reference page; not linked from nav. */
import React, { useState } from 'react';
import {
  Avatar,
  Badge,
  Btn,
  Card,
  Icon,
  IconName,
  PageHead,
  SearchBox,
  Select,
  Stat,
  StatusBadge,
  Tabs,
} from '@/components/console/ui';
import { AreaChart, Bars, ConnectorDots, Spark } from '@/components/console/charts';
import { useKcTheme } from '@/components/console/ThemeProvider';
import { fmtKwh, fmtRWF, fmtRWFc } from '@/lib/console/format';

const REV_30D = [
  412, 388, 455, 470, 430, 510, 545, 498, 530, 575, 540, 610, 588, 630, 602, 655, 640, 700, 668, 690, 720, 705,
  745, 760, 730, 790, 770, 810, 795, 842,
].map((v) => v * 1000);

const UTIL_24H = [4, 3, 2, 2, 3, 6, 14, 28, 38, 45, 52, 58, 63, 66, 71, 65, 60, 55, 48, 39, 28, 18, 11, 6];

const ICONS: IconName[] = [
  'home', 'station', 'bolt', 'tariff', 'money', 'people', 'shield', 'settings', 'search', 'bell',
  'alert', 'check', 'x', 'clock', 'car', 'doc', 'refresh', 'wrench', 'globe', 'logout', 'key', 'building',
  'plus', 'dots', 'filter', 'download', 'chevD', 'chevR', 'arrowL', 'arrowUR', 'stop', 'sidebar',
];

const STATUSES = [
  'operational', 'degraded', 'maintenance', 'installing', 'Available', 'Charging', 'Preparing', 'Faulted',
  'issued', 'failed', 'missing', 'pending', 'paid', 'accruing', 'active', 'draft', 'invited', 'open', 'resolved',
];

export default function KitPage() {
  const { theme, setTheme, density, setDensity } = useKcTheme();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState('All stations');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <PageHead
        title="Console kit"
        sub="FE-1 design system gallery — every primitive and chart, both themes"
        crumb="Sana Console · internal"
        actions={
          <>
            <Btn icon="refresh" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? 'Dark' : 'Light'} mode
            </Btn>
            <Btn onClick={() => setDensity(density === 'normal' ? 'compact' : 'normal')}>
              Density: {density}
            </Btn>
            <Btn variant="primary" icon="plus">
              Primary action
            </Btn>
          </>
        }
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <Stat
          label="Revenue today"
          value={fmtRWFc(842_000)}
          sub="RWF"
          delta={<><Icon name="arrowUR" size={11} /> 8.2% vs last Wed</>}
          spark={<Spark data={REV_30D.slice(-7)} />}
        />
        <Stat label="Energy delivered" value="1,284" sub="kWh" delta={<><Icon name="arrowUR" size={11} /> 5.1%</>} />
        <Stat label="Active sessions" value="5" sub="of 27 connectors" delta="3 drawing 142 kW" deltaKind="neutral" />
        <Stat label="Network uptime · 30d" value="97.2%" delta="Huye in maintenance" deltaKind="neutral" />
        <Stat label="Open faults" value="3" delta="1 critical · needs action" deltaKind="err" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card title="Revenue — last 30 days" action={<Badge kind="neutral">RWF {fmtRWFc(REV_30D.reduce((a, b) => a + b, 0))} total</Badge>}>
          <AreaChart
            data={REV_30D}
            format={(v) => fmtRWF(v)}
            labels={REV_30D.map((_, i) => (i % 5 === 0 ? `Jun ${i + 1}` : null))}
            accentLast
          />
        </Card>
        <Card title="Connector utilization — today">
          <Bars data={UTIL_24H} format={(v) => `${v}%`} labels={UTIL_24H.map((_, i) => `${i}:00`)} highlight={14} />
        </Card>
      </div>

      {/* Controls row */}
      <Card title="Controls" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search sessions, plates, drivers…" style={{ width: 260 }} />
          <Select options={['All stations', 'EVP Kacyiru', 'SP Kanombe']} value={sel} onChange={setSel} />
          <Btn icon="download">Export</Btn>
          <Btn variant="ghost" icon="filter">Filter</Btn>
          <Btn variant="danger" icon="stop" size="xs">End session</Btn>
          <Btn variant="primary" size="md" icon="plus">Add station</Btn>
          <Avatar name="Ira Rutazinda" />
          <Avatar name="EVP Operator" size={32} />
        </div>
        <Tabs
          tabs={[{ id: 'all', label: 'All sessions', count: 46 }, { id: 'live', label: 'Live', count: 5 }, { id: 'issues', label: 'Billing issues', count: 2 }]}
          value={tab}
          onChange={setTab}
        />
      </Card>

      {/* Badges */}
      <Card title="Status badges" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Connector dots:</span>
          <ConnectorDots
            connectors={[
              { std: 'CCS2', status: 'Charging' },
              { std: 'CHAdeMO', status: 'Available' },
              { std: 'Type2', status: 'Faulted' },
              { std: 'CCS2', status: 'Preparing' },
              { std: 'Type2', status: 'Unavailable' },
            ]}
          />
        </div>
      </Card>

      {/* Table */}
      <Card title="Table" pad={false} style={{ marginBottom: 16 }}>
        <table className="kc-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Station</th>
              <th>Vehicle</th>
              <th className="num">Energy</th>
              <th className="num">Amount</th>
              <th>EBM</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'S-58112', live: true, st: 'EVP Kacyiru', v: 'RAH 676 U', kwh: 18.4, amt: 11040, ebm: 'pending' },
              { id: 'S-58109', live: false, st: 'SP Kanombe', v: 'RAG 652 W', kwh: 31.2, amt: 18720, ebm: 'issued' },
              { id: 'S-58101', live: false, st: 'People Kacyiru', v: 'RAH 459 N', kwh: 8.6, amt: 5160, ebm: 'failed' },
            ].map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontWeight: r.live ? 600 : 400 }}>
                  {r.id} {r.live && <Badge kind="charge" dot pulse>live</Badge>}
                </td>
                <td>{r.st}</td>
                <td className="mono">{r.v}</td>
                <td className="num">{fmtKwh(r.kwh)}</td>
                <td className="num">{fmtRWF(r.amt)}</td>
                <td><StatusBadge status={r.ebm} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Icons */}
      <Card title="Icons">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--text2)' }}>
          {ICONS.map((n) => (
            <span key={n} title={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52 }}>
              <Icon name={n} size={18} />
              <span style={{ fontSize: 9.5, color: 'var(--text3)' }}>{n}</span>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
