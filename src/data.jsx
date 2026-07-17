// Infinity data model — respects the 5 fixed structures:
// 1) Contas (a pagar/receber, previsto vs realizado) separated from Compras (caixa)
// 2) Month/period filter (global)
// 3) Excel import (xlsx)
// 4) Previsto vs Realizado (entrada & saída)
// 5) Saldo anterior (acumulado do mês anterior) sempre disponível

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtShort = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (Math.abs(n) >= 1_000) return 'R$ ' + (n / 1_000).toFixed(1).replace('.', ',') + 'k';
  return fmt(n);
};
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Cores por categoria — rampa monocromática (diferenciação por luminosidade)
const CATS_ENTRADA = [
  { cat: 'Consultas Particulares', color: 'var(--g-9)' },
  { cat: 'Convênios / Planos', color: 'var(--g-7)' },
  { cat: 'Procedimentos', color: 'var(--g-6)' },
  { cat: 'Pacotes / Planos Internos', color: 'var(--g-5)' },
  { cat: 'Receitas Financeiras', color: 'var(--g-4)' },
];
const CATS_SAIDA = [
  { cat: 'Salários CLT', color: 'var(--g-9)' },
  { cat: 'Profissionais / Prestadores', color: 'var(--g-7)' },
  { cat: 'Ocupação / Infraestrutura', color: 'var(--g-6)' },
  { cat: 'Materiais Clínicos', color: 'var(--g-5)' },
  { cat: 'Impostos e Tributos', color: 'var(--g-7)' },
  { cat: 'Marketing e Comercial', color: 'var(--g-4)' },
];
const catColor = (name, type) => {
  // Priorizar categorias do banco se disponíveis
  const appCats = window.APP_CATEGORIES;
  if (appCats) {
    const list = type === 'entrada' ? appCats.entrada : appCats.saida;
    const found = list?.find(c => c.name === name);
    if (found?.color) return found.color;
  }
  // Fallback para categorias hardcoded
  const list = type === 'entrada' ? CATS_ENTRADA : CATS_SAIDA;
  return list.find(c => c.cat === name)?.color || 'var(--g-6)';
};

