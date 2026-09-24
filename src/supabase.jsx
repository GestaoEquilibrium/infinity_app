// Supabase client + data access layer — mapeia o schema real do usuário:
// companies, profiles, transactions (contas), purchases (compras),
// categories, audit_log.
//
// O mapeamento conceitual:
//   CONTAS (a pagar/receber previsto×realizado)  → tabela `transactions`
//     - tipo 'receber'/'pagar' ↔ type 'entrada'/'saida'
//     - previsto               ↔ value
//     - realizado              ↔ actual_value (null → 0)
//     - pago                   ↔ status in ('pago','recebido')
//     - vencimento             ↔ date
//     - pagoEm                 ↔ settled_at
//   COMPRAS (caixa efetivo, lançamentos do dia-a-dia) → tabela `purchases`
//     - description  ↔ item
//     - category     ↔ supplier  (ou categoria derivada — manteremos)
//     - amount       ↔ total
//     - date         ↔ date

// URL e chave vêm de window.INFINITY_CONFIG (definido no <head> do index.html).
// Para apontar para um banco novo, edite APENAS o index.html.
const SUPABASE_URL = window.INFINITY_CONFIG?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.INFINITY_CONFIG?.SUPABASE_ANON_KEY || '';

// ---- REST helpers (sem SDK) ----
const SB_SESSION_KEY = 'sb-session-v1';
function getSession() {
  try { return JSON.parse(localStorage.getItem(SB_SESSION_KEY) || 'null'); } catch { return null; }
}
function setSession(s) {
  if (s) localStorage.setItem(SB_SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SB_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('sb-session-changed', { detail: s }));
}
function authHeaders(extra = {}) {
  const s = getSession();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${s?.access_token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}
// Renova o access_token usando o refresh_token (o token do Supabase expira em ~1h).
// Sem isso, o app quebra com "JWT expired" e obriga a deslogar/logar.
let _refreshing = null;
async function refreshSession() {
  const s = getSession();
  if (!s?.refresh_token) return null;
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      if (!res.ok) return null;
      const novo = await res.json();
      if (novo?.access_token) { setSession({ ...s, ...novo }); return novo; }
      return null;
    } catch { return null; }
    finally { setTimeout(() => { _refreshing = null; }, 0); }
  })();
  return _refreshing;
}

// ─── Modo "Grupo" (consolida Med Center + Talentos) ───
// Só muda algo quando a empresa ativa é 'GRUPO'; qualquer outro id se comporta igual a antes.
const GRUPO_COMPANY_IDS = ['7663eaab-3fa3-4067-91f6-71f8c77f8b55', '17749e39-3e73-41ab-b731-9463d760887b'];
function coFilter(cid) {
  return cid === 'GRUPO'
    ? `company_id=in.(${GRUPO_COMPANY_IDS.join(',')})`
    : `company_id=eq.${cid}`;
}
// Para GRAVAR não dá pra usar 'GRUPO' (precisa de um CNPJ real): cai na empresa-base (home).
function realCompany(cid) {
  return cid === 'GRUPO' ? (window.HOME_COMPANY_ID || GRUPO_COMPANY_IDS[0]) : cid;
}

async function sbRest(path, opts = {}, _jaTentou) {
  const metodo = String(opts.method || 'GET').toUpperCase();
  if (metodo !== 'GET' && !/^\/(rpc\/(admin_definir_acesso|invite_member_by_email)|profiles|audit_log)\b/.test(String(path)) && ['diretoria', 'viewer'].includes(window.__ROLE)) {
    throw new Error('Seu acesso é só de visualização — não é possível alterar dados.');
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: { ...authHeaders(opts.prefer ? { Prefer: opts.prefer } : {}), ...(opts.headers || {}) },
  });
  if (res.status === 401 && !_jaTentou) {
    const novo = await refreshSession();
    if (novo) return sbRest(path, opts, true);
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}
async function sbAuth(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.msg || json.error || 'Auth error');
  return json;
}

