// ═══════════════════════════════════════════════════════════════════════════
// SALAS — Módulo de gestão de escalas, ocupação e disponibilidade
// Sub-aba do RH. Segue a estética do Infinity (OKLCH, Space Grotesk, TiltCard).
//
// Sub-telas:
//   1. Mapa de Salas       — grade visual unidade × sala × dia × turno
//   2. Horários Disponíveis — quais salas estão livres em cada dia/turno
//   3. Gestão de Escalas    — CRUD de escalas (adicionar/editar/remover)
//   4. Alertas              — Mariana 07:30, Karolina qua/sex, Mara itinerante etc.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Supabase REST API (mesmo padrão de rh.jsx) ───
const SB_URL_SALAS = () => window.SUPABASE_URL;
const sbSalas = async (path, opts = {}) => {
  const s = window.getSession?.();
  const res = await fetch(`${SB_URL_SALAS()}/rest/v1${path}`, {
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

// ─── CRUD por tabela ───
const sListUnidades   = (cid) => sbSalas(`/salas_unidades?company_id=eq.${cid}&select=*&order=ordem_exibicao.asc`);
const sListCategorias = (cid) => sbSalas(`/salas_categorias?select=*,salas_unidades!inner(company_id)&salas_unidades.company_id=eq.${cid}&order=ordem_exibicao.asc`);
const sListSalas      = (cid) => sbSalas(`/salas_fisicas?select=*,salas_unidades!inner(company_id,codigo)&salas_unidades.company_id=eq.${cid}&order=numero.asc`);
const sListEscalas    = (cid) => sbSalas(`/salas_escalas?company_id=eq.${cid}&select=*&order=dia_semana.asc,hora_inicio.asc&limit=1000`);
const sListFechamentos= (cid) => sbSalas(`/salas_fechamentos?select=*,salas_escalas!inner(company_id)&salas_escalas.company_id=eq.${cid}&limit=500`);

const sCreateEscala = (e, cid, uid) => sbSalas('/salas_escalas', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...e, company_id: cid, created_by: uid, updated_by: uid }) });
const sUpdateEscala = (id, patch, uid) => sbSalas(`/salas_escalas?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation',
  body: JSON.stringify({ ...patch, updated_by: uid, updated_at: new Date().toISOString() }) });
const sDeleteEscala = (id) => sbSalas(`/salas_escalas?id=eq.${id}`, { method: 'DELETE' });

const sCreateFechamento = (f, uid) => sbSalas('/salas_fechamentos', { method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ ...f, created_by: uid }) });
const sDeleteFechamento = (id) => sbSalas(`/salas_fechamentos?id=eq.${id}`, { method: 'DELETE' });

// ─── Constantes ───
const DIAS_NOMES = ['', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
const DIAS_ABREV = ['', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const TURNOS = ['manha', 'tarde', 'noite'];
const TURNOS_LABEL = { manha: 'MANHÃ', tarde: 'TARDE', noite: 'NOITE' };

// ═════════════════════════════════════════════════════════════════════
// HOOK: carrega todos os dados do módulo
// ═════════════════════════════════════════════════════════════════════
const useSalasData = () => {
  const { profile } = window.useAuth();
  const companyId = profile?.company_id;
  const userId = profile?.id;

  const [data, setData] = React.useState({
    unidades: [], categorias: [], salas: [], escalas: [], fechamentos: [],
    loading: true, error: null,
  });

  const reload = React.useCallback(async () => {
    if (!companyId) { setData(d => ({ ...d, loading: false })); return; }
    setData(d => ({ ...d, loading: true, error: null }));
    try {
      const [unidades, categorias, salas, escalas, fechamentos] = await Promise.all([
        sListUnidades(companyId),
        sListCategorias(companyId),
        sListSalas(companyId),
        sListEscalas(companyId),
        sListFechamentos(companyId),
      ]);
      setData({ unidades, categorias, salas, escalas, fechamentos, loading: false, error: null });
    } catch (err) {
      setData(d => ({ ...d, loading: false, error: err.message }));
    }
  }, [companyId]);

  React.useEffect(() => { reload(); }, [reload]);

  return { ...data, companyId, userId, reload };
};

// ═════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════
const fmtHora = (t) => t ? String(t).slice(0, 5) : '';
// Helpers de exibição de sala (numeração casa centenal — andar ignorado)
const labelSala = (sala) => {
  if (!sala) return 'sem sala';
  if (sala.apelido) return sala.apelido;
  return `Sala ${sala.numero}`;
};
const codigoSala = (sala, unidades) => {
  if (!sala) return '—';
  const u = unidades.find(x => x.id === sala.unidade_id);
  if (sala.apelido) return `${u?.codigo || '?'} · ${sala.apelido}`;
  return `${u?.codigo || '?'} · ${sala.numero}`;
};

// Filtra escalas ativas hoje (vigência ok + não fechadas)
const escalaAtivaHoje = (esc, fechamentos) => {
  const hoje = new Date().toISOString().slice(0, 10);
  if (esc.vigencia_inicio && esc.vigencia_inicio > hoje) return false;
  if (esc.vigencia_fim && esc.vigencia_fim < hoje) return false;
  return true;
};

// Verifica se um (escala, dia, turno) está fechado
const estaFechado = (escId, dia, turno, fechamentos) => {
  const hoje = new Date().toISOString().slice(0, 10);
  return fechamentos.some(f =>
    f.escala_id === escId &&
    f.dia_semana === dia &&
    (f.turno === null || f.turno === turno) &&
    (!f.vigencia_inicio || f.vigencia_inicio <= hoje) &&
    (!f.vigencia_fim || f.vigencia_fim >= hoje)
  );
};

// ═════════════════════════════════════════════════════════════════════
// SUB-TELA 1 — Mapa de Salas (grid visual)
// ═════════════════════════════════════════════════════════════════════
const SalasMapa = ({ data, colaboradores }) => {
  const [filtroUnidade, setFiltroUnidade] = React.useState('all');

  // Indexa categorias e salas por id
  const catById = Object.fromEntries(data.categorias.map(c => [c.id, c]));
  const salaById = Object.fromEntries(data.salas.map(s => [s.id, s]));
  const colabById = Object.fromEntries((colaboradores || []).map(c => [c.id, c]));

  // Agrupa escalas por unidade > categoria > colaborador
  const grupos = {};
  data.escalas.forEach(esc => {
    const cat = catById[esc.categoria_id];
    if (!cat) return;
    const unidadeId = cat.unidade_id;
    if (filtroUnidade !== 'all' && unidadeId !== filtroUnidade) return;
    const u = data.unidades.find(x => x.id === unidadeId);
    if (!u) return;
    const key = `${u.codigo}|${cat.codigo}|${esc.colaborador_id}`;
    if (!grupos[key]) {
      grupos[key] = {
        unidade: u,
        categoria: cat,
        colaborador_id: esc.colaborador_id,
        colaborador_nome: colabById[esc.colaborador_id]?.nome || '—',
        sala: salaById[esc.sala_id],
        slots: {},  // { '1-manha': escala, ... }
      };
    }
    grupos[key].slots[`${esc.dia_semana}-${esc.turno}`] = esc;
  });

  const lista = Object.values(grupos).sort((a, b) => {
    if (a.unidade.ordem_exibicao !== b.unidade.ordem_exibicao) return a.unidade.ordem_exibicao - b.unidade.ordem_exibicao;
    if (a.categoria.ordem_exibicao !== b.categoria.ordem_exibicao) return a.categoria.ordem_exibicao - b.categoria.ordem_exibicao;
    return a.colaborador_nome.localeCompare(b.colaborador_nome);
  });

  // Renderiza célula do mapa
  const renderCell = (grupo, dia, turno) => {
    const esc = grupo.slots[`${dia}-${turno}`];
    if (!esc) {
      return (
        <td style={{ padding: 4, textAlign: 'center', background: 'color-mix(in oklch, var(--c-primary) 8%, transparent)', color: 'var(--c-primary)', fontSize: 10, fontStyle: 'italic', borderRadius: 4 }}>
          LIVRE
        </td>
      );
    }
    if (estaFechado(esc.id, dia, turno, data.fechamentos)) {
      return (
        <td style={{ padding: 4, textAlign: 'center', background: 'color-mix(in oklch, var(--c-danger) 12%, transparent)', color: 'var(--c-danger)', fontSize: 10, fontWeight: 600, borderRadius: 4 }}>
          FECHADA
        </td>
      );
    }
    if (esc.status === 'sob_demanda') {
      return (
        <td style={{ padding: 4, textAlign: 'center', background: 'color-mix(in oklch, var(--c-warning) 15%, transparent)', color: 'var(--c-warning)', fontSize: 10, fontStyle: 'italic', borderRadius: 4 }}>
          sob dem.
        </td>
      );
    }
    return (
      <td style={{ padding: 4, textAlign: 'center', background: 'var(--surface-2)', fontSize: 10, color: 'var(--ink)', borderRadius: 4 }}>
        {fmtHora(esc.hora_inicio)}–{fmtHora(esc.hora_fim)}
      </td>
    );
  };

  // Agrupa visualmente por unidade > categoria
  let lastUnidade = null, lastCategoria = null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--ink-mute)', fontWeight: 600 }}>Unidade:</span>
        <button onClick={() => setFiltroUnidade('all')} style={{
          padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
          border: '1px solid var(--line-strong)',
          background: filtroUnidade === 'all' ? 'var(--c-primary)' : 'transparent',
          color: filtroUnidade === 'all' ? '#fff' : 'var(--ink-soft)',
        }}>Todas</button>
        {data.unidades.map(u => (
          <button key={u.id} onClick={() => setFiltroUnidade(u.id)} style={{
            padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            border: '1px solid var(--line-strong)',
            background: filtroUnidade === u.id ? `#${u.cor_hex}` : 'transparent',
            color: filtroUnidade === u.id ? '#fff' : 'var(--ink-soft)',
          }}>{u.codigo}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-mute)' }}>
          {lista.length} profissional{lista.length !== 1 ? 'is' : ''} · {data.escalas.length} escala{data.escalas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      <window.TiltCard interactive={false} padding={0} style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 2, fontFamily: 'Space Grotesk, system-ui', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--ink-mute)', fontWeight: 700, letterSpacing: 0.5, position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2, minWidth: 180 }}>PROFISSIONAL</th>
              <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 10, color: 'var(--ink-mute)', fontWeight: 700, letterSpacing: 0.5, minWidth: 110 }}>SALA</th>
              {[1,2,3,4,5,6].map(d => (
                <th key={d} colSpan={3} style={{ padding: '6px 4px', fontSize: 10, color: 'var(--ink)', fontWeight: 700, letterSpacing: 0.5, background: 'var(--c-secondary-soft)', borderRadius: 4 }}>
                  {DIAS_ABREV[d]}
                </th>
              ))}
            </tr>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2 }}></th>
              <th></th>
              {[1,2,3,4,5,6].flatMap(d =>
                TURNOS.map(t => (
                  <th key={`${d}-${t}`} style={{ padding: '4px 2px', fontSize: 9, color: 'var(--ink-mute)', fontWeight: 600, minWidth: 56 }}>
                    {t === 'manha' ? 'M' : t === 'tarde' ? 'T' : 'N'}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {lista.map((grupo, idx) => {
              const novaUnidade = grupo.unidade.codigo !== lastUnidade;
              const novaCategoria = novaUnidade || grupo.categoria.codigo !== lastCategoria;
              lastUnidade = grupo.unidade.codigo;
              lastCategoria = grupo.categoria.codigo;
              const rows = [];

              if (novaUnidade) {
                rows.push(
                  <tr key={`u-${grupo.unidade.id}`}>
                    <td colSpan={20} style={{
                      padding: '12px 14px',
                      background: `#${grupo.unidade.cor_hex}`,
                      color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 1,
                      borderRadius: 6, marginTop: 8,
                    }}>━━━ {grupo.unidade.codigo} · {grupo.unidade.nome.toUpperCase()} ━━━</td>
                  </tr>
                );
              }
              if (novaCategoria) {
                rows.push(
                  <tr key={`c-${grupo.unidade.id}-${grupo.categoria.id}`}>
                    <td colSpan={20} style={{
                      padding: '8px 14px',
                      background: `#${grupo.categoria.cor_fundo_hex}`,
                      color: `#${grupo.categoria.cor_texto_hex}`, fontWeight: 600, fontSize: 11,
                      borderRadius: 4,
                    }}>▸ {grupo.categoria.nome}</td>
                  </tr>
                );
              }
              rows.push(
                <tr key={`g-${idx}`}>
                  <td style={{ padding: '6px 12px', position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, fontWeight: 600, color: 'var(--ink)', fontSize: 11, borderBottom: '1px solid var(--line)' }}>
                    {grupo.colaborador_nome}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 10, color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)' }}>
                    {grupo.sala ? codigoSala(grupo.sala, data.unidades) : 'itinerante'}
                  </td>
                  {[1,2,3,4,5,6].flatMap(d => TURNOS.map(t => renderCell(grupo, d, t)))}
                </tr>
              );
              return rows;
            })}
          </tbody>
        </table>
      </window.TiltCard>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--ink-mute)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'color-mix(in oklch, var(--c-primary) 8%, transparent)', border: '1px solid var(--c-primary)' }}></span>
          LIVRE — turno disponível
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'color-mix(in oklch, var(--c-danger) 12%, transparent)', border: '1px solid var(--c-danger)' }}></span>
          FECHADA — fechamento ativo
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'color-mix(in oklch, var(--c-warning) 15%, transparent)', border: '1px solid var(--c-warning)' }}></span>
          sob demanda
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--surface-2)', border: '1px solid var(--line-strong)' }}></span>
          ocupado
        </span>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════
