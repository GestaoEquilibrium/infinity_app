// operacional.jsx — Visão operacional (Infinity · Eq Finance)
// ─────────────────────────────────────────────────────────────────────────────
// • HojePage: o que está atrasado, o que vence na semana, caixa de hoje, equipe
//   paga no mês e o movimento da semana. Tela de entrada da visão operacional.
// • PagamentosEquipePage: profissionais (dia 20), CLT e estagiários (5º dia útil).
//   Fonte = tabela `pagamentos` (fechamento do Repasse + folha do ponto).
// • enviarFolhaParaPagamentos: folha do ponto → pagamentos (reenviar atualiza
//   quem está pendente e NUNCA mexe em quem já foi pago).
// • sincronizarPagamentosMes: casa cada pagamento com o Pix do extrato (nome +
//   valor, aceita Pix dividido); sem Pix e mês ainda aberto → cria a conta a pagar.
//   Quando o Pix cai depois, a baixa automática do banco marca como pago.
// ─────────────────────────────────────────────────────────────────────────────

const OP_CO = ['7663eaab-3fa3-4067-91f6-71f8c77f8b55', '17749e39-3e73-41ab-b731-9463d760887b']; // Med Center, Talentos
const opSb = (path, opts) => window.__sbRest(path, opts);
const opFiltroEmpresa = () => {
  const a = window.ACTIVE_COMPANY_ID;
  return (!a || a === 'GRUPO') ? `company_id=in.(${OP_CO.join(',')})` : `company_id=eq.${a}`;
};
const opIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const opHoje = () => opIso(new Date());
const opAddDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return opIso(new Date(y, m - 1, d + n)); };
const opShiftComp = (comp, delta) => { const [y, m] = comp.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const opNorm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const opUserId = () => { try { return window.getSession?.()?.user?.id || null; } catch { return null; } };
const opValor = (c) => Number(c.pago ? (c.realizado || c.previsto) : c.previsto) || 0;
const opInterna = (c) => !!(window.ehTransferenciaInterna && window.ehTransferenciaInterna(c));
const opMesLabel = (comp) => { const [y, m] = comp.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); };
const opGrupoTab = (p) => /clt/i.test(p.regime || '') ? 'clt' : /estag/i.test(p.regime || '') ? 'est' : 'prof';

// categoria da conta a pagar gerada por um pagamento — só usa categorias que existem no cadastro
function opCategoriaPagamento(p) {
  const nomes = ((window.APP_CATEGORIES && window.APP_CATEGORIES.saida) || []).map(c => c.name);
  const escolhe = (lista) => lista.find(n => nomes.includes(n)) || lista[lista.length - 1];
  const ehFolha = p.origem === 'folha' || /clt|estag/i.test(p.regime || '');
  return ehFolha ? escolhe(['Salários CLT', 'Folha/RH']) : escolhe(['Profissionais / Prestadores', 'Repasses']);
}

