// ═══════════════════════════════════════════════════════════════════════════
// Infinity — Ajuda / Tutoriais (v2 — passo a passo profundo + prints)
// UM lugar só com o "como fazer" de cada tela. Alimenta:
//   • AjudaBanner  — caixa contextual no topo de cada tela (app.jsx injeta)
//   • AjudaPage    — a aba "Ajuda" com todos os tutoriais + glossário
// Prints: coloque a imagem em  assets/ajuda/<chave>.png  (ex.: assets/ajuda/caixa.png).
// Enquanto não existe, some sozinho (banner) ou vira um marcador (aba Ajuda).
// ═══════════════════════════════════════════════════════════════════════════

// Estrutura de cada tutorial:
//   resumo   → uma linha (o que é)
//   quemUsa  → quem opera essa tela
//   cenario  → situação concreta de exemplo (string) — opcional
//   passos   → [{ t: 'texto do passo', obs: 'detalhe/atenção' }]
//   erros    → [{ msg: 'mensagem que aparece', causa: 'o que fazer' }]
//   dicas    → [string]
//   cuidado  → [string]
const AJUDA = {
  dashboard: {
    resumo: 'O panorama do mês num relance: quanto entrou, quanto saiu e o resultado.',
    quemUsa: 'Todos. É a primeira tela que abre.',
    cenario: 'Você chegou de manhã e quer saber, em 5 segundos, como o mês está indo.',
    passos: [
      { t: 'No topo, escolha o mês ou o período no filtro.', obs: 'Tudo na tela passa a mostrar só esse período. O subtítulo confirma: "Exibindo {mês} · saldo anterior {valor}".' },
      { t: 'Leia os cartões de números (KPIs): entradas, saídas, resultado e o que a clínica tem a receber/pagar.', obs: 'É resumo — para o lançamento item a item, vá em Contas ou Compras.' },
      { t: 'Quer reorganizar os cartões? Passe o mouse, segure na alcinha de arrastar e solte na ordem que preferir.', obs: 'Fica salvo do seu jeito.' },
      { t: 'O botão "Nova compra" abre o lançamento rápido de uma saída sem sair do Dashboard.', obs: '' },
    ],
    erros: [],
    dicas: ['Se um número parecer estranho, quase sempre é o filtro: confira qual mês está selecionado no topo.'],
    cuidado: ['Os números aqui seguem o filtro de período — não são o saldo do banco. O saldo real de cada conta fica no painel de saldos.'],
  },

  caixa: {
    resumo: 'Onde a recepção lança os atendimentos particulares do dia (o que entrou de verdade).',
    quemUsa: 'Recepção, ao longo do dia.',
    cenario: '14h. O paciente João Silva fez consulta com o Dr. Bruno e pagou R$ 350 no Pix.',
    passos: [
      { t: 'No menu, clique em Caixa. Abre "Caixa — Particular".', obs: 'No canto superior direito tem a data, já com o dia de hoje. Esqueceu de lançar ontem? Troque a data ali e lance no dia certo.' },
      { t: 'Profissional * → abra a lista e escolha o profissional (ex.: BRUNO CAIXETA · PSIQUIATRA).', obs: 'Só aparece profissional ativo. Se o nome não está na lista, ele não foi cadastrado no RH — avise quem cadastra.' },
      { t: 'Paciente * → digite o nome completo (ex.: João Silva).', obs: 'O sistema coloca em MAIÚSCULA sozinho. É por esse nome que o Repasse casa o particular no fim do mês — escreva completo e certo.' },
      { t: 'Tipo de serviço → Consulta, Retorno, Avaliação Neuropsicológica, Sessão de Terapia, Pacote (4 sessões) ou Outro.', obs: '' },
      { t: 'Valor recebido * → o que ENTROU de verdade (ex.: 350). Pode usar vírgula (350,00).', obs: 'É o valor pago, não a tabela do convênio.' },
      { t: 'Forma de pagamento → Dinheiro, Pix, Cartão débito, Cartão crédito ou Misto.', obs: '' },
      { t: 'CPF para NF e Observação são opcionais. CPF só se o paciente pediu nota fiscal.', obs: 'Use a observação para "pacote fechado", "valor combinado" etc.' },
      { t: 'Clique em Adicionar lançamento. Ele aparece na lista embaixo, "Lançamentos de {dia}".', obs: 'O rodapé mostra o TOTAL DO DIA — confira com o caixa físico no fechamento.' },
    ],
    erros: [
      { msg: '"Escolha o profissional."', causa: 'Você não selecionou o profissional na primeira lista.' },
      { msg: '"Informe o paciente."', causa: 'Faltou o nome do paciente.' },
      { msg: '"Informe o valor recebido."', causa: 'Faltou o valor, ou digitou algo que não é número.' },
    ],
    dicas: ['Errou um lançamento? Clique no × vermelho na linha para remover e lance de novo — não tem editar, é remover e refazer.'],
    cuidado: ['Cada particular lançado aqui vira repasse do profissional no fim do mês. Nome errado ou valor esquecido = repasse errado. Lance na hora, pelo nome certo, só o que entrou.'],
  },

  contas: {
    resumo: 'O que entrou, o que saiu e o que ainda falta pagar no mês.',
    quemUsa: 'Administrativo/financeiro.',
    cenario: 'Fim do mês: você quer ver o resultado e conferir o que ainda está em aberto.',
    passos: [
      { t: 'Escolha o período no filtro do topo: mês fechado ou modo Ciclo.', obs: 'O Ciclo corta do dia 25 ao 24 e mostra o resultado operacional real (o mês-calendário distorce por causa de quando o convênio cai).' },
      { t: 'Leia os três números grandes: Entrou, Saiu e Resultado do mês.', obs: 'Embaixo aparece "ainda a pagar {valor}" — o que está previsto e ainda não foi quitado.' },
      { t: 'Use os filtros para ver só entradas, só saídas ou só o que falta pagar.', obs: '' },
      { t: 'Para dar baixa numa conta, marque como paga/recebida na linha (confirmar recebimento ou pagamento).', obs: 'Aí ela entra no "realizado" do período.' },
      { t: 'Nova conta → lança uma conta a pagar ou a receber (com previsto e, quando quitar, o realizado).', obs: 'Replicar prestadores copia os lançamentos recorrentes de prestadores para o mês.' },
    ],
    erros: [],
    dicas: ['Previsto x Realizado: previsto é o que você espera; realizado é o que de fato caiu quando você marca como pago.'],
    cuidado: ['O Resultado NÃO é o saldo bancário — é "entrou menos saiu" no período. Para o dinheiro real em cada conta, veja o painel de saldos.'],
  },

  projecao: {
    resumo: 'Quanto vai entrar e sair nas próximas semanas, com base na produção que já aconteceu.',
    quemUsa: 'Diretoria/financeiro, para antecipar aperto de caixa.',
    cenario: 'Você quer saber se o caixa aguenta a folha do dia 5 sem susto.',
    passos: [
      { t: 'A tela projeta sozinha ao abrir. Leia primeiro o cartão "Menor saldo previsto" — é o ponto mais apertado do período.', obs: 'Se ele ficar negativo, é aí que falta dinheiro.' },
      { t: 'Veja o gráfico de saldo dia a dia — cada ponto é o saldo naquele dia.', obs: 'O convênio entra na data certa: Unimed no fim do mês seguinte, NDI no dia 15 do segundo mês. Por isso a linha não é reta.' },
      { t: 'Clique nos cartões de cenário para simular: Otimista (+10%), Base (real), Cauteloso (−10%), Pessimista (−20%).', obs: 'Os cartões SÃO os botões. É onde aparece se algum mês não fecha se a produção cair.' },
    ],
    erros: [],
    dicas: ['A tela tem um bloco "Como funciona" explicando a lógica do convênio virar dinheiro dois meses depois — vale ler uma vez.'],
    cuidado: ['A projeção para onde o dado confiável acaba — ela não inventa receita futura. Se um mês ficou subcontado (ex.: maio, da migração), corrija a produção antes de confiar no número.'],
  },

  impostos: {
    resumo: 'As guias de tributo do Lucro Presumido: o que vence, quanto e o que já foi pago.',
    quemUsa: 'Financeiro, junto com o contador.',
    cenario: 'Chegou a guia da COFINS de maio e você quer registrar e depois marcar como paga.',
    passos: [
      { t: 'Clique em adicionar (o +) para abrir o cadastro da guia.', obs: '' },
      { t: 'Descrição → o nome da guia (ex.: "DARF COFINS Mai/2026").', obs: 'Seja específico para achar depois.' },
      { t: 'Categoria e Vencimento → classifique e ponha a data que vence.', obs: '' },
      { t: 'Previsto → o valor da guia. Se já pagou, marque Pago e informe o Realizado.', obs: 'Se ainda não pagou, deixe sem marcar — ela entra no total pendente.' },
      { t: 'Salve. No topo você acompanha o total pendente e o total pago.', obs: '' },
    ],
    erros: [
      { msg: 'Não salva / pede campo', causa: 'Descrição, vencimento e previsto são obrigatórios — preencha os três.' },
    ],
    dicas: ['Acompanhar previsto x realizado evita guia esquecida vencendo.'],
    cuidado: ['Dúvida de valor ou enquadramento é conversa com o contador (Marcos) — aqui é só o controle do que vence e do que foi pago.'],
  },

  repasse: {
    resumo: 'O motor: importa a produção, cruza com o caixa e fecha o mês de cada profissional.',
    quemUsa: 'Administrativo (admin/editor). A recepção não vê esta tela.',
    cenario: 'Início do mês: hora de fechar o repasse dos psiquiatras do mês passado.',
    passos: [
      { t: 'Aba Fechamento → importe o relatório de agendamento (CSV ou XLSX) exportado do sistema de agenda.', obs: 'É a produção do mês (os atendimentos de convênio).' },
      { t: 'O motor calcula sozinho: aplica a tarifa do convênio, desconta o imposto (13,33% na psiquiatria/psicologia), aplica o split (ex.: 63/37) e o desconto de holding, e SOMA o particular que a recepção lançou no Caixa.', obs: 'Por isso o Caixa tem que estar em dia antes de fechar.' },
      { t: 'Confira as pendências que aparecem antes do número.', obs: 'Ex.: "Fulano: sem regra de repasse cadastrada" — resolva antes de fechar.' },
      { t: 'Clique em Salvar fechamento. O resultado também cai na aba Pagamentos, já com a data do 5º dia útil.', obs: 'De lá vira conta a pagar.' },
    ],
    erros: [
      { msg: '"sem regra de repasse cadastrada"', causa: 'O profissional não tem regra. Vá na aba Regras e cadastre o percentual/holding dele.' },
    ],
    dicas: ['Aba Regras: percentual e holding de cada um. Aba Tarifas: o valor de cada convênio. A lista de profissionais vem do RH.'],
    cuidado: ['Feche o Caixa (particular) antes de fechar o Repasse — o motor soma o particular de lá. Caixa incompleto = repasse a menos.'],
  },

  compras: {
    resumo: 'Os lançamentos efetivos do caixa — o que entrou e saiu de verdade.',
    quemUsa: 'Administrativo/financeiro.',
    cenario: 'Pagou o aluguel e quer registrar a saída no caixa.',
    passos: [
      { t: 'Nova compra → abre o lançamento de uma saída (ou entrada).', obs: '' },
      { t: 'Preencha descrição, valor, categoria e data.', obs: 'A categoria certa é o que faz o DRE e a recategorização baterem depois.' },
      { t: 'Acompanhe os cartões no topo: Saldo anterior, Entradas, Saídas e Saldo do período.', obs: '' },
      { t: 'Use a busca ("por descrição ou categoria") e as abas de tipo para achar um lançamento.', obs: '' },
    ],
    erros: [],
    dicas: ['Diferença para Contas: Contas é previsto x a pagar; Compras é o realizado, o que de fato passou pelo caixa.'],
    cuidado: ['Transferência entre as contas do próprio grupo NÃO é compra nem receita — é dinheiro trocando de bolso. Não lance como despesa.'],
  },

  agenda: {
    resumo: 'O que vence nos próximos 7 dias, para nenhuma data passar batido.',
    quemUsa: 'Financeiro, no dia a dia.',
    cenario: 'Segunda de manhã: o que precisa pagar essa semana?',
    passos: [
      { t: 'Abra a Agenda. A lista já mostra os vencimentos dos próximos 7 dias, por data.', obs: 'É leitura — para lançar ou dar baixa, vá em Contas.' },
    ],
    erros: [],
    dicas: ['Use junto com Contas: aqui você vê o que vence, lá você marca como pago.'],
    cuidado: [],
  },

  relatorios: {
    resumo: 'Exporta os relatórios do mês em planilha, prontos para enviar ou arquivar.',
    quemUsa: 'Administrativo/financeiro e diretoria.',
    cenario: 'Fim do mês: você quer a DRE para mandar ao contador.',
    passos: [
      { t: 'Onde o relatório pedir mês, selecione o mês ANTES de clicar.', obs: 'DRE e Extrato de Contas precisam de um mês escolhido.' },
      { t: 'DRE (Excel) → o resultado do mês em duas colunas: Competência (produção) e Caixa (o que entrou/saiu).', obs: '' },
      { t: 'Fluxo de Caixa → saldo acumulado mês a mês, já com o saldo anterior.', obs: '' },
      { t: 'Receita por Convênio → ranking de repasses, previsto x realizado.', obs: '' },
      { t: 'Extrato de Contas → tudo do mês selecionado.', obs: '' },
    ],
    erros: [],
    dicas: ['Baixou e o arquivo veio vazio? Quase sempre é o mês: confirme se escolheu um mês com movimento.'],
    cuidado: [],
  },

  rh: {
    resumo: 'Cadastro de colaboradores, faltas, atestados e rescisões.',
    quemUsa: 'RH / administrativo.',
    cenario: 'Entrou uma profissional nova e ela precisa aparecer no Caixa e no Repasse.',
    passos: [
      { t: 'Abra RH → "Recursos Humanos". Use as abas: Colaboradores, Faltas, Atestados, Rescisões.', obs: '' },
      { t: 'Na aba Colaboradores, cadastre a pessoa (nome, cargo) e deixe o status como Ativo.', obs: 'É daqui que o Caixa e o Repasse puxam a lista de profissionais.' },
      { t: 'Faltas e Atestados: registre as ocorrências da equipe. Rescisões: quando alguém sai.', obs: '' },
    ],
    erros: [
      { msg: 'Tela avisa sobre migration 002', causa: 'A migration 002_rbac_fix_and_rh.sql precisa estar aplicada no Supabase para o RH funcionar.' },
    ],
    dicas: ['Profissional só aparece no Caixa/Repasse se estiver aqui como Ativo. Não apareceu? Confira o cadastro.'],
    cuidado: [],
  },

  equipe: {
    resumo: 'Os usuários que acessam o sistema e o papel (nível de acesso) de cada um.',
    quemUsa: 'Só admin.',
    cenario: 'A recepcionista nova vai começar e precisa de um login que só veja o Caixa.',
    passos: [
      { t: 'Clique em Convidar (aparece só para admin).', obs: '' },
      { t: 'Informe o e-mail dela e escolha o Cargo — cada cargo mostra a descrição do que pode ver.', obs: 'Recepção (viewer) só vê Caixa, Agenda e Dashboard.' },
      { t: 'Enviar convite. Na lista de Membros você pode trocar o cargo de alguém ou Remover.', obs: 'A "Atividade recente" mostra a auditoria de ações.' },
    ],
    erros: [],
    dicas: ['A tabela "Permissões por cargo" mostra exatamente o que cada nível enxerga.'],
    cuidado: ['Esconder a tela no menu é só visual. A trava de verdade é no banco (RLS). Antes de dar login a quem não pode ver o financeiro, confirme que a RLS está fechada.'],
  },

  perfil: {
    resumo: 'Seus dados, sua foto, sua senha e suas preferências.',
    quemUsa: 'Cada usuário, para si.',
    cenario: 'Você quer trocar sua senha e ativar o tema escuro.',
    passos: [
      { t: 'Edite Nome, Telefone e Cargo e clique em Salvar alterações. (O e-mail é bloqueado.)', obs: 'Clique na foto para trocar a imagem.' },
      { t: 'Em Trocar senha: digite a nova senha, confirme e clique em Atualizar.', obs: '' },
      { t: 'Em Preferências: ligue/desligue Tema escuro, notificações por e-mail e push, e escolha o Idioma.', obs: '' },
    ],
    erros: [
      { msg: 'Senha não atualiza', causa: 'A nova senha e a confirmação precisam ser iguais.' },
    ],
    dicas: [],
    cuidado: [],
  },

  config: {
    resumo: 'Categorias de entrada e saída, conta e preferências do sistema.',
    quemUsa: 'Admin.',
    cenario: 'Você quer criar uma categoria nova de despesa para separar melhor os gastos.',
    passos: [
      { t: 'Em "Categorias de saída (despesas)" ou "de entrada (receitas)", digite o nome no campo e adicione.', obs: 'As categorias aparecem como lista suspensa ao criar contas e compras.' },
      { t: 'Para tirar uma de circulação sem apagar o histórico, use ocultar (desativar). Para apagar de vez, excluir.', obs: '' },
    ],
    erros: [],
    dicas: ['Categoria bem definida é o que faz o DRE e a recategorização de despesas ficarem certos. Vale caprichar aqui.'],
    cuidado: [],
  },
};

