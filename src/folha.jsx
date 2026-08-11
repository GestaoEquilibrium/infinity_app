// folha.jsx — Fechamento de Folha do Mês (Infinity · Eq Finance)
// ─────────────────────────────────────────────────────────────────────────────
// • Puxa colaboradores CLT + Estágio (as duas empresas) e o ponto_mensal do Cortex.
// • Casa por CPF: dias/faltas/atestados (e horas p/ excedente) caem sozinhos.
//   Sem ponto para a pessoa → campos ficam manuais (a tela nunca trava).
// • Calcula com as tabelas oficiais 2026 (INSS Portaria MPS/MF · IRRF Lei 15.270/25).
// • Duas trilhas: CLT (INSS/IRRF/FGTS/patronal/provisões) e Estágio (bolsa + recesso).
// • Tudo editável, fecha e exporta Excel. Padrão window.* + componentes do ui.jsx.
// PENDENTE Marcos: (1) anexo Simples Talentos, (2) % patronal Med Center, (3) regra VT.
// ─────────────────────────────────────────────────────────────────────────────

// ═══ IDs das empresas (Supabase company_id) ═══
const FOLHA_CO = {
  '7663eaab-3fa3-4067-91f6-71f8c77f8b55': 'medcenter',
  '17749e39-3e73-41ab-b731-9463d760887b': 'talentos',
};
const FOLHA_CO_IDS = Object.keys(FOLHA_CO);

// ═══ Regras de excedente do estágio (poucos casos). Chave = CPF só dígitos ═══
// Maria Eduarda De Leva: bolsa até 125h/mês, excedente a R$8/h.
const FOLHA_EXC = {
  '14669877666': { horas_base: 125, valor_hora: 8, nota: '125h + R$8/h excedente' },
};

