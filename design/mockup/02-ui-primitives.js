// Kabisa Console — UI primitives: icons, badges, buttons, tabs, stats, charts
const { useState, useMemo } = React;

/* ---------- Icons (stroke style, lucide-like) ---------- */
const ICON_PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6',
  station: 'M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3.5 21h13M16 8h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 1 0 3 0V9l-2.5-2.5M8.5 7h4M10.5 11l-2 3.5h4l-2 3.5',
  bolt: 'M13 2 4.5 13.5H11L9.5 22 18.5 10H12L13 2Z',
  tariff: 'M12 2v20M16.5 5.5h-6a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6h-7',
  money: 'M2.5 7h19v10h-19zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5.5 10a2.5 2.5 0 0 1-3 0M21.5 14a2.5 2.5 0 0 0-3 0',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75',
  shield: 'M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10ZM8.5 11.5l2.5 2.5 4.5-5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Zm4.3 13a2 2 0 0 0 3.4 0',
  chevD: 'm6 9 6 6 6-6',
  chevR: 'm9 6 6 6-6 6',
  arrowL: 'M19 12H5m7 7-7-7 7-7',
  arrowUR: 'M7 17 17 7M8 7h9v9',
  plus: 'M12 5v14M5 12h14',
  dots: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  filter: 'M3 5h18l-7 8v5l-4 2v-7L3 5Z',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
  alert: 'M12 9v4m0 4h.01M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2',
  car: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M5 11h14M5 11a2 2 0 0 0-2 2v4h2m14-6a2 2 0 0 1 2 2v4h-2m-12 0a1.5 1.5 0 1 1-3 0m15 0a1.5 1.5 0 1 1-3 0m-9 0h9',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M9 13h6M9 17h6',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  wrench: 'M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  key: 'M21 2 12.5 10.5M15.5 7.5l3 3M11 13a5 5 0 1 1-7 7 5 5 0 0 1 7-7Z',
  building: 'M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2',
};
function Icon({ name, size = 16, stroke = 1.7, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      <path d={ICON_PATHS[name] || ICON_PATHS.dots}></path>
    </svg>
  );
}

/* ---------- Badges ---------- */
const BADGE_KINDS = {
  ok: { c: 'var(--ok)', bg: 'var(--ok-soft)', bd: 'var(--ok-border)' },
  warn: { c: 'var(--warn)', bg: 'var(--warn-soft)', bd: 'var(--warn-border)' },
  err: { c: 'var(--err)', bg: 'var(--err-soft)', bd: 'var(--err-border)' },
  info: { c: 'var(--info)', bg: 'var(--info-soft)', bd: 'var(--info-border)' },
  charge: { c: 'var(--charge)', bg: 'var(--charge-soft)', bd: 'var(--charge-border)' },
  neutral: { c: 'var(--text2)', bg: 'var(--sunken)', bd: 'var(--border)' },
};
function Badge({ kind = 'neutral', children, dot, pulse }) {
  const k = BADGE_KINDS[kind] || BADGE_KINDS.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, fontSize: 11.5, fontWeight: 500, color: k.c, background: k.bg, border: `1px solid ${k.bd}`, whiteSpace: 'nowrap', lineHeight: '16px' }}>
      {dot && <span className={pulse ? 'kc-pulse' : ''} style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }}></span>}
      {children}
    </span>
  );
}
const STATUS_BADGE = {
  operational: ['ok', 'Operational'], degraded: ['warn', 'Degraded'], maintenance: ['warn', 'Maintenance'],
  installing: ['info', 'Installing'], online: ['ok', 'Online'], offline: ['neutral', 'Offline'], fault: ['err', 'Fault'],
  Available: ['ok', 'Available'], Charging: ['charge', 'Charging'], Preparing: ['info', 'Preparing'],
  Faulted: ['err', 'Faulted'], Unavailable: ['neutral', 'Unavailable'], Offline: ['neutral', 'Offline'],
  issued: ['ok', 'Issued'], failed: ['err', 'Failed'], missing: ['warn', 'Missing'], pending: ['info', 'Pending'],
  paid: ['ok', 'Paid'], accruing: ['info', 'Accruing'], active: ['ok', 'Active'], draft: ['neutral', 'Draft'], invited: ['info', 'Invited'],
  open: ['err', 'Open'], resolved: ['ok', 'Resolved'], critical: ['err', 'Critical'], warning: ['warn', 'Warning'],
};
function StatusBadge({ status, pulse }) {
  const [kind, label] = STATUS_BADGE[status] || ['neutral', status];
  return <Badge kind={kind} dot pulse={pulse || status === 'Charging'}>{label}</Badge>;
}

