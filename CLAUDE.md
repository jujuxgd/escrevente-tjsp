# CLAUDE.md — Preparatório Escrevente TJSP
> Diretrizes permanentes. Leia antes de qualquer sessão. Atualizado: 2026-10-19

## 1. Visão geral

Site de estudo para **Escrevente Técnico Judiciário do TJSP** (Vunesp), cópia da arquitetura do
preparatório da OAB de Julia (`jujuxgd/preparatorio-oab`): HTML estático + JS vanilla + CSS custom properties,
`localStorage` como fonte principal e sincronização por conta no Firestore.

- **Edital 02/2026:** publicado em 19/10/2026; inscrições 28/10 a 10/12/2026; **prova em 14/03/2027**
  (objetiva + redação). Cadastro de reserva, 2ª a 10ª RAJ.
- **Prova (edital 02/2026 conferido no PDF oficial, Drive "5. Editais"):** 70 questões A–E em 5 horas, junto com a
  redação (0 a 40). Bloco I Português 16 e Bloco II Direito 30 (eliminatórios: mínimo 50% de cada); Bloco III
  Gerais 24 (Atualidades + PcD 4, Matemática 4, Informática 9, RLM 7). Habilitação: nota ≥ 5 de 10 no total
  (35 acertos) e os mínimos dos blocos I e II. A divisão interna do Bloco II não é divulgada.
- **Legislação Interna (Bloco II):** Res. TJSP 850/2021 (teletrabalho), Res. TJSP 963/2025 (eproc), LC 1.111/2010
  e Regimento Interno do TJSP — lei seca pronta; sem aula no calendário nem flashcards.
- Julia estuda a OAB ao mesmo tempo: 1ª fase em 10/01/2027 e 2ª fase em 28/02/2027.

## 2. Calendário (`calendario-ativo.js` + `aulas-dias.js`)

