// folha.jsx — Motor de Provisões da Folha (Infinity)
// Calcula, por colaborador: FGTS mensal, provisão de 13º, provisão de férias+1/3,
// FGTS sobre provisões e INSS patronal (condicional ao regime da empresa).
// Puro + componente React. Segue padrão window.* do Infinity.
// -----------------------------------------------------------------------------

// ---------- MOTOR (função pura, sem React) ----------
// colab: { nome, cargo, empresa, salario_base, gratificacao, admissao }
// opts:  { regime: 'presumido'|'simples',
//          inssPatronalPct: 0.28,      // só usado se regime='presumido'
//          gratificacaoNaBase: false } // true = gratificação entra na base (se habitual)
function calcProvisoes(colab, opts) {
  var o = opts || {};
  var regime = o.regime || 'presumido';
  var inssPat = (o.inssPatronalPct != null) ? o.inssPatronalPct : 0.28;
  var gratNaBase = !!o.gratificacaoNaBase;

  var salBase = Number(colab.salario_base) || 0;
  var grat = Number(colab.gratificacao) || 0;
  var bruto = salBase + grat;

  // Base de incidência de FGTS/INSS/13º/férias.
  // Se a gratificação for habitual, ela entra na base; senão, só o salário base
  // (espelha o comportamento atual dos holerites da contabilidade).
  var base = salBase + (gratNaBase ? grat : 0);

  var fgtsMes = base * 0.08;                 // FGTS do mês
  var prov13 = base / 12;                     // 1/12 avos de 13º
  var provFerias = (base / 12) * (1 + 1 / 3); // 1/12 de férias + 1/3 constitucional
  var fgtsProv = (prov13 + provFerias) * 0.08; // FGTS incide sobre 13º e férias

  // INSS patronal: no Lucro Presumido incide por fora (GPS ~28%).
  // No Simples (Anexo III/IV típico), a CPP está embutida no DAS → 0 por fora.
  var inssPatronal = (regime === 'simples') ? 0 : (base * inssPat);

  var custoSemPatronal = bruto + fgtsMes + prov13 + provFerias + fgtsProv;
  var custoTotal = custoSemPatronal + inssPatronal;

  return {
    nome: colab.nome,
    cargo: colab.cargo || '',
    empresa: colab.empresa || '',
    salBase: salBase,
    grat: grat,
    bruto: bruto,
    base: base,
    fgtsMes: fgtsMes,
    prov13: prov13,
    provFerias: provFerias,
    fgtsProv: fgtsProv,
    inssPatronal: inssPatronal,
    custoSemPatronal: custoSemPatronal,
    custoTotal: custoTotal
  };
}
window.calcProvisoes = calcProvisoes;

// ---------- Seed enquanto a folha não vem do Supabase ----------
// (mês cheio / steady state — trocar por dados de colaboradores + ponto_mensal)
var FOLHA_SEED = [
  // Med Center (Lucro Presumido)
  { nome: 'Cristina Beatriz de Lima', cargo: 'Recepcionista', empresa: 'Med Center', salario_base: 1700, gratificacao: 400 },
  { nome: 'Eva Augusta de Jesus', cargo: 'Aux. Limpeza', empresa: 'Med Center', salario_base: 1700, gratificacao: 500 },
  { nome: 'Tais de Oliveira Souza', cargo: 'Aux. Serviços', empresa: 'Med Center', salario_base: 2400, gratificacao: 0 },
  // Talentos (regime a validar com o Marcos)
  { nome: 'Bianca Vieira da Silva', cargo: 'Recepcionista', empresa: 'Talentos', salario_base: 1700, gratificacao: 400 },
  { nome: 'Claudia Virginia dos Santos', cargo: 'Aux. Adm.', empresa: 'Talentos', salario_base: 1700, gratificacao: 700 },
  { nome: 'Kellen Bernades Carvalho', cargo: 'Recepcionista', empresa: 'Talentos', salario_base: 1700, gratificacao: 400 },
  { nome: 'Cristiane Ap. Portugues', cargo: 'Assist. Faturamento', empresa: 'Talentos', salario_base: 2200, gratificacao: 605 },
  { nome: 'Thalita Silveira Gomes', cargo: 'Aux. Adm.', empresa: 'Talentos', salario_base: 1700, gratificacao: 325 }
];
window.FOLHA_SEED = FOLHA_SEED;

