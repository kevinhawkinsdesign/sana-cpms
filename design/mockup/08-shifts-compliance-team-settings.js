// Kabisa Console — People & Shifts, Compliance (EBM), Team, Settings
const { useState: useStateO } = React;

/* ---------- People & Shifts ---------- */
function ShiftChip({ shift }) {
  if (!shift) return <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>;
  const am = shift.type === 'AM';
  return (
    <div style={{
      borderRadius: 5, padding: '4px 7px', fontSize: 11, lineHeight: 1.3, cursor: 'pointer',
      background: am ? 'var(--accent-soft)' : 'var(--info-soft)',
      border: `1px solid ${am ? 'var(--charge-border)' : 'var(--info-border)'}`,
    }}>
      <div style={{ fontWeight: 650, color: am ? 'var(--charge)' : 'var(--info)' }}>{shift.type} · {am ? '06–14' : '14–22'}</div>
      <div style={{ color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{shift.station}</div>
    </div>
  );
}

function PeopleScreen() {
  const D = KC_DATA;
  const [tab, setTab] = useStateO('board');
  return (
    <div className="kc-fadeup">
      <PageHead title="People & Shifts" sub="Station operators, weekly rota, and swap requests"
        actions={<><Btn icon="download">Rota PDF</Btn><Btn variant="primary" icon="plus">Create shift</Btn></>} />
      <Tabs style={{ marginBottom: 12 }} value={tab} onChange={setTab} tabs={[
        { id: 'board', label: 'Shift board' },
        { id: 'swaps', label: 'Swap requests', count: D.SWAPS.length },
        { id: 'operators', label: 'Operators', count: D.OPERATORS.length },
      ]} />

      {tab === 'board' && (
        <Card pad={false} title="Week of June 8 – 14" action={
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="xs" icon="arrowL">Prev</Btn>
            <Btn size="xs">Next <Icon name="chevR" size={11} /></Btn>
            <Btn size="xs" variant="primary">Publish drafts</Btn>
          </div>
        }>
          <div style={{ overflowX: 'auto' }}>
            <table className="kc-table" style={{ minWidth: 900 }}>
              <thead><tr>
                <th style={{ minWidth: 150 }}>Operator</th>
                {D.SHIFT_DAYS.map(d => <th key={d} style={{ textAlign: 'center', background: d === 'Thu 11' ? 'var(--accent-soft)' : undefined }}>{d}{d === 'Thu 11' && <span style={{ marginLeft: 4, color: 'var(--charge)' }}>· today</span>}</th>)}
              </tr></thead>
              <tbody>
                {D.OPERATORS.map((op, oi) => (
                  <tr key={op} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={op} size={24} />
                        <div>
                          <div style={{ fontWeight: 550, fontSize: 12.5 }}>{op}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{D.SHIFTS[oi].filter(Boolean).length} shifts</div>
                        </div>
                      </div>
                    </td>
                    {D.SHIFT_DAYS.map((d, di) => (
                      <td key={d} style={{ textAlign: 'center', background: d === 'Thu 11' ? 'var(--accent-soft)' : undefined }}>
                        <ShiftChip shift={D.SHIFTS[oi][di]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '9px 14px', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text3)', display: 'flex', gap: 16 }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', opacity: .5, marginRight: 5 }}></span>AM 06:00–14:00</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--info)', opacity: .5, marginRight: 5 }}></span>PM 14:00–22:00</span>
            <span style={{ marginLeft: 'auto' }}>Click a cell to assign or edit · drag to move (coming with build)</span>
          </div>
        </Card>
      )}

      {tab === 'swaps' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {D.SWAPS.map(sw => (
            <Card key={sw.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Badge kind="warn" dot>Pending approval</Badge>
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text3)' }}>{sw.id}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 550, marginBottom: 2 }}>{sw.from} → {sw.to}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{sw.day} · {sw.station}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="primary" size="xs" icon="check">Approve</Btn>
                <Btn size="xs" icon="x">Decline</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'operators' && (
        <Card pad={false}>
          <table className="kc-table">
            <thead><tr><th>Operator</th><th>Home station</th><th className="num">Shifts · 30d</th><th className="num">Sessions handled</th><th>On shift now</th><th></th></tr></thead>
            <tbody>
              {KC_DATA.OPERATORS.map((op, i) => (
                <tr key={op} style={{ cursor: 'default' }}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={op} size={24} />{op}</div></td>
                  <td style={{ color: 'var(--text2)' }}>{KC_DATA.STATIONS[i % 5].name}</td>
                  <td className="num">{18 - i * 2}</td>
                  <td className="num">{214 - i * 31}</td>
                  <td>{i < 2 ? <Badge kind="ok" dot>On shift</Badge> : <span style={{ color: 'var(--text3)', fontSize: 12 }}>Off</span>}</td>
                  <td style={{ width: 30, color: 'var(--text3)' }}><Icon name="dots" size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ---------- Compliance (EBM) ---------- */
function ComplianceScreen({ navigate }) {
  const D = KC_DATA;
  const S = D.EBM_SUMMARY;
  const [tab, setTab] = useStateO('all');
  const rows = D.EBM_ROWS.filter(r => tab === 'all' || r.status === tab);
  return (
    <div className="kc-fadeup">
      <PageHead title="Compliance" sub="RRA fiscalization (EBM 2.1) — every session must produce a fiscal receipt"
        actions={<><Btn icon="refresh">Sync item codes</Btn><Btn icon="download">VAT report</Btn></>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
        <Stat label="Receipts issued · 30d" value={S.issued.toLocaleString()} delta={<><Icon name="check" size={11} /> 99.4% success</>} />
        <Stat label="Failed" value={S.failed} deltaKind="err" delta={<span style={{ color: 'var(--err)' }}>Retry available</span>} />
        <Stat label="Missing" value={S.missing} deltaKind="err" delta={<span style={{ color: 'var(--warn)' }}>Closed offline</span>} />
        <Stat label="VSDC connection" value="Connected" delta={<span style={{ color: 'var(--text3)' }}>SDC011000123 · RRA</span>} deltaKind="neutral" />
        <Stat label="Last item-code sync" value={S.lastSync} delta={<span style={{ color: 'var(--text3)' }}>2 codes pending push</span>} deltaKind="neutral" />
      </div>
      <Tabs style={{ marginBottom: 10 }} value={tab} onChange={setTab} tabs={[
        { id: 'all', label: 'All receipts' },
        { id: 'failed', label: 'Failed', count: D.EBM_ROWS.filter(r => r.status === 'failed').length },
        { id: 'missing', label: 'Missing', count: D.EBM_ROWS.filter(r => r.status === 'missing').length },
      ]} />
      <Card pad={false}>
        <table className="kc-table">
          <thead><tr><th>Receipt</th><th>Session</th><th>Station</th><th>Time</th><th className="num">Amount</th><th className="num">VAT 18%</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} onClick={() => navigate('sessions/' + r.session)}>
                <td className="mono" style={{ fontSize: 12 }}>{r.receipt}</td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text2)' }}>{r.session}</td>
                <td>{r.station}</td>
                <td style={{ color: 'var(--text3)' }}>{fmtDate(r.time)} · {fmtTime(r.time)}</td>
                <td className="num">{fmtRWF(r.amount)}</td>
                <td className="num" style={{ color: 'var(--text3)' }}>{fmtRWF(r.vat)}</td>
                <td>
                  <StatusBadge status={r.status} />
                  {r.reason && <div style={{ fontSize: 11, color: 'var(--err)', marginTop: 2 }}>{r.reason}</div>}
                </td>
                <td style={{ width: 90 }}>
                  {r.status !== 'issued' && <Btn size="xs" icon="refresh" onClick={e => e.stopPropagation()}>Retry</Btn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------- Team ---------- */
function TeamScreen() {
  const D = KC_DATA;
  return (
    <div className="kc-fadeup">
      <PageHead title="Team" sub="Who can access the Volcanoes Mobility console, and what they can do"
        actions={<Btn variant="primary" icon="plus">Invite member</Btn>} />
      <Card pad={false}>
        <table className="kc-table">
          <thead><tr><th>Member</th><th>Role</th><th>Last active</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {D.TEAM.map(m => (
              <tr key={m.id} style={{ cursor: 'default' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar name={m.name} size={26} />
                    <div><div style={{ fontWeight: 550 }}>{m.name}</div><div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{m.email}</div></div>
                  </div>
                </td>
                <td><Badge kind={m.role === 'Owner' ? 'charge' : m.role === 'Admin' ? 'info' : 'neutral'}>{m.role}</Badge></td>
                <td style={{ color: 'var(--text3)' }}>{m.last}</td>
                <td><StatusBadge status={m.status} /></td>
                <td style={{ width: 30, color: 'var(--text3)' }}><Icon name="dots" size={14} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
        {[['Owner', 'Everything, incl. billing & deletion'], ['Admin', 'Manage stations, tariffs, people'], ['Finance', 'Revenue, payouts, compliance'], ['Operator', 'Run shifts & sessions on site']].map(([r, d]) => (
          <Card key={r}><div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 3 }}>{r}</div><div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{d}</div></Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsScreen() {
  return (
    <div className="kc-fadeup" style={{ maxWidth: 720 }}>
      <PageHead title="Settings" sub="Organization profile, billing details, and developer access" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card title="Organization">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Organization name', 'Volcanoes Mobility Ltd'], ['TIN', '112 233 445'], ['Country', 'Rwanda'], ['Currency', 'RWF — Rwandan franc']].map(([k, v]) => (
              <label key={k} style={{ fontSize: 11.5, color: 'var(--text3)' }}>{k}
                <input defaultValue={v} style={{ width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }} />
              </label>
            ))}
          </div>
          <div style={{ marginTop: 12 }}><Btn variant="primary">Save changes</Btn></div>
        </Card>
        <Card title="Payout account">
          <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="building" size={16} style={{ color: 'var(--text3)' }} />
            <span>Bank of Kigali · RWF account ····4471</span>
            <Badge kind="ok" dot>Verified</Badge>
            <Btn size="xs" style={{ marginLeft: 'auto' }}>Change</Btn>
          </div>
        </Card>
        <Card title="API access">
          <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 10 }}>Pull sessions, telemetry, and revenue into your own systems.</div>
          <div className="mono" style={{ fontSize: 12, background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="key" size={13} style={{ color: 'var(--text3)' }} />
            kbs_live_••••••••••••3f8a
            <Btn size="xs" style={{ marginLeft: 'auto' }}>Reveal</Btn>
            <Btn size="xs" icon="refresh">Rotate</Btn>
          </div>
        </Card>
        <Card title="Danger zone" style={{ borderColor: 'var(--err-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
            <span style={{ color: 'var(--text2)' }}>Transfer ownership or delete this organization and all its data.</span>
            <Btn variant="danger" size="xs" style={{ marginLeft: 'auto' }}>Delete organization</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { PeopleScreen, ComplianceScreen, TeamScreen, SettingsScreen });