// ── Folha do ponto → pagamentos do mês de pagamento ──
async function enviarFolhaParaPagamentos(pagComp, { pessoas } = {}) {
  const D = window.__repasseData;
  const folhaComp = opShiftComp(pagComp, -1);                 // ponto de agosto → paga no 5º dia útil de setembro
  let lista = pessoas;
  if (!lista) lista = (await window.calcularFolhaMes(folhaComp)).pessoas;

  // fixos que não são CLT/estágio (ex.: PJ com valor mensal) marcados como folha recorrente
  let fixos = [];
  try {
    const cs = await opSb(`/colaboradores?company_id=in.(${OP_CO.join(',')})&status=eq.Ativo&folha_fixa=is.true&select=id,nome,cargo,regime,salario,pagador,grupo_folha,company_id&limit=1000`);
    fixos = (cs || []).filter(c => !/clt|estag/i.test(c.regime || '')).map(c => ({
      id: c.id, nome: c.nome, cargo: c.cargo, regime: c.regime, company_id: c.company_id, pagador: c.pagador,
      liquido: Number(c.salario) || 0, grupo: c.grupo_folha === 'dia20' ? 'dia20' : '5dia', fixo: true,
    }));
  } catch (e) { console.warn('fixos', e); }

  const existentes = await opSb(`/pagamentos?company_id=in.(${OP_CO.join(',')})&competencia=eq.${pagComp}&select=*&limit=1000`) || [];
  let criados = 0, atualizados = 0, jaPagos = 0;
  const todos = [...(lista || []).map(p => ({ ...p, grupo: '5dia' })), ...fixos];
  for (const p of todos) {
    const cid = p.empresa ? (p.empresa === 'talentos' ? OP_CO[1] : OP_CO[0]) : (p.company_id || OP_CO[0]);
    const regime = p.regime === 'EST' ? 'Estagiário' : p.regime;
    const obs = p.fixo ? 'Valor fixo do cadastro' : `Folha ${folhaComp.split('-').reverse().join('/')} (ponto Cortex)`;
    const ex = existentes.find(e => e.colaborador_id === p.id && e.grupo === p.grupo);
    if (ex) {
      if (ex.status === 'pago') { jaPagos++; continue; }
      if (Math.abs((Number(ex.valor_liquido) || 0) - p.liquido) > 0.009 || ex.origem !== 'folha') {
        await D.updatePagamento(ex.id, { valor_liquido: p.liquido, origem: 'folha', regime, observacao: obs });
        // conta a pagar já criada e ainda pendente acompanha o novo valor
        if (ex.transaction_id) {
          try { await opSb(`/transactions?id=eq.${ex.transaction_id}&status=eq.pendente`, { method: 'PATCH', body: JSON.stringify({ value: p.liquido }) }); } catch (e) { /* segue */ }
        }
        atualizados++;
      }
      continue;
    }
    await D.createPagamento({
      competencia: pagComp, grupo: p.grupo, colaborador_id: p.id, nome: p.nome, cargo: p.cargo || null, regime,
      valor_liquido: p.liquido, conta: p.pagador || null, status: 'pendente', origem: 'folha', observacao: obs,
    }, cid, opUserId());
    criados++;
  }
  return { criados, atualizados, jaPagos };
}

// ── Acha no extrato o Pix de um pagamento (nome + valor; aceita Pix dividido) ──
function opAcharNoBanco(p, venc, contas, usados) {
  const stop = new Set(['dos', 'das', 'de', 'da', 'do', 'e']);
  const tokens = opNorm(p.nome).split(' ').filter(w => w.length >= 3 && !stop.has(w));
  if (!tokens.length) return null;
  const casaNome = (desc) => {
    const d = ' ' + opNorm(desc) + ' ';
    if (!d.includes(' ' + tokens[0] + ' ')) return false;
    return tokens.length < 2 || tokens.slice(1).some(t => d.includes(' ' + t + ' '));
  };
  const ini = opAddDias(venc, -12), fim = opAddDias(venc, 20);
  const cands = contas.filter(c => c.tipo === 'pagar' && c.origem && c.origem !== 'sistema' && !usados.has(c.id)
    && c.vencimento >= ini && c.vencimento <= fim && casaNome(c.description))
    .sort((a, b) => opValor(b) - opValor(a));
  if (!cands.length) return null;
  const v = Number(p.valor_liquido) || 0;
  // Folha: o cadastro costuma ter o salário bruto e o Pix sai com o líquido (INSS, faltas),
  // então o nome é o que identifica — aceita diferença maior. Repasse: o valor tem que bater.
  const ehFolha = p.origem === 'folha' || /clt|estag/i.test(p.regime || '');
  const tol = Math.max(1, v * (ehFolha ? 0.30 : 0.03));
  if (v <= 0) return [cands[0]];
  const unico = cands.find(c => Math.abs(opValor(c) - v) <= tol);
  if (unico) return [unico];
  const soma = cands.reduce((s, c) => s + opValor(c), 0);
  if (Math.abs(soma - v) <= tol) return cands;                  // ex.: Pix dividido em dois
  return null;
}

