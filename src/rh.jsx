// ═══════════════════════════════════════════════════════════════════════
// RH — Aba completa de gestão de pessoas
// Segue a estética do Infinity: OKLCH, Space Grotesk, TiltCard, Pill, Btn
// Sub-abas: Dashboard · Colaboradores · Férias · Faltas · Atestados · Alertas · Pendências · Rescisões
// ═══════════════════════════════════════════════════════════════════════

// ─── Supabase RH API (sem SDK, mesmo padrão do supabase.jsx) ───
const SB_URL_RH = () => window.SUPABASE_URL;
const sbRH = async (path, opts = {}) => {
  const s = window.getSession?.();
  const res = await fetch(`${SB_URL_RH()}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${s?.access_token || window.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
};

// CRUD genérico por tabela
const rhListColab = (cid) => sbRH(`/colaboradores?company_id=eq.${cid}&select=*&order=nome.asc&limit=500`);
const rhCreateColab = (c, cid, uid) => sbRH('/colaboradores', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...c, company_id: cid, created_by: uid }) });
const rhUpdateColab = (id, patch) => sbRH(`/colaboradores?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation',
  body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
const rhDeleteColab = (id) => sbRH(`/colaboradores?id=eq.${id}`, { method: 'DELETE' });

const rhListFaltas = (cid) => sbRH(`/faltas?company_id=eq.${cid}&select=*&order=data.desc&limit=1000`);
const rhCreateFalta = (f, cid, uid) => sbRH('/faltas', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...f, company_id: cid, created_by: uid }) });
const rhDeleteFalta = (id) => sbRH(`/faltas?id=eq.${id}`, { method: 'DELETE' });

const rhListAtestados = (cid) => sbRH(`/atestados?company_id=eq.${cid}&select=*&order=data_inicio.desc&limit=500`);
const rhCreateAtestado = (a, cid, uid) => sbRH('/atestados', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...a, company_id: cid, created_by: uid }) });
const rhUpdateAtestado = (id, patch) => sbRH(`/atestados?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation',
  body: JSON.stringify(patch) });
const rhDeleteAtestado = (id) => sbRH(`/atestados?id=eq.${id}`, { method: 'DELETE' });

const rhListAlertas = (cid) => sbRH(`/alertas_legais?company_id=eq.${cid}&select=*&order=created_at.desc&limit=200`);
const rhCreateAlerta = (a, cid, uid) => sbRH('/alertas_legais', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...a, company_id: cid, created_by: uid }) });
const rhUpdateAlerta = (id, patch) => sbRH(`/alertas_legais?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation',
  body: JSON.stringify(patch) });
const rhDeleteAlerta = (id) => sbRH(`/alertas_legais?id=eq.${id}`, { method: 'DELETE' });

const rhListPend = (cid) => sbRH(`/rh_pendencias?company_id=eq.${cid}&select=*&order=created_at.desc&limit=200`);
const rhCreatePend = (p, cid, uid) => sbRH('/rh_pendencias', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...p, company_id: cid, created_by: uid }) });
const rhUpdatePend = (id, patch) => sbRH(`/rh_pendencias?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation',
  body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
const rhDeletePend = (id) => sbRH(`/rh_pendencias?id=eq.${id}`, { method: 'DELETE' });

const rhListRescisoes = (cid) => sbRH(`/rescisoes?company_id=eq.${cid}&select=*&order=data_rescisao.desc&limit=200`);
const rhCreateRescisao = (r, cid, uid) => sbRH('/rescisoes', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...r, company_id: cid, created_by: uid }) });

// Upload atestado para Storage
const rhUploadAtestado = async (file, colaboradorId, atestadoId) => {
  const s = window.getSession?.();
  if (!s?.access_token) throw new Error('Não autenticado');
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${colaboradorId}/${atestadoId}.${ext}`;
  const url = `${SB_URL_RH()}/storage/v1/object/atestados/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${s.access_token}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload falhou: ${await res.text()}`);
  const publicUrl = `${SB_URL_RH()}/storage/v1/object/authenticated/atestados/${path}`;
  return { path, publicUrl };
};

// ─── Helpers compartilhados ───
const fmtDateRH = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
const iniRH = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const regimeColor = (r) => ({
  'CLT': 'var(--c-secondary)',
  'PJ': 'var(--c-primary)',
  'Estagiário': 'var(--c-tertiary)',
  'Prestador': 'var(--c-pink)',
  'Sócio': 'var(--c-violet)',
}[r] || 'var(--c-primary)');

// Calcula dias até a data-limite de férias
const diasFerias = (limite) => {
  if (!limite) return null;
  return Math.ceil((new Date(limite) - new Date()) / (1000 * 60 * 60 * 24));
};

// ═════════════════════════════════════════════════════════════════════
// Hook principal de dados RH
// ═════════════════════════════════════════════════════════════════════
const useRHData = () => {
  const { profile } = window.useAuth();
  const companyId = profile?.company_id;
  const userId = profile?.id;

  const [data, setData] = React.useState({
    colaboradores: [], faltas: [], atestados: [], alertas: [], pendencias: [], rescisoes: [],
    loading: true, error: null,
  });

  const reload = React.useCallback(async () => {
    if (!companyId) { setData(d => ({ ...d, loading: false })); return; }
    setData(d => ({ ...d, loading: true, error: null }));
    try {
      const [colaboradores, faltas, atestados, alertas, pendencias, rescisoes] = await Promise.all([
        rhListColab(companyId),
        rhListFaltas(companyId),
        rhListAtestados(companyId),
        rhListAlertas(companyId),
        rhListPend(companyId),
        rhListRescisoes(companyId),
      ]);
      setData({ colaboradores, faltas, atestados, alertas, pendencias, rescisoes, loading: false, error: null });
    } catch (err) {
      setData(d => ({ ...d, loading: false, error: err.message }));
    }
  }, [companyId]);

  React.useEffect(() => { reload(); }, [reload]);

  return { ...data, companyId, userId, reload };
};

