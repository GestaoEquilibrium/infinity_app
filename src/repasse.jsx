// ═══════════════════════════════════════════════════════════════════════════
// Infinity — Módulo Caixa (particular) + Repasse
//
//   CaixaPage    → recepção lança o particular do dia. NÃO mostra repasse.
//   RepassePage  → admin/editor: motor de repasse (importa relatório, calcula,
//                  gera fechamento). Só admin/editor acessa (RLS + canAccess).
//
// Segue o padrão do app: React via Babel, window.assign, glass cards, tokens.
// Depende de: caixa_lancamentos, repasse_regras, repasse_tarifas,
//             repasse_fechamentos (migration 009) + colaboradores (RH).
// ═══════════════════════════════════════════════════════════════════════════

const { useState: useStateR, useEffect: useEffectR, useMemo: useMemoR } = React;

// ─── data layer (REST, mesmo estilo do supabase.jsx) ───
const sbR = (path, opts) => window.__sbRest ? window.__sbRest(path, opts) : (async () => {
  // fallback: usa fetch direto reaproveitando config global
  const s = window.getSession?.();
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${s?.access_token || window.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(opts?.prefer ? { Prefer: opts.prefer } : {}),
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
})();

// ---- Caixa ----
async function fetchCaixa(companyId, dataIni, dataFim) {
  let q = `/caixa_lancamentos?company_id=eq.${companyId}&select=*&order=data.desc,created_at.desc&limit=2000`;
  if (dataIni) q += `&data=gte.${dataIni}`;
  if (dataFim) q += `&data=lte.${dataFim}`;
  return sbR(q);
}
async function createCaixa(l, companyId, userId) {
  return sbR('/caixa_lancamentos', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({ ...l, company_id: companyId, created_by: userId }),
  });
}
async function deleteCaixa(id) {
  return sbR(`/caixa_lancamentos?id=eq.${id}`, { method: 'DELETE' });
}

// ---- Regras / Tarifas / Fechamentos ----
async function fetchRegras(companyId) {
  return sbR(`/repasse_regras?company_id=eq.${companyId}&select=*,colaboradores(nome,cargo,regime)&limit=500`);
}
async function upsertRegra(r, companyId) {
  return sbR('/repasse_regras', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify({ ...r, company_id: companyId }),
  });
}
async function fetchTarifas(companyId) {
  return sbR(`/repasse_tarifas?company_id=eq.${companyId}&select=*&order=convenio.asc&limit=500`);
}
async function updateTarifa(id, patch) {
  return sbR(`/repasse_tarifas?id=eq.${id}`, {
    method: 'PATCH', prefer: 'return=representation',
    body: JSON.stringify(patch),
  });
}
async function createTarifa(t, companyId) {
  return sbR('/repasse_tarifas', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({ ...t, company_id: companyId }),
  });
}
async function deleteTarifa(id) {
  return sbR(`/repasse_tarifas?id=eq.${id}`, { method: 'DELETE' });
}
async function fetchFechamentos(companyId, competencia) {
  let q = `/repasse_fechamentos?company_id=eq.${companyId}&select=*&order=liquido.desc&limit=500`;
  if (competencia) q += `&competencia=eq.${competencia}`;
  return sbR(q);
}
async function createFechamento(f, companyId, userId) {
  return sbR('/repasse_fechamentos', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({ ...f, company_id: companyId, created_by: userId }),
  });
}

