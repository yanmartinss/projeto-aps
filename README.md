# Ocorrências do condomínio

Sistema para moradores, funcionários e síndico: registro de ocorrências com triagem por IA, passagem de turno, assistente do regimento (busca por IA) e reservas de áreas comuns. Back-end em Node.js (Express, Prisma 7, Zod) com PostgreSQL, front-end em React (Vite).

## Perfis
- **Morador** (menu no topo): cria a própria conta. Tem o **Início** com o mural de comunicados, registra ocorrências, acompanha e conversa sobre elas em **Minhas ocorrências**, pede reservas e tira dúvidas no assistente.
- **Funcionário** (barra lateral): conta criada pelo síndico. Registra ocorrências, vê e comenta as que o síndico delegar a ele, lê os comunicados, gera a passagem de turno e usa o assistente.
- **Síndico** (barra lateral): conta criada na primeira vez que o servidor sobe, e atualizada a cada início a partir do `.env`. Tem o **Dashboard** (números reais e resumo do dia escrito pela IA), a **gestão de ocorrências** em quadro ou lista (arrastar entre colunas, conversar com o morador, delegar a um funcionário), as **reservas** em calendário, os **comunicados** (com rascunho da IA), o regimento, a criação de funcionários e uma **busca com IA** na barra superior (ex.: "vazamentos abertos este mês", "reservas do apartamento 101").

## Como a IA é usada
A IA nunca decide o que precisa ser exato. O código calcula números, datas e regras de reserva, e valida tudo o que a IA devolve. A IA classifica ocorrências, escreve o resumo do dia em cima dos números calculados (se citar um número que não existe nos dados, o texto é descartado), escreve rascunhos de comunicado, responde dúvidas com base no regimento (citando o artigo) e traduz perguntas da busca em filtros. Sem IA, cada uma dessas partes tem um plano B.

## Pré-requisitos
Node.js 22 ou mais novo e Docker. Uma chave do Gemini (grátis em https://aistudio.google.com/apikey) para a IA. O Ollama é opcional (IA de reserva).

## Como rodar
```
# 1) Banco de dados (Postgres na porta 5433) e, se quiser, a IA local
docker compose up -d postgres
docker compose up -d ollama
docker compose exec ollama ollama pull llama3.2:3b     # só se usar o Ollama

# 2) Back-end
cd backend
cp .env.example .env        # preencha GEMINI_API_KEY, JWT_SECRET, SINDICO_EMAIL e SINDICO_SENHA
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev                  # http://localhost:3333

# 3) Front-end (em outro terminal)
cd frontend/projeto-aps-frontend
npm install
npm run dev                  # http://localhost:5173
```

Gere o `JWT_SECRET` com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. O servidor não sobe sem ele.

Entre com o e-mail e a senha do síndico que você colocou no `.env`. Para testar o assistente, envie o PDF `exemplos/regimento-interno-vista-verde.pdf` pela tela "Regimento" e use as perguntas de `exemplos/perguntas-de-teste.md`.

**Atividades da equipe:** o síndico atribui tarefas (com prioridade e prazo) a funcionários cadastrados na tela "Atividades"; o funcionário vê, inicia e conclui em "Minhas atividades".

**Esqueci minha senha:** não há envio de e-mail. A pessoa pede na tela de login, o pedido aparece no sino do síndico e em "Usuários", e o síndico clica em "Gerar link de redefinição" e entrega o link (vale 2 horas e só funciona uma vez). A senha do síndico é definida no `.env`.

**Aparência:** paleta e fontes ficam no bloco `:root` de `frontend/projeto-aps-frontend/src/tema.css`; o nome do condomínio vem de `VITE_CONDOMINIO_NOME`.

## Testes
`cd backend && npm test` roda os testes das regras de reserva, das datas e da senha.

## Observações
- Tudo que o banco guarda fica no volume do Docker `projeto-aps_postgres_data`. Para recomeçar do zero: `docker compose rm -sf postgres && docker volume rm projeto-aps_postgres_data`.
- Se a IA principal (Gemini) falhar, o sistema tenta o Ollama e, sem nenhum dos dois, as ocorrências continuam sendo salvas, só sem classificação.
- O assistente do regimento usa embeddings do Gemini. Se a cota grátis acabar, o sistema indexa e busca com o Ollama (`docker exec aps-ollama ollama pull bge-m3`, uma vez). O índice guarda qual modelo usou e as perguntas usam o mesmo. Trocar o provedor principal no `.env` exige "Reindexar" na tela do síndico.

**Reservas:** a reserva é do dia inteiro (8h às 22h), só a partir do dia seguinte e até 3 meses à frente. O morador escolhe a área e a data (dd/mm/aaaa); não há escolha de horário.

**Encomendas:** a portaria (funcionário ou síndico) registra a encomenda que chegou com o número do apartamento. O morador desse apartamento vê o aviso no sino e no Início, e a tela Encomendas lista o que está esperando e o que já foi retirado. A portaria marca como retirada quando o morador busca.
