// ═══════════════════════════════════════════════════════════════
// Eq Finance — UI primitives (design system do handoff)
// Cards sólidos, faixa azul, valores em mono. Sem glass, sem tilt.
// Nomes antigos (TiltCard, Avatar…) mantidos como alias pra não
// quebrar as telas ainda não migradas.
// ═══════════════════════════════════════════════════════════════

// ─── Ícones (traço, 18px padrão, stroke 1.7) ───
const Icon = ({ name, size = 18, stroke = 1.7, style }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    wallet: <><rect x="2" y="5" width="20" height="15" rx="4"/><path d="M16 12h.01"/><path d="M2 10h20"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    pulse: <path d="M3 12h4l3-9 4 18 3-9h4"/>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    arrow_up: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrow_down: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    arrow_right: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    chevron_left: <polyline points="15 18 9 12 15 6"/>,
    chevron_right: <polyline points="9 18 15 12 9 6"/>,
    chevron_down: <polyline points="6 9 12 15 18 9"/>,
    moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="4"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    stethoscope: <><path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6v0a6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3"/><path d="M8 15v3a3 3 0 006 0v-1"/><circle cx="20" cy="10" r="2"/></>,
    sparkles: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></>,
    grip: <><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    more: <><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    infinity: <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0, ...style }}>
      {icons[name]}
    </svg>
  );
};

// ─── fmtMoney: formata número em Real (usa window.fmt se existir) ───
const _brl = (n) => 'R$\u00a0' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Money — valor monetário em mono, alinhado à direita, sinal opcional ───
const Money = ({ value, size = 'table', signed = false, colorBySign = false, style = {} }) => {
  const n = Number(value) || 0;
  const sizes = { table: 12.5, kpi: 16, metric: 30 };
  const fs = sizes[size] || sizes.table;
  let color = 'inherit';
  if (colorBySign) color = n > 0 ? 'var(--c-pos)' : n < 0 ? 'var(--c-neg)' : 'var(--ink)';
  const sign = signed ? (n > 0 ? '+ ' : n < 0 ? '- ' : '') : (n < 0 ? '- ' : '');
  const abs = Math.abs(n);
  return (
    <span style={{
      fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums',
      fontSize: fs, fontWeight: 500, color,
      letterSpacing: size === 'metric' ? '-.03em' : 0,
      whiteSpace: 'nowrap', ...style,
    }}>{sign}{_brl(abs).replace('R$\u00a0', 'R$\u00a0')}</span>
  );
};

// ─── Counter — número animado (mantido pro dashboard) ───
const Counter = ({ value, format = (n) => n, duration = 800, className = '', style }) => {
  const [display, setDisplay] = React.useState(Number(value) || 0);
  const prev = React.useRef(Number(value) || 0);
  React.useEffect(() => {
    const from = prev.current, to = Number(value) || 0;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    let raf, done = false;
    const snap = setTimeout(() => { if (!done) { setDisplay(to); prev.current = to; done = true; } }, duration * 1.5 + 150);
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else { prev.current = to; done = true; }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(snap); };
  }, [value]);
  return <span className={className} style={style}>{format(display)}</span>;
};

// ─── Card — branco sólido, borda suave, sombra sutil ───
const Card = ({ children, style = {}, padding = 20, variant = 'default', onClick, ...rest }) => {
  const radii = { default: 'var(--r-2xl)', kpi: 'var(--r-xl)', compact: 'var(--r-xl)' };
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: radii[variant] || radii.default,
      boxShadow: 'var(--sh-1)',
      padding,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }} {...rest}>{children}</div>
  );
};

