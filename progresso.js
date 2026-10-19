// ============================================
// OAB · Sistema de Progresso de Estudos
// Persistência: localStorage + export/import JSON
// ============================================

const PROGRESSO_KEY   = 'tj_progresso_v1';
const PROGRESSO_VERSAO = '2.0';

// Data de HOJE no fuso horário LOCAL do usuário, formato YYYY-MM-DD.
// `new Date().toISOString()` usa UTC — em fusos negativos (ex.: Brasil,
// UTC-3), isso faz a data "virar o dia seguinte" entre ~21h e meia-noite
// no horário local, fazendo formulários, streak e agenda de revisão
// mostrarem a data de amanhã enquanto ainda é hoje. Usar sempre esta
// função (nunca new Date().toISOString().split('T')[0]) pra pegar
// "a data de hoje" em qualquer lugar do app. Usa getCurrentDate() do
// script.js quando disponível, pra respeitar o simulatedDate de teste.
function dataLocalDe(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
function dataLocalHoje() {
  return dataLocalDe((typeof getCurrentDate === 'function') ? getCurrentDate() : new Date());
}

// Carimba a revisão local e avisa o sync em tempo real (se disponível).
// Chamada por toda função de gravação deste arquivo e por erros-core.js
// / simulados.html, pra manter a sincronização entre dispositivos.
// `chave` é a chave do localStorage que mudou (ex.: PROGRESSO_KEY) — o
// sync usa isso pra mandar só essa chave pra nuvem (merge), em vez do
// localStorage inteiro, senão um aparelho apaga os dados que só existem
// no outro (ex.: simulados registrados só no tablet somem quando o
// notebook salva o progresso por último).
function marcarAlteracaoLocal(chave) {
  try { localStorage.setItem('tj_local_rev', String(Date.now())); } catch (e) {}
  if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) {
    try { window._syncOAB.notificarAlteracaoLocal(chave); } catch (e) {}
  }
}

function _criarEstrutura() {
  return {
    versao:      PROGRESSO_VERSAO,
    criado:      new Date().toISOString(),
    atualizado:  new Date().toISOString(),
    meta_dias:   120,
    streak:      parseInt(localStorage.getItem('ju_tj_streak') || '0'),
    streak_data: localStorage.getItem('ju_tj_streak_date') || null,
    dias:        {}
  };
}

// Migração única: achata a estrutura antiga prog.questoes[materia].registros[]
// (sem id, sem tempo/observações/tipo) pro array plano prog.questoes_registros[].
function _migrarQuestoesLegado(p) {
  if (p.questoes_registros || !p.questoes) return false;
  const registros = [];
  let seq = 0;
  Object.entries(p.questoes).forEach(([materia, dados]) => {
    (dados.registros || []).forEach(r => {
      seq++;
      registros.push({
        id: 'q' + Date.now() + '_' + seq,
        data: r.data || dataLocalHoje(),
        dia: r.dia != null ? parseInt(r.dia) : null,
        materia,
        total: parseInt(r.total) || 0,
        acertos: parseInt(r.acertos) || 0,
        tempo: null,
        observacoes: '',
        tipo: 'sessao'
      });
    });
  });
  p.questoes_registros = registros;
  delete p.questoes;
  return true;
}

function carregarProgresso() {
  try {
    const s = localStorage.getItem(PROGRESSO_KEY);
    if (s) {
      const p = JSON.parse(s);
      // Remove chaves de dias inválidas (dia 0, dias > 60 sem sentido)
      // preserva apenas dias 1–60
      if (p.dias) {
        Object.keys(p.dias).forEach(k => {
          const n = parseInt(k);
          if (isNaN(n) || n < 1 || n > 120) delete p.dias[k];
        });
      }
      if (_migrarQuestoesLegado(p)) salvarProgresso(p);
      return p;
    }
  } catch(e) {}
  return _criarEstrutura();
}

function salvarProgresso(p) {
  p.atualizado = new Date().toISOString();
  try { localStorage.setItem(PROGRESSO_KEY, JSON.stringify(p)); } catch(e) {}
  marcarAlteracaoLocal(PROGRESSO_KEY);
}

function obterDia(numDia) {
  return carregarProgresso().dias[String(numDia)] || {};
}