// ---------- COMPONENTE ----------
function FolhaProvisoes(props) {
  var React = window.React;
  var us = React.useState;
  var colaboradores = props.colaboradores || FOLHA_SEED;

  var regimeState = us('presumido');   var regime = regimeState[0], setRegime = regimeState[1];
  var gratState = us(false);           var gratNaBase = gratState[0], setGratNaBase = gratState[1];
  var patState = us(28);               var inssPat = patState[0], setInssPat = patState[1];

  function brl(v) {
    return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var opts = { regime: regime, inssPatronalPct: (Number(inssPat) || 0) / 100, gratificacaoNaBase: gratNaBase };
  var linhas = colaboradores.map(function (c) { return calcProvisoes(c, opts); });

  var totBruto = 0, totCusto = 0, totFgts = 0, totProv = 0, totPat = 0;
  linhas.forEach(function (l) {
    totBruto += l.bruto; totCusto += l.custoTotal;
    totFgts += l.fgtsMes; totProv += (l.prov13 + l.provFerias);
    totPat += l.inssPatronal;
  });

  var card = { background: 'var(--card, #fff)', border: '1px solid var(--border, #e6eef5)', borderRadius: 16, padding: 16 };
  var chip = function (active) {
    return {
      padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
      border: '1px solid ' + (active ? 'transparent' : 'var(--border,#d5e2ee)'),
      background: active ? 'var(--accent,#1968B3)' : 'transparent',
      color: active ? '#fff' : 'var(--text,#0f2a44)'
    };
  };
  var th = { textAlign: 'right', padding: '8px 10px', fontSize: 12, color: 'var(--muted,#6b8299)', fontWeight: 600, whiteSpace: 'nowrap' };
  var td = { textAlign: 'right', padding: '8px 10px', fontSize: 13, whiteSpace: 'nowrap' };
  var tdL = { textAlign: 'left', padding: '8px 10px', fontSize: 13 };

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },

    // Controles
    React.createElement('div', { style: Object.assign({}, card, { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }) },
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: 13, color: 'var(--muted,#6b8299)' } }, 'Regime'),
        React.createElement('span', { style: chip(regime === 'presumido'), onClick: function () { setRegime('presumido'); } }, 'Lucro Presumido'),
        React.createElement('span', { style: chip(regime === 'simples'), onClick: function () { setRegime('simples'); } }, 'Simples Nacional')
      ),
      regime === 'presumido' && React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: 13, color: 'var(--muted,#6b8299)' } }, 'INSS patronal %'),
        React.createElement('input', {
          type: 'number', value: inssPat, onChange: function (e) { setInssPat(e.target.value); },
          style: { width: 64, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border,#d5e2ee)' }
        })
      ),
      React.createElement('label', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' } },
        React.createElement('input', { type: 'checkbox', checked: gratNaBase, onChange: function (e) { setGratNaBase(e.target.checked); } }),
        'Gratificação na base (habitual)'
      )
    ),

    // Tabela
    React.createElement('div', { style: Object.assign({}, card, { overflowX: 'auto', padding: 8 }) },
      React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 760 } },
        React.createElement('thead', null,
          React.createElement('tr', { style: { borderBottom: '2px solid var(--border,#e6eef5)' } },
            React.createElement('th', { style: Object.assign({}, th, { textAlign: 'left' }) }, 'Colaborador'),
            React.createElement('th', { style: th }, 'Bruto'),
            React.createElement('th', { style: th }, 'FGTS'),
            React.createElement('th', { style: th }, '13º'),
            React.createElement('th', { style: th }, 'Férias+1/3'),
            React.createElement('th', { style: th }, 'FGTS s/prov.'),
            React.createElement('th', { style: th }, 'INSS pat.'),
            React.createElement('th', { style: Object.assign({}, th, { color: 'var(--accent,#1968B3)' }) }, 'Custo total')
          )
        ),
        React.createElement('tbody', null,
          linhas.map(function (l, i) {
            return React.createElement('tr', { key: i, style: { borderBottom: '1px solid var(--border,#f0f5f9)' } },
              React.createElement('td', { style: tdL },
                React.createElement('div', { style: { fontWeight: 600 } }, l.nome),
                React.createElement('div', { style: { fontSize: 11, color: 'var(--muted,#6b8299)' } }, l.cargo + ' · ' + l.empresa)
              ),
              React.createElement('td', { style: td }, brl(l.bruto)),
              React.createElement('td', { style: td }, brl(l.fgtsMes)),
              React.createElement('td', { style: td }, brl(l.prov13)),
              React.createElement('td', { style: td }, brl(l.provFerias)),
              React.createElement('td', { style: td }, brl(l.fgtsProv)),
              React.createElement('td', { style: td }, l.inssPatronal ? brl(l.inssPatronal) : '—'),
              React.createElement('td', { style: Object.assign({}, td, { fontWeight: 700 }) }, brl(l.custoTotal))
            );
          })
        ),
        React.createElement('tfoot', null,
          React.createElement('tr', { style: { borderTop: '2px solid var(--border,#e6eef5)', fontWeight: 700 } },
            React.createElement('td', { style: tdL }, 'TOTAL (' + linhas.length + ')'),
            React.createElement('td', { style: td }, brl(totBruto)),
            React.createElement('td', { style: td }, brl(totFgts)),
            React.createElement('td', { style: td, colSpan: 2 }, brl(totProv)),
            React.createElement('td', { style: td }, '—'),
            React.createElement('td', { style: td }, totPat ? brl(totPat) : '—'),
            React.createElement('td', { style: Object.assign({}, td, { color: 'var(--accent,#1968B3)' }) }, brl(totCusto))
          )
        )
      )
    ),

    React.createElement('div', { style: { fontSize: 12, color: 'var(--muted,#6b8299)', lineHeight: 1.5 } },
      'Provisões = valores que a empresa já deve mês a mês (saem no futuro em 13º e férias). ',
      regime === 'simples'
        ? 'Simples: contribuição patronal embutida no DAS — sem INSS patronal por fora.'
        : 'Lucro Presumido: INSS patronal recolhido por fora (GPS). Confirmar RAT + terceiros com o contador.'
    )
  );
}
window.FolhaProvisoes = FolhaProvisoes;
