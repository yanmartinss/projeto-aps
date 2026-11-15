# Como testar o assistente do regimento

1. Entre como **síndico** e abra **Regimento** no menu.
2. Envie o arquivo `regimento-interno-vista-verde.pdf` (está nesta pasta). Aparece "52 trechos indexados".
3. Abra **Assistente** (qualquer perfil pode usar) e faça as perguntas abaixo.

O regimento é **fictício**. O `.html` ao lado é o texto de origem, caso você queira editar e gerar o PDF de novo (abra no Edge ou Chrome e use "Imprimir > Salvar como PDF").

## Perguntas que o regimento responde

A resposta deve citar o artigo indicado em "Fonte".

| Pergunta | Fonte esperada | O que a resposta deve dizer |
|---|---|---|
| Posso ter cachorro grande? | Art. 9º (e 10º) | Pode, de qualquer porte; nas áreas comuns, na guia e com focinheira |
| Até que horas posso fazer barulho? | Art. 5º | Silêncio das 22h às 8h (domingos e feriados até as 10h) |
| Quando posso fazer obra no apartamento? | Art. 7º | Seg a sex 8h às 17h, sábado 9h às 13h; avisar a portaria com 5 dias |
| Posso fumar no salão de festas? | Art. 8º | Não, é proibido nas áreas comuns fechadas |
| Qual o horário de mudança? | Art. 18º | Seg a sáb, 8h às 18h, só no elevador de serviço |
| Posso lavar meu carro na garagem? | Art. 15º | Não, sem autorização do síndico |
| Quanto tempo meu visitante pode deixar o carro? | Art. 16º | No máximo 12 horas seguidas |
| Posso alugar meu apartamento por temporada? | Art. 22º | Não, é vedada a locação por menos de 30 dias |
| A piscina abre na segunda? | Art. 23º | Não, é o dia da limpeza |
| Quantos convidados posso levar na piscina? | Art. 24º | Até quatro por vez |
| Quantas reservas posso ter por semana? | Art. 28º | Uma reserva ativa por semana por unidade (reserva vale o dia inteiro, 8h às 22h) |
| Com quantos dias de antecedência posso reservar o salão? | Art. 29º | A partir de amanhã e até 3 meses à frente |
| Quantas pessoas cabem na churrasqueira? | Art. 30º | No máximo 25 |
| Quanto custa a taxa de limpeza do salão? | Art. 31º | R$ 150,00 |
| Quando passa a coleta de lixo? | Art. 34º | Terças, quintas e sábados, de manhã |
| Criança pode andar sozinha no elevador? | Art. 39º | Não, menores de 10 anos só acompanhadas |
| Quem pode ver as imagens das câmeras? | Art. 41º | Só o síndico ou por ordem judicial |
| Qual a multa por atraso na taxa de condomínio? | Art. 42º | 2% de multa e 1% de juros ao mês |
| Com quanta antecedência sai o aviso de assembleia? | Art. 47º | Pelo menos 10 dias |
| Qual a multa se eu descumprir o regimento de novo? | Art. 50º (e 49º) | Uma vez a taxa na primeira reincidência, até cinco vezes depois |

## Perguntas que o regimento NÃO responde

O assistente deve dizer **"Não encontrei isso no regimento"**, sem citar artigo e sem inventar.

- Qual é a capital da França?
- Como faço para declarar imposto de renda?
- Qual o valor da taxa de condomínio? (o regimento só diz o vencimento e a multa, não o valor)
- Qual o telefone da portaria?
- Quem é o síndico atual?

## Perguntas para observar o comportamento (sem resposta única certa)

- "Posso ter um papagaio?" O regimento fala de "animais domésticos", sem listar espécies.
- "Posso fazer festa de aniversário no meu apartamento?" Mistura silêncio (Art. 5º e 6º) e convidados.
- "Posso reservar o salão se estou devendo o condomínio?" Art. 32º e 45º. Resposta correta: não.

## Dica para ver o fallback da IA

Com o Gemini fora do ar (chave inválida) e o Ollama ligado, o assistente continua respondendo, só que um pouco mais devagar e, às vezes, dizendo "não encontrei" em perguntas que o regimento cobre. Isso é esperado do modelo pequeno.
