// Kabisa Console — design tokens + global CSS
// Light/dark themes, Geist type, Kabisa yellow #FFD400 as restrained accent.

const KABISA_YELLOW = '#FFD400';

const themes = {
  light: {
    page: '#f7f7f8', surface: '#ffffff', surface2: '#fafafa', sunken: '#f4f4f5',
    border: '#e4e4e7', borderStrong: '#d4d4d8',
    text: '#18181b', text2: '#52525b', text3: '#8e8e98',
    accent: KABISA_YELLOW, accentInk: '#221d00', accentSoft: 'rgba(255,212,0,.14)',
    ok: '#15803d', okSoft: '#f0fdf4', okBorder: '#bbf7d0',
    warn: '#b45309', warnSoft: '#fffbeb', warnBorder: '#fde68a',
    err: '#b91c1c', errSoft: '#fef2f2', errBorder: '#fecaca',
    info: '#1d4ed8', infoSoft: '#eff6ff', infoBorder: '#bfdbfe',
    charge: '#854d0e', chargeSoft: '#fefce8', chargeBorder: '#fde047',
    chartLine: '#18181b', chartFill: 'rgba(255,212,0,.22)', chartGrid: '#ececee',
    shadow: '0 1px 2px rgba(0,0,0,.04)',
    shadowLg: '0 12px 32px -8px rgba(0,0,0,.16)',
    sidebarBg: '#ffffff', sidebarBorder: '#e4e4e7',
    topbarBg: '#ffffff',
  },
  dark: {
    page: '#0c0c0d', surface: '#151517', surface2: '#1a1a1d', sunken: '#101012',
    border: '#26262b', borderStrong: '#3a3a41',
    text: '#f4f4f5', text2: '#a8a8b3', text3: '#6e6e78',
    accent: KABISA_YELLOW, accentInk: '#221d00', accentSoft: 'rgba(255,212,0,.12)',
    ok: '#4ade80', okSoft: 'rgba(34,197,94,.12)', okBorder: 'rgba(34,197,94,.3)',
    warn: '#fbbf24', warnSoft: 'rgba(245,158,11,.12)', warnBorder: 'rgba(245,158,11,.3)',
    err: '#f87171', errSoft: 'rgba(239,68,68,.12)', errBorder: 'rgba(239,68,68,.3)',
    info: '#60a5fa', infoSoft: 'rgba(59,130,246,.12)', infoBorder: 'rgba(59,130,246,.3)',
    charge: '#fde047', chargeSoft: 'rgba(255,212,0,.10)', chargeBorder: 'rgba(255,212,0,.35)',
    chartLine: '#fde047', chartFill: 'rgba(255,212,0,.10)', chartGrid: '#222226',
    shadow: '0 1px 2px rgba(0,0,0,.4)',
    shadowLg: '0 12px 32px -8px rgba(0,0,0,.6)',
    sidebarBg: '#0f0f11', sidebarBorder: '#222226',
    topbarBg: '#0f0f11',
  },
};

function themeCSS(t, density) {
  const compact = density === 'compact';
  return `
  :root {
    --page:${t.page}; --surface:${t.surface}; --surface2:${t.surface2}; --sunken:${t.sunken};
    --border:${t.border}; --border-strong:${t.borderStrong};
    --text:${t.text}; --text2:${t.text2}; --text3:${t.text3};
    --accent:${t.accent}; --accent-ink:${t.accentInk}; --accent-soft:${t.accentSoft};
    --ok:${t.ok}; --ok-soft:${t.okSoft}; --ok-border:${t.okBorder};
    --warn:${t.warn}; --warn-soft:${t.warnSoft}; --warn-border:${t.warnBorder};
    --err:${t.err}; --err-soft:${t.errSoft}; --err-border:${t.errBorder};
    --info:${t.info}; --info-soft:${t.infoSoft}; --info-border:${t.infoBorder};
    --charge:${t.charge}; --charge-soft:${t.chargeSoft}; --charge-border:${t.chargeBorder};
    --chart-line:${t.chartLine}; --chart-fill:${t.chartFill}; --chart-grid:${t.chartGrid};
    --shadow:${t.shadow}; --shadow-lg:${t.shadowLg};
    --sidebar-bg:${t.sidebarBg}; --sidebar-border:${t.sidebarBorder}; --topbar-bg:${t.topbarBg};
    --row-h:${compact ? '38px' : '46px'};
    --cell-py:${compact ? '7px' : '11px'};
    --fs-table:${compact ? '12.5px' : '13px'};
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body {
    font-family:'Geist','Geist Fallback',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:var(--page); color:var(--text);
    font-size:13.5px; line-height:1.45;
    -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  }
  code, .mono { font-family:'Geist Mono',ui-monospace,'SF Mono',Menlo,monospace; }
  a { color:inherit; text-decoration:none; }
  button { font-family:inherit; }
  ::selection { background:var(--accent); color:var(--accent-ink); }
  *:focus-visible { outline:2px solid var(--accent); outline-offset:1px; border-radius:4px; }
  ::-webkit-scrollbar { width:10px; height:10px; }
  ::-webkit-scrollbar-thumb { background:var(--border-strong); border-radius:8px; border:2px solid var(--page); }
  ::-webkit-scrollbar-track { background:transparent; }

  .kc-card { background:var(--surface); border:1px solid var(--border); border-radius:8px; box-shadow:var(--shadow); }
  .kc-table { width:100%; border-collapse:collapse; font-size:var(--fs-table); }
  .kc-table th {
    text-align:left; font-weight:500; color:var(--text3); font-size:11px;
    text-transform:uppercase; letter-spacing:.05em; padding:8px 12px;
    border-bottom:1px solid var(--border); white-space:nowrap;
    background:var(--surface2); position:sticky; top:0; z-index:1;
  }
  .kc-table td { padding:var(--cell-py) 12px; border-bottom:1px solid var(--border); vertical-align:middle; white-space:nowrap; }
  .kc-table tbody tr { cursor:pointer; transition:background .1s; }
  .kc-table tbody tr:hover { background:var(--surface2); }
  .kc-table tbody tr:last-child td { border-bottom:none; }
  .kc-table .num { text-align:right; font-variant-numeric:tabular-nums; }
  .kc-table th.num { text-align:right; }

  .kc-fadeup { opacity:1; }
  @keyframes kcPulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
  .kc-pulse { animation:kcPulse 1.6s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .kc-pulse { animation:none; } }
  `;
}

function ThemeStyle({ mode, density }) {
  const t = themes[mode] || themes.light;
  return <style dangerouslySetInnerHTML={{ __html: themeCSS(t, density) }}></style>;
}

window.KC_THEMES = themes;
window.ThemeStyle = ThemeStyle;
window.KABISA_YELLOW = KABISA_YELLOW;
