// ═══════════════════════════════════════════════════════════════
// CONCILIAÇÃO BANCÁRIA (nível 3 — transação a transação)
// Cruza transações trazidas pelas integrações (MP/Inter, categoria
// "A Classificar") com as contas lançadas manualmente no sistema.
// Casamento: mesmo VALOR + mesma DATA + mesmo TIPO (entrada/saída).
// ═══════════════════════════════════════════════════════════════
const { useState: useStateCC, useEffect: useEffectCC, useMemo: useMemoCC } = React;

const ConciliacaoPage = ({ embedded = false, onExport } = {}) => {
  const { profile } = window.useAuth();
  const companyId = window.ACTIVE_COMPANY_ID || profile?.company_id;
  const [rows, setRows] = useStateCC(null);
  const [loading, setLoading] = useStateCC(true);
  const [erro, setErro] = useStateCC(null);
  const [aba, setAba] = useStateCC('nao_banco'); // conciliados | nao_banco | nao_sistema
  const [mes, setMes] = useStateCC(''); // filtro opcional YYYY-MM
  const [, tick] = React.useReducer(x => x + 1, 0);

  const carregar = React.useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true); setErro(null);
    try {
      const base = window.SUPABASE_URL + '/rest/v1/transactions?company_id=eq.' + companyId + '&select=*&order=date.desc&limit=2000';
      const h = { apikey: window.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (window.getSession?.()?.access_token || window.SUPABASE_ANON_KEY) };
      const data = await fetch(base, { headers: h }).then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  }, [companyId]);
  useEffectCC(() => { carregar(); }, [carregar]);

  // separa transações do banco (integração) das contas do sistema
  const ehDoBanco = (r) => /a classificar/i.test(r.category || '');
  const ehTransferencia = (r) => /transfer/i.test(r.category || '');

  const { conciliados, soBanco, soSistema } = useMemoCC(() => {
    if (!rows) return { conciliados: [], soBanco: [], soSistema: [] };
    const filtroMes = (r) => !mes || (r.date || '').startsWith(mes);

    const banco = rows.filter(r => ehDoBanco(r) && filtroMes(r));
    // sistema = contas reais (não banco, não transferência interna), já efetivadas
    const sistema = rows.filter(r => !ehDoBanco(r) && !ehTransferencia(r) && filtroMes(r)
      && (r.status === 'pago' || r.status === 'recebido'));

    // matching: valor exato + mesma data + mesmo tipo. Consome contas já usadas.
    const usadasSistema = new Set();
    const conc = [];
    const soB = [];
    for (const b of banco) {
      const val = Number(b.actual_value ?? b.value ?? 0);
      const idx = sistema.findIndex((s, i) =>
        !usadasSistema.has(i) &&
        Number(s.actual_value ?? s.value ?? 0) === val &&
        (s.date || '') === (b.date || '') &&
        s.type === b.type
      );
      if (idx >= 0) { usadasSistema.add(idx); conc.push({ banco: b, sistema: sistema[idx] }); }
      else soB.push(b);
    }
    const soS = sistema.filter((_, i) => !usadasSistema.has(i));
    return { conciliados: conc, soBanco: soB, soSistema: soS };
  }, [rows, mes]);

  const brl = (v) => window.fmt(Number(v) || 0);
  const fmtD = (d) => d ? d.split('-').reverse().slice(0, 2).join('/') : '—';

  // ── Exportar para Excel (para a contabilidade) ──
  const exportarExcel = React.useCallback(() => {
    if (!window.XLSX) { alert('Biblioteca XLSX não carregada.'); return; }
    const wb = window.XLSX.utils.book_new();
    const money = (v) => +(Number(v) || 0).toFixed(2);

    const abaNaoBanco = soBanco.map(r => ({
      Data: r.date, Descrição: r.description || '', Origem: r.category || '',
      Tipo: r.type === 'entrada' ? 'Entrada' : 'Saída', Valor: money(r.actual_value ?? r.value),
      Situação: 'Não classificada / sem correspondência no sistema',
    }));
    const abaConciliadas = conciliados.map(c => ({
      Data: c.banco.date, 'Descrição (banco)': c.banco.description || '',
      'Descrição (sistema)': c.sistema.description || '', Categoria: c.sistema.category || '',
      Tipo: c.banco.type === 'entrada' ? 'Entrada' : 'Saída', Valor: money(c.banco.actual_value ?? c.banco.value),
      Situação: 'Conciliada',
    }));
    const abaSoSistema = soSistema.map(r => ({
      Data: r.date, Descrição: r.description || '', Categoria: r.category || '', Conta: r.conta || '',
      Tipo: r.type === 'entrada' ? 'Entrada' : 'Saída', Valor: money(r.actual_value ?? r.value),
      Situação: 'Lançada no sistema, sem correspondência no banco',
    }));

    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(abaNaoBanco.length ? abaNaoBanco : [{ Aviso: 'Nada a classificar' }]), 'Nao classificadas');
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(abaConciliadas.length ? abaConciliadas : [{ Aviso: 'Nada conciliado' }]), 'Conciliadas');
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(abaSoSistema.length ? abaSoSistema : [{ Aviso: 'Sem divergencias' }]), 'So no sistema');
    const sufixo = mes ? '_' + mes : '';
    window.XLSX.writeFile(wb, 'Conciliacao_Bancaria' + sufixo + '.xlsx');
  }, [soBanco, conciliados, soSistema, mes]);

  // expõe o export pro pai (RelatoriosPage) quando embutido
  React.useEffect(() => { if (onExport) onExport(() => exportarExcel); }, [exportarExcel, onExport]);

  const totalBanco = soBanco.reduce((s, r) => s + Number(r.actual_value ?? r.value ?? 0) * (r.type === 'saida' ? -1 : 1), 0);
  const totalConc = conciliados.length;

  // meses disponíveis
  const meses = useMemoCC(() => {
    if (!rows) return [];
    const set = new Set(rows.map(r => (r.date || '').slice(0, 7)).filter(Boolean));
    return [...set].sort().reverse();
  }, [rows]);

  const classificar = async (transacao) => {
    // abre um prompt simples de categoria (evolução: modal). Por ora, marca com categoria escolhida.
    const cat = prompt('Classificar esta transação como qual categoria?\n(ex: Convênios, Repasses, Aluguel, Outras Despesas)', '');
    if (!cat) return;
    try {
      const base = window.SUPABASE_URL + '/rest/v1/transactions?id=eq.' + transacao.id;
      const h = { apikey: window.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (window.getSession?.()?.access_token || window.SUPABASE_ANON_KEY), 'Content-Type': 'application/json', Prefer: 'return=representation' };
      await fetch(base, { method: 'PATCH', headers: h, body: JSON.stringify({ category: cat.trim() }) });
      await carregar();
    } catch (e) { alert('Erro: ' + e.message); }
  };

  const abas = [
    { k: 'nao_banco', label: 'Não classificadas', n: soBanco.length, cor: 'var(--c-warn)' },
    { k: 'conciliados', label: 'Conciliadas', n: conciliados.length, cor: 'var(--c-pos)' },
    { k: 'nao_sistema', label: 'Só no sistema', n: soSistema.length, cor: 'var(--c-neg)' },
  ];

  return (
    <div className="anim-fade">
      {!embedded && (
        <window.Band
          title="Conciliação bancária"
          subtitle="Cruza o que os bancos (MP/Inter) trouxeram com o que foi lançado no sistema"
          metricLabel="Transações a classificar"
          metric={String(soBanco.length)}
          stats={[
            { label: 'Conciliadas', value: String(conciliados.length), color: 'var(--on-accent-pos)' },
            { label: 'Só no sistema', value: String(soSistema.length), color: soSistema.length ? 'var(--on-accent-neg)' : 'var(--on-accent)' },
            { label: 'Movimento a classificar', value: brl(Math.abs(totalBanco)), color: 'var(--on-accent)' },
          ]}
        />
      )}

      <div style={{ padding: embedded ? 0 : '20px 30px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* filtros */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <window.Segmented
            options={abas.map(a => ({ value: a.k, label: `${a.label} (${a.n})` }))}
            value={aba} onChange={setAba} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <window.Icon name="calendar" size={15} style={{ color: 'var(--ink-3)' }} />
            <select value={mes} onChange={e => setMes(e.target.value)} style={{ ...window.inputStyle, width: 'auto', height: 32, cursor: 'pointer' }}>
              <option value="">Todos os meses</option>
              {meses.map(m => <option key={m} value={m}>{window.monthLabel ? window.monthLabel(m) : m}</option>)}
            </select>
            <window.Btn variant="secondary" size="sm" icon="file" onClick={exportarExcel}>Baixar Excel</window.Btn>
          </div>
        </div>

        {/* explicação da aba */}
        <div style={{ display: 'flex', gap: 11, padding: '12px 16px', borderRadius: 'var(--r-lg)', background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)', alignItems: 'flex-start' }}>
          <window.Icon name="help" size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ font: '400 11.5px var(--f-sans)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {aba === 'nao_banco' && <>Transações que os bancos trouxeram mas ainda estão como "A Classificar" e não casaram com nenhuma conta lançada. <b>Classifique cada uma</b> ou lance a conta correspondente.</>}
            {aba === 'conciliados' && <>Transações do banco que <b>bateram</b> com uma conta do sistema (mesmo valor, mesma data). Estão certas — o banco e o sistema concordam.</>}
            {aba === 'nao_sistema' && <>Contas que você lançou como pagas/recebidas mas <b>o banco não trouxe</b> transação correspondente. Pode ser divergência de valor, data, ou lançamento a revisar.</>}
          </div>
        </div>

        {loading ? (
          <window.Card padding={48}><div style={{ textAlign: 'center', color: 'var(--ink-3)', font: '500 13px var(--f-sans)' }}>Carregando transações…</div></window.Card>
        ) : erro ? (
          <window.Card padding={40}><window.EmptyState icon="alert" title="Erro ao carregar" hint={erro} /></window.Card>
        ) : (
          <>
            {/* ABA: Não classificadas (só no banco) */}
            {aba === 'nao_banco' && (
              <window.Card padding={0} style={{ overflow: 'hidden' }}>
                {soBanco.length === 0 ? (
                  <div style={{ padding: 40 }}><window.EmptyState icon="check" title="Tudo conciliado!" hint="Nenhuma transação do banco pendente de classificação." /></div>
                ) : (
                  <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          {['Data', 'Descrição', 'Origem', 'Tipo', 'Valor', ''].map((h, i) => (
                            <th key={h + i} style={{ padding: '10px 16px', textAlign: (i === 4 || i === 5) ? 'right' : 'left', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {soBanco.map((r, i) => {
                          const entrada = r.type === 'entrada';
                          return (
                            <tr key={r.id || i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                              <td style={{ padding: '10px 16px', font: '400 12px var(--f-mono)', color: 'var(--ink-2)' }} className="mono">{fmtD(r.date)}</td>
                              <td style={{ padding: '10px 16px', font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>{r.description || '—'}</td>
                              <td style={{ padding: '10px 16px' }}><window.CatPill cat="var(--c-warn)">{r.category}</window.CatPill></td>
                              <td style={{ padding: '10px 16px', font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>{entrada ? 'Entrada' : 'Saída'}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                <span className="mono" style={{ font: '600 12.5px var(--f-mono)', color: entrada ? 'var(--c-pos)' : 'var(--c-neg)' }}>{entrada ? '+' : '−'} {brl(r.actual_value ?? r.value)}</span>
                              </td>
                              <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                <window.Btn variant="secondary" size="sm" icon="tag" onClick={() => classificar(r)}>Classificar</window.Btn>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </window.Card>
            )}

            {/* ABA: Conciliadas */}
            {aba === 'conciliados' && (
              <window.Card padding={0} style={{ overflow: 'hidden' }}>
                {conciliados.length === 0 ? (
                  <div style={{ padding: 40 }}><window.EmptyState icon="infinity" title="Nada conciliado ainda" hint="Quando uma transação do banco casar com uma conta lançada, aparece aqui." /></div>
                ) : (
                  <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          {['Data', 'No banco', 'No sistema', 'Valor', 'Status'].map((h, i) => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: i === 3 ? 'right' : 'left', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {conciliados.map((c, i) => {
                          const entrada = c.banco.type === 'entrada';
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                              <td style={{ padding: '10px 16px', font: '400 12px var(--f-mono)', color: 'var(--ink-2)' }} className="mono">{fmtD(c.banco.date)}</td>
                              <td style={{ padding: '10px 16px', font: '400 12px var(--f-sans)', color: 'var(--ink-3)' }}>{c.banco.description || '—'}</td>
                              <td style={{ padding: '10px 16px', font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>{c.sistema.description}{c.sistema.category && <span style={{ font: '400 10.5px var(--f-sans)', color: 'var(--ink-3)', marginLeft: 6 }}>· {c.sistema.category}</span>}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right' }}><span className="mono" style={{ font: '600 12.5px var(--f-mono)', color: entrada ? 'var(--c-pos)' : 'var(--c-neg)' }}>{entrada ? '+' : '−'} {brl(c.banco.actual_value ?? c.banco.value)}</span></td>
                              <td style={{ padding: '10px 16px' }}><window.Pill status="pago">Conciliada</window.Pill></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </window.Card>
            )}

            {/* ABA: Só no sistema */}
            {aba === 'nao_sistema' && (
              <window.Card padding={0} style={{ overflow: 'hidden' }}>
                {soSistema.length === 0 ? (
                  <div style={{ padding: 40 }}><window.EmptyState icon="check" title="Nenhuma divergência" hint="Toda conta lançada tem correspondente no banco." /></div>
                ) : (
                  <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          {['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor'].map((h, i) => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: i === 5 ? 'right' : 'left', font: 'var(--t-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', color: 'var(--ink-3)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {soSistema.map((r, i) => {
                          const entrada = r.type === 'entrada';
                          return (
                            <tr key={r.id || i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                              <td style={{ padding: '10px 16px', font: '400 12px var(--f-mono)', color: 'var(--ink-2)' }} className="mono">{fmtD(r.date)}</td>
                              <td style={{ padding: '10px 16px', font: '500 12.5px var(--f-sans)', color: 'var(--ink)' }}>{r.description}</td>
                              <td style={{ padding: '10px 16px', font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>{r.category}</td>
                              <td style={{ padding: '10px 16px', font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>{r.conta || '—'}</td>
                              <td style={{ padding: '10px 16px', font: '400 11.5px var(--f-sans)', color: 'var(--ink-3)' }}>{entrada ? 'Entrada' : 'Saída'}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right' }}><span className="mono" style={{ font: '600 12.5px var(--f-mono)', color: entrada ? 'var(--c-pos)' : 'var(--c-neg)' }}>{entrada ? '+' : '−'} {brl(r.actual_value ?? r.value)}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </window.Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

window.ConciliacaoPage = ConciliacaoPage;
