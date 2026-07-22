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
// verifica se já existe pagamento de um colaborador num mês/grupo (para o auto-add não duplicar)
async function pagamentoExiste(companyId, competencia, grupo, colaboradorId) {
  const r = await sbR(`/pagamentos?company_id=eq.${companyId}&competencia=eq.${competencia}&grupo=eq.${grupo}&colaborador_id=eq.${colaboradorId}&select=id&limit=1`);
  return Array.isArray(r) && r.length > 0;
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

  const inp = { width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--bg-alt)', color: 'var(--ink)' };
  const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' };

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.PageHeader title="Caixa — Particular" subtitle="Lançamento dos atendimentos particulares do dia"
        action={<input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...inp, width: 'auto' }} />} />

      {/* Formulário */}
      <window.TiltCard interactive={false} padding={24}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Profissional *</label>
            <select value={form.colaborador_id} onChange={e => set('colaborador_id', e.target.value)} style={inp}>
              <option value="">— SELECIONE —</option>
              {colabs.map(c => <option key={c.id} value={c.id}>{(c.nome || '').toUpperCase()}{c.cargo ? ' · ' + c.cargo.toUpperCase() : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Paciente *</label>
            <input value={form.paciente} onChange={e => set('paciente', e.target.value.toUpperCase())} placeholder="NOME DO PACIENTE" style={{ ...inp, textTransform: 'uppercase' }} />
          </div>
          <div>
            <label style={lbl}>Tipo de serviço</label>
            <select value={form.tipo_servico} onChange={e => set('tipo_servico', e.target.value)} style={inp}>
              {TIPOS_SERVICO_R.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={lbl}>Valor recebido *</label>
            <input value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" inputMode="decimal" style={inp} />
          </div>
          <div>
            <label style={lbl}>Forma de pagamento</label>
            <select value={form.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)} style={inp}>
              {FORMAS_R.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>CPF para NF (opcional)</label>
            <input value={form.cpf_nf} onChange={e => set('cpf_nf', e.target.value)} placeholder="000.000.000-00" style={inp} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={lbl}>Observação (opcional)</label>
          <input value={form.observacao} onChange={e => set('observacao', e.target.value)} placeholder="Ex.: pacote fechado, valor combinado..." style={inp} />
        </div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <window.Btn variant="primary" icon="plus" onClick={adicionar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Adicionar lançamento'}
          </window.Btn>
          {erro && <span style={{ color: 'var(--c-danger)', fontSize: 13.5, fontWeight: 600 }}>{erro}</span>}
        </div>
      </window.TiltCard>

      {/* Lançamentos do dia */}
      <window.TiltCard interactive={false} padding={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Lançamentos de {data.split('-').reverse().join('/')}</h3>
          <div style={{ fontSize: 14, color: 'var(--ink-mute)' }}>
            {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} · total <b className="mono" style={{ color: 'var(--ink)' }}>{brlR(totalDia)}</b>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)' }}>Carregando...</div>
        ) : lancamentos.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 14 }}>Nenhum particular lançado neste dia ainda.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ color: 'var(--ink-mute)', textAlign: 'left' }}>
                {['Paciente', 'Profissional', 'Serviço', 'Forma', 'Valor', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 22px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i === 4 ? 'right' : 'left', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lancamentos.map(l => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '11px 22px', fontWeight: 600 }}>{l.paciente}</td>
                  <td style={{ padding: '11px 22px' }}>{nomeColab(l)}</td>
                  <td style={{ padding: '11px 22px', color: 'var(--ink-soft)' }}>{l.tipo_servico}</td>
                  <td style={{ padding: '11px 22px', color: 'var(--ink-soft)' }}>{l.forma_pagamento}</td>
                  <td style={{ padding: '11px 22px', textAlign: 'right', fontWeight: 700 }} className="mono">{brlR(l.valor)}</td>
                  <td style={{ padding: '11px 22px', textAlign: 'center' }}>
                    <button onClick={() => remover(l.id)} title="Remover" style={{ background: 'none', border: 'none', color: 'var(--c-danger)', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: '12px 22px' }}>TOTAL DO DIA</td>
                <td style={{ padding: '12px 22px', textAlign: 'right' }} className="mono">{brlR(totalDia)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </window.TiltCard>
    </div>
  );
};

Object.assign(window, {
  CaixaPage,
  // expõe data layer para a RepassePage (arquivo repasse2.jsx) e outros
  __repasseData: { fetchCaixa, fetchRegras, upsertRegra, fetchTarifas, fetchFechamentos, createFechamento, brlR,
    fetchPagamentos, createPagamento, updatePagamento, deletePagamento, deletePagamentosRepasse, pagamentoExiste },
});
