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
      { t: 'No menu Equipe, abra Colaboradores. Use as abas: Colaboradores, Faltas, Atestados, Rescisões.', obs: '' },
      { t: 'Na aba Colaboradores, cadastre a pessoa (nome, cargo) e deixe o status como Ativo.', obs: 'É daqui que o Caixa e o Repasse puxam a lista de profissionais.' },
      { t: 'Faltas e Atestados: registre as ocorrências da equipe. Rescisões: quando alguém sai.', obs: '' },
    ],
    erros: [],
    dicas: ['Profissional só aparece no Caixa/Repasse se estiver aqui como Ativo. Não apareceu? Confira o cadastro.', 'Cadastro repetido faz a pessoa aparecer duas vezes na folha: mantenha um só e marque o outro como Desligado.'],
    cuidado: [],
  },

  equipe: {
    resumo: 'Quem entra no sistema e o que cada pessoa pode fazer: Administrador, Financeiro ou Diretoria.',
    quemUsa: 'Só o Administrador.',
    cenario: 'A auxiliar nova começa segunda e precisa entrar no sistema para lançar e conferir pagamentos.',
    passos: [
      { t: 'No rodapé do menu, clique em Acessos.', obs: 'Só aparece para Administrador.' },
      { t: 'Em "Criar acesso", preencha Nome e E-mail. Clique em Gerar para criar uma senha provisória (ou digite uma).', obs: '' },
      { t: 'Escolha o Tipo de acesso: Administrador (tudo), Financeiro (lança e edita; abre na visão do dia a dia) ou Diretoria (vê tudo, não altera nada).', obs: '' },
      { t: 'Clique em Criar acesso. Aparece uma mensagem com o e-mail e a senha provisória — mande para a pessoa.', obs: 'Se o Supabase pedir confirmação de e-mail, ela precisa clicar no link que recebe antes do primeiro login.' },
      { t: 'Para mudar o tipo de alguém, troque na lista "Quem tem acesso". Para tirar o acesso, escolha Bloqueado.', obs: 'Bloquear corta na hora e mantém o histórico do que a pessoa lançou.' },
      { t: 'Alguém esqueceu a senha? Clique em Redefinir senha na linha da pessoa.', obs: 'Ela recebe um e-mail com um link para criar a senha nova. Você não fica sabendo a senha. A própria pessoa também pode pedir em "Esqueci minha senha" na tela de login.' },
    ],
    erros: [
      { msg: '"Só administrador pode alterar acessos."', causa: 'Você não está como Administrador.' },
      { msg: '"Você não pode tirar o seu próprio acesso de administrador."', causa: 'Proteção para o sistema nunca ficar sem administrador. Peça a outro administrador.' },
      { msg: '"Muitos pedidos seguidos"', causa: 'O Supabase limita e-mails por hora. Espere alguns minutos e tente de novo.' },
    ],
    dicas: ['Ninguém consegue se cadastrar sozinho: toda conta nasce sem acesso até um administrador liberar aqui.'],
    cuidado: ['Excluir a conta de vez só pelo painel do Supabase. No dia a dia, prefira Bloquear: dá para desfazer e mantém o histórico.'],
  },

  hoje: {
    resumo: 'A tela de abertura do dia na visão operacional: o que vence, o que entrou e saiu e os atalhos mais usados.',
    quemUsa: 'Financeiro (auxiliar), todo dia de manhã.',
    cenario: 'Segunda de manhã: você quer saber o que precisa pagar nesta semana e se algo ficou para trás.',
    passos: [
      { t: 'No topo: caixa de hoje (particular lançado pela recepção), contas atrasadas e o que vence nos próximos 7 dias.', obs: '' },
      { t: '"Pagar esta semana" lista primeiro as atrasadas (em vermelho) e depois as da semana. "Ver tudo" abre Contas.', obs: '' },
      { t: '"Movimento dos últimos 7 dias" mostra quanto entrou e saiu e quantos lançamentos estão sem categoria.', obs: 'Tem lançamento sem categoria? Clique em "arrumar →" e classifique — é o que deixa o DRE certo.' },
      { t: 'Os atalhos levam direto para Caixa, Pagamentos da equipe e cadastro de colaborador.', obs: '' },
    ],
    erros: [],
    dicas: ['A visão operacional (menu enxuto) e a completa se alternam pelo botão no rodapé do menu.'],
    cuidado: [],
  },

  equipe_pag: {
    resumo: 'Todos os pagamentos da equipe no mês — CLT, estagiários e profissionais — separados por data: 5º dia útil e dia 20.',
    quemUsa: 'Financeiro e Administrador.',
    cenario: 'Dia 20: você quer ver quem da produção ainda não recebeu e ajustar um valor antes de pagar.',
    passos: [
      { t: 'Escolha o mês no topo. O número grande é o que falta pagar; ao lado, pagos, atrasados e o total do mês.', obs: '' },
      { t: 'Modo Lista: cada pessoa com tipo, valor e situação (Pendente, Atrasado ou Pago). Clique no valor para ajustar antes de pagar.', obs: 'A situação vira "Pago" sozinha quando o Pix da pessoa aparece no extrato importado.' },
      { t: 'Pagou e o extrato ainda não entrou? Clique em Registrar, informe valor e data.', obs: '' },
      { t: 'O lápis abre a edição completa: nome, cargo, tipo, data de pagamento (5º dia útil ou dia 20), valor, excluir e "voltar para pendente".', obs: 'Ao excluir um repetido, marque "desativar este cadastro" para ele não voltar na próxima folha.' },
      { t: 'Modo Planilha: as mesmas colunas da planilha de pagamentos (dias, bruto, descontos, bonificações, INSS, VT, holding, líquido, pago). Clique na célula, digite, Enter.', obs: '5º dia útil: bruto ÷ 30 × dias − descontos − INSS − VT + bonificações. Dia 20: bruto + bonificações − desconto − desconto holding. Faltas no dia 20 calculam o desconto sozinhas.' },
      { t: '"+ Pessoa" acrescenta alguém no grupo. O topo de cada grupo mostra A pagar, Pago e a Diferença (como o K1/L1/M1 da planilha).', obs: '' },
      { t: '"Trazer folha do ponto" puxa CLT e estagiários da Folha do mês (ponto do Cortex).', obs: 'Se o mês já foi lançado pela planilha, não use — pode trazer gente repetida.' },
    ],
    erros: [
      { msg: 'Etiqueta vermelha "repetido?"', causa: 'Há dois lançamentos com nome parecido no mês. Confira e exclua o que sobra (marcando "desativar cadastro").' },
    ],
    dicas: ['Profissionais do dia 20 entram quando o fechamento do Repasse é salvo.', 'Pela busca do topo (Ctrl+K) dá para achar um pagamento pelo nome ou pelo valor.'],
    cuidado: ['Diferença entre "a pagar" e "pago" no topo do grupo quase sempre é desconto de holding esquecido. Confira antes de fechar o mês.'],
  },

  provisoes: {
    resumo: 'O cálculo da folha de CLT e estagiários do mês, a partir do ponto do Cortex, com encargos e provisões.',
    quemUsa: 'Financeiro e Administrador, no fechamento da folha.',
    cenario: 'Início do mês: fechar a folha do mês anterior para pagar no 5º dia útil.',
    passos: [
      { t: 'Escolha o mês e confira os dias úteis.', obs: 'As horas vêm do ponto do Cortex, casado pelo CPF de cada colaborador.' },
      { t: 'Confira as duas tabelas: CLT e Estágio. Ajuste gratificações direto na linha, se houver.', obs: 'Linha marcada "manual" é quem não veio do ponto — confira os valores.' },
      { t: '"Pagamentos da equipe" manda os líquidos para a tela de pagamentos, no 5º dia útil do mês seguinte.', obs: '' },
      { t: '"Gerar Excel" baixa a folha para mandar à contabilidade.', obs: '' },
    ],
    erros: [],
    dicas: ['Colaborador não apareceu? Ele precisa estar Ativo em Colaboradores, com CPF e regime (CLT ou estágio) preenchidos.'],
    cuidado: ['CLT: a contabilidade fecha a folha oficial (INSS, FGTS, IRRF, VT). Estagiários: a clínica fecha e paga direto. (POP, Parte IV)'],
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
  relatorios: 'Relatórios', rh: 'Colaboradores', equipe: 'Acessos', perfil: 'Meu perfil', config: 'Configurações',
  hoje: 'Hoje (visão operacional)', equipe_pag: 'Pagamentos da equipe', provisoes: 'Folha do mês',
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
              <AjudaDetalhe info={info} chave={page} comPrint={false} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {info.passos && info.passos.length > 0 && (
            <button onClick={() => window.dispatchEvent(new CustomEvent('infinity-tutorial', { detail: { page } }))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '5px 10px', whiteSpace: 'nowrap' }}>
              ▶ Tutorial
            </button>
          )}
          <button onClick={() => setAberto(a => !a)} style={ajBtnLink}>{aberto ? 'Recolher ▲' : 'Como fazer ▾'}</button>
          <button onClick={dispensar} title="Não mostrar aqui" style={{ ...ajBtnLink, color: 'var(--ink-mute)' }}>✕</button>
        </div>
      </div>
    </div>
  );
};

