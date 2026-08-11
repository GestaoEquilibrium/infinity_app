// Pages — respeita as 5 estruturas obrigatórias
// CONTAS e COMPRAS são páginas separadas.

// ─── CAMPO DE VALOR EM MOEDA (R$ 1.150,00) ──────────────────────
// Mostra o número formatado em Real enquanto digita, mas devolve
// number puro pro formulário via onChange(valorNumerico).
// Digitação estilo "caixa eletrônico": os dígitos entram pela direita
// (ex: digita 1150 -> R$ 11,50 -> R$ 1.150,00). Backspace apaga da direita.
const MoneyInput = ({ value, onChange, style, autoFocus, placeholder }) => {
  const fmtBR = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [texto, setTexto] = React.useState(fmtBR(value));

  // Sincroniza quando o valor muda de fora (ex: abrir o modal pra editar)
  React.useEffect(() => {
    const atual = Math.round((Number(value) || 0) * 100);
    const digitado = Math.round((parseFloat(String(texto).replace(/\./g, '').replace(',', '.')) || 0) * 100);
    if (atual !== digitado) setTexto(fmtBR(value));
  }, [value]);

  const handle = (e) => {
    // Pega só os dígitos e trata como centavos
    const digits = e.target.value.replace(/\D/g, '');
    const num = digits ? parseInt(digits, 10) / 100 : 0;
    setTexto(fmtBR(num));
    onChange(num);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 14, fontSize: 13, color: 'var(--ink-mute)', fontWeight: 600, pointerEvents: 'none' }}>R$</span>
      <input
        type="text" inputMode="numeric"
        value={texto} onChange={handle}
        autoFocus={autoFocus} placeholder={placeholder}
        style={{ ...style, paddingLeft: 38, textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}
      />
    </div>
  );
};

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
          <button onClick={() => setFilter({ mode: 'ciclo', month: filter.month || (window.availableMonths().slice(-1)[0]) })}
            style={tabBtnStyle(filter.mode === 'ciclo')}>Ciclo</button>
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

        {filter.mode === 'ciclo' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            <button onClick={() => {
              const i = months.indexOf(filter.month);
              if (i > 0) setFilter({ ...filter, mode: 'ciclo', month: months[i - 1] });
            }} style={navBtn}><Icon name="chevron_left" size={16} stroke={2.4} /></button>
            <select value={filter.month} onChange={(e) => setFilter({ ...filter, mode: 'ciclo', month: e.target.value })} style={selectStyle}>
              {months.map(m => <option key={m} value={m}>{window.monthLabel(m)}</option>)}
            </select>
            <button onClick={() => {
              const i = months.indexOf(filter.month);
              if (i < months.length - 1) setFilter({ ...filter, mode: 'ciclo', month: months[i + 1] });
            }} style={navBtn}><Icon name="chevron_right" size={16} stroke={2.4} /></button>
            <span style={{ fontSize: 12, color: 'var(--ink-mute)', marginLeft: 6 }}>vira dia</span>
            <input type="number" min="1" max="28" value={filter.corte || 25}
              onChange={(e) => setFilter({ ...filter, mode: 'ciclo', corte: Math.min(28, Math.max(1, Number(e.target.value) || 25)) })}
              style={{ ...inputStyle, width: 62 }} />
            <span style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>
              (junta o convênio que cai no fim do mês com as despesas que ele paga)
            </span>
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
            : filter.mode === 'ciclo'
            ? (() => { const r = window.rangeDoCiclo(filter.month, filter.corte || 25);
                return <>Ciclo <strong style={{ color: 'var(--ink)' }}>{r.from.split('-').reverse().join('/')} a {r.to.split('-').reverse().join('/')}</strong></>; })()
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
    ...(isConta ? { tipo: 'pagar', pago: false, previsto: 0, realizado: 0, category: '', description: '', vencimento: new Date().toISOString().slice(0,10), recorrente: false, dia_venc: new Date().getDate(), data_fim: '' } : { type: 'saida', amount: 0, category: '', description: '', date: new Date().toISOString().slice(0,10), paymentMethod: 'PIX' }),
    ...record,
  }));
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true); setErr('');
    try {
      // Recorrente: cria o MOLDE (contas_recorrentes), não uma conta avulsa.
      // A conta pendente de cada mês é gerada depois, pela tela Contas.
      if (isConta && isNew && form.recorrente) {
        const s = window.getSession?.();
        const me = s ? await window.getMe?.() : null;
        const prof = me ? await window.getProfile?.(me.id) : null;
        const cid = window.ACTIVE_COMPANY_ID || prof?.company_id;
        if (!cid) throw new Error('empresa não identificada');
        await window.createRecorrente(cid, me?.id, {
          description: form.description,
          category: form.category,
          tipo: form.tipo,
          previsto: Number(form.previsto) || 0,
          dia_vencimento: Number(form.dia_venc) || Number((form.vencimento || '').slice(8, 10)) || 10,
          data_inicio: form.vencimento || new Date().toISOString().slice(0, 10),
          data_fim: form.data_fim || null,
        });
        window.dispatchEvent(new CustomEvent('sb-recorrentes-changed'));
        onSaved?.();
        onClose();
        return;
      }
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
              <MoneyInput value={form.previsto || 0} onChange={(v) => set('previsto', v)} style={editInput} />
            </FormField>
            <FormField label="Valor realizado">
              <MoneyInput value={form.realizado || 0} onChange={(v) => set('realizado', v)} style={editInput} />
            </FormField>
            <FormField label="Status">
              <select value={form.pago ? 'pago' : 'pendente'} onChange={(e) => set('pago', e.target.value === 'pago')} style={editInput}>
                <option value="pendente">Pendente</option>
                <option value="pago">{form.tipo === 'receber' ? 'Recebido' : 'Pago'}</option>
              </select>
            </FormField>

            {/* ── Recorrente — só ao criar uma conta nova ── */}
            {isNew && (
              <div style={{ gridColumn: 'span 2', marginTop: 2, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-alt)', border: '1px solid var(--line)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                  <input type="checkbox" checked={!!form.recorrente} onChange={(e) => set('recorrente', e.target.checked)} />
                  🔁 Repetir todo mês (recorrente)
                </label>
                {form.recorrente && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                      <FormField label="Dia do vencimento">
                        <input type="number" min="1" max="31" value={form.dia_venc || ''} onChange={(e) => set('dia_venc', e.target.value)} style={editInput} />
                      </FormField>
                      <FormField label="Até quando (opcional)">
                        <input type="date" value={form.data_fim || ''} onChange={(e) => set('data_fim', e.target.value)} style={editInput} />
                      </FormField>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 8, lineHeight: 1.45 }}>
                      Vai aparecer como <b>pendente</b> todo mês, no dia escolhido. Não entra no caixa até você confirmar o pagamento. Deixe "até quando" em branco pra repetir sem prazo.
                    </div>
                  </>
                )}
              </div>
            )}
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
              <MoneyInput value={form.amount || 0} onChange={(v) => set('amount', v)} style={editInput} />
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
            <MoneyInput
              value={valorReal}
              onChange={(v) => setValorReal(v)}
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: '1.5px solid var(--c-primary)', background: 'var(--bg-alt)',
                fontSize: 18, color: 'var(--ink)', outline: 'none',
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

  const CATS = ['INSS','ISS','DARF','IRPJ','CSLL','DARF Aluguel','Outros Tributos'];

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

  const statusOf = c => {
    if (c.pago)        return 'pago';
    if (isAtrasado(c)) return 'atrasado';
    if (isHoje(c))     return 'hoje';
    return 'pendente';
  };
  const statusLabel = { pago: 'Pago', atrasado: 'Atrasado', hoje: 'Vence hoje', pendente: 'Pendente' };

  // cor de categoria fiscal (paleta cat)
  const catCor = cat => ({
    'INSS': 'var(--cat-3)', 'ISS': 'var(--cat-6)', 'DARF': 'var(--cat-5)',
    'IRPJ': 'var(--cat-1)', 'CSLL': 'var(--cat-4)', 'DARF Aluguel': 'var(--cat-5)',
  })[cat] || 'var(--cat-7)';

  const filtered = impostos.filter(c => {
    if (statusFilter === 'pendente' && c.pago) return false;
    if (statusFilter === 'pago' && !c.pago) return false;
    if (q && !(c.description.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const totalPendente = impostos.filter(c => !c.pago).reduce((s,c) => s+(c.previsto||0), 0);
  const totalPago     = impostos.filter(c =>  c.pago).reduce((s,c) => s+(c.realizado||c.previsto||0), 0);
  const atrasados     = impostos.filter(c => isAtrasado(c)).length;
  const venceHoje     = impostos.filter(c => isHoje(c)).length;

  const marcarPago = async (imp) => {
    try {
      await window.updateContaLocal(imp.id, { pago: true, realizado: imp.previsto, pagoEm: today });
      await carregar();
    } catch(e) { alert('Erro: ' + e.message); }
  };
  const desmarcarPago = async (imp) => {
    try {
      await window.updateContaLocal(imp.id, { pago: false, realizado: null, pagoEm: null });
      await carregar();
    } catch(e) { alert('Erro: ' + e.message); }
  };
  const excluir = async (id) => {
    try { await window.deleteConta(id); setConfirmDelete(null); await carregar(); }
    catch(e) { alert('Erro: ' + e.message); }
  };

  // Modal criação/edição
  const ModalImposto = ({ imp, onClose }) => {
    const isNew = !imp?.id;
    const [form, setForm] = React.useState({
      description: imp?.description || '', category: imp?.category || 'DARF',
      vencimento: imp?.vencimento || '', previsto: imp?.previsto || '',
      pago: imp?.pago || false, realizado: imp?.realizado || '',
    });
    const [saving, setSaving] = React.useState(false);
    const set = (k, v) => setForm(f => ({...f, [k]: v}));

    const save = async () => {
      if (!form.description.trim() || !form.vencimento || !form.previsto) { alert('Preencha descrição, vencimento e valor.'); return; }
      setSaving(true);
      try {
        const payload = {
          description: form.description.trim(), category: form.category, tipo: 'pagar',
          vencimento: form.vencimento, previsto: parseFloat(String(form.previsto).replace(',','.')),
          pago: form.pago, realizado: form.pago ? parseFloat(String(form.realizado||form.previsto).replace(',','.')) : null,
        };
        if (isNew) await window.createConta(payload, companyId, user?.id);
        else await window.updateContaLocal(imp.id, {
          description: payload.description, category: payload.category, tipo: 'pagar',
          previsto: payload.previsto, vencimento: payload.vencimento,
          pago: payload.pago, realizado: payload.pago ? payload.realizado : null,
        });
        await carregar(); onClose();
      } catch(e) { alert('Erro ao salvar: ' + e.message); }
      finally { setSaving(false); }
    };

    return (
      <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,32,.45)', display:'grid', placeItems:'center', padding:24 }}>
        <window.Card padding={24} style={{ width:'min(520px,100%)', boxShadow:'var(--sh-2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ font:'var(--t-h2)', color:'var(--ink)' }}>{isNew ? 'Novo imposto' : 'Editar imposto'}</h3>
            <window.IconBtn name="x" size={30} onClick={onClose} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <window.Field label="Descrição" style={{ gridColumn:'1/-1' }}>
              <input value={form.description} onChange={e=>set('description',e.target.value)} style={window.inputStyle} placeholder="Ex: DARF COFINS Mai/2026" autoFocus />
            </window.Field>
            <window.Field label="Categoria">
              <select value={form.category} onChange={e=>set('category',e.target.value)} style={window.inputStyle}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </window.Field>
            <window.Field label="Vencimento">
              <input type="date" value={form.vencimento} onChange={e=>set('vencimento',e.target.value)} style={window.inputStyle} />
            </window.Field>
            <window.Field label="Valor previsto (R$)">
              <input value={form.previsto} onChange={e=>set('previsto',e.target.value)} style={window.inputStyle} placeholder="0,00" />
            </window.Field>
            <window.Field label="Situação">
              <select value={form.pago ? 'pago' : 'pendente'} onChange={e=>set('pago', e.target.value==='pago')} style={window.inputStyle}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </window.Field>
            {form.pago && (
              <window.Field label="Valor pago (R$)" style={{ gridColumn:'1/-1' }}>
                <input value={form.realizado} onChange={e=>set('realizado',e.target.value)} style={window.inputStyle} placeholder={String(form.previsto || '0,00')} />
              </window.Field>
            )}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <window.Btn variant="secondary" onClick={onClose}>Cancelar</window.Btn>
            <window.Btn variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Salvando…' : isNew ? 'Adicionar' : 'Salvar'}</window.Btn>
          </div>
        </window.Card>
      </div>
    );
  };

  return (
    <div className="anim-fade">
      {(showModal || editando) && <ModalImposto imp={editando} onClose={() => { setShowModal(false); setEditando(null); }} />}

      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,32,.45)', display:'grid', placeItems:'center', padding:24 }}>
          <window.Card padding={24} style={{ width:'min(420px,100%)' }}>
            <h3 style={{ font:'var(--t-h2)', color:'var(--ink)', marginBottom:8 }}>Excluir imposto?</h3>
            <p style={{ font:'400 12.5px var(--f-sans)', color:'var(--ink-2)', marginBottom:20 }}><b>{confirmDelete.description}</b> será removido permanentemente.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <window.Btn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</window.Btn>
              <window.Btn variant="danger" onClick={() => excluir(confirmDelete.id)}>Excluir</window.Btn>
            </div>
          </window.Card>
        </div>
      )}

      {/* ── Faixa azul ── */}
      <window.Band
        title="Impostos"
        subtitle="INSS · ISS · DARF · IRPJ · CSLL"
        right={<window.Btn variant="primary" icon="plus" onBand onClick={() => { setEditando(null); setShowModal(true); }}>Novo imposto</window.Btn>}
        metricLabel="Total pendente"
        metric={totalPendente}
        stats={[
          { label: 'Pago no ano', value: totalPago, color: 'var(--on-accent-pos)' },
          { label: 'Atrasados', value: String(atrasados), color: atrasados > 0 ? 'var(--on-accent-neg)' : 'var(--on-accent)' },
          { label: 'Vence hoje', value: String(venceHoje), color: venceHoje > 0 ? 'var(--on-accent-neg)' : 'var(--on-accent)' },
        ]}
      />

      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Filtros + busca */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <window.Segmented
            options={[{ value:'pendente', label:'Pendentes' }, { value:'pago', label:'Pagos' }, { value:'todos', label:'Todos' }]}
            value={statusFilter} onChange={setStatusFilter} />
          <span style={{ font:'400 12px var(--f-sans)', color:'var(--ink-3)' }}>{filtered.length} {filtered.length===1?'item':'itens'}</span>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, height:34, background:'var(--field)', border:'1px solid var(--line-strong)', borderRadius:'var(--r-lg)', padding:'0 12px', minWidth:180 }}>
            <window.Icon name="search" size={15} style={{ color:'var(--ink-3)' }} />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar…" style={{ background:'none', border:'none', outline:'none', flex:1, font:'400 12.5px var(--f-sans)', color:'var(--ink)' }} />
          </div>
        </div>

        {/* Tabela */}
        <window.Card padding={0} style={{ overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:48, textAlign:'center', color:'var(--ink-3)', font:'500 13px var(--f-sans)' }}>Carregando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:40 }}>
              <window.EmptyState icon={impostos.length === 0 ? 'file' : 'check'}
                title={impostos.length === 0 ? 'Nenhum imposto cadastrado' : 'Nenhum imposto pendente'}
                hint={impostos.length === 0 ? 'Clique em "Novo imposto" para começar.' : 'Todas as obrigações estão em dia!'} />
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--line)' }}>
                    {['Descrição','Categoria','Vencimento','Previsto','Pago','Status',''].map((h,i) => (
                      <th key={h+i} style={{ padding:'10px 16px', textAlign:(i===3||i===4||i===6)?'right':'left', font:'var(--t-label)', textTransform:'uppercase', letterSpacing:'var(--tracking-label)', color:'var(--ink-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(imp => {
                    const st = statusOf(imp);
                    return (
                      <tr key={imp.id} style={{ borderBottom:'1px solid var(--line-2)', background: isAtrasado(imp) ? 'var(--c-neg-bg)' : 'transparent' }}>
                        <td style={{ padding:'11px 16px', font:'500 12.5px var(--f-sans)', color:'var(--ink)' }}>{imp.description}</td>
                        <td style={{ padding:'11px 16px' }}><window.CatPill cat={catCor(imp.category)}>{imp.category}</window.CatPill></td>
                        <td style={{ padding:'11px 16px', font:'400 12px var(--f-mono)', color: isAtrasado(imp)?'var(--c-neg)':'var(--ink-2)', fontWeight: isAtrasado(imp)?600:400 }}>{fmtDate(imp.vencimento)}</td>
                        <td style={{ padding:'11px 16px', textAlign:'right' }}><window.Money value={imp.previsto} size="table" style={{ color:'var(--ink)' }} /></td>
                        <td style={{ padding:'11px 16px', textAlign:'right' }}>{imp.pago ? <window.Money value={imp.realizado||imp.previsto} size="table" style={{ color:'var(--c-pos)' }} /> : <span style={{ color:'var(--ink-4)' }}>—</span>}</td>
                        <td style={{ padding:'11px 16px' }}><window.Pill status={st}>{statusLabel[st]}</window.Pill></td>
                        <td style={{ padding:'11px 16px', textAlign:'right' }}>
                          <div style={{ display:'flex', gap:5, alignItems:'center', justifyContent:'flex-end' }}>
                            {!imp.pago ? (
                              <window.Btn variant="primary" size="sm" icon="check" onClick={() => marcarPago(imp)}>Pagar</window.Btn>
                            ) : (
                              <window.Btn variant="secondary" size="sm" onClick={() => desmarcarPago(imp)}>Desfazer</window.Btn>
                            )}
                            <window.IconBtn name="edit" size={28} onClick={() => setEditando(imp)} title="Editar" />
                            <window.IconBtn name="trash" size={28} danger onClick={() => setConfirmDelete(imp)} title="Excluir" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'2px solid var(--line-strong)' }}>
                    <td colSpan={3} style={{ padding:'12px 16px', font:'600 12.5px var(--f-sans)', color:'var(--ink)' }}>Total ({filtered.length} {filtered.length===1?'item':'itens'})</td>
                    <td style={{ padding:'12px 16px', textAlign:'right' }}><window.Money value={filtered.reduce((s,c)=>s+(c.previsto||0),0)} size="table" style={{ color:'var(--ink)', fontWeight:700 }} /></td>
                    <td style={{ padding:'12px 16px', textAlign:'right' }}><window.Money value={filtered.filter(c=>c.pago).reduce((s,c)=>s+(c.realizado||c.previsto||0),0)} size="table" style={{ color:'var(--c-pos)', fontWeight:700 }} /></td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </window.Card>
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


// Classifica uma conta como pagamento de PESSOAL (repasse/folha) ou CONTA (fornecedor/despesa).
// Usa a categoria "Repasses" e também palavras-chave da descrição, porque nem toda
// linha de prestador está categorizada corretamente (ex.: Mona veio como "Outras Despesas").
const RE_PESSOAL = /(repasse|prestador|sal[áa]rio|folha|pr[óo]-?labore|pro labore|bolsa|estagi|honor[áa]rio)/i;
function ehPessoal(c) {
  if (!c) return false;
  if ((c.category || '').toLowerCase().includes('repasse')) return true;
  if ((c.category || '').toLowerCase().includes('folha')) return true;
  return RE_PESSOAL.test(c.description || '');
}

// ============================================================
// PROJEÇÃO DE CAIXA — previsibilidade
// ============================================================
const ProjecaoPage = () => {
  const { profile } = window.useAuth();
  const [producao, setProducao] = React.useState(null);
  const [bancos, setBancos] = React.useState(null);
  const [cenario, setCenario] = React.useState(1);
  const [hover, setHover] = React.useState(null);
  const [prodOpen, setProdOpen] = React.useState(false);
  const [, tick] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => tick(); window.addEventListener('sb-data-hydrated', h);
    return () => window.removeEventListener('sb-data-hydrated', h);
  }, []);
  React.useEffect(() => {
    if (!profile?.company_id) return;
    if (window.fetchProducaoMensal) window.fetchProducaoMensal(profile.company_id).then(setProducao).catch(() => setProducao([]));
    if (window.fetchContasBancarias) window.fetchContasBancarias(profile.company_id).then(r => setBancos(window.saldosPorConta(r))).catch(() => setBancos([]));
  }, [profile?.company_id, (window.CONTAS || []).length]);

  const saldoHoje = (bancos || []).reduce((a, b) => a + b.saldo, 0);
  const proj = React.useMemo(() => {
    if (!producao) return null;
    return window.projetarCaixa({ producao, saldoInicial: saldoHoje, horizonteDias: 75, fatorProducao: cenario });
  }, [producao, saldoHoje, cenario]);

  if (!producao || !proj) {
    return (
      <>
        <window.Band title="Projeção de Caixa" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Carregando projeção…</div>
      </>
    );
  }

  const pts = proj.dias.map((d, i) => ({ i, x: i, y: d.saldo, data: d.data }));
  const ys = pts.map(p => p.y); const ymax = Math.max(...ys, 0); const ymin = Math.min(...ys, 0);
  const W = 900, H = 240, pad = 8;
  const sx = i => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const sy = v => H - pad - ((v - ymin) / (ymax - ymin || 1)) * (H - 2 * pad);
  const zeroY = sy(0);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.i).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');

  const eventos = proj.dias.flatMap(d => d.eventos.filter(e => e.valor >= 1000).map(e => ({ ...e, data: d.data })));
  const menorSaldo = proj.dias.reduce((min, d) => d.saldo < min.saldo ? d : min, proj.dias[0]);
  const fecha = proj.dias[proj.dias.length - 1].saldo;
  const fmtD = iso => iso.split('-').reverse().slice(0, 2).join('/');

  return (
    <div>
      {/* ── Faixa azul ── */}
      <window.Band
        title="Projeção de Caixa"
        subtitle={`Até ${proj.ultimoRecebimento ? fmtD(proj.ultimoRecebimento) : ''} — com base na produção que já aconteceu`}
        metricLabel="Dinheiro hoje"
        metric={saldoHoje}
        stats={[
          { label: 'Menor saldo previsto', value: menorSaldo.saldo, color: menorSaldo.saldo < 0 ? 'var(--on-accent-neg)' : 'var(--on-accent)' },
          { label: 'Fecha o período em', value: fecha, color: fecha < 0 ? 'var(--on-accent-neg)' : 'var(--on-accent-pos)' },
          { label: 'Alerta', value: proj.alerta ? `Neg. ${fmtD(proj.alerta.data)}` : 'Tudo certo', color: proj.alerta ? 'var(--on-accent-neg)' : 'var(--on-accent-pos)' },
        ]}
      />

      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Explicação */}
        <div style={{ display: 'flex', gap: 11, padding: '13px 16px', borderRadius: 'var(--r-lg)', background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', alignItems: 'flex-start' }}>
          <window.Icon name="sparkles" size={17} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-2)', lineHeight: 1.55 }}>
            No convênio, o atendimento vira dinheiro dois meses depois — então o que a clínica atendeu em <b>junho</b> a gente <b>já sabe</b> que vai receber. A projeção soma esses recebimentos certos, desconta as saídas fixas (folha, repasse, aluguel, impostos) e mostra o saldo dia a dia. Use os <b>cenários</b> para ver o que acontece se a produção cair.
          </div>
        </div>

        {/* Cenários */}
        <div>
          <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)', marginBottom: 8 }}>
            Cenário — quanto sobra ao fim do período
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[{ v: 1.1, l: 'Otimista', s: '+10%' }, { v: 1, l: 'Base', s: 'real' }, { v: 0.9, l: 'Cauteloso', s: '−10%' }, { v: 0.8, l: 'Pessimista', s: '−20%' }].map(c => {
              const pc = window.projetarCaixa({ producao, saldoInicial: saldoHoje, horizonteDias: 75, fatorProducao: c.v });
              const f = pc.dias[pc.dias.length - 1].saldo;
              const on = cenario === c.v;
              return (
                <window.Card key={c.v} padding={14} onClick={() => setCenario(c.v)} style={{
                  cursor: 'pointer',
                  background: on ? 'var(--accent)' : 'var(--surface)',
                  border: on ? '1px solid var(--accent)' : '1px solid var(--line)',
                  boxShadow: on ? 'var(--sh-accent)' : 'var(--sh-1)',
                }}>
                  <div style={{ font: '600 12px var(--f-sans)', color: on ? 'rgba(255,255,255,.9)' : 'var(--ink)' }}>
                    {c.l} <span style={{ fontWeight: 400, opacity: .7 }}>{c.s}</span>
                  </div>
                  <div className="mono" style={{ font: '600 17px var(--f-mono)', marginTop: 3, color: on ? '#fff' : (f < 0 ? 'var(--c-neg)' : 'var(--c-pos)') }}>{window.fmt(f)}</div>
                  <div style={{ font: '400 10px var(--f-sans)', marginTop: 2, color: on ? 'rgba(255,255,255,.8)' : (pc.alerta ? 'var(--c-neg)' : 'var(--ink-3)') }}>
                    {pc.alerta ? `negativo em ${fmtD(pc.alerta.data)}` : 'não fica negativo'}
                  </div>
                </window.Card>
              );
            })}
          </div>
        </div>

        {/* Gráfico */}
        <window.Card padding={18}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h2 style={{ font: 'var(--t-h2)', color: 'var(--ink)' }}>Saldo projetado — próximos {proj.horizonteReal} dias</h2>
            <div style={{ font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>fecha em <b className="mono" style={{ color: fecha < 0 ? 'var(--c-neg)' : 'var(--c-pos)' }}>{window.fmt(fecha)}</b></div>
          </div>
          <div style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setHover(null)}>
              <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="var(--c-neg)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <path d={`${path} L${sx(pts.length - 1)},${zeroY} L${sx(0)},${zeroY} Z`} fill="var(--accent)" opacity="0.08" />
              <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
              {proj.dias.map((d, i) => {
                const grande = d.eventos.filter(e => e.valor >= 5000);
                if (!grande.length) return null;
                const cor = grande.some(e => e.tipo === 'entrada') ? 'var(--c-pos)' : 'var(--c-neg)';
                return <circle key={'ev' + i} cx={sx(i)} cy={sy(d.saldo)} r="3.5" fill={cor} />;
              })}
              {hover != null && (
                <g>
                  <line x1={sx(hover)} y1={pad} x2={sx(hover)} y2={H - pad} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                  <circle cx={sx(hover)} cy={sy(proj.dias[hover].saldo)} r="5" fill="var(--accent)" stroke="#fff" strokeWidth="2" />
                </g>
              )}
              {proj.dias.map((d, i) => (
                <rect key={'hit' + i} x={sx(i) - (W / proj.dias.length) / 2} y={0} width={W / proj.dias.length} height={H} fill="transparent"
                  onMouseEnter={() => setHover(i)} style={{ cursor: 'crosshair' }} />
              ))}
            </svg>
            {hover != null && (() => {
              const d = proj.dias[hover];
              const leftPct = (sx(hover) / W) * 100;
              const alinhaDir = leftPct > 65;
              return (
                <div style={{ position: 'absolute', top: 6, left: `${Math.min(Math.max(leftPct, 12), 88)}%`, transform: alinhaDir ? 'translateX(-100%)' : 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '8px 12px', pointerEvents: 'none', boxShadow: 'var(--sh-2)', whiteSpace: 'nowrap', zIndex: 5 }}>
                  <div style={{ font: '600 11px var(--f-sans)', color: 'var(--ink-3)' }}>{d.data.split('-').reverse().join('/')}</div>
                  <div className="mono" style={{ font: '600 15px var(--f-mono)', color: d.saldo < 0 ? 'var(--c-neg)' : 'var(--ink)' }}>{window.fmt(d.saldo)}</div>
                  {d.eventos.filter(e => e.valor >= 1000).map((e, j) => (
                    <div key={j} style={{ font: '400 11px var(--f-sans)', marginTop: 2, color: e.tipo === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)' }}>
                      {e.tipo === 'entrada' ? '+' : '−'}{window.fmt(e.valor)} · {e.descricao.replace(' (estimado)', '').replace(' — produção', ' de').slice(0, 28)}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 10px var(--f-sans)', color: 'var(--ink-4)', marginTop: 4 }}>
            <span>hoje</span><span>+{Math.round(proj.horizonteReal / 3)}d</span><span>+{Math.round(proj.horizonteReal * 2 / 3)}d</span><span>+{proj.horizonteReal}d</span>
          </div>
        </window.Card>

        {/* Timeline de eventos */}
        <window.Card padding={0}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', font: 'var(--t-h2)', color: 'var(--ink)' }}>Próximos eventos de caixa</div>
          <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            {eventos.length === 0 && <div style={{ padding: 20, color: 'var(--ink-3)', font: '400 12.5px var(--f-sans)' }}>Nada relevante nos próximos 75 dias.</div>}
            {eventos.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: i ? '1px solid var(--line-2)' : 'none' }}>
                <div style={{ width: 48, font: '600 11.5px var(--f-mono)', color: 'var(--ink-3)' }}>{fmtD(e.data)}</div>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: e.tipo === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)', flexShrink: 0 }} />
                <div style={{ flex: 1, font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>{e.descricao}{e.origem === 'projecao' && <span style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)', marginLeft: 6 }}>· projetado</span>}</div>
                <window.Money value={e.valor} size="table" signed={false} style={{ color: e.tipo === 'entrada' ? 'var(--c-pos)' : 'var(--c-neg)', fontWeight: 600 }} />
              </div>
            ))}
          </div>
        </window.Card>

        {/* Produção (colapsável) */}
        <window.Card padding={0}>
          <button onClick={() => setProdOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', cursor: 'pointer', background: 'none', border: 'none' }}>
            <window.Icon name="file" size={16} style={{ color: 'var(--ink-3)' }} />
            <span style={{ font: '600 13px var(--f-sans)', color: 'var(--ink)' }}>Produção guardada — ver e ajustar</span>
            <span style={{ font: '400 11px var(--f-sans)', color: 'var(--ink-3)' }}>(base dos recebimentos projetados)</span>
            <window.Icon name="chevron_down" size={16} style={{ marginLeft: 'auto', color: 'var(--ink-3)', transform: prodOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur) var(--ease)' }} />
          </button>
          {prodOpen && (
            <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--line)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                <thead>
                  <tr style={{ font: 'var(--t-label)', color: 'var(--ink-3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
                    <th style={{ padding: '8px 8px' }}>Mês</th>
                    <th style={{ padding: '8px 8px' }}>Convênio</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right' }}>Atendimentos</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right' }}>R$/atend</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right' }}>Recebimento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...producao].sort((a, b) => (a.competencia + a.convenio).localeCompare(b.competencia + b.convenio)).map(p => (
                    <ProducaoRow key={p.id || p.competencia + p.convenio} p={p} companyId={profile?.company_id} />
                  ))}
                  {producao.length === 0 && <tr><td colSpan={6} style={{ padding: 14, color: 'var(--ink-3)', font: '400 12px var(--f-sans)' }}>Nenhuma produção guardada. Importe um relatório no módulo Repasse.</td></tr>}
                </tbody>
              </table>
              <div style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)', marginTop: 8 }}>
                A produção é guardada sozinha quando você importa o relatório no Repasse. Edite um número aqui só se um mês veio incompleto.
              </div>
            </div>
          )}
        </window.Card>

        <div style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)', lineHeight: 1.5 }}>
          <b>A projeção vai até {proj.ultimoRecebimento ? fmtD(proj.ultimoRecebimento) : ''}</b> porque é até onde há produção importada dos dois lados. Importe o relatório do mês seguinte para estender o horizonte. Ela usa a produção de convênio que já aconteceu, as contas já lançadas com vencimento futuro, e uma média diária de cartão/particular.
        </div>
      </div>
    </div>
  );
};

// Linha editável da tabela de produção
const ProducaoRow = ({ p, companyId }) => {
  const [atend, setAtend] = React.useState(p.atendimentos);
  const [editando, setEditando] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const meses = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [y, m] = p.competencia.split('-');
  const receb = (Number(atend) || 0) * (Number(p.valor_por_atend) || 0);
  const salvar = async () => {
    if (Number(atend) === p.atendimentos) { setEditando(false); return; }
    setSalvando(true);
    try {
      await window.upsertProducaoMensal(companyId, null, p.competencia, p.convenio, Number(atend), p.valor_por_atend, true, 'ajustado manualmente');
      window.dispatchEvent(new Event('sb-data-hydrated'));
    } catch (e) { setAtend(p.atendimentos); }
    setSalvando(false); setEditando(false);
  };
  return (
    <tr style={{ borderTop: '1px solid var(--line)' }}>
      <td style={{ padding: '7px 8px' }}>{meses[parseInt(m)]}/{y.slice(2)}</td>
      <td style={{ padding: '7px 8px', fontWeight: 600 }}>{p.convenio}</td>
      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
        {editando
          ? <input type="number" value={atend} autoFocus onChange={e => setAtend(e.target.value)} onBlur={salvar}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              style={{ width: 70, textAlign: 'right', padding: '2px 6px', border: '1px solid var(--c-primary)', borderRadius: 4, fontFamily: 'inherit', fontSize: 12.5 }} />
          : <span className="mono" onClick={() => setEditando(true)} style={{ cursor: 'pointer', borderBottom: '1px dashed var(--ink-mute)' }}>{atend}</span>}
      </td>
      <td className="mono" style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--ink-mute)' }}>{window.fmt(p.valor_por_atend)}</td>
      <td className="mono" style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>{window.fmt(receb)}</td>
      <td style={{ padding: '7px 8px', fontSize: 11 }}>
        {salvando ? '...' : p.ajustado ? <span title={p.observacao} style={{ color: '#b8860b' }}>ajustado</span> : ''}
      </td>
    </tr>
  );
};