function concluirDia(numDia, nota) {
  const n = parseInt(numDia);
  if (isNaN(n) || n < 1 || n > 120) return;
  const p = carregarProgresso();
  const key = String(n);
  if (!p.dias[key]) p.dias[key] = {};
  p.dias[key].concluido       = true;
  p.dias[key].data_conclusao  = dataLocalHoje();
  if (nota) p.dias[key].nota  = nota;
  salvarProgresso(p);
  return p;
}

// Tempo real estudado no dia, digitado manualmente pela usuária (NÃO vem
// do Pomodoro nem de nenhum cronômetro automático — a "carga horária"
// sugerida pelo plano em plano-vde.js é só uma estimativa do cronograma,
// não tempo de fato estudado). Aceita "1h30", "1h", "1:30" ou um número
// puro (tratado como horas, com decimal — "1.5" = 1h30).
function parseTempoParaMinutos(texto) {
  if (!texto) return 0;
  const t = String(texto).trim().toLowerCase().replace(',', '.');
  if (!t) return 0;
  let m = t.match(/^(\d+)\s*h\s*(\d{1,2})?\s*(?:min)?$/);
  if (m) return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
  m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  m = t.match(/^(\d+)\s*min$/);
  if (m) return parseInt(m[1], 10);
  m = t.match(/^(\d+(\.\d+)?)$/);
  if (m) return Math.round(parseFloat(m[1]) * 60);
  return null; // formato não reconhecido
}

