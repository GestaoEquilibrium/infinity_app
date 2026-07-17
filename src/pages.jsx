// Pages — respeita as 5 estruturas obrigatórias
// CONTAS e COMPRAS são páginas separadas.

// ─── FILTRO GLOBAL (mês ou período) ─────────────────────────────
const FilterBar = ({ filter, setFilter }) => {
  const months = window.availableMonths();
  const [showPeriod, setShowPeriod] = React.useState(filter.mode === 'period');
  const [periodFrom, setPeriodFrom] = React.useState(filter.from || '');
  const [periodTo, setPeriodTo] = React.useState(filter.to || '');

  React.useEffect(() => { setShowPeriod(filter.mode === 'period'); }, [filter.mode]);

  return (
    <TiltCard interactive={false} padding={14}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-alt)', padding: 4, borderRadius: 999, border: '1px solid var(--line)' }}>
          <button onClick={() => setFilter({ mode: 'month', month: filter.month || months[months.length - 1] })}
            style={tabBtnStyle(filter.mode === 'month')}>Mês</button>
          <button onClick={() => setFilter({ mode: 'period', from: periodFrom, to: periodTo })}
            style={tabBtnStyle(filter.mode === 'period')}>Período</button>
        </div>

        {filter.mode === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            <button onClick={() => {
              const i = months.indexOf(filter.month);
              if (i > 0) setFilter({ mode: 'month', month: months[i - 1] });
            }}
              style={navBtn}><Icon name="chevron_left" size={16} stroke={2.4} /></button>
            <select value={filter.month} onChange={(e) => setFilter({ mode: 'month', month: e.target.value })}
              style={selectStyle}>
              {months.map(m => <option key={m} value={m}>{window.monthLabel(m)}</option>)}
            </select>
            <button onClick={() => {
              const i = months.indexOf(filter.month);
              if (i < months.length - 1) setFilter({ mode: 'month', month: months[i + 1] });
            }}
              style={navBtn}><Icon name="chevron_right" size={16} stroke={2.4} /></button>
          </div>
        )}

        {filter.mode === 'period' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-mute)', fontWeight: 600 }}>De</span>
            <input type="date" value={periodFrom} onChange={(e) => { setPeriodFrom(e.target.value); setFilter({ mode: 'period', from: e.target.value, to: periodTo }); }} style={inputStyle} />
            <span style={{ fontSize: 12, color: 'var(--ink-mute)', fontWeight: 600 }}>até</span>
            <input type="date" value={periodTo} onChange={(e) => { setPeriodTo(e.target.value); setFilter({ mode: 'period', from: periodFrom, to: e.target.value }); }} style={inputStyle} />
          </div>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-mute)' }}>
          {filter.mode === 'month'
            ? <>Exibindo <strong style={{ color: 'var(--ink)' }}>{window.monthLabel(filter.month)}</strong></>
            : <>Exibindo <strong style={{ color: 'var(--ink)' }}>{filter.from || '—'} até {filter.to || '—'}</strong></>}
        </div>
      </div>
    </TiltCard>
  );
};
const tabBtnStyle = (active) => ({
  padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
  background: active ? 'var(--surface-solid)' : 'transparent',
  color: active ? 'var(--ink)' : 'var(--ink-mute)',
  boxShadow: active ? 'var(--shadow-sm)' : 'none',
  transition: 'all 0.2s',
});
const navBtn = {
  width: 32, height: 32, borderRadius: 10,
  background: 'var(--bg-alt)', border: '1px solid var(--line)',
  display: 'grid', placeItems: 'center', color: 'var(--ink-soft)',
};
const selectStyle = {
  padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--bg-alt)', color: 'var(--ink)', fontSize: 13, fontWeight: 600,
  fontFamily: 'inherit', cursor: 'pointer', minWidth: 130,
};
const inputStyle = {
  padding: '8px 12px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--bg-alt)', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit',
};

// ─── IMPORT EXCEL — abre um diálogo, valida e adiciona a COMPRAS ─────
const ExcelImporter = ({ onImport, target = 'compras' }) => {
  const [state, setState] = React.useState('idle'); // idle | loading | preview | done | error
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState('');
  const inputRef = React.useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState('loading');
    try {
      const parsed = target === 'contas' ? await window.parseExcelContas(file) : await window.parseExcel(file);
      if (!parsed.length) throw new Error('Nenhum lançamento válido encontrado.');
      setRows(parsed);
      setState('preview');
    } catch (err) {
      setError(err.message || 'Falha ao importar');
      setState('error');
    }
  };

  const confirm = () => {
    if (target === 'contas') window.addContas(rows);
    else window.addCompras(rows);
    onImport?.(rows.length);
    setState('done');
    setTimeout(() => { setState('idle'); setRows([]); }, 2000);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
      <Btn variant="secondary" icon="file" onClick={() => inputRef.current?.click()}>Importar Excel</Btn>

      {state === 'loading' && <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Lendo planilha…</div>}

      {state === 'preview' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'oklch(0 0 0 / 0.45)', backdropFilter: 'blur(6px)',
          display: 'grid', placeItems: 'center', padding: 30,
          animation: 'fadeIn 0.2s ease both',
        }}
          onClick={() => setState('idle')}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--surface-solid)', borderRadius: 'var(--r-lg)',
            padding: 28, width: 'min(880px, 100%)', maxHeight: '84vh', overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)',
            display: 'flex', flexDirection: 'column', gap: 16,
            animation: 'popIn 0.3s cubic-bezier(.22,1,.36,1) both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Conferir importação</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 4 }}>
                  {rows.length} lançamentos detectados · serão adicionados como {target === 'contas' ? 'CONTAS' : 'COMPRAS'}
                </p>
              </div>
              <button onClick={() => setState('idle')} style={{ ...navBtn, width: 36, height: 36 }}>
                <Icon name="x" size={16} stroke={2.4} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-alt)', zIndex: 1 }}>
                  <tr>
                    {(target === 'contas'
                      ? ['Vencimento','Tipo','Descrição','Categoria','Previsto','Realizado']
                      : ['Data','Tipo','Descrição','Categoria','Valor']
                    ).map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => target === 'contas' ? (
                    <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '9px 14px', color: 'var(--ink-soft)' }} className="mono">{window.fmtDate(r.vencimento)}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <Pill color={r.tipo === 'receber' ? 'var(--c-pos)' : 'var(--c-neg)'} size="sm">{r.tipo === 'receber' ? 'A receber' : 'A pagar'}</Pill>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'var(--ink)', fontWeight: 500 }}>{r.description}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--ink-soft)' }}>{r.category}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--ink-soft)', fontWeight: 600 }} className="mono">{window.fmt(r.previsto)}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: r.pago ? (r.tipo === 'receber' ? 'var(--c-pos)' : 'var(--c-neg)') : 'var(--ink-mute)', fontWeight: 700 }} className="mono">
                        {r.pago ? window.fmt(r.realizado) : '—'}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '9px 14px', color: 'var(--ink-soft)' }} className="mono">{window.fmtDate(r.date)}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <Pill color={r.type === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)'} size="sm">{r.type}</Pill>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'var(--ink)', fontWeight: 500 }}>{r.description}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--ink-soft)' }}>{r.category}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: r.type === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)', fontWeight: 700 }} className="mono">
                        {r.type === 'entrada' ? '+' : '−'} {window.fmt(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn variant="secondary" onClick={() => setState('idle')}>Cancelar</Btn>
              <Btn variant="primary" icon="check" onClick={confirm}>Confirmar {rows.length} lançamentos</Btn>
            </div>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div style={toastStyle('var(--c-primary)')}>✓ {rows.length} lançamentos importados</div>
      )}
      {state === 'error' && (
        <div style={toastStyle('var(--c-danger)')}>⚠ {error}
          <button onClick={() => setState('idle')} style={{ marginLeft: 12, color: 'inherit', textDecoration: 'underline' }}>fechar</button>
        </div>
      )}
    </>
  );
};
const toastStyle = (c) => ({
  position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000,
  padding: '12px 20px', borderRadius: 12, background: c, color: 'var(--surface-solid)',
  fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)',
  animation: 'slideUp 0.4s cubic-bezier(.22,1,.36,1) both',
});

