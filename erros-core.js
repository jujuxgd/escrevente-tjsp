// Caderno de Erros — lógica central
// Usado por: erros.html

const ERROS_KEY = 'tj_erros_v1';

window.MATERIAS_ERROS = {
  portugues:     'Português',
  constitucional:'Constitucional',
  proc_civil:    'Processo Civil',
  penal:         'Penal',
  proc_penal:    'Processo Penal',
  administrativo:'Administrativo',
  normas:        'Normas da Corregedoria',
  informatica:   'Informática',
  rlm:           'Raciocínio Lógico',
  matematica:    'Matemática',
  atualidades:   'Atualidades',
  pcd:           'Estatuto PcD'
};

window.MOTIVOS_ERROS = {
  nao_sabia:         'Não sabia o conteúdo',
  confusao_conceito: 'Confundi conceitos',
  pegadinha:         'Pegadinha da banca',
  desatencao:        'Desatenção',
  memorizacao:       'Falha de memorização'
};

function erros_get() {
  try { return JSON.parse(localStorage.getItem(ERROS_KEY) || '[]'); }
  catch { return []; }
}

function erros_save(list) {
  localStorage.setItem(ERROS_KEY, JSON.stringify(list));
  try { localStorage.setItem('tj_local_rev', String(Date.now())); } catch (e) {}
  if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) {
    try { window._syncOAB.notificarAlteracaoLocal(ERROS_KEY); } catch (e) {}
  }
}

// ── Revisão espaçada ─────────────────────────────────────────
// Cada acerto sobe um degrau da escada (dias até a próxima revisão);
// errar volta pro começo; acertar no último degrau (15 dias) tira o erro
// da rotação. Perto da prova o intervalo é cortado pra
// caber antes de 14/03/2027. Erros sem `proxima_revisao` (anteriores a
// esta função) contam como devidos hoje.
const ERROS_ESCADA = [3, 7, 15];
const ERROS_ACERTOS_PARA_DOMINAR = 3;
const ERROS_LIMITE_DIARIO = 15;
const ERROS_DIA_PROVA = '2027-03-13';

function _erros_soma_dias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

// Erros registrados antes de 13/10/2026 voltavam no dia seguinte (escada 1→7→15): a data efetiva
// nunca fica antes de 3 dias depois do erro (vale também para dado antigo vindo da nuvem).
function _erros_prox(e) {
  if ((e.nivel || 0) !== 0 || !e.proxima_revisao) return e.proxima_revisao;
  const base = e.ultima_revisao || e.data;
  const certo = base ? _erros_soma_dias(base, ERROS_ESCADA[0]) : e.proxima_revisao;
  return e.proxima_revisao < certo ? certo : e.proxima_revisao;
}

function erros_proxima_data(nivel, hoje) {
  const passo = ERROS_ESCADA[Math.min(nivel, ERROS_ESCADA.length - 1)];
  const alvo = _erros_soma_dias(hoje, passo);
  return alvo > ERROS_DIA_PROVA ? (hoje < ERROS_DIA_PROVA ? ERROS_DIA_PROVA : alvo) : alvo;
}

function erros_devidas(limite) {
  const hoje = dataLocalHoje();
  const max = limite == null ? ERROS_LIMITE_DIARIO : limite;
  return erros_get()
    .filter(e => e.status !== 'dominada' && !e.flashcard_id && (_erros_prox(e) || '0000-00-00') <= hoje)
    .sort((a, b) => (_erros_prox(a) || '0000-00-00').localeCompare(_erros_prox(b) || '0000-00-00'))
    .slice(0, max);
}

function erros_total_devidas() {
  return erros_devidas(Infinity).length;
}

function erros_registrar_revisao(id, acertou) {
  const list = erros_get();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return null;
  const hoje = dataLocalHoje();
  const e = list[i];
  const nivel = acertou ? (e.nivel || 0) + 1 : 0;
  const seguidos = acertou ? (e.acertos_seguidos || 0) + 1 : 0;
  const atualizado = {
    ...e, nivel, acertos_seguidos: seguidos, ultima_revisao: hoje,
    revisoes: (e.revisoes || 0) + 1
  };
  if (seguidos >= ERROS_ACERTOS_PARA_DOMINAR) {
    atualizado.status = 'dominada';
    atualizado.dominada_em = hoje;
    delete atualizado.proxima_revisao;
  } else {
    atualizado.proxima_revisao = erros_proxima_data(nivel, hoje);
  }
  list[i] = atualizado;
  erros_save(list);
  return atualizado;
}