// ─── Aba Ajuda ─────────────────────────────────────────────────────────────
const AjudaTelaCard = ({ chave, nome, info, abertoInicial }) => {
  const [aberto, setAberto] = React.useState(!!abertoInicial);
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


// ═══════════════ Documentos da clínica (POP etc.) ═══════════════
// O conteúdo NÃO fica no código (o site é público no GitHub): vem da tabela
// ajuda_documentos, que só quem tem acesso liberado consegue ler.
// ─── busca: normalização, destaque e índice ───
const ajNorm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const AjTermo = React.createContext('');
// realça as palavras buscadas dentro de um texto
const AjMarca = ({ txt }) => {
  const termo = React.useContext(AjTermo);
  const s = String(txt || '');
  const palavras = ajNorm(termo).split(/\s+/).filter(w => w.length >= 2);
  if (!palavras.length) return s;
  const n = ajNorm(s);
  const marcas = [];
  palavras.forEach(w => { let i = n.indexOf(w); while (i >= 0) { marcas.push([i, i + w.length]); i = n.indexOf(w, i + w.length); } });
  if (!marcas.length) return s;
  marcas.sort((a, b) => a[0] - b[0]);
  const out = []; let pos = 0;
  marcas.forEach(([a, b], k) => { if (a < pos) return; out.push(s.slice(pos, a)); out.push(<mark key={k} style={{ background: 'var(--c-warning-bg, #FFF1B8)', color: 'inherit', borderRadius: 3, padding: '0 1px' }}>{s.slice(a, b)}</mark>); pos = b; });
  out.push(s.slice(pos));
  return <>{out}</>;
};
const ajNegrito = (txt) => String(txt || '').split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
  t.startsWith('**') && t.endsWith('**') ? <b key={i} style={{ color: 'var(--ink)' }}><AjMarca txt={t.slice(2, -2)} /></b> : <AjMarca key={i} txt={t} />);