// ═══ TABELAS OFICIAIS 2026 ═══
const INSS_FAIXAS = [[1621.00, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
const INSS_TETO = 8475.55;
const IRRF_FAIXAS = [
  [2428.80, 0.0, 0.0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16],
  [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73],
];
const IRRF_ISENCAO = 5000.00; // base tributável até aqui → IRRF zero (Lei 15.270/25)
const FGTS_ALIQ = 0.08;

function inssEmpregado(base) {
  base = Math.min(base, INSS_TETO);
  let total = 0, ant = 0;
  for (const [teto, aliq] of INSS_FAIXAS) {
    if (base > ant) { total += (Math.min(base, teto) - ant) * aliq; ant = teto; }
    else break;
  }
  return Math.round(total * 100) / 100;
}
function irrfMensal(baseTrib) {
  if (baseTrib <= IRRF_ISENCAO) return 0;
  for (const [teto, aliq, deduz] of IRRF_FAIXAS) {
    if (baseTrib <= teto) return Math.max(Math.round((baseTrib * aliq - deduz) * 100) / 100, 0);
  }
  return 0;
}
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ═══ MOTOR — TRILHA CLT ═══
function calcCLT(row, opts) {
  const base = Number(row.base) || 0;                 // salário base (fixo, não muda)
  const grat = Number(row.grat) || 0;                 // gratificação (separada, editável)
  const salMensal = base + grat;                      // gratificação habitual entra como salário
  const dia = salMensal / 30;
  const faltas = Number(row.faltas) || 0;
  const descFaltas = r2(dia * faltas);                // atestado não desconta
  const sal = r2(salMensal - descFaltas);

  const inss = inssEmpregado(sal);
  const irrf = irrfMensal(sal - inss);

  const diasUteis = Number(opts.diasUteis) || 22;
  const diasTrab = Math.max(diasUteis - faltas, 0);
  const vtCusto = opts.descontaVT ? r2(5.70 * 2 * diasTrab) : 0;
  const vtDesc = opts.descontaVT ? r2(Math.min(salMensal * 0.06, vtCusto)) : 0;

  const liquido = r2(sal - inss - irrf - vtDesc);

  const fgts = r2(sal * FGTS_ALIQ);
  let patronal = 0;
  if (row.empresa === 'medcenter') patronal = r2(sal * (Number(opts.patronalMed) || 0));
  else if (row.empresa === 'talentos') patronal = opts.talentosCPPfora ? r2(sal * 0.20) : 0;
  const prov13 = r2(salMensal / 12);
  const provFerias = r2(salMensal / 12 + salMensal / 12 / 3);
  const fgtsProv = r2((prov13 + provFerias) * FGTS_ALIQ);
  const vtEmp = r2(vtCusto - vtDesc);
  const custo = r2(sal + fgts + patronal + prov13 + provFerias + fgtsProv + vtEmp);

  return { base, grat, salMensal, sal, descFaltas, inss, irrf, vtDesc, liquido, fgts, patronal, prov13, provFerias, fgtsProv, vtEmp, custo };
}

// ═══ MOTOR — TRILHA ESTÁGIO ═══
function calcEstagio(row, opts) {
  const bolsa = Number(row.base) || 0;
  const dia = bolsa / 30;
  const faltas = Number(row.faltas) || 0;
  const descFaltas = r2(dia * faltas);
  const bolsaProp = r2(bolsa - descFaltas);

  let excedente = 0;
  const rule = FOLHA_EXC[row.cpf];
  if (rule && row.horas != null && row.horas !== '') {
    excedente = r2(Math.max((Number(row.horas) || 0) - rule.horas_base, 0) * rule.valor_hora);
  }
  const irrf = irrfMensal(bolsaProp + excedente); // bolsa é tributável, mas isenta até R$5.000
  const liquido = r2(bolsaProp + excedente - irrf);

  const recesso = r2(bolsa / 12);                 // recesso 30d/ano provisionado
  const diasTrab = Math.max((Number(opts.diasUteis) || 22) - faltas, 0);
  const vtCusto = row.recebe_vt ? r2(5.70 * 2 * diasTrab) : 0; // estágio: não desconta
  const custo = r2(bolsaProp + excedente + recesso + vtCusto);

  return { bolsaProp, descFaltas, excedente, irrf, liquido, recesso, vtCusto, custo };
}

// expõe p/ conferência no console
window.FolhaMotor = { inssEmpregado, irrfMensal, calcCLT, calcEstagio };

// ═══ Supabase REST (mesmo padrão do rh.jsx) ═══
const folhaSb = async (path, opts = {}) => {
  if (window.__sbRest) return window.__sbRest(path, opts);
  const s = window.getSession?.();
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${s?.access_token || window.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
};

const soDigitos = (v) => String(v || '').replace(/\D/g, '');
const firstDef = (...xs) => { for (const x of xs) if (x != null && x !== '') return x; return undefined; };

// normaliza uma linha do ponto_mensal (nomes de coluna variam — defensivo)
function normalizaPonto(p) {
  return {
    cpf: soDigitos(firstDef(p.cpf, p.CPF, p.documento)),
    competencia: firstDef(p.competencia, p.mes, p.mes_ref, p.referencia, p.periodo),
    dias: firstDef(p.dias_trabalhados, p.dias_uteis_trabalhados, p.dias, p.dias_uteis),
    faltas: firstDef(p.faltas, p.faltas_mes, p.total_faltas),
    atestados: firstDef(p.atestados, p.atestado_dias, p.atestado, p.dias_atestado),
    horas: firstDef(p.horas, p.horas_trabalhadas, p.total_horas, p.carga_horaria),
  };
}

// ═══ COMPONENTE ═══
function FolhaProvisoes() {
  const { Band, Card, Btn, Money, Segmented, MonthNav, Pill, EmptyState, Field, Icon } = window;
  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState(null);
  const [rows, setRows] = React.useState([]);         // {id,nome,cargo,empresa,regime,base,cpf,dias,faltas,atestados,horas,autofill,recebe_vt}
  const [pontoMiss, setPontoMiss] = React.useState(0);

  const hoje = new Date();
  const [comp, setComp] = React.useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [aba, setAba] = React.useState('CLT');        // 'CLT' | 'EST'
  const [diasUteis, setDiasUteis] = React.useState(22);
  const [descontaVT, setDescontaVT] = React.useState(true);
  const [patronalMed, setPatronalMed] = React.useState(28); // %
  const [talentosCPPfora, setTalentosCPPfora] = React.useState(false);

  // ── carrega colaboradores + ponto do mês ──
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true); setErro(null);
      try {
        const inList = `(${FOLHA_CO_IDS.join(',')})`;
        const colabs = await folhaSb(`/colaboradores?select=*&company_id=in.${inList}&status=eq.Ativo&order=nome.asc&limit=1000`);

        // ponto_mensal — defensivo: se a tabela/coluna não existir, segue sem auto
        let pontoRows = [];
        try {
          pontoRows = await folhaSb(`/ponto_mensal?select=*&limit=5000`);
        } catch (e) { console.warn('ponto_mensal indisponível — folha em modo manual', e.message); }

        // indexa ponto por CPF (filtra competência quando a coluna existe)
        const pontoMap = {};
        (pontoRows || []).forEach((raw) => {
          const p = normalizaPonto(raw);
          if (!p.cpf) return;
          if (p.competencia && String(p.competencia).slice(0, 7) !== comp) return;
          pontoMap[p.cpf] = p;
        });

        let miss = 0;
        const linhas = (colabs || [])
          .map((c) => {
            const regime = /estag/i.test(c.regime || '') ? 'EST'
              : /clt/i.test(c.regime || '') ? 'CLT' : null;
            if (!regime) return null;
            let empresa = /talent/i.test(c.pagador || '') ? 'talentos'
              : /med\s*center/i.test(c.pagador || '') ? 'medcenter'
              : (FOLHA_CO[c.company_id] || 'medcenter');
            const cpf = soDigitos(c.cpf);
            const p = pontoMap[cpf];
            if (!p) miss++;
            return {
              id: c.id, nome: c.nome, cargo: c.cargo || '', empresa, regime,
              base: Number(c.salario) || 0, grat: Number(c.gratificacao) || 0, cpf,
              dias: p && p.dias != null ? Number(p.dias) : diasUteis,
              faltas: p && p.faltas != null ? Number(p.faltas) : 0,
              atestados: p && p.atestados != null ? Number(p.atestados) : 0,
              horas: p && p.horas != null ? Number(p.horas) : '',
              recebe_vt: false,
              autofill: !!p,
            };
          })
          .filter(Boolean);

        if (!vivo) return;
        setRows(linhas); setPontoMiss(miss); setLoading(false);
      } catch (e) {
        if (!vivo) return;
        setErro(e.message); setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [comp]);

  const opts = {
    diasUteis: Number(diasUteis) || 22,
    descontaVT,
    patronalMed: (Number(patronalMed) || 0) / 100,
    talentosCPPfora,
  };

  const setCell = (id, campo, val) => {
    setRows((prev) => prev.map((r) => r.id === id
      ? { ...r, [campo]: (campo === 'horas' ? val : (val === '' ? 0 : Number(val))) }
      : r));
  };

  // grava a gratificação no banco (ao sair do campo)
  const saveGrat = async (id, val) => {
    try {
      await folhaSb(`/colaboradores?id=eq.${id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ gratificacao: Number(val) || 0 }),
      });
    } catch (e) { console.warn('salvar gratificação', e.message); }
  };

  const clt = rows.filter((r) => r.regime === 'CLT');
  const est = rows.filter((r) => r.regime === 'EST');
  const cltCalc = clt.map((r) => ({ r, c: calcCLT(r, opts) }));
  const estCalc = est.map((r) => ({ r, c: calcEstagio(r, opts) }));

  const totCusto = r2(cltCalc.reduce((s, x) => s + x.c.custo, 0) + estCalc.reduce((s, x) => s + x.c.custo, 0));
  const totLiquido = r2(cltCalc.reduce((s, x) => s + x.c.liquido, 0) + estCalc.reduce((s, x) => s + x.c.liquido, 0));
  const nPessoas = rows.length;

  const shiftMes = (delta) => {
    const [y, m] = comp.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setComp(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const mesLabel = (() => {
    const [y, m] = comp.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
  })();

  const exportar = () => {
    if (!window.XLSX) { alert('XLSX não carregado.'); return; }
    const wb = window.XLSX.utils.book_new();
    const cltData = cltCalc.map(({ r, c }) => ({
      Colaborador: r.nome, Empresa: r.empresa, Dias: r.dias, Faltas: r.faltas, 'Atestado (d)': r.atestados,
      'Salário base': r.base, 'Gratificação': r.grat, 'Desc. faltas': c.descFaltas, INSS: c.inss, IRRF: c.irrf, VT: c.vtDesc,
      'Líquido': c.liquido, FGTS: c.fgts, 'INSS patronal': c.patronal, '13º prov.': c.prov13,
      'Férias+1/3 prov.': c.provFerias, 'Custo empresa': c.custo,
    }));
    const estData = estCalc.map(({ r, c }) => ({
      Estagiário: r.nome, Empresa: r.empresa, Dias: r.dias, Faltas: r.faltas, Horas: r.horas,
      'Bolsa base': r.base, Excedente: c.excedente, IRRF: c.irrf, 'Líquido': c.liquido,
      'Recesso prov.': c.recesso, 'Custo empresa': c.custo,
    }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(cltData), 'CLT');
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(estData), 'Estagio');
    window.XLSX.writeFile(wb, `Folha_${comp}.xlsx`);
  };

  // estilos de tabela
  const th = { textAlign: 'right', padding: '9px 10px', font: '700 10px var(--f-sans)', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' };
  const thL = { ...th, textAlign: 'left' };
  const td = { textAlign: 'right', padding: '8px 10px', font: '500 12.5px var(--f-mono)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
  const tdL = { textAlign: 'left', padding: '8px 10px' };
  const inp = { width: 48, padding: '4px 6px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-strong)', textAlign: 'right', font: '500 12.5px var(--f-mono)', background: 'var(--field)', color: 'var(--ink)' };

  const NumCell = ({ id, campo, value }) => (
    <input type="number" value={value} onChange={(e) => setCell(id, campo, e.target.value)} style={inp} />
  );
  const NomeCell = ({ r }) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: '600 12.5px var(--f-sans)', color: 'var(--ink)' }}>
        {r.nome}
        {!r.autofill && <Pill status="pendente" size="sm">manual</Pill>}
        {FOLHA_EXC[r.cpf] && <Pill status="hoje" size="sm">excedente</Pill>}
      </div>
      <div style={{ font: '500 11px var(--f-sans)', color: 'var(--ink-3)', marginTop: 2 }}>
        {(r.cargo || '—')} · {r.empresa === 'talentos' ? 'Talentos' : 'Med Center'}
      </div>
    </div>
  );

  const ctrlWrap = { display: 'flex', alignItems: 'center', gap: 8 };
  const ctrlLbl = { font: '600 11.5px var(--f-sans)', color: 'var(--ink-2)' };
  const ctrlInp = { width: 56, padding: '5px 8px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-strong)', textAlign: 'right', font: '500 12.5px var(--f-mono)', background: 'var(--field)', color: 'var(--ink)' };

  return (
    <>
      <Band
        title="Folha do Mês"
        subtitle="Cortex → ponto_mensal (casado por CPF) + cálculo 2026 · CLT e estágio"
        right={
          <>
            <MonthNav label={mesLabel} onPrev={() => shiftMes(-1)} onNext={() => shiftMes(1)} />
            <Btn variant="primary" icon="file" onBand onClick={exportar}>Gerar Excel</Btn>
          </>
        }
        metricLabel="Custo total da empresa"
        metric={totCusto}
        stats={[
          { label: 'Líquido a pagar', value: totLiquido },
          { label: 'Pessoas', value: String(nPessoas) },
          { label: 'Sem ponto', value: String(pontoMiss), color: pontoMiss > 0 ? 'var(--on-accent-neg)' : 'var(--on-accent)' },
        ]}
      />

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* controles globais */}
        <Card padding={14} style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
          <div style={ctrlWrap}>
            <span style={ctrlLbl}>Dias úteis</span>
            <input type="number" value={diasUteis} onChange={(e) => setDiasUteis(e.target.value)} style={ctrlInp} />
          </div>
          <div style={ctrlWrap}>
            <span style={ctrlLbl}>Patronal Med Center %</span>
            <input type="number" value={patronalMed} onChange={(e) => setPatronalMed(e.target.value)} style={ctrlInp} />
          </div>
          <label style={{ ...ctrlWrap, cursor: 'pointer' }}>
            <input type="checkbox" checked={descontaVT} onChange={(e) => setDescontaVT(e.target.checked)} />
            <span style={ctrlLbl}>Descontar VT (6%)</span>
          </label>
          <label style={{ ...ctrlWrap, cursor: 'pointer' }} title="Ligue só se o Marcos confirmar que o CPP do Talentos fica FORA do DAS">
            <input type="checkbox" checked={talentosCPPfora} onChange={(e) => setTalentosCPPfora(e.target.checked)} />
            <span style={ctrlLbl}>Talentos: CPP fora do DAS (+20%)</span>
          </label>
          <div style={{ marginLeft: 'auto' }}>
            <Segmented
              options={[{ value: 'CLT', label: `CLT (${clt.length})` }, { value: 'EST', label: `Estágio (${est.length})` }]}
              value={aba} onChange={setAba}
            />
          </div>
        </Card>

        {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Carregando folha…</div>}
        {erro && <Card padding={16} style={{ color: 'var(--c-neg)', font: '500 12.5px var(--f-sans)' }}>Erro ao carregar: {erro}</Card>}

        {!loading && !erro && pontoMiss > 0 && (
          <Card padding={12} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-warn-bg)', border: 'none' }}>
            <Icon name="alert" size={16} style={{ color: 'var(--c-warn)' }} />
            <span style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink-2)' }}>
              {pontoMiss} pessoa(s) sem ponto casado por CPF neste mês — os dias/faltas vieram no padrão e estão marcados como <b>manual</b>. Preencha o CPF no Cortex ou ajuste aqui.
            </span>
          </Card>
        )}

        {/* ── TABELA CLT ── */}
        {!loading && !erro && aba === 'CLT' && (
          clt.length === 0
            ? <EmptyState icon="users" title="Nenhum CLT ativo" hint="Cadastre colaboradores CLT no RH para aparecerem aqui." />
            : <Card padding={0} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ ...thL, padding: '9px 14px' }}>Colaborador</th>
                    <th style={th}>Dias</th><th style={th}>Faltas</th><th style={th}>Atest.</th>
                    <th style={th}>Salário</th><th style={th}>Gratif.</th><th style={th}>INSS</th><th style={th}>IRRF</th>
                    <th style={th}>Líquido</th><th style={th}>FGTS</th><th style={th}>Patronal</th>
                    <th style={{ ...th, color: 'var(--accent)' }}>Custo empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {cltCalc.map(({ r, c }) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ ...tdL, padding: '8px 14px' }}><NomeCell r={r} /></td>
                      <td style={td}><NumCell id={r.id} campo="dias" value={r.dias} /></td>
                      <td style={td}><NumCell id={r.id} campo="faltas" value={r.faltas} /></td>
                      <td style={td}><NumCell id={r.id} campo="atestados" value={r.atestados} /></td>
                      <td style={td}>{window.fmtMoney(r.base)}</td>
                      <td style={td}><input type="number" value={r.grat} onChange={(e) => setCell(r.id, 'grat', e.target.value)} onBlur={() => saveGrat(r.id, r.grat)} style={{ ...inp, width: 72 }} /></td>
                      <td style={{ ...td, color: 'var(--c-neg)' }}>{c.inss ? '- ' + window.fmtMoney(c.inss) : '—'}</td>
                      <td style={{ ...td, color: 'var(--c-neg)' }}>{c.irrf ? '- ' + window.fmtMoney(c.irrf) : '—'}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{window.fmtMoney(c.liquido)}</td>
                      <td style={td}>{window.fmtMoney(c.fgts)}</td>
                      <td style={td}>{c.patronal ? window.fmtMoney(c.patronal) : '—'}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--accent)' }}>{window.fmtMoney(c.custo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line-strong)', font: '700 12.5px var(--f-mono)' }}>
                    <td style={{ ...tdL, padding: '10px 14px', font: '700 12px var(--f-sans)' }}>TOTAL CLT ({clt.length})</td>
                    <td colSpan={3} />
                    <td style={td}>{window.fmtMoney(cltCalc.reduce((s, x) => s + x.r.base, 0))}</td>
                    <td style={td}>{window.fmtMoney(cltCalc.reduce((s, x) => s + (x.r.grat || 0), 0))}</td>
                    <td style={td}>{window.fmtMoney(cltCalc.reduce((s, x) => s + x.c.inss, 0))}</td>
                    <td style={td}>{window.fmtMoney(cltCalc.reduce((s, x) => s + x.c.irrf, 0))}</td>
                    <td style={td}>{window.fmtMoney(cltCalc.reduce((s, x) => s + x.c.liquido, 0))}</td>
                    <td style={td}>{window.fmtMoney(cltCalc.reduce((s, x) => s + x.c.fgts, 0))}</td>
                    <td style={td}>{window.fmtMoney(cltCalc.reduce((s, x) => s + x.c.patronal, 0))}</td>
                    <td style={{ ...td, color: 'var(--accent)' }}>{window.fmtMoney(cltCalc.reduce((s, x) => s + x.c.custo, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
        )}

        {/* ── TABELA ESTÁGIO ── */}
        {!loading && !erro && aba === 'EST' && (
          est.length === 0
            ? <EmptyState icon="users" title="Nenhum estágio ativo" hint="Cadastre estagiários no RH para aparecerem aqui." />
            : <Card padding={0} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ ...thL, padding: '9px 14px' }}>Estagiário</th>
                    <th style={th}>Dias</th><th style={th}>Faltas</th><th style={th}>Horas</th>
                    <th style={th}>Bolsa</th><th style={th}>Excedente</th><th style={th}>IRRF</th>
                    <th style={th}>Líquido</th><th style={th}>Recesso</th>
                    <th style={{ ...th, color: 'var(--accent)' }}>Custo empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {estCalc.map(({ r, c }) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ ...tdL, padding: '8px 14px' }}><NomeCell r={r} /></td>
                      <td style={td}><NumCell id={r.id} campo="dias" value={r.dias} /></td>
                      <td style={td}><NumCell id={r.id} campo="faltas" value={r.faltas} /></td>
                      <td style={td}>
                        {FOLHA_EXC[r.cpf]
                          ? <NumCell id={r.id} campo="horas" value={r.horas} />
                          : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                      </td>
                      <td style={td}>{window.fmtMoney(r.base)}</td>
                      <td style={{ ...td, color: c.excedente ? 'var(--c-pos)' : 'inherit' }}>{c.excedente ? '+ ' + window.fmtMoney(c.excedente) : '—'}</td>
                      <td style={{ ...td, color: 'var(--c-neg)' }}>{c.irrf ? '- ' + window.fmtMoney(c.irrf) : '—'}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{window.fmtMoney(c.liquido)}</td>
                      <td style={td}>{window.fmtMoney(c.recesso)}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--accent)' }}>{window.fmtMoney(c.custo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line-strong)', font: '700 12.5px var(--f-mono)' }}>
                    <td style={{ ...tdL, padding: '10px 14px', font: '700 12px var(--f-sans)' }}>TOTAL ESTÁGIO ({est.length})</td>
                    <td colSpan={3} />
                    <td style={td}>{window.fmtMoney(estCalc.reduce((s, x) => s + x.r.base, 0))}</td>
                    <td style={td}>{window.fmtMoney(estCalc.reduce((s, x) => s + x.c.excedente, 0))}</td>
                    <td style={td}>{window.fmtMoney(estCalc.reduce((s, x) => s + x.c.irrf, 0))}</td>
                    <td style={td}>{window.fmtMoney(estCalc.reduce((s, x) => s + x.c.liquido, 0))}</td>
                    <td style={td}>{window.fmtMoney(estCalc.reduce((s, x) => s + x.c.recesso, 0))}</td>
                    <td style={{ ...td, color: 'var(--accent)' }}>{window.fmtMoney(estCalc.reduce((s, x) => s + x.c.custo, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
        )}

        {/* rodapé de notas */}
        {!loading && !erro && (
          <div style={{ font: '500 11.5px var(--f-sans)', color: 'var(--ink-3)', lineHeight: 1.7 }}>
            <div>• Tabelas oficiais 2026: INSS (Portaria MPS/MF, teto R$ 8.475,55) e IRRF (Lei 15.270/25 — base tributável até R$ 5.000 isenta).</div>
            <div>• Talentos = Simples → sem INSS patronal (ligue o toggle só se o Marcos confirmar CPP fora do DAS). Med Center = Presumido, patronal ajustável acima.</div>
            <div>• Gratificação: campo separado do salário base, editável e salvo no banco; entra como salário na base de INSS/FGTS (cenário correto).</div>
            <div>• Estágio: sem INSS/FGTS/13º/férias — só provisão de recesso (1/12) e VT se houver. Excedente aparece só para quem tem regra cadastrada.</div>
          </div>
        )}
      </div>
    </>
  );
}
window.FolhaProvisoes = FolhaProvisoes;
