// Kabisa Console — Overview screen
function OverviewScreen({ navigate }) {
  const D = KC_DATA;
  const live = D.SESSIONS.filter(s => s.live);
  const today = D.DAYS[D.DAYS.length - 1];
  const rev7 = D.DAYS.slice(-7).map(d => d.revenue);
  const openFaults = D.FAULTS.filter(f => f.state === 'open');
  const totalConnectors = D.CHARGERS.reduce((s, c) => s + c.connectors.length, 0);
  const busy = D.CHARGERS.reduce((s, c) => s + c.connectors.filter(x => x.status === 'Charging').length, 0);
  const faulted = D.CHARGERS.reduce((s, c) => s + c.connectors.filter(x => x.status === 'Faulted' || x.status === 'Offline').length, 0);

  return (
    <div className="kc-fadeup">
      <PageHead
        title="Overview"
        sub="Volcanoes Mobility · 8 stations · 27 chargers · Wednesday, June 11"
        actions={<>
          <Select options={['Last 24 hours', 'Last 7 days', 'Last 30 days']} value="Last 30 days" onChange={() => { }} />
          <Btn icon="download">Export</Btn>
        </>}
      />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
        <Stat label="Revenue today" value={fmtRWF(today.revenue)} delta={<><Icon name="arrowUR" size={11} /> 8.2% vs last Wed</>} spark={<Spark data={rev7} />} />
        <Stat label="Energy delivered" value={today.energy.toLocaleString()} sub="kWh" delta={<><Icon name="arrowUR" size={11} /> 5.1% vs last Wed</>} />
        <Stat label="Active sessions" value={live.length} sub={`of ${totalConnectors} connectors`} delta={<span style={{ color: 'var(--text3)' }}>{busy} connectors drawing {live.reduce((s, x) => s + (x.peakKw || 0), 0).toFixed(0)} kW</span>} />
        <Stat label="Network uptime · 30d" value="97.2%" delta={<span style={{ color: 'var(--warn)' }}>Huye Station in maintenance</span>} deltaKind="neutral" />
        <Stat label="Open faults" value={openFaults.length} delta={<span style={{ color: 'var(--err)' }}>2 critical · needs action</span>} deltaKind="err" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
        <Card title="Revenue — last 30 days" action={
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--text3)' }}>
            <span>Total <b style={{ color: 'var(--text)' }}>{fmtRWF(D.DAYS.reduce((s, d) => s + d.revenue, 0))}</b></span>
            <span>Avg/day <b style={{ color: 'var(--text)' }}>{fmtRWFc(D.DAYS.reduce((s, d) => s + d.revenue, 0) / 30)}</b></span>
          </div>
        }>
          <AreaChart
            data={D.DAYS.map(d => d.revenue)} h={190}
            labels={D.DAYS.map((d, i) => i % 5 === 0 ? fmtDate(d.date) : null)}
            format={v => fmtRWF(v)} accentLast
          />
        </Card>
        <Card title="Connector utilization — today" action={<span style={{ fontSize: 11.5, color: 'var(--text3)' }}>peak 71% · 18:00</span>}>
          <Bars data={KC_DATA.UTIL_24H} h={150} format={v => v + '%'} labels={KC_DATA.UTIL_24H.map((_, i) => String(i).padStart(2, '0') + ':00')} highlight={14} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text3)', marginTop: 6 }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12 }}>
            <span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{busy}</b> <span style={{ color: 'var(--text3)' }}>charging</span></span>
            <span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{totalConnectors - busy - faulted}</b> <span style={{ color: 'var(--text3)' }}>available</span></span>
            <span><b style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--err)' }}>{faulted}</b> <span style={{ color: 'var(--text3)' }}>down</span></span>
          </div>
        </Card>
      </div>

      {/* Live sessions + faults */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Live sessions <Badge kind="charge" dot pulse>{live.length} active</Badge></span>}
          action={<Btn variant="ghost" size="xs" onClick={() => navigate('sessions')}>View all <Icon name="chevR" size={12} /></Btn>} pad={false}>
          <table className="kc-table">
            <thead><tr><th>Session</th><th>Station</th><th>Vehicle</th><th className="num">Power</th><th className="num">Energy</th><th className="num">Est. cost</th><th>Elapsed</th></tr></thead>
            <tbody>
              {live.map(s => (
                <tr key={s.id} onClick={() => navigate('sessions/' + s.id)}>
                  <td className="mono" style={{ fontSize: 12 }}>{s.id}</td>
                  <td>{s.station}</td>
                  <td style={{ color: 'var(--text2)' }}>{s.vehicle}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{s.peakKw} kW</td>
                  <td className="num">{s.kwh} kWh</td>
                  <td className="num">{fmtRWF(s.amount)}</td>
                  <td style={{ color: 'var(--text3)' }}>{s.mins} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Open faults" action={<Btn variant="ghost" size="xs" onClick={() => navigate('stations')}>All stations <Icon name="chevR" size={12} /></Btn>} pad={false}>
          {openFaults.map(f => (
            <div key={f.id} onClick={() => navigate('chargers/' + f.charger)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ color: f.sev === 'critical' ? 'var(--err)' : 'var(--warn)', marginTop: 2 }}><Icon name="alert" size={15} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>{f.code}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{f.time}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', margin: '2px 0' }}>{f.msg}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{f.charger} · {f.station}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Recently resolved</div>
            {KC_DATA.FAULTS.filter(f => f.state === 'resolved').map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text3)', padding: '3px 0' }}>
                <Icon name="check" size={12} style={{ color: 'var(--ok)' }} />
                <span>{f.code}</span>
                <span className="mono" style={{ fontSize: 10.5 }}>{f.charger}</span>
                <span style={{ marginLeft: 'auto' }}>{f.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
window.OverviewScreen = OverviewScreen;