Gerado por script (fora do repo) a partir das aulas do Estratégia (pasta "11. Personalizado/Estratégia
Concursos/2024 - Organizado" no Drive) e da rotina semanal do cronograma de Julia:

| Dia | Bloco 1 | Bloco 2 (só nas férias) |
|-----|---------|-------------------------|
| Seg | Português | Constitucional |
| Ter | Proc. Civil | Raciocínio Lógico |
| Qua | Proc. Penal | Informática |
| Qui | Penal | Matemática |
| Sex | Administrativo (+ PcD) | Normas da Corregedoria (+ Atualidades) |

- **f: 1 · ritmo leve** (20/10 → 22/11): seg–sex 1 aula; sáb/dom leves.
- **f: 1 · férias** (23/11 → 28/02): seg–sex 2 aulas (2–3 h); sábado revisão + simulado parcial; domingo leve.
  As 79 aulas acabam em 12/01; depois, dias de revisão com foco em duas matérias.
- **Leves fixos:** semana da 1ª fase da OAB (04–10/01), semana da 2ª fase (22–28/02), 24–25/12 e 31/12–01/01.
- **f: 3 · reta final** (01/03 → 12/03): revisão diária + simulado (completo aos sábados); 13/03 véspera; 14/03 prova.
- Tópico do dia: `{d: disciplina, s: tema, n: nº da aula na fila, a: "Aula NN", q: ["*"]}`.
  `aulas-dias.js` define `window.VDE_DIAS = {n: idDrive}` (nome herdado do projeto da OAB).
- `plano-dinamico.js` (Adiantar) funciona igual à OAB.
- Matéria de reforço nos dias de revisão/leves: **Língua Portuguesa** (no lugar da Ética da OAB).

## 3. O que está pronto e o que falta alimentar

Pronto: Início, Hoje (aula do dia no leitor com grifos, checklist, Pomodoro, Estudei hoje), Calendário,
Biblioteca (`revisao-biblioteca.js`: Tabelas NEAF, Bizus, Apostila NEAF por matéria + materiais gerais),
Materiais extras (provas anteriores, apostilas de questões NEAF, simulados, editais), Edital verticalizado
(`materias.html`, itens do edital esquematizado com checkbox), Caderno de Erros, Estatísticas, Perfil.

**Banco de questões (`questoes-banco.js`, 700 questões):** provas de 2017, 2018 (Interior, v4), 2021, 2023 Capital
(v3), 2023 Grande SP (v3), 2024 Interior e 2024 Capital (v1). `exam_number` = ano + aplicação (20241…);
`exam` = nome exibido. Gabarito **oficial definitivo** da versão do caderno (versão conferida resolvendo questões de
cálculo); anuladas (definitivo ou resultado dos recursos) ficam com `correct_answer: null` — no Simulado valem o
ponto, no Hoje não aparecem. Texto-base em `window.TEXTOS_BASE[support_id]`; `figure` = recorte do caderno em
`img/q/` (traz o enunciado, que aparece no lugar do texto); `window.enunciadoQuestao(q)` monta o enunciado em
todas as telas. Sem comentário (`explanation: null`) e sem `topic` por enquanto. Gerado por scripts fora do repo
(PyMuPDF: leitura em 2 colunas, faixas de largura total, cabeçalhos "Leia…/Para responder…").
`ESTUDO.pesosRecentes` usa as provas desde 2021, redistribuídas nos blocos 16/30/24.

**A alimentar (aos poucos):**
1. `topic` das questões (hoje null; o Hoje usa `q: ["*"]`, a matéria inteira) — classificar pelo edital.
2. Flashcards (`fc-*.js` + `ARQUIVOS` em `ativo-core.js`; cartão `{id, d, t: tema da aula, r, f, v, b, p}`).
   976 cartões: matérias de Direito das Tabelas NEAF (`r: "1"`); Português, Informática, Matemática + RLM
   (`fc-mat.js`) dos Bizus (`r: "2"`). Texto reescrito, nunca copiado; artigos revogados ou superados e erros da
   fonte ficaram fora. Sem cartões (a fonte não cobre): Poder Judiciário (art. 92), ferramentas de busca,
   Windows 11, Teams/OneDrive, juros simples, equações, geometria espacial, gráficos, sequências lógicas.
3. Cadernos legislativos (`cl-*.js`, `window.CL_*` = HTML com `h2.cl-part`, `h3.cl-section`, `p.cl-artigo|cl-paragrafo|
   cl-inciso|cl-alinea`): 8 cadernos. Penal, CPP, CPC, CF, LIA, Normas e PcD gerados de "1. Lei seca/LEI SECA.pdf"
   (apostila 2025, sem as marcas "2025"); Estatuto de SP (arts. 1–86, 171–175, 239–323) e Legislação Interna (Res.
   850 compilada, Res. 963, LC 1.111 sem anexos, Regimento Interno atualizado em 30/04/2026, sem o índice) do texto
   compilado oficial da Alesp/TJSP enviado por Julia — sem as notas de compilação da Alesp e sem o texto riscado
   (revogado). Artigos conferidos com o Anexo VIII.
4. Videoaulas: aba removida do Hoje (não há lista do TJSP).

## 4. Sincronização e login

- Mesmo projeto Firebase da OAB (mesmo login e aprovação em `usuarios_autorizados`).
- Backup em **`backups_tjsp/{uid}`** (coleção separada para não misturar com `backups/{uid}` da OAB).
  As regras do Firestore precisam liberar essa coleção para o próprio usuário.
- Chaves do `localStorage` com prefixo `tj_` (na OAB, `oab_`). Nomes de função herdados (`_syncOAB`,
  `_perfilOAB`, `streakOAB`) foram mantidos de propósito.
- Domínio novo do Vercel precisa entrar em Firebase Auth → domínios autorizados; o leitor de PDF usa a chave da
  API do Drive restrita a `*.vercel.app`.

## 5. Visual (escolha de Julia em 19/10/2026: estrutura do modelo "Palácio", cor preta)

Diferente do site da OAB de propósito. Tudo em `tema.css` (carregado por `cores-early.js`, que põe
`data-skin="palacio"` no `<html>`). **Cor:** padrão **preto**, trocável no Perfil → Aparência → Cor personalizada,
igual à OAB (`cores-early.js`/`cores.js`, chaves `tj_rose_intensity` e `tj_rose_custom_hex`). A barra do topo e a
faixa usam `--faixa` (a cor escolhida, escurecida só se for clara demais para texto branco); botões e números
usam `--rose`. **Não fixar cor de destaque
no `tema.css`** (Julia não gostou do verde). Fundo neutro `#F2F3F5`, detalhes em bronze `#A77B2F`/`#E9D9B5`;
títulos em **Gloock**, texto em **Instrument Sans**. Cada página abre com a faixa escura e título grande, e o
primeiro bloco sobe sobre ela; cartões brancos com topo em arco e fio de bronze; botões em pílula. No Hoje, o título
é a matéria do dia, a contagem grande fica à direita e há a faixa Flashcards · Questões · Erros.
Favicon e ícones = arco preto com colunas. Não redesenhar sem perguntar.

## 6. Regras

- Seguir as regras de desenvolvimento do CLAUDE.md da OAB (editar direto, sem scope creep, sem flip-cards,
  comentários só para o "porquê").
- O repositório é público: dos PDFs do Drive entram só IDs e nomes, nunca o texto (marca d'água de terceiros).
- Gabarito sempre o **oficial** da Vunesp; comentário só se vier do material (sem comentário inventado).
- Página nova ou arquivo novo: acrescentar em `ESSENCIAIS` no `sw.js` e subir `VERSAO`.
