# Especificação Visual v1 — Sistema de Estudos OAB

> Documento de identidade visual definitiva. Direção única, decidida e defendida.
> Detalhado para entrega direta ao Claude Code, sem ambiguidade de implementação.
> Os **nomes** dos tokens existentes (`--rose`, `--ink`, `--paper`, etc.) são preservados; mudam apenas os **valores**. Isso permite reskin global trocando o `:root` de `style.css`, sem mexer nas páginas.

---

## 0. O que já funciona e deve ser preservado

Antes de qualquer mudança, o que o projeto já acertou — e que esta v1 mantém como fundação:

- **A base de papel quente.** O off-white `#f9f7f4` com tinta carvão morno `#2c2420` (nunca preto absoluto) é exatamente a sensação premium correta. Mantida e refinada, não substituída.
- **Arquitetura de CSS custom properties + light/dark.** A estrutura de tematização por variáveis é a forma certa de fazer isso. Toda a v1 se encaixa nela.
- **Entrelinha generosa.** `line-height` 1.65 no corpo e ~1.9 na teoria. É o que faz o texto respirar. Mantido.
- **A escala de raios (8/14/20) e as sombras neutras em camadas.** Suaves, sem tinta colorida. Mantidas.
- **O painel de Foco estilo macOS** (overlay desfocado, traffic lights, animação de entrada). É o elemento mais "Apple premium" do projeto. Preservado integralmente.
- **Microlabels em maiúsculas com `letter-spacing` largo** (eyebrows, rótulos de seção, cabeçalhos de tabela). Editorial e elegante. Mantido como assinatura tipográfica.
- **O sistema de classes da teoria (`vde-*`) e do caderno (`cl-*`).** Estrutura semântica boa. Mantida; só re-estilizada.
- **Stylesheet de impressão/PDF, `tabular-nums` em estatística, glassmorphism sutil da sidebar, e a chuva de pétalas como microcelebração.** Tudo preservado.

O que **muda** (e por quê): o rosa atual (`#c4978f` / `#8e5c56`) lê como marrom/terracota empoeirado — não como rosa; o seletor de cores multi-hue (magenta, violeta, azul, ciano, esmeralda, coral, âmbar) é o maior risco de "template genérico / colorido em excesso" e dilui a marca; a logo em *Great Vibes* e o favicon `⚖️` são genéricos; e há quatro famílias display competindo (Playfair, Cormorant, Inter, Jakarta). A v1 resolve esses quatro pontos.

---

## 1. Conceito visual

**Direção escolhida: "Ateliê Editorial em Papel Quente".**

O produto se comporta como um **caderno de luxo encadernado à mão** que ganhou inteligência: superfície de papel cru, tipografia de livro, um único rosa de assinatura usado com a parcimônia de uma joia. Não é um app colorido com tema rosa — é um objeto editorial calmo onde o rosa aparece só quando significa algo (ação, foco, acerto, destaque).

A tensão central que define tudo: **neutros quentes que acalmam × um rosa vibrante que comanda.** 90% da tela é papel, tinta e linha; 10% é rosa. Esse 10% é o que faz parecer caro. Cor demais mata a sofisticação; é por isso que a disciplina cromática é a decisão estética mais importante deste documento.

Três princípios inegociáveis:

1. **O rosa é pontuação, não parágrafo.** Ele marca o que é acionável e o que é vitória. Nunca preenche fundos grandes nem colore texto de leitura.
2. **Papel antes de pixel.** Toda superfície remete a papel premium — leve textura de luz, sombras macias, cantos amigáveis. Zero estética "dashboard SaaS".
3. **Silêncio tipográfico.** Uma serifa editorial para a voz, uma sans neutra para o trabalho. Nada mais compete por atenção.

---

## 2. Personalidade da marca

Se o produto fosse uma pessoa: **uma estudante de Direito brilhante, organizada e serena, cujo material de estudo poderia estar exposto numa vitrine de papelaria fina.** Confiante sem ser dura. Feminina sem ser fofa. Disciplinada sem ser fria.

