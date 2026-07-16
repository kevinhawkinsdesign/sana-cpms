// Kabisa Console — app shell: top bar (org switcher) + grouped sidebar
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

const NAV = [
  { group: null, items: [{ id: 'overview', label: 'Overview', icon: 'home' }] },
  {
    group: 'Infrastructure', items: [
      { id: 'stations', label: 'Stations', icon: 'station' },
      { id: 'sessions', label: 'Sessions', icon: 'bolt', live: true },
      { id: 'tariffs', label: 'Tariffs & Rates', icon: 'tariff' },
    ]
  },
  {
    group: 'Business', items: [
      { id: 'revenue', label: 'Revenue & Billing', icon: 'money' },
      { id: 'compliance', label: 'Compliance', icon: 'shield', alert: true },
    ]
  },
  {
    group: 'Operations', items: [
      { id: 'people', label: 'People & Shifts', icon: 'people' },
    ]
  },
  {
    group: 'Organization', items: [
      { id: 'team', label: 'Team', icon: 'key' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ]
  },
];

function useClickOutside(ref, fn) {
  useEffectS(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) fn(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
}

function OrgSwitcher({ org, setOrg, navigate }) {
  const [open, setOpen] = useStateS(false);
  const ref = useRefS(null);
  useClickOutside(ref, () => setOpen(false));
  const orgs = KC_DATA.ORGS;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 8px', borderRadius: 6, color: 'var(--text)', fontSize: 13, fontWeight: 550, fontFamily: 'inherit',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--sunken)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
        <span style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700 }}>{org.initials}</span>
        {org.name}
        <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 7px', fontWeight: 500 }}>{org.plan}</span>
        <Icon name="chevD" size={13} style={{ color: 'var(--text3)' }} />
      </button>
      {open && (
        <div className="kc-fadeup" style={{ position: 'absolute', top: '110%', left: 0, width: 280, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 60, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Organizations</div>
          {orgs.map(o => (
            <button key={o.id} onClick={() => { setOrg(o); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 12px', background: o.id === org.id ? 'var(--sunken)' : 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sunken)'}
              onMouseLeave={e => e.currentTarget.style.background = o.id === org.id ? 'var(--sunken)' : 'none'}>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: o.id === 'kabisa' ? 'var(--text)' : 'var(--accent)', color: o.id === 'kabisa' ? 'var(--page)' : 'var(--accent-ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>{o.initials}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text3)' }}>{o.role}</span>
              </span>
              {o.id === org.id && <Icon name="check" size={14} style={{ color: 'var(--ok)' }} />}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { setOpen(false); navigate('onboarding'); }} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text2)', fontFamily: 'inherit', fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sunken)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Icon name="plus" size={14} /> Create organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifMenu() {
  const [open, setOpen] = useStateS(false);
  const ref = useRefS(null);
  useClickOutside(ref, () => setOpen(false));
  const faults = KC_DATA.FAULTS.filter(f => f.state === 'open');
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} aria-label="Notifications" style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 6, borderRadius: 6, display: 'flex' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--sunken)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
        <Icon name="bell" size={16} />
        {faults.length > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 99, background: 'var(--err)', border: '1.5px solid var(--topbar-bg)' }}></span>}
      </button>
      {open && (
        <div className="kc-fadeup" style={{ position: 'absolute', top: '120%', right: 0, width: 330, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 60, overflow: 'hidden' }}>
          <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600 }}>Notifications</div>
          {faults.map(f => (
            <div key={f.id} style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 9 }}>
              <span style={{ color: f.sev === 'critical' ? 'var(--err)' : 'var(--warn)', marginTop: 1 }}><Icon name="alert" size={14} /></span>
              <div style={{ fontSize: 12.5, minWidth: 0 }}>
                <div style={{ fontWeight: 550 }}>{f.code} <span className="mono" style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}>{f.charger}</span></div>
                <div style={{ color: 'var(--text3)', fontSize: 11.5, marginTop: 1 }}>{f.station} · {f.time}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '8px 13px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>That's everything from the last 24h</div>
        </div>
      )}
    </div>
  );
}

