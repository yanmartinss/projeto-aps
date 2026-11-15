# Design, etapa 3: Painel do síndico no estilo "CondoMaster"

## Intenção e motivo
O usuário (estudante, projeto de faculdade, sozinho) colocou 4 imagens de referência em `frontend/projeto-aps-frontend/src/mocks/` ("telas sindico1..4.jpeg", um sistema chamado CondoMaster) e pediu que a **tela do síndico fique parecida com elas, com os dados vindo "com ajuda de IA ou pesquisa com IA"**. Respondeu às perguntas de escopo assim: construir **layout novo + Dashboard + Ocorrências + Reservas**; a IA **lê os dados reais e resume**, e a busca do topo aceita perguntas em português; **manter as cores atuais (azul `#1F5BFF` e sol `#FFC83D`)** e copiar só o layout dos mocks.

## O que os mocks mostram (referência)
- **Casca:** barra lateral à esquerda (Operação: Dashboard, Reservas de Áreas, Gestão de Ocorrências, Portaria e Encomendas; Administração: Financeiro, Moradores, Configurações) e barra superior com seletor de condomínio, **campo de busca** e usuário.
- **Gestão de Ocorrências:** 4 cartões de indicadores (Abertos/Triagem, Em Orçamento, Em Execução Ativa, Concluídos no mês); alternância **Quadro Kanban / Lista Detalhada**; chips de filtro (Todos, Urgentes, Em Andamento, Concluídos); kanban de 4 colunas (Abertos/Triagem, Em Análise/Orçamento, Em Execução, Resolvidos/Concluídos) com cartões (categoria, urgência, solicitante, responsável); **painel lateral de detalhe** com descrição, fotos, **histórico e diálogo com o condômino** e botões Atualizar status e Delegar.
- **Reservas:** calendário mensal com os eventos, painel de **solicitações pendentes** com Aprovar/Recusar, e cartões das **áreas comuns** (capacidade, taxa, regra).
- **Dashboard:** saudação com resumo da operação, indicadores, ocorrências críticas com ação, próximas reservas, comunicados, financeiro e portaria.
- **Portaria e Encomendas:** pacotes, visitantes, câmera, armários. (Fora desta etapa.)

## Objetivos
1. **Nova casca** (barra lateral + barra superior) com o visual atual, para todos os perfis; cada perfil vê só os seus itens.
2. **Dashboard do síndico** com números reais e um **resumo escrito pela IA** a partir dos dados reais.
3. **Gestão de Ocorrências** em kanban de 4 colunas, com alternância para lista, cartões de indicadores, filtros, painel lateral de detalhe com **conversa com o morador** e **delegação a um funcionário**.
4. **Reservas** com **calendário mensal**, painel de pendentes (aprovar/recusar) e cartões das áreas.
5. **Busca com IA** na barra superior: o síndico escreve uma pergunta em português ("vazamentos abertos este mês", "reservas do apartamento 304") e recebe os registros.

## Não-objetivos
Portaria e Encomendas, Financeiro, Moradores (como módulo), Configurações, comunicados, câmera e visitantes; **fotos anexadas** às ocorrências; taxas e arrecadação das reservas; fotos das áreas comuns; seletor de vários condomínios; notificações push ou e-mail; arrastar e soltar no kanban é desejável, mas pode ser cortado.

## Anti-objetivos (falha mesmo que "funcione")
- A IA inventar números ou fatos no resumo (todo número vem do banco; o texto da IA só descreve o que foi fornecido).
- A busca com IA executar algo que o modelo escreveu (**a IA só devolve filtros estruturados; o código monta a consulta**, e só o síndico pode usar).
- Perder as regras de permissão que já existem no servidor.
- Ficar tão grande que não fique pronto: o corte vem na ordem descrita abaixo.

## Abordagens consideradas
**Busca com IA.** (1) A IA gera uma consulta SQL: descartada por risco de segurança. (2) **A IA traduz a pergunta em filtros estruturados (categoria, urgência, status, período, apartamento, texto), validados com Zod, e o código consulta o banco: escolhida.** (3) Só busca por palavras-chave: não usa IA e não atende ao pedido; fica como **plano B automático** quando a IA falha.
**Resumo do dia.** (1) A IA recebe os dados brutos e calcula: descartada (pode errar contas). (2) **O código calcula todos os números e a IA só redige em cima deles: escolhida.**
**Kanban.** (1) Biblioteca de arrastar e soltar: descartada (dependência a mais). (2) **Colunas e mudança de status por botões/seleção, com arrastar e soltar nativo do navegador se sobrar tempo: escolhida.**