const DESCS_IN = {
  'Consultas Particulares': ['Consulta — Dra. Lima', 'Consulta — Dr. Ribeiro', 'Retorno particular', 'Teleconsulta', 'Avaliação inicial'],
  'Convênios / Planos': ['Repasse Unimed', 'Repasse Bradesco Saúde', 'Repasse SulAmérica', 'Repasse Amil'],
  'Procedimentos': ['Procedimento estético', 'Fisioterapia — sessão', 'Exame laboratorial', 'Pequena cirurgia'],
  'Pacotes / Planos Internos': ['Plano trimestral — M. Souza', 'Pacote 10 sessões — J. Alves', 'Check-up executivo'],
  'Receitas Financeiras': ['Rendimento CDB', 'Juros sobre saldo'],
};
const DESCS_OUT = {
  'Salários CLT': ['Folha de pagamento', 'Vale-transporte', 'FGTS', 'INSS patronal'],
  'Profissionais / Prestadores': ['Dra. Teixeira — PJ', 'Dr. Nakamura — PJ', 'Recepcionista terceirizada'],
  'Ocupação / Infraestrutura': ['Aluguel', 'Energia elétrica', 'Internet fibra', 'Limpeza', 'Condomínio'],
  'Materiais Clínicos': ['Materiais descartáveis', 'EPIs', 'Medicamentos'],
  'Impostos e Tributos': ['DAS Simples Nacional', 'ISS', 'Anuidade CRM'],
  'Marketing e Comercial': ['Google Ads', 'Meta Ads', 'Fotografia institucional'],
};

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── CONTAS (a pagar / a receber — controle de previsto vs realizado) ───
// Each CONTA is a recurring / scheduled commitment with an expected amount and, if paid, a realized amount.
function generateContas() {
  const contas = [];
  const now = new Date();
  let idc = 1;
  for (let mOffset = 3; mOffset >= -2; mOffset--) { // 4 months back + 2 future
    const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 1);
    const year = d.getFullYear(), month = d.getMonth();
    const isFuture = mOffset < 0;
    const isCurrent = mOffset === 0;

    // Recurring CONTAS A PAGAR
    const payableTemplates = [
      { cat: 'Ocupação / Infraestrutura', desc: 'Aluguel', prev: 6200, day: 5 },
      { cat: 'Ocupação / Infraestrutura', desc: 'Condomínio', prev: 780, day: 10 },
      { cat: 'Ocupação / Infraestrutura', desc: 'Energia elétrica', prev: 1150, day: 15 },
      { cat: 'Ocupação / Infraestrutura', desc: 'Internet fibra', prev: 420, day: 12 },
      { cat: 'Salários CLT', desc: 'Folha de pagamento', prev: 18400, day: 28 },
      { cat: 'Salários CLT', desc: 'FGTS + INSS', prev: 5600, day: 20 },
      { cat: 'Profissionais / Prestadores', desc: 'Dra. Teixeira — PJ', prev: 4200, day: 10 },
      { cat: 'Profissionais / Prestadores', desc: 'Dr. Nakamura — PJ', prev: 3800, day: 10 },
      { cat: 'Profissionais / Prestadores', desc: 'Contador externo', prev: 950, day: 8 },
      { cat: 'Impostos e Tributos', desc: 'DAS Simples Nacional', prev: 2800, day: 20 },
      { cat: 'Impostos e Tributos', desc: 'ISS', prev: 580, day: 22 },
      { cat: 'Marketing e Comercial', desc: 'Google Ads', prev: 1200, day: 5 },
      { cat: 'Marketing e Comercial', desc: 'Meta Ads', prev: 800, day: 5 },
    ];
    payableTemplates.forEach(t => {
      const prev = t.prev * (0.94 + Math.random() * 0.12);
      const paid = isFuture ? false : Math.random() > (isCurrent ? 0.35 : 0.05);
      const real = paid ? t.prev * (0.92 + Math.random() * 0.18) : 0;
      const paidDate = paid ? new Date(year, month, Math.min(28, t.day + Math.floor(rand(-2, 4)))) : null;
      contas.push({
        id: `cap-${idc++}`,
        tipo: 'pagar',
        category: t.cat,
        description: t.desc,
        vencimento: `${year}-${String(month + 1).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
        previsto: prev,
        realizado: real,
        pago: paid,
        pagoEm: paidDate ? paidDate.toISOString().slice(0, 10) : null,
      });
    });

    // Recurring CONTAS A RECEBER
    const receivableTemplates = [
      { cat: 'Convênios / Planos', desc: 'Repasse Unimed', prev: 12800, day: 25 },
      { cat: 'Convênios / Planos', desc: 'Repasse Bradesco Saúde', prev: 6400, day: 20 },
      { cat: 'Convênios / Planos', desc: 'Repasse SulAmérica', prev: 5100, day: 18 },
      { cat: 'Convênios / Planos', desc: 'Repasse Amil', prev: 4200, day: 22 },
      { cat: 'Pacotes / Planos Internos', desc: 'Pacote 10 sessões — J. Alves', prev: 3600, day: 5 },
      { cat: 'Pacotes / Planos Internos', desc: 'Plano trimestral — M. Souza', prev: 2400, day: 10 },
    ];
    receivableTemplates.forEach(t => {
      const prev = t.prev * (0.94 + Math.random() * 0.12);
      const received = isFuture ? false : Math.random() > (isCurrent ? 0.3 : 0.08);
      const real = received ? t.prev * (0.88 + Math.random() * 0.2) : 0;
      contas.push({
        id: `car-${idc++}`,
        tipo: 'receber',
        category: t.cat,
        description: t.desc,
        vencimento: `${year}-${String(month + 1).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
        previsto: prev,
        realizado: real,
        pago: received,
        pagoEm: received ? `${year}-${String(month + 1).padStart(2, '0')}-${String(t.day).padStart(2, '0')}` : null,
      });
    });
  }
  return contas;
}

