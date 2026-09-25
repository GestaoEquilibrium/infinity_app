// ═══════════════════════════════════════════════════════════════════════════
// Infinity — RepassePage (motor de repasse)
// Só admin/editor. Importa relatório de agendamento (CSV/XLSX), cruza com o
// caixa (particular já lançado), aplica regras e gera o fechamento mensal.
// ═══════════════════════════════════════════════════════════════════════════

const { useState: useStateRP, useEffect: useEffectRP, useMemo: useMemoRP } = React;

// POP Parte III: só paga o que foi EVOLUÍDO (Concluído/Realizado).
const STATUS_COMPUTA = ['Realizado', 'Concluído'];
// Atendidos mas ainda sem evolução: não pagam agora; pagam se o profissional evoluir no prazo de 3 dias.
const STATUS_SEM_EVOLUCAO = ['Em Espera (Recepção)', 'Em Atendimento', 'Aguardando ser chamado'];
const STATUS_FALTA = ['Falta', 'Faltou', 'Cancelado (Paciente)'];
const STATUS_AUSENTE = ['Profissional Ausente', 'Cancelado (Profissional)'];
const STATUS_PENDENTE = ['Agendado', 'Confirmado'];
// O export novo do Mais Equilibrium traz "Concluído / Realizado" e a coluna "Prontuário Evoluído?".
const stNorm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stCancelado = (s) => /cancel|falt|ausente/.test(stNorm(s));
const stComputa = (s) => !stCancelado(s) && (STATUS_COMPUTA.includes(s) || /conclu|realizad/.test(stNorm(s)));
const stSemEvolucao = (s) => !stCancelado(s) && (STATUS_SEM_EVOLUCAO.includes(s) || /espera|em atendimento|aguardando/.test(stNorm(s)));
const campoRP = (r, ...ks) => { for (const k of ks) if (r[k] != null && r[k] !== '') return r[k]; return ''; };
// situação de um atendimento para o repasse: 'paga' | 'sem_evolucao' | 'fora'
function situacaoAtend(r) {
  const st = r['Status'] || '';
  const evol = stNorm(campoRP(r, 'Prontuário Evoluído?', 'Prontuario Evoluido?', 'Evoluído'));
  if (stComputa(st)) return evol === 'nao' ? 'sem_evolucao' : 'paga';
  if (stSemEvolucao(st)) return 'sem_evolucao';
  return 'fora';
}
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


// parser CSV (delimitador ;) — mesma lógica validada
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

