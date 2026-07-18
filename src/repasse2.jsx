// ═══════════════════════════════════════════════════════════════════════════
// Infinity — RepassePage (motor de repasse)
// Só admin/editor. Importa relatório de agendamento (CSV/XLSX), cruza com o
// caixa (particular já lançado), aplica regras e gera o fechamento mensal.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: useStateRP, useEffect: useEffectRP, useMemo: useMemoRP } = React;

const STATUS_COMPUTA = ['Realizado', 'Em Espera (Recepção)', 'Concluído', 'Aguardando ser chamado'];
const STATUS_FALTA = ['Falta', 'Faltou', 'Cancelado (Paciente)'];
const STATUS_AUSENTE = ['Profissional Ausente', 'Cancelado (Profissional)'];
const STATUS_PENDENTE = ['Agendado', 'Confirmado'];
const IMPOSTO_RP = 0.1333;

// Normaliza nome para comparar RH x relatório do Mais Equilibrium:
// tira acentos, minúsculas, colapsa espaços. Assim "Jéssica Góes" == "Jessica Goes".
function normalizarNome(nome) {
  return (nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}


// parser CSV (delimitador ;) — respeita aspas, ; dentro de aspas e "" escapado.
// Antes: split(';') ingênuo deixava as aspas grudadas no valor ("Rosana" != Rosana)
// e o profissional não casava com o RH → nada era gerado.
function parseCSV_RP(text) {
  const clean = text.replace(/^\uFEFF/, '');
  const linhas = [];
  let linha = [], campo = '', dentroAspas = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i], prox = clean[i + 1];
    if (dentroAspas) {
      if (ch === '"' && prox === '"') { campo += '"'; i++; }
      else if (ch === '"') { dentroAspas = false; }
      else { campo += ch; }
    } else {
      if (ch === '"') { dentroAspas = true; }
      else if (ch === ';') { linha.push(campo); campo = ''; }
      else if (ch === '\r') { /* ignora */ }
      else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else { campo += ch; }
    }
  }
  if (campo.length || linha.length) { linha.push(campo); linhas.push(linha); }
  const naoVazias = linhas.filter(r => r.some(c => c.trim() !== ''));
  if (!naoVazias.length) return [];
  const headers = naoVazias[0].map(h => h.trim());
  return naoVazias.slice(1).map(cells => {
    const row = {};
    headers.forEach((h, i) => row[h] = (cells[i] || '').trim());
    return row;
  });
}

