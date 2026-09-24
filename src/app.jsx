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
        window.__ROLE = p?.role || 'pendente';
        let active = p?.company_id || null;
        try { const saved = localStorage.getItem('infinity-active-company'); if (saved) active = saved; } catch {}
        setProfile(p ? { ...p, company_id: active } : null);
        window.ACTIVE_COMPANY_ID = active;
        window.HOME_COMPANY_ID = p?.company_id || null;
        if (active) window.hydrateFromSupabase?.(active);
        try { setCompanies(await window.fetchCompanies()); } catch {}
      } catch { setProfile(null); }
    } else { setProfile(null); setCompanies([]); setHomeCompanyId(null); window.__ROLE = null; }
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
  { titulo: 'Financeiro', itens: [
    { k: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { k: 'contas', label: 'Contas', icon: 'file' },
    { k: 'caixa', label: 'Caixa', icon: 'wallet' },
    { k: 'projecao', label: 'Projeção', icon: 'chart' },
    { k: 'impostos', label: 'Impostos', icon: 'alert' },
    { k: 'compras', label: 'Compras', icon: 'tag' },
  ]},
  { titulo: 'Equipe', itens: [
    { k: 'equipe_pag', label: 'Pagamentos da equipe', icon: 'users' },
    { k: 'repasse', label: 'Repasse', icon: 'pulse' },
    { k: 'provisoes', label: 'Folha do mês', icon: 'wallet' },
    { k: 'rh', label: 'Colaboradores', icon: 'user' },
  ]},
  { titulo: 'Gestão', itens: [
    { k: 'relatorios', label: 'Relatórios', icon: 'chart' },
    { k: 'agenda', label: 'Agenda', icon: 'calendar' },
  ]},
];

// Menu enxuto da visão operacional (auxiliar)
const OP_GROUPS = [
  { titulo: 'Dia a dia', itens: [
    { k: 'hoje', label: 'Hoje', icon: 'home' },
    { k: 'contas', label: 'A pagar', icon: 'file' },
    { k: 'caixa', label: 'Caixa do dia', icon: 'wallet' },
    { k: 'equipe_pag', label: 'Pagamentos da equipe', icon: 'users' },
  ]},
  { titulo: 'Cálculos e cadastro', itens: [
    { k: 'repasse', label: 'Repasse', icon: 'pulse' },
    { k: 'provisoes', label: 'Folha do mês', icon: 'wallet' },
    { k: 'rh', label: 'Cadastro da equipe', icon: 'user' },
  ]},
];
const ACESSO_ALIAS = { provisoes: 'rh', hoje: 'hoje', equipe_pag: 'equipe_pag' };