/* ---------- Buttons ---------- */
function Btn({ variant = 'default', size = 'sm', icon, children, onClick, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500,
    borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
    padding: size === 'xs' ? '3px 8px' : size === 'md' ? '8px 14px' : '5px 10px',
    fontSize: size === 'xs' ? 12 : 13, transition: 'all .12s', boxShadow: 'var(--shadow)',
  };
  if (variant === 'primary') Object.assign(base, { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 600 });
  if (variant === 'ghost') Object.assign(base, { border: '1px solid transparent', background: 'transparent', boxShadow: 'none', color: 'var(--text2)' });
  if (variant === 'danger') Object.assign(base, { color: 'var(--err)', borderColor: 'var(--err-border)', background: 'var(--err-soft)' });
  return (
    <button style={{ ...base, ...style }} onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(.96)'}
      onMouseLeave={e => e.currentTarget.style.filter = ''}>
      {icon && <Icon name={icon} size={size === 'xs' ? 12 : 14} />}{children}
    </button>
  );
}

/* ---------- Layout helpers ---------- */
function Card({ title, action, children, pad = true, style, className = '' }) {
  return (
    <div className={'kc-card ' + className} style={style}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          {action}
        </div>
      )}
      <div style={pad ? { padding: 14 } : {}}>{children}</div>
    </div>
  );
}
function Stat({ label, value, sub, delta, deltaKind = 'ok', spark }) {
  return (
    <div className="kc-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          {sub && <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 6 }}>{sub}</span>}
        </div>
        {spark}
      </div>
      {delta && (
        <div style={{ fontSize: 11.5, color: deltaKind === 'ok' ? 'var(--ok)' : deltaKind === 'err' ? 'var(--err)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
          {delta}
        </div>
      )}
    </div>
  );
}
function Tabs({ tabs, value, onChange, style }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', ...style }}>
      {tabs.map(t => {
        const id = typeof t === 'string' ? t : t.id;
        const label = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'object' ? t.count : null;
        const on = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontSize: 13,
            fontWeight: on ? 600 : 450, color: on ? 'var(--text)' : 'var(--text2)',
            borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {label}
            {count != null && <span style={{ fontSize: 10.5, fontWeight: 600, background: on ? 'var(--accent)' : 'var(--sunken)', color: on ? 'var(--accent-ink)' : 'var(--text2)', borderRadius: 99, padding: '0 6px', lineHeight: '16px' }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
function SearchBox({ placeholder = 'Search…', value, onChange, style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', display: 'flex' }}><Icon name="search" size={13} /></span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
        width: '100%', padding: '6px 10px 6px 28px', borderRadius: 6, border: '1px solid var(--border)',
        background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
      }} />
    </div>
  );
}
function Select({ options, value, onChange, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      padding: '6px 26px 6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)',
      color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', ...style,
    }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ---------- Charts (hand-rolled SVG) ---------- */
function AreaChart({ data, h = 180, format = v => v, labels, unit = '', accentLast = false }) {
  const [hover, setHover] = useState(null);
  const w = 760; // viewBox; scales to container
  const padL = 6, padR = 6, padT = 12, padB = 20;
  const max = Math.max(...data) * 1.08;
  const min = 0;
  const X = i => padL + (i / (data.length - 1)) * (w - padL - padR);
  const Y = v => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const area = line + `L${X(data.length - 1)},${h - padB}L${X(0)},${h - padB}Z`;
  const gridYs = [0.25, 0.5, 0.75].map(f => padT + f * (h - padT - padB));
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', display: 'block' }}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width * w;
          const i = Math.round((px - padL) / (w - padL - padR) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        onMouseLeave={() => setHover(null)}>
        {gridYs.map((y, i) => <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth="1"></line>)}
        <path d={area} fill="var(--chart-fill)"></path>
        <path d={line} fill="none" stroke="var(--chart-line)" strokeWidth="1.8"></path>
        {accentLast && <circle cx={X(data.length - 1)} cy={Y(data[data.length - 1])} r="3.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.5"></circle>}
        {hover != null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={padT} y2={h - padB} stroke="var(--border-strong)" strokeDasharray="3 3"></line>
            <circle cx={X(hover)} cy={Y(data[hover])} r="4" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2"></circle>
          </g>
        )}
        {labels && labels.map((l, i) => l ? (
          <text key={i} x={X(i)} y={h - 5} fontSize="9.5" fill="var(--text3)" textAnchor="middle" fontFamily="inherit">{l}</text>
        ) : null)}
      </svg>
      {hover != null && (
        <div style={{ position: 'absolute', left: `${(X(hover) / w) * 100}%`, top: 0, transform: `translateX(${hover > data.length * 0.7 ? '-108%' : '8%'})`, background: 'var(--text)', color: 'var(--page)', borderRadius: 6, padding: '4px 9px', fontSize: 11.5, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-lg)' }}>
          {format(data[hover])}{unit}
          {labels && labels[hover] && <span style={{ opacity: .6, fontWeight: 400, marginLeft: 5 }}>{labels[hover]}</span>}
        </div>
      )}
    </div>
  );
}
function Bars({ data, h = 120, format = v => v, labels, highlight = -1 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data) * 1.05;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: h }}>
        {data.map((v, i) => (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ flex: 1, height: `${Math.max(2, v / max * 100)}%`, borderRadius: '2px 2px 0 0', background: i === highlight || hover === i ? 'var(--accent)' : 'var(--chart-fill)', border: '1px solid', borderColor: i === highlight || hover === i ? 'var(--accent)' : 'var(--chart-grid)', borderBottom: 'none', transition: 'background .1s', cursor: 'default', position: 'relative' }}>
            {hover === i && (
              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translate(-50%,-4px)', background: 'var(--text)', color: 'var(--page)', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 5 }}>
                {format(v)}{labels && labels[i] != null && <span style={{ opacity: .6, fontWeight: 400, marginLeft: 4 }}>{labels[i]}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function Spark({ data, w = 72, h = 26, stroke = 'var(--text2)' }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.4"></polyline>
      <circle cx={w} cy={h - 2 - ((data[data.length - 1] - min) / (max - min || 1)) * (h - 4)} r="2.4" fill="var(--accent)"></circle>
    </svg>
  );
}
function Donut({ segments, size = 120, thickness = 14, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={thickness}></circle>
        {segments.map((s, i) => {
          const frac = s.value / total, dash = frac * C;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off}></circle>;
          off += dash;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{centerLabel}</div>
        {centerSub && <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{centerSub}</div>}
      </div>
    </div>
  );
}
function ConnectorDots({ connectors }) {
  const color = s => s === 'Charging' ? 'var(--accent)' : s === 'Available' ? 'var(--ok)' : s === 'Faulted' ? 'var(--err)' : s === 'Preparing' ? 'var(--info)' : 'var(--border-strong)';
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {connectors.map((c, i) => (
        <span key={i} title={`${c.std} — ${c.status}`} className={c.status === 'Charging' ? 'kc-pulse' : ''}
          style={{ width: 8, height: 8, borderRadius: 99, background: color(c.status), display: 'inline-block' }}></span>
      ))}
    </div>
  );
}
function Avatar({ name, size = 26 }) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span style={{ width: size, height: size, borderRadius: 99, background: 'var(--sunken)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: 'var(--text2)', flexShrink: 0 }}>{initials}</span>
  );
}
function PageHead({ title, sub, actions, back, onBack, crumb }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        {crumb && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text3)', marginBottom: 4, cursor: onBack ? 'pointer' : 'default' }} onClick={onBack}>
            {back && <Icon name="arrowL" size={12} />}{crumb}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 650, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10 }}>{title}</h1>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

Object.assign(window, { Icon, Badge, StatusBadge, Btn, Card, Stat, Tabs, SearchBox, Select, AreaChart, Bars, Spark, Donut, ConnectorDots, Avatar, PageHead });