// motor: aplica regras sobre os atendimentos + particular do caixa
function calcularRepasse(rows, regrasByColab, tarifas, caixaByColab, colabs) {
  const tarifaMap = {};
  tarifas.forEach(t => { tarifaMap[`${t.convenio}|${t.tipo_servico}`] = Number(t.valor); tarifaMap[t.convenio] = Number(t.valor); });

  const nomeToColab = {};
  colabs.forEach(c => { nomeToColab[normalizarNome(c.nome)] = c; });

  const porProf = {};
  for (const r of rows) {
    const nome = (r['Profissional'] || '').trim();
    if (!nome) continue;
    (porProf[nome] = porProf[nome] || []).push(r);
  }

  const resultados = [];
  const pendencias = [];

  for (const [nome, atends] of Object.entries(porProf)) {
    const colab = nomeToColab[normalizarNome(nome)];
    const regra = colab && regrasByColab[colab.id];
    if (!regra) {
      pendencias.push({ tipo: 'regra', msg: `${nome}: sem regra de repasse cadastrada. Cadastre em Repasse › Regras.` });
      continue;
    }
    const holding = Number(regra.holding_mensal || 0);
    let sessoes = 0, receita = 0, repasse = 0, faltas = 0, ausencias = 0, pendentes = 0;
    const convCount = {};

    for (const a of atends) {
      const status = a['Status'] || '';
      const conv = a['Convênio'] || '';
      const proc = a['Procedimento'] || '';
      if (STATUS_FALTA.includes(status)) faltas++;
      else if (STATUS_AUSENTE.includes(status)) ausencias++;
      else if (STATUS_PENDENTE.includes(status)) pendentes++;
      if (!STATUS_COMPUTA.includes(status)) continue;

      sessoes++;
      convCount[conv] = (convCount[conv] || 0) + 1;
      const convBase = conv.replace(/ \/ Não Informado$/, '');
      let tarifa = tarifaMap[convBase];
      if (tarifa == null && convBase.startsWith('Particular')) tarifa = tarifaMap['Particular'];
      if (tarifa == null) {
        tarifa = 0;
        if (!pendencias.find(x => x.tipo === 'tarifa' && x.conv === conv))
          pendencias.push({ tipo: 'tarifa', conv, msg: `Convênio "${conv}" sem tarifa cadastrada.` });
      }
      receita += tarifa;

      let rep;
      if (regra.tipo === 'fixo') {
        if (/Aba/i.test(proc) && regra.valor_fixo_aba) rep = Number(regra.valor_fixo_aba);
        else rep = Number(regra.valor_fixo || 0);
      } else {
        rep = tarifa * (1 - IMPOSTO_RP) * Number(regra.pct_convenio || 0);
      }
      repasse += rep;
    }

    // particular vindo do caixa (somado por profissional)
    const cx = colab ? (caixaByColab[colab.id] || { n: 0, total: 0 }) : { n: 0, total: 0 };
    let repassePart = 0;
    if (cx.total > 0) {
      if (regra.tipo === 'fixo') repassePart = cx.n * Number(regra.valor_particular || regra.valor_fixo || 0);
      else repassePart = cx.total * (1 - IMPOSTO_RP) * Number(regra.pct_particular || 0);
    }

    const receitaTotal = receita + cx.total;
    const bruto = repasse + repassePart;
    const liquido = bruto - holding;
    const imposto = receitaTotal * IMPOSTO_RP;
    const margem = receitaTotal - imposto - liquido;
    const total = atends.length;

    if (pendentes >= 0.15 * total && total > 5)
      pendencias.push({ tipo: 'pendente', msg: `${nome}: ${pendentes} de ${total} agendamentos com status em aberto.` });
    if (bruto > receitaTotal && receitaTotal > 0)
      pendencias.push({ tipo: 'prejuizo', msg: `${nome}: repasse (${window.__repasseData.brlR(bruto)}) maior que a receita (${window.__repasseData.brlR(receitaTotal)}).` });

    resultados.push({
      nome, colaborador_id: colab?.id, categoria: colab?.cargo || regra.grupo_ciclo,
      sessoes, particular_n: cx.n, receita: receitaTotal, bruto, holding, liquido, imposto, margem,
      faltas, ausencias, pendentes, convCount, competencia: regra.competencia_convenio,
    });
  }
  resultados.sort((a, b) => b.liquido - a.liquido);
  return { resultados, pendencias };
}

