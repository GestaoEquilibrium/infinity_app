// ═══════════════════════════════════════════════════════════════
// Eq Finance — App shell (sidebar + header + faixa azul + router)
// Lógica de auth, multi-empresa, filtros e rotas preservada.
// Sistema de temas/tweaks/glass/tilt removido (visual único do design).
// ═══════════════════════════════════════════════════════════════

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
  const [companies, setCompanies] = useState([]);
  const [homeCompanyId, setHomeCompanyId] = useState(null);

  const refresh = async () => {
    const u = await window.getMe();
    setUser(u);
    if (u?.id) {
      try {
        const p = await window.getProfile(u.id);
        setHomeCompanyId(p?.company_id || null);
        let active = p?.company_id || null;
        try { const saved = localStorage.getItem('infinity-active-company'); if (saved) active = saved; } catch {}
        setProfile(p ? { ...p, company_id: active } : null);
        window.ACTIVE_COMPANY_ID = active;
        window.HOME_COMPANY_ID = p?.company_id || null;
        if (active) window.hydrateFromSupabase?.(active);
        try { setCompanies(await window.fetchCompanies()); } catch {}
      } catch { setProfile(null); }
    } else { setProfile(null); setCompanies([]); setHomeCompanyId(null); }
  };

  const switchCompany = (id) => {
    if (!id) return;
    try { localStorage.setItem('infinity-active-company', id); } catch {}
    window.ACTIVE_COMPANY_ID = id;
    setProfile(prev => prev ? { ...prev, company_id: id } : prev);
    window.hydrateFromSupabase?.(id);
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
    <AuthCtx.Provider value={{ user, profile, ready, demo, enterDemo, exitDemo, logout, refresh, companies, homeCompanyId, switchCompany }}>
      {children}
    </AuthCtx.Provider>
  );
};

