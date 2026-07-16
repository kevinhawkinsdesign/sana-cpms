// Kabisa Console — Sessions list + session detail (per-session graphs)
const { useState: useStateSe, useMemo: useMemoSe } = React;

function SessionsScreen({ navigate }) {
  const D = KC_DATA;
  const [tab, setTab] = useStateSe('all');
  const [q, setQ] = useStateSe('');
  const [station, setStation] = useStateSe('All stations');
  const live = D.SESSIONS.filter(s => s.live);
  const rows = D.SESSIONS.filter(s =>
    (tab === 'all' || (tab === 'live' && s.live) || (tab === 'issues' && (s.ebm === 'failed' || s.ebm === 'missing'))) &&
    (station === 'All stations' || s.station === station) &&
    (q === '' || (s.id + s.vehicle + s.driver).toLowerCase().includes(q.toLowerCase()))
  );
  const issues = D.SESSIONS.filter(s => s.ebm === 'failed' || s.ebm === 'missing').length;
  return (
    <div className="kc-fadeup">
      <PageHead title="Sessions" sub="Every charging transaction across your network, live and historical"
        actions={<><Select options={['Today', 'Last 7 days', 'Last 30 days', 'Custom range']} value="Last 7 days" onChange={() => { }} /><Btn icon="download">Export CSV</Btn></>} />
      <Tabs style={{ marginBottom: 10 }} value={tab} onChange={setTab} tabs={[
        { id: 'all', label: 'All sessions', count: D.SESSIONS.length },
        { id: 'live', label: 'Live', count: live.length },
        { id: 'issues', label: 'Billing issues', count: issues },
      ]} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search session, plate, driver…" style={{ width: 280 }} />
        <Select options={['All stations', ...new Set(D.SESSIONS.map(s => s.station))]} value={station} onChange={setStation} />
        <Select options={['All payments', 'MoMo', 'Card', 'Wallet', 'Contract']} value="All payments" onChange={() => { }} />
      </div>
      <Card pad={false}>
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          <table className="kc-table">
            <thead><tr>
              <th>Session</th><th>Started</th><th>Station</th><th>Vehicle</th>
              <th className="num">Energy</th><th className="num">Peak</th><th className="num">Duration</th>
              <th className="num">Amount</th><th>Payment</th><th>EBM</th>
            </tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id} onClick={() => navigate('sessions/' + s.id)}>
                  <td>
                    <span className="mono" style={{ fontSize: 12, fontWeight: s.live ? 600 : 400 }}>{s.id}</span>
                    {s.live && <span style={{ marginLeft: 6 }}><Badge kind="charge" dot pulse>live</Badge></span>}
                  </td>
                  <td style={{ color: 'var(--text3)' }}>{fmtDate(s.start)} · {fmtTime(s.start)}</td>
                  <td>{s.station}</td>
                  <td style={{ color: 'var(--text2)' }}>{s.vehicle}</td>
                  <td className="num">{s.kwh} kWh</td>
                  <td className="num" style={{ color: 'var(--text2)' }}>{s.peakKw} kW</td>
                  <td className="num" style={{ color: 'var(--text2)' }}>{s.mins} min</td>
                  <td className="num" style={{ fontWeight: 550 }}>{fmtRWF(s.amount)}</td>
                  <td style={{ color: 'var(--text2)' }}>{s.payment}</td>
                  <td><StatusBadge status={s.ebm} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{rows.length} sessions</span>
          <span>Total {fmtRWF(rows.reduce((s, x) => s + x.amount, 0))} · {rows.reduce((s, x) => s + x.kwh, 0).toFixed(0)} kWh</span>
        </div>
      </Card>
    </div>
  );
}

// Build a plausible power curve for a session (DC taper / AC flat)
function powerCurve(s) {
  const n = 36;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    let kw;
    if (s.dc) {
      const ramp = Math.min(1, f * 9);
      const taper = f > 0.62 ? Math.max(0.28, 1 - (f - 0.62) * 1.9) : 1;
      kw = s.peakKw * ramp * taper * (0.96 + 0.06 * Math.sin(i * 1.7));
    } else {
      kw = s.peakKw * Math.min(1, f * 14) * (0.97 + 0.04 * Math.sin(i * 1.3));
    }
    pts.push(Math.max(0, +kw.toFixed(1)));
  }
  if (s.live) return pts.slice(0, Math.round(n * 0.7));
  return pts;
}