const Sidebar = ({ page, setPage, modulo, setModulo, visao, trocarVisao }) => {
  const { profile, demo } = useAuth();
  const role = demo ? 'admin' : (profile?.role || 'viewer');
  const acess = (k) => window.canAccess(role, ACESSO_ALIAS[k] || k);
  const operacional = visao === 'operacional';

  const grupos = (operacional ? OP_GROUPS : SIDE_GROUPS)

    .map(g => ({ ...g, itens: g.itens.filter(it => acess(it.k)) }))
    .filter(g => g.itens.length);

  const bottom = [
    ...(role === 'admin' ? [{ k: 'equipe', label: 'Acessos', icon: 'users' }] : []),
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
          <div style={{ font: '700 16px var(--f-display)', letterSpacing: '-.02em', color: 'var(--ink)' }}>EqFinances</div>
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
        {trocarVisao && (role === 'admin' || role === 'editor') && (
          <NavItem item={{ label: operacional ? 'Visão completa' : 'Visão operacional', icon: 'transition' }} active={false}
            onClick={() => trocarVisao(operacional ? 'completa' : 'operacional')} />
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
        <span style={{ flex: 1, textAlign: 'left', font: '600 12.5px var(--f-sans)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeId === 'GRUPO' ? 'Grupo (todas)' : (active?.name || 'Empresa')}</span>
        <window.Icon name="chevron_down" size={14} style={{ color: 'var(--ink-3)' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 46, left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--sh-2)', padding: 5 }}>
          <button key="GRUPO" onClick={() => { switchCompany('GRUPO'); setOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              padding: '9px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer', marginBottom: 4,
              borderBottom: '1px solid var(--line)',
              background: activeId === 'GRUPO' ? 'var(--accent-soft)' : 'transparent',
              color: activeId === 'GRUPO' ? 'var(--accent)' : 'var(--ink)',
              font: `${activeId === 'GRUPO' ? 600 : 500} 12.5px var(--f-sans)` }}>
            <span style={{ flex: 1 }}>Grupo (todas as empresas)</span>
            {activeId === 'GRUPO' && <window.Icon name="check" size={14} />}
          </button>
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
// ─── Busca global (topo) ───
// Procura em: Ajuda/POP, telas do sistema, contas e lançamentos, pessoas e pagamentos da equipe.
const buscaNorm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const buscaValor = (q) => {
  const t = String(q).trim();
  if (!/^(r\$\s*)?[\d.]+(,\d{1,2})?$|^(r\$\s*)?\d+(\.\d{1,2})?$/i.test(t)) return null;
  const u = t.replace(/r\$\s*/i, '');
  const n = (t.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(u)) ? Number(u.replace(/\./g, '').replace(',', '.')) : Number(u);
  return isFinite(n) && n > 0 ? n : null;
};
let buscaCache = { pessoas: null, pagamentos: null, quando: 0 };
async function buscaCarregarBase() {
  if (buscaCache.pessoas && Date.now() - buscaCache.quando < 5 * 60 * 1000) return buscaCache;
  const cf = window.coFilter ? window.coFilter('GRUPO') : '';
  const [pessoas, pagamentos] = await Promise.all([
    window.__sbRest(`/colaboradores?${cf}&select=id,nome,cargo,status,regime&order=nome.asc&limit=2000`).catch(() => []),
    window.__sbRest(`/pagamentos?${cf}&select=id,nome,cargo,competencia,grupo,valor_liquido,status&order=competencia.desc&limit=3000`).catch(() => []),
  ]);
  buscaCache = { pessoas: pessoas || [], pagamentos: pagamentos || [], quando: Date.now() };
  return buscaCache;
}

const BuscaGlobal = ({ setPage }) => {
  const { profile, demo } = useAuth();
  const role = demo ? 'admin' : (profile?.role || 'viewer');
  const pode = (k) => k === 'ajuda' || window.canAccess(role, ACESSO_ALIAS[k] || k);
  const [q, setQ] = useState('');
  const [aberto, setAberto] = useState(false);
  const [res, setRes] = useState([]);
  const [sel, setSel] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const ref = useRef(null), inp = useRef(null);

  // Ctrl+K / ⌘K foca a busca
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inp.current?.focus(); setAberto(true); } };
    const fora = (e) => { if (!ref.current?.contains(e.target)) setAberto(false); };
    window.addEventListener('keydown', h); document.addEventListener('mousedown', fora);
    return () => { window.removeEventListener('keydown', h); document.removeEventListener('mousedown', fora); };
  }, []);

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) { setRes([]); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      setCarregando(true);
      const ws = buscaNorm(termo).split(/\s+/).filter(Boolean);
      const casa = (txt) => { const n = buscaNorm(txt); return ws.every(w => n.includes(w)); };
      const valor = buscaValor(termo);
      const out = [];

      // telas do sistema
      const telas = [...SIDE_GROUPS.flatMap(g => g.itens), { k: 'hoje', label: 'Hoje (visão operacional)' }, { k: 'equipe', label: 'Acessos' }, { k: 'ajuda', label: 'Ajuda' }, { k: 'config', label: 'Configurações' }, { k: 'perfil', label: 'Meu perfil' }];
      const vistas = new Set();
      telas.filter(it => pode(it.k) && !vistas.has(it.k) && vistas.add(it.k) && casa(it.label + ' ' + (TITULOS[it.k] || ''))).slice(0, 4)
        .forEach(it => out.push({ grupo: 'Telas', titulo: it.label, sub: 'Abrir a tela', ir: () => setPage(it.k) }));

      // ajuda e POP
      try {
        const aj = window.eqAjudaBuscar ? await window.eqAjudaBuscar(termo, 5) : [];
        aj.forEach(r => out.push({ grupo: 'Ajuda e POP', titulo: r.titulo, sub: r.trecho, tag: r.grupo,
          ir: () => { window.__eqAjudaAlvo = { alvo: r.alvo, termo }; setPage('ajuda'); setTimeout(() => window.dispatchEvent(new Event('eq-ajuda-ir')), 50); } }));
      } catch (e) { /* segue */ }

      // contas e lançamentos
      if (pode('contas')) {
        const contas = (window.CONTAS || []).filter(c => valor != null
          ? [c.previsto, c.realizado, c.value, c.amount].some(v => Math.abs((Number(v) || 0) - valor) < 0.01)
          : casa((c.description || '') + ' ' + (c.category || '')));
        contas.sort((a, b) => String(b.vencimento || '').localeCompare(String(a.vencimento || '')));
        contas.slice(0, 6).forEach(c => out.push({ grupo: 'Contas e lançamentos', titulo: c.description || '(sem descrição)',
          sub: `${c.vencimento ? window.fmtDate(c.vencimento) : ''} · ${window.fmt(Number(c.pago ? c.realizado : c.previsto) || Number(c.realizado) || Number(c.previsto) || 0)} · ${c.category || 'sem categoria'}${c.pago ? ' · pago' : ''}`,
          tag: c.tipo === 'receber' ? 'Entrada' : 'Saída',
          ir: () => { window.__eqAbrirConta = c.id; setPage('contas'); setTimeout(() => window.dispatchEvent(new Event('eq-abrir-conta')), 80); } }));
      }

      // pessoas e pagamentos da equipe
      if (valor == null && (pode('rh') || pode('equipe_pag'))) {
        try {
          const base = await buscaCarregarBase();
          if (pode('rh')) base.pessoas.filter(p => casa(p.nome + ' ' + (p.cargo || ''))).slice(0, 4)
            .forEach(p => out.push({ grupo: 'Pessoas', titulo: p.nome, sub: [p.cargo, p.regime, p.status].filter(Boolean).join(' · '), ir: () => setPage('rh') }));
          if (pode('equipe_pag')) base.pagamentos.filter(p => casa(p.nome)).slice(0, 4)
            .forEach(p => out.push({ grupo: 'Pagamentos da equipe', titulo: p.nome,
              sub: `${p.competencia} · ${p.grupo === 'dia20' ? 'Dia 20' : '5º dia útil'} · ${window.fmt(Number(p.valor_liquido) || 0)} · ${p.status === 'pago' ? 'pago' : 'pendente'}`,
              ir: () => { window.__eqAbrirPagamento = { comp: p.competencia, id: p.id }; setPage('equipe_pag'); setTimeout(() => window.dispatchEvent(new Event('eq-abrir-pagamento')), 80); } }));
        } catch (e) { /* segue */ }
      } else if (valor != null && pode('equipe_pag')) {
        try {
          const base = await buscaCarregarBase();
          base.pagamentos.filter(p => Math.abs((Number(p.valor_liquido) || 0) - valor) < 0.01).slice(0, 4)
            .forEach(p => out.push({ grupo: 'Pagamentos da equipe', titulo: p.nome, sub: `${p.competencia} · ${window.fmt(Number(p.valor_liquido) || 0)}`,
              ir: () => { window.__eqAbrirPagamento = { comp: p.competencia, id: p.id }; setPage('equipe_pag'); setTimeout(() => window.dispatchEvent(new Event('eq-abrir-pagamento')), 80); } }));
        } catch (e) { /* segue */ }
      }
      if (vivo) { setRes(out); setSel(0); setCarregando(false); }
    }, 220);
    return () => { vivo = false; clearTimeout(t); };
  }, [q]);

  const escolher = (r) => { if (!r) return; setAberto(false); setQ(''); inp.current?.blur(); r.ir(); };
  const tecla = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(i => Math.min(i + 1, res.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(res[sel]); }
    else if (e.key === 'Escape') { setAberto(false); inp.current?.blur(); }
  };

  const mostra = aberto && q.trim().length >= 2;
  let ultimoGrupo = null;
  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 36, padding: '0 12px', borderRadius: 'var(--r-lg)',
        border: '1px solid ' + (aberto ? 'var(--accent)' : 'var(--line-strong)'), background: 'var(--field)' }}>
        <window.Icon name="search" size={16} style={{ color: 'var(--ink-3)' }} />
        <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setAberto(true); }} onFocus={() => setAberto(true)} onKeyDown={tecla}
          placeholder="Buscar no sistema, na ajuda e no POP…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', font: '400 12.5px var(--f-sans)', color: 'var(--ink)' }} />
        {q ? <button onClick={() => { setQ(''); inp.current?.focus(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13 }}>✕</button>
          : <kbd className="mono" style={{ padding: '2px 6px', borderRadius: 'var(--r-sm)', background: 'var(--surface-3)', font: '500 10px var(--f-mono)', color: 'var(--ink-3)' }}>Ctrl K</kbd>}
      </div>
      {mostra && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 'min(640px, 90vw)', maxHeight: '70vh', overflowY: 'auto', zIndex: 1500,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--sh-2, 0 12px 32px rgba(0,0,0,.15))', padding: 6 }}>
          {carregando && !res.length && <div style={{ padding: 14, font: '400 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>Procurando…</div>}
          {!carregando && !res.length && <div style={{ padding: 14, font: '400 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>Nada encontrado para "{q}".</div>}
          {res.map((r, i) => {
            const cab = r.grupo !== ultimoGrupo; ultimoGrupo = r.grupo;
            return (
              <React.Fragment key={i}>
                {cab && <div style={{ padding: '8px 10px 4px', font: '700 10.5px var(--f-sans)', letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{r.grupo}</div>}
                <button onMouseEnter={() => setSel(i)} onMouseDown={e => e.preventDefault()} onClick={() => escolher(r)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 'var(--r-md)',
                    background: sel === i ? 'var(--accent-soft, var(--bg))' : 'transparent' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ font: '600 13px var(--f-sans)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.titulo}</span>
                    {r.tag && <span style={{ marginLeft: 'auto', flexShrink: 0, font: '600 10.5px var(--f-sans)', color: 'var(--ink-3)', background: 'var(--surface-2, var(--bg))', padding: '1px 7px', borderRadius: 999 }}>{r.tag}</span>}
                  </div>
                  {r.sub && <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.sub}</div>}
                </button>
              </React.Fragment>
            );
          })}
          <div style={{ padding: '6px 10px 4px', font: '400 11px var(--f-sans)', color: 'var(--ink-3)', borderTop: '1px solid var(--line)', marginTop: 4 }}>↑ ↓ para escolher · Enter abre · Esc fecha · dá para buscar por valor (ex.: 1.869,32)</div>
        </div>
      )}
    </div>
  );
};

const Header = ({ theme, setTheme, setPage }) => {
  return (
    <header style={{
      height: 'var(--header-h)', flexShrink: 0,
      background: 'var(--surface)', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
    }}>
      {/* Busca */}
      <BuscaGlobal setPage={setPage} />

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
          <div style={{ font: '700 22px var(--f-display)', letterSpacing: '-.02em', color: 'var(--ink)' }}>EqFinances</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ font: '600 18px var(--f-display)', color: 'var(--ink)' }}>Olá, {nome}</div>
          <div style={{ font: '400 13px var(--f-sans)', color: 'var(--ink-3)', marginTop: 4 }}>O que você vai gerenciar hoje?</div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {card('financeiro', 'Financeiro', 'Dashboard, contas, projeção, bancos, repasse médico', 'wallet', false)}
          {card('rh', 'Recursos Humanos', 'Ponto, folha, colaboradores, holerite, férias', 'users', false)}
        </div>
      </div>
    </div>
  );
};

// ─── Telas ainda não redesenhadas (usam a ponte de compat.) ───

const DEFAULT_ORDER = ['flow', 'agenda', 'kpis'];

const Dashboard = ({ filter, setFilter, setPage }) => {
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

  // ── Extratos pendentes: contas SEM sync automático cujo último lançamento
  // vinculado (campo "conta") tem mais de 7 dias. Mercado Pago e Inter ficam fora (sync).
  const DIAS_LIMITE = 7;
  const pendentes = React.useMemo(() => {
    if (!bancos) return [];
    const AUTO = /mercado\s*pago|\binter\b/i;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const tx = window.CONTAS || [];
    return bancos
      .filter(cb => !AUTO.test(cb.nome || ''))
      .map(cb => {
        let ult = null;
        tx.forEach(c => { if ((c.conta || '') === cb.nome && c.vencimento && (!ult || c.vencimento > ult)) ult = c.vencimento; });
        const dias = ult ? Math.floor((hoje - new Date(ult + 'T00:00:00')) / 86400000) : null;
        return { nome: cb.nome, ult, dias };
      })
      .filter(p => p.dias === null || p.dias > DIAS_LIMITE);
  }, [bancos, (window.CONTAS || []).length]);
  const fmtBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';

  // série do gráfico conforme o segmento
  const hojeMes = new Date().toISOString().slice(0, 7); // YYYY-MM
  // MÊS: monta do agregado completo (não do data.flow, que já vem cortado nos
  // últimos 8 = meses futuros vazios). Pega meses ATÉ o mês atual, com movimento,
  // e mantém os 8 mais recentes.
  const serieMes = React.useMemo(() => {
    const agg = window.monthlyAggregates?.() || [];
    return agg
      .filter(m => m.key <= hojeMes && ((m.contas?.real_in || 0) > 0 || (m.contas?.real_out || 0) > 0))
      .slice(-8)
      .map(m => ({ label: m.label, in: m.contas?.real_in || 0, out: m.contas?.real_out || 0 }));
  }, [(window.CONTAS || []).length, hojeMes]);
  // DIA: remove dias sem movimento
  const serieDia = (data.flowDaily || []).filter(s => (s.in > 0 || s.out > 0));
  const serie = seg === 'dia' ? serieDia : serieMes;
  const maxVal = Math.max(1, ...serie.map(s => Math.max(s.in, s.out)));
  // Escala de raiz quadrada: mantém a ordem/proporção mas evita que valores
  // pequenos sumam quando há um valor gigante no período (ex: 100k num mês).
  const barH = (v) => v > 0 ? Math.max(4, Math.sqrt(v / maxVal) * 100) : 0;

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
        {/* Lembrete: extratos pendentes de importação */}
        {pendentes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--c-warn-bg, #FFF6E6)', border: '1px solid var(--c-warn, #E0A43A)', borderRadius: 'var(--r-xl)' }}>
            <window.Icon name="alert" size={18} style={{ color: 'var(--c-warn, #B5731A)', flexShrink: 0 }} />
            <div style={{ flex: 1, font: '500 13px var(--f-sans)', color: 'var(--ink)', lineHeight: 1.5 }}>
              <b>Extratos pendentes</b>{' — importe para manter os saldos em dia: '}
              {pendentes.map((p, i) => (
                <span key={p.nome}>
                  {i > 0 && ' · '}
                  <b>{p.nome}</b>{' '}
                  <span style={{ color: 'var(--ink-3)' }}>({p.ult ? `último em ${fmtBR(p.ult)}` : 'nenhum importado'})</span>
                </span>
              ))}
            </div>
            {setPage && <window.Btn variant="primary" size="sm" icon="file" onClick={() => setPage('contas')}>Importar extrato</window.Btn>}
          </div>
        )}

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
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${Math.max(2, 40 / serie.length)}%`, height: 210, paddingTop: 10 }}
                  onMouseLeave={() => setHoverBar(null)}>
                  {serie.map((s, i) => (
                    <div key={i} onMouseEnter={() => setHoverBar(i)}
                      style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'default', minWidth: 0 }}>
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, minHeight: 0 }}>
                        <div title={`Entrou ${window.fmt(s.in)}`} style={{ width: '42%', maxWidth: 16, height: `${barH(s.in)}%`, background: 'var(--chart-in)', borderRadius: '4px 4px 0 0', transition: 'height .3s ease', opacity: hoverBar == null || hoverBar === i ? 1 : .4 }} />
                        <div title={`Saiu ${window.fmt(s.out)}`} style={{ width: '42%', maxWidth: 16, height: `${barH(s.out)}%`, background: 'var(--chart-out)', borderRadius: '4px 4px 0 0', transition: 'height .3s ease', opacity: hoverBar == null || hoverBar === i ? 1 : .4 }} />
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
  const [aba, setAba] = React.useState('dre'); // dre | fluxo | convenios | contas
  const [gerado, setGerado] = React.useState(null);
  const [producao, setProducao] = React.useState([]);
  const { profile } = window.useAuth();
  React.useEffect(() => {
    if (profile?.company_id && window.fetchProducaoMensal)
      window.fetchProducaoMensal(profile.company_id).then(setProducao).catch(() => setProducao([]));
  }, [profile?.company_id]);
  const dreView = React.useMemo(() => (mes && window.gerarDRE) ? window.gerarDRE(mes, producao) : null, [mes, producao]);

  function exportXLSX(nome, dados) {
    if (!window.XLSX) { alert('Biblioteca XLSX não carregada.'); return; }
    const ws = window.XLSX.utils.json_to_sheet(dados);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
    window.XLSX.writeFile(wb, nome + '.xlsx');
    setGerado(nome);
    setTimeout(() => setGerado(null), 3000);
  }

  // ── Dados dos relatórios (calculados na tela) ──
  const dadosDRE = () => {
    if (!dreView) return [];
    const C = dreView.competencia, X = dreView.caixa;
    const L = (linha, k) => ({ 'Linha': linha, 'Competência': +C[k].toFixed(2), 'Caixa': +X[k].toFixed(2) });
    return [
      L('RECEITA BRUTA', 'receita_bruta'), L('  Convênios', 'rec_conv'), L('  Cartão + Particular', 'rec_avulsa'),
      L('  (−) Impostos pagos', 'impostos'), L('= RECEITA LÍQUIDA', 'receita_liq'), L('  (−) Repasses', 'repasses'),
      L('= MARGEM DE CONTRIBUIÇÃO', 'margem_contrib'), L('  (−) Folha/RH', 'folha'), L('  (−) Aluguel', 'ocupacao'),
      L('  (−) Outras despesas', 'outras'), L('= RESULTADO OPERACIONAL', 'result_operacional'),
      L('  (−) Dívidas/financiamentos', 'dividas'), L('= RESULTADO DO MÊS', 'resultado'),
    ];
  };

  const dadosFluxo = React.useMemo(() => {
    const agg = window.monthlyAggregates?.() || [];
    let saldo = 0;
    return agg.map(m => {
      const net = (m.contas.real_in - m.contas.real_out) + (m.compras.in - m.compras.out);
      const row = {
        mes: window.monthLabel(m.key), key: m.key,
        prev_in: m.contas.prev_in, real_in: m.contas.real_in,
        prev_out: m.contas.prev_out, real_out: m.contas.real_out,
        saldo_ant: saldo, resultado: net, saldo_acum: saldo + net,
      };
      saldo += net;
      return row;
    });
  }, [(window.CONTAS || []).length]);

  const dadosConvenios = React.useMemo(() => {
    const contas = (window.CONTAS || []).filter(c => c.tipo === 'receber');
    const agrup = {};
    contas.forEach(c => {
      if (!agrup[c.category]) agrup[c.category] = { convenio: c.category, previsto: 0, realizado: 0, pendente: 0, qtd: 0 };
      agrup[c.category].previsto += c.previsto;
      agrup[c.category].realizado += c.realizado || 0;
      if (!c.pago) agrup[c.category].pendente += c.previsto;
      agrup[c.category].qtd++;
    });
    return Object.values(agrup).sort((a, b) => b.realizado - a.realizado);
  }, [(window.CONTAS || []).length]);

  const dadosContas = React.useMemo(() => {
    return (window.CONTAS || []).filter(c => c.vencimento?.startsWith(mes))
      .sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
  }, [mes, (window.CONTAS || []).length]);

  // ── Exportações (reaproveitam os dados acima) ──
  const exportDRE = () => exportXLSX('DRE_' + mes, dadosDRE());
  const exportFluxo = () => exportXLSX('Fluxo_de_Caixa', dadosFluxo.map(r => ({
    Mês: r.mes, 'Prev. Entradas': +r.prev_in.toFixed(2), 'Real. Entradas': +r.real_in.toFixed(2),
    'Prev. Saídas': +r.prev_out.toFixed(2), 'Real. Saídas': +r.real_out.toFixed(2),
    'Saldo Anterior': +r.saldo_ant.toFixed(2), 'Resultado': +r.resultado.toFixed(2), 'Saldo Acumulado': +r.saldo_acum.toFixed(2),
  })));
  const exportConvenios = () => exportXLSX('Receita_por_Convenio', dadosConvenios.map(r => ({
    Convênio: r.convenio, Previsto: +r.previsto.toFixed(2), Realizado: +r.realizado.toFixed(2), Pendente: +r.pendente.toFixed(2), Qtd: r.qtd,
  })));
  const exportContas = () => exportXLSX('Contas_' + mes, dadosContas.map(c => ({
    Tipo: c.tipo === 'receber' ? 'A Receber' : 'A Pagar', Descrição: c.description, Categoria: c.category,
    Vencimento: c.vencimento, Previsto: +c.previsto.toFixed(2), Realizado: +(c.realizado || 0).toFixed(2),
    Status: c.pago ? (c.tipo === 'receber' ? 'Recebido' : 'Pago') : 'Pendente',
  })));

  const meses = window.availableMonths?.() || [];
  const abas = [
    { k: 'dre', title: 'DRE', desc: 'Demonstração de resultado — competência vs caixa', icon: 'file' },
    { k: 'fluxo', title: 'Fluxo de Caixa', desc: 'Saldo acumulado mês a mês', icon: 'chart' },
    { k: 'convenios', title: 'Receita por Convênio', desc: 'Ranking de repasses e recebimentos', icon: 'tag' },
    { k: 'contas', title: 'Extrato de Contas', desc: 'Todas as contas do mês selecionado', icon: 'calendar' },
    { k: 'conciliacao', title: 'Conciliação Bancária', desc: 'Cruza o banco (MP/Inter) com o sistema', icon: 'check' },
  ];
  const abaAtual = abas.find(a => a.k === aba);
  const exportAtual = { dre: exportDRE, fluxo: exportFluxo, convenios: exportConvenios, contas: exportContas }[aba];
  const precisaMes = aba === 'dre' || aba === 'contas';
  const ehConciliacao = aba === 'conciliacao';

  return (
    <div className="anim-fade">
      <window.Band title="Relatórios" subtitle="Clique num relatório para visualizar" />

      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tiles — clica pra abrir na tela */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {abas.map(a => {
            const on = aba === a.k;
            return (
              <window.Card key={a.k} padding={16} onClick={() => setAba(a.k)} style={{
                cursor: 'pointer',
                background: on ? 'var(--accent)' : 'var(--surface)',
                border: on ? '1px solid var(--accent)' : '1px solid var(--line)',
                boxShadow: on ? 'var(--sh-accent)' : 'var(--sh-1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--r-lg)', background: on ? 'rgba(255,255,255,.2)' : 'var(--accent-soft)', color: on ? '#fff' : 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                    <window.Icon name={a.icon} size={17} stroke={2} />
                  </div>
                  <h3 style={{ font: '600 13.5px var(--f-sans)', color: on ? '#fff' : 'var(--ink)' }}>{a.title}</h3>
                </div>
                <p style={{ font: '400 11px var(--f-sans)', color: on ? 'rgba(255,255,255,.85)' : 'var(--ink-3)', lineHeight: 1.45 }}>{a.desc}</p>
              </window.Card>
            );
          })}
        </div>

        {/* Barra: mês (quando aplicável) + exportar — a conciliação tem a própria barra */}
        {!ehConciliacao && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {precisaMes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <window.Icon name="calendar" size={15} style={{ color: 'var(--ink-3)' }} />
                <span style={{ font: '600 12px var(--f-sans)', color: 'var(--ink-2)' }}>Mês:</span>
                <select value={mes} onChange={e => setMes(e.target.value)} style={{ ...window.inputStyle, width: 'auto', height: 32, cursor: 'pointer' }}>
                  {meses.map(m => <option key={m} value={m}>{window.monthLabel(m)}</option>)}
                </select>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {gerado && <window.Pill status="pago">{gerado}.xlsx baixado</window.Pill>}
              <window.Btn variant="secondary" icon="file" onClick={exportAtual}>Baixar Excel</window.Btn>
            </div>
          </div>
        )}

        {/* ── Relatório na tela ── */}
        {aba === 'dre' && <RelDRE dreView={dreView} mes={mes} />}
        {aba === 'fluxo' && <RelFluxo dados={dadosFluxo} />}
        {aba === 'convenios' && <RelConvenios dados={dadosConvenios} />}
        {aba === 'contas' && <RelContas dados={dadosContas} mes={mes} />}
        {aba === 'conciliacao' && <window.ConciliacaoPage embedded />}
      </div>
    </div>
  );
};

// ─── DRE visual ───
const RelDRE = ({ dreView, mes }) => {
  if (!dreView) return <window.Card padding={40}><window.EmptyState icon="file" title="Sem dados para a DRE" hint="Selecione um mês com movimento." /></window.Card>;
  const C = dreView.competencia, X = dreView.caixa;
  const brl = v => window.fmt(v);
  const Linha = ({ label, kc, ind = 0, forte = false, sub = false, pct }) => (
    <tr style={{ borderTop: sub ? 'none' : '1px solid var(--line-2)', background: forte ? 'var(--surface-2)' : 'transparent' }}>
      <td style={{ padding: forte ? '9px 16px' : '6px 16px', paddingLeft: 16 + ind * 16, font: `${forte ? 700 : 400} ${forte ? 12.5 : 12}px var(--f-sans)`, color: sub ? 'var(--ink-3)' : 'var(--ink)' }}>
        {label}{pct != null && <span style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)', marginLeft: 6 }}>{pct.toFixed(1)}%</span>}
      </td>
      <td className="mono" style={{ padding: forte ? '9px 16px' : '6px 16px', textAlign: 'right', font: `${forte ? 600 : 400} ${forte ? 12.5 : 12}px var(--f-mono)`, color: C[kc] < 0 ? 'var(--c-neg)' : (forte ? 'var(--ink)' : 'var(--ink-2)') }}>{brl(C[kc])}</td>
      <td className="mono" style={{ padding: forte ? '9px 16px' : '6px 16px', textAlign: 'right', font: `${forte ? 600 : 400} ${forte ? 12.5 : 12}px var(--f-mono)`, color: X[kc] < 0 ? 'var(--c-neg)' : (forte ? 'var(--ink)' : 'var(--ink-2)') }}>{brl(X[kc])}</td>
    </tr>
  );
  return (
    <window.Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px' }}>
        <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>DRE — {window.monthLabel(mes)}</h2>
        <div style={{ font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)', marginTop: 3 }}>
          <b>Competência</b> = o que a clínica gerou no mês · <b>Caixa</b> = o que de fato entrou e saiu.
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ font: 'var(--t-label)', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
            <th style={{ textAlign: 'left', padding: '6px 16px' }}></th>
            <th style={{ textAlign: 'right', padding: '6px 16px' }}>Competência</th>
            <th style={{ textAlign: 'right', padding: '6px 16px' }}>Caixa</th>
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
      <div style={{ padding: '12px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', font: '400 11.5px var(--f-sans)' }}>
        <div><span style={{ color: 'var(--ink-3)' }}>Resultado competência: </span><b className="mono" style={{ color: C.resultado < 0 ? 'var(--c-neg)' : 'var(--c-pos)' }}>{brl(C.resultado)}</b></div>
        <div><span style={{ color: 'var(--ink-3)' }}>Resultado caixa: </span><b className="mono" style={{ color: X.resultado < 0 ? 'var(--c-neg)' : 'var(--c-pos)' }}>{brl(X.resultado)}</b></div>
        {Math.abs(C.resultado - X.resultado) > 1000 && (
          <div style={{ color: 'var(--ink-3)' }}>Diferença de <b className="mono">{brl(Math.abs(C.resultado - X.resultado))}</b> = descasamento (convênio recebe com defasagem).</div>
        )}
      </div>
    </window.Card>
  );
};

// ─── Fluxo de Caixa visual ───
const RelFluxo = ({ dados }) => {
  if (!dados.length) return <window.Card padding={40}><window.EmptyState icon="chart" title="Sem dados de fluxo" hint="Ainda não há movimento registrado." /></window.Card>;
  return (
    <window.Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px' }}>
        <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Fluxo de Caixa</h2>
        <div style={{ font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)', marginTop: 3 }}>Saldo acumulado mês a mês (realizado).</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Mês', 'Entradas', 'Saídas', 'Resultado', 'Saldo acumulado'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : 'right', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                <td style={{ padding: '9px 16px', font: '500 12px var(--f-sans)', color: 'var(--ink)' }}>{r.mes}</td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={r.real_in} size="table" style={{ color: 'var(--c-pos)' }} /></td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={r.real_out} size="table" style={{ color: 'var(--c-neg)' }} /></td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={r.resultado} size="table" colorBySign /></td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={r.saldo_acum} size="table" colorBySign style={{ fontWeight: 600 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </window.Card>
  );
};

// ─── Receita por Convênio visual ───
const RelConvenios = ({ dados }) => {
  if (!dados.length) return <window.Card padding={40}><window.EmptyState icon="tag" title="Sem receitas de convênio" hint="Não há contas a receber lançadas." /></window.Card>;
  const maxReal = Math.max(...dados.map(d => d.realizado), 1);
  return (
    <window.Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px' }}>
        <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Receita por Convênio</h2>
        <div style={{ font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)', marginTop: 3 }}>Ranking por valor realizado.</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Convênio', 'Qtd', 'Previsto', 'Realizado', 'Pendente', ''].map((h, i) => (
                <th key={h + i} style={{ padding: '10px 16px', textAlign: (i === 0) ? 'left' : (i === 5 ? 'left' : 'right'), font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                <td style={{ padding: '9px 16px', font: '600 12px var(--f-sans)', color: 'var(--ink)' }}>{r.convenio}</td>
                <td style={{ padding: '9px 16px', textAlign: 'right', font: '400 12px var(--f-mono)', color: 'var(--ink-2)' }} className="mono">{r.qtd}</td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={r.previsto} size="table" style={{ color: 'var(--ink-2)' }} /></td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={r.realizado} size="table" style={{ color: 'var(--c-pos)' }} /></td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={r.pendente} size="table" style={{ color: r.pendente > 0 ? 'var(--c-warn)' : 'var(--ink-4)' }} /></td>
                <td style={{ padding: '9px 16px', width: 120 }}>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--field)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(r.realizado / maxReal) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </window.Card>
  );
};

// ─── Extrato de Contas visual ───
const RelContas = ({ dados, mes }) => {
  if (!dados.length) return <window.Card padding={40}><window.EmptyState icon="calendar" title="Nenhuma conta no mês" hint="Selecione outro mês ou lance contas." /></window.Card>;
  return (
    <window.Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px' }}>
        <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Extrato de Contas — {window.monthLabel(mes)}</h2>
        <div style={{ font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)', marginTop: 3 }}>{dados.length} conta(s) no mês.</div>
      </div>
      <div style={{ maxHeight: '56vh', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Tipo', 'Descrição', 'Categoria', 'Vencimento', 'Previsto', 'Status'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i === 4 ? 'right' : 'left', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((c, i) => {
              const receber = c.tipo === 'receber';
              return (
                <tr key={c.id || i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                  <td style={{ padding: '9px 16px' }}><window.Pill status={receber ? 'pago' : 'pendente'}>{receber ? 'A Receber' : 'A Pagar'}</window.Pill></td>
                  <td style={{ padding: '9px 16px', font: '500 12px var(--f-sans)', color: 'var(--ink)' }}>{c.description}</td>
                  <td style={{ padding: '9px 16px', font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>{c.category}</td>
                  <td style={{ padding: '9px 16px', font: '400 12px var(--f-mono)', color: 'var(--ink-2)' }} className="mono">{window.fmtDate(c.vencimento)}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'right' }}><window.Money value={c.previsto} size="table" style={{ color: 'var(--ink)' }} /></td>
                  <td style={{ padding: '9px 16px' }}><window.Pill status={c.pago ? 'pago' : 'hoje'}>{c.pago ? (receber ? 'Recebido' : 'Pago') : 'Pendente'}</window.Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </window.Card>
  );
};

// ─── App bootstrap ───
const AppInner = () => {
  const { ready, user, demo, enterDemo, profile, homeCompanyId, logout, refresh } = useAuth();
  if (!ready) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Carregando…</div>;
  if (!user && !demo) return <LoginScreen onSuccess={(res) => { if (res?.demo) enterDemo(); }} />;
  // Veio pelo link "redefinir senha" do e-mail: pede a senha nova antes de tudo
  if (user && window.__EQ_RECUPERACAO) return <window.NovaSenhaScreen onPronto={() => { refresh(); }} />;
  // Conta sem acesso liberado (nova, pendente ou bloqueada): não entra no sistema.
  const papel = profile?.role;
  if (!demo && (!homeCompanyId || !papel || papel === 'pendente' || papel === 'bloqueado')) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg)', font: '500 14px var(--f-sans)', color: 'var(--ink-2)' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 24 }}>
          <div style={{ font: '700 18px var(--f-display)', color: 'var(--ink)', marginBottom: 10 }}>
            {papel === 'bloqueado' ? 'Acesso bloqueado' : 'Seu acesso ainda não foi liberado'}
          </div>
          <div style={{ marginBottom: 18 }}>
            {papel === 'bloqueado'
              ? 'Esta conta não tem mais acesso ao EqFinances. Fale com o administrador.'
              : 'Peça ao administrador para liberar o seu acesso e entre de novo.'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>{user?.email}</div>
          <button onClick={logout} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>
    );
  }
  return <AppShell />;
};

// Faixa padrão para telas ainda não migradas (título simples)
const TITULOS = {
  dashboard: 'Dashboard', caixa: 'Caixa', contas: 'Contas', projecao: 'Projeção',
  impostos: 'Impostos', repasse: 'Repasse', compras: 'Compras', agenda: 'Agenda',
  relatorios: 'Relatórios', rh: 'Colaboradores', provisoes: 'Folha do mês', equipe: 'Acessos', conciliacao: 'Conciliação',
  perfil: 'Meu perfil', config: 'Configurações', ajuda: 'Ajuda',
  hoje: 'Hoje', equipe_pag: 'Pagamentos da equipe',
};
// Telas já migradas para a cara nova fornecem a própria faixa; as demais usam a padrão.
const MIGRADAS = new Set(['dashboard', 'contas', 'projecao', 'impostos', 'repasse', 'compras', 'relatorios', 'conciliacao', 'caixa', 'agenda', 'hoje', 'equipe_pag']); // será preenchida nos próximos blocos

const AppShell = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('infinity-theme') || 'light');
  const [page, setPage] = useState(() => localStorage.getItem('infinity-page') || 'dashboard');
  const [modulo, setModulo] = useState(() => localStorage.getItem('infinity-modulo') || null);
  // Visão: 'completa' (tudo) ou 'operacional' (menu enxuto do dia a dia).
  // Padrão: administrador abre na completa; os demais, na operacional. Fica lembrada neste navegador.
  const { profile: perfilVisao } = useAuth();
  const [visao, setVisao] = useState(() => localStorage.getItem('infinity-visao')
    || (perfilVisao?.role === 'editor' ? 'operacional' : 'completa'));
  useEffect(() => { localStorage.setItem('infinity-visao', visao); }, [visao]);
  const trocarVisao = (v) => {
    setVisao(v);
    if (v === 'operacional') setPage('hoje');
    else setPage('dashboard');
  };

  useEffect(() => { if (modulo) localStorage.setItem('infinity-modulo', modulo); else localStorage.removeItem('infinity-modulo'); }, [modulo]);
  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem('infinity-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('infinity-page', page); }, [page]);
  // Tela sem permissão para este tipo de acesso → volta para o Dashboard.
  const papelAtual = perfilVisao?.role || 'viewer';
  const podeVer = (k) => k === 'ajuda' || k === 'perfil' || window.canAccess(papelAtual, ACESSO_ALIAS[k] || k);
  useEffect(() => { if (!podeVer(page)) setPage('dashboard'); }, [page, papelAtual]);
  // Diretoria só visualiza: não usa a visão operacional.
  useEffect(() => { if (papelAtual === 'diretoria' && visao === 'operacional') { setVisao('completa'); } }, [papelAtual]);

  const escolherModulo = (m) => { setModulo(m); setPage(m === 'financeiro' ? 'dashboard' : 'rh'); };

  const [filter, setFilter] = useState(() => window.DEFAULT_FILTER());
  useEffect(() => { localStorage.setItem('infinity-filter-v2', JSON.stringify(filter)); }, [filter]);

  const pages = {
    dashboard: <Dashboard filter={filter} setFilter={setFilter} setPage={setPage} />,
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
    equipe: <window.AcessosPage />,
    perfil: <PerfilPage />,
    config: <ConfigPage />,
    ajuda: <window.AjudaPage />,
    hoje: <window.HojePage setPage={setPage} />,
    equipe_pag: <window.PagamentosEquipePage />,
  };

  // Menu único (Financeiro + Equipe): a antiga tela de escolha Financeiro/RH não é mais usada.

  const migrada = MIGRADAS.has(page);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar page={page} setPage={setPage} modulo={modulo} setModulo={setModulo} visao={visao} trocarVisao={trocarVisao} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header theme={theme} setTheme={setTheme} setPage={setPage} />
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