## Desenho

### Casca (todos os perfis)
Barra lateral fixa à esquerda, branca, com a marca e os itens do perfil; item ativo em azul suave com barra azul à esquerda. Barra superior branca com o nome do condomínio (configurável por `CONDOMINIO_NOME`, padrão "Condomínio"), a **busca com IA** (só para o síndico) e o usuário com "Sair". No celular a barra lateral vira um menu que abre sobre a tela. A tela de login continua como está. Itens por perfil: **síndico**: Dashboard, Ocorrências, Reservas, Passagem de turno, Regimento, Usuários, Assistente. **Morador**: Registrar ocorrência, Minhas ocorrências, Reservas, Assistente. **Funcionário**: Registrar ocorrência, Minhas ocorrências, Passagem de turno, Assistente.

### Ocorrências: novo fluxo de status
Status passam a ser `aberta` (Abertos/Triagem), `em_analise` (Em análise/Orçamento), `em_execucao` (Em execução) e `resolvida` (Resolvidos/Concluídos). A migração converte o atual `em_andamento` em `em_execucao`. Novos dados: `responsavelId` (funcionário que recebeu o chamado) e uma tabela de **comentários** (`ocorrenciaId`, `autorId`, `texto`, `criadoEm`). A tela atual "Painel" é **substituída** pela nova "Ocorrências" (kanban/lista); a edição de resumo, categoria e urgência continua possível no painel lateral. Regras: o síndico muda status, delega e comenta em qualquer ocorrência; o **autor** (morador ou funcionário) vê apenas as próprias em "Minhas ocorrências", lê a conversa e responde; ninguém mais vê.

### Ocorrências: indicadores e filtros
Quatro cartões com contagens por status (e a de urgentes). Concluídos no mês conta as resolvidas no mês corrente. Filtros: Todos, Urgentes (urgência alta e não resolvidas), Em andamento (em análise e em execução), Concluídos; mais um campo de filtro por texto. Lista detalhada: a mesma informação em tabela.

### Dashboard (síndico)
Saudação e **"Visão geral" escrita pela IA** (3 a 4 frases) sobre os números do dia; quatro indicadores (ocorrências abertas e urgentes, em execução, reservas pendentes, reservas aprovadas futuras); **Ocorrências críticas** (urgência alta e não resolvidas, com botão que abre o painel de detalhe); **Próximas reservas** (aprovadas, as 5 mais próximas); um gráfico simples de ocorrências por categoria nos últimos 30 dias. O resumo da IA é guardado em memória por 10 minutos e tem botão "Atualizar". Se a IA falhar, mostra um texto montado por regra com os mesmos números.

### Reservas (síndico)
Calendário mensal (navegação mês anterior/seguinte e "Hoje"), eventos coloridos por status (pendente em amarelo-sol, aprovada em verde), até 3 eventos por dia e "+N"; clicar no dia abre a lista do dia. Ao lado, o painel de **solicitações pendentes** com Aprovar e Recusar (motivo obrigatório), como já existe. Abaixo, cartões das **áreas comuns** com funcionamento e duração máxima (sem foto e sem taxa nesta etapa). O morador mantém a tela atual de pedir reserva.

### Busca com IA (barra superior, só síndico)
`POST /busca` com `{ pergunta }`: a IA devolve filtros estruturados (`tipo`: ocorrências, reservas ou moradores; `categoria`, `urgencia`, `status`, período `de`/`ate`, `apartamento`, `texto`), validados com Zod e com valores permitidos fixos; as datas relativas ("este mês", "semana passada") são **resolvidas no código** (mesma lição das reservas). O código consulta o banco e devolve até 20 resultados por tipo. Se a IA falhar, vale o plano B: busca por palavras no texto das ocorrências, no nome do morador e no apartamento. Cada resultado abre o painel de detalhe (ocorrência) ou o calendário no mês certo (reserva).