// texto corrido de um bloco do documento (para a busca)
const ajTextoBloco = (b) => {
  const tira = (t) => String(t || '').replace(/\*\*/g, '');
  if (b.t === 'p') return tira(b.x);
  if (b.t === 'callout') return tira(b.titulo) + '. ' + tira(b.x);
  if (b.t === 'lista') return tira(b.titulo) + ' ' + (b.itens || []).map(tira).join(' · ');
  if (b.t === 'tabela') return (b.titulo || '') + ' ' + (b.lin || []).map(l => l.join(' — ')).join(' · ');
  if (b.t === 'check') return 'Checklist: ' + (b.itens || []).join(' · ');
  return '';
};

// documentos (POP) carregados uma vez só e guardados
let ajDocsPromessa = null;
function ajCarregarDocs(forcar) {
  if (!ajDocsPromessa || forcar) {
    ajDocsPromessa = (async () => {
      try { return await window.__sbRest('/ajuda_documentos?select=id,titulo,subtitulo,versao,conteudo,atualizado_em&order=titulo.asc') || []; }
      catch (e) { ajDocsPromessa = null; return []; }
    })();
  }
  return ajDocsPromessa;
}

// índice de tudo que existe na Ajuda: POP (bloco a bloco), telas e conceitos
function ajIndice(docs) {
  const itens = [];
  (docs || []).forEach(d => (d.conteudo?.partes || []).forEach(p => (p.blocos || []).forEach((b, i) => {
    const texto = ajTextoBloco(b);
    if (texto.trim()) itens.push({ grupo: d.titulo, titulo: p.titulo.replace(/^Parte [IVX]+ — /, '') + (b.titulo ? ' · ' + String(b.titulo).split(' — ')[0] : ''), texto,
      alvo: { aba: p.id === 'checklist' ? 'checklist' : 'doc', doc: d.id, parte: p.id, bloco: i } });
  })));
  Object.keys(AJUDA).forEach(k => {
    const a = AJUDA[k];
    const texto = [a.resumo, a.quemUsa, a.cenario, ...(a.passos || []).map(x => x.t + ' ' + (x.obs || '')), ...(a.erros || []).map(x => x.msg + ' ' + x.causa), ...(a.dicas || []), ...(a.cuidado || [])].filter(Boolean).join(' · ');
    itens.push({ grupo: 'Telas do sistema', titulo: AJUDA_TITULOS[k] || k, texto, alvo: { aba: 'telas', tela: k } });
  });
  AJUDA_GLOSSARIO.forEach((g, i) => itens.push({ grupo: 'Conceitos', titulo: g.termo, texto: g.texto, alvo: { aba: 'conceitos', conceito: i } }));
  return itens;
}