| Atributo | Como se manifesta visualmente |
|---|---|
| Organização | Grid rigoroso, hierarquia previsível, alinhamento óptico, espaçamento sistemático |
| Inteligência | Ícones de linha precisos, dados claros, zero ruído decorativo gratuito |
| Foco | Muito espaço em branco, uma única cor de destaque, painel de Foco dedicado |
| Calma | Paleta quente e dessaturada, transições suaves (cubic-bezier), nada pisca ou pula |
| Disciplina | Consistência absoluta de tokens, repetição como ritmo, sem exceções soltas |
| Sofisticação | Serifa de alto contraste, microlabels caixa-alta, sombras de papel |
| Feminilidade elegante | Rosa de assinatura, assinatura manuscrita na marca, toques líricos contidos |
| Premium | Acabamento de detalhe — raios, kerning, optical sizing, dark mode espresso |

**Voz (microcopy):** calorosa, breve, na primeira pessoa quando saúda ("Bom dia, Julia"), técnica e neutra no conteúdo jurídico. Nunca infantil, nunca gamificada com gírias. "Dia concluído", não "Mandou bem! +50 XP".

---

## 3. Branding

### 3.1 Logotipo principal (wordmark)

Assinatura em **Magical Feather** — o script caligráfico fluido e elegante (`Magical_Feather.ttf`). É a voz "feminina lírica" da identidade, e por ser caligráfica, traduz "isto é pessoal, é da Ju". Uso: `Exame da Ordem` ou simplesmente a assinatura do produto.

- Tinta: `--ink` sobre claro; `--rose-300` claro sobre fundos escuros/rosa.
- Acompanha **sempre** um subtítulo em Inter caixa-alta tracking largo: `PREPARATÓRIO OAB · 1ª FASE`.
- A Magical Feather é **exclusiva da marca** — nunca aparece em títulos de página, cards ou conteúdo.

### 3.2 Selo / monograma

**Kathen** (o brush bold e firme) dentro de um círculo fino — o "selo de cera" do caderno. Transmite a parte "disciplina/confiança" da personalidade. Uso: avatar, favicon, marca d'água de impressão, loading.

- Monograma: `OAB` em Kathen, centralizado no círculo (3 letras — ajustar tamanho/tracking para caber com folga), círculo de 1.5–3px em `--rose`, fundo `--paper`.
- Kathen também é **exclusiva da marca/selo** — não vaza para a UI.

### 3.3 Favicon

Aposentar o `⚖️` dourado. Novo favicon = o **selo**: quadrado de canto arredondado `--ink` (espresso no dark) com o monograma `OAB` em Kathen rosa centralizado. SVG, dois temas.

### 3.4 Regra de ouro das fontes da Ju

> Magical Feather e Kathen vivem **somente** no território da marca (logo, selo, favicon, capas de PDF, telas de abertura). Jamais em títulos de conteúdo, navegação, cards ou texto. Essa contenção é o que as mantém especiais.

---

## 4. Tipografia

### 4.1 As duas famílias de trabalho

**Decisão única e defendida:** consolidar as quatro famílias atuais em **duas** — uma serifa editorial variável e uma sans neutra. Defesa: o brief pede premium + extremamente legível + referências Apple/Notion/editorial. Fraunces entrega o "livro de luxo" (e seu eixo óptico `opsz` cobre desde manchete gigante até leitura corrida, então é *uma* família fazendo dois trabalhos). Inter entrega exatamente o silêncio neutro de Notion/macOS. Duas famílias = disciplina; variáveis = um arquivo cada.

| Papel | Fonte | Por quê |
|---|---|---|
| **Display / títulos / editorial** | **Fraunces** (variável `opsz,wght,SOFT,WONK`) | Serifa old-style com optical sizing e eixo SOFT levemente humanista. Lê como livro fino, não como blog. Itálico com personalidade para *ênfases*. |
| **UI / corpo / dados / navegação** | **Inter** (variável `opsz,wght`) | Neutra, calma, legibilíssima. É a "voz Notion/Apple". Tabular-nums para estatística. |
| Marca | Magical Feather + Kathen | Vide §3. Somente branding. |