async function sincronizarPagamentosMes(pagComp) {
  const D = window.__repasseData;
  const lista = await opSb(`/pagamentos?${opFiltroEmpresa()}&competencia=eq.${pagComp}&select=*&order=grupo.asc,nome.asc&limit=1000`) || [];
  const contas = window.CONTAS || [];
  const porId = new Map(contas.map(c => [c.id, c]));
  const usados = new Set(lista.map(p => p.transaction_id).filter(Boolean));
  const mesAtual = opHoje().slice(0, 7);
  let mudou = 0;
  for (const p of lista) {
    const venc = D.vencimentoDoGrupo(pagComp, p.grupo);
    p._venc = venc;
    if (p.transaction_id) {
      const tx = porId.get(p.transaction_id);
      if (tx && tx.pago && p.status !== 'pago') {
        const dp = tx.pagoEm || tx.vencimento;
        await D.updatePagamento(p.id, { status: 'pago', data_pagamento: dp });
        Object.assign(p, { status: 'pago', data_pagamento: dp }); mudou++;
        continue;
      }
      // a conta a pagar prevista ainda está aberta, mas o Pix já está no extrato → fica só o Pix
      if (tx && !tx.pago && (tx.origem || 'sistema') === 'sistema' && p.status !== 'pago') {
        const achou = opAcharNoBanco(p, venc, contas, usados);
        if (achou) {
          achou.forEach(c => usados.add(c.id));
          try { await window.deleteContaLocal(tx.id); } catch (e) { console.warn('remover conta prevista', e); }
          const principal = achou[0];
          await D.updatePagamento(p.id, { status: 'pago', transaction_id: principal.id, data_pagamento: principal.vencimento });
          Object.assign(p, { status: 'pago', transaction_id: principal.id, data_pagamento: principal.vencimento });
          mudou++;
        }
      }
      continue;
    }
    if (p.status === 'pago') continue;
    const achados = opAcharNoBanco(p, venc, contas, usados);
    if (achados) {
      const principal = achados[0];
      achados.forEach(c => usados.add(c.id));
      await D.updatePagamento(p.id, { status: 'pago', transaction_id: principal.id, data_pagamento: principal.vencimento });
      Object.assign(p, { status: 'pago', transaction_id: principal.id, data_pagamento: principal.vencimento });
      mudou++;
      continue;
    }
    if (pagComp >= mesAtual && venc >= opHoje()) {               // só o que ainda vai vencer vira conta a pagar
      try {
        const res = await window.createConta({
          tipo: 'pagar', category: opCategoriaPagamento(p),
          description: `${p.nome}${p.cargo ? ' - ' + p.cargo : ''}`,
          vencimento: venc, previsto: Number(p.valor_liquido) || 0, realizado: 0, pago: false,
        }, p.company_id, opUserId());
        const row = Array.isArray(res) ? res[0] : res;
        if (row && row.id) { await D.updatePagamento(p.id, { transaction_id: row.id }); p.transaction_id = row.id; mudou++; }
      } catch (e) { console.warn('conta do pagamento', e); }
    }
  }
  if (mudou && window.ACTIVE_COMPANY_ID && window.hydrateFromSupabase) {
    try { await window.hydrateFromSupabase(window.ACTIVE_COMPANY_ID); } catch (e) { /* segue */ }
  }
  return lista;
}