// busca no índice: todas as palavras precisam aparecer; título pesa mais
function ajBuscar(indice, termo, limite = 30) {
  const ws = ajNorm(termo).split(/\s+/).filter(w => w.length >= 2);
  if (!ws.length) return [];
  const res = [];
  indice.forEach(it => {
    const nt = ajNorm(it.titulo), nx = ajNorm(it.texto);
    if (!ws.every(w => nt.includes(w) || nx.includes(w))) return;
    let score = 0; ws.forEach(w => { if (nt.includes(w)) score += 3; if (nx.includes(w)) score += 1; });
    const i = nx.indexOf(ws.find(w => nx.includes(w)) || '');
    const ini = Math.max(0, i - 50);
    const trecho = i < 0 ? it.texto.slice(0, 140) : (ini ? '…' : '') + it.texto.slice(ini, ini + 150) + (ini + 150 < it.texto.length ? '…' : '');
    res.push({ ...it, score, trecho });
  });
  return res.sort((a, b) => b.score - a.score).slice(0, limite);
}
// usado pela busca do topo do sistema
async function eqAjudaBuscar(termo, limite) { return ajBuscar(ajIndice(await ajCarregarDocs()), termo, limite); }

const AjudaBloco = ({ b, docId }) => {
  const txt = { fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '8px 0' };
  if (b.t === 'p') return <p style={txt}>{ajNegrito(b.x)}</p>;
  if (b.t === 'callout') return (
    <div style={{ ...ajCard, borderLeftColor: 'var(--c-tertiary, var(--accent))', margin: '10px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}><AjMarca txt={b.titulo} /></div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{ajNegrito(b.x)}</div>
    </div>
  );
  if (b.t === 'lista') return (
    <div style={{ margin: '10px 0' }}>
      {b.titulo && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{ajNegrito(b.titulo)}</div>}
      <ul style={ajLista}>{b.itens.map((it, i) => <li key={i} style={{ marginBottom: 3 }}>{ajNegrito(it)}</li>)}</ul>
    </div>
  );
  if (b.t === 'tabela') return (
    <div style={{ margin: '12px 0' }}>
      {b.titulo && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}><AjMarca txt={b.titulo} /></div>}
      <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr>{b.cab.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '8px 10px', background: 'var(--surface-2, #F6F8FA)', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>)}</tr></thead>
          <tbody>{b.lin.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} style={{ padding: '7px 10px', borderTop: i ? '1px solid var(--line-2, var(--line))' : 0, color: j ? 'var(--ink-soft)' : 'var(--ink)', fontWeight: j ? 400 : 600, verticalAlign: 'top' }}><AjMarca txt={c} /></td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
  if (b.t === 'check') return <AjudaChecklist itens={b.itens} docId={docId} />;
  return null;
};

const AjudaChecklist = ({ itens, docId }) => {
  const d = new Date();
  const [mes, setMes] = React.useState(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  const chave = `eq-check-${docId}-${mes}`;
  const ler = () => { try { return JSON.parse(localStorage.getItem(chave) || '{}'); } catch { return {}; } };
  const [marcados, setMarcados] = React.useState(ler);
  React.useEffect(() => { setMarcados(ler()); }, [chave]);
  const alterna = (i) => {
    const n = { ...marcados, [i]: !marcados[i] };
    setMarcados(n);
    try { localStorage.setItem(chave, JSON.stringify(n)); } catch {}
  };
  const feitos = itens.filter((_, i) => marcados[i]).length;
  return (
    <div style={{ margin: '10px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <input type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} style={{ height: 32, padding: '0 8px', border: '1px solid var(--line-strong, var(--line))', borderRadius: 'var(--r-md)', background: 'var(--field, var(--surface))', color: 'var(--ink)' }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: feitos === itens.length ? 'var(--c-pos)' : 'var(--ink-mute)' }}>{feitos} de {itens.length} conferidos{feitos === itens.length ? ' — pode liberar o pagamento' : ''}</span>
      </div>
      {itens.map((it, i) => (
        <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer', background: marcados[i] ? 'var(--c-pos-bg, #EEF7F0)' : 'transparent' }}>
          <input type="checkbox" checked={!!marcados[i]} onChange={() => alterna(i)} style={{ marginTop: 3 }} />
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: marcados[i] ? 'var(--ink-mute)' : 'var(--ink-soft)', textDecoration: marcados[i] ? 'line-through' : 'none' }}>{it}</span>
        </label>
      ))}
    </div>
  );
};

// baixa o PDF original guardado junto com o documento
async function ajBaixarPdf(doc) {
  const r = await window.__sbRest(`/ajuda_documentos?id=eq.${doc.id}&select=pdf_base64,pdf_nome`);
  const row = r && r[0];
  if (!row || !row.pdf_base64) { alert('Este documento não tem PDF anexado.'); return; }
  const bin = atob(row.pdf_base64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = row.pdf_nome || (doc.id + '.pdf');
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Documento em duas colunas: sumário fixo à esquerda, conteúdo à direita
const AjudaDocumento = ({ doc, alvo }) => {
  const partes = (doc.conteudo?.partes || []).filter(p => p.id !== 'checklist');
  const [ativa, setAtiva] = React.useState(partes[0]?.id);
  const [baixando, setBaixando] = React.useState(false);
  const idSec = (id) => 'ajdoc-' + doc.id + '-' + id;
  const ir = (id, bloco) => {
    setAtiva(id);
    const el = document.getElementById(bloco != null ? idSec(id) + '-b' + bloco : idSec(id)) || document.getElementById(idSec(id));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: bloco != null ? 'center' : 'start' });
      if (bloco != null) { el.style.transition = 'background .3s'; el.style.background = 'var(--accent-soft, #E8F0FE)'; setTimeout(() => { el.style.background = ''; }, 1800); }
    }
  };
  React.useEffect(() => { if (alvo && alvo.doc === doc.id && alvo.parte) setTimeout(() => ir(alvo.parte, alvo.bloco), 80); }, [alvo]);
  const baixar = async () => { setBaixando(true); try { await ajBaixarPdf(doc); } catch (e) { alert('Não consegui baixar: ' + e.message); } setBaixando(false); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 22, alignItems: 'start' }}>
      <nav style={{ position: 'sticky', top: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', letterSpacing: 0.5, margin: '2px 10px 6px' }}>SUMÁRIO</div>
        {partes.map(p => (
          <button key={p.id} onClick={() => ir(p.id)} style={{ textAlign: 'left', border: 'none', cursor: 'pointer', padding: '7px 10px', borderRadius: 'var(--r-md)', fontSize: 13, lineHeight: 1.3,
            background: ativa === p.id ? 'var(--accent-soft, #E8F0FE)' : 'transparent', color: ativa === p.id ? 'var(--accent)' : 'var(--ink-soft)', fontWeight: ativa === p.id ? 700 : 500 }}>
            {p.titulo.replace(/^Parte ([IVX]+) — /, '$1. ')}
          </button>
        ))}
        <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0 4px' }} />
        <button onClick={baixar} disabled={baixando} style={{ ...ajBtnLink, textAlign: 'left', padding: '6px 10px' }}>{baixando ? 'Baixando…' : '⬇ Baixar PDF original'}</button>
        <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', padding: '4px 10px' }}>{doc.versao} · confidencial, uso interno</div>
      </nav>
      <div style={{ ...ajCard, borderLeftColor: 'var(--accent)', padding: '6px 24px 22px' }}>
        {doc.conteudo?.intro && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 820 }}>{doc.conteudo.intro}</p>}
        {partes.map(p => (
          <section key={p.id} id={idSec(p.id)} style={{ maxWidth: 900, scrollMarginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '24px 0 4px', paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>{p.titulo}</h3>
            {p.blocos.map((b, i) => <div key={i} id={idSec(p.id) + '-b' + i} style={{ borderRadius: 'var(--r-md)', margin: '0 -8px', padding: '0 8px' }}><AjudaBloco b={b} docId={doc.id} /></div>)}
          </section>
        ))}
        {doc.conteudo?.aprovacao && <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 20 }}>{doc.conteudo.aprovacao}</p>}
      </div>
    </div>
  );
};