### API (novas ou alteradas, todas atrás do login e com checagem de perfil)
`GET /ocorrencias` (síndico, com indicadores), `GET /ocorrencias/minhas` (autor), `PATCH /ocorrencias/:id` (síndico: status, responsável, resumo, categoria, urgência), `GET`/`POST /ocorrencias/:id/comentarios` (síndico e autor), `GET /dashboard` (síndico: números, listas e resumo da IA), `POST /busca` (síndico), `GET /usuarios/funcionarios` (síndico, para delegar).

## Restrições
Reaproveitar a base: Express/Prisma/Zod, `ProvedorLLM` com fallback, `ErroHttp`, `autenticar`/`exigirPerfil`, os componentes e o CSS atuais; TypeScript do front sem `enum`; PostgreSQL com migrações do Prisma 7; sem bibliotecas novas de interface se der (calendário, kanban e gráficos feitos à mão). A IA continua com Gemini principal e Ollama de reserva, com os limites já medidos (Gemini instável, Ollama lento na CPU), então todo texto de IA precisa ter estado de carregamento e um plano B. O Gemini gratuito pode usar o conteúdo enviado; usar só dados de teste.

## Minhas decisões (calls do Claude; o usuário pode corrigir)
- A nova casca vale para **todos os perfis**, não só o síndico (um único layout; cada perfil vê os seus itens).
- **Minhas ocorrências** nasce para morador e funcionário, porque a conversa só faz sentido se o autor puder ler e responder.
- "Delegar" atribui a um **funcionário cadastrado** (não a prestadores externos).
- "Moradores" aparece apenas como resultado da busca com IA, sem módulo próprio.
- Estado `em_andamento` migra para `em_execucao`.

## Ordem de trabalho e corte (se o tempo apertar)
1. Casca + novos status + comentários + delegação (backend e API). 2. Kanban, painel de detalhe e Minhas ocorrências. 3. Dashboard e resumo da IA. 4. Reservas com calendário. 5. Busca com IA. 6. Testes e ajuste.
**Corte, do primeiro ao último:** arrastar e soltar; gráfico por categoria; cartões das áreas; lista detalhada; busca com IA (fica só o plano B por palavras); resumo da IA do dashboard (fica o texto por regra). O kanban com conversa e o calendário não encolhem.

## Decisões da revisão (respondidas pelo projeto ou decididas pelo Claude)
- **Dados enviados à IA.** Tudo o que existe no sistema é dado de teste (o usuário já foi avisado de que o Gemini gratuito pode usar o conteúdo). Mesmo assim, o envio é mínimo: o **resumo do dashboard** recebe só contagens e o texto curto do campo `resumo` das ocorrências críticas, **sem nomes de moradores e sem apartamentos**; a **busca** envia só a pergunta digitada, e a IA devolve filtros, nunca recebe registros.
- **Ocorrências antigas.** `Ocorrencia.autorId` já existe e é opcional. Linhas anteriores ao login não têm autor e são só dados de teste: continuam visíveis para o síndico e não aparecem em "Minhas ocorrências" de ninguém; não há retroalimentação. O perfil `funcionario` já existe em `Usuario`.
- **Status (decisão do Claude).** O síndico pode mover uma ocorrência entre quaisquer dos 4 status, inclusive **reabrir** uma resolvida. Novo campo `resolvidaEm`, preenchido ao entrar em `resolvida` e apagado ao reabrir; "Concluídos no mês" conta `resolvidaEm` no mês corrente (Brasília). Comentar em ocorrência resolvida é permitido.
- **Delegação com efeito (decisão do Claude).** O funcionário **responsável** passa a ver e a comentar as ocorrências delegadas a ele, em "Minhas ocorrências" (junto das que ele mesmo registrou). Sem isso, delegar seria só um rótulo.
- **Conversa (decisão do Claude).** Lista simples, em ordem de data; sem editar, sem apagar, sem marcador de "não lida" e sem notificação (o autor vê ao abrir a tela). Comentário de até 1000 caracteres.
- **Navegação.** Continua por estado no `App.tsx` com o `#hash`, sem roteador novo; a reestruturação é livre.
- **Datas.** Reaproveitar `backend/src/reservas/tempo.ts` (UTC no banco, Brasília na tela, mês corrente calculado em Brasília).
- **Busca por apartamento.** O apartamento existe como texto em `Usuario` (morador) e em `Reserva`; a comparação ignora caixa e espaços (como já é feito nas regras de reserva), então "304 b" encontra "304B".