// ═════════════════════════════════════════════════════════════════════
// Toast simples
// ═════════════════════════════════════════════════════════════════════
const useToast = () => {
  const [toast, setToast] = React.useState(null);
  const show = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };
  const ToastView = () => toast ? (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 200,
      padding: '14px 20px', borderRadius: 'var(--r-md)',
      background: 'var(--surface)', boxShadow: 'var(--shadow-lg)',
      border: `1px solid ${toast.type === 'error' ? 'var(--c-danger)' : 'var(--c-primary)'}`,
      fontSize: 13, fontWeight: 500,
      animation: 'popIn 0.3s cubic-bezier(.22,1,.36,1)',
      maxWidth: 360,
    }}>
      {toast.msg}
    </div>
  ) : null;
  return { show, ToastView };
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Dashboard RH
// ═════════════════════════════════════════════════════════════════════
const RHDashboard = ({ data, setSubPage }) => {
  const ativos = data.colaboradores.filter(c => c.status === 'Ativo');
  const clts = ativos.filter(c => c.regime === 'CLT');
  const folha = ativos.reduce((s, c) => s + (Number(c.salario) || 0), 0);
  const custoReal = folha * 1.6;
  const alertasCriticos = data.alertas.filter(a => !a.resolvido && a.prioridade === 'crítica').length;
  const pendAbertas = data.pendencias.filter(p => p.status !== 'Resolvida').length;
  const atestadosRecentes = data.atestados.filter(a => {
    if (!a.data_inicio) return false;
    return (Date.now() - new Date(a.data_inicio).getTime()) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  // Férias críticas
  const feriasCriticas = clts
    .map(c => ({ ...c, dias: diasFerias(c.limite_ferias) }))
    .filter(c => c.dias !== null && c.dias < 60)
    .sort((a, b) => a.dias - b.dias);

  const kpi = (label, value, color, sub) => (
    <window.TiltCard padding={20} style={{ minHeight: 110 }} glowColor={color}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1, letterSpacing: -0.8 }} className="mono">{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4 }}>{sub}</div>}
    </window.TiltCard>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {kpi('Ativos', ativos.length, 'var(--c-primary)', `${clts.length} CLT · ${ativos.length - clts.length} outros`)}
        {kpi('Folha mensal', 'R$ ' + folha.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), 'var(--c-secondary)', 'base CLT + sócios')}
        {kpi('Custo real CLT', 'R$ ' + custoReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), 'var(--c-tertiary)', '~1,60× folha')}
        {kpi('Alertas críticos', alertasCriticos, alertasCriticos > 0 ? 'var(--c-danger)' : 'var(--c-primary)', alertasCriticos > 0 ? 'Ação imediata' : 'Sob controle')}
        {kpi('Pendências', pendAbertas, 'var(--c-violet)', 'abertas')}
        {kpi('Atestados 30d', atestadosRecentes, 'var(--c-pink)', 'últimos 30 dias')}
      </div>

      {/* Alertas críticos */}
      {data.alertas.filter(a => !a.resolvido).length > 0 && (
        <window.TiltCard interactive={false} padding={0}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Alertas legais abertos</h3>
            <window.Btn variant="ghost" size="sm" onClick={() => setSubPage('alertas')}>Ver todos →</window.Btn>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.alertas.filter(a => !a.resolvido).slice(0, 5).map(a => {
              const color = a.prioridade === 'crítica' ? 'var(--c-danger)' : a.prioridade === 'alta' ? 'var(--c-tertiary)' : 'var(--c-secondary)';
              return (
                <div key={a.id} style={{
                  display: 'flex', gap: 12, padding: 12, borderRadius: 'var(--r-sm)',
                  background: `color-mix(in oklch, ${color} 6%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${color} 20%, transparent)`,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: color, marginTop: 7, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{a.descricao}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <window.Pill color={color} size="sm">{a.prioridade.toUpperCase()}</window.Pill>
                      {a.categoria && <window.Pill color="var(--ink-mute)" size="sm">{a.categoria}</window.Pill>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </window.TiltCard>
      )}

      {/* Férias críticas */}
      {feriasCriticas.length > 0 && (
        <window.TiltCard interactive={false} padding={0}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Férias a vencer (&lt; 60 dias)</h3>
            <window.Btn variant="ghost" size="sm" onClick={() => setSubPage('ferias')}>Controle completo →</window.Btn>
          </div>
          <div style={{ padding: 8 }}>
            {feriasCriticas.slice(0, 6).map(c => {
              const cor = c.dias < 0 ? 'var(--c-danger)' : c.dias < 30 ? 'var(--c-tertiary)' : 'var(--c-warning)';
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 'var(--r-sm)' }}>
                  <window.Avatar initials={iniRH(c.nome)} size={34} color={regimeColor(c.regime)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Limite: {fmtDateRH(c.limite_ferias)}</div>
                  </div>
                  <window.Pill color={cor} size="sm">
                    {c.dias < 0 ? `VENCIDA há ${Math.abs(c.dias)}d` : `${c.dias}d`}
                  </window.Pill>
                </div>
              );
            })}
          </div>
        </window.TiltCard>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Colaboradores
// ═════════════════════════════════════════════════════════════════════
const RHColaboradores = ({ data, reload, toast }) => {
  const { profile } = window.useAuth();
  const canWrite = ['admin', 'editor'].includes(profile?.role);
  const [q, setQ] = React.useState('');
  const [fRegime, setFRegime] = React.useState('');
  const [fStatus, setFStatus] = React.useState('Ativo');
  const [editing, setEditing] = React.useState(null);
  const [viewing, setViewing] = React.useState(null);

  const filtered = data.colaboradores.filter(c => {
    if (fStatus && c.status !== fStatus) return false;
    if (fRegime && c.regime !== fRegime) return false;
    if (q) {
      const s = (c.nome + ' ' + (c.cpf || '') + ' ' + (c.cargo || '')).toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barra de filtros */}
      <window.TiltCard interactive={false} padding={16}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar nome, CPF, cargo..."
            style={{
              flex: 1, minWidth: 220, padding: '10px 16px',
              borderRadius: 'var(--r-sm)', border: '1px solid var(--line)',
              background: 'var(--surface-2)', fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)',
            }}
          />
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selectStyleRH}>
            <option value="">Todos status</option>
            <option>Ativo</option><option>Afastado</option><option>Desligado</option>
          </select>
          <select value={fRegime} onChange={e => setFRegime(e.target.value)} style={selectStyleRH}>
            <option value="">Todos regimes</option>
            <option>CLT</option><option>PJ</option><option>Estagiário</option><option>Prestador</option><option>Sócio</option>
          </select>
          {canWrite && (
            <window.Btn variant="primary" icon="plus" onClick={() => setEditing({})}>Novo colaborador</window.Btn>
          )}
        </div>
      </window.TiltCard>

      {/* Tabela */}
      <window.TiltCard interactive={false} padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Nome', 'Cargo', 'Regime', 'Admissão', 'Limite férias', 'Status', ''].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 6 ? 'right' : 'left',
                  padding: '12px 20px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  color: 'var(--ink-mute)', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} style={{
                borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none',
                cursor: 'pointer',
              }} onClick={() => setViewing(c)}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <window.Avatar initials={iniRH(c.nome)} size={34} color={regimeColor(c.regime)} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-soft)' }}>{c.cargo || '—'}</td>
                <td style={{ padding: '14px 20px' }}><window.Pill color={regimeColor(c.regime)} size="sm">{c.regime}</window.Pill></td>
                <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--ink-mute)' }} className="mono">{fmtDateRH(c.admissao)}</td>
                <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--ink-mute)' }} className="mono">{fmtDateRH(c.limite_ferias)}</td>
                <td style={{ padding: '14px 20px' }}>
                  <window.Pill
                    color={c.status === 'Ativo' ? 'var(--c-primary)' : c.status === 'Afastado' ? 'var(--c-tertiary)' : 'var(--ink-mute)'}
                    size="sm"
                  >{c.status}</window.Pill>
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  {canWrite && (
                    <window.Btn variant="ghost" size="sm" onClick={() => setEditing(c)}>Editar</window.Btn>
                  )}
                </td>
              </tr>
            ))}
            {!data.loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                {data.colaboradores.length === 0 ? 'Nenhum colaborador cadastrado. Clique em "Novo colaborador" para começar.' : 'Nenhum resultado para os filtros atuais.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </window.TiltCard>

      {editing && (
        <ColabForm colab={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); toast.show('Colaborador salvo'); }} onDeleted={() => { setEditing(null); reload(); toast.show('Colaborador removido'); }} toast={toast} />
      )}
      {viewing && <ColabDetail colab={viewing} data={data} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} />}
    </div>
  );
};

