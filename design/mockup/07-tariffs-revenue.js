// Kabisa Console — Tariffs & Rates + Revenue & Billing
const { useState: useStateM } = React;

function TouStrip({ tou, height = 22 }) {
  // 24h strip; multiplier bands
  const color = m => m > 1.05 ? 'var(--warn)' : m < 0.95 ? 'var(--info)' : 'var(--accent)';
  return (
    <div>
      <div style={{ display: 'flex', height, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {Array.from({ length: 24 }, (_, h) => {
          const band = tou.find(b => h >= b.from && h < b.to);
          return <div key={h} title={band ? `${String(h).padStart(2, '0')}:00 · ×${band.mult}` : `${String(h).padStart(2, '0')}:00 · not active`}
            style={{ flex: 1, background: band ? color(band.mult) : 'var(--sunken)', opacity: band ? (band.mult > 1.05 ? 0.9 : band.mult < 0.95 ? 0.55 : 0.8) : 1, borderRight: h < 23 ? '1px solid var(--surface)' : 'none' }}></div>;
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--text3)', marginTop: 3 }}>
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}

function TariffsScreen() {
  const D = KC_DATA;
  const [sel, setSel] = useStateM(D.TARIFFS[0].id);
  const t = D.TARIFFS.find(x => x.id === sel);
  return (
    <div className="kc-fadeup">
      <PageHead title="Tariffs & Rates" sub="Pricing applied to chargers, with time-of-use bands and contract overrides"
        actions={<Btn variant="primary" icon="plus">New tariff</Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10, alignItems: 'start' }}>
        <Card pad={false}>
          {D.TARIFFS.map(tf => (
            <div key={tf.id} onClick={() => setSel(tf.id)} style={{
              padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
              background: sel === tf.id ? 'var(--accent-soft)' : 'none',
              boxShadow: sel === tf.id ? 'inset 2.5px 0 0 var(--accent)' : 'none',
            }}
              onMouseEnter={e => { if (sel !== tf.id) e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { if (sel !== tf.id) e.currentTarget.style.background = 'none'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{tf.name}</span>
                <StatusBadge status={tf.status} />
                <span style={{ marginLeft: 'auto', fontWeight: 650, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{tf.perKwh} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>RWF/kWh</span></span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 8 }}>{tf.applies} · updated {tf.updated}</div>
              <TouStrip tou={tf.tou} height={14} />
            </div>
          ))}
          <div style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--text3)', display: 'flex', gap: 14 }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--info)', opacity: .55, borderRadius: 2, marginRight: 5 }}></span>off-peak</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)', opacity: .8, borderRadius: 2, marginRight: 5 }}></span>standard</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--warn)', opacity: .9, borderRadius: 2, marginRight: 5 }}></span>peak</span>
          </div>
        </Card>
        <Card title={<>Edit — {t.name}</>} action={<StatusBadge status={t.status} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[['Energy rate', t.perKwh, 'RWF / kWh'], ['Idle fee', t.idleFee, 'RWF / min'], ['Session fee', 0, 'RWF flat'], ['Per-minute rate', t.perMin, 'RWF / min']].map(([label, val, unit]) => (
              <label key={label} style={{ fontSize: 11.5, color: 'var(--text3)', display: 'block' }}>
                {label}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', overflow: 'hidden' }}>
                  <input defaultValue={val} style={{ width: '100%', border: 'none', padding: '7px 10px', fontSize: 13.5, fontWeight: 600, background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
                  <span style={{ fontSize: 10.5, color: 'var(--text3)', padding: '0 9px', borderLeft: '1px solid var(--border)', whiteSpace: 'nowrap', alignSelf: 'stretch', display: 'flex', alignItems: 'center', background: 'var(--surface2)' }}>{unit}</span>
                </div>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 5 }}>Time-of-use bands</div>
          <TouStrip tou={t.tou} />
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginTop: 8 }}>
            <tbody>
              {t.tou.map((b, i) => (
                <tr key={i}>
                  <td className="mono" style={{ padding: '4px 0', color: 'var(--text2)', fontSize: 12 }}>{String(b.from).padStart(2, '0')}:00 – {String(b.to).padStart(2, '0')}:00</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>×{b.mult.toFixed(2)} <span style={{ color: 'var(--text3)' }}>→ {Math.round(t.perKwh * b.mult)} RWF/kWh</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <Btn variant="primary" icon="check">Save & publish</Btn>
            <Btn>Preview impact</Btn>
            <Btn variant="ghost" style={{ marginLeft: 'auto', color: 'var(--err)' }}>Archive</Btn>
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text3)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <Icon name="clock" size={12} /> Changes apply to new sessions only. Customers see updated pricing in the app immediately.
          </div>
        </Card>
      </div>
    </div>
  );
}

function RevenueScreen({ navigate }) {
  const D = KC_DATA;
  const [tab, setTab] = useStateM('analytics');
  const total30 = D.DAYS.reduce((s, d) => s + d.revenue, 0);
  const byStation = D.STATIONS.filter(s => s.revenue24 > 0).sort((a, b) => b.revenue24 - a.revenue24);
  const maxSt = byStation[0].revenue24;
  const payMix = [
    { label: 'MoMo', value: 52, color: 'var(--accent)' },
    { label: 'Card', value: 21, color: 'var(--text)' },
    { label: 'Contract', value: 17, color: 'var(--info)' },
    { label: 'Wallet', value: 10, color: 'var(--border-strong)' },
  ];
  return (
    <div className="kc-fadeup">
      <PageHead title="Revenue & Billing" sub="Money in, fees out, payouts to your bank — fully reconciled with EBM"
        actions={<><Select options={['Last 30 days', 'This quarter', 'Year to date']} value="Last 30 days" onChange={() => { }} /><Btn icon="download">Statement</Btn></>} />
      <Tabs style={{ marginBottom: 12 }} value={tab} onChange={setTab} tabs={[
        { id: 'analytics', label: 'Analytics' },
        { id: 'payouts', label: 'Payouts', count: D.PAYOUTS.length },
        { id: 'methods', label: 'Payment methods' },
      ]} />

      {tab === 'analytics' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          <Stat label="Gross revenue · 30d" value={fmtRWF(total30)} delta={<><Icon name="arrowUR" size={11} /> 11.4% vs prior 30d</>} />
          <Stat label="Energy billed" value={D.DAYS.reduce((s, d) => s + d.energy, 0).toLocaleString()} sub="kWh" />
          <Stat label="Avg. revenue / session" value={fmtRWF(total30 / D.DAYS.reduce((s, d) => s + d.sessions, 0))} />
          <Stat label="Next payout (accruing)" value={fmtRWF(D.PAYOUTS[3].net)} delta={<span style={{ color: 'var(--text3)' }}>settles Mon, Jun 16</span>} deltaKind="neutral" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <Card title="Daily gross revenue" action={<span style={{ fontSize: 11.5, color: 'var(--text3)' }}>RWF · VAT inclusive</span>}>
            <AreaChart data={D.DAYS.map(d => d.revenue)} h={210} labels={D.DAYS.map((d, i) => i % 5 === 0 ? fmtDate(d.date) : null)} format={v => fmtRWF(v)} accentLast />
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Card title="By station — 24h" pad={false}>
              <div style={{ padding: '8px 14px' }}>
                {byStation.map(s => (
                  <div key={s.id} onClick={() => navigate('stations/' + s.id)} style={{ padding: '5px 0', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span>{s.name}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 550 }}>{fmtRWFc(s.revenue24)}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--sunken)', borderRadius: 99 }}>
                      <div style={{ width: (s.revenue24 / maxSt * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 99 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Payment mix — 30d">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Donut segments={payMix} size={104} thickness={13} centerLabel="100%" centerSub="captured" />
                <div style={{ flex: 1 }}>
                  {payMix.map(p => (
                    <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, padding: '2.5px 0' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }}></span>
                      <span style={{ color: 'var(--text2)' }}>{p.label}</span>
                      <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', fontWeight: 550 }}>{p.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </>}

      {tab === 'payouts' && (
        <Card pad={false}>
          <table className="kc-table">
            <thead><tr><th>Payout</th><th>Period</th><th className="num">Gross</th><th className="num">Platform fee (2%)</th><th className="num">VAT withheld</th><th className="num">Net to bank</th><th>Status</th><th>Paid</th></tr></thead>
            <tbody>
              {D.PAYOUTS.map(p => (
                <tr key={p.id} style={{ cursor: 'default' }}>
                  <td className="mono" style={{ fontSize: 12 }}>{p.id}</td>
                  <td>{p.period}</td>
                  <td className="num">{fmtRWF(p.gross)}</td>
                  <td className="num" style={{ color: 'var(--text3)' }}>−{fmtRWF(p.fees)}</td>
                  <td className="num" style={{ color: 'var(--text3)' }}>−{fmtRWF(p.vat)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtRWF(p.net)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td style={{ color: 'var(--text3)' }}>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '9px 14px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
            Payouts settle every Monday to Bank of Kigali ····4471. VAT is remitted to RRA on your behalf via EBM.
          </div>
        </Card>
      )}

      {tab === 'methods' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { name: 'MTN MoMo Pay', detail: 'Merchant code 88412 · instant capture', status: 'active' },
            { name: 'Card payments (DPO)', detail: 'Visa · Mastercard · settles T+2', status: 'active' },
            { name: 'Fleet contracts', detail: '2 active contracts · invoiced monthly', status: 'active' },
          ].map(m => (
            <Card key={m.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                <StatusBadge status={m.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{m.detail}</div>
              <Btn size="xs">Configure</Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TariffsScreen, RevenueScreen });