// ─── COMPRAS (lançamentos de caixa — transações efetivadas do dia-a-dia) ───
function generateCompras() {
  const txs = [];
  const now = new Date();
  let idt = 1;
  for (let mOffset = 7; mOffset >= 0; mOffset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 1);
    const year = d.getFullYear(), month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Entradas
    const nIn = Math.floor(rand(20, 32));
    for (let i = 0; i < nIn; i++) {
      const cat = pick(CATS_ENTRADA);
      const day = Math.min(daysInMonth, Math.floor(rand(1, daysInMonth + 1)));
      const amount =
        cat.cat === 'Convênios / Planos' ? rand(800, 6500) :
        cat.cat === 'Procedimentos' ? rand(400, 3800) :
        cat.cat === 'Pacotes / Planos Internos' ? rand(900, 4500) :
        cat.cat === 'Receitas Financeiras' ? rand(80, 1200) :
        rand(200, 850);
      txs.push({
        id: `cmp-in-${idt++}`,
        type: 'entrada',
        category: cat.cat,
        color: cat.color,
        description: pick(DESCS_IN[cat.cat]),
        amount,
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        paymentMethod: pick(['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência']),
      });
    }
    // Saídas
    const nOut = Math.floor(rand(18, 28));
    for (let i = 0; i < nOut; i++) {
      const cat = pick(CATS_SAIDA);
      const day = Math.min(daysInMonth, Math.floor(rand(1, daysInMonth + 1)));
      const amount =
        cat.cat === 'Salários CLT' ? rand(1500, 4800) :
        cat.cat === 'Ocupação / Infraestrutura' ? rand(200, 2500) :
        cat.cat === 'Profissionais / Prestadores' ? rand(800, 3200) :
        cat.cat === 'Impostos e Tributos' ? rand(400, 2200) :
        cat.cat === 'Marketing e Comercial' ? rand(200, 1500) :
        rand(80, 1200);
      txs.push({
        id: `cmp-out-${idt++}`,
        type: 'saida',
        category: cat.cat,
        color: cat.color,
        description: pick(DESCS_OUT[cat.cat]),
        amount,
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        paymentMethod: pick(['PIX', 'Boleto', 'Cartão corporativo', 'Transferência']),
      });
    }
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

// ⚠ BUG FIX (Patch 002): antes estas chamavam generateContas()/generateCompras() a cada
// carregamento da página, populando a dashboard com números aleatórios.
// Agora iniciam vazias e são substituídas APENAS pelo hydrateFromSupabase após o login.
// As funções generateContas/generateCompras permanecem definidas acima caso queira
// popular dados-exemplo em desenvolvimento via console: window.CONTAS = generateContas()
let CONTAS = [];
let COMPRAS = [];

// ─── Helpers ───
function monthKey(dateStr) { return dateStr.slice(0, 7); }
function monthLabel(key) { const [y, m] = key.split('-'); return months[Number(m) - 1] + '/' + y.slice(2); }

// Available months (for filter) — sempre lê window.CONTAS/COMPRAS para refletir hydrate
function availableMonths() {
  const set = new Set();
  (window.COMPRAS || COMPRAS).forEach(t => { if (t.date) set.add(monthKey(t.date)); });
  (window.CONTAS || CONTAS).forEach(c => { if (c.vencimento) set.add(monthKey(c.vencimento)); });
  // Garantir mês atual sempre disponível
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  set.add(cur);
  return [...set].sort();
}

// Filter compras by range { from, to } (YYYY-MM-DD strings) or single month (YYYY-MM)
function filterCompras({ from, to, month }) {
  return (window.COMPRAS || COMPRAS).filter(t => {
    if (month) return t.date.slice(0, 7) === month;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    return true;
  });
}
function filterContas({ from, to, month }) {
  return (window.CONTAS || CONTAS).filter(c => {
    if (month) return c.vencimento.slice(0, 7) === month;
    if (from && c.vencimento < from) return false;
    if (to && c.vencimento > to) return false;
    return true;
  });
}

// Aggregate by month — returns [{key, label, compras:{in,out}, contas:{prev_in, prev_out, real_in, real_out, pend_in, pend_out}}]
function monthlyAggregates() {
  const map = new Map();
  const ensure = (k) => {
    if (!map.has(k)) map.set(k, { key: k, label: monthLabel(k), compras: { in: 0, out: 0 }, contas: { prev_in: 0, prev_out: 0, real_in: 0, real_out: 0 } });
    return map.get(k);
  };
  // Sempre usa window.CONTAS/COMPRAS para refletir dados após hydrate
  (window.COMPRAS || COMPRAS).forEach(t => {
    const m = ensure(monthKey(t.date));
    if (t.type === 'entrada') m.compras.in += t.amount; else m.compras.out += t.amount;
  });
  (window.CONTAS || CONTAS).forEach(c => {
    const m = ensure(monthKey(c.vencimento));
    if (c.tipo === 'receber') { m.contas.prev_in += c.previsto; m.contas.real_in += c.realizado; }
    else { m.contas.prev_out += c.previsto; m.contas.real_out += c.realizado; }
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// Saldo anterior — net cumulative balance up to (but not including) a month
// Usa realizado de Contas (real_in - real_out) + caixa de Compras (in - out)
function saldoAnterior(monthKeyStr) {
  let saldo = 0;
  const agg = monthlyAggregates();
  for (const m of agg) {
    if (m.key >= monthKeyStr) break;
    const contasNet  = (m.contas?.real_in  || 0) - (m.contas?.real_out || 0);
    const comprasNet = (m.compras?.in || 0) - (m.compras?.out || 0);
    saldo += contasNet + comprasNet;
  }
  return saldo;
}

// Excel import — parses an XLSX file buffer and returns an array of normalized rows
// Expected columns: Data, Tipo, Descrição, Categoria, Valor, [Status]
async function parseExcel(file) {
  if (!window.XLSX) throw new Error('XLSX library not loaded');
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = window.XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
  return rows.map((r, i) => {
    const row = {};
    Object.keys(r).forEach(k => { row[k.toLowerCase().trim()] = r[k]; });
    // flexible column mapping
    const dateRaw = row['data'] || row['date'] || row['vencimento'];
    const type = (row['tipo'] || row['type'] || '').toString().toLowerCase().includes('entra') ? 'entrada' : 'saida';
    const category = row['categoria'] || row['category'] || (type === 'entrada' ? 'Outras' : 'Outras Despesas');
    const description = row['descrição'] || row['descricao'] || row['description'] || '—';
    const amountRaw = row['valor'] || row['amount'] || row['value'] || 0;
    const amount = typeof amountRaw === 'number' ? amountRaw : Number(String(amountRaw).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    // normalize date to YYYY-MM-DD
    let date = new Date().toISOString().slice(0, 10);
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d)) date = d.toISOString().slice(0, 10);
      else if (typeof dateRaw === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(dateRaw)) {
        const [dd, mm, yy] = dateRaw.split('/');
        date = `${yy}-${mm}-${dd}`;
      }
    }
    return {
      id: `imp-${Date.now()}-${i}`,
      type, category, description, amount, date,
      color: catColor(category, type),
      paymentMethod: row['método'] || row['metodo'] || row['payment'] || 'Importado',
    };
  }).filter(r => r.amount > 0);
}

async function updateCompraLocal(id, patch) {
  COMPRAS = COMPRAS.map(c => c.id === id ? { ...c, ...patch, color: window.catColor(patch.category || c.category, patch.type || c.type) } : c);
  window.COMPRAS = COMPRAS;
  try {
    const s = window.getSession?.();
    if (s && !String(id).startsWith('imp-') && !String(id).startsWith('mock-')) {
      await window.updateCompra(id, patch);
    }
  } catch (e) { console.warn('updateCompra', e); }
  window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
}
async function deleteCompraLocal(id) {
  COMPRAS = COMPRAS.filter(c => c.id !== id);
  window.COMPRAS = COMPRAS;
  try {
    const s = window.getSession?.();
    if (s && !String(id).startsWith('imp-') && !String(id).startsWith('mock-')) {
      await window.deleteCompra(id);
    }
  } catch (e) { console.warn('deleteCompra', e); }
  window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
}

async function addCompras(rows) {
  COMPRAS = [...rows, ...COMPRAS].sort((a, b) => b.date.localeCompare(a.date));
  window.COMPRAS = COMPRAS;
  // Persist to Supabase se logado
  try {
    const s = window.getSession?.();
    const me = s ? await window.getMe?.() : null;
    const prof = me ? await window.getProfile?.(me.id) : null;
    if (prof?.company_id) {
      for (const r of rows) {
        try { await window.createCompra(r, prof.company_id, me.id); } catch (e) { console.warn('createCompra', e); }
      }
    }
  } catch (e) { console.warn('addCompras sync', e); }
}

// Parse Excel como CONTAS (previsto × realizado)
// Colunas aceitas: Vencimento/Data, Tipo (pagar|receber|entrada|saida), Descrição, Categoria, Previsto/Valor, Realizado(opcional), Pago(opcional)
async function parseExcelContas(file) {
  if (!window.XLSX) throw new Error('XLSX library not loaded');
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = window.XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
  return rows.map((r, i) => {
    const row = {};
    Object.keys(r).forEach(k => { row[k.toLowerCase().trim()] = r[k]; });
    const dateRaw = row['vencimento'] || row['data'] || row['date'];
    const tipoRaw = (row['tipo'] || row['type'] || '').toString().toLowerCase();
    const tipo = (tipoRaw.includes('receb') || tipoRaw.includes('entra')) ? 'receber' : 'pagar';
    const category = row['categoria'] || row['category'] || (tipo === 'receber' ? 'Outras' : 'Outras Despesas');
    const description = row['descrição'] || row['descricao'] || row['description'] || '—';
    const prevRaw = row['previsto'] || row['valor'] || row['amount'] || row['value'] || 0;
    const realRaw = row['realizado'] || row['pago_valor'] || 0;
    const pagoRaw = (row['pago'] || row['status'] || '').toString().toLowerCase();
    const parseNum = (v) => typeof v === 'number' ? v : Number(String(v).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const previsto = parseNum(prevRaw);
    const realizado = parseNum(realRaw);
    const pago = pagoRaw === 'sim' || pagoRaw === 'pago' || pagoRaw === 'recebido' || pagoRaw === 'true' || realizado > 0;
    let date = new Date().toISOString().slice(0, 10);
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d)) date = d.toISOString().slice(0, 10);
      else if (typeof dateRaw === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(dateRaw)) {
        const [dd, mm, yy] = dateRaw.split('/'); date = `${yy}-${mm}-${dd}`;
      }
    }
    return {
      id: `imp-conta-${Date.now()}-${i}`,
      tipo, category, description,
      vencimento: date,
      previsto,
      realizado: pago ? (realizado || previsto) : 0,
      pago,
      pagoEm: pago ? date : null,
    };
  }).filter(r => r.previsto > 0);
}

