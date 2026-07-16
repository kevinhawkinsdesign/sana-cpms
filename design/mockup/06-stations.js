// Kabisa Console — Stations list, Station detail, Charger detail
const { useState: useStateSt } = React;

function UptimeBar({ pct }) {
  if (pct == null) return <span style={{ color: 'var(--text3)' }}>—</span>;
  const color = pct >= 98 ? 'var(--ok)' : pct >= 90 ? 'var(--warn)' : 'var(--err)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 56, height: 4, background: 'var(--sunken)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 99 }}></div>
      </div>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{pct}%</span>
    </div>
  );
}

function StationsScreen({ navigate }) {
  const [q, setQ] = useStateSt('');
  const [status, setStatus] = useStateSt('All statuses');
  const D = KC_DATA;
  const rows = D.STATIONS.filter(s =>
    (status === 'All statuses' || s.status === status.toLowerCase()) &&
    (q === '' || (s.name + s.area).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="kc-fadeup">
      <PageHead title="Stations" sub={`${D.STATIONS.length} stations · ${D.STATIONS.reduce((s, x) => s + x.chargers, 0)} chargers across Rwanda`}
        actions={<><Btn icon="download">Export</Btn><Btn variant="primary" icon="plus">Add station</Btn></>} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Filter by name or area…" style={{ width: 260 }} />
        <Select options={['All statuses', 'Operational', 'Degraded', 'Maintenance', 'Installing']} value={status} onChange={setStatus} />
        <Select options={['All regions', 'Kigali', 'Northern', 'Southern', 'Western']} value="All regions" onChange={() => { }} />
      </div>
      <Card pad={false}>
        <table className="kc-table">
          <thead><tr>
            <th>Station</th><th>Status</th><th>Connectors</th>
            <th className="num">Energy · 24h</th><th className="num">Revenue · 24h</th>
            <th>Uptime · 30d</th><th className="num">Faults</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(s => {
              const chargers = D.CHARGERS.filter(c => c.station === s.id);
              const conns = chargers.flatMap(c => c.connectors);
              return (
                <tr key={s.id} onClick={() => navigate('stations/' + s.id)}>
                  <td>
                    <div style={{ fontWeight: 550 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{s.area}</div>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    {conns.length > 0
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ConnectorDots connectors={conns} /><span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{conns.length} on {s.chargers} chargers</span></div>
                      : <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{s.chargers} chargers</span>}
                  </td>
                  <td className="num">{s.energy24.toLocaleString()} kWh</td>
                  <td className="num" style={{ fontWeight: 550 }}>{fmtRWF(s.revenue24)}</td>
                  <td><UptimeBar pct={s.uptime30} /></td>
                  <td className="num">{s.faults > 0 ? <span style={{ color: 'var(--err)', fontWeight: 600 }}>{s.faults}</span> : <span style={{ color: 'var(--text3)' }}>0</span>}</td>
                  <td style={{ color: 'var(--text3)', width: 28 }}><Icon name="chevR" size={14} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StationDetailScreen({ id, navigate }) {
  const D = KC_DATA;
  const st = D.STATIONS.find(s => s.id === id) || D.STATIONS[0];
  const chargers = D.CHARGERS.filter(c => c.station === st.id);
  const sessions = D.SESSIONS.filter(s => s.stationId === st.id).slice(0, 8);
  return (
    <div className="kc-fadeup">
      <PageHead
        crumb="Stations" back onBack={() => navigate('stations')}
        title={<>{st.name} <StatusBadge status={st.status} /></>}
        sub={`${st.area} · ${st.lat.toFixed(4)}, ${st.lng.toFixed(4)} · DC Fast — Standard tariff`}
        actions={<><Btn icon="wrench">Maintenance mode</Btn><Btn variant="primary" icon="plus">Add charger</Btn></>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        <Stat label="Energy · 24h" value={st.energy24.toLocaleString()} sub="kWh" />
        <Stat label="Revenue · 24h" value={fmtRWF(st.revenue24)} />
        <Stat label="Uptime · 30d" value={st.uptime30 != null ? st.uptime30 + '%' : '—'} />
        <Stat label="Open faults" value={st.faults} deltaKind={st.faults ? 'err' : 'ok'} delta={st.faults ? <span style={{ color: 'var(--err)' }}>Action required</span> : <span style={{ color: 'var(--ok)' }}>All clear</span>} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
        <Card title={`Chargers (${chargers.length})`} pad={false}>
          {chargers.length === 0 && <div style={{ padding: 20, color: 'var(--text3)', fontSize: 13 }}>Chargers will appear here once commissioned.</div>}
          {chargers.map(c => (
            <div key={c.id} onClick={() => navigate('chargers/' + c.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ width: 34, height: 34, borderRadius: 7, background: c.type === 'DC' ? 'var(--accent-soft)' : 'var(--sunken)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.type === 'DC' ? 'var(--charge)' : 'var(--text2)' }}>
                <Icon name="bolt" size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{c.id}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>{c.model} · {c.power} kW · fw {c.fw}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {c.connectors.map(cn => (
                  <span key={cn.id} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className={cn.status === 'Charging' ? 'kc-pulse' : ''} style={{ width: 6, height: 6, borderRadius: 99, background: cn.status === 'Charging' ? 'var(--accent)' : cn.status === 'Available' ? 'var(--ok)' : cn.status === 'Faulted' ? 'var(--err)' : 'var(--border-strong)' }}></span>
                    {cn.std}{cn.kw ? <b style={{ color: 'var(--text)' }}>{cn.kw} kW</b> : null}
                  </span>
                ))}
              </div>
              <Icon name="chevR" size={14} style={{ color: 'var(--text3)' }} />
            </div>
          ))}
        </Card>
        <Card title="Recent sessions" pad={false} action={<Btn variant="ghost" size="xs" onClick={() => navigate('sessions')}>All <Icon name="chevR" size={12} /></Btn>}>
          <table className="kc-table">
            <thead><tr><th>Session</th><th className="num">kWh</th><th className="num">Amount</th><th>EBM</th></tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} onClick={() => navigate('sessions/' + s.id)}>
                  <td>
                    <span className="mono" style={{ fontSize: 12 }}>{s.id}</span>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.live ? 'in progress' : fmtDate(s.start) + ' · ' + fmtTime(s.start)}</div>
                  </td>
                  <td className="num">{s.kwh}</td>
                  <td className="num">{fmtRWF(s.amount)}</td>
                  <td><StatusBadge status={s.ebm} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

const OCPP_LOG = [
  { t: '14:31:58', dir: '→', msg: 'StatusNotification', detail: 'connector 1 · Faulted · OverCurrentFailure' },
  { t: '14:31:58', dir: '→', msg: 'StopTransaction', detail: 'txn 48207 · reason: EmergencyStop · 14.2 kWh' },
  { t: '14:31:57', dir: '→', msg: 'MeterValues', detail: 'connector 1 · 61.4 kW · 312 A · 197 V' },
  { t: '14:29:12', dir: '←', msg: 'RemoteStartTransaction.conf', detail: 'status: Accepted' },
  { t: '14:29:11', dir: '←', msg: 'RemoteStartTransaction', detail: 'idTag KBS-7741 · connector 1' },
  { t: '14:25:03', dir: '→', msg: 'Heartbeat', detail: 'interval 300s' },
  { t: '14:20:03', dir: '→', msg: 'Heartbeat', detail: 'interval 300s' },
];

function ChargerDetailScreen({ id, navigate }) {
  const D = KC_DATA;
  const c = D.CHARGERS.find(x => x.id === id) || D.CHARGERS[0];
  const st = D.STATIONS.find(s => s.id === c.station);
  const faults = D.FAULTS.filter(f => f.charger === c.id);
  const [tab, setTab] = useStateSt('activity');
  return (
    <div className="kc-fadeup">
      <PageHead
        crumb={`Stations / ${st.name}`} back onBack={() => navigate('stations/' + st.id)}
        title={<><span className="mono">{c.id}</span> <StatusBadge status={c.status} /></>}
        sub={`${c.model} · ${c.power} kW ${c.type} · firmware ${c.fw} · OCPP 2.0.1`}
        actions={<>
          <Btn icon="refresh">Soft reset</Btn>
          <Btn icon="key">Unlock connector</Btn>
          <Btn variant={c.status === 'fault' ? 'danger' : 'default'} icon="wrench">{c.status === 'fault' ? 'Dispatch technician' : 'Diagnostics'}</Btn>
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.connectors.length + 2}, 1fr)`, gap: 10, marginBottom: 12 }}>
        {c.connectors.map(cn => (
          <div key={cn.id} className="kc-card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>Connector {cn.id} · {cn.std}</span>
              <StatusBadge status={cn.status} />
            </div>
            {cn.status === 'Charging' ? (
              <><div style={{ fontSize: 22, fontWeight: 650 }}>{cn.kw} <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}>kW now</span></div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>Session in progress</div></>
            ) : cn.status === 'Faulted' ? (
              <><div style={{ fontSize: 15, fontWeight: 650, color: 'var(--err)' }}>{cn.error}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>Locked out since 13:42</div></>
            ) : (
              <><div style={{ fontSize: 22, fontWeight: 650, color: 'var(--text3)' }}>—</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>{cn.status === 'Available' ? 'Ready for next vehicle' : 'Not accepting sessions'}</div></>
            )}
          </div>
        ))}
        <Stat label="Energy · 7d" value="2,418" sub="kWh" />
        <Stat label="Sessions · 7d" value="64" sub={`avg ${(2418 / 64).toFixed(1)} kWh`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
        <Card pad={false}>
          <Tabs style={{ padding: '0 8px' }} value={tab} onChange={setTab} tabs={[
            { id: 'activity', label: 'OCPP activity' },
            { id: 'faults', label: 'Fault history', count: faults.length },
            { id: 'config', label: 'Configuration' },
          ]} />
          {tab === 'activity' && (
            <div style={{ padding: '6px 0' }}>
              {OCPP_LOG.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 14px', fontSize: 12, alignItems: 'baseline' }}>
                  <span className="mono" style={{ color: 'var(--text3)', fontSize: 11 }}>{l.t}</span>
                  <span className="mono" style={{ color: l.dir === '→' ? 'var(--info)' : 'var(--charge)', width: 12, textAlign: 'center' }}>{l.dir}</span>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 11.5 }}>{l.msg}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 11.5 }}>{l.detail}</span>
                </div>
              ))}
              <div style={{ padding: '8px 14px', fontSize: 11.5, color: 'var(--text3)', borderTop: '1px solid var(--border)', marginTop: 4 }}>Streaming live from CSMS · ← outbound · → inbound</div>
            </div>
          )}
          {tab === 'faults' && (
            <div>
              {faults.length === 0 && <div style={{ padding: 20, color: 'var(--text3)', fontSize: 13 }}>No faults recorded for this charger in the last 90 days.</div>}
              {faults.map(f => (
                <div key={f.id} style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                  <span style={{ color: f.sev === 'critical' ? 'var(--err)' : 'var(--warn)', marginTop: 2 }}><Icon name="alert" size={15} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <b style={{ fontSize: 12.5 }}>{f.code}</b>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{f.vendor}</span>
                      <StatusBadge status={f.state} />
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>{f.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{f.msg}</div>
                    {f.state === 'open' && <div style={{ marginTop: 8, display: 'flex', gap: 6 }}><Btn size="xs" icon="refresh">Retry reset</Btn><Btn size="xs" icon="doc">Runbook</Btn></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'config' && (
            <table className="kc-table">
              <tbody>
                {[['HeartbeatInterval', '300 s'], ['MeterValueSampleInterval', '30 s'], ['AuthorizeRemoteTxRequests', 'true'], ['LocalAuthListEnabled', 'true'], ['ConnectionTimeOut', '60 s'], ['StopTransactionOnInvalidId', 'true']].map(([k, v]) => (
                  <tr key={k} style={{ cursor: 'default' }}><td className="mono" style={{ fontSize: 12 }}>{k}</td><td className="mono num" style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card title="Utilization — last 7 days">
            <Bars data={[34, 41, 38, 52, 47, 29, 44]} h={90} format={v => v + '%'} labels={['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']} highlight={6} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text3)', marginTop: 5 }}>
              <span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span>
            </div>
          </Card>
          <Card title="Device">
            <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
              <tbody>
                {[['Serial', c.id + '-RW'], ['Vendor', 'Kabisa Energy'], ['Model', c.model], ['Firmware', c.fw + (c.fw === '2.3.0' ? ' · update available' : ' · latest')], ['SIM / network', 'MTN LTE · -67 dBm'], ['Commissioned', 'Nov 12, 2024'], ['Tariff', c.type === 'DC' ? 'DC Fast — Standard' : 'AC — Standard']].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 0', color: 'var(--text3)', width: 110 }}>{k}</td>
                    <td style={{ padding: '4px 0', color: k === 'Firmware' && c.fw === '2.3.0' ? 'var(--warn)' : 'var(--text)' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StationsScreen, StationDetailScreen, ChargerDetailScreen });