// ─── MODAL DE EDIÇÃO (Conta ou Compra) ─────────────────────────
const EditModal = ({ kind, record, onClose, onSaved }) => {
  const isConta = kind === 'conta';
  const isNew = !record?.id;
  const [form, setForm] = React.useState(() => ({
    // defaults para novo registro
    ...(isConta ? { tipo: 'pagar', pago: false, previsto: 0, realizado: 0, category: '', description: '', vencimento: new Date().toISOString().slice(0,10) } : { type: 'saida', amount: 0, category: '', description: '', date: new Date().toISOString().slice(0,10), paymentMethod: 'PIX' }),
    ...record,
  }));
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true); setErr('');
    try {
      if (isNew) {
        // Criar novo registro
        const tempId = 'new-' + Date.now();
        const newRecord = { ...form, id: tempId };
        if (isConta) {
          window.CONTAS = [newRecord, ...(window.CONTAS || [])];
          // Persistir no Supabase
          const s = window.getSession?.();
          const me = s ? await window.getMe?.() : null;
          const prof = me ? await window.getProfile?.(me.id) : null;
          if (prof?.company_id) {
            const saved = await window.createConta(newRecord, prof.company_id, me.id);
            if (saved?.[0]?.id) {
              window.CONTAS = window.CONTAS.map(c => c.id === tempId ? { ...c, id: saved[0].id } : c);
            }
          }
        } else {
          window.COMPRAS = [newRecord, ...(window.COMPRAS || [])];
          const s = window.getSession?.();
          const me = s ? await window.getMe?.() : null;
          const prof = me ? await window.getProfile?.(me.id) : null;
          if (prof?.company_id) {
            const saved = await window.createCompra(newRecord, prof.company_id, me.id);
            if (saved?.[0]?.id) {
              window.COMPRAS = window.COMPRAS.map(c => c.id === tempId ? { ...c, id: saved[0].id } : c);
            }
          }
        }
        window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
      } else {
        // Editar existente
        if (isConta) await window.updateContaLocal(record.id, form);
        else await window.updateCompraLocal(record.id, form);
      }
      onSaved?.();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1600,
      background: 'oklch(0 0 0 / 0.45)', backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: 30,
      animation: 'fadeIn 0.2s ease both',
    }} onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--surface-solid)', borderRadius: 'var(--r-lg)', padding: 28, width: 'min(520px, 100%)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: 14,
        animation: 'popIn 0.3s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>{isNew ? 'Nova' : 'Editar'} {isConta ? 'conta' : 'compra'}</h3>
            {!isNew && <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 4 }} className="mono">#{String(record.id).slice(0, 8)}</p>}
          </div>
          <button type="button" onClick={onClose} style={{ ...navBtn, width: 34, height: 34 }}>
            <Icon name="x" size={15} stroke={2.4} />
          </button>
        </div>

        {isConta ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Tipo">
              <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} style={editInput}>
                <option value="pagar">A pagar (saída)</option>
                <option value="receber">A receber (entrada)</option>
              </select>
            </FormField>
            <FormField label="Vencimento">
              <input type="date" value={form.vencimento || ''} onChange={(e) => set('vencimento', e.target.value)} style={editInput} />
            </FormField>
            <div style={{ gridColumn: 'span 2' }}>
              <FormField label="Descrição">
                <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} style={editInput} required />
              </FormField>
            </div>
            <FormField label="Categoria">
              <select value={form.category || ''} onChange={e => set('category', e.target.value)} style={editInput}>
                <option value="">— Selecione —</option>
                {((window.APP_CATEGORIES?.[form.tipo === 'receber' ? 'entrada' : 'saida'] || [])
                  .filter(c => c.is_active !== false)
                  .map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                )}
                {/* Valor atual não está na lista */}
                {form.category && !(window.APP_CATEGORIES?.[form.tipo === 'receber' ? 'entrada' : 'saida'] || []).some(c => c.name === form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
              </select>
            </FormField>
            <FormField label="Valor previsto">
              <input type="number" step="0.01" value={form.previsto || 0} onChange={(e) => set('previsto', parseFloat(e.target.value))} style={editInput} />
            </FormField>
            <FormField label="Valor realizado">
              <input type="number" step="0.01" value={form.realizado || 0} onChange={(e) => set('realizado', parseFloat(e.target.value))} style={editInput} />
            </FormField>
            <FormField label="Status">
              <select value={form.pago ? 'pago' : 'pendente'} onChange={(e) => set('pago', e.target.value === 'pago')} style={editInput}>
                <option value="pendente">Pendente</option>
                <option value="pago">{form.tipo === 'receber' ? 'Recebido' : 'Pago'}</option>
              </select>
            </FormField>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Tipo">
              <select value={form.type} onChange={(e) => set('type', e.target.value)} style={editInput}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </FormField>
            <FormField label="Data">
              <input type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)} style={editInput} />
            </FormField>
            <div style={{ gridColumn: 'span 2' }}>
              <FormField label="Descrição">
                <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} style={editInput} required />
              </FormField>
            </div>
            <FormField label="Categoria">
              <select value={form.category || ''} onChange={e => set('category', e.target.value)} style={editInput}>
                <option value="">— Selecione —</option>
                {((window.APP_CATEGORIES?.saida || [])
                  .filter(c => c.is_active !== false)
                  .map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                )}
                {form.category && !(window.APP_CATEGORIES?.saida || []).some(c => c.name === form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
              </select>
            </FormField>
            <FormField label="Valor">
              <input type="number" step="0.01" value={form.amount || 0} onChange={(e) => set('amount', parseFloat(e.target.value))} style={editInput} />
            </FormField>
            <div style={{ gridColumn: 'span 2' }}>
              <FormField label="Método">
                <input value={form.paymentMethod || ''} onChange={(e) => set('paymentMethod', e.target.value)} style={editInput} />
              </FormField>
            </div>
          </div>
        )}

        {err && <div style={{ fontSize: 13, color: 'var(--c-danger)', fontWeight: 500 }}>⚠ {err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Btn variant="secondary" onClick={onClose} type="button">Cancelar</Btn>
          <Btn variant="primary" icon="check" type="submit" disabled={saving}>{saving ? 'Salvando…' : isNew ? 'Criar' : 'Salvar alterações'}</Btn>
        </div>
      </form>
    </div>
  );
};
const editInput = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--line)', background: 'var(--bg-alt)',
  fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
};

const RowActions = ({ onEdit, onDelete }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
    <button onClick={onEdit} title="Editar" style={rowActionBtn('var(--c-secondary)')}>
      <Icon name="edit" size={14} stroke={2.2} />
    </button>
    <button onClick={onDelete} title="Excluir" style={rowActionBtn('var(--c-danger)')}>
      <Icon name="trash" size={14} stroke={2.2} />
    </button>
  </div>
);
const rowActionBtn = (color) => ({
  width: 30, height: 30, borderRadius: 9,
  background: `color-mix(in oklch, ${color} 10%, transparent)`,
  color, display: 'grid', placeItems: 'center',
  transition: 'all 0.2s',
});

// ─── MODAL CONFIRMAR PAGAMENTO ────────────────────────────────────────────
const ConfirmarPagamentoModal = ({ conta, onClose, onSaved }) => {
  const isReceber = conta.tipo === 'receber';
  const [valorReal, setValorReal] = React.useState(conta.previsto || 0);
  const [dataReal, setDataReal] = React.useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const confirmar = async (e) => {
    e?.preventDefault();
    setSaving(true); setErr('');
    try {
      const patch = {
        pago: true,
        realizado: Number(valorReal),
        pagoEm: dataReal,
      };
      await window.updateContaLocal(conta.id, patch);
      onSaved?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const diff = Number(valorReal) - conta.previsto;
  const diffColor = isReceber
    ? (diff >= 0 ? 'var(--c-pos)' : 'var(--c-neg)')
    : (diff <= 0 ? 'var(--c-pos)' : 'var(--c-neg)');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1600,
      background: 'oklch(0 0 0 / 0.45)', backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: 30,
      animation: 'fadeIn 0.2s ease both',
    }} onClick={onClose}>
      <form onSubmit={confirmar} onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--surface-solid)', borderRadius: 'var(--r-lg)', padding: 32,
        width: 'min(480px, 100%)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: 20,
        animation: 'popIn 0.3s cubic-bezier(.22,1,.36,1) both',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: isReceber ? 'color-mix(in oklch, var(--c-primary) 15%, transparent)' : 'color-mix(in oklch, var(--c-warning) 15%, transparent)',
              color: isReceber ? 'var(--c-primary)' : 'var(--c-warning)',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name="check" size={22} stroke={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>
                Confirmar {isReceber ? 'recebimento' : 'pagamento'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{conta.description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--bg-alt)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', color: 'var(--ink-soft)', cursor: 'pointer',
          }}>
            <Icon name="x" size={15} stroke={2.4} />
          </button>
        </div>

        {/* Info da conta */}
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--r-sm)',
          background: 'var(--bg-alt)', border: '1px solid var(--line)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categoria</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>{conta.category}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vencimento</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>{window.fmtDate(conta.vencimento)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valor previsto</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }} className="mono">{window.fmt(conta.previsto)}</div>
          </div>
          {diff !== 0 && Number(valorReal) > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Diferença</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: diffColor, marginTop: 4 }} className="mono">
                {diff > 0 ? '+' : ''}{window.fmt(diff)}
              </div>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label={isReceber ? 'Valor recebido (R$)' : 'Valor pago (R$)'}>
            <input
              type="number" step="0.01" min="0"
              value={valorReal}
              onChange={(e) => setValorReal(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: '1.5px solid var(--c-primary)', background: 'var(--bg-alt)',
                fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
                textAlign: 'right',
              }}
            />
          </FormField>
          <FormField label="Data de liquidação">
            <input
              type="date"
              value={dataReal}
              onChange={(e) => setDataReal(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: '1.5px solid var(--line)', background: 'var(--bg-alt)',
                fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
              }}
            />
          </FormField>
        </div>

        {err && <div style={{ fontSize: 13, color: 'var(--c-danger)', fontWeight: 500 }}>⚠ {err}</div>}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn variant="secondary" onClick={onClose} type="button">Cancelar</Btn>
          <Btn variant="primary" icon="check" type="submit" disabled={saving || !valorReal}>
            {saving ? 'Salvando…' : isReceber ? '✓ Confirmar recebimento' : '✓ Confirmar pagamento'}
          </Btn>
        </div>
      </form>
    </div>
  );
};