function criarBuscaTarifa(tarifas) {
  const norm = (s) => String(s || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Mapa: procedimento do relatório -> tipo_servico da tarifa (normalizados)
  const PROC_MAP = {
    'CONSULTA PSIQUIATRIA': 'CONSULTA PSIQUIATRIA',
    // RETORNO não paga repasse (POP Parte III) — é tirado antes, no cálculo.
  };

  const tarifaMap = {};        // "CONVENIO|SERVICO" -> valor  (normalizado)
  const tarifaConvMap = {};    // "CONVENIO" -> valor (fallback: última cadastrada do convênio)
  tarifas.forEach(t => {
    const c = norm(t.convenio), s = norm(t.tipo_servico);
    tarifaMap[`${c}|${s}`] = Number(t.valor);
    tarifaConvMap[c] = Number(t.valor);
  });

  const tarifasCod = tarifas.filter(t => t.codigo).map(t => ({
    conv: norm(t.convenio), codigo: String(t.codigo).padStart(8, '0'),
    desc: norm(t.tipo_servico), valor: Number(t.valor),
  }));

  // Busca a tarifa certa por convênio + procedimento
  const buscarTarifa = (convenio, procedimento) => {
    const c = norm(convenio.replace(/ \/ Não Informado$/, ''));
    let procServ = PROC_MAP[norm(procedimento)] || norm(procedimento);
    // "Consulta Psiquiatria - 1º Consulta" usa a tarifa da consulta
    if (/^CONSULTA PSIQUIATRIA/.test(procServ) && tarifaMap[`${c}|${procServ}`] == null) procServ = 'CONSULTA PSIQUIATRIA';
    // 1) match exato convênio + serviço
    if (tarifaMap[`${c}|${procServ}`] != null) return tarifaMap[`${c}|${procServ}`];
    // 2) Particular: tenta "PARTICULAR|serviço" e depois "PARTICULAR"
    if (c.startsWith('PARTICULAR')) {
      if (tarifaMap[`PARTICULAR|${procServ}`] != null) return tarifaMap[`PARTICULAR|${procServ}`];
      if (tarifaConvMap['PARTICULAR'] != null) return tarifaConvMap['PARTICULAR'];
    }
    // 3) Tabela por código (planilha de convênios): casa pelo código TUSS que
    //    vier no procedimento ou pela descrição; o convênio da tarifa precisa
    //    estar contido no nome do convênio do relatório (o mais específico vence:
    //    "UNIMED PMU" antes de "UNIMED").
    const codProc = (String(procedimento || '').match(/\b\d{7,8}\b/) || [])[0];
    const descProc = norm(procedimento).replace(/^\d{7,8}\s*[-–]?\s*/, '');
    const cands = tarifasCod
      .filter(t => c.includes(t.conv))
      .filter(t => (codProc && t.codigo === codProc.padStart(8, '0')) || t.desc === descProc)
      .sort((a, b) => b.conv.length - a.conv.length);
    if (cands.length) return cands[0].valor;
    return null; // sem match — vira pendência
  };

  return buscarTarifa;
}

// motor: aplica regras sobre os atendimentos + particular do caixa
function calcularRepasse(rows, regrasByColab, tarifas, caixaByColab, colabs) {
  const norm = (s) => String(s || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos p/ casar

  const buscarTarifa = criarBuscaTarifa(tarifas);

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
    let particularCount = 0;  // atendimentos particulares (não entram no demonstrativo)
    let retornos = 0, semEvolucao = 0, repSemEvolucao = 0;  // retorno não paga; sem evolução paga só se evoluir
    const convCount = {};
    const detalhes = [];      // atendimentos de convênio computados (p/ demonstrativo detalhado)
    const diaInfo = {};       // dia -> { realizado, ausente } para saber se faltou o dia inteiro
    let ausenteProprio = 0;   // só "Profissional Ausente" (não conta desmarcação estando presente)

    for (const a of atends) {
      const status = a['Status'] || '';
      const conv = a['Convênio'] || '';
      const proc = a['Procedimento'] || '';
      const dia = a['Dia'] || a['Data'] || '';
      const sit = situacaoAtend(a);
      if (dia) {
        const di = (diaInfo[dia] = diaInfo[dia] || { realizado: false, ausente: false });
        if (sit === 'paga') di.realizado = true;
        if (status === 'Profissional Ausente') di.ausente = true;
      }
      if (status === 'Profissional Ausente') ausenteProprio++;
      if (STATUS_FALTA.includes(status)) faltas++;
      else if (STATUS_AUSENTE.includes(status)) ausencias++;
      else if (STATUS_PENDENTE.includes(status)) pendentes++;
      const convBase = conv.replace(/ \/ Não Informado$/, '');
      const ehRetorno = /retorno/i.test(proc);

      // atendido mas sem evolução: fica fora agora; calcula quanto receberia se evoluir
      if (sit === 'sem_evolucao') {
        if (!ehRetorno && !/^particular/i.test(convBase)) {
          semEvolucao++;
          const t = buscarTarifa(conv, proc) || 0;
          repSemEvolucao += regra.tipo === 'fixo'
            ? ((/Aba/i.test(proc) && regra.valor_fixo_aba) ? Number(regra.valor_fixo_aba) : Number(regra.valor_fixo || 0))
            : t * (1 - IMPOSTO_RP) * Number(regra.pct_convenio || 0);
        }
        continue;
      }
      if (sit !== 'paga') continue;

      // Particular NÃO entra no demonstrativo (pago por outra via). Pula
      // completamente: não conta sessão, não soma receita nem repasse.
      if (/^particular/i.test(convBase)) { particularCount++; continue; }

      // Retorno não paga — nem convênio nem particular (POP Parte III)
      if (ehRetorno) { retornos++; continue; }

      sessoes++;
      convCount[conv] = (convCount[conv] || 0) + 1;
      let tarifa = buscarTarifa(conv, proc);
      if (tarifa == null) {
        tarifa = 0;
        if (!pendencias.find(x => x.tipo === 'tarifa' && x.conv === conv))
          pendencias.push({ tipo: 'tarifa', conv, msg: `Convênio "${conv}" (${proc}) sem tarifa cadastrada.` });
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

      // Detalhamento: só convênio, com o valor que o PROFISSIONAL recebe.
      detalhes.push({
        dia, hora: a['Horário'] || a['Horario'] || '',
        paciente: a['Paciente'] || a['Cliente'] || '',
        convenio: conv, valor: rep,
      });
    }

    // Particular NÃO entra neste demonstrativo — é pago ao profissional por outra via.
    // Mantido cx apenas para exibir a contagem (particular_n), sem somar em receita/repasse.
    const cx = colab ? (caixaByColab[colab.id] || { n: 0, total: 0 }) : { n: 0, total: 0 };
    const repassePart = 0;

    const isFixoMensal = !!regra.fixo_mensal;
    const receitaTotal0 = receita; // só convênio (particular fora)
    // dia só é descontado se ela faltou o dia INTEIRO (ausente e sem nenhum atendimento realizado)
    const diasAusentesReais = Object.values(diaInfo).filter(d => d.ausente && !d.realizado).length;
    let receitaTotal = receitaTotal0;
    let bruto = repasse + repassePart;
    let baseMensal = 0, descontoFalta = 0, faltasQtd = 0;
    if (isFixoMensal) {
      baseMensal = Number(regra.valor_base_mensal || 0);
      if (regra.desconto_por === 'dia') { faltasQtd = diasAusentesReais; descontoFalta = faltasQtd * (baseMensal / 30); }
      // por atendimento: desconta CADA desmarque dela (Cancelado Profissional) + falta dela (Profissional Ausente)
      else { faltasQtd = ausencias; descontoFalta = faltasQtd * Number(regra.valor_falta || 0); }
      bruto = baseMensal - descontoFalta;
      receitaTotal = baseMensal; // evita falso alerta de "repasse > receita" na fono
    }
    const liquido = bruto - holding;
    const imposto = isFixoMensal ? 0 : receitaTotal * IMPOSTO_RP;
    const margem = isFixoMensal ? 0 : receitaTotal - imposto - liquido;
    const total = atends.length;

    if (semEvolucao > 0)
      pendencias.push({ tipo: 'evolucao', msg: `${nome}: ${semEvolucao} atendimento(s) sem evolução — fora do valor agora; recebe ${window.__repasseData.brlR(repSemEvolucao)} a mais se evoluir no prazo de 3 dias.` });
    if (!isFixoMensal && pendentes >= 0.15 * total && total > 5)
      pendencias.push({ tipo: 'pendente', msg: `${nome}: ${pendentes} de ${total} agendamentos com status em aberto.` });
    if (!isFixoMensal && bruto > receitaTotal && receitaTotal > 0)
      pendencias.push({ tipo: 'prejuizo', msg: `${nome}: repasse (${window.__repasseData.brlR(bruto)}) maior que a receita (${window.__repasseData.brlR(receitaTotal)}).` });

    resultados.push({
      nome, colaborador_id: colab?.id, categoria: colab?.cargo || regra.grupo_ciclo,
      tipo: isFixoMensal ? 'fixo_mensal' : regra.tipo,
      fixo_mensal: isFixoMensal, base_mensal: baseMensal, desconto_falta: descontoFalta, faltas_qtd: faltasQtd,
      desconto_por: regra.desconto_por || 'atendimento',
      rep_convenio: repasse, rep_particular: repassePart,
      pct_conv: Number(regra.pct_convenio || 0), pct_part: Number(regra.pct_particular || 0),
      valor_fixo: Number(regra.valor_fixo || 0),
      sessoes, particular_n: particularCount || cx.n, receita: receitaTotal, bruto, holding, liquido, imposto, margem,
      faltas, ausencias, pendentes, convCount, competencia: regra.competencia_convenio,
      retornos, sem_evolucao: semEvolucao, rep_sem_evolucao: repSemEvolucao,
      detalhes,
    });
  }
  resultados.sort((a, b) => b.liquido - a.liquido);
  return { resultados, pendencias };
}

// ═══════════════════════════════════════════════════════════════════
// Geração de demonstrativo em PDF (client-side, jsPDF) — 1 por profissional
// Identidade Equilibrium (navy/azul/cyan). Assinatura padrão: Guilherme Marques.
// ═══════════════════════════════════════════════════════════════════
const MESES_RP = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function competenciaExtenso(comp) {
  const [y, m] = (comp || '').split('-');
  return m ? `${MESES_RP[parseInt(m)]}/${y}` : (comp || '');
}
// mês seguinte da competência (ciclo cruzado: convênio no mês X, particular no mês X+1)
function proximaCompetencia(comp) {
  const [y, m] = (comp || '').split('-').map(Number);
  if (!y || !m) return comp;
  const d = new Date(y, m, 1); // m (1-12) como índice 0-based aponta pro mês seguinte
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesNomeUpper(comp) { const m = parseInt((comp || '').split('-')[1]); return m ? MESES_RP[m].toUpperCase() : ''; }
function mesNomeLower(comp) { const m = parseInt((comp || '').split('-')[1]); return m ? MESES_RP[m].toLowerCase() : ''; }

const LOGO_EQUILIBRIUM_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAADlCAYAAAAiNi5DAAAKMWlDQ1BJQ0MgUHJvZmlsZQAAeJydlndUU9kWh8+9N71QkhCKlNBraFICSA29SJEuKjEJEErAkAAiNkRUcERRkaYIMijggKNDkbEiioUBUbHrBBlE1HFwFBuWSWStGd+8ee/Nm98f935rn73P3Wfvfda6AJD8gwXCTFgJgAyhWBTh58WIjYtnYAcBDPAAA2wA4HCzs0IW+EYCmQJ82IxsmRP4F726DiD5+yrTP4zBAP+flLlZIjEAUJiM5/L42VwZF8k4PVecJbdPyZi2NE3OMErOIlmCMlaTc/IsW3z2mWUPOfMyhDwZy3PO4mXw5Nwn4405Er6MkWAZF+cI+LkyviZjg3RJhkDGb+SxGXxONgAoktwu5nNTZGwtY5IoMoIt43kA4EjJX/DSL1jMzxPLD8XOzFouEiSniBkmXFOGjZMTi+HPz03ni8XMMA43jSPiMdiZGVkc4XIAZs/8WRR5bRmyIjvYODk4MG0tbb4o1H9d/JuS93aWXoR/7hlEH/jD9ld+mQ0AsKZltdn6h21pFQBd6wFQu/2HzWAvAIqyvnUOfXEeunxeUsTiLGcrq9zcXEsBn2spL+jv+p8Of0NffM9Svt3v5WF485M4knQxQ143bmZ6pkTEyM7icPkM5p+H+B8H/nUeFhH8JL6IL5RFRMumTCBMlrVbyBOIBZlChkD4n5r4D8P+pNm5lona+BHQllgCpSEaQH4eACgqESAJe2Qr0O99C8ZHA/nNi9GZmJ37z4L+fVe4TP7IFiR/jmNHRDK4ElHO7Jr8WgI0IABFQAPqQBvoAxPABLbAEbgAD+ADAkEoiARxYDHgghSQAUQgFxSAtaAYlIKtYCeoBnWgETSDNnAYdIFj4DQ4By6By2AE3AFSMA6egCnwCsxAEISFyBAVUod0IEPIHLKFWJAb5AMFQxFQHJQIJUNCSAIVQOugUqgcqobqoWboW+godBq6AA1Dt6BRaBL6FXoHIzAJpsFasBFsBbNgTzgIjoQXwcnwMjgfLoK3wJVwA3wQ7oRPw5fgEVgKP4GnEYAQETqiizARFsJGQpF4JAkRIauQEqQCaUDakB6kH7mKSJGnyFsUBkVFMVBMlAvKHxWF4qKWoVahNqOqUQdQnag+1FXUKGoK9RFNRmuizdHO6AB0LDoZnYsuRlegm9Ad6LPoEfQ4+hUGg6FjjDGOGH9MHCYVswKzGbMb0445hRnGjGGmsVisOtYc64oNxXKwYmwxtgp7EHsSewU7jn2DI+J0cLY4X1w8TogrxFXgWnAncFdwE7gZvBLeEO+MD8Xz8MvxZfhGfA9+CD+OnyEoE4wJroRIQiphLaGS0EY4S7hLeEEkEvWITsRwooC4hlhJPEQ8TxwlviVRSGYkNimBJCFtIe0nnSLdIr0gk8lGZA9yPFlM3kJuJp8h3ye/UaAqWCoEKPAUVivUKHQqXFF4pohXNFT0VFysmK9YoXhEcUjxqRJeyUiJrcRRWqVUo3RU6YbStDJV2UY5VDlDebNyi/IF5UcULMWI4kPhUYoo+yhnKGNUhKpPZVO51HXURupZ6jgNQzOmBdBSaaW0b2iDtCkVioqdSrRKnkqNynEVKR2hG9ED6On0Mvph+nX6O1UtVU9Vvuom1TbVK6qv1eaoeajx1UrU2tVG1N6pM9R91NPUt6l3qd/TQGmYaYRr5Grs0Tir8XQObY7LHO6ckjmH59zWhDXNNCM0V2ju0xzQnNbS1vLTytKq0jqj9VSbru2hnaq9Q/uE9qQOVcdNR6CzQ+ekzmOGCsOTkc6oZPQxpnQ1df11Jbr1uoO6M3rGelF6hXrtevf0Cfos/ST9Hfq9+lMGOgYhBgUGrQa3DfGGLMMUw12G/YavjYyNYow2GHUZPTJWMw4wzjduNb5rQjZxN1lm0mByzRRjyjJNM91tetkMNrM3SzGrMRsyh80dzAXmu82HLdAWThZCiwaLG0wS05OZw2xljlrSLYMtCy27LJ9ZGVjFW22z6rf6aG1vnW7daH3HhmITaFNo02Pzq62ZLde2xvbaXPJc37mr53bPfW5nbse322N3055qH2K/wb7X/oODo4PIoc1h0tHAMdGx1vEGi8YKY21mnXdCO3k5rXY65vTW2cFZ7HzY+RcXpkuaS4vLo3nG8/jzGueNueq5clzrXaVuDLdEt71uUnddd457g/sDD30PnkeTx4SnqWeq50HPZ17WXiKvDq/XbGf2SvYpb8Tbz7vEe9CH4hPlU+1z31fPN9m31XfKz95vhd8pf7R/kP82/xsBWgHcgOaAqUDHwJWBfUGkoAVB1UEPgs2CRcE9IXBIYMj2kLvzDecL53eFgtCA0O2h98KMw5aFfR+OCQ8Lrwl/GGETURDRv4C6YMmClgWvIr0iyyLvRJlESaJ6oxWjE6Kbo1/HeMeUx0hjrWJXxl6K04gTxHXHY+Oj45vipxf6LNy5cDzBPqE44foi40V5iy4s1licvvj4EsUlnCVHEtGJMYktie85oZwGzvTSgKW1S6e4bO4u7hOeB28Hb5Lvyi/nTyS5JpUnPUp2Td6ePJninlKR8lTAFlQLnqf6p9alvk4LTduf9ik9Jr09A5eRmHFUSBGmCfsytTPzMoezzLOKs6TLnJftXDYlChI1ZUPZi7K7xTTZz9SAxESyXjKa45ZTk/MmNzr3SJ5ynjBvYLnZ8k3LJ/J9879egVrBXdFboFuwtmB0pefK+lXQqqWrelfrry5aPb7Gb82BtYS1aWt/KLQuLC98uS5mXU+RVtGaorH1futbixWKRcU3NrhsqNuI2ijYOLhp7qaqTR9LeCUXS61LK0rfb+ZuvviVzVeVX33akrRlsMyhbM9WzFbh1uvb3LcdKFcuzy8f2x6yvXMHY0fJjpc7l+y8UGFXUbeLsEuyS1oZXNldZVC1tep9dUr1SI1XTXutZu2m2te7ebuv7PHY01anVVda926vYO/Ner/6zgajhop9mH05+x42Rjf2f836urlJo6m06cN+4X7pgYgDfc2Ozc0tmi1lrXCrpHXyYMLBy994f9Pdxmyrb6e3lx4ChySHHn+b+O31w0GHe4+wjrR9Z/hdbQe1o6QT6lzeOdWV0iXtjusePhp4tLfHpafje8vv9x/TPVZzXOV42QnCiaITn07mn5w+lXXq6enk02O9S3rvnIk9c60vvG/wbNDZ8+d8z53p9+w/ed71/LELzheOXmRd7LrkcKlzwH6g4wf7HzoGHQY7hxyHui87Xe4Znjd84or7ldNXva+euxZw7dLI/JHh61HXb95IuCG9ybv56Fb6ree3c27P3FlzF3235J7SvYr7mvcbfjT9sV3qID0+6j068GDBgztj3LEnP2X/9H686CH5YcWEzkTzI9tHxyZ9Jy8/Xvh4/EnWk5mnxT8r/1z7zOTZd794/DIwFTs1/lz0/NOvm1+ov9j/0u5l73TY9P1XGa9mXpe8UX9z4C3rbf+7mHcTM7nvse8rP5h+6PkY9PHup4xPn34D94Tz+6TMXDkAADMOSURBVHja7Z13uGRVlfZ/q6q6yRkF0QFFQDCPfipBMQ4mUNDRUcFBBXU+VDCBYUyMaVRkUFRGUREkGBDFjB8mTCjBBCaQYEByarrp7nur3u+PvTa1+/SpunXrhq57a73PU0/dW1XnnH32Xvs9a62911oQCIwYJJm/P0zSdyRNSLpT0hckbe/fNaKnAoHAYiO/hr/fV9I1Suj4S5J+LWlLSY0gwUAgsNgIsOnv/+uEt0pdrPb3M/Nvs7YYCAQCi0kD/LlrfZNaExP+/jr/XSt6LRAILDYC/KUTXZUAMymukrR3eUwgMF2E4AQWGsxfS4GTJd09cWCQYCAIMDA+ctsG7g180swEWPgDA0GAgXFB00lwP0lvNrO2fxYIBAILEwP4AOv8gZOSnuTHBQkGQgMMjAWyP7AJnCRpOzNrhz8wEAQYGCcZbgP3Aj7tfsDwBwaCAANjg+wPfDJwdPgDA4HAgsQ0fYB1/sCOpKf7OYIEA6EBBsYC2R8I8ClJ24c/MBAEGBg3ee4A25A2STcJf2AgCDAwRsj+wMcB7wl/YCAQWDCYgQ+winzcAX6+IMFAaICBsZJtAZ+QdN/wBwaCAAPjBCP5A7cGTpG0xDXB8AcGggADY4EmMAnsCRxjZp2Q+UAQYGAcSfBwSc9zUzj8gYEgwMDYmMJNN4dPkLRr+AMDQYCBcSNBAZsDp0paH8IfGAgCDIyfKfxw4Dj3B4YpHAQYCIwNWk6CL5d0sJlNhj8wCDAQGDdNsAMcL+nB4Q8MAgwExgnZH7gJ8FlJG5OKKoU/MAgwEBgbLXASeDBwvBdVClM4CDAQGBtkf+CLJL0s/IFBgIHAOGqCbeBYSQ8Pf2AQYCAwTshJVDci7Q/cjPAHBgEGAnWQZP5qFK+FnnC04abwrsDH3B/YCBIMAgwEcJJrSWqYmfzVKV5y0kBS018LjTyyP/AFkl4VSVTHB63ogkAP4msCHY+Y6BSfbeWvJcAEcBtwo5mtduIoj5cfvxCQ/YHvl3SRmf3USb8T0hAEGBgjjc+Jq+3/3w/YB9gLeBhwN2C9gjBWA8sk/Qm4EPgJ8D0zu6NCpBrxW89a6/qkeiKPAm6VZAug7YFAYJa0vvz30yV9TdKKIdLR/0XSMZJ2rhDroAQ8Gynxh8WEv588nXYHAoEFrPVlv52kPSR9p4YUJiW1ve5u9dX27yf8/4zbJB1dZF9pDtKWdUyAneKaTw4SDAQWN/m1ir/fKmm1T/52UWh8GBKZKP4/X9Jug5DgCBBgec1fSFqyCFa6A4FAL5NX0vaSvl2jAc2GNpWJ8Br3q/UlwREhwPwAkKSnD6q9BhYeQrUfX5O34ZEP+wDnAU8mLWrA7G0BMbpbTO4BfE3SAxdIxIX8dWjxfyAIMLDQtb68h0/SW4BvAzs4+TXprobOJlp+/rsBn5e0hbfFRnxuGPBYSffy/or5EgQYWODk15a0naSzgXf6V/ORHTlnYLk/8O4FUKHNnLS3AB5VfBYIAgwsYJP3CcCPgGcUJu98yUHeO/hSSY9aQBXaHhlSFAQYWPgm71HAOcCOc2zy9tOqskn8htzEBdCNDwxJCgIMLDzya7mWdXdJZwLvo5sSvrkOZU7A0yTttkB8a9sWroJAEGBgxInP3OSdlLQ38GPg2evA5O2lBXZI4XTPqmiGo4bcrqUAERIXBBhYGCavXLN6DfAdYOd1ZPJORSz7ufbXGfEV4SC+IMDAAjJ5t5R0OnCsa1qjVgM3k90DgR1dsxpFAszEt8r7N+ZLEGBgxE3ePUkZWZ5P2naiERznvMVkI1Ii0lE2gwGuCykLAgyMvsn7Cjd5d3WCaTH6e9d2WQDdfNkCIOnAEIh8gAvf5J2UtCnwYeBg/2rUTN5+2HYBtPGXIW1BgIERMnkBc/J7BPAp4EGu9TUWmGa/4ah2s/fjSuCi4rNAmMCBETF5DwW+W5DfqKzyLgYZzHv+fgv8IdLjBwEGRsPkbUvaSNKJwInAJgvM5F1IMOA0Lw8Q/r8wgQPr0OTNq7wPAT5Nqs+xEE3ehYCOE951wBne/6H9hQYYWAfkl8tRtiW9CPihk9/kAjV5FwoBNoBjzex6f/iE/y8IMLAOTN6OpA0lfRQ4CdiM7haXwOwj9+1FwHE5UiW6JUzgwLoxee9PWuXdvTDNwt83d+TXBG4FXmRmq7MGHl0TGmBg/k3eA0lRHbu7ydsIk3fOyW8l8DwzuySnEouuCQIMzA/5Nd3kXV/SccCpwOZh8s4pOnT9qTcB+5vZOTl7dnRPmMCB+TF5m27y7uwm72PG3ORdzdxtPBZdv17TFYHvA68ws98H+YUGGJhH8nOTd1LSc4CfOfmNq8mb7/d8/3vSyWqmr7a/yodKE7gceCWwT5BfaICB+df8zIuTvws4yr8aZ5NX3i/HAfsD28/BNVaSfKunA18ys9v8wo0gvyDAwPxqOwJOAA6hu7F5bFd53QdqZnalpCcB7wAejmdlHtLcvRO4HrjSie88M7u8YNwm0IkFjyDAwPypOQ2f7HtUyG/sV3nNTE6ClwEHStrEZXWYxKkCVpvZihrtu+HEF1pfEGBgnpE32Ob9fYwh+fUkNCfBRvrTls2Su6Hp15Rre0F8QYCBdYybnQzHbTJm8ruhnzlckNdsaJaTIW6BIMDRQNb6vu0kuCVpxXMctEC57LWBs4rPeprEfbS56WiBC9Ij4BpraKtBgIsHuR6umV3nER8nA3cfoy5YARxhZr+aTq694rdjpc1FPsK5e7oE1q1gm/u77gU8g5QivrNIxyZnWb4V+Jbvu7NBY22LvtoCOAC49yJ/iAu4Hfipmf0oZksQYDzdx/S+i1XzBwBn0q0mNy44DnhtnUsgEAS4KMiA8YrMmda+O/f7LQF+DDyCFCo3Dv0luuF6LzCzMyJaJQgwMIKm/KwIZI12U2h/jwB+TncFeVzkN4dFfs3M9g9/4OwhFkECMyG8vHG7PVtmWQ/tJhPdVsXf4/Twzve6SaEVBoIAA+vIVDcnqXZJXC5Pw5qlZmYrPA9ir4WRcZ34bVIo4AX+/zjuGw0CDKxz4lOxOXlT4LHAHsADSCuymwPrDX8JXQF8zMxOm87q8BiYv0tJWWs+HAWaggAD809+d5mlkh4DHATsC2w3y5faFthT0pZmdvyYO/s7xRz9AfBiM7smHgyzi8gHGOhHfOYTri1pd0lfB84DXubkJ9dQcp69jn827Cvn/nurpLtlc3hMTd68K+D9wL+Y2VVRnyQ0wMA8mrw5NZWko4E3kbahZLMsl+RszbI8doC7uUl9wxg+pCe9H64nZag+08cgVn6DAAPzpfk5+W0GnEKKUBHdwkFzLTd579tYdTvdGOkfA4ea2R8jV2GYwIF5Jj9SluqNgS87+eW42/kipXEze9t+zw1SxMeTMvmZWTvM3tAAA/NHfg33vZ0EPB6YKEzfwNyZvDcDrzSzMwoXRGx1CQIMzKdF4OT3KuBffXIG+c29yXs+cIiZ/S5M3jCBA+tG+2sAHUk7AO8kLUaEfMy9yfsxN3l/FyZvaICBdYe88HEksBndBY/A3Ji8y4DDzewz/gCKBAdBgIF1pf256bstcCDdvH2BuTF5LwReYma/9ZKo7SC/MIED614OnkkKZ1usCVnXFTqFyftJ4IlOfk0zmwyTNzTAwLqfoABPZ7QTDnQqGtVCIOls8t5JKgFwYpi8QYCB0TF/s+9vY1KiURthy2BlQXyjrjWVJu+v3eS9uFjlDfILEzgwAsha1C6kfHujSiYAN7kmtZBM3lOAxzn5tWKVNwgwMJoEuANpz98o+v8yYfwFuKXy2SiavA0n6lea2cFmdqsvNEVd4iDAwIgS4NaF9jJaDUyV4MzM7gB+P6IEmGOlW8ClwBPM7KOSGtnNEKIWBBgYXWw04ppVltVzR9jkbQKnA3ub2flu8nbC5A0CDIQszJYZ/E26FeFGgVhy7r5VwGvM7EAzuzlvcQmxCqEPLAwsr5jEo2YGd9yU/C2pMty6NtfL9GB/IiUtPa4weWOVNwgwsACQtajrF4BM5NC8E9YxUZcm75nAXmb2ozB5gwADC5cALxsx07JOC5z0lF1fAn7lBDTfmlY2eSeAN5jZc8zsxjB5gwADC5sA/wT8vfLZSMqsma0Gjizaqnnqp1wK4CrgqWb2/iJdfZi8QYCBhQbfYpJJ5fuFiTeq7W27tnUucCxp28lca17Z5G0BZwN7mNl3PZEBscUlCDCwwHnQ389aIHLR8fyFRwHfIG3gnphjk7cNvBU4wMyujUQGQYCBxYOO+9bOJW00Huni2046crPzucDX6UaxzFa7O4XJ+zdgXzN7F0S6+iDAwKIzg4Gmma0iFeUZ+WQDRXTICuBZwIfp1tJtM/ziSKfQ+lqkwlB7mNm3w+QNBBYpchF0SetL+o0SJjX/aPv77t6u5lTtLv7eX9JvK+eblDTh5+34K6Pjn0/6q/zuMkkvKc4d2bEDgUVOgg1/f1xBDJ1RJsCCvHPbN5R0qKSfDHn9CyS9ymsi3/VgCOlYpNZPdEGgQiZNX2l9N/Bm5r82SC7GtIfH0w6cOLT8rZPWQ4B9gEcB9wXuAWxBt9LdHcC1pD2QF5MWVC7I+/kiaWkQYGAMTWG6vuFzgCfOMwkOTYBl+6vHSFqPVOxpA5JvT6T43WVmdnuVSElJS2OFd5EjMkIH1nwipsUFeezti4BfuOa0IMpkOmm1nQgzmcsXeK7vY/o3/B4VWt/4IFaBA3Uk0nHN62/ASzIxMPpp6NcgQo/LnXSTPi/yNCovK34XWl8QYCBwV8RFy8y+DRztJnBnAd+PClIsX0F4QYCBQC3a7g97J/At1k3ygUAgCDCwbrSmwux9Cakmx4LWBAOBIMDAdEiwQ1pVvRZ4ESnmdkH5AwOBIMDATEgw+wO/T0oIEKZwIAgwMFbIaajeB3yFtIUqSDAQBBgYCy1QgHx/3UuBKwh/YCAIMDBGJJj9gTcC/05KoQ/hDwwEAQbGhASzP/AnwBvopp8KBIIAA2OBTILHAZ8n/IGBIMDAGGmBoptF+j+APxL+wEAQYGCMSDD7A28FXgjc6V+FPzAQBBgYCxLMpvAFwGvpZlQJBIIAA2NBgpNOgv8LnExskg4EAQbGDNkf+ErgEsIfGAgCDIyRFthJb3YHcBAp1TyEPzAQBBgYFxJ0U/jXwOHE/sBAEGBgzEgw+wNPAj5B7A8MBAEGxgxtr7HxalKltVgUCQQBBsZGC5S/30naH3gbqThR+AMDQYCBsSDB7A/8HXAY4Q8MBAEGxowEsz/wdOB4wh8YCAIMjBmyP/D1wPmEPzAQBBgYIy0w+wNXk/IH3uQyF/7AQBBgYCxIMBdZvwx4OWlBpB0kGAgCDIwLCeZ6Il8CjiH5AyNULhAIjAckmaSGpJakHyphUmujLakjaXc/rhm9FwgNMLDQtcDsD5wk1Re+jt7psyw0xEAgsBg1waa/7+ua3oRrgvnvtqSbJN3dfxcP6UAgsChJ8O2qx5Fh/gYCgXEgwVdJ+qWkf0i6SNJhofkFAoFxIEHz9yWStpPUKj8PBAKBsdAEe/0fCMwl4kkbGBVN0ADl1eJAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBBY5Ih8gIsUkmzQ3Hr90s+bWWcOrmd9rqcYk0AgMOwkaxb1NhpznWF5utebKt39YkyH733UqPZXIDTAwOxOtEbW2Cp/99Q8fGLeH9iQVIvXCtlYBVxiZu2pNJpBr1eSAqA1lb/66ywWrW+6fRQIAgxMc6JJegLwcuCewI3AF83stOqEk9Q0s7akhwG/AHppJXub2Y/y76tkK2k/4GBgW1Kx81PN7MvlZK/8fifgRGD9ggDl178DeJGZ/W0xEERxz/sDLwS2Af4BnGJmX6v2USAQGHKi+ftzvMh4Fe8sf1doYEh6TPG7Ts3fTy9/Xzn2ZT3q+r6mz/WeqP7YvXq9BT4mr+pxn4cthvsMBNa55uevDSX9wSfXKkltSRP+vlrSjpWJmQlpr4Ls6gjwKZXf51KWm0u6wX+zurhOR9JNkrau/D4fv7eT9IS/T1b+/z8LnRiKe76b90Wnpo+ul7RZ+fvA/COKTy8CN4abitu5GSpgiY9ty3+zBLjXkG4P6/H/9sDWNdczYCNghz7HN/33zeKV/7dFNK92ATbze2r550v8u7sBdw9XVBBgYIYKh7/fBCz3/9vFeweYAP5W+f1Mr3c9cKefv7xe29sxW9dbyGPyd2B1MQ4CJv39JpKPdlz7KAgwMCvqn3yB4hbgoxVNrOl/fxq4cjac7n69hpldC5xQaHBZy2kCJ5jZdf47jeGYdPzer/K+r/ZRA/iQmd0yrn00KmhFFywKdNy3917XOF4GbE5aVT0TePssaxry670RWAYcBGwK3AZ8FniP+7XGeWLL++B1wK3A89wcvtVJ8f3eh0F+gcAsz7ylkraXtFGf3wy6CPLU8vc9zrWBX2/9Aa73WD9vu7Iqmv9/xFTXW6BjsqGkHSStFxIaGmBg7iZa08xWA38piKQzF2aWazgNM7uzvN5i3NA8C320Arg6+igIMDCH8M3NRvI3aS4nmpPqvF1vgY5H9NFiIMD8JKt8nB3qeXDv+vl87HCfjTb1M7X6hIA16L11Ycb3PoX5V6vN9egLk9T3uFnu+zm5Xk1/y1+zJndTjOla99Lj/uVy05lJH/U4bkq5nEv5GmauzNW4TXPe95XD1qCC4TfYq+P7DeKsm1+FWTHdNjWrnT2MMM01uQ/ZJvXpiznTbObanJ9icsya3E0n680AsjejPprrvh2WQAc9bshxm+qYmXBRTzdQa8CBxp23DwMeATyUtNF1Yxe2SdLq1p+BC4GLzOy3uZGz6fMoztX2Dsltehhwb2AT0paDCeAW4I/A+cDPzezqskP8/g8E/snvIa9ctkh7uE41s9VFnG1+3x14kt+fFR3f8ut8Z7qxrMW51wdeAmxVtCk/2VYCJ5vZjTWxvRsBLwK2rBzXAFYAnzGzm2crxlbSpt7OjYunb47pXQacZGa3z/ABN+H/7wQ8CtgT2Im04twq5O5y4AKXu0unI3dFv+8N7F0ZU/wap3t8csvMJl32lrjM/R+fD/cirbyfZmYf8XvY3Mdko+K8WU5uAz5lZsuLNuTY4d2A/Wu0pxbwRzP7wgzGrQU83+fKZFVbAj5nZlfVyFcL+HdSjHl1rvwD+Ey+x4Iz8rjt7uO2eWVu/p4Uh/5TM/t7rzGr4aItfc4/CngQKcZ6vWKO/AP4tc/7893/ysDbwCoxnPeWdLSkSzU4Vkn6saRDJG2Yb2wmIT855Mv/vrukIyX9ahptulHS5yTtWbm3VT1+PynpPmV/FO9f7HOd8ysDNx0TDEm7TnEf+xcCWa6uPnyK455e+f1Qq8CVkLZ+eEKP46ZaBd696JO9JH1B0q0DjvFKST+ajtwV/X5On/MeWvxuc0lHSbqkx2+/WZz7qVO09xGVNuQxPabPMTc5+Q4rX/eQtKzP+V9XGa8857brEWeesX1xrcdK+pKk2wYct2slfVzS/ar3VeGi+0s6XtKV05j3f5T0n06aa5nxjR4aVseX7d/hGt3bSCmTyt3+/V5Lgb2ATwI/l/RMM2tnLWoY/4yZyY9/OXAx8H7gIf6TQdq0FfBvwHmSPuYTZKVrR21/qpXvd/TxCeXd/auL8+e/75wFRbeu/avoRlz0Uv3blXto+9O2zdyEW1XbOFlce1gsl7SRpI8DPwKeQ9o/N8gYrwc82uXufEn7T0PuVtWMaf4sa2b/AvwMeB/wgEqf598ur+mjiR7t7dWm3Icra8ZxOTMLYGi4bFflpIxY6XXcbT3myp3ACn84fAb4AfAs19QHGbdtSHtXL5T0ujxeBRdtKukY1/Jf6drrIOftkMIR3wX8TNI+vkjYrDWBixRJu5E2a+5eDGL2rQyyP0t0Q38eCHxF0oeB15vZxHSzFXsnbEFKo/TsQkiyk3U6bWoA/xfYlbRJdbUfr0KttymErLxmee0msxNd0+zR/uaAx6liOs9VxE+zh/9lGLLNfb8zKaLlMQXBDCN3DwK+LOl4l7vVU8hd3ZjmPr9Z0tOAr5BiebPsNWp+26jpo+mOQW5Lpzi/FdecKRoVme8nd9V7qZsrq5xoPuQugTwG0xm3trtTjnFt8tXORbsCp7m7oeSiQfeJdgoi/KakQ83sM5nrWjXk92jgLFKw9mRx0+UJy5UcK1Z3VENK+YlyOHBvSf8GrBowaWYmv7sDX3e7P3dAq8/NWs2AWzF4k8DjgS/QDU4PrFtkOfqM+3GrxFc3tqqQQp3cvaqQu5XT9IHmcz3NfXJLvF2tPs53jdmY4Zr3F0kJOSYr/dNh7dXf6kptns+ZCA8HrpL0VeBc9ztO0A217HfuRs3cbxTydJKkG8zsG5KajYJo2pIeApzt5JcH2ios3SiedFUtIz/t2jXkMwE8Azgp/34K34wVzv2znfwmejxl28VkaLFmlpHcpnICtfzvnYAtZqC1BGZ/Qm1SaD7luNWNbY6r7dSYbqXc7efEyhCaGMCLXU5UIdh2RdthTB+oGzj5dQrya1e0wFaFN9pTaL7vBM5z8mt7v1rBQ/Q4d68V9GYhI5+QdDeg0yqco5sBn/NVxHaFaVU07k+ujf2QtLN9gpROfRfgcU5y21TMIfMbmCDFRF5sZh9wW7yXv8hc+zvOTfGJGuFSRSh/DVwC/NVN2y2AHV0t36YQ3EYxcSIhxGihJJNyfK523+9VpFXmnHLrn4H71vyeitw9F/ilmf33kLsSSnOxXWOC5YfzNWM+bqpoz3/wMbvDNcV7uu++2cNlkvliI3+pxrWTj/2Nz/WVzkH3AXYryK7OHTHpZP0qM3tby4mmLend7herqrD5osuAtwKfNrNlNR1wIXC6pLeRguSPqBGcrHm9Q9I3gN/XLU0X5vhTgUN7mB2l2vt14BjSFpSVNdrktk7Mb3BCbM+ivy4wN2ZVFuCLgA8A55rZTTVjuznwROBNwMN7CH7Lx/ztLneXDEGCVpmAfwG+SnL4X0ZanGgB14xpqJtV5vpp7su9pOQLSUtdWTrC57ZqfJF1/uQ8rpOkLEQnAn8ys1XFuTd2X+GbgKcUFp9VLAMBB0v6YD7wIb7E3a5shchbE66rbB9p5UpXxauZl/H9Ny/27LeTlXPmpfQzMtnVmb+Slki6qHJMuUWj41mED6sc26q8ylTuW0s6q8c5q9s/bq/JopzfT685R/77h1UzfqDH59TbYCb8/Zn5Psv+k/SwHqnt8xjuW/n9XGyD6RTHTXcbTHmO3Jfvz1s+8jn6jO0SSccWY9Hp0X9fyv3tcpb7/WsDykVb0rvytooeY5nv9alT3OsjK2Ofx/R9Rabt6jj+LSdUGFK+7unzWT3m5Wsq95BdUfcqtiN1+oz9CknPr167Ol7++cv8vtpTbGXpFDz0pGpf+7kblc+P7dP3+XzPzge9ulAbrcLAdwLPMrOfupCZmU369oJO8Wqb2WS+WTM7CTiqouqWDHyApF1d02tUtD8BT3Y279SY49nv8mIz+1guNVi0rXy1XdBbZnYjaRX5SxWfQGC0TKkm8C4zOwqYLMa23WNsm8Ckmb2WtEWlWbMYkcd7X0kPdqujMY02ddytcpCZvcU3ldcpAjbG4wbwEjM7o+gbc34ox6shaYmZfQL4cOGO6nVeuYZ9gJmd6zzUqMhEJ8uCf/5a4LvFAgiVxROAxzckbefmITUrLA3gf8zsJ97gialW0Fyw2k5kx7mJUDYiO7bXc39g1TGdz39QIXjVxjeBD5vZqa4hZAJWjzbJyTnf36FutliQ4EghL7J9x8ze6uNlA4xtmxRj2zSzNwLfqxH8PNZLSftBhyHlt/jk7qcIaIzH7fNm9jnnism6cfPxyhzR8AfWTRX/ITU89IGshDkPdXqcuw3kze//Rf1+y/z/gxrA033ho6r9NUlhRh9x1VyFptX3RXeVtwkcW+PozNd4YrkQkp8WHmb1WNbe76PC0fxf3oGTgwpd7hwzu5W0uTtWfkcLDXdov7HyQB1kbMvfHUV3r171/Lh/iAEffnkC/gY4rtA2I5Hpmv3aAY514ukMOF7mmcW/12M88ny/ATjB5/sgvtVMvD91RaeqYeZ5f58GacMpFfbNF/m6mf2jNDkGfHWcpdvAN4ErKo3IS+EPArbNcZCFgD6EbsEYatr1OU8BP0xca05N9FVSDGkjtMCR0SIMOM/MfjnMQkI2sczsItIWCqvRAgF2kbS9y85UD8EsX5/IsclBfms9IAz4HWl3x3TSfeXw1l/0OTfAD83sep/vg5BrjqueJEWPVPktj/nWLVKkRlVDy3/f6o7apQwX3tRwv8nNpNXX6orRZqTqYn+vXHenYsWnVfHjAJw7rK/FO6dlZisknefXCoEeHXxzhn60pqQ28B3gCTVjK1LEwS6kldx+WkXWQFYCP4jylX015AuyP38a2ZJyeOsVPazEjJ8O0ff591fWEGDGBi0noKofLhPNYcB/MHvbRaq+PiPt5fpZ5ebv2UMYc7aHS7zjhtXccmzoxaSMJoF1jzz+F/nYDnuePKkurchyvkZ+qG47xaQrZe5vwFUzlLnFijxQV1fM4eng1im+v3wImcjjelsfAqRFNxKiF2HN9V65LWs6c/M+v19GSqUzs9mWOvSaASZBYP78SG2SQ5wZaOX5uH8U2klp6ubvN53GuW4p01bFUNUSze0zOMfEDAlyaLSmILgOs+Mfsx4+nybd6I6yili/QOfVs2iyrhpRIhhHLcJ8bCdn6ZwT9I/0mU45iOU1MhpYc26vmsNzz5nW3WJtP9t8aYDNCvtrwCfCBgyeCWIqbDyCArXBGE+i9Un+5tnAhlPIyXQm7MQi6uslRC2gNQjwBuAeNWaCkeL4rqSbqWG20QZ+XFwzk20/M2gTUlzvTFTuvMP93jM0t+qwdMhQqNz321TGYFyQtbXtgEtncO/ZB3Uvunv/6vzbt454X/SSj0FTTPXCpgOa/2NDgFfUEGCOvf2umb1yXlSAtP8vC+rfaszBLMxLgIdJupxucPMw17srI+8QWN1HQLcibfJeMd0mOSnvVkyC5hjJYn4I7Qn8vxkQYD7PP1eItXzIdugmLRglkzbf88opLIQtZyBf96YbGz1O8tXzafmrGkHIArOfpI2LuMmhhLLXsTWf5zb8iW4uQtV8v587ozVEWxpAx9Ph7F1DtIPg9j7Cu72T4LSf+n5PjxlTWbRC5pozIKaOH79vn7G9jVSPope2ta6xvIcCINfe7jNV5bheD33S1qBA0cHn1nR2XpHbHjjY9/W0hklpXwxUWdPD8oCUq2qF2fhbunsDe8UR71xNbz0gcqzxIaTN1tNJF59/V6c9lCF+e/k9Ngfso0Z6046kzCaM4dM5a2YPB546zNj6/k6RQjsfXGP+5hjyX+XCUiOmAWYyvrYib6XLqAHsMeAm7nIOyiOsntXj3GNLgN+lu1mwU/PEOVrSfT2V/ZJpVjprZGLLsXtTbSXwjZQr3Qyqa1OH5OA+rnqdAdqzxO9jV1JqrGHzAV7eQ4jyfb043+NUD4wcAeO/fztpYWacC2eLlBZ9s+mQoPtdJ710wvv6EFtOnzaKD5nc5st6aK/5/4M9Bl4DyJcBS1yJeR2pAmKbSAWXOtRzdZ3C2kv8WdvaCviqpB2dPHLqq7XM2vxZkREmk94rvLrXJkXY21Ra1qmsnWQxC20HeJqkD2ZyzSlxKtXjqu2ZkPRPwJl09xraEAJ6CSlLTrNH2/aR9O8eitMs+6tHH01KegWp7OA4J2nNY30/4GRJS50EBxnbtpcUPZVUV0SsvfG+QdpH+sURNX+zLP0euK6mjVlLvj/wpiIJxBr9U/aLKyCrvZrgG4gkwGsKnAvUCcCNrL2Lu+zw70s6oEh9lXfcZ0K8q3JbMal3kHQy8BFSda9Tirxk1sNPkbNEnEc3k0xduvM28FpJJ0naOqfEKTWvmvY8zjXeBwwjCDnlDqnW8KXUZ6vJWuoJkg4ss2JUXrlN60k62vuoLoHjOJJgG3gm8C1Ju5VjW1oRlX7cDTiHVL+jTsPJfXuSmf01VxwbKSdoN4b1dpf/fvL1dkmvLVJNderkywnyMOAMurVzw/wthK1hZtcBb6Y+PVQmoO2BsyR9R9KBXid0SUGIHSeeLSU9WtKHSNl8s1azmlRY5vgBBC+byW+mu8pbl9+tTSo8/Quv1bqzpA3LieLtebykU0hZJ3ae4VMw+xBPo35jbBawDYFTJX1F0v6eiHJTSZt4YtYHSXo9KRD8baxZUGrckcf2CaTylh+S9Egv20DxkNvUE8EeQ8r8kQubN2vIr0Ha8vXeEfT91VlAp1Nf5KesDvdBSd+XdJCk7SVt5vK1laT7OfH9iJSZeX3Gb2vVlMimQ9PMTpT0eFLV+Gr9jUbxBP0Xfy0D/ijpWjcHl5CW53ci7eUqHbc54qMNHCbpr8AH/FHe6aUFmtn5kt4H/Cf1NUHyRLmP+33eDfzJQ9wm3Z+2Y6U9JfkNQ4TZP3cK8Hq6xWDqVuxwTeaZ3kfXebs2B7bu06ZxfUqXlQXz2G5KqhJ2OHC1pKu8L9f3h/KOlX5s9jnnK83s2lFOWZ8z2gDfcAXi4fTestIh1eF5nCsY15I2eOe9slYjU2FllASYO8jNzpeSgsQfT3cbilUcsHnVdBNSsaFegtxhzU2bZfnMtwCfzCtxPRZFsq/wHW6y7k+3NJ7V+N3k393fX73aU/oUG0MIaDZTbpb0JifCNvWl/ijMsQ3obrym0pczIeTFhHKSlrVrM7Ht4K+6h1Jd1FKuENYC3m1mX1gg9Toa7q9+nbuBeslGo5ChpXQTm5QEWa1kF/6/Sgdmk0JmttyJ5ssF0bRZ29HfKASzWmG+LBxTRpbkkDsBrwBuyn7DXkRTCPBBpNKYS6gve1edLO0+7ekUk+2SYUwh9wU2zeyzpJTeeWNpp4c5Z0XbOqwZ89wo+qdB2gP5+x5m/2LW/CBFHl1INxVaOXbUjG2n0sdV4sslUD9gZm/xFeWRz+ZSWEA/BI4s7r9XucdGD/kq58WE/381aZvZOMlXfwIsNBtzB+yz3ey8sxCuyUrnlrWAy3qtVtG6JgtBvBrY18xOZoDkhpkcnZj/lVT5rawdWiWdsk3NGvKZLPxsr3ezuVeN0qnQcSE9wtvVKiZup4dvsFHx83UqE/UiUrbiv/QQ+Kk2f2sK03I+j2Max+X7vIGUofy84gFc9md1bBs1Wn67IIYVwGFmdlTeAN9nC9Yw9zmoST9UH/lD9hiX1Sz3kzVKSS/5KpWFJT7/nkpKA9eLUIfth5mSqeb5vABrbkcpNzqb2XuAR7ozdmUxwa1G6ytfkxXTrkXaef8RYE8z+9Z0VuAKYp40syOBJ/kEKQu0d6ZoT9mWK4B/M7MPklbFhn1Ky4XUvF0voBs33Sgm72SPNpVm3irgY8ATzexK93t1KpOo1HamMh81jeMafY6zGRzXmEY788NgE8/8+xR/qNzJmhmLBhnjrPGcCTzCzHIqdU2xh7VZcy9iZiGJzSH76K76Fv6Q/SCwD/DLQtnoNw8na8bvNODRZvZ7uiUwqvKlKeSr0eNexMz2VA4rS4OOgXqdu9VL63KSugQ4UNKDSdtY9iMtcmw0wIXvcHPuLFKxlMv9vI0hUp1nYm6Y2feA70l6GnAwsBcpgWq/TpogbVs5lbQN4mafFDNyBBcrzQ0vlnMO8ELgQPdbbjjFKf7izu6Pm9mvc/9431V9WjlLyvIeT7ZV9K6JC2nRqg4rWHvPXEmYy3o8UXuFa5XjX4eVlXaVfy/3vrwTONK3UB1CiuzYkamzmFxBygR9spmdX8hxewq/Iz36vFW51+nijpp7La+5YgAZy+6Wc7007fNIOx8eSsqo3g//IG37+riZ/biQr5tr7nXJAOO2ukZOpjpuEKzo0U+tQfupD5Z5f69XMwarB4lSWKPgjO+32sWJ8J6kFc2sxSzzSX0lqWjxH4rjmlOYIIPpsxWBlrQ1qYbILqTV4K3ppuK/nrSr/rdmdnFxzFLfHHoI8EnWXGUrC8E/1MyuGCTNd027HuAkuDMp2cTGTlC3A392Qr7IzG4r+kcu8DsC93XitnLASKnHV9Vdn7RiuAlrhvfl436ea1rUHPcIf6hV3QkrgV/4frLqcS23ENZn7Q30y4ELexy3xK9XHiefSFeZ2WX54ZT7U9KGfm+7eb9s6Q+EPMZ/Ju3N/JW7S2plt8e4mT/I/gnYtdLnuV1/NLO/TDchao97LfvoF4NaQlUZlLQTqZzFLqTMN5sUcnul+5Evco16jf6QdA+XzckaJeBCM1tWd6+SHurza7LG53qhmd0xTNLYYWVpwHHdxGXHarTOmwc9WWOImNu7JtigoWpzfd4iIiMXfT6kphh2z8Log3R6vsa67p9FsTIyhNwVlQkXY38MI1+Nxdofs4GBEiNWnjyNGvanhmHzbvQ52XJQaAdGfV1h69WWGdSbGMQv2J5GP9X2Tz/zvF9/9hP0BXLcGvtCi831dX6guk29Q8vbFNlVNGzUyLB9NIvy1Znmvfa00qZwG83IupvNfprOuLaGmOQjFz7ECCYPmEk/DXvssIIy6sfNxxjP1TXmUAHozPe9zuXcn8N+6nuvYXoFAoGxRRBgIBAIAgwEAoEgwEAgEAgCDAQCgcWNca8PmleI2pXPho0PHo2bSkv/d23m7bOtIf9ujd9Ujl/rsCJaqF+427RX9oqtENVaK6psienbtvI3vVYuy/C4Kc5Zd/5+IWxTtXON+wkEAa5LrEc3sL6KzReqhjxIxbxix76GOb4fuVSIlKn2hxW/a8/GvZW/6RWZUNlvOK0Kg4OQ11TnHCZiIhAEOJuaH8AFwLeorx3xd7rVuRaEoOZwKa93/AlSqNgLzOzPZShVESb0NuAA4CfAq/yzpd4ndyeFV1U14yPM7GzPzvw+UozufYvf/NXP9/UiHtf6aaGFRvkkUtWyR5MSQtxKypBzspmd50R5Nimv4iasmVWnARxtZidJeilwGHCmmb276Jf8vhWpGuJnzexYSa8GXl2cZzUpBGtjUihc/vwI4HfAF/zhWY31XgY8zVPu/zNwFClkNJdJvZZU7OtUD/kLEgwCXCcaUsffLyTVkBjkab4gbs3ftyEFy0PK7/hBn8Cdgvw2A/6DFKecY4czye3ln32fNeNijZTZByeHl5PiKc8mBcMv8Qn/euA/JZ0FvLxX4tuiLdsAn/axuAX4tRPpeqQ0aL8jZQACeBQpFvicGgK8xf/f3u//wZK+ZWYXV2oNL/Hv8zlvpFvjxUgx5Q8l1cy+pngo3uaWwUNJMeaXsmaW5eWF6+SBpMQFFwHfdCvj/qTyB0dIeoaTeiPM4cA685XlWNyaV3MB3k+OcX6ppGWSLpV0YRk/WsRDP1fShKSLJF1cHLtE0nLPbNPvWlt7DPWJNd/dTdL/eEz1DyWtX60iWFQx29zbkKsHblY51+aS1iv+v0bShVO07a3etmsk/biokpYLcm3j37+nx/H/6t8/tua7Pf27w/qZ88U5nlH5fh9JbW9Xo666YmD+MNarwDnnmscJV18LuTbvJq61fAt4GLBr4bzPixgvImVf/o2blBtUNMn1nQyXSFpa/F2WOGgCG3lZxqX+3jSzG8zsNaRiPHsDL/RrNmo06/d4Gw80s4+a2W1O0vlct1ay3xiwnlfTq7YtE+VSUlaX97g2+1LXssqH2l0JVf3Ylp+zBWzh32/pn6/v3zWKYzf148p+ahVWVe6fLYpzNM3sO6697gFsESZwEGBg9rGlT8QfOBE+O09c94FtQ0qwmU3XDahPZjHhKbQmir+r5louvziZS4DmOrWkIlV3OtlmUzWbvrkdLwG+Z2an5+P8oZTPVachKbepR9smSamVvk7KfvweT5vW66G2xj0Uv2vnz/27TuWYNa7vv1VNW8vCTHifd1gA6fmDAAMLEZs58XwfuBx4btb+/PtnuHZyBt0KaxtU/Iga1geaicDM/uEE9GBJm5eJbf2nj3Q/3xdzqcqqPyyXOK0h506ftuVzrCbV1NgK+O9Z9rW1/fpTWQrLndBXeaGjXUnJhb9lZrdEKrQgwMDsYxufnMuBL5KSXz60SCp5CHCZmV1daDtLC/NuOfAYz4m4rHi/iu7K51R+q+x3vI60YLJpzXG7OdFeMg2SXQE8UNJtlbbdSHe1NV9jM88g/nXgkMKnNxP/bj72v/y6yyTd4u9nFH2c27CHpKdJeqakN5BWny8lLYQMtE0oMHdoRRcsWg1wtU+wL5MKXD1T0i+B+5FWUt9W2ax7D+BvdMuL3kBavaymuR84M69rfC26NVvW+gnd2inTIaDb/L7Ktk2QspKvqSqme3wjqZbMsZIeOc3rUWPSQqooeGnR/ibwy2JVNysXrwVeVxz/V1Ltl+tiBTgIMDC7yJNzW+A2J6C8peQAM3u7pCf7b8707/9a0WzkJvEFZnbIANeiB+m03by7j5PpzU6KnWIh5RY/zw6Sfj7gPa5PSp1/SM11q5EkOUnnpZLeCxxNqtnyuRn0cSask83sYzVtyISfNevDSXVxlrjr4YPAqZL2cxM9ECZwYLYI0ElgI7z4kJtkp7vZuDWpsNXFpBoaFJNw6wq5rVezCtwacMtGJqJ7u/n9EzNbWePvutg1qKfUrRL3Id4ldavAvY73PvkAqXbIe/1eV9At6DOUll2zClxnWt9gZteY2dVmdjxwgmujj608DAJBgIEZMF/eaNx0E7gs+HK2v78UeDBwWmF6Xe/vg5QIrSuTaXn7hxNky1dw5RpXAzixOB58QzapQPdvgedIepAvEjT8PHlbyXTQs4SnV5o7wrXjl5E2P8/EAlKP+VR9QCz1e1rfye5zfuxTQmrDBA7MPjZ0MrvDibFB2ut3JckXtRr4fPH7XCnuXgVJpZKBNVXkKgQgYGW1YpdX4vpv4CDgK2b27VyY3LXSXPR7laQjgW8DZ0t6vpn9nP7bQ4y09WRVzXe92tv2631D0ldIK8PM0ARdlrfBTEWUrum1fVvPpX7d3b0v2hESFwQYmDlyKNsGpBXdv/vnS8xsuU/81wJnmdnfJS3xCZzDx5YWWswqYCdJbynO3fbvLjazb7rsGGmLy8H+u01JJUoPIO1FPJnuauca21l84jfN7BxJL3At8XxJ3yfFEq8irR4/HviUmX3Cz7Ma2K5H2/5kZl+gfoU6b8F5g59zswHIq1c/A+wraQvWLBZuwJfN7NKaNuQwxNsl/ZC0yr6NmV1XjF0gEBjSBM5RDbt5ac/j/P+lvpl4T0lXSdo/f+7vD/AwtP/x/zeWdJ1647P+u20lXVH5ri3pckmfkvT40jwfoN0PlHSih6+VJUp/ImnffB5Jl/Vp2zn+u7f7//erXCOH+73Jv39X5fP8/hL//hn+f6v47jHqj4P8d8+r/J+jW0zS4f7dc8vrBuYf/x+gVsrt5eckPwAAAABJRU5ErkJggg==';

function gerarDemonstrativoPDF(r, competencia, assinante = 'Guilherme Marques', cargoAssinante = 'Gestor Administrativo') {
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFCtor) { alert('Biblioteca de PDF não carregada. Dê um Ctrl+Shift+R e tente de novo.'); return false; }
  const brl = window.__repasseData.brlR;
  const doc = new jsPDFCtor({ unit: 'mm', format: 'a4' });
  const W = 210, M = 20;
  const navy = [7, 38, 84], blue = [37, 99, 158];
  const ink = [28, 32, 40], soft = [92, 102, 116], mute = [140, 148, 160], line = [228, 231, 236];

  // degradê horizontal (retângulo de cantos retos, via faixas finas)
  const gradH = (x, y, w, h, c1, c2) => {
    const N = 80;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      doc.setFillColor(Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t));
      doc.rect(x + (w / N) * i, y, w / N + 0.4, h, 'F');
    }
  };
  const setInk = (c) => doc.setTextColor(c[0], c[1], c[2]);

  // ciclo cruzado: convênio no mês da competência + particular no mês seguinte
  const compConv = competencia;
  const compPart = proximaCompetencia(competencia);
  const anoConv = (compConv || '').split('-')[0];
  const anoPart = (compPart || '').split('-')[0];
  const temPart = r.rep_particular > 0;

  // ── CABEÇALHO (degradê full-bleed) ──
  gradH(0, 0, W, 56, navy, blue);
  try { const lw = 22, lh = 22 / 1.3974; doc.addImage(LOGO_EQUILIBRIUM_B64, 'PNG', W - M - lw, 9, lw, lh, undefined, 'FAST'); } catch (e) { /* segue sem logo */ }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(21);
  doc.text('Demonstrativo de Repasse', M, 23);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(214, 224, 238);
  doc.text(`${r.nome} \u00b7 ${r.categoria || ''}`, M, 31);
  // pill do ciclo
  const pillTxt = temPart
    ? (anoConv === anoPart
        ? `CONV\u00caNIO ${mesNomeUpper(compConv)} + PARTICULAR ${mesNomeUpper(compPart)} / ${anoConv}`
        : `CONV\u00caNIO ${mesNomeUpper(compConv)}/${anoConv} + PARTICULAR ${mesNomeUpper(compPart)}/${anoPart}`)
    : `COMPET\u00caNCIA ${mesNomeUpper(compConv)}/${anoConv}`;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  const pw = doc.getTextWidth(pillTxt) + 10;
  try { doc.setGState(new doc.GState({ opacity: 0.20 })); } catch (e) {}
  doc.setFillColor(255, 255, 255); doc.roundedRect(M, 37, pw, 8, 4, 4, 'F');
  try { doc.setGState(new doc.GState({ opacity: 1 })); } catch (e) {}
  doc.setTextColor(255, 255, 255); doc.text(pillTxt, M + 5, 42.4);

  // ── CARD: COMPOSIÇÃO DO REPASSE ──
  const cardX = M, cardW = W - 2 * M;
  const isPerc = r.tipo === 'percentual';
  const rows = [];
  if (r.fixo_mensal) {
    rows.push(['Base mensal', brl(r.base_mensal), false]);
    if (r.desconto_falta > 0) {
      const lbl = r.desconto_por === 'dia'
        ? `Faltas do profissional (${r.faltas_qtd} dia${r.faltas_qtd === 1 ? '' : 's'} inteiro${r.faltas_qtd === 1 ? '' : 's'})`
        : `Desmarques/faltas do profissional (${r.faltas_qtd})`;
      rows.push([lbl, '- ' + brl(r.desconto_falta).replace('R$ ', ''), true]);
    }
  } else if (isPerc) {
    rows.push([`Repasse conv\u00eanio (${mesNomeLower(compConv)}) \u2014 ${Math.round((r.pct_conv || 0) * 100)}% ap\u00f3s imposto`, brl(r.rep_convenio), false]);
    if (temPart) rows.push([`Repasse particular (${mesNomeLower(compPart)}) \u2014 ${Math.round((r.pct_part || 0) * 100)}% ap\u00f3s imposto`, brl(r.rep_particular), false]);
    rows.push(['Imposto retido (13,33%)', brl(r.imposto), true]);
  } else {
    const vf = (r.valor_fixo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    rows.push([`Repasse conv\u00eanio (${mesNomeLower(compConv)}) \u2014 fixo R$ ${vf}/sess\u00e3o`, brl(r.rep_convenio), false]);
    if (temPart) rows.push([`Repasse particular (${mesNomeLower(compPart)})`, brl(r.rep_particular), false]);
  }
  if (r.holding > 0) rows.push(['Holding', '- ' + brl(r.holding).replace('R$ ', ''), true]);

  let y = 70;
  const cardH = 20 + rows.length * 11;
  doc.setFillColor(255, 255, 255); doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.3);
  doc.roundedRect(cardX, y, cardW, cardH, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('COMPOSI\u00c7\u00c3O DO REPASSE', cardX + 8, y + 12);
  let ry = y + 24;
  rows.forEach(([label, val, muted], idx) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); setInk(muted ? mute : soft);
    doc.text(label, cardX + 8, ry);
    doc.setFont('helvetica', 'bold'); setInk(muted ? mute : ink);
    doc.text(val, cardX + cardW - 8, ry, { align: 'right' });
    if (idx < rows.length - 1) { doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.2); doc.line(cardX + 8, ry + 4, cardX + cardW - 8, ry + 4); }
    ry += 11;
  });
  y += cardH + 12;

  // ── FAIXA: TOTAL LÍQUIDO ──
  const bandH = 22;
  gradH(cardX, y, cardW, bandH, navy, blue);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text('Total l\u00edquido a receber', cardX + 10, y + bandH / 2 + 1.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text(brl(r.liquido), cardX + cardW - 10, y + bandH / 2 + 2.5, { align: 'right' });
  y += bandH + 14;

  // ── DETALHAMENTO DOS ATENDIMENTOS (convênio) ──
  const det = Array.isArray(r.detalhes) ? r.detalhes : [];
  if (det.length) {
    const H_PAGE = 297, BOTTOM = 20;
    // título da seção
    const tituloDet = () => {
      setInk(navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Detalhamento dos atendimentos', M, y); y += 2;
      doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.3); doc.line(M, y + 1, W - M, y + 1); y += 6;
    };
    // cabeçalho da tabela
    const colX = { dia: M, hora: M + 24, pac: M + 42, conv: W - M - 48, val: W - M };
    const headerRow = () => {
      setInk(mute); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.text('DATA', colX.dia, y);
      doc.text('HORA', colX.hora, y);
      doc.text('PACIENTE', colX.pac, y);
      doc.text('CONV\u00caNIO', colX.conv, y);
      doc.text('REPASSE', colX.val, y, { align: 'right' });
      y += 2; doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4;
    };
    tituloDet(); headerRow();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const fmtDia = d => String(d || '').slice(0, 5); // dd/mm
    det.forEach(a => {
      if (y > H_PAGE - BOTTOM - 8) { doc.addPage(); y = 20; headerRow(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); }
      setInk(soft); doc.text(fmtDia(a.dia), colX.dia, y);
      doc.text(String(a.hora || ''), colX.hora, y);
      setInk(ink);
      const pacTxt = doc.splitTextToSize(String(a.paciente || ''), colX.conv - colX.pac - 3)[0] || '';
      doc.text(pacTxt, colX.pac, y);
      setInk(soft); doc.setFontSize(7.5); doc.text(String(a.convenio || ''), colX.conv, y); doc.setFontSize(8);
      setInk(ink); doc.text(brl(a.valor), colX.val, y, { align: 'right' });
      y += 5;
    });
    // subtotal / holding / total líquido — fecha a conta até o valor do topo
    const somaDet = det.reduce((s, a) => s + (a.valor || 0), 0);
    y += 1; doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 5;
    setInk(soft); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(`${det.length} atendimento(s) de conv\u00eanio`, M, y);
    doc.text(brl(somaDet), colX.val, y, { align: 'right' });
    y += 5.5;
    if (r.holding) {
      setInk(soft); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text('Holding', M, y);
      doc.text('- ' + brl(r.holding).replace('R$\u00a0', '').replace('R$ ', ''), colX.val, y, { align: 'right' });
      y += 5.5;
    }
    doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.3); doc.line(M, y - 1.5, W - M, y - 1.5); y += 2;
    setInk(navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Total l\u00edquido a receber', M, y);
    doc.text(brl(somaDet - (r.holding || 0)), colX.val, y, { align: 'right' });
    y += 10;
    // garante espaço para aviso+assinatura; se não couber, nova página
    if (y > 297 - 20 - 80) { doc.addPage(); y = 20; }
  }

  // ── AVISO ──
  const cicloLabel = temPart
    ? `conv\u00eanio ${mesNomeLower(compConv)}/${anoConv} + particular ${mesNomeLower(compPart)}/${anoPart}`
    : `compet\u00eancia de ${competenciaExtenso(compConv)}`;
  doc.setFillColor(244, 247, 250); doc.roundedRect(cardX, y, cardW, 30, 3, 3, 'F');
  doc.setFillColor(blue[0], blue[1], blue[2]); doc.rect(cardX, y + 3, 1.4, 24, 'F');
  setInk(soft); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  const aviso = `Este demonstrativo reflete os atendimentos registrados e conferidos referentes ao ciclo vigente (${cicloLabel}). Caso identifique qualquer diverg\u00eancia entre os valores apresentados e os atendimentos efetivamente realizados, entre em contato com o setor financeiro no prazo de 3 (tr\u00eas) dias corridos para a devida an\u00e1lise. A institui\u00e7\u00e3o reserva-se o direito de revisar, retificar ou compensar valores em pagamentos futuros mediante comprova\u00e7\u00e3o. Decorrido o prazo sem manifesta\u00e7\u00e3o, os valores s\u00e3o considerados aceitos.`;
  doc.text(doc.splitTextToSize(aviso, cardW - 14), cardX + 7, y + 7);
  y += 42;

  // ── ASSINATURA ──
  const cx = W / 2;
  doc.setDrawColor(ink[0], ink[1], ink[2]); doc.setLineWidth(0.3); doc.line(cx - 35, y, cx + 35, y); y += 6;
  setInk(ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(assinante, cx, y, { align: 'center' }); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setInk(soft); doc.text(cargoAssinante, cx, y, { align: 'center' });

  // ── RODAPÉ ──
  doc.setFontSize(8); setInk(mute);
  doc.text(`Grupo Equilibrium Med Center \u00b7 CNPJ 34.032.586/0001-98 \u00b7 Gerado em ${new Date().toLocaleDateString('pt-BR')} \u00b7 uso interno`, cx, 286, { align: 'center' });

  doc.save(`Demonstrativo_${(r.nome || 'profissional').replace(/\s+/g, '_')}_${competencia}.pdf`);
  return true;
}

async function baixarTodosDemonstrativos(resultados, competencia, onProgress) {
  for (let i = 0; i < resultados.length; i++) {
    gerarDemonstrativoPDF(resultados[i], competencia);
    if (onProgress) onProgress(i + 1, resultados.length);
    await new Promise(res => setTimeout(res, 350)); // evita o navegador descartar downloads em série
  }
}

// ═══════════════════════════════════════════════════════════════════
// Aba PAGAMENTOS — folha (5º dia) + repasse (Dia 20), com status e histórico
// ═══════════════════════════════════════════════════════════════════
const PAG_STATUS = [
  ['pendente', 'Pendente', 'var(--ink-mute)'],
  ['pronto', 'Pronto p/ pagar', 'var(--c-primary)'],
  ['analise', 'Em análise', '#b8860b'],
  ['questionou', 'Questionou', 'var(--c-neg)'],
  ['pago', 'Pago', 'var(--c-pos)'],
];
const PAG_GRUPOS = [['5dia', 'Folha — 5º dia útil'], ['dia20', 'Repasse / Produção — Dia 20']];

const PagamentosTab = ({ companyId, userId, colabs, D }) => {
  const hoje = new Date();
  const [competencia, setCompetencia] = useStateRP(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [lista, setLista] = useStateRP(null);
  const [msg, setMsg] = useStateRP('');
  const [addOpen, setAddOpen] = useStateRP(false);
  const [novo, setNovo] = useStateRP({ nome: '', grupo: '5dia', cargo: '', regime: '', valor_liquido: '', conta: '' });
  const brl = D.brlR;
  const inp = { padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', fontSize: 13, background: 'var(--bg-alt)', color: 'var(--ink)' };
  const lblS = { fontSize: 10, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', display: 'block', marginBottom: 4 };

  const carregar = async () => {
    setLista(null); setMsg('');
    try { setLista(await D.fetchPagamentos(companyId, competencia)); }
    catch (e) { setMsg('Erro ao carregar: ' + e.message); setLista([]); }
  };
  useEffectRP(() => { if (companyId) carregar(); }, [companyId, competencia]);

  const patch = async (row, campo, valor) => {
    const p = { [campo]: valor };
    if (campo === 'status' && valor === 'pago' && !row.data_pagamento) p.data_pagamento = new Date().toISOString().slice(0, 10);
    try {
      await D.updatePagamento(row.id, p);
      setLista(l => l.map(x => x.id === row.id ? { ...x, ...p } : x));
    } catch (e) { setMsg('Erro ao salvar: ' + e.message); }
  };
  const remover = async (row) => {
    if (!window.confirm(`Remover ${row.nome} do pagamento deste mês?`)) return;
    try { await D.deletePagamento(row.id); setLista(l => l.filter(x => x.id !== row.id)); }
    catch (e) { setMsg('Erro ao remover: ' + e.message); }
  };
  const adicionar = async () => {
    if (!novo.nome.trim()) { setMsg('Informe o nome.'); return; }
    try {
      const res = await D.createPagamento({
        competencia, grupo: novo.grupo, nome: novo.nome.trim(), cargo: novo.cargo, regime: novo.regime,
        valor_liquido: Number(novo.valor_liquido) || 0, conta: novo.conta, status: 'pendente', origem: 'manual',
      }, companyId, userId);
      const r = Array.isArray(res) ? res[0] : res;
      setLista(l => [...(l || []), r]);
      setNovo({ nome: '', grupo: novo.grupo, cargo: '', regime: '', valor_liquido: '', conta: '' });
      setAddOpen(false); setMsg('');
    } catch (e) { setMsg('Erro ao adicionar: ' + e.message); }
  };

  const totalMes = (lista || []).reduce((s, r) => s + (Number(r.valor_liquido) || 0), 0);
  const totalPago = (lista || []).filter(r => r.status === 'pago').reduce((s, r) => s + (Number(r.valor_liquido) || 0), 0);

  const [gerandoFolha, setGerandoFolha] = useStateRP(false);
  const [enviando, setEnviando] = useStateRP(false);

  // Manda os pagamentos do mês para o Contas a Pagar (fluxo de caixa).
  // Vencimento: 5º dia útil (folha) ou dia 20 (repasse). Não reenvia o que já foi.
  const enviarParaContas = async () => {
    const pend = (lista || []).filter(r => !r.transaction_id && (Number(r.valor_liquido) || 0) > 0);
    if (!pend.length) { setMsg('Nada novo para enviar — todos os pagamentos deste mês já estão no Contas a Pagar.'); return; }
    if (!window.confirm(`Enviar ${pend.length} pagamento(s) para o Contas a Pagar?`)) return;
    setEnviando(true); setMsg('Enviando...');
    let ok = 0, erro = 0;
    for (const p of pend) {
      try { await D.enviarPagamentoParaContas(p, companyId, userId); ok++; }
      catch (e) { erro++; }
    }
    setEnviando(false);
    setMsg(`${ok} pagamento(s) enviado(s) para o Contas a Pagar${erro ? ` · ${erro} com erro` : ''}.`);
    carregar();
    window.dispatchEvent(new Event('sb-data-hydrated'));
  };
  const [grupoView, setGrupoView] = useStateRP('5dia');
  const gerarFolhaMes = async () => {
    // Nova regra (operacional.jsx): líquido do ponto p/ CLT e estágio + fixos do cadastro,
    // sem apagar nada e sem mexer em quem já foi pago.
    if (window.enviarFolhaParaPagamentos) {
      setGerandoFolha(true); setMsg('Trazendo a folha do ponto...');
      try {
        const r = await window.enviarFolhaParaPagamentos(competencia);
        setMsg(`Folha de ${competenciaExtenso(competencia)}: ${r.criados} novo(s), ${r.atualizados} atualizado(s), ${r.jaPagos} já pago(s).`);
      } catch (e) { setMsg('Erro ao gerar a folha: ' + e.message); }
      setGerandoFolha(false); carregar();
      return;
    }
    const folha = (colabs || []).filter(c => c.folha_fixa && (!c.status || c.status === 'Ativo'));
    if (!folha.length) { setMsg('Nenhum colaborador marcado como "folha recorrente" no cadastro.'); return; }
    setGerandoFolha(true); setMsg('Gerando folha do mês...');
    try { await D.deletePagamentosFolha(companyId, competencia); } catch (e) { /* segue */ }
    let add = 0;
    for (const c of folha) {
      try {
        const g = c.grupo_folha === 'dia20' ? 'dia20' : '5dia';
        await D.createPagamento({
          competencia, grupo: g, colaborador_id: c.id, nome: c.nome, cargo: c.cargo, regime: c.regime,
          valor_liquido: Number(c.salario) || 0, conta: c.pagador || null, status: 'pendente', origem: 'folha',
          observacao: 'Folha do mês',
        }, companyId, userId);
        add++;
      } catch (e) { /* segue */ }
    }
    setGerandoFolha(false); setMsg(`${add} colaborador(es) na folha de ${competenciaExtenso(competencia)}.`);
    carregar();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <window.TiltCard interactive={false} padding={20}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Mês do pagamento</label>
            <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} style={{ ...inp, padding: '9px 12px', fontSize: 14 }} />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase' }}>Total do mês</div><div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{brl(totalMes)}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase' }}>Já pago</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-pos)' }}>{brl(totalPago)}</div></div>
            <window.Btn variant="ghost" size="sm" disabled={gerandoFolha} onClick={gerarFolhaMes}>{gerandoFolha ? 'Gerando...' : 'Gerar folha do mês'}</window.Btn>
            {(() => {
              const naoEnv = (lista || []).filter(r => !r.transaction_id && (Number(r.valor_liquido) || 0) > 0).length;
              return (
                <window.Btn variant={naoEnv ? 'primary' : 'ghost'} size="sm" disabled={enviando} onClick={enviarParaContas}>
                  {enviando ? 'Enviando...' : `Enviar p/ Contas a Pagar${naoEnv ? ` (${naoEnv})` : ''}`}
                </window.Btn>
              );
            })()}
            <window.Btn variant="ghost" size="sm" onClick={() => setAddOpen(v => !v)}>+ Adicionar linha</window.Btn>
          </div>
        </div>
        {addOpen && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '2fr 1.6fr 1.2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div><label style={lblS}>Nome</label><input style={{ ...inp, width: '100%' }} value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} /></div>
            <div><label style={lblS}>Grupo</label><select style={{ ...inp, width: '100%' }} value={novo.grupo} onChange={e => setNovo({ ...novo, grupo: e.target.value })}>{PAG_GRUPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label style={lblS}>Cargo</label><input style={{ ...inp, width: '100%' }} value={novo.cargo} onChange={e => setNovo({ ...novo, cargo: e.target.value })} /></div>
            <div><label style={lblS}>Regime</label><input style={{ ...inp, width: '100%' }} value={novo.regime} onChange={e => setNovo({ ...novo, regime: e.target.value })} /></div>
            <div><label style={lblS}>Líquido</label><input type="number" style={{ ...inp, width: '100%' }} value={novo.valor_liquido} onChange={e => setNovo({ ...novo, valor_liquido: e.target.value })} /></div>
            <div><label style={lblS}>Conta</label><input style={{ ...inp, width: '100%' }} value={novo.conta} onChange={e => setNovo({ ...novo, conta: e.target.value })} /></div>
            <window.Btn variant="primary" size="sm" onClick={adicionar}>Salvar</window.Btn>
          </div>
        )}
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-mute)' }}>{msg}</div>}
      </window.TiltCard>

      {lista === null && <div style={{ color: 'var(--ink-mute)' }}>Carregando…</div>}
      {lista && lista.length === 0 && <div style={{ color: 'var(--ink-mute)' }}>Nenhum pagamento neste mês. Gere um fechamento de repasse (cai aqui automaticamente) ou adicione uma linha.</div>}

      {lista && lista.length > 0 && (() => {
        const grupos = PAG_GRUPOS.map(([gk, gl]) => {
          const rows = lista.filter(r => r.grupo === gk);
          return { gk, gl, rows, subtotal: rows.reduce((s, r) => s + (Number(r.valor_liquido) || 0), 0) };
        });
        const ativo = grupos.find(g => g.gk === grupoView) || grupos[0];
        return (
          <window.TiltCard interactive={false} padding={0}>
            <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
              {grupos.map(g => (
                <button key={g.gk} onClick={() => setGrupoView(g.gk)} style={{
                  padding: '6px 14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: grupoView === g.gk ? 'var(--c-primary)' : 'transparent',
                  color: grupoView === g.gk ? '#fff' : 'var(--ink-mute)',
                }}>{g.gl} · {g.rows.length}</button>
              ))}
              <div className="mono" style={{ marginLeft: 'auto', fontWeight: 700 }}>{brl(ativo.subtotal)}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {ativo.rows.length === 0
                ? <div style={{ padding: 18, color: 'var(--ink-mute)', fontSize: 13 }}>Ninguém neste grupo neste mês.</div>
                : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: 'var(--ink-mute)', textAlign: 'left' }}>
                      {['Colaborador', 'Regime', 'Líquido', 'Conta', 'Status', ''].map((h, i) => (
                        <th key={i} style={{ padding: '6px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: i === 2 ? 'right' : 'left', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ativo.rows.map(r => {
                      const st = PAG_STATUS.find(s => s[0] === r.status) || PAG_STATUS[0];
                      return (
                        <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={{ padding: '4px 12px', fontWeight: 600 }}>
                            {r.transaction_id && <span title="Já está no Contas a Pagar" style={{ color: 'var(--c-pos)', marginRight: 5 }}>✓</span>}
                            {r.nome}<span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 400 }}>{r.cargo ? ' · ' + r.cargo : ''}</span>
                          </td>
                          <td style={{ padding: '4px 12px', color: 'var(--ink-mute)' }}>{r.regime || '—'}</td>
                          <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                            <input type="number" defaultValue={r.valor_liquido} onBlur={e => { const v = Number(e.target.value) || 0; if (v !== Number(r.valor_liquido)) patch(r, 'valor_liquido', v); }} style={{ ...inp, width: 88, textAlign: 'right', padding: '5px 8px' }} className="mono" />
                          </td>
                          <td style={{ padding: '4px 12px' }}>
                            <input defaultValue={r.conta || ''} onBlur={e => { if (e.target.value !== (r.conta || '')) patch(r, 'conta', e.target.value); }} style={{ ...inp, width: 96, padding: '5px 8px' }} placeholder="conta" />
                          </td>
                          <td style={{ padding: '4px 12px' }}>
                            <select value={r.status} onChange={e => patch(r, 'status', e.target.value)} style={{ ...inp, fontWeight: 700, color: st[2], borderColor: st[2], padding: '5px 8px' }}>
                              {PAG_STATUS.map(([k, l]) => <option key={k} value={k} style={{ color: 'var(--ink)' }}>{l}</option>)}
                            </select>
                            {r.status === 'pago' && r.data_pagamento && <span style={{ fontSize: 10, color: 'var(--ink-mute)', marginLeft: 6 }}>{String(r.data_pagamento).split('-').reverse().join('/')}</span>}
                          </td>
                          <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                            <button onClick={() => remover(r)} title="Remover" style={{ background: 'none', border: 'none', color: 'var(--ink-mute)', cursor: 'pointer', fontSize: 15 }}>×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>}
            </div>
          </window.TiltCard>
        );
      })()}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════
// PRODUÇÃO EM PLANILHA — lê o relatório "Atendimentos por data com
// prontuário" (Mais Equilibrium) e monta, por profissional, a planilha
// editável do demonstrativo (convênio + particular + total a repassar).
// O texto da evolução NÃO é guardado — só se foi evoluído (Sim/Não).
// ═══════════════════════════════════════════════════════════════════
const prSb = (path, opts) => window.__sbRest(path, opts);
const prCF = (cid) => (window.coFilter ? window.coFilter(cid) : `company_id=eq.${cid}`);
const prRC = (cid) => (window.realCompany ? window.realCompany(cid) : cid);
const prR2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const prNum = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const prDataISO = (d) => { const m = String(d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : (String(d || '').match(/^\d{4}-\d{2}-\d{2}/) ? String(d).slice(0, 10) : null); };
const prDataBR = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
const prMais = (comp, n) => { let c = comp; for (let i = 0; i < n; i++) c = proximaCompetencia(c); return c; };

// prazo de retorno do profissional: 3 dias corridos a partir do envio (POP Parte III)
const PR_PRAZO_DIAS = 3;
const prHojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const prSomaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const prTextoPrazo = (envioISO) => {
  const lim = prDataBR(prSomaDias(envioISO, PR_PRAZO_DIAS));
  return `Você tem ${PR_PRAZO_DIAS} dias corridos, até ${lim}, para evoluir os atendimentos pendentes e apontar qualquer divergência. ` +
    `Sem retorno até essa data, o pagamento será feito no valor deste demonstrativo. Atendimentos evoluídos ou divergências apontadas depois do prazo ` +
    `serão analisados e, se procedentes, acertados somente no fechamento do mês seguinte.`;
};
// Trecho da notificação de auditoria da Unimed Uberlândia (sem identificar o profissional) — POP, Anexo A
const PR_UNIMED_EVOLUCAO = '"Ressaltamos que o registro em prontuário é obrigatório e indispensável para a documentação e comprovação da assistência prestada. ' +
  'Conforme a Resolução CFFa nº 777/2025, os registros devem contemplar, entre outras informações, a data e o horário do atendimento, os procedimentos realizados e a evolução do paciente. ' +
  'Dessa forma, é imprescindível que a evolução clínica seja registrada de forma completa, fidedigna e vinculada ao respectivo atendimento. (...) ' +
  'As sessões que constarem como executadas no sistema e não apresentarem o registro de evolução no prontuário serão debitadas."';
async function prLerTomadores() {
  try { const r = await prSb('/config_geral?chave=eq.nf_tomadores&select=valor'); return (r && r[0] && r[0].valor) || []; }
  catch (e) { return []; }
}
async function prSalvarTomadores(lista) {
  await prSb('/config_geral?on_conflict=chave', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ chave: 'nf_tomadores', valor: lista, atualizado_em: new Date().toISOString() }) });
}

async function prFetchMes(companyId, comp) {
  return await prSb(`/repasse_atendimentos?${prCF(companyId)}&competencia=eq.${comp}&select=*&order=profissional.asc,data.asc,hora.asc&limit=5000`) || [];
}

// Modelo de repasse do profissional em uma frase (vai no demonstrativo)
function prModelo(regra) {
  if (!regra) return 'Sem regra de repasse cadastrada';
  const brl = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (regra.fixo_mensal) return `Fixo mensal ${brl(regra.valor_base_mensal)}`;
  if (regra.tipo === 'fixo') return `Convênio ${brl(regra.valor_fixo)}/sessão` + (regra.valor_fixo_aba ? ` · ABA ${brl(regra.valor_fixo_aba)}` : '');
  return `${Math.round((regra.pct_convenio || 0) * 100)}% após imposto (13,33%)` + (regra.pct_particular != null ? ` · particular ${Math.round(regra.pct_particular * 100)}%` : '');
}

// Valor de repasse padrão de um atendimento, pela regra do profissional (POP Parte III)
function prValorPadrao({ tipo, sit, ehRetorno, proc, conv, regra, buscarTarifa, recebido }) {
  if (sit === 'fora') return { valor: 0, incluir: false, motivo: 'não realizado' };
  if (ehRetorno) return { valor: 0, incluir: false, motivo: 'retorno (não paga)' };
  if (!regra) return { valor: 0, incluir: false, motivo: 'profissional sem regra de repasse' };
  if (regra.fixo_mensal) return { valor: 0, incluir: false, motivo: 'fixo mensal (não paga por sessão)' };
  let valor = 0, obs = null;
  if (tipo === 'particular') {
    if (recebido == null) return { valor: 0, incluir: false, motivo: 'não achado no caixa', obs: 'Particular só entra se estiver no caixa (paciente + data).' };
    valor = regra.tipo === 'percentual'
      ? recebido * (1 - IMPOSTO_RP) * Number(regra.pct_particular ?? regra.pct_convenio ?? 0)
      : recebido * Number(regra.pct_particular ?? 0.5);
    obs = `Recebido no caixa: R$ ${Number(recebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  } else if (regra.tipo === 'fixo') {
    valor = (/aba/i.test(proc) && regra.valor_fixo_aba) ? Number(regra.valor_fixo_aba) : Number(regra.valor_fixo || 0);
  } else {
    const t = buscarTarifa(conv, proc);
    if (t == null) obs = 'Convênio sem tarifa cadastrada';
    valor = (t || 0) * (1 - IMPOSTO_RP) * Number(regra.pct_convenio || 0);
  }
  valor = prR2(valor);
  if (sit === 'sem_evolucao') return { valor, incluir: false, motivo: 'sem evolução (paga se evoluir em 3 dias)', obs };
  return { valor, incluir: true, motivo: null, obs };
}

// Lê um ou mais arquivos e grava (ou atualiza) os atendimentos
async function prImportar(files, { companyId, userId, colabs, regrasByColab, tarifas, D }) {
  let linhas = [];
  for (const file of files) {
    const nome = (file.name || '').toLowerCase();
    let parsed = [];
    if (nome.endsWith('.csv')) parsed = parseCSV_RP(await file.text());
    else if (window.XLSX) {
      const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
      parsed = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: '' })
        .map(r => { const o = {}; Object.keys(r).forEach(k => o[k.trim()] = r[k]); return o; });
    }
    linhas = linhas.concat(parsed);
  }
  linhas = linhas.filter(r => campoRP(r, 'Profissional') && prDataISO(campoRP(r, 'Data', 'Dia')));
  if (!linhas.length) throw new Error('Não achei atendimentos no arquivo. Use o relatório "Atendimentos por data com prontuário" (CSV).');

  const cid = prRC(companyId);
  const buscarTarifa = criarBuscaTarifa(tarifas || []);
  const porNome = {}; (colabs || []).forEach(c => { porNome[normalizarNome(c.nome)] = c; });

  // caixa (particular) dos meses envolvidos: casa por profissional + paciente + data
  const meses = [...new Set(linhas.map(r => prDataISO(campoRP(r, 'Data', 'Dia')).slice(0, 7)))];
  const caixa = {};
  for (const m of meses) {
    try {
      const cx = await D.fetchCaixa(companyId, `${m}-01`, `${m}-31`) || [];
      cx.forEach(l => {
        const k = `${l.colaborador_id}|${normalizarNome(l.paciente)}|${String(l.data).slice(0, 10)}`;
        caixa[k] = (caixa[k] || 0) + Number(l.valor || 0);
      });
    } catch (e) { /* sem caixa: particulares ficam para conferir */ }
  }

  // o que já existe (para não sobrescrever o que foi editado à mão)
  const ids = [...new Set(linhas.map(r => String(campoRP(r, 'ID Agendamento', 'Id Agendamento', 'ID')).trim()).filter(Boolean))];
  const existentes = {};
  for (let i = 0; i < ids.length; i += 150) {
    const lote = ids.slice(i, i + 150).map(x => `"${x.replace(/"/g, '')}"`).join(',');
    const ex = await prSb(`/repasse_atendimentos?${prCF(companyId)}&agendamento_id=in.(${encodeURIComponent(lote)})&select=id,agendamento_id,editado,company_id`) || [];
    ex.forEach(e => { existentes[e.agendamento_id] = e; });
  }

  const novos = [], editadosPatch = [];
  const semRegra = new Set();
  for (const r of linhas) {
    const dataISO = prDataISO(campoRP(r, 'Data', 'Dia'));
    const prof = String(campoRP(r, 'Profissional')).trim();
    const colab = porNome[normalizarNome(prof)];
    const regra = colab && regrasByColab[colab.id];
    if (!regra) semRegra.add(prof);
    const conv = String(campoRP(r, 'Convênio', 'Convenio')).trim();
    const proc = String(campoRP(r, 'Procedimento')).trim();
    const tipo = /^particular/i.test(conv) ? 'particular' : 'convenio';
    const sit = situacaoAtend(r);
    const paciente = String(campoRP(r, 'Paciente', 'Cliente')).trim();
    const recebido = colab ? caixa[`${colab.id}|${normalizarNome(paciente)}|${dataISO}`] : undefined;
    const v = prValorPadrao({ tipo, sit, ehRetorno: /retorno/i.test(proc), proc, conv, regra, buscarTarifa, recebido });
    const evol = stNorm(campoRP(r, 'Prontuário Evoluído?', 'Prontuario Evoluido?'));
    const agId = String(campoRP(r, 'ID Agendamento', 'Id Agendamento', 'ID')).trim() || null;
    const rec = {
      company_id: cid, competencia: dataISO.slice(0, 7), agendamento_id: agId, data: dataISO,
      hora: String(campoRP(r, 'Horário', 'Horario', 'Hora')).trim() || null, paciente: paciente || null,
      profissional: prof, colaborador_id: colab ? colab.id : null, procedimento: proc || null, convenio: conv || null,
      status: String(campoRP(r, 'Status')).trim() || null, evoluido: evol ? evol === 'sim' : null,
      tipo, valor: v.valor, incluir: v.incluir, motivo: v.motivo, observacao: v.obs || null,
      origem: 'importado', created_by: userId || null, updated_at: new Date().toISOString(),
    };
    const ex = agId && existentes[agId];
    if (ex && ex.editado) editadosPatch.push({ id: ex.id, patch: { status: rec.status, evoluido: rec.evoluido, updated_at: rec.updated_at } });
    else novos.push({ ...rec, editado: false, ...(ex ? { company_id: ex.company_id } : {}) });
  }
  // grava em lotes (novos + os não editados à mão)
  for (let i = 0; i < novos.length; i += 200) {
    await prSb('/repasse_atendimentos?on_conflict=company_id,agendamento_id', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: JSON.stringify(novos.slice(i, i + 200)),
    });
  }
  for (const e of editadosPatch) {
    await prSb(`/repasse_atendimentos?id=eq.${e.id}`, { method: 'PATCH', body: JSON.stringify(e.patch) });
  }
  const contMes = {}; linhas.forEach(r => { const m = prDataISO(campoRP(r, 'Data', 'Dia')).slice(0, 7); contMes[m] = (contMes[m] || 0) + 1; });
  const mesPrincipal = Object.entries(contMes).sort((a, b) => b[1] - a[1])[0][0];
  return { total: linhas.length, preservados: editadosPatch.length, mesPrincipal, semRegra: [...semRegra],
    profissionais: [...new Set(linhas.map(r => String(campoRP(r, 'Profissional')).trim()))] };
}