async function updateContaLocal(id, patch) {
  CONTAS = CONTAS.map(c => c.id === id ? { ...c, ...patch } : c);
  window.CONTAS = CONTAS;
  try {
    const s = window.getSession?.();
    if (s && !String(id).startsWith('imp-') && !String(id).startsWith('mock-')) {
      await window.updateConta(id, patch);
    }
  } catch (e) { console.warn('updateConta', e); }
  window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
}
async function deleteContaLocal(id) {
  CONTAS = CONTAS.filter(c => c.id !== id);
  window.CONTAS = CONTAS;
  try {
    const s = window.getSession?.();
    if (s && !String(id).startsWith('imp-') && !String(id).startsWith('mock-')) {
      await window.deleteConta(id);
    }
  } catch (e) { console.warn('deleteConta', e); }
  window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
}

async function addContas(rows) {
  CONTAS = [...rows, ...CONTAS];
  window.CONTAS = CONTAS;
  try {
    const s = window.getSession?.();
    const me = s ? await window.getMe?.() : null;
    const prof = me ? await window.getProfile?.(me.id) : null;
    if (prof?.company_id) {
      for (const r of rows) {
        try { await window.createConta(r, prof.company_id, me.id); } catch (e) { console.warn('createConta', e); }
      }
    }
  } catch (e) { console.warn('addContas sync', e); }
}