// ─── PÁGINA CONTAS (a pagar / a receber — previsto × realizado) ──────

// ═══════════════════════════════════════════════════════════════
// PÁGINA DE IMPOSTOS
// ═══════════════════════════════════════════════════════════════

const ImpostosPage = ({ filter, setFilter }) => {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id;
  const [impostos, setImpostos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('pendente');
  const [q, setQ] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editando, setEditando] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  // Categorias fiscais aceitas
  const CATS = ['INSS','ISS','DARF','IRPJ','CSLL','DARF Aluguel','Outros Tributos'];

  // Carregar impostos do banco — apenas categoria fiscal
  const carregar = React.useCallback(async () => {
    if (!companyId) { setLoading(false); setImpostos([]); return; }
    setLoading(true);
    try {
      const todas = await window.fetchContas(companyId);
      const fiscais = todas.filter(c =>
        c.tipo === 'pagar' &&
        CATS.some(cat => (c.category || '').toLowerCase() === cat.toLowerCase())
      );
      fiscais.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
      setImpostos(fiscais);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [companyId]);

  React.useEffect(() => { carregar(); }, [carregar]);

  const today = new Date().toISOString().slice(0, 10);
  const fmtMoeda = v => 'R$\u00a0' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtDate  = d => d ? d.split('-').reverse().join('/') : '—';

  const isAtrasado = c => !c.pago && c.vencimento < today;
  const isHoje     = c => !c.pago && c.vencimento === today;

  const statusPill = c => {
    if (c.pago)        return { label: 'Pago',       bg: 'var(--c-pos-soft)',  color: 'var(--c-pos)' };
    if (isAtrasado(c)) return { label: 'Atrasado',   bg: 'var(--c-neg-soft)',  color: 'var(--c-neg)' };
    if (isHoje(c))     return { label: 'Vence hoje', bg: 'var(--c-warn-soft)', color: 'var(--c-warn)' };
    return               { label: 'Pendente',    bg: 'var(--bg-alt)',      color: 'var(--ink-soft)' };
  };

  const catColor = cat => ({
    'INSS': 'var(--g-9)', 'ISS': 'var(--g-7)', 'DARF': 'var(--g-6)',
    'IRPJ': 'var(--g-8)', 'CSLL': 'var(--g-5)', 'DARF Aluguel': 'var(--g-6)',
  })[cat] || 'var(--g-6)';

  const filtered = impostos.filter(c => {
    if (statusFilter === 'pendente' && c.pago) return false;
    if (statusFilter === 'pago' && !c.pago) return false;
    if (q && !(c.description.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  // KPIs
  const totalPendente = impostos.filter(c => !c.pago).reduce((s,c) => s+(c.previsto||0), 0);
  const totalPago     = impostos.filter(c =>  c.pago).reduce((s,c) => s+(c.realizado||c.previsto||0), 0);
  const atrasados     = impostos.filter(c => isAtrasado(c)).length;
  const venceHoje     = impostos.filter(c => isHoje(c)).length;

  // Marcar pago/desmarcar
  const marcarPago = async (imp) => {
    try {
      await window.updateConta(imp.id, {
        status: 'pago',
        actual_value: imp.previsto,
        settled_at: today,
      });
      await carregar();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  const desmarcarPago = async (imp) => {
    try {
      await window.updateConta(imp.id, { status: 'pendente', actual_value: null, settled_at: null });
      await carregar();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  const excluir = async (id) => {
    try {
      await window.deleteConta(id);
      setConfirmDelete(null);
      await carregar();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  // Modal de criação/edição
  const ModalImposto = ({ imp, onClose }) => {
    const isNew = !imp?.id;
    const [form, setForm] = React.useState({
      description: imp?.description || '',
      category: imp?.category || 'DARF',
      vencimento: imp?.vencimento || '',
      previsto: imp?.previsto || '',
      pago: imp?.pago || false,
      realizado: imp?.realizado || '',
    });
    const [saving, setSaving] = React.useState(false);
    const set = (k, v) => setForm(f => ({...f, [k]: v}));
    const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
    const lbl = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', marginBottom: 5 };

    const save = async () => {
      if (!form.description.trim() || !form.vencimento || !form.previsto) {
        alert('Preencha descrição, vencimento e valor.'); return;
      }
      setSaving(true);
      try {
        const payload = {
          description: form.description.trim(),
          category: form.category,
          tipo: 'pagar',
          vencimento: form.vencimento,
          previsto: parseFloat(String(form.previsto).replace(',','.')),
          pago: form.pago,
          realizado: form.pago ? parseFloat(String(form.realizado||form.previsto).replace(',','.')) : null,
        };
        if (isNew) {
          await window.createConta(payload, companyId, user?.id);
        } else {
          await window.updateConta(imp.id, {
            description: payload.description,
            category: payload.category,
            value: payload.previsto,
            date: payload.vencimento,
            status: payload.pago ? 'pago' : 'pendente',
            actual_value: payload.pago ? payload.realizado : null,
          });
        }
        await carregar();
        onClose();
      } catch(e) { alert('Erro ao salvar: ' + e.message); }
      finally { setSaving(false); }
    };

    return (
      <div style={{ position:'fixed', inset:0, zIndex:1000, background:'oklch(0 0 0 / 0.45)', backdropFilter:'blur(4px)', display:'grid', placeItems:'center', padding:24 }}>
        <div style={{ background:'var(--surface-solid)', borderRadius:'var(--r-lg)', padding:28, width:'min(520px,100%)', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', border:'1px solid var(--line)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
            <h3 style={{ margin:0, fontSize:18 }}>{isNew ? 'Novo imposto' : 'Editar imposto'}</h3>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink-soft)' }}>✕</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Descrição</label>
              <input value={form.description} onChange={e=>set('description',e.target.value)} style={inp} placeholder="Ex: DARF COFINS Mai/2026" autoFocus />
            </div>
            <div>
              <label style={lbl}>Categoria</label>
              <select value={form.category} onChange={e=>set('category',e.target.value)} style={inp}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Vencimento</label>
              <input type="date" value={form.vencimento} onChange={e=>set('vencimento',e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Valor previsto (R$)</label>
              <input value={form.previsto} onChange={e=>set('previsto',e.target.value)} style={inp} placeholder="0,00" />
            </div>
            <div>
              <label style={lbl}>Situação</label>
              <select value={form.pago ? 'pago' : 'pendente'} onChange={e=>set('pago', e.target.value==='pago')} style={inp}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            {form.pago && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Valor pago (R$)</label>
                <input value={form.realizado} onChange={e=>set('realizado',e.target.value)} style={inp} placeholder={String(form.previsto || '0,00')} />
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
            <button onClick={onClose} style={{ padding:'10px 20px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-soft)', cursor:'pointer', fontSize:14 }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ padding:'10px 24px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-ink)', fontWeight:700, cursor:'pointer', fontSize:14, opacity: saving?0.7:1 }}>
              {saving ? 'Salvando...' : isNew ? '+ Adicionar' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="anim-fade" style={{ display:'flex', flexDirection:'column', gap:22 }}>

      {/* Modal */}
      {(showModal || editando) && (
        <ModalImposto imp={editando} onClose={() => { setShowModal(false); setEditando(null); }} />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'oklch(0 0 0 / 0.45)', backdropFilter:'blur(4px)', display:'grid', placeItems:'center', padding:24 }}>
          <div style={{ background:'var(--surface-solid)', borderRadius:'var(--r-lg)', padding:28, width:'min(420px,100%)', border:'1px solid color-mix(in oklch, var(--c-neg) 40%, transparent)' }}>
            <h3 style={{ margin:'0 0 10px' }}>Excluir imposto?</h3>
            <p style={{ margin:'0 0 22px', color:'var(--ink-soft)', fontSize:14 }}>
              <strong>{confirmDelete.description}</strong> será removido permanentemente.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding:'10px 18px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-soft)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={() => excluir(confirmDelete.id)} style={{ padding:'10px 20px', borderRadius:8, border:'none', background:'var(--c-neg)', color:'var(--surface-solid)', fontWeight:700, cursor:'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ margin:0, fontSize:26, fontWeight:700 }}>Impostos</h2>
          <div style={{ fontSize:13, color:'var(--ink-soft)', marginTop:2 }}>INSS · ISS · DARF · IRPJ · CSLL · 100% banco de dados</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..."
            style={{ padding:'9px 14px', borderRadius:8, border:'1px solid var(--line)', background:'var(--surface)', color:'var(--ink)', fontSize:13, outline:'none', width:180 }} />
          <button onClick={() => { setEditando(null); setShowModal(true); }}
            style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-ink)', fontWeight:700, fontSize:13, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
            + Novo imposto
          </button>
        </div>
      </div>

      {/* KPIs */}
      {!loading && (
        <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
          {[
            { label:'Total pendente',  value: fmtMoeda(totalPendente), sub: impostos.filter(c=>!c.pago).length + ' obrigações', color:'var(--c-neg)' },
            { label:'Total pago (ano)', value: fmtMoeda(totalPago),    sub: impostos.filter(c=>c.pago).length + ' quitados',   color:'var(--c-pos)' },
            atrasados > 0 && { label:'Atrasados', value: atrasados + (atrasados===1?' obrigação':' obrigações'), sub:'Requer atenção!', color:'var(--c-neg)' },
            venceHoje > 0 && { label:'Vence hoje', value: venceHoje + (venceHoje===1?' imposto':' impostos'), sub:'Pague hoje!', color:'var(--c-warn)' },
          ].filter(Boolean).map(kpi => (
            <div key={kpi.label} className="glass" style={{ borderRadius:'var(--r-md)', padding:'18px 22px', flex:1, minWidth:160, borderTop:'3px solid '+kpi.color }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-soft)', marginBottom:6 }}>{kpi.label}</div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--ink)' }}>{kpi.value}</div>
              <div style={{ fontSize:12, color:'var(--ink-soft)', marginTop:4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {[['pendente','Pendentes'],['pago','Pagos'],['todos','Todos']].map(([k,l]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            style={{ padding:'7px 18px', borderRadius:20, border:'1px solid var(--line)', background: statusFilter===k ? 'var(--accent)' : 'var(--surface)', color: statusFilter===k ? 'var(--accent-ink)' : 'var(--ink-soft)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            {l}
          </button>
        ))}
        <span style={{ marginLeft:8, fontSize:13, color:'var(--ink-soft)' }}>{filtered.length} {filtered.length===1?'item':'itens'}</span>
      </div>

      {/* Tabela */}
      <div className="glass" style={{ borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--ink-soft)' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:56, textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>{impostos.length === 0 ? '📋' : '✅'}</div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--ink)' }}>
              {impostos.length === 0 ? 'Nenhum imposto cadastrado' : 'Nenhum imposto pendente'}
            </div>
            <div style={{ fontSize:13, color:'var(--ink-soft)', marginTop:6 }}>
              {impostos.length === 0 ? 'Clique em "+ Novo imposto" para começar.' : 'Todas as obrigações estão em dia!'}
            </div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--line)', background:'var(--surface)' }}>
                {['Descrição','Categoria','Vencimento','Valor previsto','Valor pago','Status','Ações'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(imp => {
                const pill = statusPill(imp);
                return (
                  <tr key={imp.id} style={{ borderBottom:'1px solid var(--line)', background: isAtrasado(imp)?'color-mix(in oklch, var(--c-neg) 5%, transparent)':'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--hover,rgba(0,0,0,0.02))'}
                    onMouseLeave={e => e.currentTarget.style.background = isAtrasado(imp)?'color-mix(in oklch, var(--c-neg) 5%, transparent)':'transparent'}>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{imp.description}</div>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:6, background:`color-mix(in oklch, ${catColor(imp.category)} 10%, transparent)`, border:'1px solid '+`color-mix(in oklch, ${catColor(imp.category)} 22%, transparent)`, color:catColor(imp.category), fontSize:12, fontWeight:600 }}>
                        {imp.category}
                      </span>
                    </td>
                    <td style={{ padding:'13px 16px', fontFamily:'monospace', fontSize:13, color: isAtrasado(imp)?'var(--c-neg)':'var(--ink)', fontWeight: isAtrasado(imp)?700:400 }}>
                      {fmtDate(imp.vencimento)}
                    </td>
                    <td style={{ padding:'13px 16px', fontFamily:'monospace', fontWeight:600 }}>{fmtMoeda(imp.previsto)}</td>
                    <td style={{ padding:'13px 16px', fontFamily:'monospace', color: imp.pago?'var(--c-pos)':'var(--ink-soft)' }}>
                      {imp.pago ? fmtMoeda(imp.realizado||imp.previsto) : '—'}
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:6, background:pill.bg, color:pill.color, fontSize:12, fontWeight:700 }}>
                        {pill.label}
                      </span>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {!imp.pago ? (
                          <button onClick={() => marcarPago(imp)}
                            style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'var(--c-pos)', color:'var(--surface-solid)', fontWeight:600, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
                            ✓ Pagar
                          </button>
                        ) : (
                          <button onClick={() => desmarcarPago(imp)}
                            style={{ padding:'5px 12px', borderRadius:7, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-soft)', fontSize:12, cursor:'pointer' }}>
                            Desfazer
                          </button>
                        )}
                        <button onClick={() => setEditando(imp)}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-soft)', fontSize:12, cursor:'pointer' }}>✏</button>
                        <button onClick={() => setConfirmDelete(imp)}
                          style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'transparent', color:'var(--c-neg)', fontSize:14, cursor:'pointer' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'2px solid var(--line)' }}>
                <td colSpan={3} style={{ padding:'13px 16px', fontWeight:700, fontSize:13 }}>Total ({filtered.length} {filtered.length===1?'item':'itens'})</td>
                <td style={{ padding:'13px 16px', fontFamily:'monospace', fontWeight:700 }}>{fmtMoeda(filtered.reduce((s,c)=>s+(c.previsto||0),0))}</td>
                <td style={{ padding:'13px 16px', fontFamily:'monospace', fontWeight:700, color:'var(--c-pos)' }}>{fmtMoeda(filtered.filter(c=>c.pago).reduce((s,c)=>s+(c.realizado||c.previsto||0),0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};



// ═══════════════════════════════════════════════════════
// REPLICAR PRESTADORES — detecta do banco e replica meses
// ═══════════════════════════════════════════════════════
const ReplicarPrestadoresModal = ({ onClose }) => {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id;

  const [step, setStep]             = React.useState('selecionar'); // selecionar | meses | confirmando | done
  const [todasContas, setTodasContas] = React.useState([]);
  const [loading, setLoading]       = React.useState(true);
  const [selecionados, setSelecionados] = React.useState(new Set());
  const [mesesSel, setMesesSel]     = React.useState(new Set());
  const [diaVenc, setDiaVenc]       = React.useState(20);
  const [progresso, setProgresso]   = React.useState('');
  const [erro, setErro]             = React.useState('');

  const fmt = v => 'R$ ' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Carregar todas as contas e detectar prestadores
  React.useEffect(() => {
    if (!companyId) return;
    window.fetchContas(companyId).then(contas => {
      setTodasContas(contas);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [companyId]);

  // Detectar prestadores únicos (categoria "Profissionais / Prestadores" ou REPASSE no nome)
  const prestadores = React.useMemo(() => {
    const isPrestador = c =>
      (c.category || '').toLowerCase().includes('prestador') ||
      (c.category || '').toLowerCase().includes('profissional') ||
      (c.description || '').toUpperCase().includes('REPASSE');

    const map = {};
    todasContas.filter(isPrestador).forEach(c => {
      const key = c.description.trim().toUpperCase();
      if (!map[key] || new Date(c.vencimento) > new Date(map[key].vencimento)) {
        map[key] = c; // guardar a mais recente
      }
    });
    return Object.values(map).sort((a, b) => a.description.localeCompare(b.description));
  }, [todasContas]);

  // Gerar próximos 12 meses a partir de hoje
  const meses = React.useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      return {
        key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      };
    });
  }, []);

  const togglePrestador = id => {
    setSelecionados(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleMes = key => {
    setMesesSel(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const totalGerar = selecionados.size * mesesSel.size;

  const replicar = async () => {
    setStep('confirmando');
    setErro('');
    const lista = prestadores.filter(p => selecionados.has(p.id));
    const mesesArr = [...mesesSel].sort();
    let criados = 0;

    for (const mes of mesesArr) {
      const [y, m] = mes.split('-').map(Number);
      const vencimento = `${y}-${String(m).padStart(2,'0')}-${String(diaVenc).padStart(2,'0')}`;
      for (const p of lista) {
        try {
          await window.createConta({
            description: p.description,
            category: p.category,
            tipo: 'pagar',
            previsto: p.previsto,
            vencimento,
            pago: false,
          }, companyId, user?.id);
          criados++;
          setProgresso(`Criando... ${criados}/${totalGerar}`);
        } catch(e) {
          setErro('Erro em ' + p.description + ': ' + e.message);
        }
      }
    }

    // Recarregar dados
    const novas = await window.fetchContas(companyId).catch(() => []);
    if (novas.length) window.CONTAS = novas;
    window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
    setStep('done');
    setProgresso(`${criados} contas criadas com sucesso!`);
  };

  const inp = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, outline: 'none' };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'oklch(0 0 0 / 0.45)', backdropFilter:'blur(4px)', display:'grid', placeItems:'center', padding:24 }}>
      <div style={{ background:'var(--surface-solid)', borderRadius:'var(--r-lg)', width:'min(680px,100%)', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', border:'1px solid var(--line)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:17 }}>Replicar Prestadores</div>
            <div style={{ fontSize:13, color:'var(--ink-soft)', marginTop:2 }}>
              {step === 'selecionar' && 'Selecione os prestadores para replicar'}
              {step === 'meses'     && 'Escolha os meses e dia de vencimento'}
              {(step === 'confirmando' || step === 'done') && progresso}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink-soft)', lineHeight:1 }}>✕</button>
        </div>

        {/* Conteúdo */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* STEP 1: selecionar prestadores */}
          {step === 'selecionar' && (
            <div>
              {loading ? (
                <div style={{ textAlign:'center', padding:40, color:'var(--ink-soft)' }}>A carregar prestadores...</div>
              ) : prestadores.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:'var(--ink-soft)' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
                  <div style={{ fontWeight:700 }}>Nenhum prestador encontrado</div>
                  <div style={{ fontSize:13, marginTop:6 }}>Contas com categoria "Profissionais/Prestadores" ou "REPASSE" no nome aparecem aqui.</div>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <span style={{ fontSize:13, color:'var(--ink-soft)' }}>{prestadores.length} prestadores encontrados</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setSelecionados(new Set(prestadores.map(p=>p.id)))}
                        style={{ ...inp, cursor:'pointer', fontSize:12 }}>Selecionar todos</button>
                      <button onClick={() => setSelecionados(new Set())}
                        style={{ ...inp, cursor:'pointer', fontSize:12 }}>Limpar</button>
                    </div>
                  </div>
                  <div style={{ border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
                    {prestadores.map((p, i) => (
                      <div key={p.id} onClick={() => togglePrestador(p.id)}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < prestadores.length-1 ? '1px solid var(--line)' : 'none', cursor:'pointer', background: selecionados.has(p.id) ? 'var(--bg-alt)' : 'transparent' }}>
                        <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${selecionados.has(p.id) ? 'var(--accent)' : 'var(--line)'}`, background: selecionados.has(p.id) ? 'var(--accent)' : 'transparent', display:'grid', placeItems:'center', flexShrink:0 }}>
                          {selecionados.has(p.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>{p.description}</div>
                          <div style={{ fontSize:12, color:'var(--ink-soft)' }}>{p.category}</div>
                        </div>
                        <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:14 }}>{fmt(p.previsto)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: meses */}
          {step === 'meses' && (
            <div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Dia de vencimento</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input type="number" min={1} max={31} value={diaVenc} onChange={e => setDiaVenc(Number(e.target.value))}
                    style={{ ...inp, width:80, textAlign:'center', fontSize:16, fontWeight:700 }} />
                  <span style={{ fontSize:13, color:'var(--ink-soft)' }}>de cada mês</span>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>
                Selecione os meses
                <button onClick={() => setMesesSel(new Set(meses.map(m=>m.key)))}
                  style={{ marginLeft:12, ...inp, fontSize:12, cursor:'pointer' }}>Todos</button>
                <button onClick={() => setMesesSel(new Set())}
                  style={{ marginLeft:6, ...inp, fontSize:12, cursor:'pointer' }}>Limpar</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {meses.map(mes => (
                  <div key={mes.key} onClick={() => toggleMes(mes.key)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, border:`1px solid ${mesesSel.has(mes.key) ? 'var(--accent)' : 'var(--line)'}`, cursor:'pointer', background: mesesSel.has(mes.key) ? 'var(--bg-alt)' : 'transparent' }}>
                    <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${mesesSel.has(mes.key) ? 'var(--accent)' : 'var(--line)'}`, background: mesesSel.has(mes.key) ? 'var(--accent)' : 'transparent', display:'grid', placeItems:'center', flexShrink:0 }}>
                      {mesesSel.has(mes.key) && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize:13, fontWeight:500, textTransform:'capitalize' }}>{mes.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP confirmando/done */}
          {(step === 'confirmando' || step === 'done') && (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              {step === 'confirmando' && (
                <div style={{ width:52, height:52, border:'5px solid var(--line)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 20px' }} />
              )}
              {step === 'done' && <div style={{ fontSize:48, marginBottom:16 }}>✅</div>}
              <div style={{ fontSize:16, fontWeight:700, color: step==='done' ? 'var(--c-pos)' : 'var(--ink)' }}>{progresso}</div>
              {erro && <div style={{ marginTop:12, fontSize:13, color:'var(--c-danger)', background:'var(--c-neg-soft)', padding:'10px 16px', borderRadius:8 }}>{erro}</div>}
              {step === 'done' && (
                <div style={{ fontSize:13, color:'var(--ink-soft)', marginTop:8 }}>
                  {selecionados.size} prestadores × {mesesSel.size} meses = {totalGerar} contas
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, color:'var(--ink-soft)' }}>
            {step === 'selecionar' && `${selecionados.size} selecionados`}
            {step === 'meses' && `${mesesSel.size} meses · ${totalGerar} contas a criar`}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {step === 'done' ? (
              <button onClick={onClose} style={{ padding:'10px 24px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-ink)', fontWeight:700, cursor:'pointer' }}>Fechar</button>
            ) : step === 'selecionar' ? (
              <>
                <button onClick={onClose} style={{ padding:'10px 18px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-soft)', cursor:'pointer' }}>Cancelar</button>
                <button onClick={() => setStep('meses')} disabled={selecionados.size === 0}
                  style={{ padding:'10px 24px', borderRadius:8, border:'none', background: selecionados.size > 0 ? 'var(--accent)' : 'var(--line)', color:'var(--accent-ink)', fontWeight:700, cursor: selecionados.size > 0 ? 'pointer' : 'not-allowed' }}>
                  Próximo →
                </button>
              </>
            ) : step === 'meses' ? (
              <>
                <button onClick={() => setStep('selecionar')} style={{ padding:'10px 18px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-soft)', cursor:'pointer' }}>← Voltar</button>
                <button onClick={replicar} disabled={mesesSel.size === 0}
                  style={{ padding:'10px 24px', borderRadius:8, border:'none', background: mesesSel.size > 0 ? 'var(--accent)' : 'var(--line)', color:'var(--accent-ink)', fontWeight:700, cursor: mesesSel.size > 0 ? 'pointer' : 'not-allowed' }}>
                  ✓ Criar {totalGerar} contas
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};


const ContasPage = ({ filter, setFilter }) => {
  const [editing, setEditing] = React.useState(null);
  const [confirmando, setConfirmando] = React.useState(null); // conta sendo confirmada
  const [showReplicar, setShowReplicar] = React.useState(false);
  const [, tick] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => tick();
    window.addEventListener('sb-data-hydrated', h);
    return () => window.removeEventListener('sb-data-hydrated', h);
  }, []);
  const [tab, setTab] = React.useState('todos'); // todos | pagar | receber
  const [status, setStatus] = React.useState('all'); // all | pago | recebido
  const [q, setQ] = React.useState('');
  const contas = window.filterContas(filter.mode === 'month' ? { month: filter.month } : { from: filter.from, to: filter.to });
  const filtered = contas.filter(c => {
    // Aba "A pagar" → só saídas NÃO pagas
    if (tab === 'pagar' && (c.tipo !== 'pagar' || c.pago)) return false;
    // Aba "A receber" → só entradas NÃO recebidas
    if (tab === 'receber' && (c.tipo !== 'receber' || c.pago)) return false;
    // Aba "Todos" com filtro de status
    if (tab === 'todos') {
      if (status === 'pago'     && !(c.pago && c.tipo === 'pagar'))   return false;
      if (status === 'recebido' && !(c.pago && c.tipo === 'receber')) return false;
    }
    if (q && !(c.description.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  // Entradas e saídas separadas
  const entradas = filtered.filter(c => c.tipo === 'receber');
  const saidas   = filtered.filter(c => c.tipo === 'pagar');
  const tot_prev_in  = entradas.reduce((s, c) => s + c.previsto, 0);
  const tot_prev_out = saidas.reduce((s, c) => s + c.previsto, 0);
  const tot_real_in  = entradas.reduce((s, c) => s + (c.pago ? (c.realizado || c.previsto) : 0), 0);
  const tot_real_out = saidas.reduce((s, c) => s + (c.pago ? (c.realizado || c.previsto) : 0), 0);
  const tot_pend = filtered.filter(c => !c.pago).reduce((s, c) => s + c.previsto, 0);
  // Mantém compat com código abaixo
  const tot_prev = tot_prev_in + tot_prev_out;
  const tot_real = tot_real_in + tot_real_out;

  // Saldo restante do mês anterior — entra como linha na tabela
  const saldo_ant = filter.mode === 'month'
    ? window.saldoAnterior(filter.month)
    : (filter.from ? window.saldoAnterior(filter.from.slice(0, 7)) : 0);
  // Mês anterior para exibir no label
  const mesAntLabel = (() => {
    const ref = filter.mode === 'month' ? filter.month : (filter.from || '').slice(0, 7);
    if (!ref) return 'mês anterior';
    const [y, m] = ref.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    return (window.months || [])[prev.getMonth()] + '/' + String(prev.getFullYear()).slice(2);
  })();

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showReplicar && <ReplicarPrestadoresModal onClose={() => setShowReplicar(false)} />}
      <PageHeader title="Contas"
        subtitle="Controle de contas a pagar e a receber — previsto × realizado"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExcelImporter target="contas" />
            <Btn variant="secondary" icon="copy" onClick={() => setShowReplicar(true)}>Replicar prestadores</Btn>
            <Btn variant="primary" icon="plus" onClick={() => setEditing({tipo:'pagar', pago:false, previsto:0, realizado:0})}>Nova conta</Btn>
          </div>
        } />

      <FilterBar filter={filter} setFilter={setFilter} />

      {/* KPIs: Saldo anterior + Entradas e Saídas separadas + Saldo do período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <KPI label="Saldo anterior"  value={saldo_ant}    color="var(--ink-soft)" icon="arrow_right" subtle />
        <KPI label="Prev. Entradas"  value={tot_prev_in}  color="var(--c-pos)" icon="arrow_down" />
        <KPI label="Real. Entradas"  value={tot_real_in + (saldo_ant > 0 ? saldo_ant : 0)} color="var(--c-pos)" icon="check" />
        <KPI label="Prev. Saídas"    value={tot_prev_out} color="var(--c-neg)" icon="arrow_up" />
        <KPI label="Real. Saídas"    value={tot_real_out} color="var(--c-neg)" icon="check" />
        <KPI label="Saldo do período" value={tot_real_in + (saldo_ant > 0 ? saldo_ant : 0) - tot_real_out} color={(tot_real_in + (saldo_ant > 0 ? saldo_ant : 0) - tot_real_out) >= 0 ? 'var(--c-pos)' : 'var(--c-neg)'} icon="wallet" emphasis />
      </div>

      <TiltCard interactive={false} padding={20}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tab todos / a pagar / a receber */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-alt)', padding: 4, borderRadius: 999, border: '1px solid var(--line)' }}>
            <button onClick={() => setTab('todos')} style={tabBtnStyle(tab === 'todos')}>Todos</button>
            <button onClick={() => setTab('pagar')} style={tabBtnStyle(tab === 'pagar')}>A pagar</button>
            <button onClick={() => setTab('receber')} style={tabBtnStyle(tab === 'receber')}>A receber</button>
          </div>
          {/* Status */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-alt)', padding: 4, borderRadius: 999, border: '1px solid var(--line)' }}>
            {[{k:'all',l:'Todos'},{k:'pago',l:'Pagos'},{k:'recebido',l:'Recebidos'}].map(t => (
              <button key={t.k} onClick={() => setStatus(t.k)} style={tabBtnStyle(status === t.k)}>{t.l}</button>
            ))}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200,
            background: 'var(--bg-alt)', border: '1.5px solid var(--line)', borderRadius: 999, padding: '10px 18px',
          }}>
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..."
              style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit' }} />
          </div>
        </div>
      </TiltCard>

      <TiltCard interactive={false} padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ maxHeight: '56vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Vencimento', 'Descrição', 'Categoria', 'Previsto', 'Realizado', 'Status', ''].map((h, i) => (
                  <th key={i + h} style={{
                    textAlign: i === 3 || i === 4 ? 'right' : (i === 6 ? 'right' : 'left'),
                    padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                    color: 'var(--ink-mute)', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Linha especial: Saldo Anterior */}
              {saldo_ant !== 0 && (tab === 'todos' || tab === 'receber') && (
                <tr style={{ borderBottom: '2px solid var(--line-strong)', background: 'var(--bg-alt)' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-soft)' }} className="mono">—</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: 'var(--c-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'color-mix(in oklch, var(--c-secondary) 18%, transparent)', color: 'var(--c-secondary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name="arrow_right" size={14} stroke={2.4} />
                      </div>
                      Saldo anterior ({mesAntLabel})
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}><Pill color="var(--c-secondary)" size="sm">Saldo</Pill></td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: 'var(--ink-mute)' }} className="mono">—</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }} className="mono">
                    <div style={{ fontSize: 14, fontWeight: 700, color: saldo_ant >= 0 ? 'var(--c-pos)' : 'var(--c-neg)' }}>
                      {window.fmt(saldo_ant)}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <Pill color="var(--c-secondary)" size="sm">✓ Transitado</Pill>
                  </td>
                  <td></td>
                </tr>
              )}
              {filtered.map((c, i) => {
                const color = window.catColor(c.category, tab === 'pagar' ? 'saida' : 'entrada');
                const diff = c.realizado - c.previsto;
                return (
                  <tr key={c.id} style={{
                    borderBottom: '1px solid var(--line)',
                    animation: `fadeIn 0.3s ease ${Math.min(i * 0.02, 0.6)}s both`,
                  }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-soft)' }} className="mono">{window.fmtDate(c.vencimento)}</td>
                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `color-mix(in oklch, ${color} 18%, transparent)`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Icon name={tab === 'receber' ? 'arrow_down' : 'arrow_up'} size={14} stroke={2.4} />
                        </div>
                        {c.description}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}><Pill color={color}>{c.category}</Pill></td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: 'var(--ink-soft)' }} className="mono">{window.fmt(c.previsto)}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }} className="mono">
                      {c.pago ? (
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: c.tipo === 'pagar' ? 'var(--c-neg)' : 'var(--c-pos)' }}>{window.fmt(c.realizado)}</div>
                          <div style={{ fontSize: 10, color: diff === 0 ? 'var(--ink-mute)' : (tab === 'pagar' ? (diff < 0 ? 'var(--c-pos)' : 'var(--c-neg)') : (diff > 0 ? 'var(--c-pos)' : 'var(--c-neg)')) }}>
                            {diff >= 0 ? '+' : ''}{window.fmtShort(diff)}
                          </div>
                        </div>
                      ) : <span style={{ color: 'var(--ink-mute)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <Pill color={c.pago ? 'var(--c-pos)' : 'var(--c-warn)'} size="sm">
                        {c.pago ? '✓ ' + (c.tipo === 'pagar' ? 'Pago' : 'Recebido') : '⏳ Pendente'}
                      </Pill>
                    </td>
                    <td style={{ padding: '14px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* Botão confirmar pagamento — só para pendentes */}
                        {!c.pago && (
                          <button
                            onClick={() => setConfirmando(c)}
                            title={c.tipo === 'receber' ? 'Confirmar recebimento' : 'Confirmar pagamento'}
                            style={{
                              width: 30, height: 30, borderRadius: 9,
                              background: 'var(--c-pos-soft)',
                              color: 'var(--c-pos)',
                              display: 'grid', placeItems: 'center',
                              transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in oklch, var(--c-pos) 18%, transparent)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--c-pos-soft)'}
                          >
                            <Icon name="check" size={14} stroke={2.5} />
                          </button>
                        )}
                        <RowActions
                          onEdit={() => setEditing(c)}
                          onDelete={() => { if (confirm(`Excluir "${c.description}"?`)) window.deleteContaLocal(c.id); }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)' }}>Nenhuma conta encontrada para o filtro.</div>
          )}
        </div>
      </TiltCard>
      {editing && <EditModal kind="conta" record={editing} onClose={() => setEditing(null)} onSaved={() => tick()} />}
      {confirmando && <ConfirmarPagamentoModal conta={confirmando} onClose={() => setConfirmando(null)} onSaved={() => { setConfirmando(null); tick(); }} />}
    </div>
  );
};

// ─── PÁGINA COMPRAS (caixa efetivo — lançamentos) ─────────────────
const ComprasPage = ({ filter, setFilter }) => {
  const [editing, setEditing] = React.useState(null);
  const [filterType, setFilterType] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [, tick] = React.useReducer(x => x + 1, 0); // re-render após import/edit
  React.useEffect(() => {
    const h = () => tick();
    window.addEventListener('sb-data-hydrated', h);
    return () => window.removeEventListener('sb-data-hydrated', h);
  }, []);
  const compras = window.filterCompras(filter.mode === 'month' ? { month: filter.month } : { from: filter.from, to: filter.to });

  const filtered = compras.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (q && !(t.description.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const total_in = compras.filter(c => c.type === 'entrada').reduce((s, c) => s + c.amount, 0);
  const total_out = compras.filter(c => c.type === 'saida').reduce((s, c) => s + c.amount, 0);
  const saldo_ant = filter.mode === 'month' ? window.saldoAnterior(filter.month) : (filter.from ? window.saldoAnterior(filter.from.slice(0, 7)) : 0);
  const saldo = total_in - total_out;

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Compras"
        subtitle="Lançamentos efetivos do caixa — o que entrou e saiu de verdade"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExcelImporter onImport={() => tick()} />
            <Btn variant="primary" icon="plus" onClick={() => setEditing({type:'saida', amount:0})}>Nova compra</Btn>
          </div>
        } />

      <FilterBar filter={filter} setFilter={setFilter} />

      {/* KPI row — saldo anterior + entradas + saídas + saldo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        <KPI label="Saldo anterior" value={saldo_ant} color="var(--ink-soft)" icon="arrow_right" subtle />
        <KPI label="Entradas" value={total_in} color="var(--c-pos)" icon="arrow_down" />
        <KPI label="Saídas" value={total_out} color="var(--c-neg)" icon="arrow_up" />
        <KPI label="Saldo do período" value={saldo} color={saldo >= 0 ? 'var(--c-pos)' : 'var(--c-neg)'} icon="wallet" emphasis />
      </div>

      <TiltCard interactive={false} padding={20}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240,
            background: 'var(--bg-alt)', border: '1.5px solid var(--line)', borderRadius: 999, padding: '10px 18px',
          }}>
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição ou categoria..."
              style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-alt)', padding: 4, borderRadius: 999, border: '1px solid var(--line)' }}>
            {[{k:'all', l:'Todas'}, {k:'entrada', l:'Entradas'}, {k:'saida', l:'Saídas'}].map(t => (
              <button key={t.k} onClick={() => setFilterType(t.k)} style={tabBtnStyle(filterType === t.k)}>{t.l}</button>
            ))}
          </div>
        </div>
      </TiltCard>

      <TiltCard interactive={false} padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ maxHeight: '54vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Data', 'Descrição', 'Categoria', 'Método', 'Valor', ''].map((h, i) => (
                  <th key={i + h} style={{
                    textAlign: i === 4 ? 'right' : (i === 5 ? 'right' : 'left'),
                    padding: '14px 22px', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                    color: 'var(--ink-mute)', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{
                  borderBottom: '1px solid var(--line)',
                  animation: `fadeIn 0.3s ease ${Math.min(i * 0.02, 0.6)}s both`,
                }}>
                  <td style={{ padding: '14px 22px', fontSize: 13, color: 'var(--ink-soft)' }} className="mono">{window.fmtDate(t.date)}</td>
                  <td style={{ padding: '14px 22px', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `color-mix(in oklch, ${t.color} 18%, transparent)`, color: t.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name={t.type === 'entrada' ? 'arrow_down' : 'arrow_up'} size={14} stroke={2.4} />
                      </div>
                      {t.description}
                    </div>
                  </td>
                  <td style={{ padding: '14px 22px' }}><Pill color={t.color}>{t.category}</Pill></td>
                  <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--ink-mute)' }}>{t.paymentMethod}</td>
                  <td style={{ padding: '14px 22px', textAlign: 'right' }} className="mono">
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.type === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)' }}>
                      {t.type === 'entrada' ? '+' : '−'} {window.fmt(t.amount)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <RowActions
                      onEdit={() => setEditing(t)}
                      onDelete={() => { if (confirm(`Excluir "${t.description}"?`)) window.deleteCompraLocal(t.id); }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)' }}>Nenhuma compra encontrada para o filtro.</div>
          )}
        </div>
      </TiltCard>
      {editing && <EditModal kind="compra" record={editing} onClose={() => setEditing(null)} onSaved={() => tick()} />}
    </div>
  );
};

// KPI card reusável
const KPI = ({ label, value, color, icon, subtle, emphasis }) => (
  <TiltCard glowColor={color} padding={20} style={emphasis ? { outline: `2px solid ${color}`, outlineOffset: -2 } : {}}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `color-mix(in oklch, ${color} 16%, transparent)`, color, display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={16} stroke={2.2} />
      </div>
    </div>
    <Counter value={value} format={(n) => window.fmt(n)} className="mono"
      style={{ fontSize: subtle ? 22 : 26, fontWeight: 700, color: emphasis ? color : 'var(--ink)', letterSpacing: -0.6 }} />
  </TiltCard>
);

// ─── Pacientes / Agenda / Config (inalteradas) ────────────────────
const PacientesPage = () => {
  const PATIENTS = [
    { id: 1, name: 'Mariana Souza', avatar: 'MS', convenio: 'Unimed', lastVisit: '2026-04-12', nextVisit: '2026-04-26', status: 'ativo' },
    { id: 2, name: 'João Alves', avatar: 'JA', convenio: 'Particular', lastVisit: '2026-04-15', nextVisit: '2026-04-22', status: 'ativo' },
    { id: 3, name: 'Beatriz Ferraz', avatar: 'BF', convenio: 'Bradesco', lastVisit: '2026-03-28', nextVisit: null, status: 'pendente' },
    { id: 4, name: 'Rafael Moreira', avatar: 'RM', convenio: 'SulAmérica', lastVisit: '2026-04-18', nextVisit: '2026-05-02', status: 'ativo' },
    { id: 5, name: 'Camila Tanaka', avatar: 'CT', convenio: 'Particular', lastVisit: '2026-04-10', nextVisit: '2026-04-24', status: 'ativo' },
    { id: 6, name: 'Lucas Prado', avatar: 'LP', convenio: 'Amil', lastVisit: '2026-04-05', nextVisit: null, status: 'inativo' },
  ];
  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Pacientes" subtitle={`${PATIENTS.length} cadastrados`} action={<Btn variant="primary" icon="plus">Novo paciente</Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
        {PATIENTS.map((p, i) => (
          <TiltCard key={p.id} glowColor="var(--c-secondary)" padding={22} style={{ animation: `popIn 0.5s ease ${i*0.06}s both` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Avatar initials={p.avatar} size={52} color={i % 3 === 0 ? 'var(--c-primary)' : i % 3 === 1 ? 'var(--c-secondary)' : 'var(--c-tertiary)'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{p.convenio}</div>
              </div>
              <Pill color={p.status === 'ativo' ? 'var(--c-primary)' : p.status === 'pendente' ? 'var(--c-warning)' : 'var(--c-danger)'} size="sm">{p.status}</Pill>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Última</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }} className="mono">{window.fmtDate(p.lastVisit)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Próxima</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: p.nextVisit ? 'var(--c-secondary)' : 'var(--ink-mute)', marginTop: 4 }} className="mono">
                  {p.nextVisit ? window.fmtDate(p.nextVisit) : '—'}
                </div>
              </div>
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
};

const AgendaPage = ({ filter, setFilter }) => {
  const today = new Date();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    days.push(d);
  }
  const contas = window.CONTAS.filter(c => !c.pago).slice(0, 20);
  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Agenda" subtitle="Vencimentos dos próximos 7 dias" />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <TiltCard interactive={false} padding={24}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>Semana</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {days.map((d, i) => {
              const dayContas = contas.filter(c => new Date(c.vencimento + 'T12:00:00').toDateString() === d.toDateString());
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} style={{
                  borderRadius: 'var(--r-md)', padding: 14,
                  background: isToday ? 'color-mix(in oklch, var(--c-primary) 10%, transparent)' : 'var(--bg-alt)',
                  border: isToday ? '2px solid var(--c-primary)' : '1px solid var(--line)',
                  minHeight: 140, animation: `popIn 0.4s ease ${i*0.05}s both`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {['dom','seg','ter','qua','qui','sex','sáb'][d.getDay()]}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: isToday ? 'var(--c-primary)' : 'var(--ink)' }} className="mono">{d.getDate()}</div>
                  {dayContas.slice(0, 3).map(c => (
                    <div key={c.id} style={{
                      marginTop: 6, padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                      background: c.tipo === 'receber' ? 'var(--c-pos-soft)' : 'var(--c-neg-soft)',
                      color: c.tipo === 'receber' ? 'var(--c-pos)' : 'var(--c-neg)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }} title={c.description}>{c.description.slice(0, 14)}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </TiltCard>

        <TiltCard interactive={false} padding={24}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>Próximos vencimentos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
            {contas.slice(0, 8).map((c, i) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                borderRadius: 'var(--r-md)', background: 'var(--bg-alt)', border: '1px solid var(--line)',
                animation: `slideUp 0.4s ease ${i*0.07}s both`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: c.tipo === 'receber' ? 'var(--c-pos-soft)' : 'var(--c-neg-soft)',
                  color: c.tipo === 'receber' ? 'var(--c-pos)' : 'var(--c-neg)',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Icon name={c.tipo === 'receber' ? 'arrow_down' : 'arrow_up'} size={16} stroke={2.4} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)' }} className="mono">{window.fmtDate(c.vencimento)}</div>
                </div>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: c.tipo === 'receber' ? 'var(--c-pos)' : 'var(--c-neg)' }}>
                  {window.fmtShort(c.previsto)}
                </span>
              </div>
            ))}
          </div>
        </TiltCard>
      </div>
    </div>
  );
};

function CatSection({ type, label, list, loading, novaVal, setNova, cor, setCor, onAdd, onToggle, onDelete, saving }) {
  const inp = { flex:1, padding:'9px 12px', borderRadius:8, border:'1px solid var(--line)', background:'var(--surface)', color:'var(--ink)', fontSize:13, outline:'none' };
  return (
    <div className="glass" style={{ borderRadius:'var(--r-lg)', overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ width:10, height:10, borderRadius:'50%', background: type==='entrada' ? 'var(--c-pos)' : 'var(--c-neg)', display:'inline-block' }} />
        <span style={{ fontWeight:700, fontSize:14 }}>{label}</span>
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--ink-soft)' }}>{list.filter(c=>c.is_active!==false).length} ativas</span>
      </div>
      <div>
        {loading ? (
          <div style={{ padding:'20px', textAlign:'center', color:'var(--ink-soft)', fontSize:13 }}>Carregando...</div>
        ) : list.length === 0 ? (
          <div style={{ padding:'20px', textAlign:'center', color:'var(--ink-soft)', fontSize:13 }}>Nenhuma categoria ainda.</div>
        ) : list.map(cat => (
          <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--line)', opacity: cat.is_active===false ? 0.45 : 1 }}>
            <span style={{ width:12, height:12, borderRadius:3, background: cat.color || '#6b7280', flexShrink:0 }} />
            <span style={{ flex:1, fontSize:14, fontWeight:500 }}>{cat.name}</span>
            <button onClick={() => onToggle(cat)} title={cat.is_active===false ? 'Ativar' : 'Desativar'}
              style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--line)', background:'transparent', color:'var(--ink-soft)', fontSize:12, cursor:'pointer' }}>
              {cat.is_active===false ? '▶ Ativar' : '⏸ Ocultar'}
            </button>
            <button onClick={() => onDelete(cat)}
              style={{ padding:'4px 8px', borderRadius:6, border:'none', background:'transparent', color:'var(--c-neg)', fontSize:16, cursor:'pointer', lineHeight:1 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ padding:'14px 20px', background:'var(--bg-alt)', display:'flex', gap:8, alignItems:'center' }}>
        <input value={novaVal} onChange={e => setNova(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdd(type)}
          placeholder={'Nova categoria de ' + (type==='entrada'?'entrada':'saída') + '...'}
          style={inp} />
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', maxWidth:160 }}>
          {PRESET_COLORS.map(pc => (
            <div key={pc} onClick={() => setCor(pc)}
              style={{ width:18, height:18, borderRadius:4, background:pc, cursor:'pointer', border: cor===pc ? '2px solid var(--ink)' : '2px solid transparent', flexShrink:0 }} />
          ))}
        </div>
        <button onClick={() => onAdd(type)} disabled={saving || !novaVal.trim()}
          style={{ padding:'9px 18px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-ink)', fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', opacity: !novaVal.trim()||saving ? 0.6 : 1 }}>
          + Adicionar
        </button>
      </div>
    </div>
  );
}

const PRESET_COLORS = [
  '#141414','#2a2a2a','#404040','#565656','#6c6c6c','#828282',
  '#989898','#aeaeae','#c4c4c4','#4a4a4a','#333333','#767676',
];

const ConfigPage = () => {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id;
  const [cats, setCats] = React.useState({ entrada: [], saida: [] });
  const [loading, setLoading] = React.useState(true);
  const [novaEntrada, setNovaEntrada] = React.useState('');
  const [novaSaida, setNovaSaida] = React.useState('');
  const [corEntrada, setCorEntrada] = React.useState(PRESET_COLORS[0]);
  const [corSaida, setCorSaida] = React.useState(PRESET_COLORS[3]);
  const [saving, setSaving] = React.useState(false);

  const carregar = React.useCallback(async () => {
    if (!companyId) { setLoading(false); setImpostos([]); return; }
    setLoading(true);
    try {
      const rows = await window.fetchCategories(companyId);
      const cats = {
        entrada: rows.filter(r => r.type === 'entrada'),
        saida:   rows.filter(r => r.type === 'saida'),
      };
      setCats(cats);
      window.APP_CATEGORIES = cats;  // mantém os formulários em sincronia
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [companyId]);

  React.useEffect(() => { carregar(); }, [carregar]);

  const addCat = async (type) => {
    const nome = type === 'entrada' ? novaEntrada.trim() : novaSaida.trim();
    const cor  = type === 'entrada' ? corEntrada : corSaida;
    if (!nome) return;
    setSaving(true);
    try {
      await window.createCategory(companyId, user?.id, { name: nome, type, color: cor });
      if (type === 'entrada') setNovaEntrada(''); else setNovaSaida('');
      await carregar();
      window.reloadCategories?.();
    } catch(e) { alert('Erro: ' + e.message); }
    finally { setSaving(false); }
  };

  const toggleCat = async (cat) => {
    try {
      await window.updateCategory(cat.id, { is_active: !cat.is_active });
      await carregar();
      window.reloadCategories?.();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  const delCat = async (cat) => {
    if (!confirm('Excluir categoria "' + cat.name + '"?')) return;
    try {
      await window.deleteCategory(cat.id);
      await carregar();
      window.reloadCategories?.();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  const inp = { flex:1, padding:'9px 12px', borderRadius:8, border:'1px solid var(--line)', background:'var(--surface)', color:'var(--ink)', fontSize:13, outline:'none' };

  return (
    <div className="anim-fade" style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:760 }}>
      <PageHeader title="Configurações" subtitle="Categorias, conta e preferências" />

      {/* Categorias */}
      <div>
        <h3 style={{ fontSize:18, fontWeight:700, margin:'0 0 16px', color:'var(--ink)' }}>
          📂 Categorias de lançamento
        </h3>
        <div style={{ fontSize:13, color:'var(--ink-soft)', marginBottom:18, lineHeight:1.6 }}>
          As categorias aparecem como lista suspensa ao criar contas e compras. Adicione, oculte ou exclua conforme necessário.
        </div>
        <CatSection type="entrada" label="Categorias de entrada (receitas)"
          list={cats.entrada} loading={loading} novaVal={novaEntrada} setNova={setNovaEntrada}
          cor={corEntrada} setCor={setCorEntrada}
          onAdd={addCat} onToggle={toggleCat} onDelete={delCat} saving={saving} />
        <CatSection type="saida" label="Categorias de saída (despesas)"
          list={cats.saida} loading={loading} novaVal={novaSaida} setNova={setNovaSaida}
          cor={corSaida} setCor={setCorSaida}
          onAdd={addCat} onToggle={toggleCat} onDelete={delCat} saving={saving} />
      </div>
    </div>
  );
};

// Page header
const PageHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.9, color: 'var(--ink)' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 4 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

Object.assign(window, { ContasPage, ComprasPage, PacientesPage, AgendaPage, ConfigPage, PageHeader, FilterBar, ExcelImporter, KPI });

window.ImpostosPage = ImpostosPage;