// ─── Botão — primário (azul), secundário (contorno), ghost, danger ───
// onBand=true inverte as cores para uso sobre a faixa azul.
const Btn = ({ children, onClick, variant = 'primary', icon, iconRight, size = 'md', full, onBand = false, style = {}, ...rest }) => {
  const [hover, setHover] = React.useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: size === 'sm' ? 30 : 34, padding: size === 'sm' ? '0 11px' : '0 14px',
    borderRadius: 'var(--r-lg)', border: '1px solid transparent',
    font: '600 12.5px var(--f-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
    width: full ? '100%' : 'auto', transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
  };
  let v;
  if (onBand) {
    const map = {
      primary:   { background: '#fff', color: 'var(--accent)', border: '1px solid transparent' },
      secondary: { background: 'var(--on-accent-fill)', color: 'var(--on-accent)', border: '1px solid rgba(255,255,255,.35)' },
    };
    v = map[variant] || map.primary;
    if (hover && variant === 'primary') v = { ...v, background: 'rgba(255,255,255,.9)' };
  } else {
    const map = {
      primary:   { background: hover ? 'var(--accent-strong)' : 'var(--accent)', color: '#fff' },
      secondary: { background: hover ? 'var(--bg)' : 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line-strong)' },
      ghost:     { background: hover ? 'var(--bg)' : 'transparent', color: 'var(--ink-2)' },
      danger:    { background: hover ? 'var(--c-neg)' : 'var(--c-neg-bg)', color: hover ? '#fff' : 'var(--c-neg)' },
    };
    v = map[variant] || map.primary;
  }
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...v, ...style }} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} stroke={2} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} stroke={2} />}
    </button>
  );
};

// ─── Botão de ícone (tabela: 28; header: 34–36) ───
const IconBtn = ({ name, onClick, size = 28, iconSize, danger = false, title, style = {}, ...rest }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, borderRadius: size >= 34 ? 'var(--r-lg)' : 'var(--r-md)',
        border: '1px solid var(--line-strong)',
        background: hover ? (danger ? 'var(--c-neg-bg)' : 'var(--bg)') : 'var(--surface)',
        color: danger && hover ? 'var(--c-neg)' : 'var(--ink-2)',
        display: 'grid', placeItems: 'center', cursor: 'pointer',
        transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
        ...style,
      }} {...rest}>
      <Icon name={name} size={iconSize || (size >= 34 ? 18 : 14)} stroke={1.9} />
    </button>
  );
};

// ─── Pill de status ───
// tipo: pago | pendente | atrasado | hoje  (ou passe color/bg custom)
const STATUS = {
  pago:     { c: 'var(--c-pos)',     bg: 'var(--c-pos-bg)' },
  pendente: { c: 'var(--c-neutral)', bg: 'var(--c-neutral-bg)' },
  atrasado: { c: 'var(--c-neg)',     bg: 'var(--c-neg-bg)' },
  hoje:     { c: 'var(--c-warn)',    bg: 'var(--c-warn-bg)' },
};
const Pill = ({ children, status, color, bg, size = 'md' }) => {
  let c = color, b = bg;
  if (status && STATUS[status]) { c = STATUS[status].c; b = STATUS[status].bg; }
  if (!c) { c = 'var(--ink-2)'; b = 'var(--c-neutral-bg)'; }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 'var(--r-md)',
      background: b, color: c,
      font: `600 ${size === 'sm' ? 10 : 10.5}px var(--f-sans)`,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

// Pill de categoria (usa --cat-1..8; passa o índice 1-8 ou uma cor)
const CatPill = ({ children, cat = 8 }) => {
  const color = typeof cat === 'number' ? `var(--cat-${cat})` : cat;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 'var(--r-md)',
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      color, font: '600 11px var(--f-sans)', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

// ─── Segmented control (indicador desliza) ───
const Segmented = ({ options, value, onChange, style = {} }) => {
  const idx = Math.max(0, options.findIndex(o => (o.value ?? o) === value));
  const n = options.length;
  return (
    <div style={{
      position: 'relative', display: 'inline-flex',
      background: 'var(--field)', borderRadius: 'var(--r-lg)', padding: 3, ...style,
    }}>
      <div style={{
        position: 'absolute', top: 3, bottom: 3, left: 3,
        width: `calc((100% - 6px) / ${n})`,
        transform: `translateX(${idx * 100}%)`,
        background: 'var(--surface)', borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-3)',
        transition: 'transform var(--dur) var(--ease)',
      }} />
      {options.map((o, i) => {
        const val = o.value ?? o, label = o.label ?? o;
        const active = val === value;
        return (
          <button key={i} onClick={() => onChange(val)} style={{
            position: 'relative', zIndex: 1, flex: 1, border: 'none', background: 'none',
            padding: '5px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
            font: `600 12px var(--f-sans)`, color: active ? 'var(--ink)' : 'var(--ink-2)',
            transition: 'color var(--dur) var(--ease)',
          }}>{label}</button>
        );
      })}
    </div>
  );
};

// ─── Chip (filtro) ───
const Chip = ({ children, active, onClick, style = {} }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        height: 32, padding: '0 14px', borderRadius: 'var(--r-md)', cursor: 'pointer',
        font: `${active ? 600 : 500} 12px var(--f-sans)`,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--line-strong)'}`,
        background: active ? 'var(--accent-soft)' : (hover ? 'var(--bg)' : 'var(--surface)'),
        color: active ? 'var(--accent)' : 'var(--ink-2)',
        transition: 'all var(--dur) var(--ease)', ...style,
      }}>{children}</button>
  );
};