// ═══════════════════════════════════════════════════════
// MODAL — criar / editar um MOLDE recorrente
// ═══════════════════════════════════════════════════════
const RecorrenteModal = ({ record, onClose }) => {
  const { user, profile } = window.useAuth();
  const isNew = !record?.id;
  const [form, setForm] = React.useState(() => ({
    description: record?.description || '',
    category: record?.category || '',
    tipo: record?.tipo || 'pagar',
    previsto: record?.previsto || 0,
    dia_vencimento: record?.dia_vencimento || 10,
    data_inicio: record?.data_inicio || new Date().toISOString().slice(0, 10),
    data_fim: record?.data_fim || '',
    ativo: record?.ativo !== false,
  }));
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const cats = (window.APP_CATEGORIES?.[form.tipo === 'receber' ? 'entrada' : 'saida'] || []).filter(c => c.is_active !== false);

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true); setErr('');
    try {
      if (!form.description.trim()) throw new Error('Descreva o pagamento.');
      const payload = { ...form, data_fim: form.data_fim || null };
      if (isNew) {
        const cid = window.ACTIVE_COMPANY_ID || profile?.company_id;
        await window.createRecorrente(cid, user?.id, payload);
      } else {
        await window.updateRecorrente(record.id, payload);
      }
      window.dispatchEvent(new CustomEvent('sb-recorrentes-changed'));
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1600,
      background: 'oklch(0 0 0 / 0.45)', backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: 30, animation: 'fadeIn 0.2s ease both',
    }} onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--surface-solid)', borderRadius: 'var(--r-lg)', padding: 28, width: 'min(520px, 100%)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: 14, animation: 'popIn 0.3s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
            🔁 {isNew ? 'Novo' : 'Editar'} pagamento recorrente
          </h3>
          <button type="button" onClick={onClose} style={{ ...navBtn, width: 34, height: 34 }}>
            <Icon name="x" size={15} stroke={2.4} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Tipo">
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} style={editInput}>
              <option value="pagar">A pagar (saída)</option>
              <option value="receber">A receber (entrada)</option>
            </select>
          </FormField>
          <FormField label="Dia do vencimento">
            <input type="number" min="1" max="31" value={form.dia_vencimento} onChange={(e) => set('dia_vencimento', e.target.value)} style={editInput} />
          </FormField>
          <div style={{ gridColumn: 'span 2' }}>
            <FormField label="Descrição">
              <input value={form.description} onChange={(e) => set('description', e.target.value)} style={editInput} required placeholder="Ex: Financiamento Sicoob" />
            </FormField>
          </div>
          <FormField label="Categoria">
            <select value={form.category || ''} onChange={e => set('category', e.target.value)} style={editInput}>
              <option value="">— Selecione —</option>
              {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              {form.category && !cats.some(c => c.name === form.category) && <option value={form.category}>{form.category}</option>}
            </select>
          </FormField>
          <FormField label="Valor previsto">
            <MoneyInput value={form.previsto} onChange={(v) => set('previsto', v)} style={editInput} />
          </FormField>
          <FormField label="Começa em">
            <input type="date" value={form.data_inicio} onChange={(e) => set('data_inicio', e.target.value)} style={editInput} />
          </FormField>
          <FormField label="Até quando (opcional)">
            <input type="date" value={form.data_fim || ''} onChange={(e) => set('data_fim', e.target.value)} style={editInput} />
          </FormField>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>
              <input type="checkbox" checked={!!form.ativo} onChange={(e) => set('ativo', e.target.checked)} />
              Ativo (desmarque pra pausar sem excluir)
            </label>
          </div>
        </div>

        {err && <div style={{ fontSize: 13, color: 'var(--c-danger)', fontWeight: 500 }}>⚠ {err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Btn variant="secondary" onClick={onClose} type="button">Cancelar</Btn>
          <Btn variant="primary" icon="check" type="submit" disabled={saving}>{saving ? 'Salvando…' : isNew ? 'Criar' : 'Salvar'}</Btn>
        </div>
      </form>
    </div>
  );
};

const ContasPage = ({ filter, setFilter }) => {
  const [editing, setEditing] = React.useState(null);
  const [confirmando, setConfirmando] = React.useState(null);
  const [showReplicar, setShowReplicar] = React.useState(false);
  const [, tick] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => tick();
    window.addEventListener('sb-data-hydrated', h);
    return () => window.removeEventListener('sb-data-hydrated', h);
  }, []);
  const [status, setStatus] = React.useState('all');
  const [tipoView, setTipoView] = React.useState('todos');
  const [bancos, setBancos] = React.useState(null);
  const { profile: _prof } = window.useAuth();
  React.useEffect(() => {
    if (!_prof?.company_id || !window.fetchContasBancarias) return;
    window.fetchContasBancarias(_prof.company_id)
      .then(r => setBancos(window.saldosPorConta(r)))
      .catch(() => setBancos([]));
  }, [_prof?.company_id, (window.CONTAS || []).length]);

  // ── Recorrentes: molde + materialização do mês visível ──
  const [recorrentes, setRecorrentes] = React.useState([]);
  const [recEdit, setRecEdit] = React.useState(null);
  const [recOpen, setRecOpen] = React.useState(false);
  const matRef = React.useRef(new Set());

  const mesRef = (filter.mode === 'month' || filter.mode === 'ciclo')
    ? filter.month
    : (filter.from ? filter.from.slice(0, 7) : new Date().toISOString().slice(0, 7));

  const carregarRec = React.useCallback(() => {
    if (!_prof?.company_id) return;
    window.fetchRecorrentes(_prof.company_id).then(setRecorrentes).catch(() => {});
  }, [_prof?.company_id]);
  React.useEffect(() => { carregarRec(); }, [carregarRec]);
  React.useEffect(() => {
    const h = () => { matRef.current = new Set(); carregarRec(); };
    window.addEventListener('sb-recorrentes-changed', h);
    return () => window.removeEventListener('sb-recorrentes-changed', h);
  }, [carregarRec]);

  React.useEffect(() => {
    const cid = _prof?.company_id;
    if (!cid || !recorrentes.length) return;
    const soLeitura = window.ACTIVE_COMPANY_ID && window.HOME_COMPANY_ID && window.ACTIVE_COMPANY_ID !== window.HOME_COMPANY_ID;
    if (soLeitura) return;
    if (!(window.CONTAS || []).length) return;
    const chave = cid + '|' + mesRef;
    if (matRef.current.has(chave)) return;
    matRef.current.add(chave);
    (async () => {
      const [y, m] = mesRef.split('-').map(Number);
      const ultimoDia = new Date(y, m, 0).getDate();
      const inicioMes = `${mesRef}-01`;
      const fimMes = `${mesRef}-${String(ultimoDia).padStart(2, '0')}`;
      let criou = false;
      for (const r of recorrentes) {
        if (r.ativo === false) continue;
        if (r.data_inicio && r.data_inicio > fimMes) continue;
        if (r.data_fim && r.data_fim < inicioMes) continue;
        const jaTem = (window.CONTAS || []).some(c => c.recorrente_id === r.id && (c.vencimento || '').slice(0, 7) === mesRef);
        if (jaTem) continue;
        const dia = Math.min(Number(r.dia_vencimento) || 10, ultimoDia);
        const venc = `${mesRef}-${String(dia).padStart(2, '0')}`;
        try {
          const saved = await window.createConta({
            description: r.description, category: r.category, tipo: r.tipo,
            previsto: r.previsto, vencimento: venc, pago: false, recorrente_id: r.id,
          }, cid, _prof.id);
          const novo = {
            id: saved?.[0]?.id || ('rec-' + r.id + '-' + mesRef),
            tipo: r.tipo === 'receber' ? 'receber' : 'pagar',
            category: r.category || 'Geral', description: r.description,
            vencimento: venc, previsto: Number(r.previsto || 0), realizado: 0,
            pago: false, pagoEm: null, conta: null, recorrente_id: r.id,
          };
          window.CONTAS = [novo, ...(window.CONTAS || [])];
          criou = true;
        } catch (e) { console.warn('recorrente falhou:', r.description, e.message); matRef.current.delete(chave); }
      }
      if (criou) window.dispatchEvent(new CustomEvent('sb-data-hydrated'));
    })();
  }, [_prof?.company_id, mesRef, recorrentes, (window.CONTAS || []).length]);

  const excluirRec = async (r) => {
    if (!confirm(`Excluir o recorrente "${r.description}"? As contas já geradas continuam na lista.`)) return;
    try { await window.deleteRecorrente(r.id); window.dispatchEvent(new CustomEvent('sb-recorrentes-changed')); }
    catch (e) { alert('Erro: ' + e.message); }
  };
  const toggleRec = async (r) => {
    try { await window.updateRecorrente(r.id, { ativo: !(r.ativo !== false) }); window.dispatchEvent(new CustomEvent('sb-recorrentes-changed')); }
    catch (e) { alert('Erro: ' + e.message); }
  };

  const [q, setQ] = React.useState('');
  const contas = window.filterContas(
    filter.mode === 'month' ? { month: filter.month }
    : filter.mode === 'ciclo' ? { mode: 'ciclo', month: filter.month, corte: filter.corte }
    : { from: filter.from, to: filter.to });

  const saidasPeriodo = contas.filter(c => c.tipo === 'pagar' && !(window.ehTransferenciaInterna && window.ehTransferenciaInterna(c)));
  const somaPrev = (arr) => arr.reduce((s, c) => s + (c.previsto || 0), 0);
  const resumoPessoal = somaPrev(saidasPeriodo.filter(ehPessoal));
  const resumoContas  = somaPrev(saidasPeriodo.filter(c => !ehPessoal(c)));
  const nPessoal = saidasPeriodo.filter(ehPessoal).length;
  const nContas  = saidasPeriodo.filter(c => !ehPessoal(c)).length;

  const filtered = contas.filter(c => {
    if (tipoView === 'entradas' && c.tipo !== 'receber') return false;
    if (tipoView === 'contas'  && (c.tipo !== 'pagar' || ehPessoal(c))) return false;
    if (tipoView === 'pessoal' && (c.tipo !== 'pagar' || !ehPessoal(c))) return false;
    if (status === 'pendente' && c.pago) return false;
    if (q && !(c.description.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const semInterna = contas.filter(c => !(window.ehTransferenciaInterna && window.ehTransferenciaInterna(c)));
  const entradas = semInterna.filter(c => c.tipo === 'receber');
  const saidas   = semInterna.filter(c => c.tipo === 'pagar');
  const tot_prev_out = saidas.reduce((s, c) => s + c.previsto, 0);
  const tot_real_in  = entradas.reduce((s, c) => s + (c.pago ? (c.realizado || c.previsto) : 0), 0);
  const tot_real_out = saidas.reduce((s, c) => s + (c.pago ? (c.realizado || c.previsto) : 0), 0);
  const resultado = tot_real_in - tot_real_out;
  const aPagar = tot_prev_out - tot_real_out;

  const saldo_ant = filter.mode === 'month'
    ? window.saldoAnterior(filter.month)
    : (filter.from ? window.saldoAnterior(filter.from.slice(0, 7)) : 0);
  const saldo_periodo = saldo_ant + tot_real_in - tot_real_out;
  const mesAntLabel = (() => {
    const ref = filter.mode === 'month' ? filter.month : (filter.from || '').slice(0, 7);
    if (!ref) return 'mês anterior';
    const [y, m] = ref.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    return (window.months || [])[prev.getMonth()] + '/' + String(prev.getFullYear()).slice(2);
  })();

  const recAtivos = recorrentes.filter(r => r.ativo !== false).length;
  const totalBanco = (bancos || []).reduce((a, b) => a + b.saldo, 0);

  return (
    <div className="anim-fade">
      {showReplicar && <ReplicarPrestadoresModal onClose={() => setShowReplicar(false)} />}

      {/* ── Faixa azul ── */}
      <window.Band
        title="Contas"
        subtitle="O que entrou, o que saiu e o que falta pagar"
        right={
          <>
            <ExcelImporter target="contas" />
            <window.Btn variant="secondary" icon="copy" onBand onClick={() => setShowReplicar(true)}>Replicar</window.Btn>
            <window.Btn variant="primary" icon="plus" onBand onClick={() => setEditing({ tipo: 'pagar', pago: false, previsto: 0, realizado: 0 })}>Nova conta</window.Btn>
          </>
        }
        metricLabel="Resultado do mês"
        metric={resultado}
        stats={[
          { label: 'Entrou', value: tot_real_in, color: 'var(--on-accent-pos)' },
          { label: 'Saiu', value: tot_real_out, color: 'var(--on-accent-neg)' },
          { label: 'A pagar ainda', value: aPagar, color: 'var(--on-accent)' },
        ]}
      />

      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <window.FilterBar filter={filter} setFilter={setFilter} />

        {/* Saldo real nas contas */}
        {bancos && bancos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bancos.length + 1}, 1fr)`, gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
            {bancos.map(b => (
              <div key={b.id} style={{ background: 'var(--surface)', padding: '13px 16px' }}>
                <div style={{ font: '600 10px var(--f-sans)', color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nome}</div>
                <window.Money value={b.saldo} size="kpi" colorBySign style={{ marginTop: 3, display: 'block' }} />
              </div>
            ))}
            <div style={{ background: 'var(--accent-soft)', padding: '13px 16px' }}>
              <div style={{ font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--accent)' }}>Total disponível</div>
              <window.Money value={totalBanco} size="kpi" colorBySign style={{ marginTop: 3, display: 'block' }} />
            </div>
          </div>
        )}

        {/* Linha de contexto */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', font: '400 12px var(--f-sans)', color: 'var(--ink-2)' }}>
          <span>Vinha de <b className="mono" style={{ color: saldo_ant >= 0 ? 'var(--c-pos)' : 'var(--c-neg)' }}>{window.fmt(saldo_ant)}</b> até {mesAntLabel}</span>
          <span style={{ opacity: .3 }}>·</span>
          <span>acumulado agora <b className="mono" style={{ color: saldo_periodo >= 0 ? 'var(--c-pos)' : 'var(--c-neg)' }}>{window.fmt(saldo_periodo)}</b></span>
          <span style={{ marginLeft: 'auto', font: '400 10.5px var(--f-sans)', color: 'var(--ink-4)' }}>resultado acumulado — não é saldo bancário</span>
        </div>

        {/* Pagamentos recorrentes (colapsável) */}
        <window.Card padding={0}>
          <button onClick={() => setRecOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', cursor: 'pointer', background: 'none', border: 'none' }}>
            <window.Icon name="clock" size={16} style={{ color: 'var(--ink-3)' }} />
            <span style={{ font: '600 13px var(--f-sans)', color: 'var(--ink)' }}>Pagamentos recorrentes</span>
            <span style={{ font: '500 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>({recAtivos} ativo{recAtivos === 1 ? '' : 's'})</span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span onClick={(e) => { e.stopPropagation(); setRecEdit({}); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 'var(--r-md)', background: 'var(--accent)', color: '#fff', font: '600 11.5px var(--f-sans)' }}>
                <window.Icon name="plus" size={13} stroke={2.2} /> Novo
              </span>
              <window.Icon name="chevron_down" size={16} style={{ color: 'var(--ink-3)', transform: recOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur) var(--ease)' }} />
            </span>
          </button>
          {recOpen && (
            <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--line)' }}>
              {recorrentes.length === 0 ? (
                <div style={{ padding: '16px 0', color: 'var(--ink-3)', font: '400 12.5px var(--f-sans)' }}>
                  Nenhum pagamento fixo. Use "Novo" ou marque "Repetir todo mês" ao criar uma conta.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                  <thead>
                    <tr style={{ font: 'var(--t-label)', color: 'var(--ink-3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
                      <th style={{ padding: '8px 8px' }}>Descrição</th>
                      <th style={{ padding: '8px 8px' }}>Categoria</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center' }}>Dia</th>
                      <th style={{ padding: '8px 8px', textAlign: 'right' }}>Valor</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center' }}>Situação</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recorrentes.map(r => {
                      const ativo = r.ativo !== false;
                      return (
                        <tr key={r.id} style={{ borderTop: '1px solid var(--line-2)', opacity: ativo ? 1 : 0.5 }}>
                          <td style={{ padding: '9px 8px', font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>{r.tipo === 'receber' ? '↓ ' : ''}{r.description}</td>
                          <td style={{ padding: '9px 8px' }}>{r.category ? <window.CatPill cat={window.catColor(r.category, r.tipo==='pagar'?'saida':'entrada')}>{r.category}</window.CatPill> : '—'}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'center' }}><window.Money value={r.dia_vencimento} size="table" style={{ color: 'var(--ink-2)' }} /></td>
                          <td style={{ padding: '9px 8px', textAlign: 'right' }}><window.Money value={r.previsto} size="table" style={{ color: 'var(--ink)' }} /></td>
                          <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                            <window.Pill status={ativo ? 'pago' : 'pendente'}>{ativo ? 'Ativo' : 'Pausado'}</window.Pill>
                          </td>
                          <td style={{ padding: '9px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                              <window.IconBtn name="edit" size={28} onClick={() => setRecEdit(r)} title="Editar" />
                              <window.IconBtn name={ativo ? 'clock' : 'check'} size={28} onClick={() => toggleRec(r)} title={ativo ? 'Pausar' : 'Reativar'} />
                              <window.IconBtn name="trash" size={28} danger onClick={() => excluirRec(r)} title="Excluir" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </window.Card>

        {/* Filtros de escopo */}
        <window.Card padding={12}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { k: 'todos',   l: 'Tudo',          v: null },
              { k: 'pessoal', l: 'Colaboradores', v: resumoPessoal, n: nPessoal },
              { k: 'contas',  l: 'Fornecedores',  v: resumoContas,  n: nContas },
              { k: 'entradas',l: 'Entradas',      v: tot_real_in },
            ].map(x => {
              const on = tipoView === x.k;
              return (
                <button key={x.k} onClick={() => setTipoView(x.k)} style={{
                  padding: '7px 14px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
                  background: on ? 'var(--accent-soft)' : 'var(--field)',
                  color: on ? 'var(--accent)' : 'var(--ink-2)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`, transition: 'all var(--dur) var(--ease)',
                }}>
                  <div style={{ font: '600 12px var(--f-sans)' }}>{x.l}{x.n != null ? ` · ${x.n}` : ''}</div>
                  {x.v != null && <div className="mono" style={{ font: '500 11px var(--f-mono)', opacity: .8, marginTop: 1 }}>{window.fmt(x.v)}</div>}
                </button>
              );
            })}
            <window.Checkbox checked={status === 'pendente'} onChange={v => setStatus(v ? 'pendente' : 'all')} label="Só o que falta pagar" style={{ marginLeft: 4 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160, height: 34, background: 'var(--field)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-lg)', padding: '0 12px' }}>
              <window.Icon name="search" size={15} style={{ color: 'var(--ink-3)' }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" style={{ background: 'none', border: 'none', outline: 'none', flex: 1, font: '400 12.5px var(--f-sans)', color: 'var(--ink)' }} />
            </div>
          </div>
        </window.Card>

        {/* Tabela principal */}
        <window.Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ maxHeight: '64vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Vencimento', 'Descrição', 'Categoria', 'Previsto', 'Realizado', 'Status', ''].map((h, i) => (
                    <th key={i + h} style={{
                      textAlign: (i === 3 || i === 4 || i === 6) ? 'right' : 'left',
                      padding: '10px 20px', font: 'var(--t-label)', letterSpacing: 'var(--tracking-label)',
                      color: 'var(--ink-3)', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {saldo_ant !== 0 && (tipoView === 'todos' || tipoView === 'entradas') && (
                  <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                    <td style={{ padding: '10px 20px' }} className="mono"><span style={{ color: 'var(--ink-4)' }}>—</span></td>
                    <td style={{ padding: '10px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 'var(--r-lg)', background: 'var(--c-neutral-bg)', color: 'var(--c-neutral)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <window.Icon name="arrow_right" size={14} stroke={2.4} />
                        </div>
                        <span style={{ font: '600 12.5px var(--f-sans)', color: 'var(--ink-2)' }}>Saldo anterior ({mesAntLabel})</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 20px' }}><window.Pill status="pendente">Saldo</window.Pill></td>
                    <td style={{ padding: '10px 20px', textAlign: 'right' }} className="mono"><span style={{ color: 'var(--ink-4)' }}>—</span></td>
                    <td style={{ padding: '10px 20px', textAlign: 'right' }}><window.Money value={saldo_ant} size="table" colorBySign /></td>
                    <td style={{ padding: '10px 20px' }}><window.Pill status="pago">Transitado</window.Pill></td>
                    <td></td>
                  </tr>
                )}
                {filtered.map((c, i) => {
                  const catCor = window.catColor(c.category, c.tipo === 'pagar' ? 'saida' : 'entrada');
                  const diff = c.realizado - c.previsto;
                  const receber = c.tipo === 'receber';
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--line-2)', animation: `fadeIn 0.3s ease ${Math.min(i * 0.02, 0.6)}s both` }}>
                      <td style={{ padding: '10px 20px', font: '400 12px var(--f-mono)', color: 'var(--ink-2)' }}>{window.fmtDate(c.vencimento)}</td>
                      <td style={{ padding: '10px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 'var(--r-lg)', background: receber ? 'var(--c-pos-bg)' : 'var(--c-neg-bg)', color: receber ? 'var(--c-pos)' : 'var(--c-neg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <window.Icon name={receber ? 'arrow_down' : 'arrow_up'} size={14} stroke={2.4} />
                          </div>
                          <span style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>{c.description}</span>
                          {c.recorrente_id && <window.Icon name="clock" size={13} style={{ color: 'var(--ink-4)' }} />}
                        </div>
                      </td>
                      <td style={{ padding: '10px 20px' }}><window.CatPill cat={catCor}>{c.category}</window.CatPill></td>
                      <td style={{ padding: '10px 20px', textAlign: 'right' }}><window.Money value={c.previsto} size="table" style={{ color: 'var(--ink-2)' }} /></td>
                      <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                        {c.pago ? (
                          <div>
                            <window.Money value={c.realizado} size="table" colorBySign={false} style={{ color: receber ? 'var(--c-pos)' : 'var(--c-neg)', fontWeight: 600 }} />
                            {diff !== 0 && <div style={{ font: '400 9.5px var(--f-mono)', color: (receber ? diff > 0 : diff < 0) ? 'var(--c-pos)' : 'var(--c-neg)' }}>{diff >= 0 ? '+' : ''}{window.fmtShort(diff)}</div>}
                          </div>
                        ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 20px' }}>
                        <window.Pill status={c.pago ? 'pago' : 'hoje'}>{c.pago ? (receber ? 'Recebido' : 'Pago') : 'Pendente'}</window.Pill>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          {!c.pago && (
                            <button onClick={() => setConfirmando(c)} title={receber ? 'Confirmar recebimento' : 'Confirmar pagamento'}
                              style={{ width: 28, height: 28, borderRadius: 'var(--r-md)', background: 'var(--c-pos-bg)', color: 'var(--c-pos)', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer' }}>
                              <window.Icon name="check" size={14} stroke={2.5} />
                            </button>
                          )}
                          <RowActions onEdit={() => setEditing(c)} onDelete={() => { if (confirm(`Excluir "${c.description}"?`)) window.deleteContaLocal(c.id); }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 50 }}>
                <window.EmptyState icon="file" title="Nenhuma conta encontrada" hint="Ajuste os filtros ou lance uma nova conta." />
              </div>
            )}
          </div>
        </window.Card>
      </div>

      {editing && <EditModal kind="conta" record={editing} onClose={() => setEditing(null)} onSaved={() => tick()} />}
      {confirmando && <ConfirmarPagamentoModal conta={confirmando} onClose={() => setConfirmando(null)} onSaved={() => { setConfirmando(null); tick(); }} />}
      {recEdit !== null && <RecorrenteModal record={recEdit.id ? recEdit : null} onClose={() => setRecEdit(null)} />}
    </div>
  );
};

// ─── PÁGINA COMPRAS (caixa efetivo — lançamentos) ─────────────────
const ComprasPage = ({ filter, setFilter }) => {
  const [editing, setEditing] = React.useState(null);
  const [filterType, setFilterType] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [, tick] = React.useReducer(x => x + 1, 0);
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
    <div className="anim-fade">
      {/* ── Faixa azul ── */}
      <window.Band
        title="Compras"
        subtitle="Lançamentos efetivos do caixa — o que saiu de verdade"
        right={
          <>
            <ExcelImporter onImport={() => tick()} />
            <window.Btn variant="primary" icon="plus" onBand onClick={() => setEditing({ type: 'saida', amount: 0 })}>Nova compra</window.Btn>
          </>
        }
        metricLabel="Total gasto em compras"
        metric={total_out}
      />

      <div style={{ padding: '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <window.FilterBar filter={filter} setFilter={setFilter} />

        {/* Busca + filtro tipo */}
        <window.Card padding={12}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, height: 34, background: 'var(--field)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-lg)', padding: '0 12px' }}>
              <window.Icon name="search" size={15} style={{ color: 'var(--ink-3)' }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição ou categoria…"
                style={{ background: 'none', border: 'none', outline: 'none', flex: 1, font: '400 12.5px var(--f-sans)', color: 'var(--ink)' }} />
            </div>
            <window.Segmented
              options={[{ value: 'all', label: 'Todas' }, { value: 'entrada', label: 'Entradas' }, { value: 'saida', label: 'Saídas' }]}
              value={filterType} onChange={setFilterType} />
          </div>
        </window.Card>

        {/* Tabela */}
        <window.Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Data', 'Descrição', 'Categoria', 'Método', 'Valor', ''].map((h, i) => (
                    <th key={i + h} style={{
                      textAlign: (i === 4 || i === 5) ? 'right' : 'left',
                      padding: '10px 20px', font: 'var(--t-label)', letterSpacing: 'var(--tracking-label)',
                      color: 'var(--ink-3)', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const receber = t.type === 'entrada';
                  const catCor = window.catColor ? window.catColor(t.category, receber ? 'entrada' : 'saida') : (t.color || 'var(--cat-8)');
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--line-2)', animation: `fadeIn 0.3s ease ${Math.min(i * 0.02, 0.6)}s both` }}>
                      <td style={{ padding: '10px 20px', font: '400 12px var(--f-mono)', color: 'var(--ink-2)' }}>{window.fmtDate(t.date)}</td>
                      <td style={{ padding: '10px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 'var(--r-lg)', background: receber ? 'var(--c-pos-bg)' : 'var(--c-neg-bg)', color: receber ? 'var(--c-pos)' : 'var(--c-neg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <window.Icon name={receber ? 'arrow_down' : 'arrow_up'} size={14} stroke={2.4} />
                          </div>
                          <span style={{ font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>{t.description}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 20px' }}><window.CatPill cat={catCor}>{t.category}</window.CatPill></td>
                      <td style={{ padding: '10px 20px', font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>{t.paymentMethod}</td>
                      <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                        <span className="mono" style={{ font: '600 12.5px var(--f-mono)', color: receber ? 'var(--c-pos)' : 'var(--c-neg)' }}>
                          {receber ? '+' : '−'} {window.fmt(t.amount)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <RowActions
                          onEdit={() => setEditing(t)}
                          onDelete={() => { if (confirm(`Excluir "${t.description}"?`)) window.deleteCompraLocal(t.id); }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 50 }}>
                <window.EmptyState icon="tag" title="Nenhuma compra encontrada" hint="Ajuste os filtros ou lance uma nova compra." />
              </div>
            )}
          </div>
        </window.Card>
      </div>
      {editing && <EditModal kind="compra" record={editing} onClose={() => setEditing(null)} onSaved={() => tick()} />}
    </div>
  );
};

// KPI card reusável
const KPI = ({ label, value, color, icon, subtle, emphasis, format }) => (
  <TiltCard glowColor={color} padding={14} style={emphasis ? { outline: `2px solid ${color}`, outlineOffset: -2 } : {}}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 10.5, color: 'var(--ink-mute)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: `color-mix(in oklch, ${color} 16%, transparent)`, color, display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={14} stroke={2.2} />
      </div>
    </div>
    <Counter value={value} format={format || ((n) => window.fmt(n))} className="mono"
      style={{ fontSize: subtle ? 18 : 21, fontWeight: 700, color: emphasis ? color : 'var(--ink)', letterSpacing: -0.5 }} />
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
  // Usa a empresa ATIVA (segue o seletor de empresa) e bate com get_my_company_id()
  // da policy do Supabase. Sem isso, criar categoria dá 403 quando o profile
  // está com company_id diferente do que está selecionado.
  const companyId = window.ACTIVE_COMPANY_ID || profile?.company_id;
  const [cats, setCats] = React.useState({ entrada: [], saida: [] });
  const [loading, setLoading] = React.useState(true);
  const [novaEntrada, setNovaEntrada] = React.useState('');
  const [novaSaida, setNovaSaida] = React.useState('');
  const [corEntrada, setCorEntrada] = React.useState(PRESET_COLORS[0]);
  const [corSaida, setCorSaida] = React.useState(PRESET_COLORS[3]);
  const [saving, setSaving] = React.useState(false);

  const carregar = React.useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
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

Object.assign(window, { ContasPage, ProjecaoPage, ComprasPage, PacientesPage, AgendaPage, ConfigPage, PageHeader, FilterBar, ExcelImporter, KPI });

window.ImpostosPage = ImpostosPage;
