// Animated charts: line (cash flow), donut (categories), bars, sparkline

// Smooth line/area chart with draw-in animation
const FlowChart = ({ data, height = 260, colorIn = 'var(--c-pos)', colorOut = 'var(--c-neg)', showOut = true }) => {
  const ref = React.useRef(null);
  const [hover, setHover] = React.useState(null);
  const [w, setW] = React.useState(600);

  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pad = { t: 24, r: 20, b: 30, l: 12 };
  const chartW = Math.max(100, w - pad.l - pad.r);
  const chartH = height - pad.t - pad.b;
  const allVals = data.flatMap(d => [d.in, showOut ? d.out : 0]);
  const max = Math.max(...allVals, 1);
  const min = 0;

  const toX = (i) => pad.l + (data.length === 1 ? chartW/2 : (i / (data.length - 1)) * chartW);
  const toY = (v) => pad.t + chartH - ((v - min) / (max - min)) * chartH;

  // smooth path helper — monotone-style
  const smoothPath = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i], p1 = points[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      d += ` C ${cx1} ${p0.y}, ${cx2} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const inPts = data.map((d, i) => ({ x: toX(i), y: toY(d.in) }));
  const outPts = data.map((d, i) => ({ x: toX(i), y: toY(d.out) }));
  const inPath = smoothPath(inPts);
  const outPath = smoothPath(outPts);
  const inArea = inPath ? inPath + ` L ${toX(data.length-1)} ${toY(0)} L ${toX(0)} ${toY(0)} Z` : '';

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const x = e.clientX - r.left;
    // find closest index
    let best = 0, bd = 9999;
    data.forEach((_, i) => {
      const d = Math.abs(toX(i) - x);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(best);
  };

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      <svg width={w} height={height} onMouseMove={handleMove} onMouseLeave={() => setHover(null)} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorIn} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colorIn} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={pad.l} x2={pad.l + chartW} y1={pad.t + chartH * t} y2={pad.t + chartH * t}
            stroke="var(--line)" strokeDasharray="2 4" strokeWidth="1" />
        ))}

        {/* area */}
        <path d={inArea} fill="url(#areaIn)" style={{ animation: 'fadeIn 0.8s ease 0.3s both' }} />
        {/* in line */}
        <path d={inPath} fill="none" stroke={colorIn} strokeWidth="3" strokeLinecap="round"
          style={{
            strokeDasharray: 2000, strokeDashoffset: 2000,
            animation: 'drawIn 1.6s cubic-bezier(.22,1,.36,1) 0.1s forwards',
          }} />
        {/* out line */}
        {showOut && (
          <path d={outPath} fill="none" stroke={colorOut} strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4"
            style={{
              strokeDasharray: 2000, strokeDashoffset: 2000,
              animation: 'drawIn 1.6s cubic-bezier(.22,1,.36,1) 0.3s forwards',
            }} />
        )}
        {/* dots */}
        {inPts.map((p, i) => (
          <circle key={'in'+i} cx={p.x} cy={p.y} r={hover === i ? 7 : 4}
            fill="var(--surface-solid)" stroke={colorIn} strokeWidth="2.5"
            style={{ transition: 'r 0.2s', animation: `popIn 0.4s ease ${0.4 + i*0.08}s both` }} />
        ))}
        {showOut && outPts.map((p, i) => (
          <circle key={'out'+i} cx={p.x} cy={p.y} r={hover === i ? 6 : 3}
            fill="var(--surface-solid)" stroke={colorOut} strokeWidth="2"
            style={{ transition: 'r 0.2s', animation: `popIn 0.4s ease ${0.5 + i*0.08}s both` }} />
        ))}
        {/* labels */}
        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="var(--ink-mute)" fontFamily="Space Grotesk" fontWeight="500">
            {d.label}
          </text>
        ))}
        {/* hover cursor */}
        {hover !== null && (
          <>
            <line x1={toX(hover)} x2={toX(hover)} y1={pad.t} y2={pad.t + chartH}
              stroke="var(--ink-mute)" strokeDasharray="2 3" strokeWidth="1" />
          </>
        )}
      </svg>
      <style>{`@keyframes drawIn { to { stroke-dashoffset: 0; } }`}</style>

      {/* tooltip */}
      {hover !== null && data[hover] && (
        <div style={{
          position: 'absolute', left: Math.min(w - 180, Math.max(0, toX(hover) - 90)), top: 8,
          background: 'var(--ink)', color: 'var(--bg)',
          padding: '10px 14px', borderRadius: 14, fontSize: 12,
          boxShadow: 'var(--shadow-lg)', pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease',
          minWidth: 160,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{data[hover].label}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ opacity: 0.7 }}>Entradas</span>
            <span className="mono" style={{ color: colorIn, fontWeight: 600 }}>{window.fmtShort(data[hover].in)}</span>
          </div>
          {showOut && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ opacity: 0.7 }}>Saídas</span>
              <span className="mono" style={{ color: colorOut, fontWeight: 600 }}>{window.fmtShort(data[hover].out)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.7 }}>Saldo</span>
            <span className="mono" style={{ fontWeight: 700 }}>{window.fmtShort(data[hover].in - data[hover].out)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Horizontal bar ranking with animated growth
const RankBars = ({ items, maxItems = 6, onHover }) => {
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const max = Math.max(...sorted.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sorted.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: `slideUp 0.5s ease ${i*0.07}s both` }}
            onMouseEnter={() => onHover?.(d)} onMouseLeave={() => onHover?.(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>{window.fmtShort(d.value)}</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: d.color,
                borderRadius: 999,
                animation: `barGrowH 1s cubic-bezier(.22,1,.36,1) ${i*0.08}s both`,
                boxShadow: 'none',
                transformOrigin: 'left center',
              }} />
            </div>
          </div>
        );
      })}
      <style>{`@keyframes barGrowH { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
};

// Mini sparkline
const Sparkline = ({ values, color = 'var(--ink)', width = 100, height = 32, area = true }) => {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const areaPath = path + ` L ${width} ${height} L 0 ${height} Z`;
  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 500, strokeDashoffset: 500, animation: 'drawIn 1.2s ease 0.2s forwards' }} />
    </svg>
  );
};

// Donut with animated sweep
const Donut = ({ segments, size = 180, thickness = 28, centerLabel, centerValue }) => {
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const pct = total > 0 ? s.value / total : 0;
          const dash = pct * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              style={{
                transition: 'stroke-dashoffset 0.5s, stroke-dasharray 0.5s',
                animation: `donutGrow-${i} 1.1s cubic-bezier(.22,1,.36,1) ${i*0.08}s both`,
              }}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      {segments.map((s, i) => (
        <style key={i}>{`@keyframes donutGrow-${i} { from { stroke-dasharray: 0 ${circ}; } }`}</style>
      ))}
      {(centerValue || centerLabel) && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          {centerValue && <div className="mono" style={{ fontSize: size * 0.14, fontWeight: 700, color: 'var(--ink)' }}>{centerValue}</div>}
          {centerLabel && <div style={{ fontSize: 12, color: 'var(--ink-mute)', fontWeight: 500, marginTop: 2 }}>{centerLabel}</div>}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { FlowChart, RankBars, Sparkline, Donut });
