// ═══════════════════════════════════════════════════════════════════════════
// Infinity — Modo Tutorial (tour guiado assistido)
// Dispara com: window.dispatchEvent(new CustomEvent('infinity-tutorial',{detail:{page}}))
// Usa os passos de window.AJUDA[page].passos e os alvos de AJUDA_ALVOS[page].
// Se não achar o elemento na tela, mostra o passo centralizado (sem destaque).
// ═══════════════════════════════════════════════════════════════════════════

// Onde cada passo aponta na tela. Índice alinhado com AJUDA[page].passos.
// tipos: 'campo' (acha o <label> e destaca o campo dele) · 'texto' (botão/link com o texto)
//        · 'placeholder' (input com esse placeholder) · 'seletor' (CSS puro) · 'attr' (data-tour)
// Passos sem alvo aparecem centralizados — o tour funciona mesmo assim.
const AJUDA_ALVOS = {
  caixa: [
    { tipo: 'seletor', valor: 'input[type=date]' },
    { tipo: 'campo', valor: 'Profissional' },
    { tipo: 'campo', valor: 'Paciente' },
    { tipo: 'campo', valor: 'Tipo de serviço' },
    { tipo: 'campo', valor: 'Valor recebido' },
    { tipo: 'campo', valor: 'Forma de pagamento' },
    { tipo: 'campo', valor: 'CPF para NF' },
    { tipo: 'texto', valor: 'Adicionar lançamento' },
  ],
  contas: [
    { tipo: 'texto', valor: 'Ciclo' },
    { tipo: 'texto', valor: 'Resultado' },
    { tipo: 'texto', valor: 'falta pagar' },
    null,
    { tipo: 'texto', valor: 'Nova conta' },
  ],
  impostos: [
    { tipo: 'texto', valor: 'Novo imposto' },
    { tipo: 'campo', valor: 'Descrição' },
    { tipo: 'campo', valor: 'Vencimento' },
    { tipo: 'campo', valor: 'Valor previsto' },
    null,
  ],
  repasse: [
    { tipo: 'texto', valor: 'Fechamento' },
    null,
    null,
    { tipo: 'texto', valor: 'Salvar fechamento' },
  ],
  compras: [
    { tipo: 'texto', valor: 'Nova compra' },
    null,
    null,
    { tipo: 'placeholder', valor: 'Buscar por descrição' },
  ],
  config: [
    { tipo: 'placeholder', valor: 'Nova categoria de entrada' },
    { tipo: 'texto', valor: 'Ocultar' },
  ],
  perfil: [
    { tipo: 'texto', valor: 'Salvar alterações' },
    { tipo: 'texto', valor: 'Atualizar' },
    null,
  ],
  equipe: [
    { tipo: 'texto', valor: 'Convidar' },
    null,
    null,
  ],
  relatorios: [
    { tipo: 'seletor', valor: 'select' },
    null, null, null, null,
  ],
};

const _norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const acharAlvoTut = (alvo) => {
  if (!alvo) return null;
  try {
    if (alvo.tipo === 'seletor') return document.querySelector(alvo.valor);
    if (alvo.tipo === 'attr') return document.querySelector('[data-tour="' + alvo.valor + '"]');
    if (alvo.tipo === 'placeholder') {
      const el = [...document.querySelectorAll('input,textarea')]
        .find(e => _norm(e.placeholder).includes(_norm(alvo.valor)));
      return el || null;
    }
    if (alvo.tipo === 'campo') {
      const lab = [...document.querySelectorAll('label')]
        .find(l => _norm(l.textContent).includes(_norm(alvo.valor)));
      return lab ? (lab.parentElement || lab) : null;
    }
    if (alvo.tipo === 'texto') {
      const cand = [...document.querySelectorAll('button,a,[role="button"]')]
        .filter(e => _norm(e.textContent).includes(_norm(alvo.valor)) && e.offsetParent !== null);
      cand.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
      return cand[0] || null;
    }
  } catch (e) { /* silencioso */ }
  return null;
};

