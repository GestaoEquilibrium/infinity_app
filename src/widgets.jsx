// Dashboard widgets — reflete os 5 pilares obrigatórios:
// • Contas (previsto vs realizado) separadas de Compras (caixa efetivo)
// • Filtro por mês/período (recebido via prop `filter`)
// • Saldo anterior do mês anterior sempre presente
//
// Layout novo: linha de KPIs (12) → Fluxo (8) + Previsto×Realizado (4)
//              → Top receitas (4) + Últimas compras (4) + Pendentes (4)

const DEFAULT_FILTER = () => {
  // Usa o último mês com dados (compras + contas) — garante que os widgets não fiquem vazios.
  const avail = window.availableMonths();
  if (avail && avail.length) {
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { mode: 'month', month: avail.includes(cur) ? cur : avail[avail.length - 1] };
  }
  const now = new Date();
  return { mode: 'month', month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` };
};

// Hook: computa dados a partir do filtro global (mês ou período)
function useWidgetData(filter) {
  const [rev, tick] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    window.addEventListener('sb-data-hydrated', tick);
    return () => window.removeEventListener('sb-data-hydrated', tick);
  }, []);

  return React.useMemo(() => {
    filter = filter || DEFAULT_FILTER();
    const f = filter.mode === 'month'
      ? { month: filter.month }
      : { from: filter.from, to: filter.to };

    const compras = window.filterCompras(f);
    const contas = window.filterContas(f);
    const agg = window.monthlyAggregates();

    // Caixa (compras efetivas)
    const totalIn = compras.filter(c => c.type === 'entrada').reduce((s, c) => s + c.amount, 0);
    const totalOut = compras.filter(c => c.type === 'saida').reduce((s, c) => s + c.amount, 0);
    const saldoMes = totalIn - totalOut;

    // Contas previstas vs realizadas
    const prev_in = contas.filter(c => c.tipo === 'receber').reduce((s, c) => s + c.previsto, 0);
    const real_in = contas.filter(c => c.tipo === 'receber').reduce((s, c) => s + c.realizado, 0);
    const prev_out = contas.filter(c => c.tipo === 'pagar').reduce((s, c) => s + c.previsto, 0);
    const real_out = contas.filter(c => c.tipo === 'pagar').reduce((s, c) => s + c.realizado, 0);

    // Saldo anterior (mês anterior ao início da janela)
    const anchor = filter.mode === 'month' ? filter.month : (filter.from || '').slice(0, 7);
    const saldoAnt = anchor ? window.saldoAnterior(anchor) : 0;
    const saldoAcumulado = saldoAnt + saldoMes;

    // Comparativo mês anterior (caixa)
    const prevMonthKey = (() => {
      if (!anchor) return null;
      const [y, m] = anchor.split('-').map(Number);
      const d = new Date(y, m - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    const prevAggMonth = agg.find(a => a.key === prevMonthKey);
    const prevIn = prevAggMonth?.compras.in || 0;
    const prevOut = prevAggMonth?.compras.out || 0;
    const prevSaldo = prevIn - prevOut;

    const saldoTrend = prevSaldo !== 0 ? ((saldoMes - prevSaldo) / Math.abs(prevSaldo)) * 100 : 0;
    const inTrend = prevIn ? ((totalIn - prevIn) / prevIn) * 100 : 0;
    const outTrend = prevOut ? ((totalOut - prevOut) / prevOut) * 100 : 0;

    // Série de fluxo (últimos 8 meses — independente do filtro, p/ contexto)
    const last8 = agg.slice(-8);
    let running = 0;
    const flow = last8.map(m => {
      running += (m.compras.in - m.compras.out);
      return { label: m.label, in: m.compras.in, out: m.compras.out, balance: running };
    });
    const sparkVals = last8.map(m => m.compras.in - m.compras.out);

    // Ranking de receita por categoria (dentro do filtro)
    const revByCat = new Map();
    compras.filter(c => c.type === 'entrada').forEach(t => {
      if (!revByCat.has(t.category)) revByCat.set(t.category, { label: t.category, value: 0, color: t.color });
      revByCat.get(t.category).value += t.amount;
    });
    const revRanking = [...revByCat.values()].sort((a, b) => b.value - a.value);

    // Últimas compras (dentro do filtro)
    const recentTxs = [...compras].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

    // Contas pendentes próximas (não pagas, ordenadas por vencimento)
    const pendentes = contas.filter(c => !c.pago).sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 6);

    return {
      filter, compras, contas,
      totalIn, totalOut, saldoMes, saldoAnt, saldoAcumulado,
      prev_in, real_in, prev_out, real_out,
      saldoTrend, inTrend, outTrend,
      flow, sparkVals, revRanking, recentTxs, pendentes,
    };
  }, [filter, rev]);
}

// ── Cabeçalho padrão dos cartões ──────────────────────────────
const CardHead = ({ title, subtitle, icon, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingRight: 30 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--r-xs)',
          background: 'var(--bg-alt)', border: '1px solid var(--line)',
          color: 'var(--ink)', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon name={icon} size={17} stroke={2} />
        </div>
      )}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2, color: 'var(--ink)' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 1 }}>{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

// ─── LINHA DE KPIs (pilares: saldo anterior + caixa do período) ───
const KpiTile = ({ label, value, trend, trendLabel, icon, hero, spark, delay = 0 }) => (
  <TiltCard padding={20} style={{ animation: `slideUp 0.5s cubic-bezier(.22,1,.36,1) ${delay}s both`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 128 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</span>
      <div style={{
        width: 30, height: 30, borderRadius: 'var(--r-xs)',
        background: hero ? 'var(--accent)' : 'var(--bg-alt)',
        color: hero ? 'var(--accent-ink)' : 'var(--ink-soft)',
        border: hero ? 'none' : '1px solid var(--line)',
        display: 'grid', placeItems: 'center',
      }}>
        <Icon name={icon} size={15} stroke={2.2} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <Counter value={value} format={(n) => window.fmt(n)} className="mono"
          style={{ fontSize: hero ? 26 : 22, fontWeight: 700, letterSpacing: -0.8, color: 'var(--ink)', display: 'block', lineHeight: 1.1, whiteSpace: 'nowrap' }} />
        {trend !== undefined && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 11, fontWeight: 600, color: trend >= 0 ? 'var(--c-pos)' : 'var(--c-neg)' }}>
            <Icon name={trend >= 0 ? 'trending_up' : 'trending_down'} size={12} stroke={2.5} />
            {Math.abs(trend).toFixed(1)}% {trendLabel || 'vs anterior'}
          </span>
        )}
        {trend === undefined && trendLabel && (
          <span style={{ display: 'inline-block', marginTop: 7, fontSize: 11, fontWeight: 500, color: 'var(--ink-mute)' }}>{trendLabel}</span>
        )}
      </div>
      {spark && <div style={{ flexShrink: 0 }}><Sparkline values={spark} color="var(--ink)" width={84} height={30} /></div>}
    </div>
  </TiltCard>
);

const KpisWidget = ({ data }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
    <KpiTile hero label="Saldo acumulado" value={data.saldoAcumulado} icon="wallet"
      trend={data.saldoTrend} spark={data.sparkVals} delay={0} />
    <KpiTile label="Entradas do período" value={data.totalIn} icon="arrow_down" trend={data.inTrend} delay={0.06} />
    <KpiTile label="Saídas do período" value={data.totalOut} icon="arrow_up" trend={data.outTrend} delay={0.12} />
    <KpiTile label="Saldo anterior" value={data.saldoAnt} icon="arrow_right"
      trendLabel={`movimento do período: ${data.saldoMes >= 0 ? '+' : ''}${window.fmtShort(data.saldoMes)}`} delay={0.18} />
  </div>
);

// Compat: SummaryWidget antigo agora aponta para a linha de KPIs
const SummaryWidget = KpisWidget;

// ─── PREVISTO vs REALIZADO (entradas e saídas) — pilar #4 ───
const PrevRealWidget = ({ data }) => {
  const rows = [
    { label: 'Entradas previstas', prev: data.prev_in, real: data.real_in, color: 'var(--c-pos)' },
    { label: 'Saídas previstas',   prev: data.prev_out, real: data.real_out, color: 'var(--c-neg)' },
  ];
  return (
    <TiltCard padding={24} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHead title="Previsto × Realizado" subtitle="Contas do período" icon="pulse" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'center' }}>
        {rows.map((r, i) => {
          const pct = r.prev > 0 ? Math.min(100, (r.real / r.prev) * 100) : 0;
          const diff = r.real - r.prev;
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{r.label}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={{ position: 'relative', height: 12, borderRadius: 999, background: 'var(--bg-alt)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                <div style={{
                  position: 'absolute', inset: 0, width: pct + '%',
                  background: r.color,
                  borderRadius: 999,
                  transformOrigin: 'left',
                  animation: 'barGrowH 0.9s cubic-bezier(.22,1,.36,1) both',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11 }}>
                <span style={{ color: 'var(--ink-mute)' }}>Previsto <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>{window.fmtShort(r.prev)}</span></span>
                <span style={{ color: 'var(--ink-mute)' }}>Realizado <span className="mono" style={{ color: 'var(--ink)', fontWeight: 700 }}>{window.fmtShort(r.real)}</span></span>
                <span className="mono" style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>
                  {diff >= 0 ? '+' : ''}{window.fmtShort(diff)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes barGrowH { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </TiltCard>
  );
};

const FlowWidget = ({ data }) => (
  <TiltCard interactive={false} padding={24} style={{ height: '100%' }}>
    <CardHead title="Fluxo de caixa" subtitle="Últimos 8 meses"
      right={
        <div style={{ display: 'flex', gap: 14, fontSize: 12, paddingTop: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-soft)' }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--c-pos)' }} /> Entradas
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-soft)' }}>
            <span style={{ width: 14, height: 0, borderTop: '3px dashed var(--c-neg)' }} /> Saídas
          </span>
        </div>
      } />
    <FlowChart data={data.flow} height={252} />
  </TiltCard>
);

// ── Linha de lista compacta (compras / pendências) ────────────
const ListRow = ({ icon, iconColor, title, meta, value, valueColor, last, delay = 0 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
    borderBottom: last ? 'none' : '1px solid var(--line)',
    animation: `slideUp 0.5s ease ${delay}s both`,
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 'var(--r-xs)',
      background: `color-mix(in oklch, ${iconColor} 10%, transparent)`,
      border: `1px solid color-mix(in oklch, ${iconColor} 18%, transparent)`,
      color: iconColor,
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      <Icon name={icon} size={14} stroke={2.4} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</div>
    </div>
    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: valueColor || 'var(--ink)', flexShrink: 0 }}>{value}</span>
  </div>
);

const LIST_BODY = { minHeight: 280, maxHeight: 340, overflowY: 'auto' };

const RankingWidget = ({ data }) => (
  <TiltCard padding={24} style={{ height: '100%' }}>
    <CardHead title="Top receitas" subtitle="Categorias do período" icon="trending_up" />
    <div style={LIST_BODY}>
      <RankBars items={data.revRanking} maxItems={5} />
      {data.revRanking.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Sem receitas no período.</div>
      )}
    </div>
  </TiltCard>
);

const RecentWidget = ({ data }) => (
  <TiltCard padding={24} style={{ height: '100%' }}>
    <CardHead title="Últimas compras" subtitle="Movimentações do caixa" icon="wallet"
      right={
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--ink-soft)', paddingTop: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--ink)', color: 'var(--ink)', animation: 'pulseRing 1.8s infinite' }} />
          ATIVO
        </div>
      } />
    <div style={LIST_BODY}>
      {data.recentTxs.slice(0, 6).map((t, i, arr) => (
        <ListRow key={t.id}
          icon={t.type === 'entrada' ? 'arrow_down' : 'arrow_up'}
          iconColor={t.type === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)'}
          title={t.description}
          meta={`${window.fmtDate(t.date)} · ${t.category}`}
          value={`${t.type === 'entrada' ? '+' : '−'}${window.fmtShort(t.amount)}`}
          valueColor={t.type === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)'}
          last={i === arr.length - 1}
          delay={i * 0.05} />
      ))}
      {data.recentTxs.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Sem compras no período.</div>
      )}
    </div>
  </TiltCard>
);

// Pendentes (contas não pagas / não recebidas próximas)
const PendentesWidget = ({ data }) => (
  <TiltCard padding={24} style={{ height: '100%' }}>
    <CardHead title="Contas pendentes" subtitle="Vencimentos próximos" icon="calendar" />
    <div style={LIST_BODY}>
      {data.pendentes.map((c, i, arr) => (
        <ListRow key={c.id}
          icon={c.tipo === 'receber' ? 'arrow_down' : 'arrow_up'}
          iconColor={c.tipo === 'receber' ? 'var(--c-pos)' : 'var(--c-neg)'}
          title={c.description}
          meta={`Vence ${window.fmtDate(c.vencimento)} · ${c.category}`}
          value={window.fmtShort(c.previsto)}
          valueColor="var(--ink)"
          last={i === arr.length - 1}
          delay={i * 0.05} />
      ))}
      {data.pendentes.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Tudo em dia ✨</div>
      )}
    </div>
  </TiltCard>
);

const WIDGETS = {
  kpis:      { title: 'Indicadores',          render: KpisWidget,      span: 12 },
  flow:      { title: 'Fluxo de caixa',       render: FlowWidget,      span: 8 },
  prevreal:  { title: 'Previsto × Realizado', render: PrevRealWidget,  span: 4 },
  ranking:   { title: 'Top receitas',         render: RankingWidget,   span: 4 },
  recent:    { title: 'Últimas compras',      render: RecentWidget,    span: 4 },
  pendentes: { title: 'Contas pendentes',     render: PendentesWidget, span: 4 },
};

Object.assign(window, {
  WIDGETS, useWidgetData, DEFAULT_FILTER,
  SummaryWidget, KpisWidget, FlowWidget, RankingWidget, RecentWidget, PrevRealWidget, PendentesWidget,
  CardHead, ListRow,
});