// ─── Checkbox ───
const Checkbox = ({ checked, onChange, label, style = {} }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', font: '500 12.5px var(--f-sans)', color: 'var(--ink)', ...style }}>
    <span onClick={() => onChange(!checked)} style={{
      width: 16, height: 16, borderRadius: 'var(--r-sm)', flexShrink: 0,
      background: checked ? 'var(--accent)' : 'transparent',
      border: checked ? '1.5px solid var(--accent)' : '1.5px solid rgba(28,37,48,.2)',
      display: 'grid', placeItems: 'center', transition: 'all var(--dur-fast) var(--ease)',
    }}>
      {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
    </span>
    {label && <span onClick={() => onChange(!checked)}>{label}</span>}
  </label>
);

// ─── Toggle ───
const Toggle = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)} style={{
    width: 40, height: 22, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
    background: checked ? 'var(--accent)' : '#D6DCE4', position: 'relative',
    transition: 'background var(--dur) var(--ease)', flexShrink: 0,
  }}>
    <span style={{
      position: 'absolute', top: 2, left: checked ? 18 : 2, width: 18, height: 18,
      borderRadius: '50%', background: '#fff', boxShadow: 'var(--sh-3)',
      transition: 'left var(--dur-fast) var(--ease)',
    }} />
  </button>
);

// ─── Input / Select ───
const inputStyle = {
  height: 34, padding: '0 12px', borderRadius: 'var(--r-lg)',
  border: '1px solid var(--line-strong)', background: 'var(--field)',
  font: '400 12.5px var(--f-sans)', color: 'var(--ink)', outline: 'none',
  fontFamily: 'var(--f-sans)',
};
const Field = ({ label, children, style = {} }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
    {label && <span style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>{label}</span>}
    {children}
  </label>
);