// SUB-TELA 2 — Horários Disponíveis (por sala física)
// ═════════════════════════════════════════════════════════════════════
const SalasDisponibilidade = ({ data }) => {
  const salasOrd = [...data.salas].sort((a, b) => {
    const ua = data.unidades.find(u => u.id === a.unidade_id);
    const ub = data.unidades.find(u => u.id === b.unidade_id);
    if (ua?.ordem_exibicao !== ub?.ordem_exibicao) return (ua?.ordem_exibicao||0) - (ub?.ordem_exibicao||0);
    // Ordenação numérica quando ambos são numéricos; alfabética caso contrário (Auditório etc.)
    const na = parseInt(a.numero, 10);
    const nb = parseInt(b.numero, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a.numero).localeCompare(String(b.numero));
  });

  // Para cada sala × dia, calcula turnos livres
  const turnosLivres = (salaId, dia) => {
    const livres = [];
    TURNOS.forEach(t => {
      const ocupado = data.escalas.some(e =>
        e.sala_id === salaId &&
        e.dia_semana === dia &&
        e.turno === t &&
        e.status !== 'fechada_temporariamente' &&
        !estaFechado(e.id, dia, t, data.fechamentos)
      );
      if (!ocupado) livres.push(t === 'manha' ? 'M' : t === 'tarde' ? 'T' : 'N');
    });
    return livres;
  };

  return (
    <window.TiltCard interactive={false} padding={0} style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 2, fontFamily: 'Space Grotesk, system-ui', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: 'var(--ink-mute)', fontWeight: 700, letterSpacing: 0.5 }}>SALA</th>
            {[1,2,3,4,5,6].map(d => (
              <th key={d} style={{ padding: '10px 12px', fontSize: 11, color: 'var(--ink)', fontWeight: 700, letterSpacing: 0.5 }}>{DIAS_ABREV[d]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {salasOrd.map(sala => {
            const u = data.unidades.find(x => x.id === sala.unidade_id);
            return (
              <tr key={sala.id}>
                <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 12, color: 'var(--ink)', background: 'var(--surface-2)', borderRadius: 4 }}>
                  <span style={{ color: `#${u?.cor_hex || '888'}`, fontWeight: 700 }}>{u?.codigo}</span> · {sala.apelido || `Sala ${sala.numero}`}
                </td>
                {[1,2,3,4,5,6].map(d => {
                  const livres = turnosLivres(sala.id, d);
                  const ehDiaTodo = livres.length === 3;
                  return (
                    <td key={d} style={{
                      padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 600, borderRadius: 4,
                      background: livres.length === 0 ? 'transparent' :
                                  ehDiaTodo ? 'var(--c-primary)' :
                                  'color-mix(in oklch, var(--c-primary) 18%, transparent)',
                      color: livres.length === 0 ? 'var(--ink-mute)' :
                             ehDiaTodo ? '#fff' :
                             'var(--c-primary)',
                    }}>
                      {livres.length === 0 ? '—' : ehDiaTodo ? 'DIA TODO' : livres.join('+')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </window.TiltCard>
  );
};

// ═════════════════════════════════════════════════════════════════════
// SUB-TELA 3 — Gestão de Escalas (CRUD)
// ═════════════════════════════════════════════════════════════════════
const SalasGestao = ({ data, colaboradores, reload, toast }) => {
  const { profile } = window.useAuth();
  const [modal, setModal] = React.useState(null);
  const [form, setForm] = React.useState({
    colaborador_id: '', categoria_id: '', sala_id: '',
    dia_semana: 1, turno: 'manha', hora_inicio: '08:00', hora_fim: '12:00',
    status: 'ativa', observacao: '',
  });

  const abrirModal = (esc) => {
    if (esc) {
      setForm({
        id: esc.id,
        colaborador_id: esc.colaborador_id,
        categoria_id: esc.categoria_id,
        sala_id: esc.sala_id || '',
        dia_semana: esc.dia_semana,
        turno: esc.turno,
        hora_inicio: fmtHora(esc.hora_inicio),
        hora_fim: fmtHora(esc.hora_fim),
        status: esc.status,
        observacao: esc.observacao || '',
      });
    } else {
      setForm({
        colaborador_id: '', categoria_id: '', sala_id: '',
        dia_semana: 1, turno: 'manha', hora_inicio: '08:00', hora_fim: '12:00',
        status: 'ativa', observacao: '',
      });
    }
    setModal('edit');
  };

  const salvar = async () => {
    if (!form.colaborador_id || !form.categoria_id) {
      toast.show('Selecione profissional e categoria', 'error'); return;
    }
    if (form.hora_fim <= form.hora_inicio) {
      toast.show('Hora final deve ser maior que inicial', 'error'); return;
    }
    try {
      const payload = {
        colaborador_id: form.colaborador_id,
        categoria_id: form.categoria_id,
        sala_id: form.sala_id || null,
        dia_semana: parseInt(form.dia_semana),
        turno: form.turno,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        status: form.status,
        observacao: form.observacao || null,
      };
      if (form.id) {
        await sUpdateEscala(form.id, payload, profile.id);
        toast.show('Escala atualizada');
      } else {
        await sCreateEscala(payload, profile.company_id, profile.id);
        toast.show('Escala criada');
      }
      setModal(null);
      reload();
    } catch (err) {
      toast.show(err.message, 'error');
    }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir esta escala?')) return;
    try {
      await sDeleteEscala(id);
      toast.show('Escala excluída');
      reload();
    } catch (err) {
      toast.show(err.message, 'error');
    }
  };

  const colabById = Object.fromEntries((colaboradores || []).map(c => [c.id, c]));
  const catById = Object.fromEntries(data.categorias.map(c => [c.id, c]));
  const salaById = Object.fromEntries(data.salas.map(s => [s.id, s]));

  // Agrupa escalas por colaborador
  const porColab = {};
  data.escalas.forEach(e => {
    if (!porColab[e.colaborador_id]) porColab[e.colaborador_id] = [];
    porColab[e.colaborador_id].push(e);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
          {data.escalas.length} escala{data.escalas.length !== 1 ? 's' : ''} · {Object.keys(porColab).length} profissional{Object.keys(porColab).length !== 1 ? 'is' : ''}
        </span>
        <window.Btn onClick={() => abrirModal(null)} icon="plus">Nova escala</window.Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(porColab).map(([colabId, escalas]) => {
          const c = colabById[colabId];
          if (!c) return null;
          return (
            <window.TiltCard key={colabId} interactive={false} padding={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <window.Avatar initials={(c.nome || '?').slice(0,2).toUpperCase()} size={36} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{c.cargo || c.regime} · {escalas.length} escala{escalas.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {escalas.map(e => {
                  const cat = catById[e.categoria_id];
                  const sala = salaById[e.sala_id];
                  return (
                    <div key={e.id} onClick={() => abrirModal(e)} style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)',
                      background: cat ? `#${cat.cor_fundo_hex}` : 'var(--surface-2)',
                      color: cat ? `#${cat.cor_texto_hex}` : 'var(--ink)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>{DIAS_ABREV[e.dia_semana]}</span>
                      <span style={{ opacity: 0.7 }}>·</span>
                      <span>{fmtHora(e.hora_inicio)}–{fmtHora(e.hora_fim)}</span>
                      <span style={{ opacity: 0.7 }}>·</span>
                      <span>{sala ? (sala.apelido || sala.numero) : 'itin.'}</span>
                      <button onClick={(ev) => { ev.stopPropagation(); excluir(e.id); }} style={{
                        marginLeft: 4, background: 'transparent', border: 'none', color: 'currentColor',
                        cursor: 'pointer', opacity: 0.5, fontSize: 14,
                      }}>×</button>
                    </div>
                  );
                })}
              </div>
            </window.TiltCard>
          );
        })}
        {Object.keys(porColab).length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)' }}>
            Nenhuma escala cadastrada. Clique em "Nova escala" para começar.
          </div>
        )}
      </div>

      {/* Modal */}
      {modal === 'edit' && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 24,
            maxWidth: 500, width: '100%', boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{form.id ? 'Editar escala' : 'Nova escala'}</h3>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>PROFISSIONAL *</label>
              <select value={form.colaborador_id} onChange={e => setForm({ ...form, colaborador_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}>
                <option value="">— selecione —</option>
                {(colaboradores || []).filter(c => c.status === 'Ativo').map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>CATEGORIA *</label>
              <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}>
                <option value="">— selecione —</option>
                {data.categorias.map(c => {
                  const u = data.unidades.find(x => x.id === c.unidade_id);
                  return <option key={c.id} value={c.id}>{u?.codigo} · {c.nome}</option>;
                })}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>SALA</label>
              <select value={form.sala_id} onChange={e => setForm({ ...form, sala_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}>
                <option value="">— sem sala (itinerante) —</option>
                {data.salas.map(s => {
                  const u = data.unidades.find(x => x.id === s.unidade_id);
                  return <option key={s.id} value={s.id}>{u?.codigo} · {s.apelido || `Sala ${s.numero}`}</option>;
                })}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>DIA</label>
                <select value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}>
                  {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{DIAS_NOMES[d]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>TURNO</label>
                <select value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}>
                  {TURNOS.map(t => <option key={t} value={t}>{TURNOS_LABEL[t]}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>INÍCIO</label>
                <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>FIM</label>
                <input type="time" value={form.hora_fim} onChange={e => setForm({ ...form, hora_fim: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>STATUS</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}>
                <option value="ativa">Ativa</option>
                <option value="sob_demanda">Sob demanda</option>
                <option value="itinerante">Itinerante</option>
                <option value="fechada_temporariamente">Fechada temporariamente</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>OBSERVAÇÃO</label>
              <input type="text" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}
                placeholder="Opcional"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <window.Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</window.Btn>
              <window.Btn onClick={salvar} icon="check">Salvar</window.Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════
// SUB-TELA 4 — Alertas
// ═════════════════════════════════════════════════════════════════════
const SalasAlertas = ({ data, colaboradores }) => {
  const colabById = Object.fromEntries((colaboradores || []).map(c => [c.id, c]));

  // Detecta conflitos: mesma sala+dia com sobreposição de horário
  const conflitos = [];
  for (let i = 0; i < data.escalas.length; i++) {
    for (let j = i + 1; j < data.escalas.length; j++) {
      const a = data.escalas[i], b = data.escalas[j];
      if (a.sala_id && a.sala_id === b.sala_id &&
          a.dia_semana === b.dia_semana &&
          a.colaborador_id !== b.colaborador_id &&
          a.hora_inicio < b.hora_fim && b.hora_inicio < a.hora_fim &&
          a.status !== 'fechada_temporariamente' && b.status !== 'fechada_temporariamente') {
        conflitos.push({ a, b });
      }
    }
  }

  // Salas com mais de 2 profissionais (densas)
  const profsPorSala = {};
  data.escalas.forEach(e => {
    if (!e.sala_id) return;
    if (!profsPorSala[e.sala_id]) profsPorSala[e.sala_id] = new Set();
    profsPorSala[e.sala_id].add(e.colaborador_id);
  });
  const salasDensas = Object.entries(profsPorSala)
    .filter(([_, set]) => set.size >= 3)
    .map(([sid, set]) => ({
      sala: data.salas.find(s => s.id === sid),
      profs: [...set].map(cid => colabById[cid]?.nome).filter(Boolean),
    }));

  // Itinerantes
  const itinerantes = [...new Set(data.escalas.filter(e => !e.sala_id || e.status === 'itinerante').map(e => e.colaborador_id))]
    .map(cid => colabById[cid]).filter(Boolean);

  // Sob demanda
  const sobDemanda = [...new Set(data.escalas.filter(e => e.status === 'sob_demanda').map(e => e.colaborador_id))]
    .map(cid => colabById[cid]).filter(Boolean);

  // Salas com fechamento ativo
  const salasComFechamento = [...new Set(data.fechamentos.map(f => {
    const e = data.escalas.find(x => x.id === f.escala_id);
    return e ? `${colabById[e.colaborador_id]?.nome || '?'} (${DIAS_ABREV[f.dia_semana]})` : null;
  }).filter(Boolean))];

  const Card = ({ tipo, titulo, descricao, items }) => {
    const cores = {
      conflito: 'var(--c-danger)',
      atenção: 'var(--c-warning)',
      info: 'var(--c-secondary)',
    };
    return (
      <window.TiltCard interactive={false} padding={16} style={{ borderLeft: `4px solid ${cores[tipo]}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <window.Pill color={cores[tipo]}>{tipo.toUpperCase()}</window.Pill>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{titulo}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>{descricao}</p>
        {items && items.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((it, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--ink)', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>{it}</li>
            ))}
          </ul>
        )}
      </window.TiltCard>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      {conflitos.length > 0 && (
        <Card tipo="conflito" titulo={`${conflitos.length} conflito${conflitos.length !== 1 ? 's' : ''} de horário`}
          descricao="Profissionais diferentes ocupando a mesma sala no mesmo horário."
          items={conflitos.slice(0, 5).map(({ a, b }) => `${colabById[a.colaborador_id]?.nome} × ${colabById[b.colaborador_id]?.nome} · ${DIAS_ABREV[a.dia_semana]} ${fmtHora(a.hora_inicio)}`)}
        />
      )}
      {salasDensas.length > 0 && (
        <Card tipo="atenção" titulo="Salas com 3+ profissionais"
          descricao="Salas com alta densidade de uso. Cuidado ao encaixar novos horários."
          items={salasDensas.map(s => `${s.sala ? (s.sala.apelido || `Sala ${s.sala.numero}`) : '?'}: ${s.profs.join(', ')}`)}
        />
      )}
      {itinerantes.length > 0 && (
        <Card tipo="atenção" titulo="Profissionais itinerantes"
          descricao="Sem sala fixa. Risco de conflito com ocupantes regulares."
          items={itinerantes.map(c => c.nome)}
        />
      )}
      {sobDemanda.length > 0 && (
        <Card tipo="info" titulo="Atendimento sob demanda"
          descricao="Profissionais sem horário fixo. Salas com baixa ocupação podem receber encaixes."
          items={sobDemanda.map(c => c.nome)}
        />
      )}
      {salasComFechamento.length > 0 && (
        <Card tipo="info" titulo="Fechamentos ativos"
          descricao="Profissionais com agenda fechada em dias específicos. Salas disponíveis nesses turnos."
          items={salasComFechamento}
        />
      )}
      {conflitos.length === 0 && salasDensas.length === 0 && itinerantes.length === 0 && sobDemanda.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', gridColumn: '1/-1' }}>
          ✓ Nenhum alerta crítico no momento.
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — RHSalas
// ═════════════════════════════════════════════════════════════════════
const RHSalas = ({ rhData, reload, toast }) => {
  const salasData = useSalasData();
  const [view, setView] = React.useState('mapa');

  if (salasData.loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)' }}>Carregando dados de salas...</div>;
  }

  if (salasData.error) {
    return (
      <div style={{
        padding: 14, background: 'color-mix(in oklch, var(--c-danger) 10%, transparent)',
        border: '1px solid var(--c-danger)', borderRadius: 'var(--r-sm)',
        fontSize: 13, color: 'var(--c-danger)',
      }}>
        ⚠ {salasData.error}<br />
        <span style={{ fontSize: 11, opacity: 0.8 }}>
          Verifique se a migration <code>005_salas_module.sql</code> foi aplicada no Supabase.
        </span>
      </div>
    );
  }

  if (salasData.unidades.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)' }}>
        Nenhuma unidade cadastrada para esta empresa.<br />
        <span style={{ fontSize: 12 }}>Aplique a migration <code>005_salas_module.sql</code> que faz o seed inicial.</span>
      </div>
    );
  }

  const views = [
    { k: 'mapa', label: 'Mapa de Salas', icon: '▦' },
    { k: 'disp', label: 'Horários Disponíveis', icon: '◇' },
    { k: 'crud', label: 'Gestão de Escalas', icon: '✎' },
    { k: 'alertas', label: 'Alertas', icon: '⚠' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-navegação interna do módulo de Salas */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, background: 'var(--surface-2)',
        borderRadius: 'var(--r-sm)', border: '1px solid var(--line)',
        overflowX: 'auto', whiteSpace: 'nowrap',
      }}>
        {views.map(v => {
          const active = view === v.k;
          return (
            <button key={v.k} onClick={() => setView(v.k)} style={{
              padding: '8px 14px', borderRadius: 'var(--r-xs)',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--c-secondary)' : 'var(--ink-soft)',
              fontSize: 12, fontWeight: active ? 700 : 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s', cursor: 'pointer',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}>
              <span style={{ fontSize: 11, opacity: 0.8 }}>{v.icon}</span>
              {v.label}
            </button>
          );
        })}
      </div>

      {view === 'mapa' && <SalasMapa data={salasData} colaboradores={rhData?.colaboradores || []} />}
      {view === 'disp' && <SalasDisponibilidade data={salasData} />}
      {view === 'crud' && <SalasGestao data={salasData} colaboradores={rhData?.colaboradores || []} reload={salasData.reload} toast={toast} />}
      {view === 'alertas' && <SalasAlertas data={salasData} colaboradores={rhData?.colaboradores || []} />}
    </div>
  );
};

Object.assign(window, { RHSalas });
