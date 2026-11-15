# Design: Portal do condomínio ("Aviso de elevador")

O visual lembra um aviso bem escrito colado no hall: papel quente, uma cor de marca sóbria e um acento usado pouco. Os tokens ficam no bloco `:root` de `src/tema.css` (carregado por último); para trocar a paleta do app inteiro, mude só esse bloco.

## Cores
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#f6f2ea` | fundo das telas (papel quente) |
| `--surface` | `#fffdf8` | cartões e campos |
| `--surface-2` | `#efe9dd` | áreas secundárias, colunas do quadro |
| `--border` / `--border-strong` | `#e4dccd` / `#c4b9a3` | linhas finas e bordas de campos |
| `--text` / `--text-2` | `#1c2a2e` / `#565f5a` | texto principal e secundário (AA sobre o fundo) |
| `--brand` | `#1d5468` | azul-petróleo: botões, item de menu ativo, links |
| `--sun` | `#b8482c` | acento ferrugem: aba ativa, sublinhado de link, pedidos pendentes |
| `--erro` | `#a3281a` | mensagens de erro |

## Tipografia
- Títulos: Fraunces (variável), peso 600, entrelinha curta.
- Texto e controles: Public Sans (variável).
- Pacotes `@fontsource-variable/fraunces` e `@fontsource-variable/public-sans`, importados em `src/main.tsx`.

## Login
Coluna única, sem cartão, sem ícones e sem lista de recursos. Abas "Entrar / Criar conta" em texto sublinhado, campos com rótulo visível, foco com contorno de 3px, erro em bloco com borda lateral. "Esqueci minha senha" abre o pedido; o síndico gera um link de 2 horas (uso único) em Usuários.

## Regras
- Um único acento (ferrugem), nunca em áreas grandes.
- Sem gradientes. Cantos de 4 a 12px conforme o tamanho do elemento.
- Contraste AA, foco sempre visível, nenhuma tela com rolagem horizontal em 390px.