> Substitui Playfair Display, Cormorant Garamond, Great Vibes e Plus Jakarta Sans. A teoria, que hoje roda em Inter, continua em Inter (com ajustes de leitura, §15) — coerente.

Import (Google Fonts):
```
Fraunces: ital,opsz,wght@0,9..144,300..600;1,9..144,300..600 + axes SOFT,WONK
Inter:    opsz,wght@14..32,400..700
```

### 4.2 Escala tipográfica (type scale)

Razão ~1.25 (major third), ancorada em 16px. Variável `opsz` da Fraunces acompanha o tamanho.

| Token | Família / peso / opsz | Tamanho / line-height | Uso |
|---|---|---|---|
| `--t-display` | Fraunces 500, opsz 144, SOFT 3 | 44px / 1.05, tracking −0.02em | H1 de página, número do countdown |
| `--t-h1` | Fraunces 500, opsz 110 | 32px / 1.1, −0.02em | Hero, títulos de seção grandes |
| `--t-h2` | Fraunces 500, opsz 72 | 24px / 1.2, −0.015em | Títulos de card, `vde-h2` |
| `--t-h3` | Fraunces 500, opsz 48 | 19px / 1.3 | Subtítulos, `vde-h3` |
| `--t-lead` | Fraunces Italic 400, opsz 40 | 18px / 1.5 | Citações, leads, *ênfase* em títulos |
| `--t-body` | Inter 400, opsz 16 | 16px / 1.65 | Corpo padrão |
| `--t-body-read` | Inter 400, opsz 18 | 18px / 1.85 | Leitura longa (teoria) |
| `--t-ui` | Inter 500, opsz 14 | 14px / 1.4 | Botões, links de nav, inputs |
| `--t-small` | Inter 500 | 13px / 1.5 | Metadados, legendas |
| `--t-eyebrow` | Inter 600 | 11px / 1, tracking 0.18em, CAIXA-ALTA | Microlabels, eyebrows, `th` |
| `--t-num` | Inter 600 `tabular-nums` | conforme contexto | Toda estatística e contagem |

**Regras de hierarquia tipográfica:**
- Título de página = Fraunces; a palavra-chave da página em *Fraunces Italic* `--rose` (substitui o `<em>` rosa atual — mantém o padrão, troca a fonte). Ex.: `Caderno *Legislativo*`.
- Ênfase no corpo = peso 600 Inter ou cor `--ink` (texto base em `--ink-soft`); destaque conceitual = fundo `--highlight-*`. Nunca itálico para ênfase no corpo (itálico é da serifa, voz editorial).
- Números sempre `tabular-nums` para não dançar.

---

## 5. Paleta

Filosofia: **neutros quentes governam; um rosa vibrante pontua; uma colher pequena de "temperos" só para dados.** Tudo dessaturado o suficiente para conviver sem gritar.

### 5.1 Escala Rosa — "Rosa Couture"

Um rosa magenta-quente, chique, de inspiração couture — vibrante no 600 (ação), suave nos claros (apoio). Substitui o rosa empoeirado atual.

| Token | Hex (light) | Uso |
|---|---|---|
| `--rose-50` / `--blush` | `#FDF2F6` | Wash de fundo, hover de superfície, base de hero |
| `--rose-100` / `--rose-soft` | `#FCE7EF` | Chip ativo de nav, tags, fundo de callout rosa |
| `--rose-300` | `#F0A6C2` | Rosa suave de apoio, bordas-rosa, dark accent text |
| `--rose-500` / `--rose` | `#D94B86` | Estado hover do primário, ícones de destaque |
| `--rose-600` / `--rose-deep` | `#C8336F` | **Ação primária, links ativos, foco. A cor da marca.** |
| `--rose-700` | `#A8265C` | Pressionado, texto rosa sobre blush |
| `--rose-900` | `#5C1431` | Tinta rosa profunda sobre superfícies rosa claras |
| `--dusty` (apoio) | `#C28A91` | Rosa empoeirado decorativo — avatar, detalhes, ilustração |

> `--rose`, `--rose-deep`, `--rose-soft`, `--blush` já são os nomes usados em todo o código — mantê-los apontando para os valores acima faz o reskin propagar sozinho.