// ─── Aba Ajuda: central de ajuda com busca ─────────────────────────────────
const AjudaPage = () => {
  const [docs, setDocs] = React.useState(null);
  const [termo, setTermo] = React.useState('');
  const [aba, setAba] = React.useState(null);
  const [alvo, setAlvo] = React.useState(null);
  const [termoMarca, setTermoMarca] = React.useState('');
  const ordem = ['hoje', 'dashboard', 'caixa', 'contas', 'projecao', 'impostos', 'compras', 'equipe_pag', 'repasse', 'provisoes', 'rh', 'relatorios', 'agenda', 'equipe', 'perfil', 'config'];

  React.useEffect(() => { ajCarregarDocs(true).then(d => setDocs(d || [])); }, []);
  const pop = (docs || [])[0];
  const abaAtual = aba || (docs == null ? null : (pop ? 'doc' : 'telas'));

  // leva até um resultado (vindo da busca daqui ou da busca do topo do sistema)
  const abrir = (a, t) => {
    setTermo(''); setTermoMarca(t || ''); setAba(a.aba); setAlvo({ ...a, _n: Date.now() });
    if (a.aba !== 'doc') setTimeout(() => {
      const el = document.getElementById(a.tela ? 'ajtela-' + a.tela : a.conceito != null ? 'ajconc-' + a.conceito : '');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };
  React.useEffect(() => {
    const vem = () => { const a = window.__eqAjudaAlvo; if (a) { window.__eqAjudaAlvo = null; abrir(a.alvo, a.termo); } };
    vem();
    window.addEventListener('eq-ajuda-ir', vem);
    return () => window.removeEventListener('eq-ajuda-ir', vem);
  }, []);

  const indice = React.useMemo(() => ajIndice(docs || []), [docs]);
  const resultados = termo.trim().length >= 2 ? ajBuscar(indice, termo, 40) : null;
  const grupos = resultados ? [...new Set(resultados.map(r => r.grupo))].map(g => ({ g, itens: resultados.filter(r => r.grupo === g) })) : [];

  const reativar = () => {
    ordem.forEach(k => localStorage.removeItem('infinity-ajuda-hide-' + k));
    alert('Pronto! As caixas de ajuda voltam a aparecer no topo de cada tela.');
  };
  const checklist = pop && (pop.conteudo?.partes || []).find(p => p.id === 'checklist');
  const itensCheck = checklist ? ((checklist.blocos || []).find(b => b.t === 'check') || {}).itens || [] : [];
  const ABAS = [
    ...(pop ? [{ value: 'doc', label: pop.titulo }] : []),
    ...(itensCheck.length ? [{ value: 'checklist', label: 'Checklist do mês' }] : []),
    { value: 'telas', label: 'Telas do sistema' },
    { value: 'conceitos', label: 'Conceitos' },
  ];

  return (
    <div>
      <window.PageHeader title="Central de ajuda" subtitle="O manual do financeiro (POP), o passo a passo de cada tela e os conceitos que se repetem"
        action={<window.Btn variant="ghost" icon="sparkles" onClick={reativar}>Reativar dicas nas telas</window.Btn>} />

      {/* busca da ajuda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 14px', margin: '4px 0 16px', maxWidth: 720,
        border: '1px solid var(--line-strong, var(--line))', borderRadius: 'var(--r-lg)', background: 'var(--field, var(--surface))' }}>
        <window.Icon name="search" size={18} style={{ color: 'var(--ink-mute)' }} />
        <input value={termo} onChange={e => setTermo(e.target.value)} autoFocus
          placeholder='Pesquisar na ajuda — ex.: "glosa", "dia 20", "CND", "INSS", "evolução"'
          style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, color: 'var(--ink)' }} />
        {termo && <button onClick={() => setTermo('')} style={{ ...ajBtnLink, color: 'var(--ink-mute)' }}>✕</button>}
      </div>

      {resultados ? (
        <div style={{ maxWidth: 900 }}>
          {!resultados.length && <div style={{ fontSize: 13.5, color: 'var(--ink-mute)', padding: '10px 2px' }}>Nada encontrado para "{termo}". Tente outra palavra.</div>}
          {grupos.map(({ g, itens }) => (
            <div key={g} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', letterSpacing: 0.5, marginBottom: 6 }}>{g.toUpperCase()} · {itens.length}</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {itens.map((r, i) => (
                  <button key={i} onClick={() => abrir(r.alvo, termo)} style={{ ...ajCard, textAlign: 'left', cursor: 'pointer', borderLeftColor: g === 'Conceitos' ? 'var(--c-secondary)' : 'var(--accent)' }}>
                    <AjTermo.Provider value={termo}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}><AjMarca txt={r.titulo} /></div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginTop: 2 }}><AjMarca txt={r.trecho} /></div>
                    </AjTermo.Provider>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {abaAtual && <window.Segmented options={ABAS} value={abaAtual} onChange={(v) => { setAba(v); setTermoMarca(''); }} />}
          {termoMarca && <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', margin: '10px 0 0' }}>Destacando "{termoMarca}" · <button onClick={() => setTermoMarca('')} style={ajBtnLink}>limpar destaque</button></div>}
          <div style={{ marginTop: 16 }}>
            <AjTermo.Provider value={termoMarca}>
              {docs == null && <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Carregando…</div>}
              {abaAtual === 'doc' && pop && <AjudaDocumento doc={pop} alvo={alvo} />}
              {abaAtual === 'checklist' && (
                <div style={{ ...ajCard, maxWidth: 820, padding: '14px 20px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Checklist de fechamento mensal</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '3px 0 6px' }}>Só libere o pagamento quando todos os itens estiverem conferidos. As marcações ficam guardadas por mês neste navegador.</div>
                  <AjudaChecklist itens={itensCheck} docId={pop.id} />
                </div>
              )}
              {abaAtual === 'telas' && (
                <div style={{ display: 'grid', gap: 10, maxWidth: 900 }}>
                  {ordem.filter(k => AJUDA[k]).map(k => (
                    <div key={k} id={'ajtela-' + k}>
                      <AjudaTelaCard key={k + (alvo && alvo.tela === k ? alvo._n : '')} chave={k} nome={AJUDA_TITULOS[k] || k} info={AJUDA[k]} abertoInicial={!!(alvo && alvo.tela === k)} />
                    </div>
                  ))}
                  <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 8 }}>Dispensou uma caixa de ajuda numa tela e quer de volta? Clique em "Reativar dicas nas telas" lá em cima.</p>
                </div>
              )}
              {abaAtual === 'conceitos' && (
                <div style={{ display: 'grid', gap: 10, maxWidth: 900 }}>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>Ideias que aparecem no sistema todo e explicam por que os números às vezes parecem estranhos — e por que estão certos.</p>
                  {AJUDA_GLOSSARIO.map((g, i) => (
                    <div key={i} id={'ajconc-' + i} style={{ ...ajCard, borderLeftColor: 'var(--c-secondary)', outline: alvo && alvo.conceito === i ? '2px solid var(--accent)' : 'none' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}><AjMarca txt={g.termo} /></div>
                      <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}><AjMarca txt={g.texto} /></div>
                    </div>
                  ))}
                </div>
              )}
            </AjTermo.Provider>
          </div>
        </>
      )}
    </div>
  );
};

Object.assign(window, { AJUDA, AJUDA_GLOSSARIO, AJUDA_TITULOS, AjudaBanner, AjudaPage, eqAjudaBuscar });