// ── PDF no formato do demonstrativo (planilha) ──
function gerarDemonstrativoPlanilhaPDF({ nome, funcao, modelo, comp, conv, part, holding, ajuste, tomador, pendentes, envio }) {
  const J = window.jspdf && window.jspdf.jsPDF;
  if (!J) { alert('Biblioteca de PDF não carregada. Dê um Ctrl+Shift+R e tente de novo.'); return; }
  const brl = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const doc = new J({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 16;
  const navy = [7, 38, 84], blue = [37, 99, 158], ink = [28, 32, 40], soft = [92, 102, 116], line = [226, 230, 236], zebra = [246, 248, 251];
  const grad = (y, h) => { const N = 70; for (let i = 0; i < N; i++) { const t = i / (N - 1); doc.setFillColor(navy[0] + (blue[0] - navy[0]) * t, navy[1] + (blue[1] - navy[1]) * t, navy[2] + (blue[2] - navy[2]) * t); doc.rect((W / N) * i, y, W / N + 0.4, h, 'F'); } };
  const tot = (xs) => xs.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const tConv = tot(conv), tPart = tot(part), hold = Number(holding) || 0, aj = Number(ajuste) || 0;
  const total = tConv + tPart - hold + aj;

  grad(0, 44);
  try { const lw = 20, lh = 20 / 1.3974; doc.addImage(LOGO_EQUILIBRIUM_B64, 'PNG', W - M - lw, 9, lw, lh, undefined, 'FAST'); } catch (e) {}
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('GRUPO EQUILIBRIUM', M, 13);
  doc.setFontSize(19); doc.text('Demonstrativo de Repasse', M, 23);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(214, 224, 238);
  doc.text(`${nome}${funcao ? ' · ' + funcao : ''}`, M, 30.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
  doc.text(`COMPETÊNCIA ${competenciaExtenso(comp).toUpperCase()}`, M, 38);

  // ficha
  let y = 54;
  const ficha = [['PROFISSIONAL', nome], ['FUNÇÃO', funcao || '—'], ['MODELO', modelo], ['COMPETÊNCIA', competenciaExtenso(comp).toLowerCase()]];
  doc.setFontSize(8);
  ficha.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(soft[0], soft[1], soft[2]); doc.text(k, M, y + i * 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(ink[0], ink[1], ink[2]); doc.text(String(v), M + 34, y + i * 6);
  });
  y += 30;

  // três caixas
  const bw = (W - 2 * M - 8) / 3;
  [[`CONVÊNIO: ${conv.length}`, brl(tConv), false], [`PARTICULAR: ${part.length}`, brl(tPart), false], ['TOTAL A REPASSAR', brl(total), true]].forEach(([t, v, forte], i) => {
    const x = M + i * (bw + 4);
    if (forte) { doc.setFillColor(navy[0], navy[1], navy[2]); doc.roundedRect(x, y, bw, 20, 3, 3, 'F'); }
    else { doc.setFillColor(255, 255, 255); doc.setDrawColor(line[0], line[1], line[2]); doc.roundedRect(x, y, bw, 20, 3, 3, 'FD'); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...(forte ? [200, 215, 235] : soft)); doc.text(t, x + 5, y + 7);
    doc.setFontSize(13); doc.setTextColor(...(forte ? [255, 255, 255] : ink)); doc.text(v, x + 5, y + 15.5);
  });
  y += 30;

  const rodape = () => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(soft[0], soft[1], soft[2]);
    doc.text('Grupo Equilibrium · Uberlândia/MG · Demonstrativo gerado pelo EqFinances', W / 2, H - 9, { align: 'center' });
  };
  const novaPagina = () => { rodape(); doc.addPage(); y = 18; };
  const cols = [{ t: '#', w: 9 }, { t: 'DATA', w: 27 }, { t: 'PACIENTE', w: 53 }, { t: 'PROCEDIMENTO', w: 44 }, { t: 'CONVÊNIO', w: 26 }, { t: 'VALOR', w: 16, dir: true }];
  const tabela = (titulo, linhas, subtotalTxt) => {
    if (y > H - 50) novaPagina();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(titulo, M, y); y += 4;
    const cab = () => {
      doc.setFillColor(navy[0], navy[1], navy[2]); doc.rect(M, y, W - 2 * M, 7, 'F');
      doc.setFontSize(7); doc.setTextColor(255, 255, 255);
      let x = M + 2; cols.forEach(c => { doc.text(c.t, c.dir ? x + c.w - 2 : x, y + 4.7, { align: c.dir ? 'right' : 'left' }); x += c.w; });
      y += 7;
    };
    cab();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    if (!linhas.length) { doc.setTextColor(soft[0], soft[1], soft[2]); doc.text('Nenhum atendimento.', M + 2, y + 5); y += 8; }
    linhas.forEach((r, i) => {
      if (y > H - 22) { novaPagina(); cab(); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); }
      if (i % 2) { doc.setFillColor(zebra[0], zebra[1], zebra[2]); doc.rect(M, y, W - 2 * M, 6, 'F'); }
      doc.setTextColor(ink[0], ink[1], ink[2]);
      const vals = [String(i + 1), `${prDataBR(r.data)} ${r.hora || ''}`.trim(), r.paciente || '', r.procedimento || '', (r.convenio || '').replace(/ \/ Não Informado$/, ''), brl(r.valor)];
      let x = M + 2;
      cols.forEach((c, k) => {
        let t = String(vals[k] || '');
        while (t.length > 1 && doc.getTextWidth(t) > c.w - 3) t = t.slice(0, -2) + '…';
        doc.text(t, c.dir ? x + c.w - 2 : x, y + 4.2, { align: c.dir ? 'right' : 'left' }); x += c.w;
      });
      y += 6;
    });
    doc.setDrawColor(line[0], line[1], line[2]); doc.line(M, y, W - M, y); y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(subtotalTxt[0], M, y); doc.text(subtotalTxt[1], W - M, y, { align: 'right' }); y += 10;
  };
  tabela(`ATENDIMENTOS DE CONVÊNIO (${conv.length})`, conv, [`Subtotal convênio — ${conv.length} atendimento(s)`, brl(tConv)]);
  tabela(`ATENDIMENTOS PARTICULARES (${part.length})`, part, ['Subtotal particular', brl(tPart)]);

  if (y > H - 55) novaPagina();
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(ink[0], ink[1], ink[2]);
  if (hold) { doc.text('Desconto holding', M, y); doc.text('- ' + brl(hold), W - M, y, { align: 'right' }); y += 6; }
  if (aj) { doc.text('Ajuste', M, y); doc.text((aj < 0 ? '- ' : '') + brl(Math.abs(aj)), W - M, y, { align: 'right' }); y += 6; }
  doc.setFillColor(navy[0], navy[1], navy[2]); doc.roundedRect(M, y, W - 2 * M, 12, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL A REPASSAR', M + 5, y + 7.8); doc.text(brl(total), W - M - 5, y + 7.8, { align: 'right' });
  y += 18;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.8); doc.setTextColor(soft[0], soft[1], soft[2]);
  doc.text(`Modelo: ${String(modelo).replace(/ · /g, ', ')}. Só entram atendimentos concluídos e evoluídos; retorno não paga (POP Financeiro, Parte III).`, M, y, { maxWidth: W - 2 * M });
  y += 9;

  // ── Dados para emissão da nota fiscal ──
  if (tomador && (tomador.razao || tomador.cnpj)) {
    const linhasNF = [
      ['Razão social', tomador.razao], ['CNPJ', tomador.cnpj], ['Endereço', tomador.endereco],
      ['E-mail para envio da nota', tomador.email], ['Valor da nota', brl(total)],
      ['Descrição sugerida', `Serviços prestados${funcao ? ' (' + funcao + ')' : ''} — competência ${competenciaExtenso(comp).toLowerCase()}`],
      ...(tomador.obs ? [['Observação', tomador.obs]] : []),
    ].filter(l => l[1]);
    const hNF = 12 + linhasNF.length * 5.6;
    if (y + hNF > H - 20) novaPagina();
    doc.setFillColor(242, 246, 251); doc.setDrawColor(210, 222, 238); doc.roundedRect(M, y, W - 2 * M, hNF, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('DADOS PARA EMISSÃO DA NOTA FISCAL', M + 5, y + 7);
    doc.setFontSize(8.2);
    linhasNF.forEach(([k, v], i) => {
      const yy = y + 13 + i * 5.6;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(soft[0], soft[1], soft[2]); doc.text(k, M + 5, yy);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(ink[0], ink[1], ink[2]);
      let t = String(v); while (t.length > 1 && doc.getTextWidth(t) > W - 2 * M - 58) t = t.slice(0, -2) + '…';
      doc.text(t, M + 52, yy);
    });
    y += hNF + 6;
  }

  // ── Prazo de retorno (3 dias) ──
  const envioISO = envio || prHojeISO();
  const pend = pendentes || { n: 0, valor: 0 };
  let txtPrazo = prTextoPrazo(envioISO);
  if (pend.n) txtPrazo = `Há ${pend.n} atendimento(s) sem evolução, fora do total acima (${brl(pend.valor)} se evoluídos no prazo). ` + txtPrazo;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2);
  const linhasPrazo = doc.splitTextToSize(txtPrazo, W - 2 * M - 10);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.6);
  const linhasUnimed = doc.splitTextToSize(PR_UNIMED_EVOLUCAO, W - 2 * M - 10);
  const hP = 12 + linhasPrazo.length * 4.1 + 9 + linhasUnimed.length * 3.7;
  if (y + hP > H - 20) novaPagina();
  doc.setFillColor(255, 247, 224); doc.setDrawColor(240, 200, 110); doc.roundedRect(M, y, W - 2 * M, hP, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(140, 90, 0);
  doc.text(`ATENÇÃO — PRAZO DE RETORNO: ATÉ ${prDataBR(prSomaDias(envioISO, PR_PRAZO_DIAS))}`, M + 5, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(90, 62, 0);
  doc.text(linhasPrazo, M + 5, y + 12.5);
  const yU = y + 12.5 + linhasPrazo.length * 4.1 + 3;
  doc.setDrawColor(240, 200, 110); doc.line(M + 5, yU - 2.5, W - M - 5, yU - 2.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(140, 90, 0);
  doc.text('Por que o prazo existe — trecho de notificação de auditoria da Unimed Uberlândia:', M + 5, yU + 1.5);
  doc.setFont('helvetica', 'italic'); doc.setTextColor(90, 62, 0);
  doc.text(linhasUnimed, M + 5, yU + 5.6);
  y += hP + 16;
  if (y > H - 30) novaPagina();
  doc.setDrawColor(soft[0], soft[1], soft[2]); doc.line(W / 2 - 35, y, W / 2 + 35, y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(ink[0], ink[1], ink[2]); doc.text('Guilherme Marques', W / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(soft[0], soft[1], soft[2]); doc.text('Gestor Administrativo', W / 2, y + 9.5, { align: 'center' });
  doc.setFontSize(7.5); doc.text(`Enviado em ${prDataBR(envioISO)}`, W / 2, y + 14, { align: 'center' });
  rodape();
  const slug = String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
  doc.save(`Demonstrativo_${slug}_${comp}.pdf`);
}

const ProducaoTab = ({ companyId, userId, colabs, regrasByColab, tarifas, D }) => {
  const hoje = new Date();
  const [comp, setComp] = useStateRP(() => { const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [linhas, setLinhas] = useStateRP(null);
  const [sel, setSel] = useStateRP(null);
  const [msg, setMsg] = useStateRP('');
  const [importando, setImportando] = useStateRP(false);
  const [verFora, setVerFora] = useStateRP(false);
  const [holding, setHolding] = useStateRP({});
  const [ajuste, setAjuste] = useStateRP({});
  const [lancando, setLancando] = useStateRP(false);
  const [tomadores, setTomadores] = useStateRP([]);
  const [tomadorDe, setTomadorDe] = useStateRP(() => { try { return JSON.parse(localStorage.getItem('eq-nf-tomador-prof') || '{}'); } catch { return {}; } });
  const [editNF, setEditNF] = useStateRP(null);
  useEffectRP(() => { prLerTomadores().then(setTomadores); }, []);
  const escolherTomador = (prof, id) => {
    const n = { ...tomadorDe, [prof]: id }; setTomadorDe(n);
    try { localStorage.setItem('eq-nf-tomador-prof', JSON.stringify(n)); } catch {}
  };
  const salvarNF = async () => {
    const lista = tomadores.map(t => t.id === editNF.id ? editNF : t);
    try { await prSalvarTomadores(lista); setTomadores(lista); setEditNF(null); setMsg('✓ Dados da nota fiscal salvos — valem para todos os demonstrativos.'); }
    catch (e) { setMsg(/config_geral/.test(e.message) ? 'Falta criar a tabela: rode o SQL "2_dados_nota_fiscal.sql" no Supabase.' : 'Não consegui salvar: ' + e.message); }
  };

  const carregar = React.useCallback(async () => {
    if (!companyId) return;
    setLinhas(null);
    try { setLinhas(await prFetchMes(companyId, comp)); }
    catch (e) {
      setLinhas([]);
      setMsg(/repasse_atendimentos/.test(e.message) ? 'Falta criar a tabela: rode o SQL "1_producao_planilha.sql" no Supabase.' : 'Erro ao carregar: ' + e.message);
    }
  }, [companyId, comp]);
  useEffectRP(() => { carregar(); }, [carregar]);

  const colabDe = (nome) => (colabs || []).find(c => normalizarNome(c.nome) === normalizarNome(nome));
  const regraDe = (nome) => { const c = colabDe(nome); return c && regrasByColab[c.id]; };

  const importar = async (files) => {
    if (!files || !files.length) return;
    setImportando(true); setMsg('Lendo o relatório…');
    try {
      const r = await prImportar([...files], { companyId, userId, colabs, regrasByColab, tarifas, D });
      setMsg(`✓ ${r.total} atendimento(s) de ${r.profissionais.join(', ')} importado(s).` +
        (r.preservados ? ` ${r.preservados} linha(s) que você tinha editado foram mantidas.` : '') +
        (r.semRegra.length ? ` ⚠ Sem regra de repasse: ${r.semRegra.join(', ')} — cadastre em Repasse › Regras e importe de novo.` : '') +
        ' O texto das evoluções não é guardado.');
      if (r.mesPrincipal !== comp) setComp(r.mesPrincipal); else await carregar();
      if (r.profissionais.length === 1) setSel(r.profissionais[0]);
    } catch (e) { setMsg('Erro: ' + e.message); }
    setImportando(false);
  };

  const salvar = async (row, patch) => {
    setLinhas(ls => ls.map(x => x.id === row.id ? { ...x, ...patch } : x));
    try { await prSb(`/repasse_atendimentos?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ ...patch, editado: true, updated_at: new Date().toISOString() }) }); }
    catch (e) { setMsg('Não consegui salvar: ' + e.message); carregar(); }
  };
  const remover = async (row) => {
    if (!window.confirm('Excluir esta linha da planilha?')) return;
    setLinhas(ls => ls.filter(x => x.id !== row.id));
    try { await prSb(`/repasse_atendimentos?id=eq.${row.id}`, { method: 'DELETE' }); } catch (e) { setMsg('Não consegui excluir: ' + e.message); carregar(); }
  };
  const novaLinha = async (tipo) => {
    const c = colabDe(sel);
    try {
      await prSb('/repasse_atendimentos', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
        company_id: prRC(companyId), competencia: comp, data: `${comp}-01`, profissional: sel, colaborador_id: c ? c.id : null,
        tipo, convenio: tipo === 'particular' ? 'Particular' : '', procedimento: '', paciente: '', valor: 0, incluir: true,
        origem: 'manual', editado: true, created_by: userId || null }) });
      await carregar();
    } catch (e) { setMsg('Não consegui adicionar: ' + e.message); }
  };

  const doProf = (nome) => (linhas || []).filter(l => l.profissional === nome);
  const soma = (xs) => xs.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const profs = [...new Set((linhas || []).map(l => l.profissional))].sort((a, b) => a.localeCompare(b));
  const brl = D.brlR;

  // Lança no Pagamentos da equipe: convênio deste mês (X) + particular do mês seguinte (X+1), pago no dia 20 de X+2
  const lancar = async () => {
    const c = colabDe(sel); const regra = regraDe(sel);
    const compPart = prMais(comp, 1), compPag = prMais(comp, 2);
    setLancando(true); setMsg('');
    try {
      const conv = doProf(sel).filter(l => l.tipo === 'convenio' && l.incluir);
      let partRows = [];
      try { partRows = (await prFetchMes(companyId, compPart)).filter(l => l.profissional === sel && l.tipo === 'particular' && l.incluir); } catch (e) {}
      const tConv = prR2(soma(conv)), tPart = prR2(soma(partRows));
      const hold = Number(holding[sel] ?? regra?.holding_mensal ?? 0) || 0, aj = Number(ajuste[sel] || 0);
      const liquido = prR2(tConv + tPart - hold + aj);
      const grupo = /M-1/.test(regra?.grupo_ciclo || '') ? '5dia' : 'dia20';
      const filtro = c ? `colaborador_id=eq.${c.id}` : `nome=eq.${encodeURIComponent(sel)}`;
      const ex = await prSb(`/pagamentos?${prCF(companyId)}&competencia=eq.${compPag}&${filtro}&select=id,status&limit=1`) || [];
      const obs = `Convênio ${competenciaExtenso(comp)} (${conv.length}) + particular ${competenciaExtenso(compPart)} (${partRows.length}) — planilha de produção`;
      const dados = { valor_bruto: prR2(tConv + tPart), desconto_holding: hold, valor_liquido: liquido, observacao: obs, origem: 'repasse' };
      if (ex[0] && ex[0].status === 'pago') { setMsg(`${sel} já está como PAGO em ${competenciaExtenso(compPag)} — não alterei. Ajuste em Pagamentos da equipe se precisar.`); setLancando(false); return; }
      if (ex[0]) await D.updatePagamento(ex[0].id, dados);
      else await D.createPagamento({ competencia: compPag, grupo, colaborador_id: c ? c.id : null, nome: sel, cargo: c?.cargo || null, regime: c?.regime || null, status: 'pendente', ...dados }, companyId, userId);
      setMsg(`✓ ${sel}: ${brl(liquido)} lançado em Pagamentos da equipe (${grupo === 'dia20' ? 'dia 20' : '5º dia útil'} de ${competenciaExtenso(compPag)}).` +
        (partRows.length ? '' : ` Particular de ${competenciaExtenso(compPart)} ainda não importado — quando importar, lance de novo que o valor se atualiza.`));
    } catch (e) { setMsg('Erro ao lançar: ' + e.message); }
    setLancando(false);
  };

  const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' };
  const th = { padding: '8px 10px', font: '700 10.5px var(--f-sans)', textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--ink-3)', background: 'var(--surface-2, #F6F8FA)', borderBottom: '1px solid var(--line)', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { padding: 0, borderBottom: '1px solid var(--line-2, var(--line))', font: '500 12.5px var(--f-sans)', color: 'var(--ink)' };
  const cellInp = (dir) => ({ width: '100%', boxSizing: 'border-box', border: 0, background: 'transparent', padding: '7px 10px', outline: 'none', font: dir ? '600 12.5px var(--f-mono)' : '500 12.5px var(--f-sans)', textAlign: dir ? 'right' : 'left', color: 'var(--ink)' });
  const Tag = ({ r }) => {
    const base = { font: '600 10.5px var(--f-sans)', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' };
    if (r.incluir) return <span style={{ ...base, background: 'var(--c-pos-bg, #E4F3E9)', color: 'var(--c-pos)' }}>{r.origem === 'manual' ? 'manual' : 'entra'}</span>;
    return <span title={r.observacao || ''} style={{ ...base, background: 'var(--c-warning-bg, #FFF4D6)', color: 'var(--c-warning, #9A6700)' }}>{r.motivo || 'fora'}</span>;
  };

  const Tabela = ({ titulo, rows, tipo }) => {
    const ent = rows.filter(r => r.incluir);
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ font: '700 13.5px var(--f-sans)', color: 'var(--ink)' }}>{titulo} ({ent.length})</span>
          <span style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>{rows.length - ent.length ? `${rows.length - ent.length} fora do total` : ''}</span>
          <span style={{ marginLeft: 'auto', font: '500 12px var(--f-sans)', color: 'var(--ink-3)' }}>Subtotal</span>
          <span className="mono" style={{ font: '700 13px var(--f-mono)', color: 'var(--ink)' }}>{brl(soma(ent))}</span>
          <window.Btn variant="secondary" size="sm" icon="plus" onClick={() => novaLinha(tipo)}>Linha</window.Btn>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr>
              <th style={{ ...th, width: 34, textAlign: 'center' }}>✓</th><th style={{ ...th, width: 36 }}>#</th><th style={{ ...th, width: 118 }}>Data</th>
              <th style={th}>Paciente</th><th style={th}>Procedimento</th><th style={{ ...th, width: 140 }}>Convênio</th>
              <th style={{ ...th, width: 130 }}>Situação</th><th style={{ ...th, width: 110, textAlign: 'right' }}>Valor</th><th style={{ ...th, width: 34 }} />
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ opacity: r.incluir ? 1 : 0.55 }}>
                  <td style={{ ...td, textAlign: 'center' }}><input type="checkbox" checked={!!r.incluir} title="Entra no total"
                    onChange={e => salvar(r, { incluir: e.target.checked, motivo: e.target.checked ? null : (r.motivo || 'retirado à mão') })} /></td>
                  <td style={{ ...td, padding: '7px 10px', color: 'var(--ink-3)' }}>{i + 1}</td>
                  <td style={{ ...td, padding: '7px 10px', whiteSpace: 'nowrap' }}>{prDataBR(r.data)} <span style={{ color: 'var(--ink-3)' }}>{r.hora || ''}</span></td>
                  <td style={td}><input key={r.id + (r.paciente || '')} defaultValue={r.paciente || ''} onBlur={e => e.target.value !== (r.paciente || '') && salvar(r, { paciente: e.target.value })} style={cellInp(false)} /></td>
                  <td style={td}><input key={r.id + (r.procedimento || '')} defaultValue={r.procedimento || ''} onBlur={e => e.target.value !== (r.procedimento || '') && salvar(r, { procedimento: e.target.value })} style={cellInp(false)} /></td>
                  <td style={td}><input key={r.id + (r.convenio || '')} defaultValue={(r.convenio || '').replace(/ \/ Não Informado$/, '')} onBlur={e => e.target.value !== (r.convenio || '').replace(/ \/ Não Informado$/, '') && salvar(r, { convenio: e.target.value })} style={cellInp(false)} /></td>
                  <td style={{ ...td, padding: '7px 10px' }}><Tag r={r} /></td>
                  <td style={td}><input key={r.id + String(r.valor)} defaultValue={window.fmt ? window.fmt(Number(r.valor) || 0) : r.valor} onFocus={e => e.target.select()}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    onBlur={e => { const v = prNum(e.target.value); if (v != null && Math.abs(v - (Number(r.valor) || 0)) > 0.004) salvar(r, { valor: prR2(v) }); }} style={cellInp(true)} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><button onClick={() => remover(r)} title="Excluir linha" style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 15 }}>×</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', font: '400 12.5px var(--f-sans)' }}>Nenhum atendimento.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Planilha de um profissional ──
  if (sel && linhas) {
    const todas = doProf(sel);
    const naoRealizados = todas.filter(r => r.motivo === 'não realizado');
    const visiveis = todas.filter(r => verFora || r.motivo !== 'não realizado');
    const conv = visiveis.filter(r => r.tipo === 'convenio'), part = visiveis.filter(r => r.tipo === 'particular');
    const regra = regraDe(sel), c = colabDe(sel);
    const hold = Number(holding[sel] ?? regra?.holding_mensal ?? 0) || 0, aj = Number(ajuste[sel] || 0);
    const tConv = soma(conv.filter(r => r.incluir)), tPart = soma(part.filter(r => r.incluir));
    const total = tConv + tPart - hold + aj;
    const semEvol = todas.filter(r => /sem evolução/.test(r.motivo || ''));
    const tomadorAtual = tomadores.find(t => t.id === tomadorDe[sel]) || tomadores[0] || null;
    const Box = ({ rot, val, forte }) => (
      <div style={{ flex: 1, minWidth: 170, padding: '12px 16px', borderRadius: 'var(--r-lg)', background: forte ? 'var(--accent)' : 'var(--surface)', border: forte ? 0 : '1px solid var(--line)' }}>
        <div style={{ font: '700 10.5px var(--f-sans)', letterSpacing: '.05em', textTransform: 'uppercase', color: forte ? 'rgba(255,255,255,.8)' : 'var(--ink-3)' }}>{rot}</div>
        <div className="mono" style={{ font: '700 20px var(--f-mono)', color: forte ? '#fff' : 'var(--ink)', marginTop: 4 }}>{val}</div>
      </div>
    );
    const numInp = { width: 110, height: 32, padding: '0 10px', textAlign: 'right', border: '1px solid var(--line-strong, var(--line))', borderRadius: 'var(--r-md)', background: 'var(--field, var(--surface))', font: '600 12.5px var(--f-mono)', color: 'var(--ink)' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <window.Btn variant="ghost" size="sm" onClick={() => setSel(null)}>← Todos os profissionais</window.Btn>
          <div style={{ flex: 1 }} />
          <window.Btn variant="secondary" size="sm" icon="file" onClick={() => gerarDemonstrativoPlanilhaPDF({ nome: sel, funcao: c?.cargo, modelo: prModelo(regra), comp,
            conv: conv.filter(r => r.incluir), part: part.filter(r => r.incluir), holding: hold, ajuste: aj,
            tomador: tomadorAtual, pendentes: { n: semEvol.length, valor: soma(semEvol) }, envio: prHojeISO() })}>Baixar PDF</window.Btn>
          <window.Btn variant="primary" size="sm" icon="check" disabled={lancando} onClick={lancar}>{lancando ? 'Lançando…' : `Lançar em Pagamentos (${competenciaExtenso(prMais(comp, 2))})`}</window.Btn>
        </div>
        {msg && <div style={{ ...card, padding: 12, font: '500 13px var(--f-sans)', color: /^erro|não consegui|falta criar/i.test(msg) ? 'var(--c-neg)' : 'var(--ink)' }}>{msg}</div>}

        <div style={{ ...card, padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 24px' }}>
          {[['Profissional', sel], ['Função', c?.cargo || '—'], ['Modelo', prModelo(regra)], ['Competência', competenciaExtenso(comp).toLowerCase()]].map(([k, v]) => (
            <div key={k}><div style={{ font: '700 10.5px var(--f-sans)', letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{k}</div>
              <div style={{ font: '600 13.5px var(--f-sans)', color: regra || k !== 'Modelo' ? 'var(--ink)' : 'var(--c-neg)' }}>{v}</div></div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Box rot={`Convênio: ${conv.filter(r => r.incluir).length}`} val={brl(tConv)} />
          <Box rot={`Particular: ${part.filter(r => r.incluir).length}`} val={brl(tPart)} />
          <Box rot="Total a repassar" val={brl(total)} forte />
        </div>

        {semEvol.length > 0 && <div style={{ ...card, padding: 12, borderLeft: '3px solid var(--c-warning, #D9A300)', font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>
          {semEvol.length} atendimento(s) sem evolução — fora do total. Se evoluir no prazo de 3 dias, recebe {brl(soma(semEvol))} a mais: reimporte o relatório atualizado (ou marque ✓ na linha).
        </div>}

        <Tabela titulo="Atendimentos de convênio" rows={conv} tipo="convenio" />
        <Tabela titulo="Atendimentos particulares" rows={part} tipo="particular" />

        <div style={{ ...card, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12.5px var(--f-sans)', color: 'var(--ink-2)' }}>Desconto holding
            <input key={'h' + sel + hold} defaultValue={window.fmt ? window.fmt(hold) : hold} onBlur={e => setHolding(h => ({ ...h, [sel]: prNum(e.target.value) || 0 }))} style={numInp} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12.5px var(--f-sans)', color: 'var(--ink-2)' }}>Ajuste (+/−)
            <input key={'a' + sel + aj} defaultValue={window.fmt ? window.fmt(aj) : aj} onBlur={e => setAjuste(a => ({ ...a, [sel]: prNum(e.target.value) || 0 }))} style={numInp} /></label>
          <div style={{ marginLeft: 'auto', font: '700 14px var(--f-sans)', color: 'var(--ink)' }}>Total a repassar <span className="mono" style={{ marginLeft: 10 }}>{brl(total)}</span></div>
        </div>

        <div style={{ ...card, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ font: '700 13.5px var(--f-sans)', color: 'var(--ink)' }}>Dados para a nota fiscal</span>
            <span style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>saem no PDF</span>
            <div style={{ flex: 1 }} />
            {tomadores.length > 0 && <select value={tomadorAtual?.id || ''} onChange={e => escolherTomador(sel, e.target.value)}
              style={{ height: 32, padding: '0 10px', border: '1px solid var(--line-strong, var(--line))', borderRadius: 'var(--r-md)', background: 'var(--field, var(--surface))', color: 'var(--ink)', font: '500 12.5px var(--f-sans)' }}>
              {tomadores.map(t => <option key={t.id} value={t.id}>Nota para: {t.apelido}</option>)}
            </select>}
            {tomadorAtual && <window.Btn variant="ghost" size="sm" onClick={() => setEditNF({ ...tomadorAtual })}>Editar dados</window.Btn>}
          </div>
          {!tomadores.length && <div style={{ font: '400 12.5px var(--f-sans)', color: 'var(--c-neg)' }}>Rode o SQL "2_dados_nota_fiscal.sql" no Supabase para cadastrar os dados da clínica.</div>}
          {tomadorAtual && !editNF && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '4px 20px', font: '400 12.5px var(--f-sans)', color: 'var(--ink-2)' }}>
              <div><b>{tomadorAtual.razao}</b></div><div>CNPJ {tomadorAtual.cnpj}</div>
              <div style={{ color: tomadorAtual.endereco ? 'var(--ink-2)' : 'var(--c-neg)' }}>{tomadorAtual.endereco || 'Endereço não preenchido — clique em Editar dados'}</div>
              <div>{tomadorAtual.email ? 'Enviar nota para ' + tomadorAtual.email : 'E-mail para envio da nota não preenchido'}</div>
              <div>Valor da nota: <b className="mono">{brl(total)}</b></div>
            </div>
          )}
          {editNF && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {[['razao', 'Razão social'], ['cnpj', 'CNPJ'], ['endereco', 'Endereço completo (com CEP)'], ['email', 'E-mail para envio da nota'], ['obs', 'Observação (opcional — ex.: código do serviço)']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, font: '600 11.5px var(--f-sans)', color: 'var(--ink-2)' }}>{l}
                  <input value={editNF[k] || ''} onChange={e => setEditNF(x => ({ ...x, [k]: e.target.value }))}
                    style={{ height: 34, padding: '0 10px', border: '1px solid var(--line-strong, var(--line))', borderRadius: 'var(--r-md)', background: 'var(--field, var(--surface))', color: 'var(--ink)', font: '500 13px var(--f-sans)' }} /></label>
              ))}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <window.Btn variant="ghost" size="sm" onClick={() => setEditNF(null)}>Cancelar</window.Btn>
                <window.Btn variant="primary" size="sm" icon="check" onClick={salvarNF}>Salvar</window.Btn>
              </div>
            </div>
          )}
        </div>

        <div style={{ ...card, padding: '12px 16px', borderLeft: '3px solid var(--c-warning, #D9A300)', background: 'var(--c-warning-bg, #FFF7E0)', font: '400 12.5px/1.55 var(--f-sans)', color: 'var(--ink)' }}>
          <b>Prazo de retorno: até {prDataBR(prSomaDias(prHojeISO(), PR_PRAZO_DIAS))}</b> (se enviar hoje). {prTextoPrazo(prHojeISO())}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid color-mix(in oklch, var(--c-warning, #D9A300) 35%, transparent)', font: 'italic 400 12px/1.5 var(--f-sans)', color: 'var(--ink-2)' }}>
            <b style={{ fontStyle: 'normal' }}>Por que o prazo existe — trecho de notificação de auditoria da Unimed Uberlândia:</b> {PR_UNIMED_EVOLUCAO}
          </div>
          <div style={{ color: 'var(--ink-3)', marginTop: 6 }}>Esse aviso sai no PDF, com a data do dia em que você gerar.</div>
        </div>

        <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', lineHeight: 1.6 }}>
          {naoRealizados.length > 0 && <><button onClick={() => setVerFora(v => !v)} style={{ border: 0, background: 'none', color: 'var(--accent)', cursor: 'pointer', font: '600 12px var(--f-sans)', padding: 0 }}>
            {verFora ? 'Esconder' : 'Mostrar'} {naoRealizados.length} falta(s)/cancelamento(s)</button> · </>}
          Clique em qualquer célula para corrigir; o ✓ decide se a linha entra no total. Linhas editadas à mão não são sobrescritas ao reimportar.
          "Lançar em Pagamentos" soma o convênio de {competenciaExtenso(comp).toLowerCase()} + o particular de {competenciaExtenso(prMais(comp, 1)).toLowerCase()} (POP: convênio M-2, particular M-1).
        </div>
      </div>
    );
  }

  // ── Visão geral do mês ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...card, padding: 18, display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <window.Field label="Mês dos atendimentos">
          <input type="month" value={comp} onChange={e => e.target.value && setComp(e.target.value)} style={window.inputStyle} />
        </window.Field>
        <div style={{ flex: 1, minWidth: 260 }}>
          <window.Field label='Relatório "Atendimentos por data com prontuário" (CSV) — pode escolher vários'>
            <input type="file" multiple accept=".csv,.xlsx" disabled={importando} onChange={e => { importar(e.target.files); e.target.value = ''; }} style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-2)' }} />
          </window.Field>
        </div>
      </div>
      {msg && <div style={{ ...card, padding: 12, font: '500 13px var(--f-sans)', color: /^erro|não consegui|falta criar/i.test(msg) ? 'var(--c-neg)' : 'var(--ink)' }}>{msg}</div>}

      <div style={card}>
        <div style={{ padding: '12px 16px', font: '700 14px var(--f-sans)', color: 'var(--ink)', borderBottom: '1px solid var(--line)' }}>Produção de {competenciaExtenso(comp).toLowerCase()}</div>
        {!linhas && <div style={{ padding: 16, color: 'var(--ink-3)' }}>Carregando…</div>}
        {linhas && !profs.length && <div style={{ padding: 22, color: 'var(--ink-3)', font: '400 13px var(--f-sans)', lineHeight: 1.6 }}>
          Nada importado neste mês. No Mais Equilibrium: Relatórios → "Atendimentos por data com prontuário", filtre o mês e o profissional, exporte e escolha o arquivo acima.
        </div>}
        {profs.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Profissional</th><th style={{ ...th, textAlign: 'right' }}>Convênio</th><th style={{ ...th, textAlign: 'right' }}>Particular</th>
              <th style={{ ...th, textAlign: 'right' }}>Sem evolução</th><th style={{ ...th, textAlign: 'right' }}>A repassar</th><th style={th} />
            </tr></thead>
            <tbody>
              {profs.map(p => {
                const ls = doProf(p), cv = ls.filter(r => r.tipo === 'convenio' && r.incluir), pt = ls.filter(r => r.tipo === 'particular' && r.incluir);
                const se = ls.filter(r => /sem evolução/.test(r.motivo || '')).length;
                const regra = regraDe(p);
                const hold = Number(holding[p] ?? regra?.holding_mensal ?? 0) || 0;
                return (
                  <tr key={p} onClick={() => setSel(p)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...td, padding: '10px 12px', fontWeight: 600 }}>{p}{!regra && <span style={{ marginLeft: 8, font: '600 10.5px var(--f-sans)', color: 'var(--c-neg)' }}>sem regra</span>}</td>
                    <td className="mono" style={{ ...td, padding: '10px 12px', textAlign: 'right' }}>{cv.length} · {brl(soma(cv))}</td>
                    <td className="mono" style={{ ...td, padding: '10px 12px', textAlign: 'right' }}>{pt.length} · {brl(soma(pt))}</td>
                    <td style={{ ...td, padding: '10px 12px', textAlign: 'right', color: se ? 'var(--c-warning, #9A6700)' : 'var(--ink-3)' }}>{se || '—'}</td>
                    <td className="mono" style={{ ...td, padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{brl(soma(cv) + soma(pt) - hold)}</td>
                    <td style={{ ...td, padding: '10px 12px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>Abrir planilha →</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', lineHeight: 1.6 }}>
        O sistema calcula cada atendimento pela regra do profissional (Regras e Tarifas): só entram os concluídos e evoluídos; retorno não paga;
        particular só entra se estiver no Caixa (paciente + data). Tudo fica editável na planilha. O texto das evoluções do prontuário não é guardado.
      </div>
    </div>
  );
};

const RepassePage = () => {
  const { profile } = window.useAuth();
  const companyId = profile?.company_id;
  const userId = profile?.id;
  const D = window.__repasseData;

  const [sub, setSub] = useStateRP('producao'); // producao | fechamento | pagamentos | regras | tarifas
  const [rows, setRows] = useStateRP(null);
  const [colabs, setColabs] = useStateRP([]);
  const [regras, setRegras] = useStateRP([]);
  const [tarifas, setTarifas] = useStateRP([]);
  const [caixaByColab, setCaixaByColab] = useStateRP({});
  const [competencia, setCompetencia] = useStateRP('2026-05');
  const [msg, setMsg] = useStateRP('');
  const [gerandoPdf, setGerandoPdf] = useStateRP(false);

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

  // carrega o caixa do PARTICULAR do mês seguinte à competência (ciclo cruzado:
  // convênio do mês X + particular do mês X+1, já recebido no caixa)
  useEffectRP(() => {
    if (!companyId || !competencia) return;
    (async () => {
      const compPart = proximaCompetencia(competencia);
      const [y, m] = compPart.split('-');
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
      // Guarda a produção de convênio deste mês (alimenta a Projeção de Caixa).
      salvarProducaoDoRelatorio(parsed, mesDetectado);
    } else {
      setMsg(`${parsed.length} linhas carregadas.`);
    }
  };

  // Conta os atendimentos de convênio (Realizado + Em Espera) por convênio e salva
  // em producao_mensal, para a Projeção de Caixa. Roda em silêncio; não trava a tela.
  const salvarProducaoDoRelatorio = async (parsed, competencia) => {
    if (!window.upsertProducaoMensal || !companyId) return;
    const MAPA = { unimed: 'Unimed', 'ndi': 'NDI', gndi: 'NDI', 'notre dame': 'NDI',
      geap: 'Geap', hapvida: 'HapVida', usisaude: 'Usisaúde' };
    const VALOR = { Unimed: 79.21, NDI: 77.57, Geap: 79.21, HapVida: 60, 'Usisaúde': 40 };
    const cont = {};
    for (const r of parsed) {
      const st = (r['Status'] || '').trim();
      if (situacaoAtend(r) !== 'paga') continue;
      const cvRaw = (r['Convênio'] || r['Convenio'] || '').toLowerCase();
      let cv = null;
      for (const k in MAPA) if (cvRaw.includes(k)) { cv = MAPA[k]; break; }
      if (!cv) continue;
      cont[cv] = (cont[cv] || 0) + 1;
    }
    const nomes = Object.keys(cont);
    if (!nomes.length) return;
    try {
      for (const cv of nomes) {
        await window.upsertProducaoMensal(companyId, userId, competencia, cv, cont[cv], VALOR[cv] || 0, false, 'importado automaticamente do relatório');
      }
      setMsg(m => m + ` Produção salva: ${nomes.map(c => `${c} ${cont[c]}`).join(', ')}.`);
      window.dispatchEvent(new Event('sb-data-hydrated'));
    } catch (e) { /* silencioso — não atrapalha o fechamento */ }
  };

  const { resultados, pendencias } = useMemoRP(
    () => rows ? calcularRepasse(rows, regrasByColab, tarifas, caixaByColab, colabs) : { resultados: [], pendencias: [] },
    [rows, regrasByColab, tarifas, caixaByColab, colabs]
  );

  const totalLiq = resultados.reduce((s, r) => s + r.liquido, 0);
  const totalRec = resultados.reduce((s, r) => s + r.receita, 0);
  const totalMar = resultados.reduce((s, r) => s + r.margem, 0);
  const totalImp = resultados.reduce((s, r) => s + (r.tipo === 'percentual' ? r.imposto : 0), 0);

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
      // Amarra ao módulo de Pagamentos: regenera as linhas de repasse deste mês (grupo Dia 20)
      try {
        await D.deletePagamentosRepasse(companyId, competencia);
        for (const r of resultados) {
          await D.createPagamento({
            competencia, grupo: 'dia20', colaborador_id: r.colaborador_id || null,
            nome: r.nome, cargo: r.categoria, regime: null,
            valor_bruto: r.bruto, desconto_holding: r.holding, valor_liquido: r.liquido,
            observacao: 'Repasse ' + competenciaExtenso(competencia), status: 'pendente', origem: 'repasse',
          }, companyId, userId);
        }
      } catch (e) { /* pagamentos é complementar; não bloqueia o fechamento */ }
      setMsg(`Fechamento de ${competencia} salvo — ${resultados.length} profissionais (também na aba Pagamentos).`);
    } catch (e) { setMsg('Erro: ' + e.message); }
  };

  const inp = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--bg-alt)', color: 'var(--ink)' };

  return (
    <div className="anim-fade">
      {/* ── Faixa azul ── */}
      <window.Band
        title="Repasse"
        subtitle="Motor de cálculo — importa produção, cruza com o caixa e fecha o mês"
        metricLabel={resultados.length > 0 ? 'Total a pagar' : null}
        metric={resultados.length > 0 ? totalLiq : null}
        stats={resultados.length > 0 ? [
          { label: 'Profissionais', value: String(resultados.length), color: 'var(--on-accent)' },
          { label: 'Receita', value: totalRec, color: 'var(--on-accent)' },
          { label: 'Margem', value: totalMar, color: totalMar >= 0 ? 'var(--on-accent-pos)' : 'var(--on-accent-neg)' },
        ] : []}
      />

      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Sub-navegação */}
        <window.Segmented
          options={[{ value: 'producao', label: 'Produção (planilha)' }, { value: 'fechamento', label: 'Fechamento' }, { value: 'pagamentos', label: 'Pagamentos' }, { value: 'regras', label: 'Regras' }, { value: 'tarifas', label: 'Tarifas' }]}
          value={sub} onChange={setSub} />

        {sub === 'fechamento' && (
          <>
            <window.Card padding={20}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <window.Field label="Competência (mês do convênio)">
                  <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} style={window.inputStyle} />
                </window.Field>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <window.Field label="Relatório de agendamento (CSV ou XLSX)">
                    <input type="file" accept=".csv,.xlsx" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-2)' }} />
                  </window.Field>
                </div>
                {resultados.length > 0 && <window.Btn variant="secondary" icon="file" disabled={gerandoPdf} onClick={async () => {
                  setGerandoPdf(true); setMsg('Gerando demonstrativos...');
                  await baixarTodosDemonstrativos(resultados, competencia, (n, t) => setMsg(`Gerando demonstrativos... ${n}/${t}`));
                  setMsg(`${resultados.length} demonstrativo(s) gerado(s) — 1 PDF por profissional.`); setGerandoPdf(false);
                }}>{gerandoPdf ? 'Gerando...' : 'Baixar PDF'}</window.Btn>}
                {resultados.length > 0 && <window.Btn variant="primary" icon="check" onClick={salvarFechamento}>Salvar fechamento</window.Btn>}
              </div>
              <div style={{ font: '400 11px var(--f-sans)', color: 'var(--ink-3)', marginTop: 10 }}>
                Ciclo: convênio <b>{competenciaExtenso(competencia)}</b> + particular <b>{competenciaExtenso(proximaCompetencia(competencia))}</b> (do caixa)
              </div>
              {msg && <div style={{ marginTop: 10, font: '500 12.5px var(--f-sans)', color: 'var(--accent)' }}>{msg}</div>}
            </window.Card>

            {rows && pendencias.length > 0 && (
              <window.Card padding={18}>
                <h3 style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--c-neg)', marginBottom: 12 }}>Pendências antes de pagar</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {pendencias.map((p, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--c-neg-bg)', color: 'var(--c-neg)', font: '500 12.5px var(--f-sans)' }}>{p.msg}</div>
                  ))}
                </div>
              </window.Card>
            )}

            {resultados.length > 0 && (
              <>
                <div style={{ font: '400 11px var(--f-sans)', color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  <b>Margem</b> = margem de contribuição (receita − imposto − repasse + holding). <b>Ainda não desconta os custos fixos</b> da clínica (aluguel, folha, energia, estrutura) — mostra quanto o profissional contribui para bancá-los, não o lucro final.
                </div>

                <window.Card padding={0} style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          {['Profissional', 'Sessões', 'Part.', 'Receita', 'Imposto', 'Repasse', 'Holding', 'Líquido'].map((h, i) => (
                            <th key={i} style={{ padding: '11px 18px', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                            <td style={{ padding: '11px 18px' }}>
                              <div style={{ font: '600 12.5px var(--f-sans)', color: 'var(--ink)' }}>{r.nome}</div>
                              <div style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)' }}>{r.categoria}</div>
                            </td>
                            <td style={{ padding: '11px 18px', textAlign: 'right' }} className="mono">{r.sessoes}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'right', color: 'var(--ink-2)' }} className="mono">{r.particular_n || '—'}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'right' }} className="mono">{D.brlR(r.receita)}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'right', color: r.tipo === 'percentual' ? 'var(--c-neg)' : 'var(--ink-4)' }} className="mono" title={r.tipo === 'percentual' ? 'Imposto 13,33% descontado antes do split' : 'Repasse fixo — não desconta imposto do profissional'}>{r.tipo === 'percentual' ? '−' + D.brlR(r.imposto).replace('R$\u00a0', '').replace('R$ ', '') : '—'}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'right', color: 'var(--ink)' }} className="mono">{D.brlR(r.bruto)}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'right', color: r.holding ? 'var(--c-neg)' : 'var(--ink-4)' }} className="mono">{r.holding ? '−' + D.brlR(r.holding).replace('R$\u00a0', '').replace('R$ ', '') : '—'}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'right', font: '600 12.5px var(--f-mono)', color: 'var(--c-pos)' }} className="mono">{D.brlR(r.liquido)}</td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid var(--line-strong)', font: '700 12.5px var(--f-sans)' }}>
                          <td style={{ padding: '12px 18px', color: 'var(--ink)' }}>TOTAL</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }} className="mono">{resultados.reduce((s, r) => s + r.sessoes, 0)}</td>
                          <td></td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }} className="mono">{D.brlR(totalRec)}</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', color: totalImp ? 'var(--c-neg)' : 'var(--ink-4)' }} className="mono">{totalImp ? '−' + D.brlR(totalImp).replace('R$\u00a0', '').replace('R$ ', '') : '—'}</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }} className="mono">{D.brlR(resultados.reduce((s, r) => s + r.bruto, 0))}</td>
                          <td></td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--c-pos)' }} className="mono">{D.brlR(totalLiq)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </window.Card>
              </>
            )}

            {!rows && (
              <window.Card padding={0}>
                <div style={{ padding: 40 }}>
                  <window.EmptyState icon="file" title="Importe o relatório de agendamento"
                    hint="Escolha a competência e importe o CSV/XLSX. O particular vem automaticamente do Caixa lançado pela recepção no mesmo mês." />
                </div>
              </window.Card>
            )}
          </>
        )}

        {sub === 'producao' && <ProducaoTab companyId={companyId} userId={userId} colabs={colabs} regrasByColab={regrasByColab} tarifas={tarifas} D={D} />}
        {sub === 'pagamentos' && <PagamentosTab companyId={companyId} userId={userId} colabs={colabs} D={D} />}
        {sub === 'regras' && <RegrasTab companyId={companyId} colabs={colabs} regras={regras} setRegras={setRegras} D={D} />}
        {sub === 'tarifas' && <TarifasTab tarifas={tarifas} setTarifas={setTarifas} companyId={companyId} D={D} />}
      </div>
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
          <h3 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Regras de repasse por profissional</h3>
          <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 4 }}>{regras.length} regra(s) cadastrada(s). Clique numa linha para editar.</p>
        </div>
        <window.Btn variant="primary" icon="plus" size="sm" onClick={() => setEditando({})}>Nova regra</window.Btn>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ color: 'var(--ink-mute)', textAlign: 'left' }}>
          {['Profissional', 'Categoria', 'Tipo', 'Valor', 'Holding', 'Ciclo'].map((h, i) => <th key={i} style={{ padding: '10px 20px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {[...regras].sort((a, b) => (a.colaboradores?.nome || '').localeCompare(b.colaboradores?.nome || '', 'pt-BR')).map(r => (
            <tr key={r.id} onClick={() => setEditando(r)} style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '10px 20px', fontWeight: 600 }}>{(r.colaboradores?.nome || '—').toUpperCase()}</td>
              <td style={{ padding: '10px 20px', color: 'var(--ink-soft)' }}>{(r.colaboradores?.cargo || '—').toUpperCase()}</td>
              <td style={{ padding: '10px 20px' }}>{r.fixo_mensal ? 'fixo mensal' : r.tipo}</td>
              <td style={{ padding: '10px 20px' }}>{r.fixo_mensal ? `${D.brlR(r.valor_base_mensal)}/mês` : r.tipo === 'fixo' ? D.brlR(r.valor_fixo) : `${Math.round((r.pct_convenio || 0) * 100)}% / part ${Math.round((r.pct_particular || 0) * 100)}%`}</td>
              <td style={{ padding: '10px 20px' }}>{r.holding_mensal ? D.brlR(r.holding_mensal) : '—'}</td>
              <td style={{ padding: '10px 20px', color: 'var(--ink-soft)' }}>{r.grupo_ciclo}</td>
            </tr>
          ))}
          {regras.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--ink-mute)' }}>Nenhuma regra ainda. Clique em "Nova regra" para começar.</td></tr>
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
    tipo: regra.fixo_mensal ? 'fixomensal' : (regra.tipo || 'fixo'),
    valor_fixo: regra.valor_fixo ?? '',
    valor_fixo_aba: regra.valor_fixo_aba ?? '',
    pct_convenio: regra.pct_convenio != null ? Math.round(regra.pct_convenio * 100) : '',
    pct_particular: regra.pct_particular != null ? Math.round(regra.pct_particular * 100) : '',
    valor_particular: regra.valor_particular ?? '',
    valor_base_mensal: regra.valor_base_mensal ?? '',
    desconto_por: regra.desconto_por || 'atendimento',
    valor_falta: regra.valor_falta ?? '',
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
    const ehMensal = form.tipo === 'fixomensal';
    const payload = {
      colaborador_id: form.colaborador_id,
      tipo: ehMensal ? 'fixo' : form.tipo,
      fixo_mensal: ehMensal,
      valor_base_mensal: ehMensal ? num(form.valor_base_mensal) : null,
      desconto_por: ehMensal ? form.desconto_por : null,
      valor_falta: ehMensal && form.desconto_por === 'atendimento' ? num(form.valor_falta) : null,
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
            {[['fixo', 'Fixo por sessão'], ['percentual', 'Percentual'], ['fixomensal', 'Fixo mensal']].map(([k, l]) => (
              <button key={k} onClick={() => set('tipo', k)} style={{
                flex: 1, padding: '10px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: form.tipo === k ? 'var(--accent)' : 'var(--bg-alt)',
                color: form.tipo === k ? 'var(--accent-ink)' : 'var(--ink-soft)',
                border: '1px solid ' + (form.tipo === k ? 'var(--accent)' : 'var(--line)'),
              }}>{l}</button>
            ))}
          </div>
        </div>

        {form.tipo === 'fixomensal' ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Valor base mensal (R$)</label><input value={form.valor_base_mensal} onChange={e => set('valor_base_mensal', e.target.value)} placeholder="14000,00" style={inp} /></div>
              <div>
                <label style={lbl}>Desconto por falta</label>
                <select value={form.desconto_por} onChange={e => set('desconto_por', e.target.value)} style={inp}>
                  <option value="atendimento">Por atendimento faltado</option>
                  <option value="dia">Por dia (base ÷ 30)</option>
                </select>
              </div>
            </div>
            {form.desconto_por === 'atendimento'
              ? <div><label style={lbl}>Valor por atendimento desmarcado/faltado (R$)</label><input value={form.valor_falta} onChange={e => set('valor_falta', e.target.value)} placeholder="60,00" style={inp} /></div>
              : <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Cada dia em que o profissional falta o dia inteiro desconta 1/30 do valor base.</div>}
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 8 }}>Base fixa por mês. Desconta cada horário que o profissional <b>desmarca</b> (Cancelado Profissional) ou <b>falta</b> (Profissional Ausente). Falta/cancelamento do <b>paciente</b> não desconta.</div>
          </div>
        ) : form.tipo === 'fixo' ? (
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

const TarifasTab = ({ tarifas, setTarifas, companyId }) => {
  const D = window.__repasseData;
  const [editId, setEditId] = useStateRP(null);   // id da tarifa em edição de valor
  const [novo, setNovo] = useStateRP(null);        // {convenio, tipo_servico, valor} ao adicionar
  const [busy, setBusy] = useStateRP(false);

  const recarregar = async () => { try { setTarifas(await D.fetchTarifas(companyId)); } catch (e) { console.warn(e); } };

  const salvarValor = async (t, novoValor) => {
    const v = Number(String(novoValor).replace(',', '.'));
    if (isNaN(v) || v === Number(t.valor)) { setEditId(null); return; }
    setBusy(true);
    try { await D.updateTarifa(t.id, { valor: v }); await recarregar(); }
    catch (e) { alert('Erro ao salvar: ' + e.message); }
    finally { setBusy(false); setEditId(null); }
  };

  const salvarNovo = async () => {
    if (!novo.convenio.trim() || !novo.valor) { alert('Preencha convênio e valor.'); return; }
    setBusy(true);
    try {
      await D.createTarifa({
        convenio: novo.convenio.trim(),
        tipo_servico: novo.tipo_servico.trim() || 'CONSULTA',
        valor: Number(String(novo.valor).replace(',', '.')),
      }, companyId);
      await recarregar(); setNovo(null);
    } catch (e) { alert('Erro ao adicionar: ' + e.message); }
    finally { setBusy(false); }
  };

  const excluir = async (t) => {
    if (!confirm(`Excluir a tarifa "${t.convenio} · ${t.tipo_servico}"?`)) return;
    setBusy(true);
    try { await D.deleteTarifa(t.id); await recarregar(); }
    catch (e) { alert('Erro ao excluir: ' + e.message); }
    finally { setBusy(false); }
  };

  return (
    <window.Card padding={0}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Tarifas de convênio</h3>
          <p style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)', marginTop: 4 }}>O que a clínica recebe por atendimento. Clique no valor para editar. {tarifas.length} cadastrada(s).</p>
        </div>
        <window.Btn variant="primary" icon="plus" size="sm" onClick={() => setNovo({ convenio: '', tipo_servico: 'CONSULTA', valor: '' })}>Nova tarifa</window.Btn>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            {['Convênio', 'Serviço', 'Valor', ''].map((h, i) => (
              <th key={i} style={{ padding: '10px 20px', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', textAlign: (i === 2 || i === 3) ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {novo && (
            <tr style={{ borderBottom: '1px solid var(--line-2)', background: 'var(--accent-soft)' }}>
              <td style={{ padding: '8px 20px' }}>
                <input autoFocus value={novo.convenio} onChange={e => setNovo({ ...novo, convenio: e.target.value })} placeholder="Ex: Unimed" style={{ ...window.inputStyle, height: 30, width: '100%' }} />
              </td>
              <td style={{ padding: '8px 20px' }}>
                <input value={novo.tipo_servico} onChange={e => setNovo({ ...novo, tipo_servico: e.target.value })} placeholder="CONSULTA" style={{ ...window.inputStyle, height: 30, width: '100%' }} />
              </td>
              <td style={{ padding: '8px 20px', textAlign: 'right' }}>
                <input value={novo.valor} onChange={e => setNovo({ ...novo, valor: e.target.value })} placeholder="0,00" style={{ ...window.inputStyle, height: 30, width: 90, textAlign: 'right' }} className="mono" />
              </td>
              <td style={{ padding: '8px 20px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                  <window.Btn variant="primary" size="sm" onClick={salvarNovo} disabled={busy}>Salvar</window.Btn>
                  <window.IconBtn name="x" size={28} onClick={() => setNovo(null)} />
                </div>
              </td>
            </tr>
          )}
          {tarifas.map(t => (
            <tr key={t.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
              <td style={{ padding: '10px 20px', font: '600 12.5px var(--f-sans)', color: 'var(--ink)' }}>{t.convenio}</td>
              <td style={{ padding: '10px 20px', font: '400 12px var(--f-sans)', color: 'var(--ink-2)' }}>{t.codigo && <span className="mono" style={{ color: 'var(--ink-3)', marginRight: 8 }}>{t.codigo}</span>}{t.tipo_servico}</td>
              <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                {editId === t.id ? (
                  <input autoFocus defaultValue={t.valor}
                    onBlur={e => salvarValor(t, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') salvarValor(t, e.target.value); if (e.key === 'Escape') setEditId(null); }}
                    style={{ ...window.inputStyle, height: 30, width: 90, textAlign: 'right' }} className="mono" />
                ) : (
                  <span onClick={() => setEditId(t.id)} className="mono" title="Clique para editar"
                    style={{ font: '500 12.5px var(--f-mono)', color: 'var(--ink)', cursor: 'pointer', borderBottom: '1px dashed var(--ink-4)', paddingBottom: 1 }}>
                    {D.brlR(t.valor)}
                  </span>
                )}
              </td>
              <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                <window.IconBtn name="trash" size={28} danger onClick={() => excluir(t)} title="Excluir" />
              </td>
            </tr>
          ))}
          {tarifas.length === 0 && !novo && (
            <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', font: '400 12.5px var(--f-sans)' }}>Nenhuma tarifa. Clique em "Nova tarifa" para começar.</td></tr>
          )}
        </tbody>
      </table>
    </window.Card>
  );
};

Object.assign(window, { RepassePage });