// ─── Sidebar ───
const SIDE_GROUPS = [
  { titulo: 'Financeiro', mod: 'financeiro', itens: [
    { k: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { k: 'caixa', label: 'Caixa', icon: 'wallet' },
    { k: 'contas', label: 'Contas', icon: 'file' },
    { k: 'projecao', label: 'Projeção', icon: 'chart' },
    { k: 'impostos', label: 'Impostos', icon: 'alert' },
    { k: 'repasse', label: 'Repasse', icon: 'pulse' },
    { k: 'compras', label: 'Compras', icon: 'tag' },
  ]},
  { titulo: 'Gestão', mod: 'financeiro', itens: [
    { k: 'relatorios', label: 'Relatórios', icon: 'chart' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar' },
  ]},
  { titulo: 'Recursos Humanos', mod: 'rh', itens: [
    { k: 'rh', label: 'Folha / RH', icon: 'users' },
    { k: 'provisoes', label: 'Provisões', icon: 'wallet' },
    { k: 'equipe', label: 'Equipe', icon: 'users' },
  ]},
];

const Sidebar = ({ page, setPage, modulo, setModulo }) => {
  const { profile, demo } = useAuth();
  const role = demo ? 'admin' : (profile?.role || 'viewer');
  const acess = (k) => window.canAccess(role, k === 'provisoes' ? 'rh' : k);

  const grupos = SIDE_GROUPS
    .filter(g => !modulo || g.mod === modulo)
    .map(g => ({ ...g, itens: g.itens.filter(it => acess(it.k)) }))
    .filter(g => g.itens.length);

  const bottom = [
    { k: 'ajuda', label: 'Ajuda', icon: 'help' },
    { k: 'config', label: 'Configurações', icon: 'settings' },
  ].filter(it => window.canAccess(role, it.k) || it.k === 'ajuda');

  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0, height: '100vh',
      background: 'var(--surface)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', padding: '20px 14px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px 8px', marginBottom: 14 }}>
        <window.Logo size={36} />
        <div>
          <div style={{ font: '700 16px var(--f-display)', letterSpacing: '-.02em', color: 'var(--ink)' }}>Eq Finance</div>
          <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>Grupo Equilibrium</div>
        </div>
      </div>

      {/* Seletor de empresa */}
      <CompanySelectorSide />

      {/* Navegação */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, marginTop: 14, overflowY: 'auto' }}>
        {grupos.map(g => (
          <div key={g.titulo} style={{ marginBottom: 10 }}>
            <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', padding: '0 11px', marginBottom: 6 }}>{g.titulo}</div>
            {g.itens.map(it => <NavItem key={it.k} item={it} active={page === it.k} onClick={() => setPage(it.k)} />)}
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      <div style={{ paddingTop: 10, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {modulo && (
          <NavItem item={{ label: 'Início', icon: 'infinity' }} active={false} onClick={() => setModulo(null)} />
        )}
        {bottom.map(it => <NavItem key={it.k} item={it} active={page === it.k} onClick={() => setPage(it.k)} />)}
      </div>
    </aside>
  );
};

const NavItem = ({ item, active, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        height: 36, padding: '0 11px', borderRadius: 'var(--r-lg)', width: '100%',
        background: active ? 'var(--accent)' : (hover ? 'rgba(28,37,48,.045)' : 'transparent'),
        color: active ? '#fff' : (hover ? 'var(--ink)' : 'var(--ink-2)'),
        font: `${active ? 600 : 500} 13.5px var(--f-sans)`,
        transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
      }}>
      <window.Icon name={item.icon} size={18} stroke={active ? 2 : 1.8} />
      <span>{item.label}</span>
    </button>
  );
};

// Seletor de empresa (versão sidebar)
const CompanySelectorSide = () => {
  const { companies, profile, homeCompanyId, switchCompany, demo } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  if (demo || !companies || companies.length < 2) return null;
  const activeId = profile?.company_id;
  const active = companies.find(c => c.id === activeId);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', height: 40, padding: '0 12px', borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line-strong)', background: 'var(--field)',
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      }}>
        <window.Icon name="wallet" size={16} style={{ color: 'var(--ink-3)' }} />
        <span style={{ flex: 1, textAlign: 'left', font: '600 12.5px var(--f-sans)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active?.name || 'Empresa'}</span>
        <window.Icon name="chevron_down" size={14} style={{ color: 'var(--ink-3)' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 46, left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--sh-2)', padding: 5 }}>
          {companies.map(c => {
            const isActive = c.id === activeId, isHome = c.id === homeCompanyId;
            return (
              <button key={c.id} onClick={() => { switchCompany(c.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '9px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--ink)', font: `${isActive ? 600 : 500} 12.5px var(--f-sans)` }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ flex: 1 }}>{c.name}</span>
                {isActive && <window.Icon name="check" size={14} />}
                {!isHome && <span style={{ font: '600 9px var(--f-sans)', color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '1px 5px' }}>leitura</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Header (60px) ───
const Header = ({ theme, setTheme }) => {
  return (
    <header style={{
      height: 'var(--header-h)', flexShrink: 0,
      background: 'var(--surface)', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
    }}>
      {/* Busca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, maxWidth: 420,
        height: 36, padding: '0 12px', borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line-strong)', background: 'var(--field)' }}>
        <window.Icon name="search" size={16} style={{ color: 'var(--ink-3)' }} />
        <input placeholder="Buscar…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', font: '400 12.5px var(--f-sans)', color: 'var(--ink)' }} />
        <kbd className="mono" style={{ padding: '2px 6px', borderRadius: 'var(--r-sm)', background: 'var(--surface-3)', font: '500 10px var(--f-mono)', color: 'var(--ink-3)' }}>⌘K</kbd>
      </div>

      <div style={{ flex: 1 }} />

      <window.IconBtn name={theme === 'light' ? 'moon' : 'sun'} size={36} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Tema" />
      <window.IconBtn name="bell" size={36} title="Notificações" />

      <div style={{ width: 1, height: 26, background: 'var(--line)' }} />

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
  const roleTxt = demo ? 'Modo demo' : (window.roleLabel?.(profile?.role || 'viewer') || 'Visualizador');
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', background: 'none', border: 'none' }}>
        <window.UserAvatar profile={profile} name={name} size={32} />
        <div style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
          <div style={{ font: '600 12.5px var(--f-sans)', color: 'var(--ink)' }}>{name}</div>
          <div style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)' }}>{roleTxt}</div>
        </div>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 999, width: 190, padding: 6,
          borderRadius: 'var(--r-xl)', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-2)' }}>
          <button onClick={() => { setOpen(false); logout(); }} style={{ width: '100%', padding: '9px 10px', borderRadius: 'var(--r-md)', textAlign: 'left',
            font: '500 12.5px var(--f-sans)', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <window.Icon name="logout" size={15} stroke={2} /> Sair
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Hub inicial (escolha de módulo) ───
const Hub = ({ onPick }) => {
  const { profile, demo } = useAuth();
  const nome = demo ? 'Demo' : (profile?.name || profile?.email?.split('@')[0] || 'você');
  const [hover, setHover] = useState(null);
  const card = (mod, titulo, desc, icone, emBreve) => (
    <button onClick={() => !emBreve && onPick(mod)}
      onMouseEnter={() => setHover(mod)} onMouseLeave={() => setHover(null)}
      style={{ textAlign: 'left', cursor: emBreve ? 'default' : 'pointer', background: 'var(--surface)',
        border: '1px solid var(--line)', borderRadius: 'var(--r-2xl)', padding: 26,
        display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', minWidth: 220, flex: 1,
        boxShadow: hover === mod && !emBreve ? 'var(--sh-2)' : 'var(--sh-1)',
        transform: hover === mod && !emBreve ? 'translateY(-2px)' : 'none',
        transition: 'transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease)', opacity: emBreve ? 0.7 : 1 }}>
      <div style={{ width: 48, height: 48, borderRadius: 'var(--r-xl)', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
        <window.Icon name={icone} size={24} />
      </div>
      <div>
        <div style={{ font: '700 17px var(--f-display)', color: 'var(--ink)' }}>{titulo}</div>
        <div style={{ font: '400 12.5px var(--f-sans)', color: 'var(--ink-3)', marginTop: 5, lineHeight: 1.5 }}>{desc}</div>
      </div>
      {emBreve && <span style={{ position: 'absolute', top: 18, right: 18, font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', background: 'var(--surface-3)', borderRadius: 'var(--r-sm)', padding: '3px 7px' }}>em breve</span>}
    </button>
  );
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 6 }}>
          <window.Logo size={40} />
          <div style={{ font: '700 22px var(--f-display)', letterSpacing: '-.02em', color: 'var(--ink)' }}>Eq Finance</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ font: '600 18px var(--f-display)', color: 'var(--ink)' }}>Olá, {nome}</div>
          <div style={{ font: '400 13px var(--f-sans)', color: 'var(--ink-3)', marginTop: 4 }}>O que você vai gerenciar hoje?</div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {card('financeiro', 'Financeiro', 'Dashboard, contas, projeção, bancos, repasse médico', 'wallet', false)}
          {card('rh', 'Recursos Humanos', 'Ponto, folha, colaboradores, holerite, férias', 'users', true)}
        </div>
      </div>
    </div>
  );
};

// ─── Telas ainda não redesenhadas (usam a ponte de compat.) ───

const DEFAULT_ORDER = ['flow', 'agenda', 'kpis'];

const Dashboard = ({ filter, setFilter }) => {
  const data = window.useWidgetData(filter);
  const { profile } = useAuth();
  const [seg, setSeg] = useState('mes'); // 'dia' | 'mes'
  const [hoverBar, setHoverBar] = useState(null);
  const [bancos, setBancos] = useState(null);

  useEffect(() => {
    if (!profile?.company_id || !window.fetchContasBancarias) return;
    window.fetchContasBancarias(profile.company_id)
      .then(r => setBancos(window.saldosPorConta(r)))
      .catch(() => setBancos([]));
  }, [profile?.company_id, (window.CONTAS || []).length]);

  const meses = window.availableMonths?.() || [];
  const mesIdx = meses.indexOf(filter.month);
  const irMes = (delta) => {
    const i = mesIdx + delta;
    if (i >= 0 && i < meses.length) setFilter({ mode: 'month', month: meses[i] });
  };

  const saldoBanco = (bancos || []).reduce((a, b) => a + b.saldo, 0);
  const nContas = (bancos || []).length;
  const resultado = data.totalIn - data.totalOut;

  // série do gráfico conforme o segmento
  const serie = seg === 'dia' ? (data.flowDaily || []) : (data.flow || []);
  const maxVal = Math.max(1, ...serie.map(s => Math.max(s.in, s.out)));

  const hovered = hoverBar != null ? serie[hoverBar] : null;

  return (
    <div className="anim-fade">
      {/* ── Faixa azul ── */}
      <window.Band
        title="Dashboard"
        subtitle={filter.mode === 'month' ? window.monthLabel(filter.month) : 'Período'}
        right={<window.MonthNav label={window.monthLabel?.(filter.month) || ''} onPrev={() => irMes(-1)} onNext={() => irMes(1)} />}
        metricLabel={`Saldo disponível hoje${nContas ? ` · ${nContas} contas` : ''}`}
        metric={bancos ? saldoBanco : '—'}
        stats={[
          { label: 'Entrou', value: data.totalIn, color: 'var(--on-accent-pos)' },
          { label: 'Saiu', value: data.totalOut, color: 'var(--on-accent-neg)' },
          { label: 'Resultado', value: resultado, color: resultado >= 0 ? 'var(--on-accent-pos)' : 'var(--on-accent-neg)' },
        ]}
      />

      {/* ── Conteúdo ── */}
      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Saldos bancários (faixa fina) */}
        {bancos && bancos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bancos.length}, 1fr)`, gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
            {bancos.map(b => (
              <div key={b.id} style={{ background: 'var(--surface)', padding: '13px 16px' }}>
                <div style={{ font: '600 10px var(--f-sans)', color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nome}</div>
                <window.Money value={b.saldo} size="kpi" colorBySign style={{ marginTop: 3, display: 'block' }} />
              </div>
            ))}
          </div>
        )}

        {/* Grid principal: gráfico + a vencer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, alignItems: 'stretch' }}>
          {/* Card: Entradas e saídas */}
          <window.Card padding={20} style={{ display: 'flex', flexDirection: 'column', minHeight: 340 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Entradas e saídas</h2>
                <div style={{ font: 'var(--t-body-2)', color: 'var(--ink-3)', marginTop: 3 }}>
                  {hovered
                    ? <>{hovered.label} · entrou <b style={{ color: 'var(--c-pos)' }}>{window.fmt(hovered.in)}</b> · saiu <b style={{ color: 'var(--c-neg)' }}>{window.fmt(hovered.out)}</b></>
                    : (seg === 'dia' ? 'Movimento por dia no período' : 'Movimento dos últimos meses')}
                </div>
              </div>
              <window.Segmented options={[{ value: 'dia', label: 'Dia' }, { value: 'mes', label: 'Mês' }]} value={seg} onChange={setSeg} />
            </div>

            {serie.length === 0 ? (
              <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
                <window.EmptyState icon="chart" title="Sem movimento neste período" hint="Lance uma entrada ou saída para ver o gráfico." />
              </div>
            ) : (
              <>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: `${Math.max(2, 40 / serie.length)}%`, minHeight: 200, paddingTop: 10 }}
                  onMouseLeave={() => setHoverBar(null)}>
                  {serie.map((s, i) => (
                    <div key={i} onMouseEnter={() => setHoverBar(i)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'default', minWidth: 0 }}>
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
                        <div title={`Entrou ${window.fmt(s.in)}`} style={{ width: '42%', maxWidth: 16, height: `${(s.in / maxVal) * 100}%`, minHeight: s.in > 0 ? 3 : 0, background: 'var(--chart-in)', borderRadius: '4px 4px 0 0', transition: 'height .3s ease', opacity: hoverBar == null || hoverBar === i ? 1 : .4 }} />
                        <div title={`Saiu ${window.fmt(s.out)}`} style={{ width: '42%', maxWidth: 16, height: `${(s.out / maxVal) * 100}%`, minHeight: s.out > 0 ? 3 : 0, background: 'var(--chart-out)', borderRadius: '4px 4px 0 0', transition: 'height .3s ease', opacity: hoverBar == null || hoverBar === i ? 1 : .4 }} />
                      </div>
                      <div style={{ font: '500 9.5px var(--f-sans)', color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
                  <Legend color="var(--chart-in)" label="Entradas" />
                  <Legend color="var(--chart-out)" label="Saídas" />
                </div>
              </>
            )}
          </window.Card>

          {/* Card: A vencer */}
          <window.Card padding={20} style={{ display: 'flex', flexDirection: 'column', minHeight: 340 }}>
            <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)', marginBottom: 16 }}>A vencer</h2>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(data.pendentes || []).length === 0 ? (
                <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', font: '500 12.5px var(--f-sans)' }}>Tudo em dia ✨</div>
              ) : (data.pendentes || []).map((c) => {
                const dia = (c.vencimento || '').slice(8, 10);
                const receber = c.tipo === 'receber';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 'var(--r-lg)', flexShrink: 0, display: 'grid', placeItems: 'center', background: receber ? 'var(--c-pos-bg)' : 'var(--c-neg-bg)', color: receber ? 'var(--c-pos)' : 'var(--c-neg)', font: '600 12px var(--f-mono)' }}>{dia}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description}</div>
                      <div style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)' }}>{c.category}</div>
                    </div>
                    <window.Money value={c.previsto} size="table" style={{ color: 'var(--ink)' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', font: '500 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>
              <span>A pagar/receber próximos</span>
              <window.Money value={(data.pendentes || []).reduce((a, c) => a + (c.previsto || 0), 0)} size="table" style={{ color: 'var(--ink)' }} />
            </div>
          </window.Card>
        </div>

        {/* Faixa de KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
          {[
            { label: 'Saldo acumulado', value: data.saldoAcumulado },
            { label: 'Entradas do período', value: data.totalIn },
            { label: 'Saídas do período', value: data.totalOut },
            { label: 'Resultado do mês', value: resultado, colorBySign: true },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--surface)', padding: '13px 16px' }}>
              <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', marginBottom: 6 }}>{k.label}</div>
              <window.Money value={k.value} size="kpi" colorBySign={k.colorBySign} style={{ color: k.colorBySign ? undefined : 'var(--ink)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Legend = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
    <span style={{ font: '500 11px var(--f-sans)', color: 'var(--ink-2)' }}>{label}</span>
  </div>
);

const RelatoriosPage = () => {
  const [mes, setMes] = React.useState(() => window.availableMonths?.().slice(-1)[0] || '');
  const [gerado, setGerado] = React.useState(null);
  const [producao, setProducao] = React.useState([]);
  const { profile } = window.useAuth();
  React.useEffect(() => {
    if (profile?.company_id && window.fetchProducaoMensal)
      window.fetchProducaoMensal(profile.company_id).then(setProducao).catch(() => setProducao([]));
  }, [profile?.company_id]);
  const dreView = React.useMemo(() => (mes && window.gerarDRE) ? window.gerarDRE(mes, producao) : null, [mes, producao]);

  function exportXLSX(nome, dados, colunas) {
    if (!window.XLSX) { alert('Biblioteca XLSX não carregada.'); return; }
    const ws = window.XLSX.utils.json_to_sheet(dados);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
    window.XLSX.writeFile(wb, nome + '.xlsx');
    setGerado(nome);
    setTimeout(() => setGerado(null), 3000);
  }

  function exportarDRE() {
    if (!dreView) return;
    const C = dreView.competencia, X = dreView.caixa;
    const L = (linha, k) => ({ 'Linha': linha, 'Competência': +C[k].toFixed(2), 'Caixa': +X[k].toFixed(2) });
    const dados = [
      L('RECEITA BRUTA', 'receita_bruta'),
      L('  Convênios', 'rec_conv'),
      L('  Cartão + Particular', 'rec_avulsa'),
      L('  (−) Impostos pagos', 'impostos'),
      L('= RECEITA LÍQUIDA', 'receita_liq'),
      L('  (−) Repasses', 'repasses'),
      L('= MARGEM DE CONTRIBUIÇÃO', 'margem_contrib'),
      L('  (−) Folha/RH', 'folha'),
      L('  (−) Aluguel', 'ocupacao'),
      L('  (−) Outras despesas', 'outras'),
      L('= RESULTADO OPERACIONAL', 'result_operacional'),
      L('  (−) Dívidas/financiamentos', 'dividas'),
      L('= RESULTADO DO MÊS', 'resultado'),
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
    { title: 'DRE (Excel)', desc: 'Baixa a DRE acima em planilha', icon: 'file', fn: exportarDRE, precisaMes: true },
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

      {/* DRE VISUAL — as duas colunas lado a lado */}
      {dreView && (() => {
        const C = dreView.competencia, X = dreView.caixa;
        const brl = v => window.fmt(v);
        const Linha = ({ label, kc, ind = 0, forte = false, sub = false, pct }) => (
          <tr style={{ borderTop: sub ? 'none' : '1px solid var(--line)', background: forte ? 'var(--bg-alt)' : 'transparent' }}>
            <td style={{ padding: forte ? '9px 14px' : '6px 14px', paddingLeft: 14 + ind * 16, fontWeight: forte ? 700 : 400, fontSize: forte ? 13 : 12.5, color: sub ? 'var(--ink-mute)' : 'var(--ink)' }}>
              {label}{pct != null && <span style={{ fontSize: 11, color: 'var(--ink-mute)', marginLeft: 6 }}>{pct >= 0 ? '' : ''}{pct.toFixed(1)}%</span>}
            </td>
            <td className="mono" style={{ padding: forte ? '9px 14px' : '6px 14px', textAlign: 'right', fontWeight: forte ? 700 : 400, fontSize: forte ? 13.5 : 12.5, color: C[kc] < 0 ? 'var(--c-neg)' : (forte ? 'var(--ink)' : 'var(--ink-soft)') }}>{brl(C[kc])}</td>
            <td className="mono" style={{ padding: forte ? '9px 14px' : '6px 14px', textAlign: 'right', fontWeight: forte ? 700 : 400, fontSize: forte ? 13.5 : 12.5, color: X[kc] < 0 ? 'var(--c-neg)' : (forte ? 'var(--ink)' : 'var(--ink-soft)') }}>{brl(X[kc])}</td>
          </tr>
        );
        return (
          <TiltCard interactive={false} padding={0}>
            <div style={{ padding: '16px 18px 10px' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>DRE — {window.monthLabel(mes)}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>
                Demonstração do resultado, grupo consolidado. <b>Competência</b> = o que a clínica gerou no mês · <b>Caixa</b> = o que de fato entrou e saiu.
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: 10.5, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ textAlign: 'left', padding: '4px 14px' }}></th>
                  <th style={{ textAlign: 'right', padding: '4px 14px' }}>Competência</th>
                  <th style={{ textAlign: 'right', padding: '4px 14px' }}>Caixa</th>
                </tr>
              </thead>
              <tbody>
                <Linha label="RECEITA BRUTA" kc="receita_bruta" forte />
                <Linha label="Convênios" kc="rec_conv" ind={1} sub />
                <Linha label="Cartão + Particular" kc="rec_avulsa" ind={1} sub />
                <Linha label="(−) Impostos pagos" kc="impostos" ind={1} sub />
                <Linha label="= RECEITA LÍQUIDA" kc="receita_liq" forte />
                <Linha label="(−) Repasses a profissionais" kc="repasses" ind={1} sub />
                <Linha label="= MARGEM DE CONTRIBUIÇÃO" kc="margem_contrib" forte pct={C.mc_pct} />
                <Linha label="(−) Folha / RH" kc="folha" ind={1} sub />
                <Linha label="(−) Aluguel / ocupação" kc="ocupacao" ind={1} sub />
                <Linha label="(−) Outras despesas" kc="outras" ind={1} sub />
                <Linha label="= RESULTADO OPERACIONAL" kc="result_operacional" forte pct={C.op_pct} />
                <Linha label="(−) Dívidas / financiamentos" kc="dividas" ind={1} sub />
                <Linha label="= RESULTADO DO MÊS" kc="resultado" forte pct={C.margem_pct} />
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
              <div><span style={{ color: 'var(--ink-mute)' }}>Resultado competência: </span><b className="mono" style={{ color: C.resultado < 0 ? 'var(--c-neg)' : 'var(--c-pos)' }}>{brl(C.resultado)}</b></div>
              <div><span style={{ color: 'var(--ink-mute)' }}>Resultado caixa: </span><b className="mono" style={{ color: X.resultado < 0 ? 'var(--c-neg)' : 'var(--c-pos)' }}>{brl(X.resultado)}</b></div>
              {Math.abs(C.resultado - X.resultado) > 1000 && (
                <div style={{ color: 'var(--ink-mute)' }}>
                  A diferença de <b className="mono">{brl(Math.abs(C.resultado - X.resultado))}</b> é o descasamento: o convênio recebe com defasagem.
                </div>
              )}
            </div>
          </TiltCard>
        );
      })()}

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

// ─── App bootstrap ───
const AppInner = () => {
  const { ready, user, demo, enterDemo } = useAuth();
  if (!ready) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Carregando…</div>;
  if (!user && !demo) return <LoginScreen onSuccess={(res) => { if (res?.demo) enterDemo(); }} />;
  return <AppShell />;
};

// Faixa padrão para telas ainda não migradas (título simples)
const TITULOS = {
  dashboard: 'Dashboard', caixa: 'Caixa', contas: 'Contas', projecao: 'Projeção',
  impostos: 'Impostos', repasse: 'Repasse', compras: 'Compras', agenda: 'Agenda',
  relatorios: 'Relatórios', rh: 'Folha / RH', provisoes: 'Provisões', equipe: 'Equipe',
  perfil: 'Meu perfil', config: 'Configurações', ajuda: 'Ajuda',
};
// Telas já migradas para a cara nova fornecem a própria faixa; as demais usam a padrão.
const MIGRADAS = new Set(['dashboard']); // será preenchida nos próximos blocos

const AppShell = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('infinity-theme') || 'light');
  const [page, setPage] = useState(() => localStorage.getItem('infinity-page') || 'dashboard');
  const [modulo, setModulo] = useState(() => localStorage.getItem('infinity-modulo') || null);

  useEffect(() => { if (modulo) localStorage.setItem('infinity-modulo', modulo); else localStorage.removeItem('infinity-modulo'); }, [modulo]);
  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem('infinity-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('infinity-page', page); }, [page]);

  const escolherModulo = (m) => { setModulo(m); setPage(m === 'financeiro' ? 'dashboard' : 'rh'); };

  const [filter, setFilter] = useState(() => window.DEFAULT_FILTER());
  useEffect(() => { localStorage.setItem('infinity-filter-v2', JSON.stringify(filter)); }, [filter]);

  const pages = {
    dashboard: <Dashboard filter={filter} setFilter={setFilter} />,
    contas: <ContasPage filter={filter} setFilter={setFilter} />,
    projecao: <window.ProjecaoPage />,
    impostos: <window.ImpostosPage filter={filter} setFilter={setFilter} />,
    caixa: <window.CaixaPage />,
    repasse: <window.RepassePage />,
    compras: <ComprasPage filter={filter} setFilter={setFilter} />,
    agenda: <AgendaPage filter={filter} setFilter={setFilter} />,
    relatorios: <RelatoriosPage />,
    rh: <window.RHPage />,
    provisoes: <window.FolhaProvisoes />,
    equipe: <EquipePage />,
    perfil: <PerfilPage />,
    config: <ConfigPage />,
    ajuda: <window.AjudaPage />,
  };

  if (!modulo) return <Hub onPick={escolherModulo} />;

  const migrada = MIGRADAS.has(page);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar page={page} setPage={setPage} modulo={modulo} setModulo={setModulo} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header theme={theme} setTheme={setTheme} />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Faixa padrão só para telas ainda não migradas.
              Telas migradas renderizam a própria faixa internamente. */}
          {!migrada && (
            <window.Band title={TITULOS[page] || ''} />
          )}
          <div key={page} style={{ padding: migrada ? 0 : '20px 30px 26px' }}>
            {page !== 'ajuda' && window.AjudaBanner && <window.AjudaBanner page={page} />}
            {pages[page]}
          </div>
        </main>
      </div>
      {window.TutorialHost && <window.TutorialHost />}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