## Telas do morador e Comunicados (acrescentado depois, a pedido do usuário)
O usuário adicionou 4 imagens do portal do morador em `src/mocks/` ("telas moraddor1..4.jpeg") e liberou pegar ideias dos mocks. O morador do mock usa **menu horizontal no topo** (Início, Encomendas, Reservas de Lazer, Financeiro, Registrar Ocorrência) e não a barra lateral do síndico. Entram:
- **Casca com dois modos:** barra lateral para síndico e funcionário; **menu no topo para o morador**. Mesma lista de itens, dois leiautes.
- **Início do morador:** saudação com apartamento; **ações rápidas** (Abrir chamado, Reservar espaço, Perguntar ao assistente); cartões "Minhas ocorrências em aberto" e "Próxima reserva"; **Mural de comunicados**; e "Regras rápidas do condomínio" (4 destaques do regimento extraídos pela IA, cada um ligado a um artigo real; se não houver regimento ou a IA falhar, o bloco some).
- **Comunicados (promovido a parte do plano):** tabela `Comunicado` (título, texto, categoria "Urgente/Operacional", "Convocação", "Aviso", autor, data). O síndico cria avisos com **rascunho da IA** a partir de uma frase ("água cortada sexta das 9h às 14h"); morador e funcionário leem no Início; o síndico vê no Dashboard. Rotas: `GET /comunicados` (todos os perfis), `POST /comunicados` e `POST /comunicados/rascunho` (síndico), `DELETE /comunicados/:id` (síndico).
- **Reservas do morador:** a tela atual ganha "Minhas reservas ativas" em destaque e **cartões dos espaços** (funcionamento e duração máxima, botão "Reservar" que já escolhe a área; sem foto nem taxa).
**Fora desta etapa, por exigirem módulos novos:** Encomendas e armário/PIN, Financeiro e boletos, liberar visitante por QR, portaria em tempo real, Configurações, câmera e fotos anexadas.
**Ordem:** os Comunicados e o Início do morador vêm depois do calendário de reservas e antes da busca com IA. **Corte, em ordem:** "Regras rápidas" (IA), cartões dos espaços, arrastar e soltar, gráfico por categoria, lista detalhada, busca com IA (fica só o plano B por palavras).

## Estado da implementação
Construído e testado: casca com dois modos (barra lateral e menu no topo), novos status, delegação, conversa, Minhas ocorrências, Dashboard com resumo da IA (com trava de números e plano B), quadro com arrastar e soltar e lista detalhada, calendário de reservas, cartões das áreas comuns, Comunicados com rascunho da IA, Início do morador e busca com IA (com plano B por palavras). **Não construído:** "Regras rápidas do condomínio" no Início do morador (destaques do regimento extraídos pela IA), que era o primeiro item do corte.

## Fica para quem constrói
Nome e posição exata dos itens do menu, textos, detalhes visuais do kanban e do calendário, formato do cache do resumo, limite de resultados da busca, prompts.

## Verificação
- Migração: ocorrências existentes em `em_andamento` viram `em_execucao`; nada some.
- Permissões (servidor): morador e funcionário **não** acessam kanban, dashboard, busca e `/usuarios/funcionarios`; só o autor lê e comenta nas próprias ocorrências; o síndico vê tudo.
- Kanban: contagens dos cartões batem com as colunas; mudar status e delegar persistem; comentário do síndico aparece para o morador e a resposta do morador aparece para o síndico.
- Dashboard: números iguais aos do banco; o resumo da IA não cita número que não esteja nos dados; com a IA fora do ar, o texto por regra aparece.
- Busca: 5 perguntas em português devolvem os registros certos (por categoria, status, período e apartamento); uma pergunta absurda devolve "nada encontrado"; com a IA fora do ar, cai na busca por palavras; a IA nunca executa texto que ela mesma gerou.
- Calendário: reservas aparecem no dia certo, no fuso de Brasília, inclusive nas viradas de mês.
- Geral: `tsc`, lint, build, testes automatizados, navegador em 1280 px e 390 px, e as telas das etapas anteriores sem quebrar.