function SessionDetailScreen({ id, navigate }) {
  const D = KC_DATA;
  const s = D.SESSIONS.find(x => x.id === id) || D.SESSIONS[0];
  const curve = useMemoSe(() => powerCurve(s), [s.id]);
  const energyBase = s.amount / 1.18; // ex-VAT
  const vat = s.amount - energyBase;
  const soc1 = s.soc1 ?? Math.min(95, s.soc0 + Math.round(s.kwh * 1.4));
  const timeline = [
    { t: fmtTime(s.start), label: 'Authorized', detail: `${s.payment} · idTag accepted` },
    { t: fmtTime(new Date(s.start.getTime() + 40000)), label: 'Cable locked, precharge OK', detail: `${s.connector} connector ${s.dc ? '1' : '1'}` },
    { t: fmtTime(new Date(s.start.getTime() + 65000)), label: 'Charging started', detail: `ramped to ${s.peakKw} kW` },
    ...(s.live ? [{ t: 'now', label: 'Charging…', detail: `${s.kwh} kWh delivered so far`, live: true }] : [
      { t: fmtTime(new Date(s.start.getTime() + s.mins * 60000)), label: 'Charging stopped', detail: 'reason: EVDisconnected' },
      { t: fmtTime(new Date(s.start.getTime() + s.mins * 60000 + 30000)), label: 'Payment captured', detail: `${fmtRWF(s.amount)} via ${s.payment}` },
      { t: fmtTime(new Date(s.start.getTime() + s.mins * 60000 + 50000)), label: s.ebm === 'issued' ? 'EBM receipt issued' : 'EBM issue', detail: s.ebm === 'issued' ? 'fiscalized with RRA' : 'fiscalization ' + s.ebm, warn: s.ebm !== 'issued' },
    ]),
  ];
  return (
    <div className="kc-fadeup">
      <PageHead
        crumb="Sessions" back onBack={() => navigate('sessions')}
        title={<><span className="mono">{s.id}</span> {s.live ? <Badge kind="charge" dot pulse>Live</Badge> : <StatusBadge status={s.ebm} />}</>}
        sub={`${s.station} · ${s.charger} · ${s.connector} · ${fmtDate(s.start)} ${fmtTime(s.start)}`}
        actions={<>
          {s.live && <Btn variant="danger" icon="x">End session</Btn>}
          {!s.live && <Btn icon="doc">EBM receipt</Btn>}
          <Btn icon="download">Download data</Btn>
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
        <Stat label="Energy" value={s.kwh} sub="kWh" />
        <Stat label={s.live ? 'Power now' : 'Peak power'} value={s.live ? curve[curve.length - 1] : s.peakKw} sub="kW" />
        <Stat label="Duration" value={s.mins} sub={s.live ? 'min · running' : 'min'} />
        <Stat label="State of charge" value={`${s.soc0}% → ${s.live ? '…' : soc1 + '%'}`} />
        <Stat label={s.live ? 'Cost so far' : 'Total charged'} value={fmtRWF(s.amount)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card title="Power delivery" action={<span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{s.dc ? 'DC fast charge · CCS2 · taper after ~62% SoC' : 'AC charge · Type 2 · onboard limited'}</span>}>
            <AreaChart data={curve} h={200} format={v => v + ' kW'} accentLast={s.live}
              labels={curve.map((_, i) => i % 6 === 0 ? Math.round(i / (curve.length - 1) * s.mins) + 'm' : null)} />
          </Card>
          <Card title="Session timeline" pad={false}>
            {timeline.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 14px', borderBottom: i < timeline.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text3)', width: 42, flexShrink: 0 }}>{ev.t}</span>
                <span className={ev.live ? 'kc-pulse' : ''} style={{ width: 7, height: 7, borderRadius: 99, flexShrink: 0, background: ev.warn ? 'var(--err)' : ev.live ? 'var(--accent)' : 'var(--ok)', position: 'relative', top: -1 }}></span>
                <span style={{ fontSize: 12.5, fontWeight: 550 }}>{ev.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{ev.detail}</span>
              </div>
            ))}
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card title="Cost breakdown">
            <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '5px 0', color: 'var(--text2)' }}>{s.kwh} kWh × RWF {s.rate}/kWh</td><td style={{ padding: '5px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtRWF(energyBase)}</td></tr>
                <tr><td style={{ padding: '5px 0', color: 'var(--text2)' }}>VAT (18%)</td><td style={{ padding: '5px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtRWF(vat)}</td></tr>
                <tr><td style={{ padding: '5px 0', color: 'var(--text2)' }}>Idle fee</td><td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--text3)' }}>—</td></tr>
                <tr style={{ borderTop: '1px solid var(--border)' }}><td style={{ padding: '7px 0', fontWeight: 650 }}>{s.live ? 'Running total' : 'Total'}</td><td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{fmtRWF(s.amount)}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tariff</span><span style={{ color: 'var(--text)' }}>{s.dc ? 'DC Fast — Standard' : 'AC — Standard'}</span>
            </div>
          </Card>
          <Card title="Vehicle & customer">
            <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
              <tbody>
                {[['Vehicle', s.vehicle], ['Driver', s.driver], ['Payment', s.payment + (s.payment === 'MoMo' ? ' · +250 78• ••• 412' : '')], ['Auth method', 'App QR scan']].map(([k, v]) => (
                  <tr key={k}><td style={{ padding: '4px 0', color: 'var(--text3)', width: 96 }}>{k}</td><td style={{ padding: '4px 0' }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          {!s.live && (
            <Card title="Fiscalization (EBM)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <StatusBadge status={s.ebm} />
                {s.ebm === 'issued' && <span className="mono" style={{ fontSize: 11.5, color: 'var(--text3)' }}>EBM-99117 · SDC011000123</span>}
              </div>
              {s.ebm === 'issued'
                ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>Receipt fiscalized with RRA VSDC at {fmtTime(new Date(s.start.getTime() + s.mins * 60000 + 50000))}. VAT {fmtRWF(vat)} reported.</div>
                : <><div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{s.ebm === 'failed' ? 'VSDC returned an error during fiscalization. Retry or review in Compliance.' : 'Session closed offline — receipt was never generated.'}</div>
                  <div style={{ display: 'flex', gap: 6 }}><Btn size="xs" variant="primary" icon="refresh">Retry now</Btn><Btn size="xs" onClick={() => navigate('compliance')}>Open Compliance</Btn></div></>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SessionsScreen, SessionDetailScreen });