function TopBar({ org, setOrg, navigate, route }) {
  return (
    <header style={{
      height: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
      background: 'var(--topbar-bg)', borderBottom: '1px solid var(--sidebar-border)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <a onClick={() => navigate('overview')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: 2 }} aria-label="Kabisa home">
        <img src={(window.__resources && window.__resources.kabisaSymbol) || "assets/kabisa-symbol.png"} alt="Kabisa" style={{ height: 24, width: 'auto', display: 'block' }} />
      </a>
      <span style={{ color: 'var(--border-strong)', fontSize: 15, fontWeight: 300, userSelect: 'none' }}>/</span>
      <OrgSwitcher org={org} setOrg={setOrg} navigate={navigate} />
      <div style={{ flex: 1 }}></div>
      <button onClick={() => { }} style={{
        display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', background: 'var(--sunken)',
        borderRadius: 6, padding: '5px 10px', fontSize: 12.5, color: 'var(--text3)', cursor: 'pointer', width: 220, fontFamily: 'inherit',
      }}>
        <Icon name="search" size={13} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search stations, sessions…</span>
        <span className="mono" style={{ fontSize: 10.5, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', background: 'var(--surface)' }}>⌘K</span>
      </button>
      <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 99, cursor: 'pointer', color: 'var(--text2)', padding: '4px 12px', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit' }}>Docs</button>
      <NotifMenu />
      <Avatar name="Aline Uwase" size={28} />
    </header>
  );
}

function Sidebar({ route, navigate, org }) {
  const openFaults = KC_DATA.EBM_SUMMARY.failed + KC_DATA.EBM_SUMMARY.missing;
  const liveCount = KC_DATA.SESSIONS.filter(s => s.live).length;
  const rootOf = r => r.split('/')[0] === 'chargers' ? 'stations' : r.split('/')[0];
  return (
    <nav style={{
      width: 210, flexShrink: 0, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)',
      padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2,
      position: 'sticky', top: 48, height: 'calc(100vh - 48px)', overflowY: 'auto',
    }}>
      {NAV.map((g, gi) => (
        <React.Fragment key={gi}>
          {g.group && <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', padding: '12px 10px 4px' }}>{g.group}</div>}
          {g.items.map(item => {
            const on = rootOf(route) === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '6px 10px', borderRadius: 6,
                border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                fontWeight: on ? 600 : 450,
                color: on ? 'var(--text)' : 'var(--text2)',
                background: on ? 'var(--accent-soft)' : 'none',
                boxShadow: on ? 'inset 2.5px 0 0 var(--accent)' : 'none',
                transition: 'background .1s',
              }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--sunken)'; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'none'; }}>
                <Icon name={item.icon} size={15} style={{ color: on ? 'var(--text)' : 'var(--text3)' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.live && liveCount > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--charge)', background: 'var(--charge-soft)', border: '1px solid var(--charge-border)', borderRadius: 99, padding: '0 6px', lineHeight: '15px' }}>{liveCount}</span>
                )}
                {item.alert && openFaults > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--err)', background: 'var(--err-soft)', border: '1px solid var(--err-border)', borderRadius: 99, padding: '0 6px', lineHeight: '15px' }}>{openFaults}</span>
                )}
              </button>
            );
          })}
        </React.Fragment>
      ))}
      <div style={{ flex: 1 }}></div>
      <div style={{ borderTop: '1px solid var(--sidebar-border)', paddingTop: 10, margin: '10px 2px 2px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--text3)', padding: '0 8px', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ok)' }}></span>
            All systems operational
          </div>
          <div style={{ marginTop: 2, opacity: .8 }}>CSMS v2.4 · OCPP 2.0.1</div>
        </div>
      </div>
    </nav>
  );
}

Object.assign(window, { TopBar, Sidebar, NAV });
