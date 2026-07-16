// Main app: sidebar + topbar + page router + dashboard with drag-reorder
// Tema monocromático · vidro

const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

// ─── Auth context ───
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);
window.useAuth = useAuth;

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(() => localStorage.getItem('infinity-demo') === '1');

  const refresh = async () => {
    const u = await window.getMe();
    setUser(u);
    if (u?.id) {
      try {
        const p = await window.getProfile(u.id);
        setProfile(p);
        if (p?.company_id) window.hydrateFromSupabase?.(p.company_id);
      } catch { setProfile(null); }
    } else setProfile(null);
  };

  useEffect(() => {
    (async () => { await refresh(); setReady(true); })();
    const onChange = () => refresh();
    window.addEventListener('sb-session-changed', onChange);
    return () => window.removeEventListener('sb-session-changed', onChange);
  }, []);

  const enterDemo = () => { localStorage.setItem('infinity-demo', '1'); setDemo(true); };
  const exitDemo = () => { localStorage.removeItem('infinity-demo'); setDemo(false); };
  const logout = async () => { await window.signOut(); setUser(null); setProfile(null); exitDemo(); };

  return (
    <AuthCtx.Provider value={{ user, profile, ready, demo, enterDemo, exitDemo, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "grafite",
  "density": "comfortable",
  "showBlobs": true,
  "showGrid": true,
  "liveClock": true
}/*EDITMODE-END*/;

// Acentos monocromáticos — variações de grafite
const ACCENTS = {
  preto:   { label: 'Preto',   color: 'oklch(0.12 0 0)' },
  grafite: { label: 'Grafite', color: 'oklch(0.21 0 0)' },
  chumbo:  { label: 'Chumbo',  color: 'oklch(0.32 0 0)' },
  aco:     { label: 'Aço',     color: 'oklch(0.46 0 0)' },
  cinza:   { label: 'Cinza',   color: 'oklch(0.62 0 0)' },
};

// ─── Sidebar ───
const Sidebar = ({ page, setPage, collapsed, setCollapsed }) => {
  const { profile, demo } = useAuth();
  const role = demo ? 'admin' : (profile?.role || 'viewer');
  const allItems = [
    { k: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { k: 'caixa', label: 'Caixa', icon: 'wallet' },
    { k: 'contas', label: 'Contas', icon: 'file' },
    { k: 'impostos', label: 'Impostos', icon: 'alert' },
    { k: 'repasse', label: 'Repasse', icon: 'chart' },
    { k: 'compras', label: 'Compras', icon: 'wallet' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar' },
    { k: 'relatorios', label: 'Relatórios', icon: 'chart' },
    { k: 'rh', label: 'RH', icon: 'users' },
    { k: 'equipe', label: 'Equipe', icon: 'users' },
  ];
  const items = allItems.filter(it => window.canAccess(role, it.k));
  const bottom = [
    { k: 'perfil', label: 'Meu perfil', icon: 'user' },
    { k: 'config', label: 'Configurações', icon: 'settings' },
  ].filter(it => window.canAccess(role, it.k) || it.k === 'perfil');

  return (
    <aside className="glass" style={{
      width: collapsed ? 84 : 248,
      flexShrink: 0,
      transition: 'width 0.4s cubic-bezier(.22,1,.36,1)',
      borderRadius: 'var(--r-lg)',
      display: 'flex', flexDirection: 'column',
      padding: 16,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px', marginBottom: 18 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 13,
          background: 'var(--accent)',
          display: 'grid', placeItems: 'center', color: 'var(--accent-ink)',
          boxShadow: '0 6px 18px oklch(0 0 0 / 0.25)',
          flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>
          </svg>
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, color: 'var(--ink)' }}>Infinity</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-mute)', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>Clínica · v3</div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink-mute)', padding: '0 10px', marginBottom: 8 }}>
          Menu
        </div>
      )}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {items.map(it => (
          <NavItem key={it.k} item={it} active={page === it.k} onClick={() => setPage(it.k)} collapsed={collapsed} />
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        {bottom.map(it => (
          <NavItem key={it.k} item={it} active={page === it.k} onClick={() => setPage(it.k)} collapsed={collapsed} />
        ))}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          marginTop: 2, padding: '11px 12px', borderRadius: 'var(--r-sm)',
          display: 'flex', alignItems: 'center', gap: 12,
          color: 'var(--ink-mute)', fontSize: 13, fontWeight: 500, transition: 'background 0.2s',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icon name="menu" size={18} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
};

const NavItem = ({ item, active, onClick, collapsed }) => (
  <button onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 12px', borderRadius: 'var(--r-sm)',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--accent-ink)' : 'var(--ink-soft)',
      fontSize: 13.5, fontWeight: active ? 600 : 500,
      position: 'relative', transition: 'background 0.25s, color 0.25s, transform 0.2s',
      justifyContent: collapsed ? 'center' : 'flex-start',
      boxShadow: active ? '0 6px 16px oklch(0 0 0 / 0.18)' : 'none',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-alt)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
    <Icon name={item.icon} size={18} stroke={active ? 2.2 : 1.8} />
    {!collapsed && <span>{item.label}</span>}
  </button>
);

// ─── Topbar ───
const pillStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  height: 44, padding: '0 16px', borderRadius: 'var(--r-sm)',
};

const Topbar = ({ theme, setTheme, liveClock }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!liveClock) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [liveClock]);
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', marginBottom: 16,
    }}>
      <div className="glass" style={{ ...pillStyle, flex: 1, padding: '0 18px' }}>
        <Icon name="search" size={17} />
        <input placeholder="Busque por transações, categorias, colaboradores..."
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit' }} />
        <kbd className="mono" style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--bg-alt)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-mute)' }}>⌘K</kbd>
      </div>

      {liveClock && (
        <div className="glass" style={pillStyle}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--ink)', color: 'var(--ink)', animation: 'pulseRing 2s infinite' }} />
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      )}

      <button className="glass" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        style={{
          width: 44, height: 44, borderRadius: 'var(--r-sm)',
          display: 'grid', placeItems: 'center', color: 'var(--ink-soft)',
          transition: 'transform 0.25s, color 0.25s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.color = 'var(--ink)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
      >
        <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
      </button>

      <button className="glass" style={{
        width: 44, height: 44, borderRadius: 'var(--r-sm)',
        display: 'grid', placeItems: 'center', color: 'var(--ink-soft)', position: 'relative',
      }}>
        <Icon name="bell" size={18} />
        <span style={{ position: 'absolute', top: 11, right: 12, width: 7, height: 7, borderRadius: 4, background: 'var(--ink)', border: '2px solid var(--surface-solid)' }} />
      </button>

      <UserChip />
    </header>
  );
};