const RepassePage = () => {
  const { profile } = window.useAuth();
  const companyId = profile?.company_id;
  const userId = profile?.id;
  const D = window.__repasseData;

  const [sub, setSub] = useStateRP('fechamento'); // fechamento | regras | tarifas
  const [rows, setRows] = useStateRP(null);
  const [colabs, setColabs] = useStateRP([]);
  const [regras, setRegras] = useStateRP([]);
  const [tarifas, setTarifas] = useStateRP([]);
  const [caixaByColab, setCaixaByColab] = useStateRP({});
  const [competencia, setCompetencia] = useStateRP('2026-05');
  const [msg, setMsg] = useStateRP('');

  useEffectRP(() => {
    if (!companyId) return;
    (async () => {
      try {
        const cs = await window.rhListColab?.(companyId) || [];
        setColabs(cs);
        setRegras(await D.fetchRegras(companyId));
        setTarifas(await D.fetchTarifas(companyId));
      } catch (e) { console.warn(e); }
    })();
  }, [companyId]);

  // carrega o caixa do mês da competência e soma por colaborador
  useEffectRP(() => {
    if (!companyId || !competencia) return;
    (async () => {
      const [y, m] = competencia.split('-');
      const ini = `${y}-${m}-01`;
      const fim = `${y}-${m}-31`;
      try {
        const cx = await D.fetchCaixa(companyId, ini, fim);
        const by = {};
        cx.forEach(l => {
          if (!l.colaborador_id) return;
          by[l.colaborador_id] = by[l.colaborador_id] || { n: 0, total: 0 };
          by[l.colaborador_id].n++; by[l.colaborador_id].total += Number(l.valor || 0);
        });
        setCaixaByColab(by);
      } catch (e) { console.warn(e); setCaixaByColab({}); }
    })();
  }, [companyId, competencia]);

  const regrasByColab = useMemoRP(() => {
    const m = {}; regras.forEach(r => { if (r.colaborador_id) m[r.colaborador_id] = r; }); return m;
  }, [regras]);

  const handleFile = async (file) => {
    const name = (file.name || '').toLowerCase();
    let parsed = [];
    if (name.endsWith('.csv')) parsed = parseCSV_RP(await file.text());
    else if (window.XLSX) {
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      parsed = window.XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
      // normaliza chaves esperadas
      parsed = parsed.map(r => {
        const o = {}; Object.keys(r).forEach(k => o[k.trim()] = r[k]); return o;
      });
    }
    setRows(parsed);

    // Detecta a competência automaticamente pelas datas do arquivo (mês predominante)
    const contagem = {};
    for (const r of parsed) {
      const dia = r['Dia'] || r['Data'] || '';
      const m = String(dia).match(/(\d{2})\/(\d{2})\/(\d{4})/);  // dd/mm/aaaa
      if (m) {
        const chave = `${m[3]}-${m[2]}`;  // aaaa-mm
        contagem[chave] = (contagem[chave] || 0) + 1;
      }
    }
    const mesesOrdenados = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    if (mesesOrdenados.length) {
      const [mesDetectado] = mesesOrdenados[0];
      setCompetencia(mesDetectado);
      const [y, mm] = mesDetectado.split('-');
      const nomeMes = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][parseInt(mm)];
      setMsg(`${parsed.length} linhas carregadas · competência detectada: ${nomeMes}/${y}.`);
    } else {
      setMsg(`${parsed.length} linhas carregadas.`);
    }
  };

  const { resultados, pendencias } = useMemoRP(
    () => rows ? calcularRepasse(rows, regrasByColab, tarifas, caixaByColab, colabs) : { resultados: [], pendencias: [] },
    [rows, regrasByColab, tarifas, caixaByColab, colabs]
  );

  const totalLiq = resultados.reduce((s, r) => s + r.liquido, 0);
  const totalRec = resultados.reduce((s, r) => s + r.receita, 0);
  const totalMar = resultados.reduce((s, r) => s + r.margem, 0);

  const salvarFechamento = async () => {
    if (!resultados.length) return;
    setMsg('Salvando fechamento...');
    try {
      for (const r of resultados) {
        await D.createFechamento({
          competencia, pago_em: '', colaborador_id: r.colaborador_id, profissional_nome: r.nome,
          categoria: r.categoria, sessoes: r.sessoes, receita: r.receita, repasse_bruto: r.bruto,
          holding: r.holding, ajuste: 0, liquido: r.liquido, imposto: r.imposto, margem: r.margem,
          detalhe: { convCount: r.convCount, faltas: r.faltas, ausencias: r.ausencias, particular_n: r.particular_n },
          status: 'aberto',
        }, companyId, userId);
      }
      setMsg(`Fechamento de ${competencia} salvo — ${resultados.length} profissionais.`);
    } catch (e) { setMsg('Erro: ' + e.message); }
  };

  const inp = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--bg-alt)', color: 'var(--ink)' };

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.PageHeader title="Repasse" subtitle="Motor de cálculo — importa produção, cruza com o caixa e fecha o mês" />

      {/* Sub-navegação */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['fechamento', 'Fechamento'], ['regras', 'Regras'], ['tarifas', 'Tarifas']].map(([k, l]) => (
          <window.Btn key={k} variant={sub === k ? 'primary' : 'ghost'} size="sm" onClick={() => setSub(k)}>{l}</window.Btn>
        ))}
      </div>

      {sub === 'fechamento' && (
        <>
          <window.TiltCard interactive={false} padding={22}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Competência</label>
                <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} style={inp} />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Relatório de agendamento (CSV ou XLSX)</label>
                <input type="file" accept=".csv,.xlsx" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} style={{ fontSize: 13 }} />
              </div>
              {resultados.length > 0 && <window.Btn variant="primary" icon="check" onClick={salvarFechamento}>Salvar fechamento</window.Btn>}
            </div>
            {msg && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-soft)' }}>{msg}</div>}
          </window.TiltCard>

          {rows && pendencias.length > 0 && (
            <window.TiltCard interactive={false} padding={20}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pendências antes de pagar</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {pendencias.map((p, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--c-neg-soft)', color: 'var(--c-neg)', fontSize: 13 }}>{p.msg}</div>
                ))}
              </div>
            </window.TiltCard>
          )}

          {resultados.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                <window.KPI label="Profissionais" value={resultados.length} color="var(--c-primary)" icon="users" />
                <window.KPI label="Receita" value={totalRec} color="var(--c-primary)" icon="chart" />
                <window.KPI label="Total a pagar" value={totalLiq} color="var(--c-pos)" icon="wallet" emphasis />
                <window.KPI label="Margem" value={totalMar} color={totalMar >= 0 ? 'var(--c-pos)' : 'var(--c-neg)'} icon="file" />
              </div>

              <window.TiltCard interactive={false} padding={0}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ color: 'var(--ink-mute)', textAlign: 'left' }}>
                      {['Profissional', 'Sessões', 'Part.', 'Receita', 'Repasse', 'Holding', 'Líquido'].map((h, i) => (
                        <th key={i} style={{ padding: '12px 18px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i === 0 ? 'left' : 'right', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                        <td style={{ padding: '11px 18px', fontWeight: 600 }}>{r.nome}<div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{r.categoria}</div></td>
                        <td style={{ padding: '11px 18px', textAlign: 'right' }} className="mono">{r.sessoes}</td>
                        <td style={{ padding: '11px 18px', textAlign: 'right' }} className="mono">{r.particular_n || '—'}</td>
                        <td style={{ padding: '11px 18px', textAlign: 'right' }} className="mono">{D.brlR(r.receita)}</td>
                        <td style={{ padding: '11px 18px', textAlign: 'right' }} className="mono">{D.brlR(r.bruto)}</td>
                        <td style={{ padding: '11px 18px', textAlign: 'right', color: r.holding ? 'var(--c-neg)' : 'var(--ink-mute)' }} className="mono">{r.holding ? '−' + D.brlR(r.holding).replace('R$ ', '') : '—'}</td>
                        <td style={{ padding: '11px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--c-pos)' }} className="mono">{D.brlR(r.liquido)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                      <td style={{ padding: '12px 18px' }}>TOTAL</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }} className="mono">{resultados.reduce((s, r) => s + r.sessoes, 0)}</td>
                      <td></td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }} className="mono">{D.brlR(totalRec)}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }} className="mono">{D.brlR(resultados.reduce((s, r) => s + r.bruto, 0))}</td>
                      <td></td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--c-pos)' }} className="mono">{D.brlR(totalLiq)}</td>
                    </tr>
                  </tbody>
                </table>
              </window.TiltCard>
            </>
          )}

          {!rows && (
            <window.TiltCard interactive={false} padding={40}>
              <div style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>
                Escolha a competência e importe o relatório de agendamento. O particular vem automaticamente do Caixa lançado pela recepção no mesmo mês.
              </div>
            </window.TiltCard>
          )}
        </>
      )}

      {sub === 'regras' && <RegrasTab companyId={companyId} colabs={colabs} regras={regras} setRegras={setRegras} D={D} />}
      {sub === 'tarifas' && <TarifasTab tarifas={tarifas} D={D} />}
    </div>
  );
};

