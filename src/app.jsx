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
  // Empresas do grupo + empresa "de casa" (a real do perfil, onde pode editar)
  const [companies, setCompanies] = useState([]);
  const [homeCompanyId, setHomeCompanyId] = useState(null);

  const refresh = async () => {
    const u = await window.getMe();
    setUser(u);
    if (u?.id) {
      try {
        const p = await window.getProfile(u.id);
        setHomeCompanyId(p?.company_id || null);
        // empresa ativa = a salva no seletor (se ainda válida) ou a do perfil
        let active = p?.company_id || null;
        try {
          const saved = localStorage.getItem('infinity-active-company');
          if (saved) active = saved;
        } catch {}
        // aplica a empresa ativa no perfil em memória (as telas seguem isto)
        setProfile(p ? { ...p, company_id: active } : null);
        window.ACTIVE_COMPANY_ID = active;
        window.HOME_COMPANY_ID = p?.company_id || null;
        if (active) window.hydrateFromSupabase?.(active);
        // carrega a lista de empresas para o seletor
        try { setCompanies(await window.fetchCompanies()); } catch {}
      } catch { setProfile(null); }
    } else { setProfile(null); setCompanies([]); setHomeCompanyId(null); }
  };

  // Troca a empresa ativa (só leitura nas outras; edição continua na "de casa").
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

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tema": "azul",
  "accent": "grafite",
  "density": "comfortable",
  "showBlobs": true,
  "showGrid": true,
  "liveClock": false
}/*EDITMODE-END*/;

// Acentos monocromáticos — variações de grafite
const ACCENTS = {
  preto:   { label: 'Preto',   color: 'oklch(0.12 0 0)' },
  grafite: { label: 'Grafite', color: 'oklch(0.21 0 0)' },
  chumbo:  { label: 'Chumbo',  color: 'oklch(0.32 0 0)' },
  aco:     { label: 'Aço',     color: 'oklch(0.46 0 0)' },
  cinza:   { label: 'Cinza',   color: 'oklch(0.62 0 0)' },
};

// Temas de marca — 3 visuais que a pessoa escolhe.
//  monocromatico: preto/branco/cinza puro, sem cor.
//  azul: cinza neutro de base + AZUL nos detalhes/títulos/ativos; verde/vermelho nos status.
//  colorido: base azulada + degradê no fundo/botões; verde/vermelho nos status.
const TEMAS = {
  monocromatico: {
    label: 'Monocromático',
    grayChroma: 0, grayHue: 0,          // cinza puro
    accent: 'oklch(0.24 0 0)',          // grafite escuro
    semantic: false,                    // positivo/negativo em cinza
    gradient: null,
  },
  azul: {
    label: 'Mais azul',
    grayChroma: 0, grayHue: 0,          // cenário = cinza NEUTRO (sem azul no fundo)
    accent: 'oklch(0.48 0.17 250)',     // azul vivo = títulos, ativos, botões, cliques
    semantic: true,                     // verde=positivo, vermelho=negativo
    gradient: null,
  },
  colorido: {
    label: 'Colorido',
    grayChroma: 0.6, grayHue: 262,      // base levemente colorida
    accent: 'oklch(0.52 0.2 265)',      // azul-violeta vibrante
    semantic: true,
    gradient: 'linear-gradient(135deg, oklch(0.62 0.19 250) 0%, oklch(0.52 0.22 285) 55%, oklch(0.58 0.2 320) 100%)',
  },
};
// aplica um tema: reescreve --g-*, --accent, semântica e degradê
function aplicarTema(chave) {
  const t = TEMAS[chave] || TEMAS.monocromatico;
  const L = [1, 0.975, 0.94, 0.88, 0.78, 0.62, 0.46, 0.34, 0.24, 0.16];
  const Cbase = [0, 0.003, 0.005, 0.008, 0.012, 0.02, 0.025, 0.03, 0.035, 0.03];
  const root = document.documentElement;
  L.forEach((l, i) => {
    const c = (Cbase[i] * t.grayChroma).toFixed(3);
    root.style.setProperty(`--g-${i}`, `oklch(${l} ${c} ${t.grayHue})`);
  });
  root.style.setProperty('--accent', t.accent);
  // semântica: verde para positivo, vermelho para negativo (senão, cinza do André)
  if (t.semantic) {
    root.style.setProperty('--c-pos', 'oklch(0.55 0.13 155)');       // verde
    root.style.setProperty('--c-pos-soft', 'oklch(0.55 0.13 155 / 0.12)');
    root.style.setProperty('--c-neg', 'oklch(0.55 0.18 27)');        // vermelho
    root.style.setProperty('--c-neg-soft', 'oklch(0.55 0.18 27 / 0.11)');
    root.style.setProperty('--c-danger', 'oklch(0.55 0.18 27)');
    root.style.setProperty('--c-danger-soft', 'oklch(0.55 0.18 27 / 0.11)');
  } else {
    ['--c-pos','--c-pos-soft','--c-neg','--c-neg-soft','--c-danger','--c-danger-soft']
      .forEach(v => root.style.removeProperty(v));
  }
  // degradê de fundo (só no colorido)
  root.style.setProperty('--brand-gradient', t.gradient || 'none');
  document.body.dataset.tema = chave;
}