const UserChip = () => {
  const { user, profile, demo, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);
  const name = demo ? 'Demo' : (profile?.name || user?.email?.split('@')[0] || 'Usuário');
  const roleTxt = demo ? 'Modo demonstração' : (window.roleLabel?.(profile?.role || 'viewer') || 'Visualizador');
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="glass" onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 44, padding: '0 14px 0 5px', borderRadius: 'var(--r-sm)',
      }}>
        <UserAvatar profile={profile} name={name} size={34} color="var(--g-7)" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{roleTxt}</span>
        </div>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 999,
          width: 200, padding: 8, borderRadius: 'var(--r-md)',
          background: 'var(--surface-solid)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)',
          animation: 'popIn 0.25s cubic-bezier(.22,1,.36,1) both',
        }}>
          <button onClick={() => { setOpen(false); logout(); }} style={{
            width: '100%', padding: '10px 12px', borderRadius: 'var(--r-xs)', textAlign: 'left',
            fontSize: 13, fontWeight: 500, color: 'var(--ink)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="logout" size={15} stroke={2} /> Sair
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Dashboard (with drag to reorder widgets) ───
const DEFAULT_ORDER = ['kpis', 'flow', 'prevreal', 'ranking', 'recent', 'pendentes'];

const Dashboard = ({ filter, setFilter }) => {
  const data = window.useWidgetData(filter);
  const { profile, demo } = useAuth();
  const nomeUsuario = demo ? 'Demo' : (profile?.name || profile?.email?.split('@')[0] || 'você');
  const [order, setOrder] = useState(() => {
    const saved = localStorage.getItem('infinity-widget-order-v3');
    if (saved) try {
      const o = JSON.parse(saved).filter(k => window.WIDGETS[k]);
      DEFAULT_ORDER.forEach(k => { if (!o.includes(k)) o.push(k); });
      if (o.length) return o;
    } catch {}
    return DEFAULT_ORDER;
  });
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    localStorage.setItem('infinity-widget-order-v3', JSON.stringify(order));
  }, [order]);

  const handleDragStart = (k) => setDragging(k);
  const handleDragOver = (e, k) => { e.preventDefault(); setDragOver(k); };
  const handleDrop = (e, target) => {
    e.preventDefault();
    if (!dragging || dragging === target) return;
    const newOrder = [...order];
    const from = newOrder.indexOf(dragging);
    const to = newOrder.indexOf(target);
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragging);
    setOrder(newOrder);
    setDragging(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            Visão geral · {hoje}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, color: 'var(--ink)', lineHeight: 1.1 }}>
            Olá, {nomeUsuario}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 5 }}>
            {filter.mode === 'month'
              ? <>Exibindo <strong style={{ color: 'var(--ink)' }}>{window.monthLabel(filter.month)}</strong> · saldo anterior <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>{window.fmt(data.saldoAnt)}</span></>
              : <>Exibindo período · saldo anterior <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>{window.fmt(data.saldoAnt)}</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <window.ExcelImporter />
          <Btn variant="primary" icon="plus">Nova compra</Btn>
        </div>
      </div>

      <window.FilterBar filter={filter} setFilter={setFilter} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16,
        alignItems: 'stretch',
      }}>
        {order.map((k, i) => {
          const W = window.WIDGETS[k];
          if (!W) return null;
          const Comp = W.render;
          const isDragging = dragging === k;
          const isOver = dragOver === k && dragging && dragging !== k;
          return (
            <div key={k}
              draggable
              onDragStart={() => handleDragStart(k)}
              onDragOver={(e) => handleDragOver(e, k)}
              onDrop={(e) => handleDrop(e, k)}
              onDragEnd={handleDragEnd}
              style={{
                gridColumn: `span ${W.span}`,
                position: 'relative',
                opacity: isDragging ? 0.4 : 1,
                transform: isOver ? 'scale(1.012)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
                animation: `slideUp 0.5s cubic-bezier(.22,1,.36,1) ${i*0.06}s both`,
              }}>
              {/* Alça de arrastar (some na linha de KPIs) */}
              {k !== 'kpis' && (
                <div style={{
                  position: 'absolute', top: 16, right: 16, zIndex: 3,
                  width: 26, height: 26, borderRadius: 8,
                  background: 'var(--bg-alt)',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--ink-mute)',
                  cursor: 'grab', opacity: 0.5,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                title="Arraste para reordenar">
                  <Icon name="grip" size={13} stroke={1.6} />
                </div>
              )}
              {isOver && (
                <div style={{
                  position: 'absolute', inset: -5, zIndex: 5,
                  borderRadius: 'calc(var(--r-lg) + 5px)',
                  border: '2px dashed var(--ink-mute)',
                  pointerEvents: 'none',
                  animation: 'fadeIn 0.2s ease',
                }} />
              )}
              <Comp data={data} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Relatórios — exportação real em Excel
const RelatoriosPage = () => {
  const [mes, setMes] = React.useState(() => window.availableMonths?.().slice(-1)[0] || '');
  const [gerado, setGerado] = React.useState(null);

  function exportXLSX(nome, dados, colunas) {
    if (!window.XLSX) { alert('Biblioteca XLSX não carregada.'); return; }
    const ws = window.XLSX.utils.json_to_sheet(dados);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
    window.XLSX.writeFile(wb, nome + '.xlsx');
    setGerado(nome);
    setTimeout(() => setGerado(null), 3000);
  }

  function gerarDRE() {
    const contas = (window.CONTAS||[]).filter(c => c.vencimento?.startsWith(mes));
    const entradas = contas.filter(c => c.tipo==='receber');
    const saidas   = contas.filter(c => c.tipo==='pagar');
    const dados = [
      { Categoria: '── RECEITAS ──', Previsto: '', Realizado: '', Status: '' },
      ...entradas.map(c => ({ Categoria: c.category, Descrição: c.description, Vencimento: c.vencimento, Previsto: c.previsto, Realizado: c.realizado||0, Status: c.pago?'Recebido':'Pendente' })),
      { Categoria: '── DESPESAS ──', Previsto: '', Realizado: '', Status: '' },
      ...saidas.map(c => ({ Categoria: c.category, Descrição: c.description, Vencimento: c.vencimento, Previsto: c.previsto, Realizado: c.realizado||0, Status: c.pago?'Pago':'Pendente' })),
      { Categoria: '── RESULTADO ──', Descrição: 'Líquido (Receitas - Despesas)',
        Previsto: entradas.reduce((s,c)=>s+c.previsto,0) - saidas.reduce((s,c)=>s+c.previsto,0),
        Realizado: entradas.reduce((s,c)=>s+(c.realizado||0),0) - saidas.reduce((s,c)=>s+(c.realizado||0),0),
        Status: '' },
    ];
    exportXLSX('DRE_' + mes, dados);
  }

  function gerarFluxo() {
    const agg = window.monthlyAggregates();
    let saldo = 0;
    const dados = agg.map(m => {
      const net = (m.contas.real_in - m.contas.real_out) + (m.compras.in - m.compras.out);
      const row = {
        Mês: window.monthLabel(m.key),
        'Prev. Entradas': +m.contas.prev_in.toFixed(2),
        'Real. Entradas': +m.contas.real_in.toFixed(2),
        'Prev. Saídas':   +m.contas.prev_out.toFixed(2),
        'Real. Saídas':   +m.contas.real_out.toFixed(2),
        'Saldo Anterior': +saldo.toFixed(2),
        'Resultado':      +net.toFixed(2),
        'Saldo Acumulado': +(saldo + net).toFixed(2),
      };
      saldo += net;
      return row;
    });
    exportXLSX('Fluxo_de_Caixa', dados);
  }

  function gerarConvenios() {
    const contas = (window.CONTAS||[]).filter(c => c.tipo==='receber');
    const agrup = {};
    contas.forEach(c => {
      if (!agrup[c.category]) agrup[c.category] = { Convênio: c.category, Previsto: 0, Realizado: 0, Pendente: 0, Qtd: 0 };
      agrup[c.category].Previsto  += c.previsto;
      agrup[c.category].Realizado += c.realizado||0;
      if (!c.pago) agrup[c.category].Pendente += c.previsto;
      agrup[c.category].Qtd++;
    });
    const dados = Object.values(agrup).sort((a,b) => b.Realizado - a.Realizado)
      .map(r => ({ ...r, Previsto: +r.Previsto.toFixed(2), Realizado: +r.Realizado.toFixed(2), Pendente: +r.Pendente.toFixed(2) }));
    exportXLSX('Receita_por_Convenio', dados);
  }

  function gerarContas() {
    const contas = (window.CONTAS||[]).filter(c => c.vencimento?.startsWith(mes));
    const dados = contas.map(c => ({
      Tipo: c.tipo==='receber'?'A Receber':'A Pagar',
      Descrição: c.description, Categoria: c.category,
      Vencimento: c.vencimento, Previsto: +c.previsto.toFixed(2),
      Realizado: +(c.realizado||0).toFixed(2),
      Status: c.pago?(c.tipo==='receber'?'Recebido':'Pago'):'Pendente',
    }));
    exportXLSX('Contas_' + mes, dados);
  }

  const meses = window.availableMonths?.() || [];
  const tiles = [
    { title: 'DRE Mensal', desc: 'Receitas × Despesas — previsto e realizado', icon: 'file', fn: gerarDRE, precisaMes: true },
    { title: 'Fluxo de Caixa', desc: 'Saldo acumulado mês a mês com saldo anterior', icon: 'chart', fn: gerarFluxo, precisaMes: false },
    { title: 'Receita por Convênio', desc: 'Ranking de repasses — previsto vs realizado', icon: 'tag', fn: gerarConvenios, precisaMes: false },
    { title: 'Extrato de Contas', desc: 'Todas as contas do mês selecionado', icon: 'calendar', fn: gerarContas, precisaMes: true },
  ];

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader title="Relatórios" subtitle="Exporte em Excel com um clique" />

      {/* Seletor de mês */}
      <TiltCard interactive={false} padding={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Icon name="calendar" size={17} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Mês de referência:</span>
          <select value={mes} onChange={e => setMes(e.target.value)} style={{
            background: 'var(--bg-alt)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-xs)',
            padding: '7px 12px', fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            {meses.map(m => <option key={m} value={m}>{window.monthLabel(m)}</option>)}
          </select>
          {gerado && <Pill color="var(--ink)" size="sm">✓ {gerado}.xlsx baixado</Pill>}
        </div>
      </TiltCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
        {tiles.map((t, i) => (
          <TiltCard key={i} padding={24} onClick={t.fn} style={{ cursor: 'pointer', animation: `slideUp 0.5s ease ${i*0.06}s both` }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--r-sm)',
              background: 'var(--accent)', color: 'var(--accent-ink)',
              display: 'grid', placeItems: 'center', marginBottom: 16,
              boxShadow: '0 6px 16px oklch(0 0 0 / 0.2)',
            }}>
              <Icon name={t.icon} size={20} stroke={2} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2 }}>{t.title}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 6, lineHeight: 1.5 }}>{t.desc}</p>
            {t.precisaMes && <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4 }}>Mês: {window.monthLabel?.(mes)}</p>}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              Baixar Excel <Icon name="arrow_right" size={14} stroke={2.4} />
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
};

// ─── Tweaks panel ───
const TweaksPanel = ({ tweaks, setTweaks, visible }) => {
  if (!visible) return null;
  const update = (key, val) => {
    const next = { ...tweaks, [key]: val };
    setTweaks(next);
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  };
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
      width: 300, padding: 20, borderRadius: 'var(--r-lg)',
      background: 'var(--surface-solid)', border: '1px solid var(--line-strong)',
      boxShadow: 'var(--shadow-lg)',
      animation: 'slideUp 0.4s cubic-bezier(.22,1,.36,1) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Icon name="sparkles" size={18} />
        <strong style={{ fontSize: 14, fontWeight: 700 }}>Tweaks</strong>
      </div>

      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tom do grafite</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 8, marginBottom: 16 }}>
        {Object.entries(ACCENTS).map(([k, v]) => (
          <button key={k} onClick={() => update('accent', k)}
            title={v.label}
            style={{
              width: '100%', aspectRatio: '1',
              borderRadius: 10, background: v.color,
              border: tweaks.accent === k ? '3px solid var(--ink)' : '2px solid var(--line)',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}/>
        ))}
      </div>

      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Densidade</label>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 16, background: 'var(--bg-alt)', borderRadius: 999, padding: 4 }}>
        {['compact', 'comfortable', 'spacious'].map(d => (
          <button key={d} onClick={() => update('density', d)}
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: tweaks.density === d ? 'var(--surface-solid)' : 'transparent',
              color: tweaks.density === d ? 'var(--ink)' : 'var(--ink-mute)',
              boxShadow: tweaks.density === d ? 'var(--shadow-sm)' : 'none',
              textTransform: 'capitalize',
            }}>{d === 'compact' ? 'Comp.' : d === 'comfortable' ? 'Conf.' : 'Espa.'}</button>
        ))}
      </div>

      {[
        { k: 'showBlobs', label: 'Luz de fundo' },
        { k: 'showGrid', label: 'Grade sutil' },
        { k: 'liveClock', label: 'Relógio ao vivo' },
      ].map(t => (
        <div key={t.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{t.label}</span>
          <button onClick={() => update(t.k, !tweaks[t.k])}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: tweaks[t.k] ? 'var(--accent)' : 'var(--line-strong)',
              position: 'relative', transition: 'background 0.25s',
              cursor: 'pointer',
            }}>
            <span style={{
              position: 'absolute', top: 2, left: tweaks[t.k] ? 20 : 2,
              width: 18, height: 18, borderRadius: 9, background: 'var(--surface-solid)',
              transition: 'left 0.25s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}/>
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── App ───
const AppInner = () => {
  const { ready, user, demo, enterDemo } = useAuth();
  if (!ready) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--ink-mute)' }}>Carregando…</div>;
  if (!user && !demo) return <LoginScreen onSuccess={(res) => { if (res?.demo) enterDemo(); }} />;
  return <AppShell />;
};

const AppShell = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('infinity-theme') || 'light');
  const [page, setPage] = useState(() => localStorage.getItem('infinity-page') || 'dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);

  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem('infinity-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('infinity-page', page); }, [page]);

  // Tom do grafite (accent) — sempre monocromático
  useEffect(() => {
    const a = ACCENTS[tweaks.accent] || ACCENTS.grafite;
    if (theme === 'light') {
      document.documentElement.style.setProperty('--accent', a.color);
    } else {
      // no escuro o accent é claro — ignora tons muito escuros
      document.documentElement.style.removeProperty('--accent');
    }
  }, [tweaks.accent, theme]);

  // Tweaks bridge
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Background scene visibility
  useEffect(() => {
    const scene = document.querySelector('.bg-scene');
    const grid = document.querySelector('.bg-grid');
    if (scene) scene.style.display = tweaks.showBlobs ? 'block' : 'none';
    if (grid) grid.style.display = tweaks.showGrid ? 'block' : 'none';
  }, [tweaks.showBlobs, tweaks.showGrid]);

  const [filter, setFilter] = useState(() => {
    const saved = localStorage.getItem('infinity-filter-v2');
    const avail = window.availableMonths();
    if (saved) try {
      const f = JSON.parse(saved);
      if (f.mode === 'month' && avail.includes(f.month)) return f;
      if (f.mode === 'period') return f;
    } catch {}
    return window.DEFAULT_FILTER();
  });
  useEffect(() => { localStorage.setItem('infinity-filter-v2', JSON.stringify(filter)); }, [filter]);

  const pages = {
    dashboard: <Dashboard filter={filter} setFilter={setFilter} />,
    contas: <ContasPage filter={filter} setFilter={setFilter} />,
    impostos: <window.ImpostosPage filter={filter} setFilter={setFilter} />,
    caixa: <window.CaixaPage />,
    repasse: <window.RepassePage />,
    compras: <ComprasPage filter={filter} setFilter={setFilter} />,
    agenda: <AgendaPage filter={filter} setFilter={setFilter} />,
    relatorios: <RelatoriosPage />,
    rh: <window.RHPage />,
    equipe: <EquipePage />,
    perfil: <PerfilPage />,
    config: <ConfigPage />,
  };

  const density = tweaks.density === 'compact' ? 14 : tweaks.density === 'spacious' ? 26 : 20;

  return (
    <div style={{ display: 'flex', height: '100vh', padding: density, gap: density }}>
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: 6 }}>
        <Topbar theme={theme} setTheme={setTheme} liveClock={tweaks.liveClock} />
        <div key={page} style={{ paddingBottom: 24 }}>{pages[page]}</div>
      </main>
      <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} visible={tweaksVisible} />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
