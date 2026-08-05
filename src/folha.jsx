// folha.jsx — Fechamento de Folha do Mês (Infinity)
// Junta os dados burocráticos (vindos do Cortex pela ponte) e calcula o mês:
// salário, faltas, atestado, VT (5,70×2×dias) e benefício (lugar da gratificação).
// INSS/IRRF do empregado ficam por conta da contabilidade (Marcos).
// Puro + componente React. Padrão window.* do Infinity.
// -----------------------------------------------------------------------------

// ---------- MOTOR (função pura) ----------
// p:   { nome, cargo, empresa, salario_base, gratificacao,
//        dias_trabalhados, faltas, atestado_dias, beneficio_va }
// opts:{ diasUteis, vtDiario, vtMult, inssPatronalPct, vaMode }
//   vaMode=true  → a gratificação é tratada como Vale-Alimentação (isento de encargo)
//   vaMode=false → a gratificação é tratada como salário (entra na base, cenário correto)
function calcFolha(p, opts) {
  var o = opts || {};
  var diasUteis = o.diasUteis || 22;
  var vtDiario = (o.vtDiario != null) ? o.vtDiario : 5.70;
  var vtMult = (o.vtMult != null) ? o.vtMult : 2;
  var inssPatPct = (o.inssPatronalPct != null) ? o.inssPatronalPct : 0.28;
  var vaMode = !!o.vaMode;

  // Regime por empresa: Talentos = Simples (patronal no DAS) · Med Center = Presumido
  var empresa = p.empresa || '';
  var regime = /talentos/i.test(empresa) ? 'simples' : 'presumido';

  var salBase = Number(p.salario_base) || 0;
  var grat = Number(p.gratificacao) || 0;
  var diasTrab = (p.dias_trabalhados != null) ? Number(p.dias_trabalhados) : diasUteis;
  var faltas = Number(p.faltas) || 0;
  var atestado = Number(p.atestado_dias) || 0;

  // Falta injustificada desconta o dia (mensalista: dia = salário/30)
  var descFaltas = (salBase / 30) * faltas;

  // Gratificação: vira VA isento (vaMode) OU entra como salário
  var gratComoSalario = vaMode ? 0 : grat;
  var beneficioVA = vaMode ? grat : (Number(p.beneficio_va) || 0);

  // Proventos tributáveis do mês (o que a contabilidade usa de base do holerite)
  var proventos = salBase - descFaltas + gratComoSalario;

  // Base de encargos (VA não entra; atestado até 15d é pago pela empresa e conta)
  var baseEncargo = proventos;

  // Vale-transporte: custo da empresa = 5,70 × 2 × dias trabalhados
  var vtCusto = vtDiario * vtMult * diasTrab;
  // Desconto de VT permitido: até 6% do salário base
  var vtDescontoMax = salBase * 0.06;
  var vtDesconto = Math.min(vtDescontoMax, vtCusto);

  var fgts = baseEncargo * 0.08;
  var inssPatronal = (regime === 'simples') ? 0 : baseEncargo * inssPatPct;

  // Custo total da empresa com a pessoa no mês
  var custoEmpresa = proventos + beneficioVA + vtCusto + fgts + inssPatronal;

  return {
    nome: p.nome, cargo: p.cargo || '', empresa: empresa, regime: regime,
    salBase: salBase, grat: grat,
    diasTrab: diasTrab, faltas: faltas, atestado: atestado,
    descFaltas: descFaltas, proventos: proventos,
    beneficioVA: beneficioVA, vtCusto: vtCusto, vtDesconto: vtDesconto,
    fgts: fgts, inssPatronal: inssPatronal, custoEmpresa: custoEmpresa
  };
}
window.calcFolha = calcFolha;