// ─── aba Regras (visão simples de leitura + aviso) ───
const RegrasTab = ({ companyId, colabs, regras, setRegras }) => {
  const D = window.__repasseData;
  const [editando, setEditando] = useStateRP(null); // regra em edição, ou {} para nova, ou null (fechado)

  const recarregar = async () => {
    try { setRegras(await D.fetchRegras(companyId)); } catch (e) { console.warn(e); }
  };

  return (
    <window.TiltCard interactive={false} padding={0}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Regras de repasse por profissional</h3>
          <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 4 }}>{regras.length} regra(s) cadastrada(s). Clique numa linha para editar.</p>
        </div>
        <window.Btn variant="primary" icon="plus" size="sm" onClick={() => setEditando({})}>Nova regra</window.Btn>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ color: 'var(--ink-mute)', textAlign: 'left' }}>
          {['Profissional', 'Tipo', 'Valor', 'Holding', 'Ciclo'].map((h, i) => <th key={i} style={{ padding: '10px 20px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {regras.map(r => (
            <tr key={r.id} onClick={() => setEditando(r)} style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '10px 20px', fontWeight: 600 }}>{r.colaboradores?.nome || '—'}</td>
              <td style={{ padding: '10px 20px' }}>{r.tipo}</td>
              <td style={{ padding: '10px 20px' }}>{r.tipo === 'fixo' ? D.brlR(r.valor_fixo) : `${Math.round((r.pct_convenio || 0) * 100)}% / part ${Math.round((r.pct_particular || 0) * 100)}%`}</td>
              <td style={{ padding: '10px 20px' }}>{r.holding_mensal ? D.brlR(r.holding_mensal) : '—'}</td>
              <td style={{ padding: '10px 20px', color: 'var(--ink-soft)' }}>{r.grupo_ciclo}</td>
            </tr>
          ))}
          {regras.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--ink-mute)' }}>Nenhuma regra ainda. Clique em "Nova regra" para começar.</td></tr>
          )}
        </tbody>
      </table>
      {editando !== null && (
        <ModalRegra regra={editando} companyId={companyId} colabs={colabs} regras={regras}
          onClose={() => setEditando(null)} onSaved={async () => { await recarregar(); setEditando(null); }} />
      )}
    </window.TiltCard>
  );
};

