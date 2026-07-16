// UI primitives for Infinity — icons, buttons, glass cards, badges
// Tema: monocromático (branco / cinza / preto) com superfícies de vidro.

const Icon = ({ name, size = 20, stroke = 1.8 }) => {
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
    trending_up: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    trending_down: <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>,
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{display:'block', flexShrink:0}}>
      {icons[name]}
    </svg>
  );
};

// Animated counter — snaps to target if rAF is throttled
const Counter = ({ value, format = (n) => n, duration = 900, className = '', style }) => {
  const target = Number(value) || 0;
  const [display, setDisplay] = React.useState(target);
  const prev = React.useRef(target);
  React.useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    let raf, done = false;
    const snapTimer = setTimeout(() => { if (!done) { setDisplay(to); prev.current = to; done = true; } }, duration * 1.5 + 150);
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { prev.current = to; done = true; }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(snapTimer); };
  }, [value]);
  return <span className={className} style={style}>{format(display)}</span>;
};

// Botão monocromático com ripple
const Btn = ({ children, onClick, variant = 'primary', icon, size = 'md', iconRight, full, style = {}, ...rest }) => {
  const ref = React.useRef(null);
  const [ripples, setRipples] = React.useState([]);

  const handleClick = (e) => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const id = Math.random();
      setRipples(rs => [...rs, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(() => setRipples(rs => rs.filter(p => p.id !== id)), 600);
    }
    onClick?.(e);
  };

  const variants = {
    primary:   { bg: 'var(--accent)', fg: 'var(--accent-ink)', border: 'transparent', shadow: '0 6px 18px oklch(0 0 0 / 0.22)' },
    secondary: { bg: 'var(--surface)', fg: 'var(--ink)', border: 'var(--line-strong)', shadow: 'var(--shadow-sm)', glass: true },
    ghost:     { bg: 'transparent', fg: 'var(--ink-soft)', border: 'transparent', shadow: 'none' },
    tonal:     { bg: 'var(--bg-alt)', fg: 'var(--ink)', border: 'transparent', shadow: 'none' },
    danger:    { bg: 'var(--c-neg)', fg: '#fff', border: 'transparent', shadow: '0 6px 18px oklch(0 0 0 / 0.18)' },
  };
  const v = variants[variant] || variants.primary;
  const paddings = { sm: '8px 14px', md: '11px 20px', lg: '13px 26px' };
  const fontSize = { sm: 13, md: 14, lg: 15 };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: paddings[size],
        borderRadius: 'var(--r-sm)',
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.border}`,
        backdropFilter: v.glass ? 'var(--glass-blur)' : 'none',
        WebkitBackdropFilter: v.glass ? 'var(--glass-blur)' : 'none',
        fontSize: fontSize[size], fontWeight: 600, letterSpacing: -0.1,
        transition: 'transform 0.2s cubic-bezier(.22,1,.36,1), box-shadow 0.25s, background 0.25s, opacity 0.2s',
        boxShadow: v.shadow,
        width: full ? '100%' : 'auto',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
      {...rest}
    >
      {icon && <Icon name={icon} size={16} stroke={2} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={16} stroke={2} />}
      {ripples.map(r => (
        <span key={r.id} style={{
          position:'absolute', left:r.x, top:r.y, width:0, height:0,
          borderRadius:'50%', background:'oklch(1 0 0 / 0.4)',
          transform:'translate(-50%,-50%)', pointerEvents:'none',
          animation:'rippleExpand 0.6s ease-out forwards',
        }} />
      ))}
      <style>{`@keyframes rippleExpand { to { width: 360px; height: 360px; opacity: 0; } }`}</style>
    </button>
  );
};

// Cartão de vidro (tilt 3D bem sutil)
const TiltCard = ({ children, style = {}, padding = 24, interactive = true, glowColor, onClick, drag, ...rest }) => {
  const ref = React.useRef(null);
  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0, mx: 50, my: 50 });

  const handleMove = (e) => {
    if (!interactive) return;
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 100;
    const my = ((e.clientY - r.top) / r.height) * 100;
    const rx = (my - 50) * -0.035;
    const ry = (mx - 50) * 0.035;
    setTilt({ rx, ry, mx, my });
  };
  const handleLeave = () => setTilt({ rx: 0, ry: 0, mx: 50, my: 50 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={(e) => { handleLeave(); e.currentTarget.style.boxShadow = ''; }}
      onClick={onClick}
      className="glass"
      style={{
        position: 'relative',
        borderRadius: 'var(--r-lg)',
        padding,
        transform: interactive ? `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` : 'none',
        transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s, border-color 0.3s',
        transformStyle: 'preserve-3d',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md), var(--glass-inset)';
      }}
      {...rest}
    >
      {interactive && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'var(--r-lg)',
          background: `radial-gradient(420px circle at ${tilt.mx}% ${tilt.my}%, oklch(1 0 0 / 0.5), transparent 42%)`,
          opacity: tilt.rx || tilt.ry ? 0.5 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
          mixBlendMode: 'soft-light',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

// Badge / pill
const Pill = ({ children, color = 'var(--ink)', soft = true, size = 'md' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: size === 'sm' ? '3px 10px' : '5px 12px',
    borderRadius: 999,
    background: soft ? `color-mix(in oklch, ${color} 10%, transparent)` : color,
    color: soft ? color : 'var(--accent-ink)',
    border: soft ? `1px solid color-mix(in oklch, ${color} 22%, transparent)` : '1px solid transparent',
    fontSize: size === 'sm' ? 11 : 12,
    fontWeight: 600,
    letterSpacing: 0.1,
    whiteSpace: 'nowrap',
  }}>{children}</span>
);

// Avatar — gradiente de grafite
const Avatar = ({ initials, size = 38, color = 'var(--g-7)' }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2.6,
    background: `linear-gradient(135deg, color-mix(in oklch, ${color} 88%, white), color-mix(in oklch, ${color} 78%, black))`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--bg)', fontWeight: 700, fontSize: size * 0.38, letterSpacing: -0.3,
    flexShrink: 0,
    boxShadow: '0 4px 12px oklch(0 0 0 / 0.22)',
  }}>{initials}</div>
);

// Avatar com suporte a foto (avatar_url) ou iniciais
const UserAvatar = ({ profile, name, size = 38, color = 'var(--g-7)' }) => {
  const url = profile?.avatar_url || null;
  const initials = (name || profile?.name || profile?.email || '?').slice(0, 2).toUpperCase();
  if (url) {
    return (
      <img src={url} alt={initials}
        style={{
          width: size, height: size, borderRadius: size / 2.6,
          objectFit: 'cover', flexShrink: 0,
          border: '2px solid var(--line-strong)',
        }}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
      />
    );
  }
  return <Avatar initials={initials} size={size} color={color} />;
};

Object.assign(window, { Icon, Counter, Btn, TiltCard, Pill, Avatar, UserAvatar });
