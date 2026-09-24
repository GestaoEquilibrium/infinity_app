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
  const [editando, setEditando] = React.useState(null);
  const [modo, setModo] = React.useState(() => { try { return localStorage.getItem('eq-pag-modo') || 'lista'; } catch { return 'lista'; } });
  React.useEffect(() => { try { localStorage.setItem('eq-pag-modo', modo); } catch {} }, [modo]);

  const carregar = React.useCallback(async () => {
    setLista(null); setMsg('');
    try { setLista(await sincronizarPagamentosMes(comp)); }
    catch (e) { setMsg('Erro ao carregar: ' + e.message); setLista([]); }
  }, [comp]);
  React.useEffect(() => { carregar(); }, [carregar]);

  // aberto pela busca do topo: vai para o mês do pagamento e abre a edição dele
  const [abrirId, setAbrirId] = React.useState(null);
  React.useEffect(() => {
    const vem = () => {
      const a = window.__eqAbrirPagamento; if (!a) return;
      window.__eqAbrirPagamento = null;
      if (a.comp) setComp(a.comp);
      setAbrirId(a.id);
    };
    vem();
    window.addEventListener('eq-abrir-pagamento', vem);
    return () => window.removeEventListener('eq-abrir-pagamento', vem);
  }, []);
  React.useEffect(() => {
    if (!abrirId || !lista) return;
    const p = lista.find(x => x.id === abrirId);
    if (p) { setEditando(p); setAbrirId(null); }
  }, [abrirId, lista]);

  const trazerFolha = async () => {
    if ((lista || []).length && !window.confirm('Isso acrescenta quem está no ponto e ainda não está na lista deste mês (e atualiza valores ainda não pagos). Se a folha do mês já foi lançada pela planilha, pode trazer gente repetida. Continuar?')) return;
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

  // Nomes que parecem a mesma pessoa (ex.: "Cristina Beatriz de Lima" e "Cristina Beatriz Lima")
  const chaveNome = (n) => opNorm(n).split(' ').filter(w => w.length >= 3 && !['dos', 'das'].includes(w)).sort().join(' ');
  const contaNome = {};
  itens.forEach(p => { const k = chaveNome(p.nome); contaNome[k] = (contaNome[k] || 0) + 1; });
  const repetido = (p) => contaNome[chaveNome(p.nome)] > 1;

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <window.Segmented options={[{ value: 'lista', label: 'Lista' }, { value: 'planilha', label: 'Planilha' }]} value={modo} onChange={setModo} />
          {modo === 'planilha' && <span style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>Mesmas colunas da planilha de pagamentos. Clique numa célula para editar; o líquido recalcula sozinho.</span>}
        </div>

        {!lista && <Card padding={24} style={{ color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Conferindo pagamentos com o extrato…</Card>}
        {lista && modo === 'planilha' && <PlanilhaFolha comp={comp} itens={itens} setLista={setLista} onEditar={setEditando} setMsg={setMsg} recarregar={carregar} />}
        {lista && !itens.length && (
          <Card><div style={{ padding: 24 }}><EmptyState icon="users" title="Nenhum pagamento neste mês"
            hint='Profissionais entram quando o fechamento do Repasse é salvo. CLT e estagiários: clique em "Trazer folha do ponto".' /></div></Card>
        )}

        {modo === 'lista' && grupos.map(g => {
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
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 96px 140px 110px 150px', gap: 12, alignItems: 'center', padding: '10px 18px', borderTop: '1px solid var(--line-2)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: '600 13.5px var(--f-sans)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nome}
                        {repetido(p) && <span title="Existe outro lançamento com nome parecido neste mês" style={{ marginLeft: 8, font: '600 10.5px var(--f-sans)', color: 'var(--c-neg)', background: 'var(--c-neg-bg, #FBE9E7)', padding: '2px 7px', borderRadius: 999 }}>repetido?</span>}
                      </div>
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
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {!pago && <Btn variant="secondary" size="sm" icon="check" onClick={() => setRegistrando(p)}>Registrar</Btn>}
                      <window.IconBtn name="edit" size={30} title="Editar ou excluir" onClick={() => setEditando(p)} />
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}

        <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>
          Clique no valor para ajustar antes de pagar. O lápis abre a edição completa (nome, tipo, data, excluir). A situação se atualiza sozinha: quando o Pix da pessoa aparece no extrato, ela passa para "Pago".
          "Registrar" é para quando você pagou e o extrato ainda não foi importado.
        </div>
      </div>

      {editando && <EditarPagamentoModal p={editando} onClose={() => setEditando(null)} onSaved={(m) => { setEditando(null); if (m) setMsg(m); carregar(); }} />}
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

// ═══════════════ Planilha da folha (mesmas colunas da planilha de pagamentos) ═══════════════
// 5º dia útil: líquido = (bruto ÷ 30 × dias, ou bruto se dias vazio) − descontos − INSS − VT + bonificações
// Dia 20:      líquido = bruto + bonificações − desconto − desconto holding   (faltas → desconto = bruto ÷ 30 × faltas)
const opNum = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const opR2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
function opLiquidoPlanilha(p) {
  const b = Number(p.valor_bruto) || 0, bon = Number(p.bonificacoes) || 0, desc = Number(p.descontos) || 0;
  if (p.grupo === 'dia20') return opR2(b + bon - desc - (Number(p.desconto_holding) || 0));
  const base = p.dias == null || p.dias === '' ? b : b / 30 * Number(p.dias);
  return opR2(base - desc - (Number(p.inss) || 0) - (Number(p.vt) || 0) + bon);
}

const PlanilhaFolha = ({ comp, itens, setLista, onEditar, setMsg, recarregar }) => {
  const { Card, Btn, Money } = window;
  const D = window.__repasseData;
  const [salvando, setSalvando] = React.useState(null);

  const COLS = {
    '5dia': [
      { k: 'nome', t: 'Nome do colaborador', w: 230, txt: true },
      { k: 'cargo', t: 'Cargo', w: 140, txt: true },
      { k: 'regime', t: 'Regime', w: 96, txt: true },
      { k: 'dias', t: 'Dias trab.', w: 66 },
      { k: 'valor_bruto', t: 'Valor bruto', w: 100 },
      { k: 'descontos', t: 'Descontos / faltas / holding', w: 104 },
      { k: 'bonificacoes', t: 'Bonificações', w: 96 },
      { k: 'inss', t: 'INSS', w: 84 },
      { k: 'vt', t: 'V.T. (6%)', w: 84 },
      { k: 'valor_liquido', t: 'Líquido a pagar', w: 110, forte: true },
      { k: 'valor_pago', t: 'Valor pago', w: 104 },
      { k: 'holding', t: 'Holding', w: 110, txt: true },
    ],
    'dia20': [
      { k: 'nome', t: 'Nome do colaborador', w: 230, txt: true },
      { k: 'cargo', t: 'Cargo', w: 140, txt: true },
      { k: 'regime', t: 'Regime', w: 96, txt: true },
      { k: 'faltas', t: 'Faltas', w: 66 },
      { k: 'valor_bruto', t: 'Valor bruto', w: 100 },
      { k: 'bonificacoes', t: 'Bonificações', w: 96 },
      { k: 'descontos', t: 'Desconto', w: 90 },
      { k: 'desconto_holding', t: 'Desc. holding', w: 90 },
      { k: 'valor_liquido', t: 'Líquido a pagar', w: 110, forte: true },
      { k: 'valor_pago', t: 'Pago', w: 104 },
      { k: 'observacao', t: 'Observações', w: 170, txt: true },
      { k: 'holding', t: 'Holding', w: 110, txt: true },
    ],
  };
  const CALC = new Set(['dias', 'faltas', 'valor_bruto', 'descontos', 'bonificacoes', 'inss', 'vt', 'desconto_holding']);

  const gravar = async (p, campo, bruto) => {
    const col = [...COLS['5dia'], ...COLS['dia20']].find(c => c.k === campo);
    const novo = col && col.txt ? (String(bruto).trim() || null) : opNum(bruto);
    const atual = p[campo] == null ? null : (col && col.txt ? p[campo] : Number(p[campo]));
    if (novo === atual || (novo == null && atual == null)) return;
    if (campo === 'nome' && !novo) return;
    const patch = { [campo]: novo };
    const q = { ...p, ...patch };
    if (campo === 'faltas' && q.grupo === 'dia20') { patch.descontos = opR2((Number(q.valor_bruto) || 0) / 30 * (Number(novo) || 0)); q.descontos = patch.descontos; }
    if (CALC.has(campo)) { patch.valor_liquido = opLiquidoPlanilha(q); }
    if (campo === 'valor_pago') {
      if (novo != null && novo > 0) { patch.status = 'pago'; if (!p.data_pagamento) patch.data_pagamento = opHoje(); }
      else if (!p.transaction_id) { patch.status = 'pendente'; patch.data_pagamento = null; }
    }
    setSalvando(p.id);
    try {
      await D.updatePagamento(p.id, patch);
      if (patch.valor_liquido != null || campo === 'valor_liquido') {
        const v = patch.valor_liquido != null ? patch.valor_liquido : novo;
        const tx = p.transaction_id && (window.CONTAS || []).find(c => c.id === p.transaction_id);
        if (tx && !tx.pago && (tx.origem || 'sistema') === 'sistema') await window.updateContaLocal(tx.id, { previsto: v });
      }
      setLista(l => l.map(x => x.id === p.id ? { ...x, ...patch } : x));
    } catch (e) { setMsg('Não consegui salvar: ' + e.message); }
    setSalvando(null);
  };

  const adicionar = async (grupo) => {
    try {
      await D.createPagamento({ competencia: comp, grupo, nome: 'NOVA PESSOA', status: 'pendente', origem: 'manual', valor_liquido: 0, valor_bruto: 0 },
        window.ACTIVE_COMPANY_ID, opUserId());
      await recarregar();
    } catch (e) { setMsg('Não consegui adicionar: ' + e.message); }
  };

  const cel = { padding: 0, borderRight: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' };
  const inp = (txt) => ({ width: '100%', boxSizing: 'border-box', border: 0, background: 'transparent', padding: '7px 8px', outline: 'none',
    font: txt ? '500 12.5px var(--f-sans)' : '500 12.5px var(--f-mono)', textAlign: txt ? 'left' : 'right', color: 'var(--ink)' });
  const mostra = (c, v) => v == null || v === '' ? '' : (c.txt ? v : (c.k === 'dias' || c.k === 'faltas') ? String(v).replace('.', ',') : window.fmt(Number(v)));

  return ['5dia', 'dia20'].map(g => {
    const cols = COLS[g];
    const linhas = itens.filter(p => (p.grupo === 'dia20' ? 'dia20' : '5dia') === g).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    const tot = (k) => linhas.reduce((s, p) => s + (Number(p[k]) || 0), 0);
    const aPagar = tot('valor_liquido'), pago = tot('valor_pago');
    return (
      <Card key={g} padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--surface-2, #F6F8FA)', borderBottom: '1px solid var(--line)' }}>
          <span style={{ font: '700 14.5px var(--f-sans)', color: 'var(--ink)' }}>{g === 'dia20' ? 'Dia 20' : '5º dia útil'}</span>
          <span style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>{linhas.length} pessoas · vence {window.fmtDate(D.vencimentoDoGrupo(comp, g))}</span>
          <span style={{ marginLeft: 'auto', font: '500 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>A pagar</span><Money value={aPagar} size="table" style={{ fontWeight: 700 }} />
          <span style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>Pago</span><Money value={pago} size="table" style={{ fontWeight: 700 }} />
          <span style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>Diferença</span>
          <Money value={opR2(aPagar - pago)} size="table" style={{ fontWeight: 700, color: Math.abs(aPagar - pago) > 0.009 ? 'var(--c-neg)' : 'var(--ink-3)' }} />
          <Btn variant="secondary" size="sm" icon="plus" onClick={() => adicionar(g)}>Pessoa</Btn>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
            <colgroup>{cols.map(c => <col key={c.k} style={{ width: c.w }} />)}<col style={{ width: 44 }} /></colgroup>
            <thead>
              <tr>{cols.map(c => (
                <th key={c.k} style={{ padding: '8px', borderRight: '1px solid var(--line-2)', borderBottom: '1px solid var(--line)', font: '700 10.5px var(--f-sans)', textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--ink-3)', textAlign: c.txt ? 'left' : 'right', verticalAlign: 'bottom', whiteSpace: 'normal' }}>{c.t}</th>
              ))}<th style={{ borderBottom: '1px solid var(--line)' }} /></tr>
            </thead>
            <tbody>
              {linhas.map(p => {
                const pagoRow = p.status === 'pago';
                const dif = p.valor_pago != null && Math.abs((Number(p.valor_pago) || 0) - (Number(p.valor_liquido) || 0)) > 0.009;
                return (
                  <tr key={p.id} style={{ background: pagoRow ? 'var(--c-pos-bg, #F1F8F3)' : undefined, opacity: salvando === p.id ? 0.6 : 1 }}>
                    {cols.map(c => (
                      <td key={c.k} style={{ ...cel, background: c.forte ? 'var(--surface-2, #F6F8FA)' : undefined }}>
                        <input key={p.id + c.k + String(p[c.k])} defaultValue={mostra(c, p[c.k])}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.target.value = mostra(c, p[c.k]); e.target.blur(); } }}
                          onBlur={e => gravar(p, c.k, e.target.value)}
                          title={c.k === 'valor_pago' && dif ? 'Pago diferente do líquido' : undefined}
                          style={{ ...inp(c.txt), fontWeight: c.forte ? 700 : 500, color: c.k === 'valor_pago' && dif ? 'var(--c-neg)' : 'var(--ink)' }} />
                      </td>
                    ))}
                    <td style={{ ...cel, borderRight: 0, textAlign: 'center' }}>
                      <window.IconBtn name="edit" size={26} title="Editar / excluir" onClick={() => onEditar(p)} />
                    </td>
                  </tr>
                );
              })}
              {!linhas.length && <tr><td colSpan={cols.length + 1} style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', font: '400 12.5px var(--f-sans)' }}>Ninguém neste grupo. Use "+ Pessoa".</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    );
  });
};

// ── Editar / excluir um lançamento de pagamento ──
const EditarPagamentoModal = ({ p, onClose, onSaved }) => {
  const { Btn } = window;
  const D = window.__repasseData;
  const pago = p.status === 'pago';
  const tipoIni = /clt/i.test(p.regime || '') ? 'CLT' : /estag/i.test(p.regime || '') ? 'Estagiário' : (p.regime || 'PJ');
  const [f, setF] = React.useState({
    nome: p.nome || '', cargo: p.cargo || '', regime: tipoIni,
    grupo: p.grupo === 'dia20' ? 'dia20' : '5dia', valor: String(Number(p.valor_liquido) || 0).replace('.', ','),
  });
  const [desativar, setDesativar] = React.useState(false);
  const [confirmaExcluir, setConfirmaExcluir] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const contaLigada = () => p.transaction_id && (window.CONTAS || []).find(c => c.id === p.transaction_id);

  const salvar = async () => {
    const v = Number(String(f.valor).replace(/\./g, '').replace(',', '.'));
    if (!f.nome.trim()) { setErro('Informe o nome.'); return; }
    if (!isFinite(v) || v < 0) { setErro('Valor inválido.'); return; }
    setSalvando(true); setErro('');
    try {
      await D.updatePagamento(p.id, { nome: f.nome.trim(), cargo: f.cargo.trim() || null, regime: f.regime, grupo: f.grupo, valor_liquido: v });
      const tx = contaLigada();
      if (tx && !tx.pago && (tx.origem || 'sistema') === 'sistema') {
        await window.updateContaLocal(tx.id, { previsto: v, vencimento: D.vencimentoDoGrupo(p.competencia, f.grupo) });
      }
      onSaved('Lançamento de ' + f.nome.trim() + ' atualizado.');
    } catch (e) { setErro(e.message); setSalvando(false); }
  };

  const voltarPendente = async () => {
    setSalvando(true); setErro('');
    try {
      await D.updatePagamento(p.id, { status: 'pendente', data_pagamento: null, transaction_id: null });
      onSaved(p.nome + ' voltou para pendente.');
    } catch (e) { setErro(e.message); setSalvando(false); }
  };

  const excluir = async () => {
    setSalvando(true); setErro('');
    try {
      const tx = contaLigada();
      // a conta a pagar prevista (criada pelo sistema e ainda não paga) sai junto; Pix do extrato nunca é apagado
      if (tx && !tx.pago && (tx.origem || 'sistema') === 'sistema') {
        try { await window.deleteContaLocal(tx.id); } catch (e) { console.warn('remover conta prevista', e); }
      }
      await D.deletePagamento(p.id);
      if (desativar && p.colaborador_id) {
        await opSb(`/colaboradores?id=eq.${p.colaborador_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Desligado' }) });
      }
      onSaved(`Lançamento de ${p.nome} excluído${desativar && p.colaborador_id ? ' e cadastro desativado' : ''}.`);
    } catch (e) { setErro(e.message); setSalvando(false); }
  };

  const inp = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', background: 'var(--field)', font: '500 14px var(--f-sans)', color: 'var(--ink)' };
  const lab = { font: '600 12px var(--f-sans)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(15,23,32,.45)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 22, boxShadow: 'var(--shadow-lg, 0 20px 50px rgba(0,0,0,.2))' }}>
        <div style={{ font: '700 16px var(--f-sans)', color: 'var(--ink)' }}>Editar lançamento</div>
        <div style={{ font: '400 13px var(--f-sans)', color: 'var(--ink-3)', margin: '4px 0 16px' }}>
          {opMesLabel(p.competencia)}{pago ? ' · já pago' : ''}
        </div>

        {!confirmaExcluir ? (
          <>
            <div style={{ marginBottom: 12 }}><label style={lab}>Nome</label><input value={f.nome} onChange={e => set('nome', e.target.value)} style={inp} /></div>
            <div style={{ marginBottom: 12 }}><label style={lab}>Cargo</label><input value={f.cargo} onChange={e => set('cargo', e.target.value)} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label style={lab}>Tipo</label>
                <select value={f.regime} onChange={e => set('regime', e.target.value)} style={inp}>
                  {['CLT', 'Estagiário', 'PJ', 'Autônomo', 'Sócio'].concat(['CLT', 'Estagiário', 'PJ', 'Autônomo', 'Sócio'].includes(f.regime) ? [] : [f.regime]).map(r => <option key={r} value={r}>{r}</option>)}
                </select></div>
              <div><label style={lab}>Data de pagamento</label>
                <select value={f.grupo} onChange={e => set('grupo', e.target.value)} style={inp}>
                  <option value="5dia">5º dia útil</option><option value="dia20">Dia 20</option>
                </select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={lab}>Valor (R$)</label>
              <input value={f.valor} onChange={e => set('valor', e.target.value)} inputMode="decimal" disabled={pago} style={{ ...inp, opacity: pago ? 0.6 : 1 }} /></div>
            {erro && <div style={{ color: 'var(--c-neg)', font: '500 12.5px var(--f-sans)', marginBottom: 10 }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <Btn variant="secondary" icon="trash" onClick={() => setConfirmaExcluir(true)} disabled={salvando} style={{ color: 'var(--c-neg)' }}>Excluir</Btn>
              {pago && <Btn variant="secondary" onClick={voltarPendente} disabled={salvando}>Voltar p/ pendente</Btn>}
              <div style={{ flex: 1 }} />
              <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
              <Btn variant="primary" icon="check" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ font: '500 13.5px var(--f-sans)', color: 'var(--ink)', marginBottom: 12 }}>
              Excluir o lançamento de <b>{p.nome}</b> ({window.fmtBRL ? window.fmtBRL(Number(p.valor_liquido) || 0) : 'R$ ' + window.fmt(Number(p.valor_liquido) || 0)})?
              {pago && <div style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 6 }}>Ele está marcado como pago. O Pix no extrato não é apagado, só este lançamento.</div>}
            </div>
            {p.colaborador_id && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', font: '400 13px var(--f-sans)', color: 'var(--ink-2)', background: 'var(--surface-2, #F6F8FA)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={desativar} onChange={e => setDesativar(e.target.checked)} style={{ marginTop: 3 }} />
                <span>É um <b>cadastro repetido</b> — desativar este cadastro em Colaboradores, para não voltar na próxima vez que trouxer a folha do ponto.</span>
              </label>
            )}
            {erro && <div style={{ color: 'var(--c-neg)', font: '500 12.5px var(--f-sans)', marginBottom: 10 }}>{erro}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setConfirmaExcluir(false)} disabled={salvando}>Voltar</Btn>
              <Btn variant="primary" icon="trash" onClick={excluir} disabled={salvando} style={{ background: 'var(--c-neg)', borderColor: 'var(--c-neg)' }}>{salvando ? 'Excluindo…' : 'Excluir'}</Btn>
            </div>
          </>
        )}
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


// ═══════════════ Tela: Acessos (só administrador) ═══════════════
const OP_TIPOS = [
  { v: 'admin', l: 'Administrador', d: 'Tudo, inclusive criar e bloquear acessos' },
  { v: 'editor', l: 'Financeiro', d: 'Lança, paga, importa e cadastra' },
  { v: 'diretoria', l: 'Diretoria', d: 'Vê tudo, não altera nada' },
];
const opTipoLabel = (r) => ({ admin: 'Administrador', editor: 'Financeiro', diretoria: 'Diretoria', viewer: 'Visualizador (antigo)',
  pendente: 'Aguardando liberação', bloqueado: 'Bloqueado' })[r] || r;

const AcessosPage = () => {
  const { Band, Card, Btn } = window;
  const { user } = window.useAuth();
  const [lista, setLista] = React.useState(null);
  const [msg, setMsg] = React.useState('');
  const [form, setForm] = React.useState({ nome: '', email: '', senha: '', role: 'diretoria' });
  const [salvando, setSalvando] = React.useState(false);
  const [mudando, setMudando] = React.useState(null);

  const carregar = React.useCallback(async () => {
    try { setLista(await window.listarAcessos() || []); }
    catch (e) { setMsg('Erro ao carregar: ' + e.message); setLista([]); }
  }, []);
  React.useEffect(() => { carregar(); }, [carregar]);

  const gerarSenha = () => {
    const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p = ''; for (let i = 0; i < 10; i++) p += a[Math.floor(Math.random() * a.length)];
    setForm(f => ({ ...f, senha: p }));
  };

  const criar = async () => {
    const email = form.email.trim().toLowerCase();
    if (!form.nome.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setMsg('Preencha o nome e um e-mail válido.'); return; }
    if (form.senha.length < 6) { setMsg('A senha provisória precisa de pelo menos 6 caracteres.'); return; }
    setSalvando(true); setMsg('');
    try {
      const c = await window.criarContaUsuario(email, form.senha, form.nome.trim());
      await window.definirAcesso(email, form.role, form.nome.trim());
      const tipo = opTipoLabel(form.role);
      setMsg(c.jaExistia
        ? `✓ ${form.nome} já tinha conta com esse e-mail — o acesso foi liberado como ${tipo}. A senha é a que a pessoa já usa.`
        : `✓ Acesso criado para ${form.nome} (${tipo}). Envie para a pessoa: e-mail ${email} · senha provisória ${form.senha}` +
          (c.precisaConfirmar ? ' — antes do primeiro login ela precisa clicar no link de confirmação que chega no e-mail.' : '') +
          ' Peça para trocar a senha em "Meu perfil".');
      setForm({ nome: '', email: '', senha: '', role: form.role });
      await carregar();
    } catch (e) { setMsg('Erro: ' + e.message); }
    setSalvando(false);
  };

  const mudar = async (p, role) => {
    if (role === p.role) return;
    if (role === 'bloqueado' && !window.confirm(`Bloquear o acesso de ${p.name || p.email}? A pessoa não consegue mais entrar; o histórico dela é mantido.`)) return;
    setMudando(p.id); setMsg('');
    try { await window.definirAcesso(p.email, role, p.name); await carregar(); setMsg(`✓ ${p.name || p.email}: ${opTipoLabel(role)}.`); }
    catch (e) { setMsg('Erro: ' + e.message); }
    setMudando(null);
  };

  const inp = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', background: 'var(--field)', font: '500 13.5px var(--f-sans)', color: 'var(--ink)' };
  const lbl = { font: '600 12px var(--f-sans)', color: 'var(--ink-2)', display: 'block', marginBottom: 5 };
  const ativos = (lista || []).filter(p => p.role !== 'bloqueado');
  const bloqueados = (lista || []).filter(p => p.role === 'bloqueado');

  const Linha = ({ p }) => {
    const eu = p.id === user?.id;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px', gap: 12, alignItems: 'center', padding: '11px 18px', borderTop: '1px solid var(--line-2)', opacity: p.role === 'bloqueado' ? 0.6 : 1 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '600 13.5px var(--f-sans)', color: 'var(--ink)' }}>{p.name || '—'}{eu ? ' (você)' : ''}</div>
          <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</div>
        </div>
        {eu
          ? <span style={{ font: '600 12.5px var(--f-sans)', color: 'var(--ink-2)', textAlign: 'right' }}>{opTipoLabel(p.role)}</span>
          : <select value={['admin', 'editor', 'diretoria', 'bloqueado'].includes(p.role) ? p.role : ''} disabled={mudando === p.id}
              onChange={(e) => mudar(p, e.target.value)} style={{ ...inp, height: 34 }}>
              {!['admin', 'editor', 'diretoria', 'bloqueado'].includes(p.role) && <option value="">{opTipoLabel(p.role)} — escolha…</option>}
              {OP_TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              <option value="bloqueado">Bloqueado</option>
            </select>}
      </div>
    );
  };

  return (
    <div className="anim-fade">
      <Band title="Acessos" subtitle="Quem entra no sistema e o que cada pessoa pode fazer"
        metricLabel="Pessoas com acesso" metric={lista ? String(ativos.length) : '—'}
        stats={OP_TIPOS.map(t => ({ label: t.l, value: lista ? String(ativos.filter(p => p.role === t.v).length) : '—' }))} />
      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {msg && <Card padding={12} style={{ font: '500 13px var(--f-sans)', color: /^erro/i.test(msg) ? 'var(--c-neg)' : 'var(--ink)', userSelect: 'text' }}>{msg}</Card>}

        <Card padding={18}>
          <div style={{ font: '700 14.5px var(--f-sans)', color: 'var(--ink)', marginBottom: 12 }}>Criar acesso</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div><label style={lbl}>Nome</label><input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} placeholder="Michele Marques" /></div>
            <div><label style={lbl}>E-mail</label><input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} style={inp} placeholder="nome@email.com" /></div>
            <div><label style={lbl}>Senha provisória</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={form.senha} onChange={(e) => setForm(f => ({ ...f, senha: e.target.value }))} style={inp} placeholder="mín. 6 caracteres" />
                <Btn variant="secondary" size="sm" onClick={gerarSenha}>Gerar</Btn>
              </div></div>
            <div><label style={lbl}>Tipo de acesso</label>
              <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} style={inp}>
                {OP_TIPOS.map(t => <option key={t.v} value={t.v}>{t.l} — {t.d}</option>)}
              </select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn variant="primary" icon="plus" onClick={criar} disabled={salvando}>{salvando ? 'Criando…' : 'Criar acesso'}</Btn>
          </div>
        </Card>

        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', font: '700 14.5px var(--f-sans)', color: 'var(--ink)' }}>Quem tem acesso</div>
          {!lista && <div style={{ padding: '0 18px 16px', color: 'var(--ink-3)' }}>Carregando…</div>}
          {ativos.map(p => <Linha key={p.id} p={p} />)}
          {bloqueados.length > 0 && <div style={{ padding: '12px 18px 4px', font: '600 12px var(--f-sans)', color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>Bloqueados</div>}
          {bloqueados.map(p => <Linha key={p.id} p={p} />)}
        </Card>

        <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', lineHeight: 1.6 }}>
          <b>Administrador</b>: tudo, inclusive esta tela. <b>Financeiro</b>: opera o dia a dia (abre na visão operacional). <b>Diretoria</b>: vê todas as telas e números, mas o sistema não deixa alterar nada.
          Bloquear corta o acesso na hora e mantém o histórico de quem lançou o quê.
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HojePage, PagamentosEquipePage, AcessosPage, enviarFolhaParaPagamentos, sincronizarPagamentosMes });