// ─── Modal de criar/editar regra ───
const ModalRegra = ({ regra, companyId, colabs, regras, onClose, onSaved }) => {
  const D = window.__repasseData;
  const isNew = !regra.id;
  const [form, setForm] = useStateRP({
    colaborador_id: regra.colaborador_id || '',
    tipo: regra.tipo || 'fixo',
    valor_fixo: regra.valor_fixo ?? '',
    valor_fixo_aba: regra.valor_fixo_aba ?? '',
    pct_convenio: regra.pct_convenio != null ? Math.round(regra.pct_convenio * 100) : '',
    pct_particular: regra.pct_particular != null ? Math.round(regra.pct_particular * 100) : '',
    valor_particular: regra.valor_particular ?? '',
    holding_mensal: regra.holding_mensal ?? '',
    grupo_ciclo: regra.grupo_ciclo || 'Grupo 1 (M-2)',
    competencia_convenio: regra.competencia_convenio || 'M-2',
    competencia_particular: regra.competencia_particular || 'M-2',
  });
  const [erro, setErro] = useStateRP('');
  const [salvando, setSalvando] = useStateRP(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // profissionais que ainda não têm regra (para o dropdown do "novo")
  const jaComRegra = new Set(regras.map(r => r.colaborador_id));
  const disponiveis = colabs.filter(c => isNew ? !jaComRegra.has(c.id) : true);

  const num = (v) => v === '' || v == null ? null : parseFloat(String(v).replace(',', '.'));

  const salvar = async () => {
    if (!form.colaborador_id) return setErro('Escolha o profissional.');
    setErro(''); setSalvando(true);
    const payload = {
      colaborador_id: form.colaborador_id,
      tipo: form.tipo,
      valor_fixo: form.tipo === 'fixo' ? num(form.valor_fixo) : null,
      valor_fixo_aba: form.tipo === 'fixo' ? num(form.valor_fixo_aba) : null,
      pct_convenio: form.tipo === 'percentual' ? (num(form.pct_convenio) || 0) / 100 : null,
      pct_particular: form.tipo === 'percentual' ? (num(form.pct_particular) || 0) / 100 : null,
      valor_particular: num(form.valor_particular),
      holding_mensal: num(form.holding_mensal) || 0,
      grupo_ciclo: form.grupo_ciclo,
      competencia_convenio: form.competencia_convenio,
      competencia_particular: form.competencia_particular,
      ativo: true,
    };
    if (!isNew) payload.id = regra.id;
    try {
      await D.upsertRegra(payload, companyId);
      await onSaved();
    } catch (e) { setErro('Erro ao salvar: ' + e.message); setSalvando(false); }
  };

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--bg-alt)', color: 'var(--ink)', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5, display: 'block' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 30 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-solid)', borderRadius: 'var(--r-lg)', padding: 26, width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>{isNew ? 'Nova regra' : 'Editar regra'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink-mute)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Profissional</label>
          <select value={form.colaborador_id} onChange={e => set('colaborador_id', e.target.value)} style={inp} disabled={!isNew}>
            <option value="">— selecione —</option>
            {disponiveis.map(c => <option key={c.id} value={c.id}>{(c.nome || '').toUpperCase()}{c.cargo ? ' · ' + c.cargo : ''}</option>)}
          </select>
          {!isNew && <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>O profissional não muda ao editar. Para trocar, exclua e crie outra.</span>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Forma de repasse</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['fixo', 'Valor fixo por sessão'], ['percentual', 'Percentual']].map(([k, l]) => (
              <button key={k} onClick={() => set('tipo', k)} style={{
                flex: 1, padding: '10px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: form.tipo === k ? 'var(--accent)' : 'var(--bg-alt)',
                color: form.tipo === k ? 'var(--accent-ink)' : 'var(--ink-soft)',
                border: '1px solid ' + (form.tipo === k ? 'var(--accent)' : 'var(--line)'),
              }}>{l}</button>
            ))}
          </div>
        </div>

        {form.tipo === 'fixo' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={lbl}>Valor por sessão (R$)</label><input value={form.valor_fixo} onChange={e => set('valor_fixo', e.target.value)} placeholder="22,50" style={inp} /></div>
            <div><label style={lbl}>Valor ABA (opcional)</label><input value={form.valor_fixo_aba} onChange={e => set('valor_fixo_aba', e.target.value)} placeholder="26,50" style={inp} /></div>
            <div><label style={lbl}>Particular fixo (R$)</label><input value={form.valor_particular} onChange={e => set('valor_particular', e.target.value)} placeholder="63,00" style={inp} /></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={lbl}>% Convênio</label><input value={form.pct_convenio} onChange={e => set('pct_convenio', e.target.value)} placeholder="63" style={inp} /></div>
            <div><label style={lbl}>% Particular</label><input value={form.pct_particular} onChange={e => set('pct_particular', e.target.value)} placeholder="80" style={inp} /></div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <div><label style={lbl}>Holding mensal (R$)</label><input value={form.holding_mensal} onChange={e => set('holding_mensal', e.target.value)} placeholder="0" style={inp} /></div>
          <div>
            <label style={lbl}>Ciclo de pagamento</label>
            <select value={form.grupo_ciclo} onChange={e => set('grupo_ciclo', e.target.value)} style={inp}>
              {['Grupo 1 (M-2)', 'Grupo 2 (M-1)', 'Médico', 'Médico (M-1 integral)'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {erro && <div style={{ color: 'var(--c-neg)', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
          <window.Btn variant="primary" icon="check" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar regra'}</window.Btn>
        </div>
      </div>
    </div>
  );
};

const TarifasTab = ({ tarifas }) => {
  const D = window.__repasseData;
  return (
    <window.TiltCard interactive={false} padding={0}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Tarifas de convênio</h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 4 }}>O que a clínica recebe por atendimento. {tarifas.length} cadastrada(s).</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ color: 'var(--ink-mute)', textAlign: 'left' }}>
          {['Convênio', 'Serviço', 'Valor'].map((h, i) => <th key={i} style={{ padding: '10px 20px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {tarifas.map(t => (
            <tr key={t.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 20px', fontWeight: 600 }}>{t.convenio}</td>
              <td style={{ padding: '10px 20px', color: 'var(--ink-soft)' }}>{t.tipo_servico}</td>
              <td style={{ padding: '10px 20px', textAlign: 'right' }} className="mono">{D.brlR(t.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </window.TiltCard>
  );
};

Object.assign(window, { RepassePage });