// ---- Auth ----
async function signIn(email, password) {
  const s = await sbAuth('/token?grant_type=password', { email, password });
  setSession(s);
  return s;
}
async function signUp(email, password, meta = {}) {
  const s = await sbAuth('/signup', { email, password, data: meta });
  if (s.access_token) setSession(s);
  return s;
}
async function signOut() {
  const s = getSession();
  if (s?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}` },
      });
    } catch {}
  }
  setSession(null);
}
async function updatePassword(newPassword) {
  const s = getSession();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function getMe() {
  const s = getSession();
  if (!s?.access_token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ---- Profile & Company ----
async function getProfile(userId) {
  const list = await sbRest(`/profiles?id=eq.${userId}&select=*,companies(*)`);
  return list[0] || null;
}
async function updateProfile(userId, patch) {
  return sbRest(`/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    prefer: 'return=representation',
  });
}
async function listTeam(companyId) {
  return sbRest(`/profiles?${coFilter(companyId)}&select=*&order=created_at.asc`);
}
async function inviteMember(email, role, companyId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/invite_member_by_email`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getSession()?.access_token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_email: email, p_role: role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.hint || JSON.stringify(data));
  if (data?.error) throw new Error(data.msg || data.error);
  if (data?.success) return { email, role, status: 'linked', user_id: data.user_id };
  throw new Error(JSON.stringify(data));
}
async function updateMemberRole(userId, role) {
  return sbRest(`/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    prefer: 'return=representation',
  });
}
// Cria a conta de outra pessoa SEM mexer na sessão de quem está logado
// (não usa sbAuth/signUp, que gravariam a sessão nova no navegador).
async function criarContaUsuario(email, senha, nome) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email).trim().toLowerCase(), password: senha, data: { name: nome } }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const m = json.msg || json.error_description || json.error || 'Não consegui criar a conta';
    if (/already|registered|exists/i.test(m)) return { jaExistia: true };
    if (/password/i.test(m)) throw new Error('Senha fraca: use pelo menos 6 caracteres.');
    throw new Error(m);
  }
  return { jaExistia: false, precisaConfirmar: !json.access_token };
}
async function definirAcesso(email, role, nome) {
  const r = await sbRest('/rpc/admin_definir_acesso', {
    method: 'POST', body: JSON.stringify({ p_email: email, p_role: role, p_nome: nome || null }),
  });
  if (r && r.error) throw new Error(r.msg || r.error);
  return r;
}
async function listarAcessos() {
  return sbRest('/profiles?select=id,name,email,role,company_id,created_at&order=name.asc');
}
async function removeMember(userId) {
  return sbRest(`/profiles?id=eq.${userId}`, { method: 'DELETE' });
}

// ---- Contas (transactions) ----
function rowToConta(r) {
  return {
    id: r.id,
    tipo: r.type === 'entrada' ? 'receber' : 'pagar',
    category: r.category || 'Geral',
    description: r.description,
    vencimento: r.date,
    previsto: Number(r.value || 0),
    realizado: Number(r.actual_value || (r.status === 'pago' || r.status === 'recebido' ? r.value : 0) || 0),
    pago: r.status === 'pago' || r.status === 'recebido',
    pagoEm: r.settled_at,
    conta: r.conta || null,
    recorrente_id: r.recorrente_id || null,
    origem: r.origem || 'sistema',
    baixa_de: r.baixa_de || null,
    created_by: r.created_by,
  };
}
function contaToRow(c, companyId, userId) {
  return {
    company_id: realCompany(companyId),
    created_by: userId,
    description: c.description,
    category: c.category,
    type: c.tipo === 'receber' ? 'entrada' : 'saida',
    value: c.previsto,
    actual_value: c.pago ? (c.realizado || c.previsto || null) : (c.realizado || null),
    date: c.vencimento,
    status: c.pago ? (c.tipo === 'receber' ? 'recebido' : 'pago') : 'pendente',
    settled_at: c.pagoEm || null,
    conta: c.conta || null,
    recorrente_id: c.recorrente_id || null,
    ...(c.origem ? { origem: c.origem } : {}),   // sem origem → 'sistema' (padrão do banco)
  };
}
// O Supabase devolve no máximo 1.000 linhas por pedido — busca em páginas até acabar
// (antes, acima de 1.000 lançamentos os mais antigos sumiam sem aviso).
async function fetchTodas(pathBase, pagina = 1000) {
  const out = [];
  for (let off = 0; off < 50000; off += pagina) {
    const lote = await sbRest(`${pathBase}&limit=${pagina}&offset=${off}`);
    if (!Array.isArray(lote)) break;
    out.push(...lote);
    if (lote.length < pagina) break;
  }
  return out;
}
async function fetchContas(companyId) {
  const rows = await fetchTodas(`/transactions?${coFilter(companyId)}&select=*&order=date.desc,id.asc`);
  return rows.map(rowToConta);
}
async function createConta(c, companyId, userId) {
  return sbRest('/transactions', { method: 'POST', body: JSON.stringify(contaToRow(c, companyId, userId)), prefer: 'return=representation' });
}
async function markContaPaga(id, actualValue) {
  return sbRest(`/transactions?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'pago', actual_value: actualValue, settled_at: new Date().toISOString().slice(0, 10) }),
    prefer: 'return=representation',
  });
}

// ---- Contas recorrentes (moldes de pagamentos fixos) ----
// Ex.: financiamento, assinatura do sistema, assinatura do Claude.
// O molde fica aqui; cada mês vira uma conta PENDENTE em `transactions`
// (vinculada por recorrente_id) só quando você abre o mês na tela Contas.
async function fetchRecorrentes(companyId) {
  const rows = await sbRest(`/contas_recorrentes?${coFilter(companyId)}&select=*&order=description.asc`);
  return Array.isArray(rows) ? rows : [];
}
async function createRecorrente(companyId, userId, r) {
  const body = {
    company_id: realCompany(companyId), created_by: userId,
    description: r.description, category: r.category || null,
    tipo: r.tipo === 'receber' ? 'receber' : 'pagar',
    previsto: Number(r.previsto || 0),
    dia_vencimento: Math.min(31, Math.max(1, Number(r.dia_vencimento) || 10)),
    data_inicio: r.data_inicio || new Date().toISOString().slice(0, 10),
    data_fim: r.data_fim || null,
    ativo: r.ativo !== false,
  };
  return sbRest('/contas_recorrentes', { method: 'POST', prefer: 'return=representation', body: JSON.stringify(body) });
}
async function updateRecorrente(id, patch) {
  const body = {};
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.tipo !== undefined) body.tipo = patch.tipo === 'receber' ? 'receber' : 'pagar';
  if (patch.previsto !== undefined) body.previsto = Number(patch.previsto || 0);
  if (patch.dia_vencimento !== undefined) body.dia_vencimento = Math.min(31, Math.max(1, Number(patch.dia_vencimento) || 10));
  if (patch.data_inicio !== undefined) body.data_inicio = patch.data_inicio;
  if (patch.data_fim !== undefined) body.data_fim = patch.data_fim || null;
  if (patch.ativo !== undefined) body.ativo = !!patch.ativo;
  return sbRest(`/contas_recorrentes?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify(body) });
}
async function deleteRecorrente(id) {
  return sbRest(`/contas_recorrentes?id=eq.${id}`, { method: 'DELETE' });
}