// Hidrata CONTAS/COMPRAS com dados reais do Supabase (chamado pelo AuthProvider após login)
// ⚠ BUG FIX (Patch 002): antes só substituía se houvesse dados (`if (contas?.length)`),
// o que deixava dados fake aparecerem quando a empresa tinha o banco vazio.
// Agora sempre substitui, mesmo com array vazio (dashboard fica limpa).
async function hydrateFromSupabase(companyId) {
  try {
    const [contas, compras, categorias] = await Promise.all([
      window.fetchContas(companyId),
      window.fetchCompras(companyId),
      window.fetchCategories ? window.fetchCategories(companyId) : Promise.resolve([]),
    ]);
    CONTAS = Array.isArray(contas) ? contas : [];
    COMPRAS = Array.isArray(compras) ? compras : [];
    window.CONTAS = CONTAS;
    window.COMPRAS = COMPRAS;
    // publica as categorias para os formulários de conta/compra lerem
    const cats = Array.isArray(categorias) ? categorias : [];
    window.APP_CATEGORIES = {
      entrada: cats.filter(c => c.type === 'entrada'),
      saida:   cats.filter(c => c.type === 'saida'),
    };
    window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
  } catch (e) {
    console.warn('hydrateFromSupabase', e);
    // Em caso de erro, mantém arrays vazios em vez de dados antigos
    CONTAS = []; COMPRAS = [];
    window.CONTAS = CONTAS; window.COMPRAS = COMPRAS;
    if (!window.APP_CATEGORIES) window.APP_CATEGORIES = { entrada: [], saida: [] };
    window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
  }
}

Object.assign(window, {
  CONTAS, COMPRAS,
  CATS_ENTRADA, CATS_SAIDA,
  fmt, fmtShort, fmtDate, months,
  monthKey, monthLabel, availableMonths,
  filterCompras, filterContas, monthlyAggregates, saldoAnterior,
  parseExcel, addCompras, parseExcelContas, addContas, catColor,
  hydrateFromSupabase,
  updateCompraLocal, deleteCompraLocal, updateContaLocal, deleteContaLocal,
});