const TutorialOverlay = ({ page, onClose }) => {
  const info = (window.AJUDA || {})[page];
  const passos = (info && info.passos) || [];
  const alvos = AJUDA_ALVOS[page] || [];
  const [i, setI] = React.useState(0);
  const [rect, setRect] = React.useState(null);
  const elRef = React.useRef(null);

  const medir = React.useCallback(() => {
    const el = elRef.current;
    if (!el || !el.getBoundingClientRect) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { setRect(null); return; }
    setRect({ top: r.top, left: r.left, w: r.width, h: r.height });
  }, []);

  // ao trocar de passo: acha o elemento, rola até ele e mede
  React.useEffect(() => {
    const el = acharAlvoTut(alvos[i]);
    elRef.current = el;
    if (el && el.scrollIntoView) {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
      const t = setTimeout(medir, 280);
      return () => clearTimeout(t);
    }
    setRect(null);
  }, [i, page, medir]);

  // re-medir em resize/scroll
  React.useEffect(() => {
    const h = () => medir();
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, true);
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h, true); };
  }, [medir]);

  // teclado
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI(v => Math.min(v + 1, passos.length - 1));
      else if (e.key === 'ArrowLeft') setI(v => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passos.length, onClose]);

  if (!info || passos.length === 0) return null;
  const passo = passos[i];
  const ultimo = i === passos.length - 1;
  const primeiro = i === 0;

  const PAD = 8;
  const highlight = rect ? {
    position: 'fixed', top: rect.top - PAD, left: rect.left - PAD,
    width: rect.w + PAD * 2, height: rect.h + PAD * 2,
    borderRadius: 10, border: '2px solid var(--accent)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', pointerEvents: 'none',
    zIndex: 9998, transition: 'all .2s ease',
  } : null;

  // posição do balão
  const TW = 340, TH = 190;
  let tip;
  if (rect) {
    const abaixo = rect.top + rect.h + 14 + TH < window.innerHeight;
    let top = abaixo ? rect.top + rect.h + 14 : Math.max(12, rect.top - TH - 14);
    let left = rect.left + rect.w / 2 - TW / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - TW - 12));
    tip = { position: 'fixed', top, left, width: TW, zIndex: 9999 };
  } else {
    tip = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TW, zIndex: 9999 };
  }

  const card = {
    ...tip, background: 'var(--surface-solid)', color: 'var(--ink)',
    border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow-lg)', padding: 16,
  };
  const btn = (bg, fg) => ({ background: bg, color: fg, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '7px 12px' });

  return (
    <>
      {/* fundo escuro quando não há elemento destacado (passo centralizado) */}
      {!rect && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9997 }} onClick={onClose} />}
      {highlight && <div style={highlight} />}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.5 }}>
            PASSO {i + 1} DE {passos.length}
          </span>
          <button onClick={onClose} title="Sair do tutorial" style={{ background: 'none', border: 'none', color: 'var(--ink-mute)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{passo.t}</div>
        {passo.obs ? <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 6, lineHeight: 1.45 }}>{passo.obs}</div> : null}
        {/* progresso */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {passos.map((_, k) => (
            <div key={k} style={{ flex: 1, height: 4, borderRadius: 2, background: k <= i ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <button onClick={onClose} style={{ ...btn('transparent', 'var(--ink-mute)') }}>Pular</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!primeiro && <button onClick={() => setI(v => v - 1)} style={btn('var(--surface)', 'var(--ink)')}>Anterior</button>}
            {ultimo
              ? <button onClick={onClose} style={btn('var(--accent)', 'var(--accent-ink)')}>Concluir ✓</button>
              : <button onClick={() => setI(v => v + 1)} style={btn('var(--accent)', 'var(--accent-ink)')}>Próximo →</button>}
          </div>
        </div>
      </div>
    </>
  );
};

// Host montado uma vez no app; escuta o evento e controla o tour.
const TutorialHost = () => {
  const [page, setPage] = React.useState(null);
  React.useEffect(() => {
    const on = (e) => setPage(e.detail && e.detail.page);
    window.addEventListener('infinity-tutorial', on);
    return () => window.removeEventListener('infinity-tutorial', on);
  }, []);
  if (!page) return null;
  return <TutorialOverlay page={page} onClose={() => setPage(null)} />;
};

Object.assign(window, { AJUDA_ALVOS, TutorialHost, TutorialOverlay, acharAlvoTut });