// ---- Produção mensal (base da projeção) ----
async function fetchProducaoMensal(companyId) {
  return sbRest(`/producao_mensal?${coFilter(companyId)}&select=*&order=competencia.asc`);
}
async function upsertProducaoMensal(companyId, userId, comp, convenio, atendimentos, valorPorAtend, ajustado, obs) {
  const body = {
    company_id: realCompany(companyId), competencia: comp, convenio,
    atendimentos, valor_por_atend: valorPorAtend,
    ajustado: !!ajustado, observacao: obs || null, updated_at: new Date().toISOString(),
  };
  return sbRest('/producao_mensal?on_conflict=company_id,competencia,convenio', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(body),
  });
}

// ---- Contas bancárias / saldo real ----
async function fetchContasBancarias(companyId) {
  return sbRest(`/contas_bancarias?${coFilter(companyId)}&ativo=is.true&select=*&order=ordem.asc`);
}
async function updateContaBancaria(id, patch) {
  return sbRest(`/contas_bancarias?id=eq.${id}`, {
    method: 'PATCH', prefer: 'return=representation',
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}
// Saldo de cada conta = saldo de abertura + tudo que já foi pago/recebido desde então.
// Aqui as transferências internas CONTAM: elas movimentam cada conta de verdade
// (só se anulam quando se olha o grupo consolidado).
function saldosPorConta(contasBancarias) {
  const tx = window.CONTAS || [];
  return (contasBancarias || []).map(cb => {
    const mov = tx.reduce((s, c) => {
      if (!c.pago) return s;
      if ((c.conta || '') !== cb.nome) return s;
      if (c.vencimento < cb.data_inicial) return s;
      return s + (c.tipo === 'receber' ? (c.realizado || c.previsto) : -(c.realizado || c.previsto));
    }, 0);
    return { ...cb, movimento: mov, saldo: Number(cb.saldo_inicial || 0) + mov };
  });
}

// ---- Compras (purchases) ----
function rowToCompra(r) {
  const type = (Number(r.total) >= 0 && r.status !== 'cancelado') ? 'saida' : 'saida'; // purchases são sempre saída de caixa
  return {
    id: r.id,
    type: 'saida',
    category: r.supplier || 'Geral',
    color: 'var(--c-danger)',
    description: r.item,
    amount: Number(r.total || 0),
    date: r.date,
    paymentMethod: r.status === 'entregue' ? 'Entregue' : r.status === 'em_transito' ? 'Em trânsito' : r.status,
    created_by: r.created_by,
  };
}
function compraToRow(c, companyId, userId) {
  return {
    company_id: realCompany(companyId),
    created_by: userId,
    item: c.description,
    supplier: c.category,
    qty: c.qty || 1,
    unit_price: c.unit_price || c.amount,
    total: c.amount,
    date: c.date,
    status: c.paymentMethod === 'Em trânsito' ? 'em_transito' : 'entregue',
  };
}
async function fetchCompras(companyId) {
  const rows = await sbRest(`/purchases?${coFilter(companyId)}&select=*&order=date.desc&limit=1000`);
  return rows.map(rowToCompra);
}
async function createCompra(c, companyId, userId) {
  return sbRest('/purchases', { method: 'POST', body: JSON.stringify(compraToRow(c, companyId, userId)), prefer: 'return=representation' });
}

async function updateConta(id, patch) {
  const body = {};
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.tipo !== undefined) body.type = patch.tipo === 'receber' ? 'entrada' : 'saida';
  if (patch.previsto !== undefined) body.value = patch.previsto;
  if (patch.realizado !== undefined) body.actual_value = patch.realizado || null;
  if (patch.vencimento !== undefined) body.date = patch.vencimento;
  if (patch.pago !== undefined) {
    body.status = patch.pago ? (patch.tipo === 'receber' || (body.type === 'entrada') ? 'recebido' : 'pago') : 'pendente';
    body.settled_at = patch.pago ? (patch.pagoEm || new Date().toISOString().slice(0,10)) : null;
  }
  return sbRest(`/transactions?id=eq.${id}`, {
    method: 'PATCH', body: JSON.stringify(body), prefer: 'return=representation',
  });
}
async function deleteConta(id) {
  return sbRest(`/transactions?id=eq.${id}`, { method: 'DELETE' });
}

async function updateCompra(id, patch) {
  const body = {};
  if (patch.description !== undefined) body.item = patch.description;
  if (patch.category !== undefined) body.supplier = patch.category;
  if (patch.amount !== undefined) { body.total = patch.amount; body.unit_price = patch.amount; }
  if (patch.date !== undefined) body.date = patch.date;
  if (patch.paymentMethod !== undefined) body.status = patch.paymentMethod === 'Em trânsito' ? 'em_transito' : 'entregue';
  return sbRest(`/purchases?id=eq.${id}`, {
    method: 'PATCH', body: JSON.stringify(body), prefer: 'return=representation',
  });
}
async function deleteCompra(id) {
  return sbRest(`/purchases?id=eq.${id}`, { method: 'DELETE' });
}

// ---- Categories ----
async function fetchCategories(companyId) {
  const rows = await sbRest(`/categories?${coFilter(companyId)}&select=*&order=name.asc`);
  return rows || [];
}
async function createCategory(companyId, userId, { name, type, color }) {
  return sbRest('/categories', {
    method: 'POST',
    body: JSON.stringify({ company_id: realCompany(companyId), name, type, color: color || '#6b7280', is_active: true }),
    prefer: 'return=representation',
  });
}
async function updateCategory(id, patch) {
  return sbRest(`/categories?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    prefer: 'return=representation',
  });
}
async function deleteCategory(id) {
  return sbRest(`/categories?id=eq.${id}`, { method: 'DELETE' });
}

// ---- Audit log ----
async function fetchAuditLog(companyId, limit = 100) {
  return sbRest(`/audit_log?${coFilter(companyId)}&select=*&order=created_at.desc&limit=${limit}`);
}
async function logAction(companyId, userId, action, tableName, recordId, newData) {
  try {
    await sbRest('/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        company_id: realCompany(companyId),
        user_id: userId,
        action, table_name: tableName, record_id: recordId, new_data: newData,
      }),
    });
  } catch (e) { console.warn('audit log failed', e); }
}

// ---- Role-based access ----
// admin  → tudo
// editor → Dashboard, Contas, Compras, Agenda, Relatórios, RH (sem excluir)
// viewer → só Dashboard e leitura
const ROLE_ACCESS = {
  admin: ['dashboard', 'caixa', 'contas', 'projecao', 'impostos', 'repasse', 'compras', 'agenda', 'relatorios', 'conciliacao', 'rh', 'equipe', 'perfil', 'config', 'ajuda', 'hoje', 'equipe_pag'],
  editor: ['dashboard', 'caixa', 'contas', 'projecao', 'impostos', 'repasse', 'compras', 'agenda', 'relatorios', 'conciliacao', 'rh', 'perfil', 'ajuda', 'hoje', 'equipe_pag'],
  // Diretoria: vê tudo, não altera nada (o banco bloqueia gravação)
  diretoria: ['dashboard', 'caixa', 'contas', 'projecao', 'impostos', 'repasse', 'compras', 'agenda', 'relatorios', 'conciliacao', 'rh', 'perfil', 'ajuda', 'hoje', 'equipe_pag'],
  viewer: ['dashboard', 'caixa', 'agenda', 'perfil', 'ajuda', 'hoje'],
  pendente: ['perfil', 'ajuda'],
  bloqueado: [],
};
function canAccess(role, page) {
  return (ROLE_ACCESS[role] || ROLE_ACCESS.viewer).includes(page);
}

// ---- Empresas (para o seletor multi-empresa) ----
// Com a RLS multi-empresa, isto retorna todas as empresas do grupo.
async function fetchCompanies() {
  const rows = await sbRest('/companies?select=id,name,cnpj&order=name.asc');
  return Array.isArray(rows) ? rows : [];
}

// ---- Eventos da agenda da clínica (manuais) ----
async function fetchEventos(companyId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const rows = await sbRest(`/eventos_agenda?${coFilter(companyId)}&data=gte.${hoje}&select=*&order=data.asc`);
  return Array.isArray(rows) ? rows : [];
}
async function createEvento(companyId, titulo, data, tipo, observacao) {
  return sbRest(`/eventos_agenda`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ company_id: realCompany(companyId), titulo, data, tipo: tipo || 'evento', observacao: observacao || null }]),
  });
}
async function deleteEvento(id) {
  return sbRest(`/eventos_agenda?id=eq.${id}`, { method: 'DELETE' });
}

// ---- Favorecidos (CPF mascarado do Sicoob → pessoa) ----
async function fetchFavorecidos() {
  // Lê das duas empresas do grupo (a regra de acesso do banco filtra o que o usuário pode ver)
  return sbRest(`/favorecidos?${coFilter('GRUPO')}&select=cpf_meio,nome,papel,categoria`);
}
async function salvarFavorecido(cpfMeio, nome, companyId, categoria) {
  const body = { company_id: realCompany(companyId), cpf_meio: cpfMeio, nome };
  if (categoria) body.categoria = categoria; // sem categoria → não mexe na que já existe
  return sbRest('/favorecidos?on_conflict=company_id,cpf_meio', {
    method: 'POST',
    body: JSON.stringify(body),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

// ---- Regras de categoria por texto (aplicadas pelo banco em todo lançamento novo) ----
async function salvarRegra(padrao, tipo, categoria, companyId) {
  return sbRest('/regras_categoria?on_conflict=company_id,padrao,tipo', {
    method: 'POST',
    body: JSON.stringify({ company_id: realCompany(companyId), padrao, tipo, categoria, prioridade: 25 }),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}
async function reclassificarPendentes() {
  return sbRest('/rpc/reclassificar_pendentes', { method: 'POST', body: '{}' });
}

Object.assign(window, {
  coFilter, realCompany, criarContaUsuario, definirAcesso, listarAcessos,
  fetchFavorecidos, salvarFavorecido, salvarRegra, reclassificarPendentes, fetchTodas,
  fetchEventos, createEvento, deleteEvento,
  SUPABASE_URL, SUPABASE_ANON_KEY,
  __sbRest: sbRest, refreshSession,
  getSession, setSession, signIn, signUp, signOut, updatePassword, getMe,
  getProfile, updateProfile, listTeam, inviteMember, updateMemberRole, removeMember,
  fetchCompanies,
  fetchContas, createConta, updateConta, deleteConta, markContaPaga, rowToConta, contaToRow,
  fetchRecorrentes, createRecorrente, updateRecorrente, deleteRecorrente,
  fetchContasBancarias, updateContaBancaria, saldosPorConta,
  fetchProducaoMensal, upsertProducaoMensal,
  fetchCompras, createCompra, updateCompra, deleteCompra, rowToCompra, compraToRow,
  fetchCategories, createCategory, updateCategory, deleteCategory, fetchAuditLog, logAction,
  ROLE_ACCESS, canAccess,
});