function erros_add(dados) {
  const list = erros_get();
  if (dados.questao_id || dados.flashcard_id) {
    const j = list.findIndex(e => e.status !== 'dominada' &&
      (dados.questao_id ? e.questao_id === dados.questao_id : e.flashcard_id === dados.flashcard_id));
    if (j >= 0) {
      list[j] = { ...list[j], nivel: 0, acertos_seguidos: 0, proxima_revisao: _erros_soma_dias(dataLocalHoje(), ERROS_ESCADA[0]) };
      if (dados.justificada) Object.assign(list[j], { motivo: dados.motivo, o_que_faltou: dados.o_que_faltou || '', justificada: true });
      erros_save(list);
      return list[j];
    }
  }
  const registro = {
    id: 'e' + Date.now(),
    data: dataLocalHoje(),
    materia:    dados.materia    || '',
    topico:     dados.topico     || '',
    subtopico:  dados.subtopico  || '',
    motivo:     dados.motivo     || 'nao_sabia',
    o_que_faltou: dados.o_que_faltou || '',
    explicacao:   dados.explicacao   || '',
    dia_estudo:   dados.dia_estudo   || null,
    questao_id:   dados.questao_id   || null,
    origem:       dados.origem       || '',
    justificada:  !!dados.justificada,
    flashcard_id: dados.flashcard_id || null,
    nivel: 0,
    acertos_seguidos: 0,
    proxima_revisao: _erros_soma_dias(dataLocalHoje(), ERROS_ESCADA[0]),
    status: 'pendente'
  };
  list.unshift(registro);
  erros_save(list);
  return registro;
}

function erros_editar(id, dados) {
  const list = erros_get();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return null;
  list[i] = {
    ...list[i],
    materia:      dados.materia      ?? list[i].materia,
    topico:       dados.topico       ?? list[i].topico,
    subtopico:    dados.subtopico    ?? list[i].subtopico,
    motivo:       dados.motivo       ?? list[i].motivo,
    o_que_faltou: dados.o_que_faltou ?? list[i].o_que_faltou,
    explicacao:   dados.explicacao   ?? list[i].explicacao,
    justificada:  dados.justificada  ?? list[i].justificada,
  };
  erros_save(list);
  return list[i];
}

function erros_dominar(id) {
  const list = erros_get();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], status: 'dominada', dominada_em: dataLocalHoje() };
  erros_save(list);
}

// "Preciso praticar mais": volta ao começo da escada e reaparece em 3 dias (também reabre uma dominada)
function erros_praticar(id) {
  const list = erros_get();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return;
  const e = { ...list[i], status: 'pendente', nivel: 0, acertos_seguidos: 0,
    proxima_revisao: _erros_soma_dias(dataLocalHoje(), ERROS_ESCADA[0]) };
  delete e.dominada_em;
  list[i] = e;
  erros_save(list);
}

function erros_da_questao(questaoId) {
  return erros_get().find(e => e.questao_id === questaoId && e.status !== 'dominada') || null;
}

// ── Justificar o erro na hora (Hoje e Banco) ──
function _erros_esc(t) {
  return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function erros_html_justificar(opts) {
  opts = opts || {};
  const sel = opts.motivo || '';
  return '<div class="ej">' +
    '<div class="ej-t">' + _erros_esc(opts.titulo || 'Por que você errou?') + '</div>' +
    '<div class="ej-m">' + Object.entries(MOTIVOS_ERROS).map(([k, v]) =>
      '<button type="button" class="ej-chip' + (k === sel ? ' sel' : '') + '" data-motivo="' + k + '">' + v + '</button>').join('') + '</div>' +
    '<textarea class="ej-nota" rows="2" placeholder="O que faltou para acertar? (opcional)">' + _erros_esc(opts.nota) + '</textarea>' +
    '<div class="ej-acoes"><button type="button" class="ej-salvar"' + (sel ? '' : ' disabled') + '>' + _erros_esc(opts.botao || 'Salvar no caderno') + '</button>' +
    (opts.cancelar ? '<button type="button" class="ej-cancelar">Cancelar</button>' : '') +
    '<span class="ej-dica">' + (sel ? '' : 'Escolha o motivo') + '</span></div></div>';
}
function erros_ler_justificar(el) {
  const m = el.querySelector('.ej-chip.sel');
  return { motivo: m ? m.dataset.motivo : 'nao_sabia', o_que_faltou: (el.querySelector('.ej-nota').value || '').trim() };
}
document.addEventListener('click', function (ev) {
  const chip = ev.target.closest && ev.target.closest('.ej-chip');
  if (!chip) return;
  const box = chip.closest('.ej');
  box.querySelectorAll('.ej-chip').forEach(b => b.classList.toggle('sel', b === chip));
  box.querySelector('.ej-salvar').disabled = false;
  const d = box.querySelector('.ej-dica'); if (d) d.textContent = '';
});

function erros_deletar(id) {
  erros_save(erros_get().filter(e => e.id !== id));
}

function erros_stats() {
  const list = erros_get().filter(e => !e.flashcard_id);
  const total     = list.length;
  const dominadas = list.filter(e => e.status === 'dominada').length;
  const pendentes = total - dominadas;
  const taxa      = total > 0 ? Math.round((dominadas / total) * 100) : 0;

  const porMateria = {};
  const porMotivo  = {};
  list.forEach(e => {
    porMateria[e.materia] = (porMateria[e.materia] || 0) + 1;
    porMotivo[e.motivo]   = (porMotivo[e.motivo]   || 0) + 1;
  });

  const motivoMaisFreq = Object.entries(porMotivo).sort((a, b) => b[1] - a[1])[0];
  const materiaMaisErra = Object.entries(porMateria).sort((a, b) => b[1] - a[1])[0];

  return { total, dominadas, pendentes, taxa, porMateria, porMotivo, motivoMaisFreq, materiaMaisErra };
}

function erros_fmt_data(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}