// ─── Modal: formulário de colaborador ───
const ColabForm = ({ colab, onClose, onSaved, onDeleted, toast }) => {
  const { profile } = window.useAuth();
  const [form, setForm] = React.useState({
    nome: '', cargo: '', setor: 'Administrativo', regime: 'CLT', status: 'Ativo',
    cpf: '', cnpj: '', rg: '', pis: '', ctps: '', titulo_eleitor: '', cnh: '', conselho: '',
    nascimento: '', estado_civil: '', escolaridade: '', sexo: '',
    telefone: '', email: '', endereco: '', cep: '',
    admissao: '', limite_ferias: '', salario: '', pagador: '', observacoes: '',
    ...colab,
  });
  const [saving, setSaving] = React.useState(false);
  const isEdit = !!colab.id;
  const canDelete = profile?.role === 'admin' && isEdit;

  const save = async () => {
    if (!form.nome) { toast.show('Nome é obrigatório', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      // Converte strings vazias em null para campos date/numeric
      ['nascimento', 'admissao', 'limite_ferias', 'data_desligamento', 'rnm_validade'].forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      if (payload.salario === '') payload.salario = null;
      else if (payload.salario) payload.salario = parseFloat(payload.salario);

      // Remove campos de leitura
      delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.created_by; delete payload.company_id;

      if (isEdit) await rhUpdateColab(colab.id, payload);
      else await rhCreateColab(payload, profile.company_id, profile.id);
      onSaved();
    } catch (e) {
      toast.show('Erro: ' + e.message, 'error');
    } finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!confirm(`Excluir ${colab.nome}? Esta ação não pode ser desfeita.`)) return;
    try {
      await rhDeleteColab(colab.id);
      onDeleted();
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); }
  };

  return (
    <Modal title={isEdit ? 'Editar colaborador' : 'Novo colaborador'} onClose={onClose} width={760}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Nome completo*" full>
          <input style={inputRH} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
        </Field>
        <Field label="CPF"><input style={inputRH} value={form.cpf || ''} onChange={e => setForm({ ...form, cpf: e.target.value })} /></Field>
        <Field label="CNPJ"><input style={inputRH} value={form.cnpj || ''} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></Field>
        <Field label="Data nascimento"><input type="date" style={inputRH} value={form.nascimento || ''} onChange={e => setForm({ ...form, nascimento: e.target.value })} /></Field>
        <Field label="Sexo">
          <select style={inputRH} value={form.sexo || ''} onChange={e => setForm({ ...form, sexo: e.target.value })}>
            {['', 'Masculino', 'Feminino'].map(x => <option key={x} value={x}>{x || '—'}</option>)}
          </select>
        </Field>
        <Field label="Regime*">
          <select style={inputRH} value={form.regime} onChange={e => setForm({ ...form, regime: e.target.value })}>
            {['CLT', 'PJ', 'Estagiário', 'Prestador', 'Sócio'].map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Cargo"><input style={inputRH} value={form.cargo || ''} onChange={e => setForm({ ...form, cargo: e.target.value })} /></Field>
        <Field label="Setor">
          <select style={inputRH} value={form.setor || 'Administrativo'} onChange={e => setForm({ ...form, setor: e.target.value })}>
            {['Administrativo', 'Corpo Clínico', 'Estagiários', 'Talentos'].map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Telefone"><input style={inputRH} value={form.telefone || ''} onChange={e => setForm({ ...form, telefone: e.target.value })} /></Field>
        <Field label="E-mail"><input style={inputRH} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Salário (R$)"><input type="number" step="0.01" style={inputRH} value={form.salario || ''} onChange={e => setForm({ ...form, salario: e.target.value })} /></Field>
        <Field label="Admissão"><input type="date" style={inputRH} value={form.admissao || ''} onChange={e => setForm({ ...form, admissao: e.target.value })} /></Field>
        <Field label="Limite de férias"><input type="date" style={inputRH} value={form.limite_ferias || ''} onChange={e => setForm({ ...form, limite_ferias: e.target.value })} /></Field>
        <Field label="Status">
          <select style={inputRH} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {['Ativo', 'Afastado', 'Desligado'].map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Pagador">
          <select style={inputRH} value={form.pagador || ''} onChange={e => setForm({ ...form, pagador: e.target.value })}>
            <option value="">—</option>
            <option>MEDCENTER</option><option>TALENTOS</option>
          </select>
        </Field>
        <Field label="RG"><input style={inputRH} value={form.rg || ''} onChange={e => setForm({ ...form, rg: e.target.value })} /></Field>
        <Field label="PIS"><input style={inputRH} value={form.pis || ''} onChange={e => setForm({ ...form, pis: e.target.value })} /></Field>
        <Field label="CTPS"><input style={inputRH} value={form.ctps || ''} onChange={e => setForm({ ...form, ctps: e.target.value })} /></Field>
        <Field label="Título de eleitor"><input style={inputRH} value={form.titulo_eleitor || ''} onChange={e => setForm({ ...form, titulo_eleitor: e.target.value })} /></Field>
        <Field label="Endereço" full><input style={inputRH} value={form.endereco || ''} onChange={e => setForm({ ...form, endereco: e.target.value })} /></Field>
        <Field label="CEP"><input style={inputRH} value={form.cep || ''} onChange={e => setForm({ ...form, cep: e.target.value })} /></Field>
        <Field label="Conselho / CRP / CRM"><input style={inputRH} value={form.conselho || ''} onChange={e => setForm({ ...form, conselho: e.target.value })} /></Field>
        <Field label="Observações" full>
          <textarea style={{ ...inputRH, minHeight: 64 }} value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
        <div>
          {canDelete && (
            <window.Btn variant="ghost" onClick={doDelete} style={{ color: 'var(--c-danger)' }}>Excluir colaborador</window.Btn>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
          <window.Btn variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</window.Btn>
        </div>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Geração de CONTRATO (.docx) — preenche public/modelo_contrato.docx com
// dados do cadastro + campos variáveis. Usa docxtemplater + pizzip (CDN).
// ═════════════════════════════════════════════════════════════════════
function dataExtensoRH(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

async function gerarContratoDocx(colab, extras) {
  const PizZip = window.PizZip, Docxtemplater = window.docxtemplater;
  if (!PizZip || !Docxtemplater) { alert('Bibliotecas de contrato não carregadas. Dê Ctrl+Shift+R e tente de novo.'); return false; }
  let resp;
  try { resp = await fetch('public/modelo_contrato.docx'); }
  catch (e) { alert('Não consegui buscar o modelo do contrato.'); return false; }
  if (!resp.ok) { alert('Modelo não encontrado. Suba o arquivo public/modelo_contrato.docx no repositório.'); return false; }
  const buf = await resp.arrayBuffer();
  try {
    const fem = (colab.sexo || '').toLowerCase().startsWith('f');
    const doc = new Docxtemplater(new PizZip(buf), { paragraphLoop: true, linebreaks: true });
    doc.render({
      nome: (colab.nome || '').toUpperCase(),
      profissao: (extras.profissao || colab.cargo || '').toUpperCase(),
      tipo_prof: fem ? 'autônoma' : 'autônomo',
      inscr: fem ? 'inscrita' : 'inscrito',
      portad: fem ? 'portadora' : 'portador',
      art_prof: fem ? 'a Profissional' : 'o Profissional',
      conselho: colab.conselho || '__________',
      cpf: colab.cpf || '__________',
      rg: colab.rg || '__________',
      endereco: colab.endereco || '__________',
      cep: colab.cep || '________',
      valor: extras.valor || '__________',
      horas: extras.horas || '____',
      atendimentos: extras.atendimentos || '____',
      area: extras.area || (colab.cargo || '').toLowerCase(),
      dados_bancarios: extras.dados_bancarios || '__________',
      data: extras.data || '',
    });
    const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(out);
    const a = document.createElement('a');
    a.href = url; a.download = `Contrato_${(colab.nome || 'colaborador').replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (e) { alert('Erro ao gerar o contrato: ' + (e.message || e)); return false; }
}

const ModalContrato = ({ colab, onClose }) => {
  const [extras, setExtras] = React.useState({
    profissao: colab.cargo || '',
    valor: colab.salario ? `R$ ${Number(colab.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
    horas: '', atendimentos: '', area: (colab.cargo || '').toLowerCase(),
    dados_bancarios: '', data: dataExtensoRH(new Date().toISOString().slice(0, 10)),
  });
  const [gerando, setGerando] = React.useState(false);
  const set = (k, v) => setExtras(e => ({ ...e, [k]: v }));
  const faltaCadastro = [];
  if (!colab.sexo) faltaCadastro.push('sexo (o contrato sairá no masculino por padrão)');
  if (!colab.conselho) faltaCadastro.push('conselho');
  if (!colab.cpf) faltaCadastro.push('CPF');
  if (!colab.rg) faltaCadastro.push('RG');
  if (!colab.endereco) faltaCadastro.push('endereço');

  const gerar = async () => {
    setGerando(true);
    const ok = await gerarContratoDocx(colab, extras);
    setGerando(false);
    if (ok) onClose();
  };

  return (
    <Modal title="Gerar contrato de prestação de serviço" onClose={onClose} width={620}>
      <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 14 }}>
        Nome, CPF, RG, conselho e endereço entram automáticos do cadastro de <b>{colab.nome}</b>. Preencha abaixo só o que muda a cada contrato.
      </div>
      {faltaCadastro.length > 0 && (
        <div style={{ background: 'color-mix(in oklch, var(--c-warning) 10%, transparent)', borderLeft: '3px solid var(--c-warning)', padding: 10, borderRadius: 'var(--r-xs)', fontSize: 12, marginBottom: 14 }}>
          ⚠ Faltam no cadastro: {faltaCadastro.join(', ')}. Esses campos saem em branco no contrato — complete o cadastro para preencher automaticamente.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Profissão / especialidade" full><input style={inputRH} value={extras.profissao} onChange={e => set('profissao', e.target.value)} placeholder="Fisioterapia" /></Field>
        <Field label="Valor mensal (por extenso)" full><input style={inputRH} value={extras.valor} onChange={e => set('valor', e.target.value)} placeholder="R$ 6.500,00 (seis mil e quinhentos reais)" /></Field>
        <Field label="Horários semanais"><input style={inputRH} value={extras.horas} onChange={e => set('horas', e.target.value)} placeholder="45 (quarenta e cinco)" /></Field>
        <Field label="Atendimentos/mês"><input style={inputRH} value={extras.atendimentos} onChange={e => set('atendimentos', e.target.value)} placeholder="180" /></Field>
        <Field label="Área de atuação" full><input style={inputRH} value={extras.area} onChange={e => set('area', e.target.value)} placeholder="fisioterapia, psicomotricidade" /></Field>
        <Field label="Dados bancários" full><input style={inputRH} value={extras.dados_bancarios} onChange={e => set('dados_bancarios', e.target.value)} placeholder="Banco, agência, conta, PIX" /></Field>
        <Field label="Data do contrato" full><input style={inputRH} value={extras.data} onChange={e => set('data', e.target.value)} placeholder="18 de julho de 2026" /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
        <window.Btn variant="primary" icon="file" disabled={gerando} onClick={gerar}>{gerando ? 'Gerando...' : 'Baixar contrato (.docx)'}</window.Btn>
      </div>
    </Modal>
  );
};

// ─── Modal: detalhamento do colaborador ───
const ColabDetail = ({ colab, data, onClose, onEdit }) => {
  const { profile } = window.useAuth();
  const canEdit = ['admin', 'editor'].includes(profile?.role);
  const [showContrato, setShowContrato] = React.useState(false);
  const atestadosDele = data.atestados.filter(a => a.colaborador_id === colab.id);
  const faltasDele = data.faltas.filter(f => f.colaborador_id === colab.id).slice(0, 10);

  const row = (l, v) => v ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--ink-mute)' }}>{l}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
    </div>
  ) : null;

  const section = (title) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '20px 0 6px' }}>{title}</div>
  );

  return (
    <Modal title={null} onClose={onClose} width={700}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <window.Avatar initials={iniRH(colab.nome)} size={56} color={regimeColor(colab.regime)} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6 }}>{colab.nome}</h2>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <window.Pill color={regimeColor(colab.regime)} size="sm">{colab.regime}</window.Pill>
            <window.Pill color={colab.status === 'Ativo' ? 'var(--c-primary)' : 'var(--ink-mute)'} size="sm">{colab.status}</window.Pill>
            {colab.cargo && <span style={{ fontSize: 13, color: 'var(--ink-soft)', alignSelf: 'center', marginLeft: 4 }}>{colab.cargo}</span>}
          </div>
        </div>
        {canEdit && <window.Btn variant="ghost" icon="file" onClick={() => setShowContrato(true)}>Gerar contrato</window.Btn>}
        {canEdit && <window.Btn variant="secondary" icon="edit" onClick={onEdit}>Editar</window.Btn>}
      </div>

      {showContrato && <ModalContrato colab={colab} onClose={() => setShowContrato(false)} />}

      {colab.observacoes && (
        <div style={{
          background: 'color-mix(in oklch, var(--c-warning) 10%, transparent)',
          borderLeft: '3px solid var(--c-warning)', padding: 12, borderRadius: 'var(--r-xs)',
          fontSize: 12, marginBottom: 12,
        }}>
          ⚠ {colab.observacoes}
        </div>
      )}

      {section('Identificação')}
      {row('Nascimento', fmtDateRH(colab.nascimento))}
      {row('Sexo', colab.sexo)}
      {row('CPF', colab.cpf)}
      {row('CNPJ', colab.cnpj)}
      {row('RG', colab.rg)}
      {row('PIS', colab.pis)}
      {row('CTPS', colab.ctps)}
      {row('Título de eleitor', colab.titulo_eleitor)}
      {row('Conselho', colab.conselho)}

      {section('Contato')}
      {row('Telefone', colab.telefone)}
      {row('E-mail', colab.email)}
      {row('Endereço', colab.endereco)}
      {row('CEP', colab.cep)}

      {section('Vínculo')}
      {row('Admissão', fmtDateRH(colab.admissao))}
      {row('Limite férias', fmtDateRH(colab.limite_ferias))}
      {row('Pagador', colab.pagador)}
      {row('Salário', colab.salario ? `R$ ${Number(colab.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null)}
      {colab.regime === 'CLT' && colab.salario ? row('Custo-empresa (~1,60×)', `R$ ${(Number(colab.salario) * 1.6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`) : null}

      {atestadosDele.length > 0 && (<>
        {section(`Atestados (${atestadosDele.length})`)}
        {atestadosDele.slice(0, 5).map(a => (
          <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{fmtDateRH(a.data_inicio)}{a.data_fim && a.data_fim !== a.data_inicio ? ` a ${fmtDateRH(a.data_fim)}` : ''} — {a.dias || 1} dia(s)</span>
              {a.file_url && <a href={a.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-secondary)' }}>📎 Ver</a>}
            </div>
            <div style={{ color: 'var(--ink-mute)', marginTop: 2 }}>
              {a.cid10 && `CID ${a.cid10} · `}{a.medico || ''}
            </div>
          </div>
        ))}
      </>)}

      {faltasDele.length > 0 && (<>
        {section(`Faltas recentes (${faltasDele.length})`)}
        {faltasDele.slice(0, 5).map(f => (
          <div key={f.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>{fmtDateRH(f.data)} — {f.tipo}</span>
            <span style={{ color: 'var(--ink-mute)' }}>{f.descricao}</span>
          </div>
        ))}
      </>)}
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Férias
// ═════════════════════════════════════════════════════════════════════
const RHFerias = ({ data, reload, toast }) => {
  const { profile } = window.useAuth();
  const canWrite = ['admin', 'editor'].includes(profile?.role);
  const [modalColab, setModalColab] = React.useState(null); // colaborador selecionado para registrar férias

  const lista = data.colaboradores
    .filter(c => c.regime === 'CLT' && c.status === 'Ativo' && c.admissao)
    .map(c => ({ ...c, dias: diasFerias(c.limite_ferias) }))
    .sort((a, b) => (a.dias ?? 99999) - (b.dias ?? 99999));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <window.TiltCard interactive={false} padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Colaborador', 'Admissão', 'Limite legal', 'Dias restantes', 'Situação', ''].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 5 ? 'right' : 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700,
                  letterSpacing: 0.5, color: 'var(--ink-mute)', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((c, i) => {
              let cor = 'var(--c-primary)', label = 'OK';
              if (c.dias == null) { cor = 'var(--ink-mute)'; label = '—'; }
              else if (c.dias < 0) { cor = 'var(--c-danger)'; label = `VENCIDA há ${Math.abs(c.dias)}d`; }
              else if (c.dias < 60) { cor = 'var(--c-tertiary)'; label = `Vence em ${c.dias}d`; }
              else if (c.dias < 180) { cor = 'var(--c-warning)'; label = 'Atenção'; }
              return (
                <tr key={c.id} style={{ borderBottom: i < lista.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <window.Avatar initials={iniRH(c.nome)} size={32} color={regimeColor(c.regime)} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12 }} className="mono">{fmtDateRH(c.admissao)}</td>
                  <td style={{ padding: '14px 20px', fontSize: 12 }} className="mono">{fmtDateRH(c.limite_ferias)}</td>
                  <td style={{ padding: '14px 20px', fontSize: 12 }} className="mono">{c.dias != null ? `${c.dias}d` : '—'}</td>
                  <td style={{ padding: '14px 20px' }}><window.Pill color={cor} size="sm">{label}</window.Pill></td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {canWrite && (
                      <window.Btn variant="ghost" size="sm" onClick={() => setModalColab(c)}>
                        Registrar férias
                      </window.Btn>
                    )}
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                Nenhum colaborador CLT ativo com admissão cadastrada.
              </td></tr>
            )}
          </tbody>
        </table>
      </window.TiltCard>
      {modalColab && (
        <FeriasRealizadasModal
          colab={modalColab}
          onClose={() => setModalColab(null)}
          onSaved={async (novoLimite) => {
            try {
              await rhUpdateColab(modalColab.id, { limite_ferias: novoLimite });
              setModalColab(null);
              await reload();
              toast.show('Férias registradas com sucesso!');
            } catch (e) { toast.show('Erro: ' + e.message, 'error'); }
          }}
        />
      )}
    </div>
  );
};

const FeriasRealizadasModal = ({ colab, onClose, onSaved }) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({
    data_inicio: hoje,
    data_fim: hoje,
    tipo: 'Realizada',
  });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!form.data_inicio) { alert('Informe a data de início'); return; }
    setSaving(true);
    // Calcula novo limite de férias: 12 meses após o fim das férias
    const dataFim = new Date(form.data_fim || form.data_inicio);
    dataFim.setFullYear(dataFim.getFullYear() + 1);
    const novoLimite = dataFim.toISOString().slice(0, 10);
    await onSaved(novoLimite);
    setSaving(false);
  };

  return (
    <Modal title="Registrar férias" onClose={onClose} width={480}>
      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'color-mix(in oklch, var(--c-primary) 8%, transparent)', borderRadius: 'var(--r-sm)', border: '1px solid color-mix(in oklch, var(--c-primary) 20%, transparent)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-primary)' }}>{colab.nome}</span>
        {colab.limite_ferias && (
          <span style={{ fontSize: 12, color: 'var(--ink-mute)', marginLeft: 10 }}>
            Limite atual: {fmtDateRH(colab.limite_ferias)}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Tipo">
          <select style={inputRH} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            <option value="Realizada">Realizada</option>
            <option value="Agendada">Agendada</option>
          </select>
        </Field>
        <Field label="Data de início*">
          <input type="date" style={inputRH} value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
        </Field>
        <Field label="Data de fim">
          <input type="date" style={inputRH} value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} />
        </Field>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)', padding: '8px 12px', background: 'var(--bg-alt)', borderRadius: 'var(--r-sm)' }}>
          💡 O limite legal de férias será atualizado automaticamente para 12 meses após o fim das férias.
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
        <window.Btn variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Confirmar'}</window.Btn>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Faltas
// ═════════════════════════════════════════════════════════════════════
const RHFaltas = ({ data, reload, toast }) => {
  const { profile } = window.useAuth();
  const canWrite = ['admin', 'editor'].includes(profile?.role);
  const [adding, setAdding] = React.useState(false);

  const remover = async (id) => {
    if (!confirm('Remover registro de falta?')) return;
    try {
      await rhDeleteFalta(id);
      await reload();
      toast.show('Removido');
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); }
  };

  const tipoCor = (t) => ({
    'Injustificada': 'var(--c-danger)',
    'Justificada': 'var(--c-primary)',
    'Atestado médico': 'var(--c-secondary)',
    'Atraso': 'var(--c-tertiary)',
    'Licença': 'var(--c-violet)',
  }[t] || 'var(--ink-mute)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.Btn variant="primary" icon="plus" onClick={() => setAdding(true)}>Registrar falta</window.Btn>
        </div>
      )}
      <window.TiltCard interactive={false} padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Colaborador', 'Data', 'Tipo', 'Descrição', 'Fonte', ''].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 5 ? 'right' : 'left', padding: '12px 20px', fontSize: 11,
                  fontWeight: 700, letterSpacing: 0.5, color: 'var(--ink-mute)', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.faltas.map((f, i) => {
              const c = data.colaboradores.find(x => x.id === f.colaborador_id);
              return (
                <tr key={f.id} style={{ borderBottom: i < data.faltas.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <window.Avatar initials={iniRH(c?.nome || '?')} size={28} color={regimeColor(c?.regime)} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c?.nome || '(removido)'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12 }} className="mono">{fmtDateRH(f.data)}</td>
                  <td style={{ padding: '12px 20px' }}><window.Pill color={tipoCor(f.tipo)} size="sm">{f.tipo}</window.Pill></td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--ink-soft)' }}>{f.descricao || '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 11, color: 'var(--ink-mute)' }}>{f.fonte || 'manual'}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    {canWrite && <window.Btn variant="ghost" size="sm" onClick={() => remover(f.id)}>Remover</window.Btn>}
                  </td>
                </tr>
              );
            })}
            {data.faltas.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Nenhuma falta registrada.</td></tr>
            )}
          </tbody>
        </table>
      </window.TiltCard>
      {adding && <FaltaForm data={data} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); toast.show('Falta registrada'); }} toast={toast} />}
    </div>
  );
};

const FaltaForm = ({ data, onClose, onSaved, toast }) => {
  const { profile } = window.useAuth();
  const [form, setForm] = React.useState({
    colaborador_id: '', data: new Date().toISOString().slice(0, 10), tipo: 'Injustificada', descricao: '',
  });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!form.colaborador_id) { toast.show('Selecione o colaborador', 'error'); return; }
    setSaving(true);
    try {
      await rhCreateFalta({ ...form, fonte: 'manual' }, profile.company_id, profile.id);
      onSaved();
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); setSaving(false); }
  };

  return (
    <Modal title="Registrar falta" onClose={onClose} width={520}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Colaborador*">
          <select style={inputRH} value={form.colaborador_id} onChange={e => setForm({ ...form, colaborador_id: e.target.value })}>
            <option value="">Selecione...</option>
            {data.colaboradores.filter(c => c.status === 'Ativo').sort((a, b) => a.nome.localeCompare(b.nome)).map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Data*"><input type="date" style={inputRH} value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></Field>
        <Field label="Tipo*">
          <select style={inputRH} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            {['Injustificada', 'Justificada', 'Atestado médico', 'Atraso', 'Licença'].map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Descrição"><textarea style={{ ...inputRH, minHeight: 72 }} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
        <window.Btn variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</window.Btn>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Atestados (upload Storage)
// ═════════════════════════════════════════════════════════════════════
const RHAtestados = ({ data, reload, toast }) => {
  const { profile } = window.useAuth();
  const canWrite = ['admin', 'editor'].includes(profile?.role);
  const [adding, setAdding] = React.useState(false);

  const remover = async (a) => {
    if (!confirm('Excluir atestado?')) return;
    try {
      await rhDeleteAtestado(a.id);
      // Best effort delete no Storage
      if (a.file_path) {
        try {
          const s = window.getSession();
          await fetch(`${window.SUPABASE_URL}/storage/v1/object/atestados/${a.file_path}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${s.access_token}`, apikey: window.SUPABASE_ANON_KEY },
          });
        } catch (e) { console.warn(e); }
      }
      await reload();
      toast.show('Atestado removido');
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.Btn variant="primary" icon="plus" onClick={() => setAdding(true)}>Upload de atestado</window.Btn>
        </div>
      )}
      <window.TiltCard interactive={false} padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Colaborador', 'Período', 'Dias', 'CID', 'Médico', 'Arquivo', ''].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 6 ? 'right' : 'left', padding: '12px 20px', fontSize: 11,
                  fontWeight: 700, letterSpacing: 0.5, color: 'var(--ink-mute)', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.atestados.map((a, i) => {
              const c = data.colaboradores.find(x => x.id === a.colaborador_id);
              return (
                <tr key={a.id} style={{ borderBottom: i < data.atestados.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <window.Avatar initials={iniRH(c?.nome || '?')} size={28} color={regimeColor(c?.regime)} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c?.nome || '(removido)'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12 }} className="mono">
                    {fmtDateRH(a.data_inicio)}{a.data_fim && a.data_fim !== a.data_inicio ? ` → ${fmtDateRH(a.data_fim)}` : ''}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12 }} className="mono">{a.dias || 1}d</td>
                  <td style={{ padding: '12px 20px', fontSize: 11, color: 'var(--ink-mute)' }} className="mono">{a.cid10 || '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--ink-soft)' }}>{a.medico || '—'}</td>
                  <td style={{ padding: '12px 20px' }}>
                    {a.file_url ? <a href={a.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-secondary)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>📎 Abrir</a> : <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    {canWrite && <window.Btn variant="ghost" size="sm" onClick={() => remover(a)}>Remover</window.Btn>}
                  </td>
                </tr>
              );
            })}
            {data.atestados.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Nenhum atestado cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </window.TiltCard>
      {adding && <AtestadoForm data={data} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); toast.show('Atestado registrado'); }} toast={toast} />}
    </div>
  );
};

const AtestadoForm = ({ data, onClose, onSaved, toast }) => {
  const { profile } = window.useAuth();
  const [form, setForm] = React.useState({
    colaborador_id: '', data_inicio: new Date().toISOString().slice(0, 10), data_fim: '',
    dias: 1, cid10: '', medico: '', local: '', observacoes: '',
  });
  const [file, setFile] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [progress, setProgress] = React.useState('');

  const save = async () => {
    if (!form.colaborador_id) { toast.show('Selecione o colaborador', 'error'); return; }
    setSaving(true);
    try {
      setProgress('Criando registro...');
      const payload = { ...form, dias: parseInt(form.dias) || 1 };
      if (!payload.data_fim) payload.data_fim = payload.data_inicio;
      const [atestado] = await rhCreateAtestado(payload, profile.company_id, profile.id);

      if (file) {
        setProgress('Enviando arquivo...');
        const { path, publicUrl } = await rhUploadAtestado(file, form.colaborador_id, atestado.id);
        await rhUpdateAtestado(atestado.id, { file_url: publicUrl, file_path: path, file_name: file.name, file_size: file.size });
      }
      onSaved();
    } catch (e) {
      toast.show('Erro: ' + e.message, 'error');
      setSaving(false); setProgress('');
    }
  };

  return (
    <Modal title="Upload de atestado médico" onClose={onClose} width={620}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Colaborador*" full>
          <select style={inputRH} value={form.colaborador_id} onChange={e => setForm({ ...form, colaborador_id: e.target.value })}>
            <option value="">Selecione...</option>
            {data.colaboradores.filter(c => c.status === 'Ativo').sort((a, b) => a.nome.localeCompare(b.nome)).map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Data início*"><input type="date" style={inputRH} value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} /></Field>
        <Field label="Data fim"><input type="date" style={inputRH} value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} /></Field>
        <Field label="Dias*"><input type="number" min="1" style={inputRH} value={form.dias} onChange={e => setForm({ ...form, dias: e.target.value })} /></Field>
        <Field label="CID-10"><input style={inputRH} placeholder="ex: A09" value={form.cid10} onChange={e => setForm({ ...form, cid10: e.target.value })} /></Field>
        <Field label="Médico" full><input style={inputRH} placeholder="Nome + CRM" value={form.medico} onChange={e => setForm({ ...form, medico: e.target.value })} /></Field>
        <Field label="Local de atendimento" full><input style={inputRH} value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} /></Field>

        <Field label="Arquivo (PDF, JPG, PNG - até 5MB)" full>
          <div style={{
            border: '2px dashed var(--line)', borderRadius: 'var(--r-sm)', padding: 16, textAlign: 'center',
            background: 'var(--surface-2)', cursor: 'pointer',
          }}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
              const f = e.target.files[0];
              if (f && f.size > 5 * 1024 * 1024) { toast.show('Arquivo maior que 5MB', 'error'); return; }
              setFile(f);
            }} style={{ display: 'block', margin: '0 auto' }} />
            {file && <div style={{ fontSize: 12, color: 'var(--c-primary)', marginTop: 8 }}>✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)</div>}
          </div>
        </Field>

        <Field label="Observações" full><textarea style={{ ...inputRH, minHeight: 56 }} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></Field>
      </div>

      {progress && <div style={{ marginTop: 14, fontSize: 12, color: 'var(--c-secondary)', fontWeight: 600 }}>{progress}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
        <window.Btn variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</window.Btn>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Alertas
// ═════════════════════════════════════════════════════════════════════
const RHAlertas = ({ data, reload, toast }) => {
  const { profile } = window.useAuth();
  const canWrite = ['admin', 'editor'].includes(profile?.role);
  const [adding, setAdding] = React.useState(false);

  const resolver = async (a) => {
    try {
      await rhUpdateAlerta(a.id, { resolvido: true, resolvido_em: new Date().toISOString() });
      await reload(); toast.show('Alerta resolvido');
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); }
  };
  const remover = async (id) => {
    if (!confirm('Remover alerta?')) return;
    try {
      await rhDeleteAlerta(id); await reload(); toast.show('Removido');
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); }
  };

  const pord = { 'crítica': 1, alta: 2, 'média': 3, baixa: 4 };
  const ordenados = [...data.alertas].sort((a, b) => (a.resolvido ? 1 : 0) - (b.resolvido ? 1 : 0) || (pord[a.prioridade] || 5) - (pord[b.prioridade] || 5));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.Btn variant="primary" icon="plus" onClick={() => setAdding(true)}>Novo alerta</window.Btn>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ordenados.map(a => {
          const cor = a.prioridade === 'crítica' ? 'var(--c-danger)' : a.prioridade === 'alta' ? 'var(--c-tertiary)' : 'var(--c-secondary)';
          return (
            <window.TiltCard key={a.id} interactive={false} padding={16} style={{ opacity: a.resolvido ? 0.5 : 1 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 4, borderRadius: 2, background: cor, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{a.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>{a.descricao}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <window.Pill color={cor} size="sm">{a.prioridade.toUpperCase()}</window.Pill>
                    {a.categoria && <window.Pill color="var(--ink-mute)" size="sm">{a.categoria}</window.Pill>}
                    {a.resolvido && <window.Pill color="var(--c-primary)" size="sm">RESOLVIDO</window.Pill>}
                  </div>
                </div>
                {canWrite && !a.resolvido && (
                  <window.Btn variant="ghost" size="sm" onClick={() => resolver(a)}>Resolver</window.Btn>
                )}
                {canWrite && profile?.role === 'admin' && (
                  <window.Btn variant="ghost" size="sm" onClick={() => remover(a.id)} style={{ color: 'var(--c-danger)' }}>Excluir</window.Btn>
                )}
              </div>
            </window.TiltCard>
          );
        })}
        {ordenados.length === 0 && (
          <window.TiltCard interactive={false} padding={40} style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>
            Nenhum alerta legal cadastrado.
          </window.TiltCard>
        )}
      </div>

      {adding && <AlertaForm data={data} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); toast.show('Alerta criado'); }} toast={toast} />}
    </div>
  );
};

const AlertaForm = ({ data, onClose, onSaved, toast }) => {
  const { profile } = window.useAuth();
  const [form, setForm] = React.useState({
    titulo: '', descricao: '', prioridade: 'média', categoria: '', colaborador_id: null,
  });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!form.titulo) { toast.show('Título obrigatório', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.colaborador_id) payload.colaborador_id = null;
      await rhCreateAlerta(payload, profile.company_id, profile.id);
      onSaved();
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); setSaving(false); }
  };

  return (
    <Modal title="Novo alerta legal" onClose={onClose} width={560}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Título*"><input style={inputRH} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></Field>
        <Field label="Descrição"><textarea style={{ ...inputRH, minHeight: 80 }} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Prioridade">
            <select style={inputRH} value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value })}>
              <option value="crítica">Crítica</option><option value="alta">Alta</option>
              <option value="média">Média</option><option value="baixa">Baixa</option>
            </select>
          </Field>
          <Field label="Categoria">
            <select style={inputRH} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
              <option value="">—</option>
              <option>Férias</option><option>Compliance</option><option>Imigração</option>
              <option>CLT</option><option>Saúde ocupacional</option><option>Contratos</option>
            </select>
          </Field>
        </div>
        <Field label="Colaborador relacionado (opcional)">
          <select style={inputRH} value={form.colaborador_id || ''} onChange={e => setForm({ ...form, colaborador_id: e.target.value || null })}>
            <option value="">—</option>
            {data.colaboradores.sort((a, b) => a.nome.localeCompare(b.nome)).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
        <window.Btn variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Criar'}</window.Btn>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Pendências
// ═════════════════════════════════════════════════════════════════════
const RHPendencias = ({ data, reload, toast }) => {
  const { profile } = window.useAuth();
  const canWrite = ['admin', 'editor'].includes(profile?.role);
  const [adding, setAdding] = React.useState(false);

  const mudarStatus = async (p, novo) => {
    try { await rhUpdatePend(p.id, { status: novo }); await reload(); toast.show('Atualizado'); }
    catch (e) { toast.show('Erro: ' + e.message, 'error'); }
  };
  const remover = async (id) => {
    if (!confirm('Remover pendência?')) return;
    try { await rhDeletePend(id); await reload(); toast.show('Removido'); }
    catch (e) { toast.show('Erro: ' + e.message, 'error'); }
  };

  const pord = { Alta: 1, 'Média': 2, Baixa: 3 };
  const ordenadas = [...data.pendencias].sort((a, b) =>
    (a.status === 'Resolvida' ? 1 : 0) - (b.status === 'Resolvida' ? 1 : 0) ||
    (pord[a.prioridade] || 5) - (pord[b.prioridade] || 5)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.Btn variant="primary" icon="plus" onClick={() => setAdding(true)}>Nova pendência</window.Btn>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ordenadas.map(p => {
          const cor = p.prioridade === 'Alta' ? 'var(--c-danger)' : p.prioridade === 'Média' ? 'var(--c-tertiary)' : 'var(--c-secondary)';
          return (
            <window.TiltCard key={p.id} interactive={false} padding={16} style={{ opacity: p.status === 'Resolvida' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>{p.descricao}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <window.Pill color={cor} size="sm">{p.prioridade}</window.Pill>
                    {p.categoria && <window.Pill color="var(--ink-mute)" size="sm">{p.categoria}</window.Pill>}
                    <window.Pill color={p.status === 'Resolvida' ? 'var(--c-primary)' : p.status === 'Em andamento' ? 'var(--c-secondary)' : 'var(--c-tertiary)'} size="sm">{p.status}</window.Pill>
                  </div>
                </div>
                {canWrite && p.status !== 'Resolvida' && (
                  <>
                    {p.status === 'Aberta' && <window.Btn variant="ghost" size="sm" onClick={() => mudarStatus(p, 'Em andamento')}>Em andamento</window.Btn>}
                    <window.Btn variant="primary" size="sm" onClick={() => mudarStatus(p, 'Resolvida')}>Resolver</window.Btn>
                  </>
                )}
                {canWrite && p.status === 'Resolvida' && (
                  <window.Btn variant="ghost" size="sm" onClick={() => mudarStatus(p, 'Aberta')}>Reabrir</window.Btn>
                )}
                {canWrite && (
                  <window.Btn variant="ghost" size="sm" onClick={() => remover(p.id)} style={{ color: 'var(--c-danger)' }}>✕</window.Btn>
                )}
              </div>
            </window.TiltCard>
          );
        })}
        {ordenadas.length === 0 && (
          <window.TiltCard interactive={false} padding={40} style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>
            Nenhuma pendência cadastrada.
          </window.TiltCard>
        )}
      </div>

      {adding && <PendForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); toast.show('Pendência criada'); }} toast={toast} />}
    </div>
  );
};

const PendForm = ({ onClose, onSaved, toast }) => {
  const { profile } = window.useAuth();
  const [form, setForm] = React.useState({ titulo: '', descricao: '', prioridade: 'Média', categoria: 'Cadastro' });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!form.titulo) { toast.show('Título obrigatório', 'error'); return; }
    setSaving(true);
    try {
      await rhCreatePend(form, profile.company_id, profile.id);
      onSaved();
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); setSaving(false); }
  };

  return (
    <Modal title="Nova pendência" onClose={onClose} width={520}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Título*"><input style={inputRH} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></Field>
        <Field label="Descrição"><textarea style={{ ...inputRH, minHeight: 80 }} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Prioridade">
            <select style={inputRH} value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value })}>
              <option>Alta</option><option>Média</option><option>Baixa</option>
            </select>
          </Field>
          <Field label="Categoria">
            <select style={inputRH} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
              <option>Cadastro</option><option>Folha</option><option>Rescisão</option><option>Férias</option><option>Legal</option><option>Contratos</option><option>Rotina</option>
            </select>
          </Field>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
        <window.Btn variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Criar'}</window.Btn>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════
// Sub-aba: Rescisões (wizard de desligamento formal)
// ═════════════════════════════════════════════════════════════════════
const RHRescisoes = ({ data, reload, toast }) => {
  const { profile } = window.useAuth();
  const isAdmin = profile?.role === 'admin';
  const [wizarding, setWizarding] = React.useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.Btn variant="primary" icon="plus" onClick={() => setWizarding(true)}>Processar rescisão</window.Btn>
        </div>
      )}
      <window.TiltCard interactive={false} padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Colaborador', 'Modalidade', 'Data', 'Total verbas', 'Documentos'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--ink-mute)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rescisoes.map((r, i) => {
              const c = data.colaboradores.find(x => x.id === r.colaborador_id);
              const modalidadeLabel = {
                'sem_justa_causa': 'Sem justa causa',
                'pedido_demissao': 'Pedido demissão',
                'distrato_484a': 'Distrato 484-A',
                'justa_causa': 'Justa causa',
                'fim_contrato': 'Fim contrato',
                'termino_experiencia': 'Término experiência',
              }[r.modalidade] || r.modalidade;
              return (
                <tr key={r.id} style={{ borderBottom: i < data.rescisoes.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <window.Avatar initials={iniRH(c?.nome || '?')} size={28} color="var(--ink-mute)" />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c?.nome || '(removido)'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px' }}><window.Pill color="var(--c-tertiary)" size="sm">{modalidadeLabel}</window.Pill></td>
                  <td style={{ padding: '12px 20px', fontSize: 12 }} className="mono">{fmtDateRH(r.data_rescisao)}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }} className="mono">
                    R$ {Number(r.total_verbas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 11, color: 'var(--ink-mute)' }}>
                    {r.documentos_gerados?.length || 0} gerado(s)
                  </td>
                </tr>
              );
            })}
            {data.rescisoes.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                Nenhuma rescisão processada. Use "Processar rescisão" para iniciar.
              </td></tr>
            )}
          </tbody>
        </table>
      </window.TiltCard>

      {wizarding && <RescisaoWizard data={data} onClose={() => setWizarding(false)} onSaved={() => { setWizarding(false); reload(); toast.show('Rescisão processada'); }} toast={toast} />}
    </div>
  );
};

const RescisaoWizard = ({ data, onClose, onSaved, toast }) => {
  const { profile } = window.useAuth();
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({
    colaborador_id: '', modalidade: 'sem_justa_causa',
    data_rescisao: new Date().toISOString().slice(0, 10),
    observacoes: '',
  });
  const [saving, setSaving] = React.useState(false);

  const colab = data.colaboradores.find(c => c.id === form.colaborador_id);
  const salario = Number(colab?.salario || 0);

  // Cálculo de verbas (aproximado — ajuste fino pela contabilidade)
  const calcVerbas = () => {
    if (!colab || !form.data_rescisao) return null;
    const admissao = new Date(colab.admissao);
    const rescisao = new Date(form.data_rescisao);
    const mesesTrabalhados = Math.max(1, Math.floor((rescisao - admissao) / (30 * 24 * 60 * 60 * 1000)));
    const diasMesRescisao = rescisao.getDate();

    const saldo_salario = salario * (diasMesRescisao / 30);
    const decimo_terceiro = salario * (rescisao.getMonth() + 1) / 12;
    const ferias_proporcionais = salario * ((mesesTrabalhados % 12) / 12);
    const terco_ferias = ferias_proporcionais / 3;

    // FGTS acumulado estimado (8% salário × meses)
    const saldoFgts = salario * 0.08 * mesesTrabalhados;

    let aviso_previo = 0, multa_fgts = 0;
    if (form.modalidade === 'sem_justa_causa') {
      aviso_previo = salario + (salario * Math.floor(mesesTrabalhados / 12) / 30 * 3); // 30d + 3d/ano
      multa_fgts = saldoFgts * 0.4;
    } else if (form.modalidade === 'distrato_484a') {
      aviso_previo = salario * 0.5; // metade
      multa_fgts = saldoFgts * 0.2; // 20%
    } else if (form.modalidade === 'termino_experiencia' || form.modalidade === 'fim_contrato') {
      aviso_previo = 0;
      multa_fgts = 0;
    }

    const total = saldo_salario + decimo_terceiro + ferias_proporcionais + terco_ferias + aviso_previo + multa_fgts;
    return {
      saldo_salario: +saldo_salario.toFixed(2),
      aviso_previo: +aviso_previo.toFixed(2),
      ferias_proporcionais: +ferias_proporcionais.toFixed(2),
      terco_ferias: +terco_ferias.toFixed(2),
      decimo_terceiro: +decimo_terceiro.toFixed(2),
      multa_fgts: +multa_fgts.toFixed(2),
      total_verbas: +total.toFixed(2),
    };
  };

  const verbas = step >= 2 ? calcVerbas() : null;

  const processar = async () => {
    setSaving(true);
    try {
      const payload = {
        colaborador_id: form.colaborador_id,
        modalidade: form.modalidade,
        data_rescisao: form.data_rescisao,
        observacoes: form.observacoes,
        ...verbas,
        ferias_vencidas: 0, // a conferir com contabilidade
      };
      await rhCreateRescisao(payload, profile.company_id, profile.id);
      // Marca colaborador como desligado
      await rhUpdateColab(form.colaborador_id, {
        status: 'Desligado',
        data_desligamento: form.data_rescisao,
        tipo_desligamento: {
          'sem_justa_causa': 'Sem justa causa',
          'pedido_demissao': 'Pedido demissão',
          'distrato_484a': 'Distrato 484-A',
          'justa_causa': 'Justa causa',
          'fim_contrato': 'Fim contrato',
          'termino_experiencia': 'Término experiência',
        }[form.modalidade],
      });
      onSaved();
    } catch (e) { toast.show('Erro: ' + e.message, 'error'); setSaving(false); }
  };

  const modLabel = {
    'sem_justa_causa': 'Sem justa causa',
    'pedido_demissao': 'Pedido de demissão',
    'distrato_484a': 'Distrato por acordo (484-A)',
    'justa_causa': 'Justa causa',
    'fim_contrato': 'Fim de contrato',
    'termino_experiencia': 'Término de experiência',
  };

  return (
    <Modal title="Processar rescisão" onClose={onClose} width={640}>
      {/* Steps */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: s <= step ? 'var(--c-primary)' : 'var(--line)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Passo 1 — Identificação</h3>
          <Field label="Colaborador*">
            <select style={inputRH} value={form.colaborador_id} onChange={e => setForm({ ...form, colaborador_id: e.target.value })}>
              <option value="">Selecione...</option>
              {data.colaboradores.filter(c => c.status === 'Ativo').sort((a, b) => a.nome.localeCompare(b.nome)).map(c => (
                <option key={c.id} value={c.id}>{c.nome} — {c.cargo || c.regime}</option>
              ))}
            </select>
          </Field>
          <Field label="Modalidade*">
            <select style={inputRH} value={form.modalidade} onChange={e => setForm({ ...form, modalidade: e.target.value })}>
              {Object.entries(modLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Data da rescisão*"><input type="date" style={inputRH} value={form.data_rescisao} onChange={e => setForm({ ...form, data_rescisao: e.target.value })} /></Field>
          <Field label="Observações"><textarea style={{ ...inputRH, minHeight: 60 }} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <window.Btn variant="ghost" onClick={onClose}>Cancelar</window.Btn>
            <window.Btn variant="primary" onClick={() => setStep(2)} disabled={!form.colaborador_id}>Calcular verbas →</window.Btn>
          </div>
        </div>
      )}

      {step === 2 && verbas && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Passo 2 — Verbas estimadas</h3>
          <div style={{
            background: 'color-mix(in oklch, var(--c-warning) 10%, transparent)',
            border: '1px solid color-mix(in oklch, var(--c-warning) 30%, transparent)',
            borderRadius: 'var(--r-sm)', padding: 12, fontSize: 12, marginBottom: 16,
          }}>
            ⚠ Cálculo aproximado. Confira com a contabilidade antes do pagamento efetivo.
          </div>

          <window.TiltCard interactive={false} padding={18}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <Linha label="Saldo de salário" v={verbas.saldo_salario} />
              <Linha label="13º proporcional" v={verbas.decimo_terceiro} />
              <Linha label="Férias proporcionais" v={verbas.ferias_proporcionais} />
              <Linha label="1/3 constitucional" v={verbas.terco_ferias} />
              <Linha label={form.modalidade === 'distrato_484a' ? 'Aviso prévio (50%)' : 'Aviso prévio indenizado'} v={verbas.aviso_previo} />
              <Linha label={form.modalidade === 'distrato_484a' ? 'Multa FGTS (20%)' : 'Multa FGTS (40%)'} v={verbas.multa_fgts} />
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                <span>Total estimado</span>
                <span className="mono" style={{ color: 'var(--c-primary)' }}>R$ {verbas.total_verbas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </window.TiltCard>

          {form.modalidade === 'distrato_484a' && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-mute)' }}>
              Art. 484-A CLT: aviso prévio 50%, multa FGTS 20%, saque até 80%, sem seguro-desemprego.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 20 }}>
            <window.Btn variant="ghost" onClick={() => setStep(1)}>← Voltar</window.Btn>
            <window.Btn variant="primary" onClick={() => setStep(3)}>Revisar →</window.Btn>
          </div>
        </div>
      )}

      {step === 3 && verbas && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Passo 3 — Confirmar</h3>
          <window.TiltCard interactive={false} padding={18}>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>Colaborador:</strong> {colab?.nome}</div>
              <div><strong>Modalidade:</strong> {modLabel[form.modalidade]}</div>
              <div><strong>Data:</strong> {fmtDateRH(form.data_rescisao)}</div>
              <div><strong>Total estimado:</strong> <span className="mono" style={{ color: 'var(--c-primary)', fontWeight: 700 }}>R$ {verbas.total_verbas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            </div>
          </window.TiltCard>

          <div style={{
            marginTop: 14, padding: 14,
            background: 'color-mix(in oklch, var(--c-danger) 6%, transparent)',
            border: '1px solid color-mix(in oklch, var(--c-danger) 20%, transparent)',
            borderRadius: 'var(--r-sm)', fontSize: 12,
          }}>
            Ao confirmar, o colaborador será marcado como <strong>Desligado</strong>, os dados das verbas serão registrados no histórico de rescisões, e a pendência de processamento formal (TRCT, eSocial, pagamento) ficará a cargo da contabilidade.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 20 }}>
            <window.Btn variant="ghost" onClick={() => setStep(2)}>← Voltar</window.Btn>
            <window.Btn variant="primary" icon="check" onClick={processar} disabled={saving}>{saving ? 'Processando...' : 'Confirmar rescisão'}</window.Btn>
          </div>
        </div>
      )}
    </Modal>
  );
};

const Linha = ({ label, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ color: 'var(--ink-mute)' }}>{label}</span>
    <span className="mono" style={{ fontWeight: 500 }}>R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
  </div>
);

// ═════════════════════════════════════════════════════════════════════
// Shared components (Modal, Field, inputRH)
// ═════════════════════════════════════════════════════════════════════
const Modal = ({ title, children, onClose, width = 560 }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, zIndex: 9999, overflowY: 'auto',
  }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{
      width: `min(${width}px, 100%)`, background: 'var(--surface)',
      borderRadius: 'var(--r-lg)', padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      border: '1px solid var(--line)', animation: 'popIn 0.3s cubic-bezier(.22,1,.36,1)',
      maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
    }} onClick={(e) => e.stopPropagation()}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
            color: 'var(--ink-mute)', background: 'var(--surface-2)',
          }}>✕</button>
        </div>
      )}
      {!title && (
        <div style={{ textAlign: 'right', marginBottom: 12 }}>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
            color: 'var(--ink-mute)', background: 'var(--surface-2)', marginLeft: 'auto',
          }}>✕</button>
        </div>
      )}
      {children}
    </div>
  </div>
);

const Field = ({ label, children, full }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)',
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
    }}>{label}</label>
    {children}
  </div>
);

const inputRH = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--line)', background: 'var(--surface-2)',
  fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none',
};

const selectStyleRH = {
  padding: '10px 14px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--line)', background: 'var(--surface-2)',
  fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)',
};

// ═════════════════════════════════════════════════════════════════════
// Página principal RH com sub-navegação
// ═════════════════════════════════════════════════════════════════════

// ─── FGTS ─────────────────────────────────────────────────────────────────
const RHFgts = ({ data, reload, toast }) => {
  const today = new Date().toISOString().slice(0, 10);
  const curYear  = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;

  // Mês de competência (apenas mês/ano — vencimento é dia 7 do mês seguinte)
  const [compYear,  setCompYear]  = React.useState(curYear);
  const [compMonth, setCompMonth] = React.useState(curMonth);
  const [, tick] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    const h = () => tick();
    window.addEventListener('sb-data-hydrated', h);
    return () => window.removeEventListener('sb-data-hydrated', h);
  }, []);

  const ativos = (data.colaboradores || []).filter(c =>
    (c.status === 'Ativo' || c.status === 'ativo' || c.status === 'ferias') &&
    c.regime === 'CLT'
  );

  const fmtMoeda = v => 'R$ ' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtDate  = d => d ? d.split('-').reverse().join('/') : '—';

  // Vencimento = dia 7 do mês seguinte à competência
  const vencimento = (() => {
    const m = compMonth === 12 ? 1 : compMonth + 1;
    const y = compMonth === 12 ? compYear + 1 : compYear;
    return `${y}-${String(m).padStart(2,'0')}-07`;
  })();
  const atrasado = vencimento < today;

  // Rows por colaborador
  const rows = ativos.map(col => ({
    col,
    salario: Number(col.salario) || 0,
    fgts:    (Number(col.salario) || 0) * 0.08,
  }));
  const totalFgts    = rows.reduce((s, r) => s + r.fgts, 0);
  const totalSalario = rows.reduce((s, r) => s + r.salario, 0);

  // Meses para seletor
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const anos  = [curYear - 1, curYear, curYear + 1];

  const selStyle = { padding:'8px 14px', borderRadius:8, border:'1px solid var(--line)', background:'var(--surface)', color:'var(--ink)', fontSize:13, outline:'none', cursor:'pointer' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
        <div>
          <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>FGTS — Fundo de Garantia</h3>
          <div style={{ fontSize:13, color:'var(--ink-soft)', marginTop:3 }}>
            8% do salário bruto · Apenas CLTs · Vence dia 7 do mês seguinte à competência
          </div>
        </div>
        {/* Seletor mês/ano de competência */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, color:'var(--ink-soft)', fontWeight:600 }}>Competência:</span>
          <select value={compMonth} onChange={e => setCompMonth(Number(e.target.value))} style={selStyle}>
            {meses.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={compYear} onChange={e => setCompYear(Number(e.target.value))} style={selStyle}>
            {anos.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
        {[
          { label:'Total FGTS', value: fmtMoeda(totalFgts), sub: ativos.length + ' colaboradores CLT', color:'var(--ink)' },
          { label:'Vencimento', value: fmtDate(vencimento), sub: atrasado ? '⚠ Vencido!' : 'Dia 7/' + String(compMonth===12?1:compMonth+1).padStart(2,'0') + '/' + (compMonth===12?compYear+1:compYear), color: atrasado?'var(--c-neg)':'var(--c-pos)' },
          { label:'Base de cálculo', value: fmtMoeda(totalSalario), sub:'Total salários CLT', color:'var(--ink-soft)' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background:'var(--surface)', borderRadius:12, padding:'18px 22px', border:'1px solid var(--line)', flex:1, minWidth:160, borderTop:'3px solid '+kpi.color }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-soft)', marginBottom:6 }}>{kpi.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--ink)' }}>{kpi.value}</div>
            <div style={{ fontSize:12, color:'var(--ink-soft)', marginTop:4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Alerta vencido */}
      {atrasado && (
        <div style={{ padding:'13px 18px', background:'var(--c-neg-soft)', border:'1px solid color-mix(in oklch, var(--c-neg) 40%, transparent)', borderRadius:10, fontSize:13, color:'var(--c-neg)', fontWeight:600 }}>
          ⚠ FGTS de {meses[compMonth-1]}/{compYear} está vencido desde {fmtDate(vencimento)}. Recolha via Conectividade Social / eSocial na Caixa.
        </div>
      )}

      {/* Tabela */}
      <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--line)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontWeight:700, fontSize:15 }}>
            Detalhamento — competência {meses[compMonth-1]}/{compYear}
          </span>
          <span style={{ fontSize:13, color:'var(--ink-soft)' }}>
            (vence {fmtDate(vencimento)})
          </span>
        </div>

        {ativos.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--ink-soft)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
            <div style={{ fontWeight:600 }}>Nenhum colaborador CLT ativo</div>
            <div style={{ fontSize:13, marginTop:6 }}>Cadastre colaboradores com regime CLT na aba Colaboradores.</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'rgba(0,0,0,0.02)', borderBottom:'1px solid var(--line)' }}>
                {['Colaborador','Cargo','Salário bruto','FGTS (8%)','Vencimento','Status'].map(h => (
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ col, salario, fgts }) => (
                <tr key={col.id} style={{ borderBottom:'1px solid var(--line)' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'13px 16px' }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{col.nome}</div>
                    <div style={{ fontSize:11, color:'var(--ink-soft)' }}>CPF: {col.cpf || '—'}</div>
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:'var(--ink-soft)' }}>{col.cargo || '—'}</td>
                  <td style={{ padding:'13px 16px', fontFamily:'monospace', fontWeight:600 }}>{fmtMoeda(salario)}</td>
                  <td style={{ padding:'13px 16px', fontFamily:'monospace', fontWeight:700, color:'var(--ink)', fontSize:15 }}>{fmtMoeda(fgts)}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, color: atrasado?'var(--c-neg)':'var(--ink)', fontWeight: atrasado?700:400 }}>{fmtDate(vencimento)}</td>
                  <td style={{ padding:'13px 16px' }}>
                    <span style={{ padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700,
                      background: atrasado?'var(--c-neg-soft)':'var(--bg-alt)',
                      color:      atrasado?'var(--c-neg)':'var(--ink-soft)' }}>
                      {atrasado ? 'Vencido' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'2px solid var(--line)', background:'rgba(0,0,0,0.01)' }}>
                <td colSpan={2} style={{ padding:'13px 16px', fontWeight:700, fontSize:13 }}>
                  TOTAL ({ativos.length} CLTs)
                </td>
                <td style={{ padding:'13px 16px', fontFamily:'monospace', fontWeight:700 }}>{fmtMoeda(totalSalario)}</td>
                <td style={{ padding:'13px 16px', fontFamily:'monospace', fontWeight:700, color:'var(--ink)', fontSize:15 }}>{fmtMoeda(totalFgts)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Instruções */}
      <div style={{ padding:'16px 20px', background:'var(--bg-alt)', border:'1px solid var(--line)', borderRadius:10, fontSize:13, lineHeight:1.7, color:'var(--ink-soft)' }}>
        <strong style={{ color:'var(--ink)' }}>📋 Como recolher:</strong> Portal <strong>Conectividade Social</strong> (caixa.gov.br) → SEFIP/eSocial → gerar GFIP → gerar guia GRF → pagar na Caixa até o dia 7.
        <span style={{ display:'block', marginTop:6 }}>Alíquotas: <strong>8%</strong> para CLTs · <strong>2%</strong> para Aprendizes · Prazo: <strong>dia 7 do mês seguinte</strong> à competência.</span>
      </div>
    </div>
  );
};


const RHPage = () => {
  const { profile } = window.useAuth();
  const rhData = useRHData();
  const [subPage, setSubPage] = React.useState('dashboard');
  const toast = useToast();

  const subs = [
    { k: 'dashboard', label: 'Dashboard', icon: '●' },
    { k: 'colaboradores', label: 'Colaboradores', icon: '◆' },
    { k: 'salas', label: 'Salas', icon: '▦' },
    { k: 'ferias', label: 'Férias', icon: '◈' },
    { k: 'faltas', label: 'Faltas', icon: '▲' },
    { k: 'atestados', label: 'Atestados', icon: '◎' },
    { k: 'fgts', label: 'FGTS', icon: '₿' },
    { k: 'alertas', label: 'Alertas', icon: '⚠' },
    { k: 'pendencias', label: 'Pendências', icon: '◐' },
    { k: 'rescisoes', label: 'Rescisões', icon: '✕' },
  ];

  if (!profile?.company_id) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)' }}>
        Para usar o módulo de RH, você precisa estar vinculado a uma empresa.
      </div>
    );
  }

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.PageHeader
        title="Recursos Humanos"
        subtitle="Gestão de colaboradores, férias, atestados e rescisões"
        action={rhData.loading ? <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Carregando...</span> : null}
      />

      {rhData.error && (
        <div style={{
          padding: 14, background: 'color-mix(in oklch, var(--c-danger) 10%, transparent)',
          border: '1px solid var(--c-danger)', borderRadius: 'var(--r-sm)',
          fontSize: 13, color: 'var(--c-danger)',
        }}>
          ⚠ {rhData.error}<br />
          <span style={{ fontSize: 11, opacity: 0.8 }}>Verifique se a migration 002_rbac_fix_and_rh.sql foi aplicada no Supabase.</span>
        </div>
      )}

      {/* Sub-navegação */}
      <div style={{
        display: 'flex', gap: 4, padding: 6, background: 'var(--surface)',
        borderRadius: 'var(--r-md)', border: '1px solid var(--line)',
        overflowX: 'auto', whiteSpace: 'nowrap',
      }}>
        {subs.map(s => {
          const active = subPage === s.k;
          return (
            <button key={s.k} onClick={() => setSubPage(s.k)} style={{
              padding: '10px 18px', borderRadius: 'var(--r-sm)',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-ink)' : 'var(--ink-soft)',
              fontSize: 13, fontWeight: active ? 600 : 500,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s', cursor: 'pointer',
              boxShadow: active ? 'var(--glow-primary)' : 'none',
            }}>
              <span style={{ fontSize: 10, opacity: 0.9 }}>{s.icon}</span>
              {s.label}
              {s.k === 'alertas' && rhData.alertas.filter(a => !a.resolvido && a.prioridade === 'crítica').length > 0 && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.3)' : 'var(--c-danger)', color: '#fff',
                  fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700, marginLeft: 4,
                }}>{rhData.alertas.filter(a => !a.resolvido && a.prioridade === 'crítica').length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      {subPage === 'dashboard' && <RHDashboard data={rhData} setSubPage={setSubPage} />}
      {subPage === 'colaboradores' && <RHColaboradores data={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'salas' && <window.RHSalas rhData={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'ferias' && <RHFerias data={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'faltas' && <RHFaltas data={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'atestados' && <RHAtestados data={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'alertas' && <RHAlertas data={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'pendencias' && <RHPendencias data={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'fgts' && <RHFgts data={rhData} reload={rhData.reload} toast={toast} />}
      {subPage === 'rescisoes' && <RHRescisoes data={rhData} reload={rhData.reload} toast={toast} />}

      <toast.ToastView />
    </div>
  );
};

Object.assign(window, { RHPage, rhListColab });