function fmtMinutosParaTexto(minutos) {
  const min = parseInt(minutos) || 0;
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

function salvarTempoEstudado(numDia, minutos) {
  const p   = carregarProgresso();
  const key = String(numDia);
  if (!p.dias[key]) p.dias[key] = {};
  p.dias[key].minutos_estudados = parseInt(minutos) || 0;
  salvarProgresso(p);
}

function atualizarChecklist(numDia, itemId, marcado) {
  const p   = carregarProgresso();
  const key = String(numDia);
  if (!p.dias[key]) p.dias[key] = {};
  if (!p.dias[key].checklist) p.dias[key].checklist = {};
  p.dias[key].checklist[itemId] = marcado;
  salvarProgresso(p);
}

function salvarNota(numDia, texto) {
  const p   = carregarProgresso();
  const key = String(numDia);
  if (!p.dias[key]) p.dias[key] = {};
  p.dias[key].nota             = texto;
  p.dias[key].nota_atualizada  = new Date().toISOString();
  salvarProgresso(p);
}

function calcularStats() {
  const p = carregarProgresso();
  const concluidos = Object.entries(p.dias).filter(([k, d]) => {
    const n = parseInt(k);
    return n >= 1 && n <= 120 && d.concluido === true;
  }).length;
  const pct = Math.round((concluidos / 120) * 100);
  return { concluidos, pct, total: 120 };
}

function proximoDia() {
  const p = carregarProgresso();
  for (let i = 1; i <= 120; i++) {
    if (!p.dias[String(i)] || !p.dias[String(i)].concluido) return i;
  }
  return 120;
}

function exportarProgresso() {
  const p    = carregarProgresso();
  const json = JSON.stringify(p, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const data = dataLocalHoje();
  a.href     = url;
  a.download = `tj_progresso_${data}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return data;
}

function importarProgresso(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const p = JSON.parse(e.target.result);
        if (!p.versao || !p.dias) throw new Error('Arquivo inválido');
        salvarProgresso(p);
        resolve(p);
      } catch(err) { reject(err); }
    };
    r.onerror = reject;
    r.readAsText(file);
  });
}

// ── Questões (registro único e plano — usado por questoes.html, hoje.html, dia.html) ──
// Estrutura: progresso.questoes_registros = [
//   { id, data, dia: Number|null, materia, total, acertos, tempo: Number|null,
//     observacoes: '', tipo: 'sessao'|'revisao' }
// ]
// 'sessao' = sessão avulsa de questões. 'revisao' = revisão de conteúdo já estudado
// (também conta nas estatísticas gerais — ver getTotaisQuestoes/getTodasQuestoes).

function adicionarQuestaoRegistro(dados) {
  const total = parseInt(dados.total) || 0;
  if (!dados.materia || total <= 0) return null;
  const p = carregarProgresso();
  if (!p.questoes_registros) p.questoes_registros = [];
  const registro = {
    id: 'q' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    data: dados.data || dataLocalHoje(),
    dia: dados.dia != null ? parseInt(dados.dia) : null,
    materia: dados.materia,
    total,
    acertos: Math.min(parseInt(dados.acertos) || 0, total),
    tempo: (dados.tempo != null && dados.tempo !== '') ? parseInt(dados.tempo) : null,
    observacoes: dados.observacoes || '',
    tipo: dados.tipo === 'revisao' ? 'revisao' : 'sessao'
  };
  p.questoes_registros.push(registro);
  salvarProgresso(p);
  return registro;
}

function editarQuestaoRegistro(id, dados) {
  const p = carregarProgresso();
  if (!p.questoes_registros) return null;
  const i = p.questoes_registros.findIndex(r => r.id === id);
  if (i < 0) return null;
  const atual = p.questoes_registros[i];
  const total = dados.total != null ? (parseInt(dados.total) || 0) : atual.total;
  p.questoes_registros[i] = {
    ...atual,
    data: dados.data ?? atual.data,
    dia: dados.dia !== undefined ? (dados.dia != null ? parseInt(dados.dia) : null) : atual.dia,
    materia: dados.materia ?? atual.materia,
    total,
    acertos: dados.acertos != null ? Math.min(parseInt(dados.acertos) || 0, total) : Math.min(atual.acertos, total),
    tempo: dados.tempo !== undefined ? ((dados.tempo != null && dados.tempo !== '') ? parseInt(dados.tempo) : null) : atual.tempo,
    observacoes: dados.observacoes ?? atual.observacoes,
    tipo: dados.tipo ?? atual.tipo
  };
  salvarProgresso(p);
  return p.questoes_registros[i];
}

function excluirQuestaoRegistro(id) {
  const p = carregarProgresso();
  if (!p.questoes_registros) return;
  p.questoes_registros = p.questoes_registros.filter(r => r.id !== id);
  salvarProgresso(p);
}

function getQuestaoRegistros(filtro) {
  const p = carregarProgresso();
  let regs = p.questoes_registros || [];
  if (filtro) {
    if (filtro.dia != null)    regs = regs.filter(r => r.dia === parseInt(filtro.dia));
    if (filtro.tipo)           regs = regs.filter(r => r.tipo === filtro.tipo);
    if (filtro.materia)        regs = regs.filter(r => r.materia === filtro.materia);
  }
  return regs;
}

// ── Revisão de teoria — sem taxa de acerto (diferente de questoes_registros,
// que é pra sessões com total/acertos). Usado pela aba Revisões de hoje.html
// quando a revisão foi reler conteúdo em vez de resolver questões. ──
function adicionarTeoriaRegistro(dados) {
  if (!dados.materia) return null;
  const p = carregarProgresso();
  if (!p.teoria_registros) p.teoria_registros = [];
  const registro = {
    id: 't' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    data: dados.data || dataLocalHoje(),
    dia: dados.dia != null ? parseInt(dados.dia) : null,
    materia: dados.materia,
    topicos: Array.isArray(dados.topicos) ? dados.topicos : [],
    confianca: ['lembrei', 'mais-ou-menos', 'esqueci'].includes(dados.confianca) ? dados.confianca : null,
    observacoes: dados.observacoes || ''
  };
  p.teoria_registros.push(registro);
  salvarProgresso(p);
  return registro;
}

function getTeoriaRegistros(filtro) {
  const p = carregarProgresso();
  let regs = p.teoria_registros || [];
  if (filtro) {
    if (filtro.dia != null) regs = regs.filter(r => r.dia === parseInt(filtro.dia));
    if (filtro.materia)     regs = regs.filter(r => r.materia === filtro.materia);
  }
  return regs;
}

function excluirTeoriaRegistro(id) {
  const p = carregarProgresso();
  if (!p.teoria_registros) return;
  p.teoria_registros = p.teoria_registros.filter(r => r.id !== id);
  salvarProgresso(p);
}

// Compat: assinatura antiga (materia, total, acertos), usada por materias.html.
function registrarQuestoes(materia, total, acertos) {
  return adicionarQuestaoRegistro({ materia, total, acertos });
}

function getQuestoesPorMateria(materia) {
  const regs = getQuestaoRegistros({ materia });
  return {
    total: regs.reduce((s, r) => s + r.total, 0),
    acertos: regs.reduce((s, r) => s + r.acertos, 0),
    registros: regs
  };
}

// Agrupa ao vivo por matéria — nunca fica desatualizado após editar/excluir.
function getTodasQuestoes() {
  const regs = getQuestaoRegistros();
  const porMateria = {};
  regs.forEach(r => {
    if (!porMateria[r.materia]) porMateria[r.materia] = { total: 0, acertos: 0, registros: [] };
    porMateria[r.materia].total   += r.total;
    porMateria[r.materia].acertos += r.acertos;
    porMateria[r.materia].registros.push(r);
  });
  return porMateria;
}

function getTotaisQuestoes() {
  const regs = getQuestaoRegistros();
  const total   = regs.reduce((s, r) => s + r.total, 0);
  const acertos = regs.reduce((s, r) => s + r.acertos, 0);
  return { total, acertos, pct: total > 0 ? Math.round((acertos/total)*100) : 0 };
}

// ── Tópicos estudados (auto-check ao concluir dia) ──
// key: "d{dia}_m{materiaIdx}_t{topicoIdx}"

function marcarTopicosEstudados(numDia) {
  if (typeof getDadosDia !== 'function') return;
  const dados = getDadosDia(numDia);
  if (!dados) return;
  const p = carregarProgresso();
  if (!p.topicos) p.topicos = {};
  dados.materias.forEach((mat, mIdx) => {
    if (!mat.topicos) return;
    mat.topicos.forEach((_top, tIdx) => {
      p.topicos[`d${numDia}_m${mIdx}_t${tIdx}`] = true;
    });
  });
  salvarProgresso(p);
}

function isTopicoEstudado(numDia, mIdx, tIdx) {
  const p = carregarProgresso();
  return !!(p.topicos && p.topicos[`d${numDia}_m${mIdx}_t${tIdx}`]);
}

function toggleTopicoManual(numDia, mIdx, tIdx, valor) {
  const p = carregarProgresso();
  if (!p.topicos) p.topicos = {};
  const key = `d${numDia}_m${mIdx}_t${tIdx}`;
  p.topicos[key] = valor !== undefined ? valor : !p.topicos[key];
  salvarProgresso(p);
  return p.topicos[key];
}

// ── Helpers por matéria ──────────────────────
// Dado nome de matéria (ex: "Ética Profissional"), retorna ID curto
function getMateriaId(nome) {
  const map = [
    ["Ética",          "etica"],
    ["Constitucional", "constitucional"],
    ["Processo Civil", "proc_civil"],
    ["Civil",          "civil"],
    ["Processo Penal", "proc_penal"],
    ["Processual Penal","proc_penal"],
    ["Penal",          "penal"],
    ["Processo do Trabalho","proc_trabalho"],
    ["Processual do Trabalho","proc_trabalho"],
    ["Trabalho",       "trabalho"],
    ["Tributário",     "tributario"],
    ["Administrativo", "administrativo"],
    ["Empresarial",    "empresarial"],
    ["Humanos",        "dh"],
    ["Internacional",  "internacional"],
    ["Ambiental",      "ambiental"],
    ["ECA",            "eca"],
    ["Consumidor",     "cdc"],
    ["Filosofia",      "filosofia"],
    ["Financeiro",     "financeiro"],
    ["Eleitoral",      "eleitoral"],
    ["Previdenciário", "previdenciario"],
  ];
  for (const [keyword, id] of map) {
    if (nome && nome.includes(keyword)) return id;
  }
  return "outro";
}

// Progresso de tópicos de uma matéria por ID
function getProgressoMateria(materiaId) {
  const p = carregarProgresso();
  const plano = (typeof PLANO_VDE !== 'undefined') ? PLANO_VDE : (typeof PLANO_OAB !== 'undefined' ? PLANO_OAB : []);
  if (!plano.length) return { total: 0, feitos: 0, pct: 0, dias: [] };
  let total = 0, feitos = 0;
  const dias = [];
  plano.forEach(diaData => {
    diaData.materias && diaData.materias.forEach((mat, mIdx) => {
      if (getMateriaId(mat.nome) !== materiaId) return;
      const dayTopicos = mat.topicos || [];
      const dayFeitos  = dayTopicos.filter((_,tIdx) => !!(p.topicos && p.topicos[`d${diaData.dia}_m${mIdx}_t${tIdx}`])).length;
      total  += dayTopicos.length;
      feitos += dayFeitos;
      if (dayTopicos.length > 0) {
        dias.push({ dia: diaData.dia, topicos: dayTopicos, mIdx, feitos: dayFeitos });
      }
    });
  });
  return { total, feitos, pct: total > 0 ? Math.round((feitos/total)*100) : 0, dias };
}

// ── Repetição espaçada adaptativa (revisão) ──────────────────
// Substitui os antigos checkpoints fixos (1/7/15/30 dias, iguais pra
// todo mundo) por um sistema tipo Leitner: cada matéria de cada dia
// tem seu próprio "estágio", e o feedback do usuário decide o ritmo:
//   lembrei tudo    → avança de estágio (intervalo maior)
//   mais ou menos   → mantém o estágio atual
//   esqueci         → volta pro estágio 0 (revisa de novo logo)
const REV_STAGES = [1, 3, 7, 14, 30, 60, 90]; // dias até a próxima revisão, por estágio

function _addDiasISO(dataISO, dias) {
  const d = new Date(dataISO + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

// Garante (e inicializa se preciso) a agenda de revisão de uma matéria
// de um dia específico. Retorna { estagio, proxima }.
function getAgendaMat(p, numDia, mIdx, dataConclusao) {
  const key = String(numDia);
  if (!p.dias[key]) p.dias[key] = {};
  if (!p.dias[key].agenda_mat) p.dias[key].agenda_mat = {};
  if (!p.dias[key].agenda_mat[mIdx]) {
    p.dias[key].agenda_mat[mIdx] = { estagio: 0, proxima: _addDiasISO(dataConclusao || dataLocalHoje(), REV_STAGES[0]) };
  }
  return p.dias[key].agenda_mat[mIdx];
}

// Aplica o feedback do usuário à agenda, recalculando a próxima data.
function aplicarFeedbackAgenda(agenda, tipo, hojeStr) {
  if (tipo === 'lembrei') agenda.estagio = Math.min((agenda.estagio || 0) + 1, REV_STAGES.length - 1);
  else if (tipo === 'esqueci') agenda.estagio = 0;
  // 'mais-ou-menos' mantém o estágio atual, só reagenda pro mesmo intervalo
  agenda.proxima = _addDiasISO(hojeStr, REV_STAGES[agenda.estagio || 0]);
  return agenda;
}

// Um card só existe de fato em Revisar quando há microresumo (REVIEW_CARDS
// para a matéria, ou texto escrito no editor rico pro dia) — tópicos crus da
// aula não contam como revisão. Mantém a contagem do badge da sidebar em
// sincronia com o que revisar.html realmente mostra em "Pendentes".
function _mrTemConteudo(raw) {
  if (!raw) return false;
  let html = raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.html === 'string') html = parsed.html;
  } catch (e) {}
  return !!html.replace(/<[^>]*>/g, '').trim();
}

// Conta quantos cards (matéria + microresumo) estão vencidos (usado no badge da sidebar)
function contarRevisoesPendentes() {
  try {
    const p = carregarProgresso();
    const hojeStr = dataLocalHoje();
    let count = 0;
    let alterado = false;
    Object.entries(p.dias || {}).forEach(([numDia, dData]) => {
      if (!dData.concluido || !dData.data_conclusao) return;
      if (typeof getDadosDia !== 'function') return;
      const dado = getDadosDia(parseInt(numDia));
      if (!dado) return;
      dado.materias.forEach((mat, mIdx) => {
        if (typeof REVIEW_CARDS === 'undefined' || !REVIEW_CARDS[`${numDia}_${mIdx}`]) return; // sem microresumo — não conta
        const existia = !!(dData.agenda_mat && dData.agenda_mat[mIdx]);
        const agenda = getAgendaMat(p, numDia, mIdx, dData.data_conclusao);
        if (!existia) alterado = true;
        if (agenda.proxima <= hojeStr) count++;
      });
      if (_mrTemConteudo(localStorage.getItem('microresumo_dia_' + numDia))) {
        const existiaMr = !!(dData.agenda_mat && dData.agenda_mat['mr']);
        const agendaMr = getAgendaMat(p, numDia, 'mr', dData.data_conclusao);
        if (!existiaMr) alterado = true;
        if (agendaMr.proxima <= hojeStr) count++;
      }
    });
    if (alterado) salvarProgresso(p);
    return count;
  } catch (e) { return 0; }
}


(function _syncStreak() {
  const p     = carregarProgresso();
  const saved = parseInt(localStorage.getItem('ju_tj_streak') || '0');
  const date  = localStorage.getItem('ju_tj_streak_date');
  if (saved !== p.streak || date !== p.streak_data) {
    p.streak      = saved;
    p.streak_data = date;
    salvarProgresso(p);
  }
})();
