// ═══════════════════════════════════════════════════════════════════════════
// Infinity — Ajuda / Tutoriais
// UM lugar só com o "como usar" de cada tela. Alimenta:
//   • AjudaBanner  — caixa contextual no topo de cada tela (app.jsx injeta)
//   • AjudaPage    — a aba "Ajuda" com todos os tutoriais + glossário
// Sem estado no banco: usa localStorage só pra lembrar qual caixa foi dispensada.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Conteúdo dos tutoriais (fiel ao que cada tela faz hoje) ───────────────
const AJUDA = {
  dashboard: {
    titulo: 'Dashboard',
    resumo: 'O panorama do mês num relance: quanto entrou, quanto saiu e o resultado.',
    passos: [
      'Escolha o mês ou o período no filtro do topo.',
      'Os cartões mostram os números-chave já filtrados por esse período.',
    ],
    dicas: ['É visão geral. Para ver lançamento por lançamento, vá em Contas ou Compras.'],
    cuidado: [],
  },
  caixa: {
    titulo: 'Caixa — Particular',
    resumo: 'Onde a recepção lança os atendimentos particulares do dia (o que entrou de verdade).',
    passos: [
      'Selecione o profissional e o paciente.',
      'Digite o valor recebido no atendimento.',
      'Salve. Pronto — fica registrado com data e quem lançou.',
    ],
    dicas: ['A recepção só enxerga esta tela e o Dashboard — os valores de repasse ficam invisíveis pra ela.'],
    cuidado: [
      'Lance sempre pelo NOME do paciente e só o que REALMENTE entrou no caixa.',
      'É este lançamento que o Repasse cruza no fim do mês para pagar o particular do profissional.',
    ],
  },
  contas: {
    titulo: 'Contas',
    resumo: 'O que entrou, o que saiu e o que ainda falta pagar no mês.',
    passos: [
      'Escolha o período no filtro: mês fechado ou modo Ciclo.',
      'Os três números grandes são Entrou, Saiu e Resultado.',
      'Use os filtros de baixo para ver só entradas, só saídas ou o que falta pagar.',
    ],
    dicas: [
      'Modo Ciclo corta do dia 25 ao 24 e mostra o resultado operacional REAL — o mês-calendário distorce por causa de quando o convênio cai.',
    ],
    cuidado: [
      'O Resultado NÃO é o saldo bancário. É "entrou menos saiu" no período. Para o dinheiro real em cada conta, veja o painel de saldos.',
    ],
  },
  projecao: {
    titulo: 'Projeção de Caixa',
    resumo: 'Quanto vai entrar e sair nas próximas semanas, com base na produção que já aconteceu.',
    passos: [
      'A tela projeta sozinha: usa a produção já lançada e as saídas fixas (folha, repasse, aluguel, impostos).',
      'Os 4 cartões são cenários: Otimista (+10%), Base, Cauteloso (−10%) e Pessimista (−20%).',
      'Passe o mouse no gráfico para ver o saldo dia a dia.',
    ],
    dicas: [
      'Recebimento entra na data certa: Unimed no fim do mês seguinte, NDI no dia 15 do segundo mês. Por isso a projeção não é linear.',
      'Se um mês ficou subcontado (ex.: maio, por causa da migração de sistema), corrija na tabela de ajuste da produção.',
    ],
    cuidado: [
      'A projeção para onde o dado confiável acaba — ela não inventa receita futura só para preencher o gráfico.',
    ],
  },
  impostos: {
    titulo: 'Impostos',
    resumo: 'As guias de tributo do Lucro Presumido: o que vence, quanto e o que já foi pago.',
    passos: [
      'Cadastre cada guia com o valor previsto (ex.: "DARF COFINS Mai/2026").',
      'Quando pagar, preencha o valor realizado.',
      'Use a busca para achar uma guia específica.',
    ],
    dicas: ['Acompanhar previsto x realizado evita surpresa de guia esquecida.'],
    cuidado: [],
  },
  repasse: {
    titulo: 'Repasse',
    resumo: 'O motor: importa a produção, cruza com o caixa e fecha o mês de cada profissional.',
    passos: [
      'Aba Fechamento: importe o relatório de agendamento (CSV ou XLSX).',
      'O motor aplica tarifa + imposto (13,33%) + split + holding e SOMA o particular que a recepção lançou no Caixa.',
      'Confira as pendências que aparecem antes do número.',
      'Clique em "Salvar fechamento" — ele também cai na aba Pagamentos.',
    ],
    dicas: [
      'Aba Regras: o percentual e o holding de cada profissional. Aba Tarifas: o valor de cada convênio.',
      'A lista de profissionais vem do RH — profissional novo precisa estar cadastrado lá antes.',
    ],
    cuidado: [
      'Se aparecer "sem regra de repasse cadastrada", cadastre em Repasse › Regras antes de fechar o mês.',
    ],
  },
  compras: {
    titulo: 'Compras',
    resumo: 'Os lançamentos efetivos do caixa — o que entrou e saiu de verdade.',
    passos: [
      'Lance ou importe as movimentações reais do período.',
      'Busque por descrição ou categoria para achar um lançamento.',
    ],
    dicas: ['Diferença para Contas: aqui é o realizado, o que de fato passou pelo caixa.'],
    cuidado: [
      'Categoria certa importa: é ela que faz o DRE e a recategorização de despesas baterem.',
    ],
  },
  agenda: {
    titulo: 'Agenda',
    resumo: 'O que vence nos próximos 7 dias, para nenhuma data passar batido.',
    passos: ['Olhe a lista de vencimentos da semana e programe os pagamentos.'],
    dicas: [],
    cuidado: [],
  },
  relatorios: {
    titulo: 'Relatórios',
    resumo: 'Exporta os relatórios do mês em planilha, prontos para enviar ou arquivar.',
    passos: [
      'DRE (Excel): resultado do mês em duas colunas — Competência (produção) e Caixa (o que entrou/saiu).',
      'Fluxo de Caixa: saldo acumulado mês a mês, já com o saldo anterior.',
      'Receita por Convênio: ranking de repasses, previsto x realizado.',
      'Extrato de Contas: tudo do mês selecionado.',
    ],
    dicas: ['Onde pedir o mês, escolha o mês antes de clicar no relatório.'],
    cuidado: [],
  },
  rh: {
    titulo: 'RH',
    resumo: 'O cadastro dos colaboradores e profissionais do grupo.',
    passos: ['Cadastre nome e papel de cada colaborador.'],
    dicas: ['É daqui que o Repasse puxa a lista de profissionais — cadastre o novo aqui primeiro.'],
    cuidado: [],
  },
  equipe: {
    titulo: 'Equipe',
    resumo: 'Os usuários que acessam o sistema e o papel (nível de acesso) de cada um.',
    passos: ['Defina se a pessoa é admin, editor ou recepção.'],
    dicas: [],
    cuidado: [
      'Recepção (viewer) só vê Caixa e Dashboard — não enxerga Repasse, Contas nem Impostos. Isso protege os valores.',
    ],
  },
  perfil: {
    titulo: 'Meu perfil',
    resumo: 'Seus dados e sua foto no sistema.',
    passos: ['Edite seus dados e salve.'],
    dicas: [],
    cuidado: [],
  },
  config: {
    titulo: 'Configurações',
    resumo: 'Categorias, conta e preferências do sistema.',
    passos: [
      'Crie ou ative as categorias de entrada e de saída.',
      'Ajuste a conta e as preferências.',
    ],
    dicas: ['Categoria bem definida é o que faz o DRE e a recategorização de despesas ficarem certos.'],
    cuidado: [],
  },
};