// ---- Pagamentos (folha 5º dia + repasse Dia 20) ----
async function fetchPagamentos(companyId, competencia) {
  let q = `/pagamentos?company_id=eq.${companyId}&select=*&order=grupo.asc,nome.asc&limit=1000`;
  if (competencia) q += `&competencia=eq.${competencia}`;
  return sbR(q);
}
async function createPagamento(p, companyId, userId) {
  return sbR('/pagamentos', {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({ ...p, company_id: companyId, created_by: userId }),
  });
}
async function updatePagamento(id, patch) {
  return sbR(`/pagamentos?id=eq.${id}`, {
    method: 'PATCH', prefer: 'return=representation',
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}
async function deletePagamento(id) {
  return sbR(`/pagamentos?id=eq.${id}`, { method: 'DELETE' });
}
// remove os lançamentos vindos do repasse de uma competência (antes de regerar)
async function deletePagamentosRepasse(companyId, competencia) {
  return sbR(`/pagamentos?company_id=eq.${companyId}&competencia=eq.${competencia}&origem=eq.repasse`, { method: 'DELETE' });
}
// remove os lançamentos de folha de uma competência (antes de regerar a folha)
async function deletePagamentosFolha(companyId, competencia) {
  return sbR(`/pagamentos?company_id=eq.${companyId}&competencia=eq.${competencia}&origem=eq.folha`, { method: 'DELETE' });
}
// verifica se já existe pagamento de um colaborador num mês/grupo (para o auto-add não duplicar)
async function pagamentoExiste(companyId, competencia, grupo, colaboradorId) {
  const r = await sbR(`/pagamentos?company_id=eq.${companyId}&competencia=eq.${competencia}&grupo=eq.${grupo}&colaborador_id=eq.${colaboradorId}&select=id&limit=1`);
  return Array.isArray(r) && r.length > 0;
}

// ---- Ponte Pagamentos -> Contas a Pagar ----
// Feriados nacionais + Uberlândia (para achar o 5º dia útil)
const FERIADOS_RP = new Set([
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25',
  '2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2026-08-31',
]);
function ehFeriadoRP(d) {
  const mmdd = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const full = d.getFullYear() + '-' + mmdd;
  return FERIADOS_RP.has(mmdd) || FERIADOS_RP.has(full);
}
// 5º dia útil do mês da competência ('YYYY-MM')
function quintoDiaUtil(competencia) {
  const [a, m] = competencia.split('-').map(Number);
  let d = new Date(a, m - 1, 1), uteis = 0;
  while (true) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !ehFeriadoRP(d)) uteis++;
    if (uteis === 5) break;
    d = new Date(a, m - 1, d.getDate() + 1);
  }
  return `${a}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// vencimento conforme o grupo: 5dia -> 5º dia útil; dia20 -> dia 20
function vencimentoDoGrupo(competencia, grupo) {
  if (grupo === 'dia20') return `${competencia}-20`;
  return quintoDiaUtil(competencia);
}
// categoria da conta a partir da origem/grupo do pagamento
function categoriaDoPagamento(p) {
  if (p.origem === 'repasse') return 'Repasses';
  if (p.origem === 'folha') return 'Folha/RH';
  return p.grupo === 'dia20' ? 'Repasses' : 'Folha/RH';
}
// cria a conta a pagar e amarra no pagamento
async function enviarPagamentoParaContas(p, companyId, userId) {
  const conta = {
    tipo: 'pagar',
    category: categoriaDoPagamento(p),
    description: `${p.nome}${p.cargo ? ' - ' + p.cargo : ''}`,
    vencimento: vencimentoDoGrupo(p.competencia, p.grupo),
    previsto: Number(p.valor_liquido) || 0,
    realizado: p.status === 'pago' ? (Number(p.valor_liquido) || 0) : 0,
    pago: p.status === 'pago',
    pagoEm: p.status === 'pago' ? (p.data_pagamento || null) : null,
  };
  const res = await window.createConta(conta, companyId, userId);
  const row = Array.isArray(res) ? res[0] : res;
  if (row && row.id) await updatePagamento(p.id, { transaction_id: row.id });
  return row;
}

const brlR = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hojeR = () => new Date().toISOString().slice(0, 10);

const TIPOS_SERVICO_R = ['CONSULTA', 'RETORNO', 'AVALIAÇÃO NEUROPSICOLÓGICA', 'SESSÃO DE TERAPIA', 'PACOTE (4 SESSÕES)', 'OUTRO'];
const FORMAS_R = ['DINHEIRO', 'PIX', 'CARTÃO DÉBITO', 'CARTÃO CRÉDITO', 'MISTO'];

// ═══════════════════════════════════════════════════════════════════
// TELA DE CAIXA — usada pela recepção. Sem qualquer dado de repasse.
// ═══════════════════════════════════════════════════════════════════
const CaixaPage = () => {
  const { profile } = window.useAuth();
  const companyId = profile?.company_id;
  const userId = profile?.id;

  const [data, setData] = useStateR(hojeR());
  const [colabs, setColabs] = useStateR([]);
  const [lancamentos, setLancamentos] = useStateR([]);
  const [loading, setLoading] = useStateR(true);
  const [form, setForm] = useStateR({ paciente: '', colaborador_id: '', tipo_servico: 'CONSULTA', valor: '', forma_pagamento: 'PIX', cpf_nf: '', observacao: '' });
  const [erro, setErro] = useStateR('');
  const [salvando, setSalvando] = useStateR(false);

  useEffectR(() => {
    if (!companyId) return;
    (async () => {
      try {
        const cs = await window.rhListColab?.(companyId) || [];
        setColabs(cs.filter(c => c.status === 'Ativo'));
      } catch { setColabs([]); }
    })();
  }, [companyId]);

  const recarregar = async () => {
    if (!companyId) return;
    setLoading(true);
    try { setLancamentos(await fetchCaixa(companyId, data, data)); }
    catch (e) { console.warn(e); setLancamentos([]); }
    setLoading(false);
  };
  useEffectR(() => { recarregar(); }, [companyId, data]);

  const valorNum = parseFloat(String(form.valor).replace(',', '.')) || 0;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const adicionar = async () => {
    if (!form.colaborador_id) return setErro('Escolha o profissional.');
    if (!form.paciente.trim()) return setErro('Informe o paciente.');
    if (!valorNum) return setErro('Informe o valor recebido.');
    setErro(''); setSalvando(true);
    const colab = colabs.find(c => c.id === form.colaborador_id);
    try {
      await createCaixa({
        data,
        paciente: form.paciente.toUpperCase(),
        colaborador_id: form.colaborador_id,
        profissional_nome: colab?.nome || '',
        tipo_servico: form.tipo_servico,
        valor: valorNum,
        forma_pagamento: form.forma_pagamento,
        cpf_nf: form.cpf_nf || null,
        observacao: form.observacao || null,
      }, companyId, userId);
      setForm({ paciente: '', colaborador_id: '', tipo_servico: 'CONSULTA', valor: '', forma_pagamento: 'PIX', cpf_nf: '', observacao: '' });
      await recarregar();
    } catch (e) { setErro('Erro ao salvar: ' + e.message); }
    setSalvando(false);
  };

  const remover = async (id) => {
    if (!confirm('Remover este lançamento?')) return;
    try { await deleteCaixa(id); await recarregar(); } catch (e) { alert(e.message); }
  };

  const totalDia = lancamentos.reduce((s, l) => s + Number(l.valor || 0), 0);
  const nomeColab = (l) => l.profissional_nome || colabs.find(c => c.id === l.colaborador_id)?.nome || '—';
  const dataFmt = data.split('-').reverse().join('/');

  return (
    <div className="anim-fade">
      {/* ── Faixa azul ── */}
      <window.Band
        title="Caixa — Particular"
        subtitle="Lançamento dos atendimentos particulares do dia"
        right={<input type="date" value={data} onChange={e => setData(e.target.value)}
          style={{ height: 38, padding: '0 12px', borderRadius: 'var(--r-lg)', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.12)', color: '#fff', font: '500 13px var(--f-sans)', cursor: 'pointer' }} />}
        metricLabel="Total recebido no dia"
        metric={totalDia}
        stats={[
          { label: 'Atendimentos', value: String(lancamentos.length), color: 'var(--on-accent)' },
          { label: 'Data', value: dataFmt, color: 'var(--on-accent)' },
        ]}
      />

      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Formulário */}
        <window.Card padding={20}>
          <h3 style={{ font: 'var(--t-h2)', color: 'var(--ink)', marginBottom: 16 }}>Novo lançamento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <window.Field label="Profissional *">
              <select value={form.colaborador_id} onChange={e => set('colaborador_id', e.target.value)} style={window.inputStyle}>
                <option value="">— Selecione —</option>
                {colabs.map(c => <option key={c.id} value={c.id}>{(c.nome || '').toUpperCase()}{c.cargo ? ' · ' + c.cargo.toUpperCase() : ''}</option>)}
              </select>
            </window.Field>
            <window.Field label="Paciente *">
              <input value={form.paciente} onChange={e => set('paciente', e.target.value.toUpperCase())} placeholder="Nome do paciente" style={{ ...window.inputStyle, textTransform: 'uppercase' }} />
            </window.Field>
            <window.Field label="Tipo de serviço">
              <select value={form.tipo_servico} onChange={e => set('tipo_servico', e.target.value)} style={window.inputStyle}>
                {TIPOS_SERVICO_R.map(t => <option key={t}>{t}</option>)}
              </select>
            </window.Field>
            <window.Field label="Valor recebido *">
              <input value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" inputMode="decimal" style={window.inputStyle} />
            </window.Field>
            <window.Field label="Forma de pagamento">
              <select value={form.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)} style={window.inputStyle}>
                {FORMAS_R.map(f => <option key={f}>{f}</option>)}
              </select>
            </window.Field>
            <window.Field label="CPF para NF (opcional)">
              <input value={form.cpf_nf} onChange={e => set('cpf_nf', e.target.value)} placeholder="000.000.000-00" style={window.inputStyle} />
            </window.Field>
            <window.Field label="Observação (opcional)" style={{ gridColumn: '1 / -1' }}>
              <input value={form.observacao} onChange={e => set('observacao', e.target.value)} placeholder="Ex.: pacote fechado, valor combinado..." style={window.inputStyle} />
            </window.Field>
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <window.Btn variant="primary" icon="plus" onClick={adicionar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Adicionar lançamento'}
            </window.Btn>
            {erro && <span style={{ color: 'var(--c-neg)', font: '600 12.5px var(--f-sans)' }}>{erro}</span>}
          </div>
        </window.Card>

        {/* Lançamentos do dia */}
        <window.Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Lançamentos de {dataFmt}</h3>
            <div style={{ font: '400 12.5px var(--f-sans)', color: 'var(--ink-3)' }}>
              {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} · total <b className="mono" style={{ color: 'var(--ink)' }}>{brlR(totalDia)}</b>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Carregando...</div>
          ) : lancamentos.length === 0 ? (
            <div style={{ padding: 40 }}>
              <window.EmptyState icon="wallet" title="Nenhum particular lançado" hint="Adicione o primeiro atendimento particular do dia acima." />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Paciente', 'Profissional', 'Serviço', 'Forma', 'Valor', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 20px', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
                      <td style={{ padding: '11px 20px', font: '600 12.5px var(--f-sans)', color: 'var(--ink)' }}>{l.paciente}</td>
                      <td style={{ padding: '11px 20px', font: '400 12.5px var(--f-sans)', color: 'var(--ink-2)' }}>{nomeColab(l)}</td>
                      <td style={{ padding: '11px 20px', font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>{l.tipo_servico}</td>
                      <td style={{ padding: '11px 20px' }}><window.Pill status="pago">{l.forma_pagamento}</window.Pill></td>
                      <td style={{ padding: '11px 20px', textAlign: 'right', font: '600 12.5px var(--f-mono)', color: 'var(--c-pos)' }} className="mono">{brlR(l.valor)}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <window.IconBtn name="trash" size={28} danger onClick={() => remover(l.id)} title="Remover" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line-strong)' }}>
                    <td colSpan={4} style={{ padding: '12px 20px', font: '700 12.5px var(--f-sans)', color: 'var(--ink)' }}>Total do dia</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', font: '700 13px var(--f-mono)', color: 'var(--c-pos)' }} className="mono">{brlR(totalDia)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </window.Card>
      </div>
    </div>
  );
};

Object.assign(window, {
  CaixaPage,
  // expõe data layer para a RepassePage (arquivo repasse2.jsx) e outros
  __repasseData: { fetchCaixa, fetchRegras, upsertRegra, fetchTarifas, updateTarifa, createTarifa, deleteTarifa, fetchFechamentos, createFechamento, brlR,
    fetchPagamentos, createPagamento, updatePagamento, deletePagamento, deletePagamentosRepasse, deletePagamentosFolha, pagamentoExiste,
    enviarPagamentoParaContas, vencimentoDoGrupo, quintoDiaUtil },
});