// ─── Glossário: os conceitos que se repetem no sistema ─────────────────────
const AJUDA_GLOSSARIO = [
  { termo: 'Competência x Caixa', texto: 'Competência é QUANDO o atendimento aconteceu (a produção do mês). Caixa é QUANDO o dinheiro entrou ou saiu de verdade. O convênio de maio é competência de maio mas cai no caixa lá na frente. O DRE mostra as duas colunas lado a lado.' },
  { termo: 'Ciclo (corte dia 25 → 24)', texto: 'O mês-calendário engana porque o convênio cai no fim do mês. Cortar do dia 25 do mês anterior ao 24 do atual junta a produção com o recebimento dela e mostra o resultado operacional real. Foi o que revelou que julho era positivo, não negativo.' },
  { termo: 'Contas-ponte (Investimentos e Negócios)', texto: 'As contas Sicoob Investimentos (paga médicos) e Negócios (paga psicólogas) são só passagem: o dinheiro entra e sai como repasse. Transferir para elas NÃO é despesa — se contar como despesa, o repasse é contado duas vezes.' },
  { termo: 'Como o repasse é calculado', texto: 'Sobre o valor bruto: primeiro desconta o imposto (13,33% na psiquiatria/psicologia), depois aplica o split (a divisão médico/clínica, ex.: 63/37) e por fim o desconto fixo de holding, quando tem. O particular entra pelo que a recepção lançou no Caixa.' },
  { termo: 'Ciclo de recebimento dos convênios', texto: 'Unimed: atende no mês M, recebe no fim do mês seguinte (M+1). NDI: atende em M, recebe no dia 15 do segundo mês (M+2). Por isso comparar "o que entrou mês a mês" não compara a mesma produção — a Projeção já respeita esses prazos.' },
  { termo: 'Transferência interna ≠ despesa', texto: 'Movimentação entre as contas do próprio grupo (as 5 contas) não é gasto nem receita — é dinheiro trocando de bolso. Sempre fica de fora da análise para não inflar despesa ou receita.' },
];