// ─── Glossário: os conceitos que se repetem no sistema ─────────────────────
const AJUDA_GLOSSARIO = [
  {
    termo: 'Competência x Caixa',
    texto: 'Competência é QUANDO o atendimento aconteceu (a produção do mês). Caixa é QUANDO o dinheiro entrou ou saiu de verdade. O convênio de maio, por exemplo, é competência de maio mas cai no caixa lá na frente. O DRE mostra as duas colunas lado a lado.',
  },
  {
    termo: 'Ciclo (corte dia 25 → 24)',
    texto: 'O mês-calendário engana porque o convênio cai no fim do mês. Cortar do dia 25 do mês anterior ao dia 24 do atual junta a produção com o recebimento dela e mostra o resultado operacional real. Foi o que revelou que julho era positivo, não negativo.',
  },
  {
    termo: 'Contas-ponte (Investimentos e Negócios)',
    texto: 'As contas Sicoob Investimentos (paga médicos) e Negócios (paga psicólogas) são só passagem: o dinheiro entra e sai como repasse. Transferir para elas NÃO é despesa — se contar como despesa, o repasse é contado duas vezes.',
  },
  {
    termo: 'Como o repasse é calculado',
    texto: 'Sobre o valor bruto: primeiro desconta o imposto (13,33% na psiquiatria/psicologia), depois aplica o split (a divisão médico/clínica, ex.: 63/37) e por fim o desconto fixo de holding, quando o profissional tem. O particular entra pelo que a recepção lançou no Caixa.',
  },
  {
    termo: 'Ciclo de recebimento dos convênios',
    texto: 'Unimed: atende no mês M, recebe no fim do mês seguinte (M+1). NDI: atende em M, recebe no dia 15 do segundo mês (M+2). Por isso comparar "o que entrou mês a mês" não compara a mesma produção — a Projeção já respeita esses prazos.',
  },
  {
    termo: 'Transferência interna ≠ despesa',
    texto: 'Movimentação entre as contas do próprio grupo (as 5 contas) não é gasto nem receita — é dinheiro trocando de bolso. Sempre fica de fora da análise para não inflar despesa ou receita.',
  },
];