// ─── Sidebar ───
const Sidebar = ({ page, setPage, collapsed, setCollapsed, modulo, setModulo }) => {
  const { profile, demo } = useAuth();
  const role = demo ? 'admin' : (profile?.role || 'viewer');
  const allItems = [
    { k: 'dashboard', label: 'Dashboard', icon: 'dashboard', mod: 'financeiro' },
    { k: 'caixa', label: 'Caixa', icon: 'wallet', mod: 'financeiro' },
    { k: 'contas', label: 'Contas', icon: 'file', mod: 'financeiro' },
    { k: 'projecao', label: 'Projeção', icon: 'chart', mod: 'financeiro' },
    { k: 'impostos', label: 'Impostos', icon: 'alert', mod: 'financeiro' },
    { k: 'repasse', label: 'Repasse', icon: 'chart', mod: 'financeiro' },
    { k: 'compras', label: 'Compras', icon: 'wallet', mod: 'financeiro' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar', mod: 'financeiro' },
    { k: 'relatorios', label: 'Relatórios', icon: 'chart', mod: 'financeiro' },
    { k: 'rh', label: 'Folha / RH', icon: 'users', mod: 'rh' },
    { k: 'provisoes', label: 'Provisões', icon: 'wallet', mod: 'rh' },
    { k: 'equipe', label: 'Equipe', icon: 'users', mod: 'rh' },
  ];
  const items = allItems.filter(it => {
    // "Provisões" usa a mesma permissão do "Folha / RH"
    const accessKey = it.k === 'provisoes' ? 'rh' : it.k;
    return window.canAccess(role, accessKey) && (!modulo || it.mod === modulo);
  });
  const bottom = [
    { k: 'ajuda', label: 'Ajuda', icon: 'help' },
    { k: 'perfil', label: 'Meu perfil', icon: 'user' },
    { k: 'config', label: 'Configurações', icon: 'settings' },
  ].filter(it => window.canAccess(role, it.k) || it.k === 'perfil' || it.k === 'ajuda');

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
          {modulo === 'rh' ? 'Recursos Humanos' : modulo === 'financeiro' ? 'Financeiro' : 'Menu'}
        </div>
      )}
      {modulo && (
        <button onClick={() => setModulo(null)} style={{
          marginBottom: 8, padding: '10px 12px', borderRadius: 'var(--r-sm)',
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          color: 'var(--ink-soft)', fontSize: 13, fontWeight: 500, transition: 'background 0.2s',
          justifyContent: collapsed ? 'center' : 'flex-start', border: 'none', cursor: 'pointer', background: 'transparent',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icon name="infinity" size={18} />
          {!collapsed && <span>Início</span>}
        </button>
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

const CompanySelector = () => {
  const { companies, profile, homeCompanyId, switchCompany, demo } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  if (demo || !companies || companies.length < 2) return null; // só aparece com 2+ empresas
  const activeId = profile?.company_id;
  const active = companies.find(c => c.id === activeId);
  const nome = (c) => c?.name || 'Empresa';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="glass" onClick={() => setOpen(o => !o)} title="Trocar empresa"
        style={{ height: 44, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center',
          gap: 8, padding: '0 14px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
        <Icon name="wallet" size={16} />
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome(active)}</span>
        <span style={{ fontSize: 10, color: 'var(--ink-mute)' }}>▾</span>
      </button>
      {open && (
        <div className="glass" style={{ position: 'absolute', top: 50, right: 0, minWidth: 220, zIndex: 50,
          borderRadius: 12, padding: 6, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
          {companies.map(c => {
            const isActive = c.id === activeId;
            const isHome = c.id === homeCompanyId;
            return (
              <button key={c.id} onClick={() => { switchCompany(c.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--bg-alt)' : 'transparent', color: 'var(--ink)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 600 : 400 }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-alt)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <Icon name="wallet" size={15} />
                <span style={{ flex: 1 }}>{c.name}</span>
                {isActive && <Icon name="check" size={15} />}
                {!isHome && <span style={{ fontSize: 10, color: 'var(--ink-mute)', border: '1px solid var(--line)', borderRadius: 5, padding: '1px 5px' }}>leitura</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Topbar = ({ theme, setTheme, liveClock, onOpenTweaks }) => {
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

      <button className="glass" onClick={onOpenTweaks} title="Aparência e tema"
        style={{
          width: 44, height: 44, borderRadius: 'var(--r-sm)',
          display: 'grid', placeItems: 'center', color: 'var(--ink-soft)',
          transition: 'transform 0.25s, color 0.25s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.color = 'var(--ink)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
      >
        <Icon name="sparkles" size={18} />
      </button>

      <button className="glass" style={{
        width: 44, height: 44, borderRadius: 'var(--r-sm)',
        display: 'grid', placeItems: 'center', color: 'var(--ink-soft)', position: 'relative',
      }}>
        <Icon name="bell" size={18} />
        <span style={{ position: 'absolute', top: 11, right: 12, width: 7, height: 7, borderRadius: 4, background: 'var(--ink)', border: '2px solid var(--surface-solid)' }} />
      </button>

      <CompanySelector />

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
const DEFAULT_ORDER = ['flow', 'agenda', 'kpis'];

const Dashboard = ({ filter, setFilter }) => {
  const data = window.useWidgetData(filter);
  const { profile, demo } = useAuth();
  const nomeUsuario = demo ? 'Demo' : (profile?.name || profile?.email?.split('@')[0] || 'você');
  const [order, setOrder] = useState(() => {
    const saved = localStorage.getItem('infinity-widget-order-v4');
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
    localStorage.setItem('infinity-widget-order-v4', JSON.stringify(order));
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

// ─── Tweaks panel ───
const TweaksPanel = ({ tweaks, setTweaks, visible, onClose }) => {
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
        <strong style={{ fontSize: 14, fontWeight: 700 }}>Aparência</strong>
        <button onClick={onClose}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', fontSize: 20, lineHeight: 1 }}>×</button>
      </div>

      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tema</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8, marginBottom: 16 }}>
        {Object.entries(TEMAS).map(([k, v]) => (
          <button key={k} onClick={() => update('tema', k)}
            style={{
              padding: '10px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600,
              background: (tweaks.tema || 'azul') === k ? 'var(--accent)' : 'var(--bg-alt)',
              color: (tweaks.tema || 'azul') === k ? 'var(--accent-ink)' : 'var(--ink-soft)',
              border: (tweaks.tema || 'azul') === k ? '2px solid var(--accent)' : '2px solid var(--line)',
              cursor: 'pointer', transition: 'all 0.2s', lineHeight: 1.2,
            }}>{v.label}</button>
        ))}
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

const Hub = ({ onPick }) => {
  const { profile, demo } = useAuth();
  const nome = demo ? 'Demo' : (profile?.name || profile?.email?.split('@')[0] || 'você');
  const card = (mod, titulo, desc, icone, cor, emBreve) => (
    <button onClick={() => onPick(mod)} style={{
      textAlign: 'left', cursor: 'pointer', background: 'var(--surface-solid)',
      border: '1px solid var(--line)', borderRadius: 18, padding: 28,
      display: 'flex', flexDirection: 'column', gap: 14, transition: 'transform .2s, box-shadow .2s',
      position: 'relative', minWidth: 220, flex: 1,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.10)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: cor, display: 'grid', placeItems: 'center' }}>
        <Icon name={icone} size={26} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{titulo}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
      </div>
      {emBreve && (
        <span style={{ position: 'absolute', top: 20, right: 20, fontSize: 10, fontWeight: 700,
          color: 'var(--ink-mute)', background: 'var(--bg-alt)', border: '1px solid var(--line)',
          borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          em construção
        </span>
      )}
    </button>
  );
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>
            </svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: 'var(--ink)' }}>Infinity</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>Olá, {nome}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 4 }}>O que você vai gerenciar hoje?</div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {card('financeiro', 'Financeiro', 'Dashboard, contas, projeção, bancos, repasse médico', 'wallet', 'var(--bg-alt)', false)}
          {card('rh', 'Recursos Humanos', 'Ponto, folha, colaboradores, holerite, férias', 'users', 'var(--bg-alt)', true)}
        </div>
      </div>
    </div>
  );
};

const AppShell = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('infinity-theme') || 'light');
  const [page, setPage] = useState(() => localStorage.getItem('infinity-page') || 'dashboard');
  const [modulo, setModulo] = useState(() => localStorage.getItem('infinity-modulo') || null);
  const [collapsed, setCollapsed] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);

  useEffect(() => {
    if (modulo) localStorage.setItem('infinity-modulo', modulo);
    else localStorage.removeItem('infinity-modulo');
  }, [modulo]);

  const escolherModulo = (m) => {
    setModulo(m);
    setPage(m === 'financeiro' ? 'dashboard' : 'rh');
  };

  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem('infinity-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('infinity-page', page); }, [page]);

  // Tema de marca (monocromático / azul / colorido)
  useEffect(() => {
    if (theme === 'light') {
      aplicarTema(tweaks.tema || 'azul');
    } else {
      // no escuro, deixa o CSS do dark-theme cuidar das cores
      ['0','1','2','3','4','5','6','7','8','9'].forEach(i =>
        document.documentElement.style.removeProperty(`--g-${i}`));
      document.documentElement.style.removeProperty('--accent');
    }
  }, [tweaks.tema, theme]);

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

  const density = tweaks.density === 'compact' ? 14 : tweaks.density === 'spacious' ? 26 : 20;

  if (!modulo) return <Hub onPick={escolherModulo} />;

  return (
    <div style={{ display: 'flex', height: '100vh', padding: density, gap: density }}>
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} modulo={modulo} setModulo={setModulo} />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: 6 }}>
        <Topbar theme={theme} setTheme={setTheme} liveClock={tweaks.liveClock} onOpenTweaks={() => setTweaksVisible(v => !v)} />
        <div key={page} style={{ paddingBottom: 24 }}>
          {page !== 'ajuda' && <window.AjudaBanner page={page} />}
          {pages[page]}
        </div>
      </main>
      <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} visible={tweaksVisible} onClose={() => setTweaksVisible(false)} />
      <window.TutorialHost />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
