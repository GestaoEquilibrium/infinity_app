// ═══════════════════════════════════════════════════════════════
// Eq Finance — Calendário de contas a pagar (aba do Dashboard)
// Módulo isolado (IIFE): só publica window.CalendarioPagar.
// Lê window.CONTAS (já carregado do Supabase) — não cria tabela,
// não muda o banco. A única gravação é a baixa ("Pagar"), pelo
// mesmo caminho da tela Contas (window.updateContaLocal).
// Transferências internas ficam de fora (window.ehTransferenciaInterna).
// ═══════════════════════════════════════════════════════════════
(function () {
const { useState, useEffect, useReducer } = React;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA_CURTA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SEMANA_LONGA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hojeISO = () => toISO(new Date());
const dataDe = (iso) => new Date(iso + 'T00:00:00');
const somaDias = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return toISO(d); };
const difDias = (de, ate) => Math.round((dataDe(ate) - dataDe(de)) / 86400000);
const fmtBR = (iso) => (iso || '').split('-').reverse().join('/');
const brl = (v) => (window.fmt ? window.fmt(v) : 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// valor curto para caber na célula: R$ 950 · R$ 12,4 mil · R$ 1,2 mi
const brlCurto = (v) => {
  const n = Math.abs(Number(v) || 0);
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (n >= 1e4) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};
const parseBRL = (t) => {
  if (typeof t === 'number') return t;
  const s = String(t || '').replace(/[^\d,.-]/g, '');
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return isFinite(n) ? n : null;
};

const valorAberto = (c) => Number(c.previsto) || 0;
const valorPago = (c) => Number(c.realizado) || Number(c.previsto) || 0;
const valorDe = (c) => (c.pago ? valorPago(c) : valorAberto(c));

// Contas a pagar válidas (sem transferência interna entre empresas do grupo)
function contasAPagar() {
  const ehTI = window.ehTransferenciaInterna || (() => false);
  return (window.CONTAS || []).filter(c => c && c.tipo === 'pagar' && c.vencimento && !ehTI(c));
}

// Situação de uma conta em relação a hoje
function situacao(c, hoje) {
  if (c.pago) return 'paga';
  if (c.vencimento < hoje) return 'vencida';
  if (c.vencimento === hoje) return 'hoje';
  return 'aberta';
}
const COR = {
  vencida: 'var(--c-neg)',
  hoje: 'var(--c-warn)',
  aberta: 'var(--accent)',
  paga: 'var(--c-pos)',
};
const COR_BG = {
  vencida: 'var(--c-neg-bg)',
  hoje: 'var(--c-warn-bg)',
  aberta: 'var(--accent-soft)',
  paga: 'var(--c-pos-bg)',
};
const ordemSituacao = { vencida: 0, hoje: 1, aberta: 2, paga: 3 };

// ─── Estilos que precisam de media query (inline não faz) ───
const CSS = `
.calpg-grid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:16px; align-items:start; }
.calpg-side { display:flex; flex-direction:column; gap:16px; position:sticky; top:16px; }
.calpg-cal { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)) 104px; }
.calpg-cell { min-height:104px; }
.calpg-cell:hover { background:var(--surface-2) !important; }
.calpg-cell:focus-visible { outline:2px solid var(--accent); outline-offset:-2px; border-radius:0; }
.calpg-lines { display:flex; }
.calpg-head > span:first-child { flex-shrink:0; }
@media (max-width:1240px) { .calpg-grid { grid-template-columns:minmax(0,1fr); } .calpg-side { position:static; } }
@media (max-width:820px) { .calpg-cal { grid-template-columns:repeat(7,minmax(0,1fr)); } .calpg-week { display:none !important; } .calpg-lines { display:none; } .calpg-cell { min-height:64px; } .calpg-head { flex-direction:column; align-items:flex-start !important; gap:2px !important; } .calpg-head > span:last-child { font-size:10px !important; max-width:100%; } }
`;

// ─── Modal de baixa (mesma gravação da tela Contas) ───
const PagarModal = ({ conta, onClose, onSaved }) => {
  const [valor, setValor] = useState(() => (Number(conta.previsto) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const [data, setData] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const confirmar = async (e) => {
    e?.preventDefault();
    const v = parseBRL(valor);
    if (v == null || v <= 0) { setErro('Informe o valor pago.'); return; }
    if (!data) { setErro('Informe a data do pagamento.'); return; }
    setSalvando(true); setErro('');
    try {
      await window.updateContaLocal(conta.id, { pago: true, realizado: Number(v.toFixed(2)), pagoEm: data });
      onSaved?.();
    } catch (err) { setErro(err?.message || 'Não consegui salvar.'); }
    finally { setSalvando(false); }
  };

  const dif = (parseBRL(valor) || 0) - (Number(conta.previsto) || 0);
  const campo = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-lg)', background: 'var(--field)', color: 'var(--ink)', font: '500 13px var(--f-sans)', outline: 'none', boxSizing: 'border-box' };
  const rotulo = { font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', marginBottom: 6, display: 'block' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(15,23,32,.45)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form onSubmit={confirmar} onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--shadow-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 18, animation: 'popIn .25s var(--ease) backwards' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--r-lg)', background: 'var(--c-pos-bg)', color: 'var(--c-pos)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <window.Icon name="check" size={20} stroke={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Confirmar pagamento</h3>
            <div style={{ font: 'var(--t-body-2)', color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conta.description}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface-3)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <window.Icon name="x" size={14} stroke={2.2} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 14px', background: 'var(--surface-3)', borderRadius: 'var(--r-lg)' }}>
          <div>
            <span style={rotulo}>Vencimento</span>
            <div style={{ font: '500 13px var(--f-sans)', color: 'var(--ink)' }}>{fmtBR(conta.vencimento)}</div>
          </div>
          <div>
            <span style={rotulo}>Previsto</span>
            <window.Money value={conta.previsto} size="table" style={{ color: 'var(--ink)', fontWeight: 600 }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={rotulo}>Categoria</span>
            <div style={{ font: '500 13px var(--f-sans)', color: 'var(--ink)' }}>{conta.category || '—'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            <span style={rotulo}>Valor pago (R$)</span>
            <input autoFocus value={valor} onChange={(e) => setValor(e.target.value)} onFocus={(e) => e.target.select()} inputMode="decimal" style={{ ...campo, fontFamily: 'var(--f-mono)' }} />
          </label>
          <label>
            <span style={rotulo}>Data do pagamento</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={campo} />
          </label>
        </div>

        {Math.abs(dif) >= 0.01 && (parseBRL(valor) || 0) > 0 && (
          <div style={{ font: 'var(--t-body-2)', color: dif > 0 ? 'var(--c-neg)' : 'var(--c-pos)' }}>
            {dif > 0 ? 'Pagando ' : 'Pagando '}{brl(Math.abs(dif))}{dif > 0 ? ' a mais que o previsto (juros/multa?)' : ' a menos que o previsto (desconto?)'}
          </div>
        )}
        {erro && <div style={{ font: 'var(--t-body-2)', color: 'var(--c-neg)' }}>{erro}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <window.Btn type="button" variant="secondary" onClick={onClose}>Cancelar</window.Btn>
          <window.Btn type="submit" variant="primary" icon="check" disabled={salvando}>{salvando ? 'Salvando…' : 'Confirmar pagamento'}</window.Btn>
        </div>
      </form>
    </div>
  );
};

// ─── Linha de conta (painel lateral) ───
const LinhaConta = ({ c, hoje, podePagar, podeAbrir, onPagar, onAbrir, mostrarData }) => {
  const s = situacao(c, hoje);
  const atraso = s === 'vencida' ? difDias(c.vencimento, hoje) : 0;
  const nota = s === 'paga' ? `Paga${c.pagoEm ? ' em ' + fmtBR(c.pagoEm) : ''}`
    : s === 'vencida' ? `Vencida há ${atraso} ${atraso === 1 ? 'dia' : 'dias'}`
    : s === 'hoje' ? 'Vence hoje'
    : `Vence em ${difDias(hoje, c.vencimento)} dias`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line-2)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: COR[s], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div title={c.description} style={{ font: '500 12.5px var(--f-sans)', color: s === 'paga' ? 'var(--ink-3)' : 'var(--ink)', textDecoration: s === 'paga' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description || '(sem descrição)'}</div>
        <div style={{ font: '400 10.5px var(--f-sans)', color: s === 'paga' ? 'var(--ink-4)' : COR[s], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {mostrarData ? fmtBR(c.vencimento) + ' · ' : ''}{nota}{c.category ? <span style={{ color: 'var(--ink-3)' }}>{' · ' + c.category}</span> : null}
        </div>
      </div>
      <window.Money value={valorDe(c)} size="table" style={{ color: s === 'paga' ? 'var(--ink-3)' : 'var(--ink)', fontWeight: 600 }} />
      {(podePagar && !c.pago) || podeAbrir ? (
        <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {podePagar && !c.pago && (
            <button onClick={() => onPagar(c)} title="Dar baixa (pagar)" style={{ height: 26, padding: '0 9px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', font: '600 11px var(--f-sans)', cursor: 'pointer' }}>Pagar</button>
          )}
          {podeAbrir && (
            <button onClick={() => onAbrir(c)} title="Abrir na tela Contas" aria-label="Abrir na tela Contas" style={{ width: 26, height: 26, borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <window.Icon name="edit" size={13} />
            </button>
          )}
        </span>
      ) : null}
    </div>
  );
};

// ─── Upload da nota fiscal (mesmo cofre do AnexoNota: bucket "notas" + contas_anexos) ───
// Autossuficiente, para o fluxo "lancei a compra e já subo a NF". Se a infra de
// notas não existir (anexo_nota.sql não rodado), falha de forma clara e a conta
// continua salva — a NF pode ser anexada depois na tela Contas.
async function subirNotaFiscal(conta, file) {
  const companyId = conta.company_id || window.HOME_COMPANY_ID || window.ACTIVE_COMPANY_ID || null;
  const s = window.getSession ? window.getSession() : null;
  const headers = { apikey: window.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + ((s && s.access_token) || window.SUPABASE_ANON_KEY) };
  const limpo = file.name.replace(/[^\w.\-]+/g, '_');
  const path = (companyId || 'sem_empresa') + '/' + conta.id + '/' + Date.now() + '_' + limpo;
  const up = await fetch(window.SUPABASE_URL + '/storage/v1/object/notas/' + encodeURI(path), {
    method: 'POST', headers: { ...headers, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file,
  });
  if (!up.ok) throw new Error('Falha no upload da NF (' + up.status + ')');
  await window.__sbRest('/contas_anexos', {
    method: 'POST', prefer: 'return=minimal',
    body: JSON.stringify({ conta_id: conta.id, company_id: companyId, nome: file.name, path }),
  });
}

// ─── Modal: novo gasto no dia selecionado ───
// "Comprei algo → lanço o que foi, quanto foi, e já subo a NF." Grava direto em
// transactions (window.createConta), no mesmo formato da tela Contas.
const NovoGastoModal = ({ dia, onClose, onSaved }) => {
  const cats = (window.APP_CATEGORIES && window.APP_CATEGORIES.saida) || [];
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(dia);
  const [categoria, setCategoria] = useState('');
  const [jaPago, setJaPago] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [parcelar, setParcelar] = useState(false);
  const [nParc, setNParc] = useState('12');
  const [progresso, setProgresso] = useState(null);     // {feito,total} durante o parcelamento
  const fileRef = React.useRef(null);

  // Vencimento da parcela k (0 = primeira): mesmo dia nos meses seguintes,
  // ajustado para o último dia quando o mês não tem aquele dia (ex.: dia 31).
  const vencParcela = (k) => {
    const base = dataDe(data);
    const d = new Date(base.getFullYear(), base.getMonth() + k, 1);
    const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(base.getDate(), ult));
    return toISO(d);
  };
  const nP = parcelar ? (parseInt(nParc, 10) || 0) : 1;
  const vParc = parseBRL(valor) || 0;

  // Cria UMA conta a pagar (pendente) com o mesmo payload da tela Contas — sem o
  // campo `origem` (mandar origem:'manual' acionava uma trigger de baixa no banco
  // que roda um DELETE sem WHERE → "DELETE requires a WHERE clause").
  const criarUma = async (cid, uid, descricao, venc) => {
    const conta = { tipo: 'pagar', description: descricao, category: categoria || 'A classificar', previsto: Number(vParc.toFixed(2)), vencimento: venc, pago: false, realizado: 0, pagoEm: null };
    const saved = await window.createConta(conta, cid, uid);
    const salvo = (Array.isArray(saved) && saved[0]) || {};
    const id = salvo.id || ('new-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
    const registro = { ...conta, id, company_id: salvo.company_id || cid };
    window.CONTAS = [registro, ...(window.CONTAS || [])];
    return { salvo, registro };
  };

  const salvar = async (e) => {
    e?.preventDefault();
    if (!desc.trim()) { setErro('Escreva o que foi comprado.'); return; }
    if (vParc <= 0) { setErro(parcelar ? 'Informe o valor de cada parcela.' : 'Informe quanto foi.'); return; }
    if (!data) { setErro('Informe a data.'); return; }
    if (parcelar && nP < 2) { setErro('Número de parcelas deve ser 2 ou mais.'); return; }
    if (parcelar && nP > 360) { setErro('Máximo de 360 parcelas.'); return; }
    setSalvando(true); setErro(''); setAviso('');
    try {
      const sess = window.getSession?.();
      const me = sess ? await window.getMe?.() : null;
      const prof = me ? await window.getProfile?.(me.id) : null;
      const cid = window.ACTIVE_COMPANY_ID || prof?.company_id;
      if (!cid) throw new Error('Empresa não identificada — saia e entre de novo.');
      let aviso2 = '';

      if (parcelar) {
        // Parcelamento: cria N contas a pagar, uma por mês, no mesmo dia.
        let primeira = null;
        for (let k = 0; k < nP; k++) {
          const r = await criarUma(cid, me?.id, desc.trim() + ' (' + (k + 1) + '/' + nP + ')', vencParcela(k));
          if (k === 0) primeira = r;
          setProgresso({ feito: k + 1, total: nP });
          window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
        }
        if (arquivo && primeira) {
          try { await subirNotaFiscal(primeira.registro, arquivo); }
          catch (e2) { aviso2 = 'As ' + nP + ' parcelas foram lançadas, mas a NF não subiu (' + (e2.message || 'erro') + '). Anexe depois na tela Contas.'; }
        }
        onSaved?.();
      } else {
        // Gasto único.
        const { salvo, registro, id } = await (async () => { const r = await criarUma(cid, me?.id, desc.trim(), data); return { ...r, id: r.registro.id }; })();
        window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
        if (jaPago) {
          if (salvo.id) {
            try { await window.updateContaLocal(salvo.id, { pago: true, realizado: Number(vParc.toFixed(2)), pagoEm: data }); }
            catch (e2) { aviso2 = 'Lançado como A PAGAR, mas não consegui marcar como pago (' + (e2.message || 'erro') + '). Dá pra dar baixa no botão “Pagar”.'; }
          } else {
            window.CONTAS = (window.CONTAS || []).map(c => c.id === id ? { ...c, pago: true, realizado: Number(vParc.toFixed(2)), pagoEm: data } : c);
            window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
          }
        }
        if (arquivo) {
          try { await subirNotaFiscal(registro, arquivo); }
          catch (e2) { aviso2 = (aviso2 ? aviso2 + ' ' : '') + 'A NF não subiu (' + (e2.message || 'erro') + '). Dá pra anexar depois na tela Contas.'; }
        }
        onSaved?.(registro);
      }
      if (aviso2) setAviso(aviso2); // mantém o modal aberto só pra avisar
      else onClose();
    } catch (err) { setErro(err?.message || 'Não consegui salvar.'); }
    finally { setSalvando(false); setProgresso(null); }
  };

  const campo = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-lg)', background: 'var(--field)', color: 'var(--ink)', font: '500 13px var(--f-sans)', outline: 'none', boxSizing: 'border-box' };
  const rotulo = { font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', marginBottom: 6, display: 'block' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(15,23,32,.45)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--shadow-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'popIn .25s var(--ease) backwards' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--r-lg)', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <window.Icon name="plus" size={20} stroke={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Novo gasto</h3>
            <div style={{ font: 'var(--t-body-2)', color: 'var(--ink-3)', marginTop: 2 }}>Lançar uma conta a pagar no dia escolhido.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface-3)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <window.Icon name="x" size={14} stroke={2.2} />
          </button>
        </div>

        <label>
          <span style={rotulo}>O que foi comprado</span>
          <input autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Papelaria, material de limpeza…" style={campo} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            <span style={rotulo}>{parcelar ? 'Valor de cada parcela (R$)' : 'Quanto foi (R$)'}</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" style={{ ...campo, fontFamily: 'var(--f-mono)' }} />
          </label>
          <label>
            <span style={rotulo}>{parcelar ? '1ª parcela em' : 'Data'}</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={campo} />
          </label>
        </div>

        <label>
          <span style={rotulo}>Categoria</span>
          {cats.length > 0 ? (
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={campo}>
              <option value="">A classificar</option>
              {cats.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
            </select>
          ) : (
            <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="A classificar" style={campo} />
          )}
        </label>

        {/* Parcelamento */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '10px 12px', background: 'var(--surface-2)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={parcelar} onChange={(e) => setParcelar(e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <span style={{ font: '500 13px var(--f-sans)', color: 'var(--ink)' }}>Parcelar <span style={{ color: 'var(--ink-3)' }}>(ex.: imposto em várias vezes)</span></span>
          </label>
          {parcelar && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ font: '500 13px var(--f-sans)', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Nº de parcelas</span>
                <input value={nParc} onChange={(e) => setNParc(e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={{ ...campo, width: 90, fontFamily: 'var(--f-mono)' }} />
                <span style={{ font: 'var(--t-body-2)', color: 'var(--ink-3)' }}>mensais, todo dia {dataDe(data).getDate()}</span>
              </label>
              {nP >= 2 && vParc > 0 && (
                <div style={{ font: 'var(--t-body-2)', color: 'var(--ink-2)', lineHeight: 1.5, background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', padding: '8px 10px' }}>
                  <b>{nP}×</b> de <b>{brl(vParc)}</b> · total <b>{brl(vParc * nP)}</b><br/>
                  1ª em {fmtBR(vencParcela(0))} · última em {fmtBR(vencParcela(nP - 1))}
                </div>
              )}
            </div>
          )}
        </div>

        {!parcelar && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
            <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <span style={{ font: '500 13px var(--f-sans)', color: 'var(--ink)' }}>Já está pago <span style={{ color: 'var(--ink-3)' }}>(compra à vista)</span></span>
          </label>
        )}

        <div>
          <span style={rotulo}>Nota fiscal (opcional)</span>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '10px 12px', border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', color: arquivo ? 'var(--ink)' : 'var(--ink-3)', font: '500 12.5px var(--f-sans)', cursor: 'pointer', textAlign: 'left' }}>
            <window.Icon name="file" size={16} style={{ color: arquivo ? 'var(--accent)' : 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arquivo ? arquivo.name : 'Anexar foto ou PDF da nota'}</span>
            {arquivo && <span onClick={(e) => { e.stopPropagation(); setArquivo(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ color: 'var(--ink-3)', padding: 2 }}><window.Icon name="x" size={14} /></span>}
          </button>
          {parcelar && <div style={{ font: 'var(--t-body-2)', color: 'var(--ink-3)', marginTop: 5 }}>A nota fica anexada na 1ª parcela.</div>}
        </div>

        {aviso && <div style={{ font: 'var(--t-body-2)', color: 'var(--c-warn)', background: 'var(--c-warn-bg)', padding: '8px 10px', borderRadius: 'var(--r-md)' }}>{aviso}</div>}
        {erro && <div style={{ font: 'var(--t-body-2)', color: 'var(--c-neg)' }}>{erro}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
          <window.Btn type="button" variant="secondary" onClick={onClose}>{aviso ? 'Fechar' : 'Cancelar'}</window.Btn>
          {!aviso && <window.Btn type="submit" variant="primary" icon="check" disabled={salvando}>
            {salvando
              ? (parcelar ? `Lançando ${progresso ? progresso.feito : 0}/${nP}…` : 'Salvando…')
              : (parcelar ? `Lançar ${nP >= 2 ? nP + ' ' : ''}parcelas` : 'Lançar gasto')}
          </window.Btn>}
        </div>
      </form>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
const CalendarioPagar = ({ setPage, abas }) => {
  const [, tick] = useReducer(x => x + 1, 0);
  useEffect(() => {
    const h = () => tick();
    window.addEventListener('sb-data-hydrated', h);
    return () => window.removeEventListener('sb-data-hydrated', h);
  }, []);

  const hoje = hojeISO();
  const [mes, setMes] = useState(hoje.slice(0, 7));       // YYYY-MM visível
  const [sel, setSel] = useState(hoje);                    // dia selecionado
  const [filtro, setFiltro] = useState('todas');           // todas | abertas | pagas
  const [pagando, setPagando] = useState(null);
  const [criando, setCriando] = useState(null);            // data do dia em que vai lançar

  const auth = (window.useAuth && window.useAuth()) || {};
  const role = auth.demo ? 'admin' : (auth.profile?.role || 'viewer');
  const podePagar = ['admin', 'editor'].includes(role);
  const podeCriar = ['admin', 'editor'].includes(role);
  const podeAbrir = !!setPage && (window.canAccess ? window.canAccess(role, 'contas') : true);

  const abrirEmContas = (c) => {
    window.__eqAbrirConta = c.id;
    setPage('contas');
    setTimeout(() => window.dispatchEvent(new Event('eq-abrir-conta')), 80);
  };

  // ── dados ──
  const todas = contasAPagar();
  const passa = (c) => filtro === 'todas' || (filtro === 'pagas' ? c.pago : !c.pago);

  const [ano, mesNum] = mes.split('-').map(Number);
  const primeiro = new Date(ano, mesNum - 1, 1);
  const nDias = new Date(ano, mesNum, 0).getDate();
  const inicioGrade = toISO(new Date(ano, mesNum - 1, 1 - primeiro.getDay()));
  const nSemanas = Math.ceil((primeiro.getDay() + nDias) / 7);
  const iniMes = `${mes}-01`, fimMes = `${mes}-${pad(nDias)}`;

  const porDia = {};
  todas.forEach(c => {
    if (c.vencimento < iniMes || c.vencimento > fimMes) return;
    (porDia[c.vencimento] = porDia[c.vencimento] || []).push(c);
  });
  Object.values(porDia).forEach(l => l.sort((a, b) => (ordemSituacao[situacao(a, hoje)] - ordemSituacao[situacao(b, hoje)]) || (valorDe(b) - valorDe(a))));

  const doMes = todas.filter(c => c.vencimento >= iniMes && c.vencimento <= fimMes);
  const abertoMes = doMes.filter(c => !c.pago).reduce((a, c) => a + valorAberto(c), 0);
  const pagoMes = doMes.filter(c => c.pago).reduce((a, c) => a + valorPago(c), 0);
  const vencidas = todas.filter(c => !c.pago && c.vencimento < hoje).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const totalVencido = vencidas.reduce((a, c) => a + valorAberto(c), 0);
  const ate7 = somaDias(hoje, 7);
  const prox7 = todas.filter(c => !c.pago && c.vencimento >= hoje && c.vencimento <= ate7).reduce((a, c) => a + valorAberto(c), 0);

  // Valor da célula: o que ainda falta pagar no dia; se já está tudo pago, o que foi pago.
  const valorCelula = (lista) => {
    const ab = lista.filter(c => !c.pago);
    return ab.length ? ab.reduce((a, c) => a + valorAberto(c), 0) : lista.reduce((a, c) => a + valorPago(c), 0);
  };
  // intensidade de cor da célula = quanto pesa o dia no mês (escala raiz)
  const totalDia = (iso) => valorCelula((porDia[iso] || []).filter(passa));
  let maxDia = 1;
  for (let d = 1; d <= nDias; d++) maxDia = Math.max(maxDia, totalDia(`${mes}-${pad(d)}`));

  const irMes = (delta) => {
    const d = new Date(ano, mesNum - 1 + delta, 1);
    const novo = toISO(d).slice(0, 7);
    setMes(novo);
    setSel(novo === hoje.slice(0, 7) ? hoje : `${novo}-01`);
  };
  const irHoje = () => { setMes(hoje.slice(0, 7)); setSel(hoje); };
  const irPara = (iso) => { setMes(iso.slice(0, 7)); setSel(iso); };

  // ── dia selecionado ──
  const doDia = (porDia[sel] || []).filter(passa);
  const selD = dataDe(sel);
  const abertoDia = doDia.filter(c => !c.pago).reduce((a, c) => a + valorAberto(c), 0);
  const fimDeSemana = (selD.getDay() === 0 || selD.getDay() === 6) && doDia.some(c => !c.pago);

  const nomeMes = MESES[mesNum - 1];
  const tituloMes = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + ' de ' + ano;

  // ── célula do calendário (função, não componente: evita remontar a cada render) ──
  const celula = (iso, idx) => {
    const dentro = iso >= iniMes && iso <= fimMes;
    const d = dataDe(iso);
    const col = idx % 7;
    const ultimaLinha = idx >= (nSemanas - 1) * 7;
    const borda = { borderRight: '1px solid var(--line-2)', borderBottom: ultimaLinha ? 'none' : '1px solid var(--line-2)' };
    if (!dentro) {
      return <div key={iso} className="calpg-cell" style={{ ...borda, background: 'var(--surface-3)', padding: '8px 9px', font: '500 11.5px var(--f-mono)', color: 'var(--ink-4)', opacity: .55 }}>{d.getDate()}</div>;
    }
    const lista = (porDia[iso] || []).filter(passa);
    const abertas = lista.filter(c => !c.pago);
    const pior = lista.length ? situacao(lista[0], hoje) : null;  // lista já vem ordenada pela pior situação
    const tot = valorCelula(lista);
    const tudoPago = lista.length > 0 && abertas.length === 0;
    const intens = tot > 0 ? Math.round(4 + Math.sqrt(tot / maxDia) * 14) : 0;   // 4%–18%
    const tom = pior === 'vencida' ? 'var(--c-neg)' : pior === 'hoje' ? 'var(--c-warn)' : tudoPago ? 'var(--c-pos)' : 'var(--accent)';
    const ehHoje = iso === hoje, ehSel = iso === sel;
    const fds = col === 0 || col === 6;
    return (
      <button key={iso} className="calpg-cell" onClick={() => setSel(iso)} aria-pressed={ehSel}
        aria-label={`${d.getDate()} de ${nomeMes}: ${lista.length ? lista.length + ' conta(s), ' + (tudoPago ? 'pago ' : 'falta pagar ') + brl(tot) : 'sem contas'}`}
        style={{
          ...borda, position: 'relative', textAlign: 'left', cursor: 'pointer', padding: '7px 8px 8px',
          display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
          background: intens ? `color-mix(in srgb, ${tom} ${intens}%, var(--surface))` : (fds ? 'var(--surface-2)' : 'var(--surface)'),
          boxShadow: ehSel ? 'inset 0 0 0 2px var(--accent)' : 'none',
          transition: 'background var(--dur) var(--ease)',
        }}>
        <div className="calpg-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
          <span style={{
            font: `${ehHoje ? 700 : 600} 11.5px var(--f-mono)`, minWidth: 22, height: 22, borderRadius: 99, display: 'grid', placeItems: 'center',
            background: ehHoje ? 'var(--accent)' : 'transparent', color: ehHoje ? 'var(--on-accent)' : (fds ? 'var(--ink-3)' : 'var(--ink-2)'),
          }}>{d.getDate()}</span>
          {lista.length > 0 && (
            <span title={brl(tot)} style={{ font: '600 11px var(--f-mono)', color: tudoPago ? 'var(--c-pos)' : tom, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
              {tudoPago ? '✓ ' : ''}{brlCurto(tot).replace('R$ ', '')}
            </span>
          )}
        </div>
        {lista.length > 0 && (
          <div className="calpg-lines" style={{ flexDirection: 'column', gap: 2, minWidth: 0 }}>
            {lista.slice(0, 3).map(c => {
              const s = situacao(c, hoje);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 9, background: COR[s], flexShrink: 0 }} />
                  <span style={{ font: '500 10.5px/1.35 var(--f-sans)', color: s === 'paga' ? 'var(--ink-3)' : 'var(--ink)', textDecoration: s === 'paga' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description || '(sem descrição)'}</span>
                </div>
              );
            })}
            {lista.length > 3 && <span style={{ font: '600 10px var(--f-sans)', color: 'var(--ink-3)', paddingLeft: 10 }}>+{lista.length - 3} {lista.length - 3 === 1 ? 'conta' : 'contas'}</span>}
          </div>
        )}
      </button>
    );
  };

  const celulas = [];
  for (let i = 0; i < nSemanas * 7; i++) celulas.push(somaDias(inicioGrade, i));

  // total por semana (só dias do mês visível)
  const resumoSemana = (w) => {
    let aberto = 0, pago = 0, n = 0;
    for (let i = 0; i < 7; i++) {
      const iso = celulas[w * 7 + i];
      if (iso < iniMes || iso > fimMes) continue;
      (porDia[iso] || []).filter(passa).forEach(c => { n++; if (c.pago) pago += valorPago(c); else aberto += valorAberto(c); });
    }
    return { aberto, pago, n };
  };

  const linhas = [];
  for (let w = 0; w < nSemanas; w++) {
    for (let i = 0; i < 7; i++) {
      const idx = w * 7 + i;
      linhas.push(celula(celulas[idx], idx));
    }
    const r = resumoSemana(w);
    const ultima = w === nSemanas - 1;
    linhas.push(
      <div key={'sem' + w} className="calpg-week" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 3, padding: '8px 12px', background: 'var(--surface-3)', borderBottom: ultima ? 'none' : '1px solid var(--line-2)' }}>
        {r.n === 0 ? <span style={{ font: '500 11px var(--f-sans)', color: 'var(--ink-4)' }}>—</span> : (
          <>
            {filtro !== 'pagas' && <window.Money value={r.aberto} size="table" style={{ fontWeight: 700, color: r.aberto > 0 ? 'var(--ink)' : 'var(--ink-3)' }} />}
            {filtro !== 'abertas' && r.pago > 0 && <span style={{ font: '500 10.5px var(--f-mono)', color: 'var(--c-pos)', whiteSpace: 'nowrap' }}>✓ {brlCurto(r.pago)}</span>}
            <span style={{ font: '500 10px var(--f-sans)', color: 'var(--ink-3)' }}>{r.n} {r.n === 1 ? 'conta' : 'contas'}</span>
          </>
        )}
      </div>
    );
  }

  const legenda = [['vencida', 'Vencida'], ['hoje', 'Vence hoje'], ['aberta', 'A vencer'], ['paga', 'Paga']];

  return (
    <div className="anim-fade">
      <style>{CSS}</style>

      <window.Band
        title="Calendário de contas a pagar"
        subtitle={tituloMes}
        right={
          <>
            {podeCriar && <window.Btn variant="primary" size="sm" icon="plus" onBand onClick={() => setCriando(sel)}>Novo gasto</window.Btn>}
            <window.Btn variant="secondary" size="sm" onBand onClick={irHoje}>Hoje</window.Btn>
            <window.MonthNav label={nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + '/' + String(ano).slice(2)} onPrev={() => irMes(-1)} onNext={() => irMes(1)} />
          </>
        }
        metricLabel={`Falta pagar em ${nomeMes}`}
        metric={abertoMes}
        stats={[
          { label: 'Já pago no mês', value: pagoMes, color: 'var(--on-accent-pos)' },
          { label: `Vencido em aberto${vencidas.length ? ' · ' + vencidas.length : ''}`, value: totalVencido, color: totalVencido > 0 ? 'var(--on-accent-neg)' : undefined },
          { label: 'Próximos 7 dias', value: prox7 },
        ]}
      >
        {abas}
      </window.Band>

      <div style={{ padding: '20px 30px 26px' }}>
        <div className="calpg-grid">
          {/* ── Calendário ── */}
          <window.Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {legenda.map(([k, l]) => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '500 11.5px var(--f-sans)', color: 'var(--ink-2)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: COR[k] }} />{l}
                  </span>
                ))}
              </div>
              <window.Segmented
                options={[{ value: 'todas', label: 'Todas' }, { value: 'abertas', label: 'Em aberto' }, { value: 'pagas', label: 'Pagas' }]}
                value={filtro} onChange={setFiltro} />
            </div>

            <div className="calpg-cal" role="grid" aria-label={'Contas a pagar de ' + tituloMes}>
              {SEMANA_CURTA.map((s, i) => (
                <div key={s} style={{ padding: '9px 8px', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: i === 0 || i === 6 ? 'var(--ink-4)' : 'var(--ink-3)', borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line-2)' }}>{s}</div>
              ))}
              <div className="calpg-week" style={{ padding: '9px 12px', textAlign: 'right', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', background: 'var(--surface-3)' }}>Semana</div>
              {linhas}
            </div>
          </window.Card>

          {/* ── Painel lateral ── */}
          <div className="calpg-side">
            <window.Card padding={18}>
              <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: sel === hoje ? 'var(--accent)' : 'var(--ink-3)' }}>
                {sel === hoje ? 'Hoje · ' : ''}{SEMANA_LONGA[selD.getDay()]}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                <h2 style={{ font: 'var(--t-h1)', color: 'var(--ink)', letterSpacing: '-.02em' }}>{selD.getDate()} de {MESES[selD.getMonth()]}</h2>
                {abertoDia > 0 && <window.Money value={abertoDia} size="kpi" style={{ color: 'var(--ink)', fontWeight: 600 }} />}
              </div>
              {fimDeSemana && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, padding: '8px 10px', background: 'var(--c-warn-bg)', borderRadius: 'var(--r-md)', font: '500 11.5px/1.45 var(--f-sans)', color: 'var(--c-warn)' }}>
                  <window.Icon name="alert" size={14} style={{ marginTop: 1 }} />
                  <span>Cai no fim de semana. Boleto costuma vencer no próximo dia útil, mas PIX/débito programado pode sair antes — confira.</span>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                {doDia.length === 0 ? (
                  <div style={{ padding: '18px 0 6px', textAlign: 'center', font: '500 12.5px var(--f-sans)', color: 'var(--ink-3)', borderTop: '1px solid var(--line-2)' }}>
                    {filtro === 'pagas' ? 'Nenhuma conta paga neste dia.' : 'Nada vence neste dia.'}
                  </div>
                ) : doDia.map(c => (
                  <LinhaConta key={c.id} c={c} hoje={hoje} podePagar={podePagar} podeAbrir={podeAbrir} onPagar={setPagando} onAbrir={abrirEmContas} />
                ))}
              </div>
              {podeCriar && (
                <button onClick={() => setCriando(sel)} style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, borderRadius: 'var(--r-lg)', border: '1px dashed var(--line-strong)', background: 'var(--surface-2)', color: 'var(--accent)', font: '600 12.5px var(--f-sans)', cursor: 'pointer' }}>
                  <window.Icon name="plus" size={15} stroke={2.2} />Novo gasto neste dia
                </button>
              )}
            </window.Card>

            {vencidas.length > 0 && (
              <window.Card padding={18} style={{ borderColor: 'color-mix(in srgb, var(--c-neg) 30%, var(--line))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <window.Icon name="alert" size={16} style={{ color: 'var(--c-neg)' }} />
                    <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Vencidas em aberto</h2>
                  </div>
                  <window.Money value={totalVencido} size="table" style={{ color: 'var(--c-neg)', fontWeight: 700 }} />
                </div>
                <div style={{ font: 'var(--t-body-2)', color: 'var(--ink-3)', margin: '4px 0 8px' }}>
                  {vencidas.length} {vencidas.length === 1 ? 'conta' : 'contas'} — clique para ir ao dia. Se já foi paga e só faltou a baixa, use “Pagar”.
                </div>
                {vencidas.slice(0, 6).map(c => (
                  <div key={c.id} onClick={() => irPara(c.vencimento)} style={{ cursor: 'pointer' }}>
                    <LinhaConta c={c} hoje={hoje} podePagar={false} podeAbrir={false} mostrarData />
                  </div>
                ))}
                {vencidas.length > 6 && (
                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', font: '500 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>
                    <span>+{vencidas.length - 6} {vencidas.length - 6 === 1 ? 'outra' : 'outras'}</span>
                    {podeAbrir && <window.Btn variant="ghost" size="sm" onClick={() => setPage('contas')}>Ver em Contas</window.Btn>}
                  </div>
                )}
              </window.Card>
            )}
          </div>
        </div>
      </div>

      {pagando && <PagarModal conta={pagando} onClose={() => setPagando(null)} onSaved={() => { setPagando(null); tick(); }} />}
      {criando && <NovoGastoModal dia={criando} onClose={() => setCriando(null)} onSaved={() => tick()} />}
    </div>
  );
};

window.CalendarioPagar = CalendarioPagar;
})();