// ---------- Seed (troca por dados do Cortex quando a ponte trouxer) ----------
var FOLHA_SEED = [
  { nome: 'Cristina Beatriz de Lima', cargo: 'Recepcionista', empresa: 'Med Center', salario_base: 1700, gratificacao: 400 },
  { nome: 'Eva Augusta de Jesus', cargo: 'Aux. Limpeza', empresa: 'Med Center', salario_base: 1700, gratificacao: 500 },
  { nome: 'Tais de Oliveira Souza', cargo: 'Aux. Serviços', empresa: 'Med Center', salario_base: 2400, gratificacao: 0 },
  { nome: 'Bianca Vieira da Silva', cargo: 'Recepcionista', empresa: 'Talentos', salario_base: 1700, gratificacao: 400 },
  { nome: 'Claudia Virginia dos Santos', cargo: 'Aux. Adm.', empresa: 'Talentos', salario_base: 1700, gratificacao: 700 },
  { nome: 'Kellen Bernades Carvalho', cargo: 'Recepcionista', empresa: 'Talentos', salario_base: 1700, gratificacao: 400 },
  { nome: 'Cristiane Ap. Portugues', cargo: 'Assist. Faturamento', empresa: 'Talentos', salario_base: 2200, gratificacao: 605 },
  { nome: 'Thalita Silveira Gomes', cargo: 'Aux. Adm.', empresa: 'Talentos', salario_base: 1700, gratificacao: 325, atestado_dias: 2 }
];
window.FOLHA_SEED = FOLHA_SEED;