// ─── Faixa azul de marca (Band) ───
// title, subtitle, right (ações/mês), metricLabel, metric, stats[{label,value,color}]
const Band = ({ title, subtitle, right, metricLabel, metric, stats = [], children }) => (
  <div style={{
    background: 'var(--accent-band)', color: 'var(--on-accent)',
    padding: 'var(--band-pad)', borderRadius: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ font: 'var(--t-h1)', letterSpacing: '-.02em', color: 'var(--on-accent)' }}>{title}</h1>
        {subtitle && <div style={{ font: '400 12.5px var(--f-sans)', color: 'var(--on-accent-2)', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{right}</div>}
    </div>
    {(metric != null || stats.length > 0) && (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
        <div>
          {metricLabel && <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--on-accent-2)', marginBottom: 6 }}>{metricLabel}</div>}
          {metric != null && <div style={{ font: 'var(--t-metric)', letterSpacing: '-.03em', color: 'var(--on-accent)' }}>{typeof metric === 'string' ? metric : _brl(metric)}</div>}
        </div>
        {stats.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: '0 22px', borderLeft: i ? '1px solid var(--on-accent-3)' : 'none' }}>
                <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--on-accent-2)', marginBottom: 5 }}>{s.label}</div>
                <div style={{ font: 'var(--t-kpi)', color: s.color || 'var(--on-accent)' }}>{typeof s.value === 'string' ? s.value : _brl(s.value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
    {children}
  </div>
);

// ─── Seletor de mês (para a faixa) ───
const MonthNav = ({ label, onPrev, onNext }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,.14)', borderRadius: 'var(--r-lg)', padding: 3 }}>
    <button onClick={onPrev} style={{ width: 28, height: 28, borderRadius: 'var(--r-md)', border: 'none', background: 'transparent', color: 'var(--on-accent)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <Icon name="chevron_left" size={16} stroke={2.2} />
    </button>
    <span style={{ minWidth: 92, textAlign: 'center', font: '600 12.5px var(--f-sans)', color: 'var(--on-accent)' }}>{label}</span>
    <button onClick={onNext} style={{ width: 28, height: 28, borderRadius: 'var(--r-md)', border: 'none', background: 'transparent', color: 'var(--on-accent)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <Icon name="chevron_right" size={16} stroke={2.2} />
    </button>
  </div>
);

// ─── Estado vazio ───
const EmptyState = ({ icon = 'file', title, hint, actions }) => (
  <div style={{
    border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-xl)',
    padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
  }}>
    <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
      <Icon name={icon} size={22} />
    </div>
    <div style={{ font: '600 13.5px var(--f-sans)', color: 'var(--ink)' }}>{title}</div>
    {hint && <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', maxWidth: 340 }}>{hint}</div>}
    {actions && <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>{actions}</div>}
  </div>
);

// ─── Avatar (iniciais ou foto) ───
const Avatar = ({ initials, size = 34, color = 'var(--ink)', bg }) => (
  <div style={{
    width: size, height: size, borderRadius: 'var(--r-lg)',
    background: bg || 'var(--surface-3)', color,
    display: 'grid', placeItems: 'center', flexShrink: 0,
    font: `700 ${size * 0.38}px var(--f-sans)`, letterSpacing: '-.02em',
  }}>{initials}</div>
);
const UserAvatar = ({ profile, name, size = 32 }) => {
  const url = profile?.avatar_url || null;
  const initials = (name || profile?.name || profile?.email || '?').slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={initials} style={{ width: size, height: size, borderRadius: 'var(--r-lg)', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />;
  return <Avatar initials={initials} size={size} color="#fff" bg="var(--ink)" />;
};

// ─── Logo Eq Finance (quadrado azul + glifo infinito) ───
const Logo = ({ size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: 'var(--r-xl)',
    background: 'linear-gradient(140deg, var(--accent-2), var(--accent))',
    display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
  }}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>
    </svg>
  </div>
);

// ═══ ALIASES de compatibilidade — telas antigas ainda usam estes ═══
// TiltCard antigo -> Card (sem tilt/glass). Ignora props glowColor/interactive/drag.
const TiltCard = ({ children, style = {}, padding = 20, interactive, glowColor, onClick, drag, ...rest }) => (
  <Card padding={padding} onClick={onClick} style={style} {...rest}>{children}</Card>
);

Object.assign(window, {
  Icon, Counter, Money, fmtMoney: _brl,
  Card, Btn, IconBtn, Pill, CatPill, Segmented, Chip, Checkbox, Toggle,
  Field, inputStyle, Band, MonthNav, EmptyState, Avatar, UserAvatar, Logo,
  // aliases
  TiltCard,
});