// títulos amigáveis das telas (para banner e aba)
const AJUDA_TITULOS = {
  dashboard: 'Dashboard', caixa: 'Caixa — Particular', contas: 'Contas', projecao: 'Projeção de Caixa',
  impostos: 'Impostos', repasse: 'Repasse', compras: 'Compras', agenda: 'Agenda',
  relatorios: 'Relatórios', rh: 'RH', equipe: 'Equipe', perfil: 'Meu perfil', config: 'Configurações',
};

// ─── estilos base ──────────────────────────────────────────────────────────
const ajCard = { background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--r-md)', padding: '12px 14px' };
const ajLista = { margin: '4px 0 0', paddingLeft: 20, fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 };
const ajBtnLink = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, padding: '2px 4px', whiteSpace: 'nowrap' };
const ajSubtt = { fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 };

// caminho do print da tela
const ajImgSrc = (chave) => 'assets/ajuda/' + chave + '.png';

// ─── Print da tela (com fallback) ──────────────────────────────────────────
// placeholder=true (aba Ajuda): mostra um marcador dizendo qual arquivo colocar.
// placeholder=false (banner): se não existe a imagem, não mostra nada.
const AjudaImagem = ({ chave, placeholder }) => {
  const [erro, setErro] = React.useState(false);
  if (erro) {
    if (!placeholder) return null;
    return (
      <div style={{ marginTop: 10, border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-md)', padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-mute)', background: 'var(--bg-alt)' }}>
        📷 Print desta tela ainda não adicionado. Coloque a imagem em <code>assets/ajuda/{chave}.png</code> e ela aparece aqui.
      </div>
    );
  }
  return (
    <figure style={{ margin: '10px 0 0' }}>
      <img src={ajImgSrc(chave)} alt={'Print da tela ' + chave} onError={() => setErro(true)}
        style={{ width: '100%', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', display: 'block' }} />
    </figure>
  );
};

// ─── blocos de conteúdo reaproveitados ─────────────────────────────────────
const AjudaPassos = ({ passos }) => (
  <ol style={ajLista}>
    {passos.map((p, i) => (
      <li key={i} style={{ marginBottom: 6 }}>
        {p.t}
        {p.obs ? <div style={{ color: 'var(--ink-mute)', fontSize: 12.5, marginTop: 2 }}>{p.obs}</div> : null}
      </li>
    ))}
  </ol>
);
const AjudaErros = ({ erros }) => (
  <ul style={{ ...ajLista, listStyle: 'none', paddingLeft: 0 }}>
    {erros.map((e, i) => (
      <li key={i} style={{ marginBottom: 5 }}>
        <b style={{ color: 'var(--c-danger)' }}>{e.msg}</b>
        <span style={{ color: 'var(--ink-soft)' }}> — {e.causa}</span>
      </li>
    ))}
  </ul>
);
const AjudaDetalhe = ({ info, chave, comPrint }) => (
  <div>
    {info.cenario && (
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', background: 'var(--bg-alt)', borderRadius: 'var(--r-sm)', padding: '8px 11px', marginTop: 4 }}>
        Exemplo: {info.cenario}
      </div>
    )}
    {comPrint && <AjudaImagem chave={chave} placeholder />}
    {info.passos && info.passos.length > 0 && <>
      <div style={ajSubtt}>PASSO A PASSO</div>
      <AjudaPassos passos={info.passos} />
    </>}
    {info.erros && info.erros.length > 0 && <>
      <div style={ajSubtt}>SE DER ERRO</div>
      <AjudaErros erros={info.erros} />
    </>}
    {info.dicas && info.dicas.length > 0 && (
      <ul style={{ ...ajLista, listStyle: 'none', paddingLeft: 0, marginTop: 10 }}>
        {info.dicas.map((d, i) => <li key={i} style={{ marginBottom: 3 }}>💡 {d}</li>)}
      </ul>
    )}
    {info.cuidado && info.cuidado.length > 0 && (
      <ul style={{ ...ajLista, listStyle: 'none', paddingLeft: 0, marginTop: 6, color: 'var(--c-warning)' }}>
        {info.cuidado.map((c, i) => <li key={i} style={{ marginBottom: 3 }}>⚠️ {c}</li>)}
      </ul>
    )}
  </div>
);

// ─── Caixa de ajuda contextual (topo de cada tela) ─────────────────────────
const AjudaBanner = ({ page }) => {
  const info = AJUDA[page];
  const chave = 'infinity-ajuda-hide-' + page;
  const [aberto, setAberto] = React.useState(false);
  const [oculto, setOculto] = React.useState(() => localStorage.getItem(chave) === '1');
  if (!info || oculto) return null;
  const dispensar = () => { localStorage.setItem(chave, '1'); setOculto(true); };
  const nome = AJUDA_TITULOS[page] || page;

  return (
    <div style={{ ...ajCard, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}><window.Icon name="help" size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
            <b>{nome}.</b> <span style={{ color: 'var(--ink-soft)' }}>{info.resumo}</span>
            {info.quemUsa ? <span style={{ color: 'var(--ink-mute)' }}> · {info.quemUsa}</span> : null}
          </div>
          {aberto && (
            <div style={{ marginTop: 8 }}>
              <AjudaImagem chave={page} placeholder={false} />
              <AjudaDetalhe info={info} chave={page} comPrint={false} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setAberto(a => !a)} style={ajBtnLink}>{aberto ? 'Recolher ▲' : 'Como fazer ▾'}</button>
          <button onClick={dispensar} title="Não mostrar aqui" style={{ ...ajBtnLink, color: 'var(--ink-mute)' }}>✕</button>
        </div>
      </div>
    </div>
  );
};

// ─── Aba Ajuda ─────────────────────────────────────────────────────────────
const AjudaTelaCard = ({ chave, nome, info }) => {
  const [aberto, setAberto] = React.useState(false);
  return (
    <div style={{ ...ajCard, padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setAberto(a => !a)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{nome}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-mute)', display: 'block', marginTop: 2 }}>{info.resumo}</span>
        </span>
        <span style={{ color: 'var(--ink-mute)', flexShrink: 0, fontSize: 12, fontWeight: 600 }}>{aberto ? '▲' : '▾'}</span>
      </button>
      {aberto && (
        <div style={{ padding: '0 15px 15px', borderTop: '1px solid var(--line)' }}>
          <AjudaDetalhe info={info} chave={chave} comPrint />
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
      <window.PageHeader title="Ajuda" subtitle="Como fazer cada coisa no sistema — passo a passo, com os conceitos que se repetem"
        action={<window.Btn variant="ghost" icon="sparkles" onClick={reativar}>Reativar dicas nas telas</window.Btn>} />

      <div style={secTitulo}>PRIMEIROS CONCEITOS</div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 760, marginBottom: 8 }}>
        Três ideias aparecem no sistema todo e explicam por que os números às vezes parecem estranhos — e por que estão certos.
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
        Clique em cada tela para abrir o passo a passo. O print de cada uma entra assim que for adicionado.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {ordem.filter(k => AJUDA[k]).map(k => (
          <AjudaTelaCard key={k} chave={k} nome={AJUDA_TITULOS[k] || k} info={AJUDA[k]} />
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 24 }}>
        Dispensou uma caixa de ajuda numa tela e quer de volta? Clique em "Reativar dicas nas telas" lá em cima.
      </p>
    </div>
  );
};

Object.assign(window, { AJUDA, AJUDA_GLOSSARIO, AJUDA_TITULOS, AjudaBanner, AjudaPage });