// ---------- COMPONENTE ----------
function FolhaProvisoes(props) {
  var React = window.React;
  var us = React.useState;

  // linhas editáveis (dias/faltas/atestado por pessoa)
  var seed = (props.colaboradores || FOLHA_SEED).map(function (p) {
    return Object.assign({
      dias_trabalhados: 22, faltas: 0, atestado_dias: 0, beneficio_va: 0
    }, p);
  });
  var rowsState = us(seed);   var rows = rowsState[0], setRows = rowsState[1];

  var diasState = us(22);     var diasUteis = diasState[0], setDiasUteis = diasState[1];
  var vtState = us(5.70);     var vtDiario = vtState[0], setVtDiario = vtState[1];
  var patState = us(28);      var inssPat = patState[0], setInssPat = patState[1];
  var vaState = us(false);    var vaMode = vaState[0], setVaMode = vaState[1];

  function brl(v) { return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function setCell(i, campo, val) {
    setRows(function (prev) {
      var next = prev.slice();
      next[i] = Object.assign({}, next[i]); next[i][campo] = val === '' ? 0 : Number(val);
      return next;
    });
  }

  var opts = { diasUteis: diasUteis, vtDiario: Number(vtDiario) || 0, vtMult: 2,
               inssPatronalPct: (Number(inssPat) || 0) / 100, vaMode: vaMode };
  var calc = rows.map(function (r) { return calcFolha(r, opts); });

  var tot = { proventos: 0, va: 0, vt: 0, fgts: 0, pat: 0, custo: 0 };
  calc.forEach(function (l) {
    tot.proventos += l.proventos; tot.va += l.beneficioVA; tot.vt += l.vtCusto;
    tot.fgts += l.fgts; tot.pat += l.inssPatronal; tot.custo += l.custoEmpresa;
  });

  function exportar() {
    if (!window.XLSX) { alert('XLSX não carregado.'); return; }
    var dados = calc.map(function (l) {
      return {
        'Colaborador': l.nome, 'Empresa': l.empresa, 'Regime': l.regime,
        'Dias trab.': l.diasTrab, 'Faltas': l.faltas, 'Atestado (dias)': l.atestado,
        'Salário base': +l.salBase.toFixed(2),
        'Desc. faltas': +l.descFaltas.toFixed(2),
        'Proventos': +l.proventos.toFixed(2),
        'Benefício (VA)': +l.beneficioVA.toFixed(2),
        'VT custo': +l.vtCusto.toFixed(2),
        'FGTS': +l.fgts.toFixed(2),
        'INSS patronal': +l.inssPatronal.toFixed(2),
        'Custo empresa': +l.custoEmpresa.toFixed(2)
      };
    });
    var ws = window.XLSX.utils.json_to_sheet(dados);
    var wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Folha');
    window.XLSX.writeFile(wb, 'Folha_do_Mes.xlsx');
  }

  var card = { background: 'var(--surface,#fff)', border: '1px solid var(--line,#E7EDF3)', borderRadius: 'var(--r-lg,16px)', padding: 16, boxShadow: 'var(--shadow-sm)' };
  var th = { textAlign: 'right', padding: '8px 8px', fontSize: 11, color: 'var(--ink-mute,#8C97A4)', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.3 };
  var td = { textAlign: 'right', padding: '7px 8px', fontSize: 13, whiteSpace: 'nowrap' };
  var tdL = { textAlign: 'left', padding: '7px 8px', fontSize: 13 };
  var inp = { width: 46, padding: '4px 6px', borderRadius: 8, border: '1px solid var(--line,#E7EDF3)', textAlign: 'right', fontFamily: 'inherit', fontSize: 13, background: 'var(--bg-alt,#F0F7FC)' };
  var lbl = { fontSize: 12, color: 'var(--ink-mute,#8C97A4)', fontWeight: 600 };

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },

    // Cabeçalho
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 } },
      React.createElement('div', null,
        React.createElement('h1', { style: { fontSize: 24, fontWeight: 700, color: 'var(--ink,#1C2530)', letterSpacing: -0.5 } }, 'Folha do Mês'),
        React.createElement('p', { style: { fontSize: 13, color: 'var(--ink-mute,#8C97A4)', marginTop: 2 } }, 'Dados do Cortex + cálculo do mês para enviar à contabilidade')
      ),
      React.createElement('button', { onClick: exportar, style: { padding: '10px 18px', borderRadius: 'var(--r-sm,10px)', background: 'var(--accent,#1068B0)', color: '#fff', fontWeight: 600, fontSize: 13.5, fontFamily: 'inherit', border: 'none', cursor: 'pointer', boxShadow: '0 3px 10px rgba(16,104,176,.3)' } }, 'Gerar folha (Excel)')
    ),

    // Controles
    React.createElement('div', { style: Object.assign({}, card, { display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }) },
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        React.createElement('span', { style: lbl }, 'Dias úteis'),
        React.createElement('input', { type: 'number', value: diasUteis, onChange: function (e) { setDiasUteis(Number(e.target.value) || 0); }, style: Object.assign({}, inp, { width: 54 }) })
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        React.createElement('span', { style: lbl }, 'VT diário R$'),
        React.createElement('input', { type: 'number', step: '0.01', value: vtDiario, onChange: function (e) { setVtDiario(e.target.value); }, style: Object.assign({}, inp, { width: 62 }) }),
        React.createElement('span', { style: { fontSize: 11, color: 'var(--ink-mute,#8C97A4)' } }, '× 2 × dias')
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        React.createElement('span', { style: lbl }, 'INSS patronal % (Med Center)'),
        React.createElement('input', { type: 'number', value: inssPat, onChange: function (e) { setInssPat(e.target.value); }, style: Object.assign({}, inp, { width: 54 }) })
      ),
      React.createElement('label', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer', marginLeft: 'auto' } },
        React.createElement('input', { type: 'checkbox', checked: vaMode, onChange: function (e) { setVaMode(e.target.checked); } }),
        'Simular gratificação como Vale-Alimentação (isento)'
      )
    ),

    // Tabela
    React.createElement('div', { style: Object.assign({}, card, { overflowX: 'auto', padding: 8 }) },
      React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 920 } },
        React.createElement('thead', null,
          React.createElement('tr', { style: { borderBottom: '2px solid var(--line,#E7EDF3)' } },
            React.createElement('th', { style: Object.assign({}, th, { textAlign: 'left' }) }, 'Colaborador'),
            React.createElement('th', { style: th }, 'Dias'),
            React.createElement('th', { style: th }, 'Faltas'),
            React.createElement('th', { style: th }, 'Atest.'),
            React.createElement('th', { style: th }, 'Proventos'),
            React.createElement('th', { style: th }, 'VA'),
            React.createElement('th', { style: th }, 'VT'),
            React.createElement('th', { style: th }, 'FGTS'),
            React.createElement('th', { style: th }, 'INSS pat.'),
            React.createElement('th', { style: Object.assign({}, th, { color: 'var(--accent,#1068B0)' }) }, 'Custo empresa')
          )
        ),
        React.createElement('tbody', null,
          calc.map(function (l, i) {
            return React.createElement('tr', { key: i, style: { borderBottom: '1px solid var(--line,#EEF3F8)' } },
              React.createElement('td', { style: tdL },
                React.createElement('div', { style: { fontWeight: 600, color: 'var(--ink,#1C2530)' } }, l.nome),
                React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-mute,#8C97A4)' } }, l.cargo + ' · ' + l.empresa + ' · ' + l.regime)
              ),
              React.createElement('td', { style: td }, React.createElement('input', { type: 'number', value: rows[i].dias_trabalhados, onChange: function (e) { setCell(i, 'dias_trabalhados', e.target.value); }, style: inp })),
              React.createElement('td', { style: td }, React.createElement('input', { type: 'number', value: rows[i].faltas, onChange: function (e) { setCell(i, 'faltas', e.target.value); }, style: inp })),
              React.createElement('td', { style: td }, React.createElement('input', { type: 'number', value: rows[i].atestado_dias, onChange: function (e) { setCell(i, 'atestado_dias', e.target.value); }, style: inp })),
              React.createElement('td', { style: td }, brl(l.proventos)),
              React.createElement('td', { style: td }, l.beneficioVA ? brl(l.beneficioVA) : '—'),
              React.createElement('td', { style: td }, brl(l.vtCusto)),
              React.createElement('td', { style: td }, brl(l.fgts)),
              React.createElement('td', { style: td }, l.inssPatronal ? brl(l.inssPatronal) : '—'),
              React.createElement('td', { style: Object.assign({}, td, { fontWeight: 700, color: 'var(--ink,#1C2530)' }) }, brl(l.custoEmpresa))
            );
          })
        ),
        React.createElement('tfoot', null,
          React.createElement('tr', { style: { borderTop: '2px solid var(--line,#E7EDF3)', fontWeight: 700 } },
            React.createElement('td', { style: tdL }, 'TOTAL (' + calc.length + ')'),
            React.createElement('td', { style: td, colSpan: 3 }, ''),
            React.createElement('td', { style: td }, brl(tot.proventos)),
            React.createElement('td', { style: td }, tot.va ? brl(tot.va) : '—'),
            React.createElement('td', { style: td }, brl(tot.vt)),
            React.createElement('td', { style: td }, brl(tot.fgts)),
            React.createElement('td', { style: td }, tot.pat ? brl(tot.pat) : '—'),
            React.createElement('td', { style: Object.assign({}, td, { color: 'var(--accent,#1068B0)' }) }, brl(tot.custo))
          )
        )
      )
    ),

    React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-mute,#8C97A4)', lineHeight: 1.6 } },
      React.createElement('div', null, '• INSS e IRRF do empregado são calculados pela contabilidade — aqui mostramos o que a empresa gasta e os dados variáveis do mês.'),
      React.createElement('div', null, '• Talentos entra como Simples (patronal embutido no DAS = sem INSS patronal por fora). Confirmar anexo com o Marcos.'),
      vaMode
        ? React.createElement('div', { style: { color: 'var(--c-pos,#15803D)', fontWeight: 600 } }, '• Modo Vale-Alimentação ligado: a gratificação saiu da base de encargo. A diferença no custo é a economia (e o risco trabalhista que você elimina).')
        : React.createElement('div', null, '• A gratificação está entrando como salário (cenário correto). Ligue o modo VA acima para simular a troca por vale-alimentação.')
    )
  );
}
window.FolhaProvisoes = FolhaProvisoes;