// ═══════════════ Tela: Pagamentos da equipe ═══════════════
// Uma lista só, separada pela data de pagamento (5º dia útil e dia 20).
// O valor é editável direto na linha enquanto o pagamento está pendente.
const PagamentosEquipePage = () => {
  const { Band, Card, Btn, Money, MonthNav, EmptyState } = window;
  const hoje = opHoje();
  const [comp, setComp] = React.useState(hoje.slice(0, 7));
  const [lista, setLista] = React.useState(null);
  const [msg, setMsg] = React.useState('');
  const [trazendo, setTrazendo] = React.useState(false);
  const [registrando, setRegistrando] = React.useState(null);
  const [salvandoId, setSalvandoId] = React.useState(null);

  const carregar = React.useCallback(async () => {
    setLista(null); setMsg('');
    try { setLista(await sincronizarPagamentosMes(comp)); }
    catch (e) { setMsg('Erro ao carregar: ' + e.message); setLista([]); }
  }, [comp]);
  React.useEffect(() => { carregar(); }, [carregar]);

  const trazerFolha = async () => {
    setTrazendo(true); setMsg('');
    try {
      const r = await enviarFolhaParaPagamentos(comp);
      setMsg(`Folha do ponto: ${r.criados} novo(s), ${r.atualizados} atualizado(s), ${r.jaPagos} já pago(s) (não mexidos).`);
      await carregar();
    } catch (e) { setMsg('Erro ao trazer a folha: ' + e.message); }
    setTrazendo(false);
  };

  // grava o valor novo (e acompanha a conta a pagar prevista, se ainda estiver aberta)
  const salvarValor = async (p, texto) => {
    const v = Number(String(texto).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    if (!isFinite(v) || v < 0 || Math.abs(v - (Number(p.valor_liquido) || 0)) < 0.005) return;
    setSalvandoId(p.id);
    try {
      await window.__repasseData.updatePagamento(p.id, { valor_liquido: v });
      const tx = p.transaction_id && (window.CONTAS || []).find(c => c.id === p.transaction_id);
      if (tx && !tx.pago && (tx.origem || 'sistema') === 'sistema') {
        await window.updateContaLocal(tx.id, { previsto: v });
      }
      setLista(l => l.map(x => x.id === p.id ? { ...x, valor_liquido: v } : x));
    } catch (e) { setMsg('Não consegui salvar o valor: ' + e.message); }
    setSalvandoId(null);
  };

  const D = window.__repasseData;
  const itens = (lista || []).map(p => ({ ...p, _venc: p._venc || D.vencimentoDoGrupo(comp, p.grupo) }));
  const pend = itens.filter(p => p.status !== 'pago');
  const faltaPagar = pend.reduce((s, p) => s + (Number(p.valor_liquido) || 0), 0);
  const nPagos = itens.length - pend.length;
  const atrasados = pend.filter(p => p._venc < hoje).length;

  const ordena = (a, b) => (a.status === 'pago') - (b.status === 'pago') || String(a.nome).localeCompare(String(b.nome));
  const grupos = [
    { k: '5dia', titulo: '5º dia útil', itens: itens.filter(p => p.grupo !== 'dia20').sort(ordena) },
    { k: 'dia20', titulo: 'Dia 20', itens: itens.filter(p => p.grupo === 'dia20').sort(ordena) },
  ].filter(g => g.itens.length);

  const tipoDe = (p) => /clt/i.test(p.regime || '') ? 'CLT' : /estag/i.test(p.regime || '') ? 'Estagiário' : 'Profissional';

  const Situacao = ({ p }) => {
    const base = { font: '600 11.5px var(--f-sans)', padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' };
    if (p.status === 'pago') return <span style={{ ...base, background: 'var(--c-pos-bg, #E4F3E9)', color: 'var(--c-pos)' }}>Pago {p.data_pagamento ? window.fmtDate(p.data_pagamento).slice(0, 5) : ''}</span>;
    if (p._venc < hoje) return <span style={{ ...base, background: 'var(--c-neg-bg, #FBE9E7)', color: 'var(--c-neg)' }}>Atrasado</span>;
    return <span style={{ ...base, background: 'var(--surface-2, #EEF1F4)', color: 'var(--ink-2)' }}>Pendente</span>;
  };

  const inpValor = { width: '100%', boxSizing: 'border-box', textAlign: 'right', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)',
    background: 'var(--field)', padding: '6px 10px', font: '600 13px var(--f-mono)', color: 'var(--ink)', outline: 'none' };

  return (
    <div className="anim-fade">
      <Band
        title="Pagamentos da equipe"
        subtitle="Profissionais, CLT e estagiários · separados pela data de pagamento"
        right={
          <>
            <MonthNav label={opMesLabel(comp)} onPrev={() => setComp(c => opShiftComp(c, -1))} onNext={() => setComp(c => opShiftComp(c, 1))} />
            <Btn variant="primary" icon="users" onBand onClick={trazerFolha} disabled={trazendo}>{trazendo ? 'Trazendo…' : 'Trazer folha do ponto'}</Btn>
          </>
        }
        metricLabel="Falta pagar à equipe"
        metric={lista ? faltaPagar : '—'}
        stats={[
          { label: 'Pagos', value: lista ? `${nPagos} de ${itens.length}` : '—' },
          { label: 'Atrasados', value: lista ? String(atrasados) : '—', color: atrasados ? 'var(--on-accent-neg)' : undefined },
          { label: 'Total do mês', value: lista ? itens.reduce((s, p) => s + (Number(p.valor_liquido) || 0), 0) : '—' },
        ]}
      />
      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {msg && <Card padding={12} style={{ font: '500 13px var(--f-sans)', color: /erro|não consegui/i.test(msg) ? 'var(--c-neg)' : 'var(--ink)' }}>{msg}</Card>}

        {!lista && <Card padding={24} style={{ color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Conferindo pagamentos com o extrato…</Card>}
        {lista && !itens.length && (
          <Card><div style={{ padding: 24 }}><EmptyState icon="users" title="Nenhum pagamento neste mês"
            hint='Profissionais entram quando o fechamento do Repasse é salvo. CLT e estagiários: clique em "Trazer folha do ponto".' /></div></Card>
        )}

        {grupos.map(g => {
          const venc = g.itens[0]._venc;
          const pendG = g.itens.filter(p => p.status !== 'pago');
          return (
            <Card key={g.k} padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '13px 18px', background: 'var(--surface-2, #F6F8FA)', borderBottom: '1px solid var(--line)' }}>
                <span style={{ font: '700 14.5px var(--f-sans)', color: 'var(--ink)' }}>{g.titulo}</span>
                <span style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>vence {window.fmtDate(venc)} · {g.itens.length - pendG.length} de {g.itens.length} pagos</span>
                <span style={{ marginLeft: 'auto', font: '500 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>falta</span>
                <Money value={pendG.reduce((s, p) => s + (Number(p.valor_liquido) || 0), 0)} size="table" style={{ fontWeight: 700, color: pendG.length ? 'var(--ink)' : 'var(--ink-3)' }} />
              </div>
              {g.itens.map(p => {
                const pago = p.status === 'pago';
                return (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 96px 140px 110px 110px', gap: 12, alignItems: 'center', padding: '10px 18px', borderTop: '1px solid var(--line-2)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: '600 13.5px var(--f-sans)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                      <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cargo || '—'}</div>
                    </div>
                    <span style={{ font: '500 11.5px var(--f-sans)', color: 'var(--ink-2)', background: 'var(--surface-2, #EEF1F4)', padding: '3px 9px', borderRadius: 999, justifySelf: 'start' }}>{tipoDe(p)}</span>
                    {pago
                      ? <Money value={Number(p.valor_liquido) || 0} size="table" style={{ fontWeight: 700, color: 'var(--ink-2)', textAlign: 'right' }} />
                      : <input key={p.id + '|' + p.valor_liquido} defaultValue={window.fmt(Number(p.valor_liquido) || 0)} title="Clique para ajustar o valor"
                          disabled={salvandoId === p.id} style={inpValor}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          onBlur={(e) => salvarValor(p, e.target.value)} />}
                    <div style={{ textAlign: 'center' }}><Situacao p={p} /></div>
                    <div style={{ textAlign: 'right' }}>
                      {!pago && <Btn variant="secondary" size="sm" icon="check" onClick={() => setRegistrando(p)}>Registrar</Btn>}
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}

        <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>
          Clique no valor para ajustar antes de pagar. A situação se atualiza sozinha: quando o Pix da pessoa aparece no extrato, ela passa para "Pago".
          "Registrar" é para quando você pagou e o extrato ainda não foi importado.
        </div>
      </div>

      {registrando && <RegistrarPagamentoModal p={registrando} onClose={() => setRegistrando(null)} onSaved={() => { setRegistrando(null); carregar(); }} />}
    </div>
  );
};

const RegistrarPagamentoModal = ({ p, onClose, onSaved }) => {
  const { Btn } = window;
  const [valor, setValor] = React.useState(String(Number(p.valor_liquido) || 0));
  const [data, setData] = React.useState(opHoje());
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const salvar = async () => {
    const v = Number(String(valor).replace(',', '.')) || 0;
    if (!v) { setErro('Informe o valor pago.'); return; }
    setSalvando(true); setErro('');
    try {
      const D = window.__repasseData;
      let txId = p.transaction_id;
      const tx = txId && (window.CONTAS || []).find(c => c.id === txId);
      if (tx) {
        await window.updateContaLocal(tx.id, { ...tx, pago: true, realizado: v, pagoEm: data });
      } else {
        const res = await window.createConta({
          tipo: 'pagar', category: opCategoriaPagamento(p), description: `${p.nome}${p.cargo ? ' - ' + p.cargo : ''}`,
          vencimento: data, previsto: v, realizado: v, pago: true, pagoEm: data,
        }, p.company_id, opUserId());
        const row = Array.isArray(res) ? res[0] : res;
        txId = row && row.id;
      }
      await D.updatePagamento(p.id, { status: 'pago', data_pagamento: data, ...(txId ? { transaction_id: txId } : {}) });
      onSaved();
    } catch (e) { setErro(e.message); setSalvando(false); }
  };
  const inp = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', background: 'var(--field)', font: '500 14px var(--f-sans)', color: 'var(--ink)' };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(15,23,32,.45)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 22, boxShadow: 'var(--shadow-lg, 0 20px 50px rgba(0,0,0,.2))' }}>
        <div style={{ font: '700 16px var(--f-sans)', color: 'var(--ink)' }}>Registrar pagamento</div>
        <div style={{ font: '400 13px var(--f-sans)', color: 'var(--ink-3)', margin: '4px 0 16px' }}>{p.nome}{p.cargo ? ' · ' + p.cargo : ''}</div>
        <label style={{ font: '600 12px var(--f-sans)', color: 'var(--ink-2)' }}>Valor pago (R$)</label>
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" style={{ ...inp, margin: '6px 0 12px' }} />
        <label style={{ font: '600 12px var(--f-sans)', color: 'var(--ink-2)' }}>Data do pagamento</label>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ ...inp, margin: '6px 0 12px' }} />
        {erro && <div style={{ color: 'var(--c-neg)', font: '500 12.5px var(--f-sans)', marginBottom: 10 }}>{erro}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" icon="check" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Confirmar'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ═══════════════ Tela: Hoje ═══════════════
const HojePage = ({ setPage }) => {
  const { Band, Card, Btn, Money, Icon } = window;
  const { profile } = window.useAuth();
  const [, tick] = React.useReducer(x => x + 1, 0);
  const [caixaHoje, setCaixaHoje] = React.useState(null);
  const [equipe, setEquipe] = React.useState(null);
  React.useEffect(() => {
    const h = () => tick();
    window.addEventListener('sb-data-hydrated', h);
    return () => window.removeEventListener('sb-data-hydrated', h);
  }, []);

  const hoje = opHoje();
  const em7 = opAddDias(hoje, 7);
  const semanaIni = opAddDias(hoje, -6);

  React.useEffect(() => {
    (async () => {
      try {
        const a = window.ACTIVE_COMPANY_ID;
        const ids = (!a || a === 'GRUPO') ? OP_CO : [a];
        let soma = 0;
        for (const id of ids) {
          const rows = await window.__repasseData.fetchCaixa(id, hoje, hoje);
          (rows || []).forEach(r => { soma += Number(r.valor) || 0; });
        }
        setCaixaHoje(soma);
      } catch (e) { setCaixaHoje(null); }
      try {
        const pg = await opSb(`/pagamentos?${opFiltroEmpresa()}&competencia=eq.${hoje.slice(0, 7)}&select=status&limit=1000`) || [];
        setEquipe({ pagos: pg.filter(p => p.status === 'pago').length, total: pg.length });
      } catch (e) { setEquipe(null); }
    })();
  }, [hoje]);

  const contas = (window.CONTAS || []).filter(c => !opInterna(c));
  const aPagar = contas.filter(c => c.tipo === 'pagar' && !c.pago);
  const atrasadas = aPagar.filter(c => (c.vencimento || '') < hoje).sort((a, b) => a.vencimento < b.vencimento ? -1 : 1);
  const semana = aPagar.filter(c => c.vencimento >= hoje && c.vencimento <= em7).sort((a, b) => a.vencimento < b.vencimento ? -1 : 1);
  const soma = (arr) => arr.reduce((s, c) => s + opValor(c), 0);
  const mov = contas.filter(c => c.pago && c.vencimento >= semanaIni && c.vencimento <= hoje);
  const entrou = soma(mov.filter(c => c.tipo === 'receber'));
  const saiu = soma(mov.filter(c => c.tipo === 'pagar'));
  const semCat = contas.filter(c => /a classificar/i.test(c.category || '') && c.vencimento >= opAddDias(hoje, -60)).length;

  const hora = new Date().getHours();
  const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = String(profile?.name || '').split(' ')[0];
  const dataLonga = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  const Painel = ({ titulo, children, acao, onAcao }) => (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid var(--line-2)' }}>
        <span style={{ font: '600 14px var(--f-sans)', color: 'var(--ink)' }}>{titulo}</span>
        {acao && <button onClick={onAcao} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', font: '600 12.5px var(--f-sans)' }}>{acao}</button>}
      </div>
      {children}
    </Card>
  );
  const Linha = ({ c, vermelho }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderTop: '1px solid var(--line-2)' }}>
      <span className="mono" style={{ font: '400 12px var(--f-mono)', color: vermelho ? 'var(--c-neg)' : 'var(--ink-3)', width: 44 }}>{window.fmtDate(c.vencimento).slice(0, 5)}</span>
      <span style={{ flex: 1, minWidth: 0, font: '500 13px var(--f-sans)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</span>
      <Money value={opValor(c)} size="table" style={{ fontWeight: 600, color: vermelho ? 'var(--c-neg)' : 'var(--ink)' }} />
    </div>
  );
  const LinhaResumo = ({ rotulo, valor, cor, onClick }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderTop: '1px solid var(--line-2)', cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ font: '500 13px var(--f-sans)', color: cor || 'var(--ink-2)' }}>{rotulo}</span>
      <span style={{ marginLeft: 'auto', font: '700 13.5px var(--f-mono)', color: cor || 'var(--ink)' }}>{valor}</span>
    </div>
  );
  const Atalho = ({ icon, titulo, dica, k }) => (
    <button onClick={() => setPage(k)} style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', cursor: 'pointer' }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name={icon} size={18} /></span>
      <span><span style={{ display: 'block', font: '600 13.5px var(--f-sans)', color: 'var(--ink)' }}>{titulo}</span>
        <span style={{ display: 'block', font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>{dica}</span></span>
    </button>
  );

  return (
    <div className="anim-fade">
      <Band
        title={`${saud}${nome ? ', ' + nome : ''}`}
        subtitle={dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)}
        metricLabel={`Para pagar até ${window.fmtDate(em7).slice(0, 5)}`}
        metric={soma(atrasadas) + soma(semana)}
        stats={[
          { label: 'Atrasadas', value: `${atrasadas.length} · ${window.fmt(soma(atrasadas))}`, color: atrasadas.length ? 'var(--on-accent-neg)' : undefined },
          { label: 'Caixa de hoje', value: caixaHoje == null ? '—' : caixaHoje },
          { label: 'Equipe paga no mês', value: equipe ? `${equipe.pagos} de ${equipe.total}` : '—' },
        ]}
      />
      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <Painel titulo="Pagar esta semana" acao="Ver tudo" onAcao={() => setPage('contas')}>
            {!atrasadas.length && !semana.length && <div style={{ padding: '16px', color: 'var(--ink-3)', font: '400 13px var(--f-sans)' }}>Nada vencendo nos próximos 7 dias.</div>}
            {atrasadas.slice(0, 5).map(c => <Linha key={c.id} c={c} vermelho />)}
            {semana.slice(0, Math.max(0, 8 - Math.min(atrasadas.length, 5))).map(c => <Linha key={c.id} c={c} />)}
          </Painel>
          <Painel titulo="Movimento dos últimos 7 dias" acao="Abrir contas" onAcao={() => setPage('contas')}>
            <LinhaResumo rotulo="Entrou" valor={window.fmt(entrou)} cor="var(--c-pos)" />
            <LinhaResumo rotulo="Saiu" valor={window.fmt(saiu)} cor="var(--c-neg)" />
            <LinhaResumo rotulo={semCat ? `${semCat} lançamento(s) sem categoria` : 'Tudo com categoria'} valor={semCat ? 'arrumar →' : '✓'}
              cor={semCat ? 'var(--c-warn, #B5731A)' : 'var(--ink-3)'} onClick={semCat ? () => setPage('contas') : undefined} />
          </Painel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Atalho k="caixa" icon="wallet" titulo="Lançar no caixa" dica="Particular em dinheiro do dia" />
          <Atalho k="equipe_pag" icon="users" titulo="Pagamentos da equipe" dica="Quem já recebeu no mês" />
          <Atalho k="rh" icon="user" titulo="Cadastrar colaborador" dica="Alguém novo na equipe" />
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HojePage, PagamentosEquipePage, enviarFolhaParaPagamentos, sincronizarPagamentosMes });
