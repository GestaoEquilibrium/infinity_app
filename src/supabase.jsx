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
async function sbRest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: { ...authHeaders(opts.prefer ? { Prefer: opts.prefer } : {}), ...(opts.headers || {}) },
  });
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
  return sbRest(`/profiles?company_id=eq.${companyId}&select=*&order=created_at.asc`);
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
    created_by: r.created_by,
  };
}
function contaToRow(c, companyId, userId) {
  return {
    company_id: companyId,
    created_by: userId,
    description: c.description,
    category: c.category,
    type: c.tipo === 'receber' ? 'entrada' : 'saida',
    value: c.previsto,
    actual_value: c.pago ? (c.realizado || c.previsto || null) : (c.realizado || null),
    date: c.vencimento,
    status: c.pago ? (c.tipo === 'receber' ? 'recebido' : 'pago') : 'pendente',
    settled_at: c.pagoEm || null,
  };
}
async function fetchContas(companyId) {
  const rows = await sbRest(`/transactions?company_id=eq.${companyId}&select=*&order=date.desc&limit=1000`);
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
    company_id: companyId,
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
  const rows = await sbRest(`/purchases?company_id=eq.${companyId}&select=*&order=date.desc&limit=1000`);
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
  const rows = await sbRest(`/categories?company_id=eq.${companyId}&select=*&order=name.asc`);
  return rows || [];
}
async function createCategory(companyId, userId, { name, type, color }) {
  return sbRest('/categories', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, name, type, color: color || '#6b7280', is_active: true }),
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
  return sbRest(`/audit_log?company_id=eq.${companyId}&select=*&order=created_at.desc&limit=${limit}`);
}
async function logAction(companyId, userId, action, tableName, recordId, newData) {
  try {
    await sbRest('/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        company_id: companyId,
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
  admin: ['dashboard', 'contas', 'impostos', 'compras', 'agenda', 'relatorios', 'rh', 'equipe', 'perfil', 'config'],
  editor: ['dashboard', 'contas', 'impostos', 'compras', 'agenda', 'relatorios', 'rh', 'perfil'],
  viewer: ['dashboard', 'agenda', 'rh', 'perfil'],
};
function canAccess(role, page) {
  return (ROLE_ACCESS[role] || ROLE_ACCESS.viewer).includes(page);
}

Object.assign(window, {
  SUPABASE_URL, SUPABASE_ANON_KEY,
  getSession, setSession, signIn, signUp, signOut, updatePassword, getMe,
  getProfile, updateProfile, listTeam, inviteMember, updateMemberRole, removeMember,
  fetchContas, createConta, updateConta, deleteConta, markContaPaga, rowToConta, contaToRow,
  fetchCompras, createCompra, updateCompra, deleteCompra, rowToCompra, compraToRow,
  fetchCategories, createCategory, updateCategory, deleteCategory, fetchAuditLog, logAction,
  ROLE_ACCESS, canAccess,
});