// ─── estilos base ──────────────────────────────────────────────────────────
const ajCard = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderLeft: '3px solid var(--accent)',
  borderRadius: 'var(--r-md)',
  padding: '12px 14px',
};
const ajLista = { margin: '6px 0 0', paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 };

// ─── Caixa de ajuda contextual (topo de cada tela) ─────────────────────────
const AjudaBanner = ({ page }) => {
  const info = AJUDA[page];
  const chave = 'infinity-ajuda-hide-' + page;
  const [aberto, setAberto] = React.useState(false);
  const [oculto, setOculto] = React.useState(() => localStorage.getItem(chave) === '1');
  if (!info || oculto) return null;

  const temDetalhe = (info.passos && info.passos.length) || (info.dicas && info.dicas.length) || (info.cuidado && info.cuidado.length);

  const dispensar = () => { localStorage.setItem(chave, '1'); setOculto(true); };

  return (
    <div style={{ ...ajCard, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}>
          <window.Icon name="help" size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
            <b>{info.titulo}.</b> <span style={{ color: 'var(--ink-soft)' }}>{info.resumo}</span>
          </div>
          {aberto && temDetalhe && (
            <div style={{ marginTop: 8 }}>
              {info.passos && info.passos.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)', marginTop: 6 }}>COMO USAR</div>
                  <ol style={ajLista}>{info.passos.map((p, i) => <li key={i}>{p}</li>)}</ol>
                </>
              )}
              {info.dicas && info.dicas.length > 0 && (
                <ul style={{ ...ajLista, listStyle: 'none', paddingLeft: 0, marginTop: 8 }}>
                  {info.dicas.map((d, i) => <li key={i}>💡 {d}</li>)}
                </ul>
              )}
              {info.cuidado && info.cuidado.length > 0 && (
                <ul style={{ ...ajLista, listStyle: 'none', paddingLeft: 0, marginTop: 6, color: 'var(--c-warning)' }}>
                  {info.cuidado.map((c, i) => <li key={i}>⚠️ {c}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {temDetalhe && (
            <button onClick={() => setAberto(a => !a)} style={ajBtnLink}>
              {aberto ? 'Recolher ▲' : 'Como usar ▾'}
            </button>
          )}
          <button onClick={dispensar} title="Não mostrar aqui" style={{ ...ajBtnLink, color: 'var(--ink-mute)' }}>✕</button>
        </div>
      </div>
    </div>
  );
};
const ajBtnLink = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, padding: '2px 4px', whiteSpace: 'nowrap',
};

// ─── Aba Ajuda (todos os tutoriais + glossário) ────────────────────────────
const AjudaTelaCard = ({ chave, info }) => {
  const [aberto, setAberto] = React.useState(false);
  const temDetalhe = (info.passos && info.passos.length) || (info.dicas && info.dicas.length) || (info.cuidado && info.cuidado.length);
  return (
    <div style={{ ...ajCard, borderLeftColor: 'var(--accent)', padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setAberto(a => !a)} style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
        padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{info.titulo}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-mute)', display: 'block', marginTop: 2 }}>{info.resumo}</span>
        </span>
        <span style={{ color: 'var(--ink-mute)', flexShrink: 0, fontSize: 12, fontWeight: 600 }}>{aberto ? '▲' : '▾'}</span>
      </button>
      {aberto && temDetalhe && (
        <div style={{ padding: '0 15px 14px', borderTop: '1px solid var(--line)' }}>
          {info.passos && info.passos.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)', marginTop: 12 }}>COMO USAR</div>
              <ol style={ajLista}>{info.passos.map((p, i) => <li key={i}>{p}</li>)}</ol>
            </>
          )}
          {info.dicas && info.dicas.length > 0 && (
            <ul style={{ ...ajLista, listStyle: 'none', paddingLeft: 0, marginTop: 10 }}>
              {info.dicas.map((d, i) => <li key={i} style={{ marginBottom: 3 }}>💡 {d}</li>)}
            </ul>
          )}
          {info.cuidado && info.cuidado.length > 0 && (
            <ul style={{ ...ajLista, listStyle: 'none', paddingLeft: 0, marginTop: 8, color: 'var(--c-warning)' }}>
              {info.cuidado.map((c, i) => <li key={i} style={{ marginBottom: 3 }}>⚠️ {c}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const AjudaPage = () => {
  const ordem = ['dashboard', 'caixa', 'contas', 'projecao', 'impostos', 'repasse', 'compras', 'agenda', 'relatorios', 'rh', 'equipe', 'perfil', 'config'];
  const reativar = () => {
    ordem.forEach(k => localStorage.removeItem('infinity-ajuda-hide-' + k));
    alert('Pronto! As caixas de ajuda voltam a aparecer no topo de cada tela.');
  };
  const secTitulo = { fontSize: 13, fontWeight: 700, color: 'var(--ink-mute)', letterSpacing: 0.4, margin: '26px 0 10px' };

  return (
    <div>
      <window.PageHeader
        title="Ajuda"
        subtitle="Como usar cada tela do sistema — e os conceitos que se repetem"
        action={<window.Btn variant="ghost" icon="sparkles" onClick={reativar}>Reativar dicas nas telas</window.Btn>}
      />

      <div style={secTitulo}>PRIMEIROS CONCEITOS</div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 760, marginBottom: 6 }}>
        Antes das telas, vale entender três ideias que aparecem no sistema todo. Elas explicam por que os números
        às vezes parecem estranhos — e por que estão certos.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {AJUDA_GLOSSARIO.map((g, i) => (
          <div key={i} style={{ ...ajCard, borderLeftColor: 'var(--c-secondary)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{g.termo}</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{g.texto}</div>
          </div>
        ))}
      </div>

      <div style={secTitulo}>TELA POR TELA</div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 760, marginBottom: 12 }}>
        Clique em cada tela para abrir o passo a passo.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {ordem.filter(k => AJUDA[k]).map(k => (
          <AjudaTelaCard key={k} chave={k} info={AJUDA[k]} />
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 24 }}>
        Dispensou uma caixa de ajuda numa tela e quer de volta? Clique em "Reativar dicas nas telas" lá em cima.
      </p>
    </div>
  );
};

Object.assign(window, { AJUDA, AJUDA_GLOSSARIO, AjudaBanner, AjudaPage });