### 5.2 Neutros quentes (a fundação)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--bg` / canvas | `#FAF8F5` | `#1A1714` | Fundo da aplicação (espresso no dark) |
| `--bg-soft` | `#F2EDE8` | `#221D18` | Hover de superfície, zebra de tabela |
| `--bg-deep` | `#E9E1D8` | `#2B241D` | Trilhos, divisórias suaves |
| `--paper` | `#FFFFFF` | `#211C18` | Cards, sidebar, painéis |
| `--paper-tint` | `#FDFCFA` | `#262019` | Inputs, áreas de escrita |
| `--ink` | `#211C19` | `#F1ECE4` | Texto principal (carvão morno, nunca #000) |
| `--ink-soft` | `#6B5D54` | `#C4B6AA` | Texto secundário, corpo longo |
| `--ink-faded` | `#A89A8E` | `#887A70` | Metadados, placeholders |
| `--ink-ghost` | `#D6CDC4` | `#4A4038` | Microlabels mais fracos, ícones inativos |
| `--line` | `#E7E0D9` | `#332C25` | Bordas padrão |
| `--line-soft` | `#EFEAE4` | `#28211B` | Bordas internas, separadores de linha |

### 5.3 Temperos editoriais (somente dados e categorias)

Cinco tons dessaturados que convivem em harmonia. **Uso restrito:** gráficos, tags de matéria, codificação por categoria. **Nunca** em chrome de UI, botões ou fundos grandes.

| Token | Hex | Papel |
|---|---|---|
| `--rose` | `#C8336F` | Categoria/série primária |
| `--champagne` / `--gold` | `#C9A24B` | Série secundária, "ouro" de conquista |
| `--sage` | `#8FA98C` | Série, estado positivo suave |
| `--lavender` | `#9F94C4` | Série, Constitucional (ver §5.5) |
| `--teal` | `#5E9C9C` | Série, dado frio |

### 5.4 Semânticas

Calibradas para conviver com o rosa sem brigar.

| Token | Hex | Uso |
|---|---|---|
| `--success` | `#5E8C6A` | Eucalipto suave — acerto, dia concluído |
| `--warning` / `--gold` | `#B8893E` | Âmbar terroso — alerta, "atenção banca" |
| `--error` | `#C0524B` | Vermelho-argila (vizinho do rosa, não destoa) — erro, alternativa errada |

### 5.5 Codificação por matéria (preservar conceito, formalizar tons)

Mantém os tokens `--penal`, `--trab` etc. já no código; padroniza para os temperos dessaturados. Cada par tem base (fundo de tag) e deep (texto).

| Matéria | Base | Deep |
|---|---|---|
| Constitucional | `#E5E1F2` | `#5B4F9E` (lavender) |
| Civil / Proc. Civil | `#FCE7EF` | `#A8265C` (rose) |
| Penal / Proc. Penal | `#F3E3D6` | `#9A6534` (champagne escuro) |
| Trabalho / Proc. Trabalho | `#DEEBDB` | `#4A6E48` (sage) |
| Tributário / Administrativo | `#DCEBEB` | `#3E7373` (teal) |
| Ética / CDC / Consumidor | `#F6E4D2` | `#B8893E` (gold) |

### 5.6 Retirada do seletor multi-hue

`cores.js` hoje deriva a paleta inteira a partir de oito presets de matiz (magenta, violeta, azul, ciano, esmeralda, coral, âmbar). **Recomendação:** aposentar a troca de matiz. Manter apenas o toggle **claro/escuro**. Opcional, se ela quiser personalização: um único controle de **intensidade do rosa** (sutil / vibrante) que ajusta `--rose-600` entre `#B83A6E` e `#D6266F` — sem nunca sair do rosa. Isso protege a marca e elimina o risco "colorido em excesso".

### 5.7 Sombras e geometria (mantidas)

```css
--shadow-sm: 0 1px 3px rgba(33,28,25,.05), 0 2px 6px rgba(33,28,25,.04);
--shadow:    0 2px 8px rgba(33,28,25,.07), 0 8px 24px rgba(33,28,25,.05);
--shadow-lg: 0 8px 32px rgba(33,28,25,.11), 0 20px 48px rgba(33,28,25,.07);
--radius-sm: 8px;  --radius: 14px;  --radius-lg: 20px;
--transition: .3s cubic-bezier(.4,0,.2,1);
```
Dark mode: trocar a tinta da sombra para `rgba(0,0,0,.4–.5)` (já é assim).

---

## 6. Espaçamentos

Escala base **4px**, com passos nomeados. Toda margem/padding deve sair desta régua — é o que cria o ritmo "organizado".

| Token | px | Uso típico |
|---|---|---|
| `--sp-1` | 4 | Gaps mínimos, ícone↔label |
| `--sp-2` | 8 | Padding interno apertado, chips |
| `--sp-3` | 12 | Padding de botão (vertical) |
| `--sp-4` | 16 | Padding de input, gap de lista |
| `--sp-5` | 24 | Padding interno de card |
| `--sp-6` | 32 | Gap entre cards, margem de seção |
| `--sp-7` | 48 | Padding de `main`, separação de blocos grandes |
| `--sp-8` | 64 | Respiro de topo de página |

**Densidade:** padding de card = `--sp-5` (24px); gap de grid de dashboard = `--sp-6` (32px); `main` = 48px topo / 56px laterais em desktop, 24px no mobile. Largura máxima de leitura de teoria = **68ch**. Nunca encostar texto na borda do papel.

---

## 7. Hierarquia visual

Ordem de leitura imposta por **tamanho → peso → cor**, nessa prioridade. A cor (rosa) é o último recurso, não o primeiro.

1. **Eyebrow** (`--t-eyebrow`, caixa-alta, `--ink-faded`) — contexto/categoria.
2. **Título** (Fraunces) — o assunto; palavra-chave em itálico rosa.
3. **Corpo** (Inter, `--ink-soft`) — a substância.
4. **Ação** (`--rose-600`) — o que fazer a seguir.

Regras:
- No máximo **uma** ação primária rosa por viewport. As demais são `.btn` neutro (fantasma/contorno).
- Estado ativo/atual sempre comunicado por `--rose-soft` (fundo) + `--rose-deep` (texto) — padrão já usado na nav, estendido a tudo.
- Divisórias são `--line` a 60% de opacidade; preferir espaço a linha sempre que possível.

---

## 8. Componentes

Inventário canônico. Todos herdam tokens de §5–§6.

**Botões**
- `.btn-primary`: fundo `--rose-600`, texto `#fff`, peso 600, raio 10px, padding 12×20. Hover → `--rose-500` + `translateY(-1px)` + sombra rosa `0 4px 14px rgba(200,51,111,.28)`.
- `.btn` (secundário): contorno `--line`, texto `--ink-soft`, fundo transparente → `--bg-soft` no hover.
- `.btn-ghost`: sem borda, só texto; hover `--bg-soft`.
- Altura padrão 40px; ícone de linha 18px à esquerda quando houver.

**Inputs / select / textarea**
- Fundo `--paper-tint`, borda `--line`, raio `--radius-sm`, padding 12×16.
- Foco: borda `--rose`, anel `0 0 0 3px var(--rose-soft)`. (já é o padrão — manter.)
- Label = `--t-eyebrow`.

**Tags / chips**
- Raio pílula (20px), `--t-eyebrow` minúsculo. Variantes por matéria (§5.5) e por estado (`--success`, etc.). Tag de incidência OAB ("Caiu OAB 39") = fundo `--rose-600`, texto branco — é o destaque-joia.

**Pills de status** (streak, countdown): fundo `--paper`, borda `--line`, número em Fraunces `--rose-deep`, label `--t-eyebrow`.

**Barra de progresso**: trilho 4px `--line-soft`; preenchimento gradiente `--rose-soft → --rose → --rose-deep`; transição 1.2s. (manter — é bonito e on-brand.)

**Callouts** (teoria e caderno) — 4 variantes, borda-esquerda 3px + fundo tonal:
- `lei` → `--lavender` / texto `--ink`
- `dica/doutrina` → `--sage`
- `aviso/atenção` → `--champagne`
- `pegadinha/alerta` → `--rose-soft` + borda `--rose` (a banca é rosa — o que mais importa na prova ganha a cor da marca)

**Ícones:** trocar emojis/símbolos da nav (✦ ◐ ☷ ↻ ⚖) por um **set de linha consistente** (Lucide ou Phosphor, stroke 1.5px, tamanho 18–20px, cor herda do texto). Isso sozinho eleva muito a sensação "inteligente/premium". Ícone ativo herda `--rose-deep`.

**Avatar:** círculo, borda 2px `--paper`, sombra-sm; fallback = monograma Kathen sobre gradiente `--rose-soft → --lavender`.

**Painel de Foco (macOS):** preservado. Único ajuste: título da janela em `--t-small`, traffic lights mantêm cores nativas (é citação proposital do macOS, e está perfeito).

---

## 9. Cards

O card é a unidade fundamental — uma "folha de papel".

- Fundo `--paper`, borda `1px --line`, raio `--radius` (14px), padding `--sp-5` (24px), `--shadow-sm`.
- Hover: eleva para `--shadow` + `translateY(-2px)`; transição suave. Sem mudar borda nem cor.
- Anatomia: `eyebrow` (opcional) → `título` Fraunces → conteúdo → ação no rodapé.
- **Card de destaque / hero:** fundo wash `--blush` (substitui o gradiente blush→rosa→lavanda atual, que era cor demais). Um único detalhe rosa permitido (número, botão ou tag). Manter o brilho radial branco sutil no canto — é elegante.
- **Card de matéria:** filete superior de 3px na cor `-deep` da matéria (§5.5) como única injeção de cor; resto neutro.
- Cantos de cards aninhados usam o raio imediatamente menor (14 dentro → 8 dentro).

---

## 10. Dashboards

Layout = **grid editorial assimétrico**, não uma grade uniforme de widgets SaaS.

- **Início:** linha 1 = card-hero largo (saudação Fraunces + citação em itálico + countdown como bloco-joia à direita, número em Fraunces display `--rose-deep`). Linha 2 = grid 3 colunas (`--sp-6` de gap) com Progresso do plano, Hoje, e um terceiro card de revisão/erros. Linha 3 = atividade recente / streak.
- **Hierarquia de dado:** um número herói grande em Fraunces por card, com seu label em `--t-eyebrow` acima. Apoio e contexto em Inter `--ink-soft`.
- **Vazio elegante:** estados vazios com ilustração mínima de linha + frase calma em Fraunces Italic, nunca um bloco cru.
- Respiro: dashboards nunca preenchem 100% da largura útil; manter `max-width` confortável (~1200–1400px) e centralizar.

---

## 11. Gráficos

Estética **"infográfico de revista"** — limpa, fina, dessaturada. Os gráficos atuais (CSS puro: barras, donut, ranking) são uma boa base; só re-tematizar.

Regras:
- **Série primária = `--rose-600`.** Demais séries puxam dos temperos (§5.3), nesta ordem: champagne → sage → lavender → teal. Nunca mais que 5 cores num gráfico.
- Grid/eixos = `--line` finíssimo; rótulos = `--t-eyebrow`/`--t-small` em `--ink-faded`.
- Números sempre `tabular-nums`.
- **Donut/progresso radial:** trilho `--bg-deep`, preenchimento rosa, centro com % em Fraunces.
- **Barras:** raio 4px no topo, cor sólida (sem gradiente nas séries de dado — gradiente só na progress-bar global), hover sobe opacidade levemente.
- **Linha:** stroke 2px rosa, ponto ativo com halo `--rose-soft`, área de preenchimento opcional a 8% de opacidade.
- Sem legendas pesadas: rotular direto ou usar `--donut-legend` enxuto com dot colorido + valor em Inter 600.
- Se evoluir para uma lib, manter Chart.js (já citado no ambiente) e aplicar esta paleta como tema.

---

## 12. Navegação

**Sidebar fixa 240px**, glassmorphism preservado (`--paper` a ~88% + blur 24px), sobre o fundo aurora sutil.

- **Topo:** wordmark Magical Feather (logo) + subtítulo `--t-eyebrow`.
- **Grupos:** rótulo de seção em `--t-eyebrow` `--ink-ghost` (Principal / Estudo / Revisão / Análise).
- **Link:** ícone de linha 18px + label `--t-ui`, padding 8×12, raio 8px.
  - Hover: `--bg-soft`.
  - **Ativo:** fundo `--rose-soft`, texto `--rose-deep`, peso 600, e um filete vertical 3px `--rose-600` na borda esquerda do item (substitui só-o-fundo por uma marca mais "premium").
- **Badge** (contagem): pílula `--rose-600` texto branco, `--t-eyebrow`.
- **Rodapé fixo:** card de perfil (avatar + nome Inter 600 + meta) e o toggle claro/escuro (track vira `--rose-deep` no dark — manter).
- **Mobile:** sidebar desliza (já implementado); botão hamburger vira ícone de linha; aurora desliga no mobile (já é assim).
- **Breadcrumb/topbar:** breadcrumb em `--t-eyebrow`; à direita, pills de streak e ícones-botão circulares de linha.

---

## 13. Experiência de estudo

O fluxo diário (Hoje / Dia) deve sentir-se **focado e recompensador sem ser gamer**.

- **Estrutura de abas** (Conteúdo / Flashcards / Questões / Revisar) em barra de tabs discreta: tab ativa = texto `--ink` + filete inferior 2px `--rose-600`; inativas `--ink-faded`.
- **Flashcards:** cartão de papel com flip suave (transform 3D, 0.4s). Frente = pergunta em Fraunces; verso = resposta em Inter. Borda `--line`, sombra ao virar. Controles "Sabia / Não sabia" = `--success` / `--rose` discretos.
- **Questões:** alternativa = linha-cartão com letra em círculo. Correta revela fundo verde-eucalipto suave (`--success` a 16%); errada selecionada em âmbar (`--gold` a 18%) — **não** vermelho choque (mantém calma). Manter o microshake de acerto, mas sutil.
- **Concluir dia:** o botão "Estudei" vira `--success` com micro-escala (já implementado) + a chuva de pétalas. Uma celebração, uma só. Streak atualiza com número em Fraunces.
- **Microcopy:** factual e calorosa. Progresso mostrado como narrativa ("Dia 14 de 120 · Semana 3"), não como pontos.
- **Caderno de erros:** tom de "diário de aprendizado", não de punição — título Fraunces, cada erro como entrada de caderno com a pegadinha destacada em callout rosa.

---

## 14. (consolidado em §13)

---

## 15. Experiência de leitura da teoria

Aqui o produto vira **livro**. É a tela onde a Ju passa mais tempo lendo — então otimiza-se para conforto de leitura longa, fidelidade ao PDF (diretriz inegociável do projeto) e zero distração.

- **Coluna de leitura:** largura máx. **68ch**, centralizada, fundo `--paper`, generosamente respirada.
- **Corpo:** `--t-body-read` (Inter 18px / line-height 1.85). A teoria fica em Inter (coerente com o que já existe e ótimo para tela); o caráter editorial vem dos títulos e do enquadramento, não do corpo.
- **Títulos:** `vde-h2` → Fraunces `--t-h2` com filete inferior `--line`; `vde-h3` → Fraunces `--t-h3` em `--rose-deep`. (Re-skin dos atuais; classes mantidas.)
- **Tag de matéria** no topo da seção (§5.5).
- **Destaques de estudo** (negrito de termos-chave, prazos, conceitos — diretriz do projeto): negrito Inter 600 `--ink`; termo conceitual com fundo `--highlight-*` tonal. O **highlighter** do usuário (ferramenta de marcação já existente) usa um marca-texto rosa translúcido (`--rose` a ~30%) com cantos suaves.
- **Callouts** (`vde-atencao`, `vde-sumula`): conforme §8. Súmula/jurisprudência em card `--paper` com itálico Fraunces para a transcrição — dá ar de "epígrafe de livro".
- **Tabelas:** cabeçalho `--rose-soft`/`--rose-deep`, zebra `--bg-soft`, quebra de texto automática.
- **Conforto:** modo Foco disponível (abre o painel macOS); barra de progresso de leitura fina no topo opcional; nada de animação durante a leitura.
- **Impressão:** stylesheet de print preservado; capa de PDF pode usar a marca (Magical Feather/Kathen) — único lugar fora da tela onde as fontes da Ju reaparecem.

---

## 16. Experiência dos cadernos legislativos

A "lei seca" deve parecer **um código comentado de luxo** — denso, navegável, com a tipografia certa para varredura rápida (a Ju precisa localizar artigo rápido).

- **Layout:** abas de matéria no topo (`cl-tab`: ativa = `--rose-soft`/`--rose-deep`); corpo rolável `cl-scroll-body` dentro do painel.
- **Artigo (`cl-artigo`):** número do artigo em Fraunces peso 600 `--rose-deep` (vira âncora visual de varredura), texto em Inter `--ink`. Hover do artigo: leve `--bg-soft` para localização.
- **Hierarquia legal:** parágrafos, incisos e alíneas com indentação sistemática (régua de §6) e numeração em `--ink-faded` — estrutura clara sem cor.
- **Badge de incidência** ("Caiu OAB XX"): pílula `--rose-600` branco — sinaliza o que mais cai, na cor-joia.
- **Busca:** barra fixa; `mark.cl-hl` = fundo `--champagne` translúcido; ocorrência atual `mark.cl-hl.current` = `--rose-600` + texto branco. Contador e navegação prev/next em `--t-small`.
- **Sumário/chips de navegação:** chips de seção pílula, ativo em `--rose-soft`.
- **Súmulas:** seção destacada (`cl-section--sumula`) com itálico Fraunces, como no livro.
- **Foco:** o caderno já abre no painel macOS — manter; é o melhor lugar do app para leitura concentrada.

---

## 17. Identidade visual geral

O fio que costura tudo, em uma frase: **papel quente + serifa de livro + um rosa de assinatura usado como joia.**

Checklist de coesão (todo ecrã deve passar):
- [ ] O fundo é papel (`--bg`), não branco puro nem cinza-SaaS.
- [ ] Há **no máximo uma** ação primária rosa visível.
- [ ] Títulos em Fraunces; corpo/UI em Inter; Magical Feather/Kathen só na marca.
- [ ] Nenhum matiz fora de rosa / neutros / temperos-de-dado.
- [ ] Espaçamentos saem da régua de 4px; nada encosta nas bordas.
- [ ] Ícones são de linha, consistentes; zero emoji decorativo na UI.
- [ ] Números em `tabular-nums`.
- [ ] Light e dark ambos testados (dark = espresso quente, não cinza azulado).
- [ ] Microcopy calma e técnica; nenhuma linguagem gamer/infantil.

### Resumo de migração para o Claude Code (ordem sugerida)
1. **Trocar valores do `:root` e `[data-theme=dark]`** em `style.css` pelos de §5 (nomes preservados → propaga global). Adicionar a escala rosa numerada e os tokens `--sp-*`, `--teal`, `--t-*`.
2. **Importar Fraunces + Inter**; mapear `.serif/.display` → Fraunces, body → Inter; remover Playfair/Cormorant/Great Vibes/Jakarta.
3. **Marca:** wordmark Magical Feather + selo Kathen + novo favicon SVG (§3); carregar as fontes da marca com `@font-face` escopo `.brand` (`Magical_Feather.ttf` para o wordmark, `Kathen .otf` para o selo).
4. **Navegação:** set de ícones de linha; filete ativo rosa.
5. **Re-skin** dos `vde-*` e `cl-*` conforme §15–§16.
6. **`cores.js`:** reduzir a claro/escuro (+ intensidade opcional do rosa); remover presets multi-hue.
7. **Gráficos:** aplicar paleta de §11.
8. QA pelo checklist acima, light e dark.

---

*Fim da Especificação Visual v1. Uma direção, decidida e defendida: o caderno de estudos como objeto editorial premium — calmo, feminino, disciplinado, e inconfundivelmente rosa onde importa.*
