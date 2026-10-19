/* ══════════════════════════════════════════════════════════
   Simulado — motor da prova.

   Três telas numa página só: escolher, fazer e corrigir.
   Durante a prova não há gabarito nem comentário: a correção
   é toda no fim, como na prova de verdade.

   O estado vive em localStorage. O cronômetro conta o tempo em
   que a prova esteve aberta: sair da aba ou fechar o navegador
   congela o relógio onde parou, e voltar retoma dali — o tempo
   já gasto nunca é devolvido, e o tempo fora não é cobrado.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function mesAno() { var d = typeof getCurrentDate === 'function' ? getCurrentDate() : new Date(); return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][d.getMonth()] + ' ' + d.getFullYear(); }

  var CHAVE   = 'tj_simulado_atual';
  var SIM_KEY = 'tj_simulados_v1';
  var DURACAO = 5 * 60 * 60 * 1000;   // 5 horas, como no caderno da prova
  var CORTE   = 50;                    // referência: metade das 100 questões das provas anteriores
  var TREINO_N  = 20;                  // treino rápido: 20 questões em 1 hora,
  var TREINO_MS = 60 * 60 * 1000;      // o mesmo ritmo das 100 em 5 horas (3 min cada)

  var BANCO = (typeof window.BANCO_QUESTOES !== 'undefined') ? window.BANCO_QUESTOES : [];
  var tela  = document.getElementById('tela');
  var S     = null;     // estado da prova em andamento
  var relogio = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function salvarLocal(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      localStorage.setItem('tj_local_rev', String(Date.now()));
      if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) {
        window._syncOAB.notificarAlteracaoLocal(chave);
      }
    } catch (e) {}
  }
  function lerLocal(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; }
  }

  function hhmmss(ms) {
    if (ms < 0) ms = 0;
    var t = Math.floor(ms / 1000);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function duracao(est) { return (est && est.duracao) || DURACAO; }
  // treino de 20 questões: corte proporcional ao da prova (metade)
  function corte() { return (S && S.corte) || CORTE; }

  // ── tempo restante: derivado do relógio, nunca acumulado ──
  function restante() {
    if (!S) return 0;
    var gasto = S.gastoAntes + (S.retomadoEm ? Date.now() - S.retomadoEm : 0);
    return duracao(S) - gasto;
  }
  function tempoGasto() {
    return S.gastoAntes + (S.retomadoEm ? Date.now() - S.retomadoEm : 0);
  }

  // ═══════════════ tela 1: escolher a prova ═══════════════

  function exames() {
    var m = {};
    BANCO.forEach(function (q) {
      if (!m[q.exam_number]) m[q.exam_number] = { num: q.exam_number, nome: q.exam, ano: q.year, n: 0 };
      m[q.exam_number].n++;
    });
    return Object.keys(m).map(function (k) { return m[k]; })
            .sort(function (a, b) { return b.num - a.num; });
  }

  function telaEscolher() {
    var lista = exames();
    var andamento = lerLocal(CHAVE, null);
    var html = '<div class="topbar"><div class="page-title"><div class="breadcrumb">Treino · ' + mesAno() + '</div><h1>Fazer um <em>simulado</em></h1></div></div>' +
      '<p class="lead">Um treino rápido de 20 questões ou uma prova anterior inteira com cronômetro — ' +
      'sem gabarito até o final. A correção vem depois, matéria por matéria.</p>';

    if (andamento && !andamento.terminado) {
      var faltam = duracao(andamento) - andamento.gastoAntes;
      var respondidas = Object.keys(andamento.respostas || {}).length;
      html += '<div class="cfg"><div class="retomar">' +
        '<p>Você tem um simulado em andamento — <b>' + esc(andamento.nome) + '</b>, ' +
        respondidas + ' de ' + andamento.ids.length + ' respondidas, ' +
        '<b>' + hhmmss(faltam) + '</b> no relógio.</p>' +
        '<button class="bt-principal" id="bt-retomar">Retomar</button>' +
        '<button class="bt-secundario" id="bt-descartar">Descartar</button>' +
        '</div></div>';
    }

    if (!BANCO.length) {
      html += '<div class="cfg"><div class="vazio"><p class="t">Nenhuma questão carregada</p>' +
              '<p>O banco do TJSP está em montagem: as provas anteriores da Vunesp entram aos poucos.</p></div></div>';
      tela.innerHTML = html;
      return;
    }

    html += '<div class="cfg"><div class="cfg-bloco">' +
      '<h2>Treino rápido · ' + TREINO_N + ' questões em 1 hora</h2>' +
      '<div class="cfg-grade">' +
        '<button class="prova-bt" data-treino="proporcional" type="button"><b>Como na prova</b>' +
          '<span>matérias na mesma proporção das provas recentes</span></button>' +
        '<button class="prova-bt" data-treino="fracas" type="button"><b>Minhas matérias fracas</b>' +
          '<span>as 5 matérias que mais rendem pontos, pelo seu acerto no banco</span></button>' +
      '</div>' +
      '<div class="cfg-rodape">' +
        '<button class="bt-principal" id="bt-treino" disabled>Começar treino</button>' +
        '<span class="aviso" id="aviso-treino">Escolha um tipo de treino.</span>' +
      '</div>' +
      '</div></div>';

    html += '<div class="cfg"><div class="cfg-bloco">' +
      '<h2>Prova completa de um exame</h2>' +
      '<div class="cfg-grade">' +
      lista.map(function (e) {
        return '<button class="prova-bt" data-exame="' + e.num + '" type="button">' +
               '<b>' + esc(e.nome) + '</b>' +
               '<span>' + e.ano + ' · ' + e.n + ' questões</span></button>';
      }).join('') +
      '</div>' +
      '<div class="cfg-rodape">' +
        '<button class="bt-principal" id="bt-comecar" disabled>Começar prova</button>' +
        '<span class="aviso" id="aviso-escolha">Escolha um exame acima.</span>' +
      '</div>' +
      '</div></div>';

    tela.innerHTML = html;

    var escolhido = null;
    var treino = null;
    tela.querySelectorAll('[data-treino]').forEach(function (b) {
      b.onclick = function () {
        tela.querySelectorAll('[data-treino]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        treino = b.dataset.treino;
        document.getElementById('bt-treino').disabled = false;
        document.getElementById('aviso-treino').textContent = TREINO_N + ' questões · 1 hora · corte proporcional de ' +
          Math.ceil(TREINO_N / 2) + ' · prioriza questões que você ainda não resolveu.';
      };
    });
    var btt = document.getElementById('bt-treino');
    if (btt) btt.onclick = function () { if (treino) comecarTreino(treino); };

    tela.querySelectorAll('[data-exame]').forEach(function (b) {
      b.onclick = function () {
        tela.querySelectorAll('[data-exame]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        escolhido = parseInt(b.dataset.exame, 10);
        var e = lista.filter(function (x) { return x.num === escolhido; })[0];
        document.getElementById('bt-comecar').disabled = false;
        document.getElementById('aviso-escolha').textContent =
          e.n + ' questões · 5 horas · a correção aparece só no final.';
      };
    });
    var bc = document.getElementById('bt-comecar');
    if (bc) bc.onclick = function () { if (escolhido) comecar(escolhido); };
    var br = document.getElementById('bt-retomar');
    if (br) br.onclick = function () { S = andamento; S.retomadoEm = Date.now(); salvar(); telaProva(); };
    var bd = document.getElementById('bt-descartar');
    if (bd) bd.onclick = function () {
      if (confirm('Descartar o simulado em andamento? As respostas serão perdidas.')) {
        try { localStorage.removeItem(CHAVE); } catch (e) {}
        telaEscolher();
      }
    };

    // A sessão do dia abre com a prova ou o treino já escolhido: ?exame=47 ou ?treino=fracas
    var url = new URLSearchParams(location.search);
    var pre = url.get('exame') ? tela.querySelector('[data-exame="' + url.get('exame') + '"]')
            : url.get('treino') ? tela.querySelector('[data-treino="' + url.get('treino') + '"]') : null;
    if (pre) { pre.click(); pre.scrollIntoView({ block: 'center' }); }
  }

  // ═══════════════ começar ═══════════════

  function comecar(numExame) {
    var qs = BANCO.filter(function (q) { return q.exam_number === numExame; })
                  .sort(function (a, b) { return a.question_number - b.question_number; });
    if (!qs.length) return;
    S = {
      nome: qs[0].exam,
      exame: numExame,
      ids: qs.map(function (q) { return q.id; }),
      respostas: {}, marcadas: {},
      atual: 0,
      inicio: Date.now(), gastoAntes: 0, retomadoEm: Date.now(),
      terminado: false
    };
    salvar();
    telaProva();
  }

  // Divide n vagas pelos pesos (maiores restos), sem passar do que existe.
  function repartir(pesos, n, disponiveis) {
    var ds = Object.keys(pesos).filter(function (d) { return pesos[d] > 0 && disponiveis[d] > 0; });
    var soma = ds.reduce(function (a, d) { return a + pesos[d]; }, 0) || 1;
    var vagas = {}, restos = [], usadas = 0;
    ds.forEach(function (d) {
      var exato = pesos[d] / soma * n;
      vagas[d] = Math.min(Math.floor(exato), disponiveis[d]);
      usadas += vagas[d];
      restos.push({ d: d, r: exato - Math.floor(exato) });
    });
    restos.sort(function (a, b) { return b.r - a.r; });
    for (var i = 0; usadas < n && i < restos.length * 3; i++) {
      var d = restos[i % restos.length].d;
      if (vagas[d] < disponiveis[d]) { vagas[d]++; usadas++; }
    }
    return vagas;
  }

  function embaralhar(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function comecarTreino(modo) {
    var E = window.ESTUDO;
    var resp = E.lerRespostas();
    var pesos = E.pesosRecentes(BANCO);
    if (modo === 'fracas') {
      // mesmo critério do painel Rumo à vaga: pontos a ganhar até 75%; só as 5 que mais rendem
      var st = E.statsPorDisciplina(BANCO, resp);
      Object.keys(pesos).forEach(function (d) { pesos[d] = pesos[d] * Math.max(0, 0.75 - E.acertoEstimado(st[d])); });
      var top5 = Object.keys(pesos).sort(function (a, b) { return pesos[b] - pesos[a]; }).slice(0, 5);
      Object.keys(pesos).forEach(function (d) { if (top5.indexOf(d) === -1) pesos[d] = 0; });
    }
    var porDisc = {};
    BANCO.forEach(function (q) { if (q.correct_answer) (porDisc[q.discipline] = porDisc[q.discipline] || []).push(q); });
    var disp = {};
    Object.keys(porDisc).forEach(function (d) { disp[d] = porDisc[d].length; });
    var vagas = repartir(pesos, TREINO_N, disp);
    var escolhidas = [];
    Object.keys(vagas).forEach(function (d) {
      // primeiro as nunca resolvidas; no treino das fracas, depois as que errou
      var nunca = [], erradas = [], resto = [];
      porDisc[d].forEach(function (q) {
        var r = resp[q.id];
        if (!r || !r.vezes) nunca.push(q); else if (r.ultima_correta === false) erradas.push(q); else resto.push(q);
      });
      var fila = modo === 'fracas'
        ? embaralhar(erradas).concat(embaralhar(nunca), embaralhar(resto))
        : embaralhar(nunca).concat(embaralhar(erradas), embaralhar(resto));
      var grupos = {};
      fila = fila.filter(function (q) {
        if (!q.duplicate_group) return true;
        if (grupos[q.duplicate_group]) return false;
        return (grupos[q.duplicate_group] = true);
      });
      escolhidas = escolhidas.concat(fila.slice(0, vagas[d]));
    });
    if (!escolhidas.length) return;
    escolhidas.sort(function (a, b) { return a.question_number - b.question_number; });
    S = {
      nome: 'Treino rápido · ' + (modo === 'fracas' ? 'matérias fracas' : 'como na prova'),
      treino: modo,
      duracao: TREINO_MS,
      corte: Math.ceil(escolhidas.length / 2),
      ids: escolhidas.map(function (q) { return q.id; }),
      respostas: {}, marcadas: {},
      atual: 0,
      inicio: Date.now(), gastoAntes: 0, retomadoEm: Date.now(),
      terminado: false
    };
    salvar();
    telaProva();
  }

  // Cada questão feita no simulado entra no histórico do banco (tj_bq_respostas),
  // que é de onde o painel Rumo à vaga tira o acerto por matéria. Em branco conta como erro.
  function gravarNoHistorico() {
    if (S.historicoGravado) return;
    var hist = lerLocal('tj_bq_respostas', {});
    var agora = new Date().toISOString();
    S.ids.forEach(function (id) {
      var q = BANCO.filter(function (x) { return x.id === id; })[0];
      if (!q || !q.correct_answer) return;
      var marcou = S.respostas[id] || null;
      var certa = marcou === q.correct_answer;
      var at = hist[id] || { vezes: 0, acertos: 0, erros: 0 };
      at.vezes += 1;
      if (certa) at.acertos += 1; else at.erros += 1;
      at.ultima_correta = certa; at.ultima_resposta = marcou; at.ultima_data = agora;
      hist[id] = at;
    });
    salvarLocal('tj_bq_respostas', hist);
    S.historicoGravado = true;
  }

  function salvar() { salvarLocal(CHAVE, S); }

  function questao(i) {
    var id = S.ids[i];
    return BANCO.filter(function (q) { return q.id === id; })[0];
  }

  // ═══════════════ tela 2: a prova ═══════════════

  function telaProva() {
    tela.innerHTML =
      '<div class="barra">' +
        '<div><span class="cron-rot">Tempo restante</span><span class="cron" id="cron">--:--:--</span></div>' +
        '<div class="barra-sep"></div>' +
        '<div class="andamento" id="andamento"></div>' +
        '<div class="barra-dir">' +
          '<button class="bt-secundario" id="bt-folha">Folha de respostas</button>' +
          '<button class="bt-principal" id="bt-finalizar">Finalizar</button>' +
        '</div>' +
      '</div>' +
      '<div class="folha" id="folha" style="display:none"></div>' +
      '<div id="palco"></div>';

    document.getElementById('bt-folha').onclick = function () {
      var f = document.getElementById('folha');
      var aberta = f.style.display !== 'none';
      f.style.display = aberta ? 'none' : 'block';
      this.textContent = aberta ? 'Folha de respostas' : 'Esconder folha';
      if (!aberta) pintarFolha();
    };
    document.getElementById('bt-finalizar').onclick = confirmarFim;

    pintarQuestao();
    tiquetaque();
    if (relogio) clearInterval(relogio);
    relogio = setInterval(tiquetaque, 1000);
  }

  function tiquetaque() {
    var el = document.getElementById('cron');
    if (!el || !S || S.terminado) return;
    var falta = restante();
    el.textContent = hhmmss(falta);
    el.classList.toggle('pouco', falta <= 15 * 60 * 1000);
    if (falta <= 0) {
      clearInterval(relogio);
      finalizar(true);
    }
  }

  function pintarQuestao() {
    var q = questao(S.atual);
    if (!q) return;
    var resp = S.respostas[q.id];
    var marcada = !!S.marcadas[q.id];

    document.getElementById('andamento').innerHTML =
      'Questão <b>' + (S.atual + 1) + '</b> de ' + S.ids.length +
      ' · <b>' + Object.keys(S.respostas).length + '</b> respondidas';

    var alts = ['a', 'b', 'c', 'd', 'e'].map(function (L) {
      var txt = q['alternative_' + L];
      if (!txt) return '';
      var letra = L.toUpperCase();
      return '<button class="alt' + (resp === letra ? ' sel' : '') + '" data-l="' + letra + '" type="button">' +
             '<span class="l">' + letra + '</span><span>' + esc(txt) + '</span></button>';
    }).join('');

    document.getElementById('palco').innerHTML =
      '<article class="q">' +
        '<div class="q-cab"><span class="q-num">Questão ' + (S.atual + 1) + '</span>' +
        '<span>' + esc(S.nome) + '</span></div>' +
        '<div class="q-corpo"><div class="q-enun">' + enunciadoQuestao(q) + '</div></div>' +
        '<div class="alts">' + alts + '</div>' +
        '<div class="q-pe">' +
          '<button class="bt-marcar' + (marcada ? ' on' : '') + '" id="bt-marcar" type="button">' +
            (marcada ? '✓ Marcada para revisar' : 'Marcar para revisar') + '</button>' +
          '<div class="navq">' +
            '<button class="bt-secundario" id="bt-ant"' + (S.atual === 0 ? ' disabled' : '') + '>← Anterior</button>' +
            '<button class="bt-secundario" id="bt-prox"' + (S.atual === S.ids.length - 1 ? ' disabled' : '') + '>Próxima →</button>' +
          '</div>' +
        '</div>' +
      '</article>';

    document.querySelectorAll('#palco .alt').forEach(function (b) {
      b.onclick = function () {
        // clicar na mesma alternativa desmarca: em branco é uma resposta válida
        if (S.respostas[q.id] === b.dataset.l) delete S.respostas[q.id];
        else S.respostas[q.id] = b.dataset.l;
        salvar(); pintarQuestao(); pintarFolha();
      };
    });
    document.getElementById('bt-marcar').onclick = function () {
      if (S.marcadas[q.id]) delete S.marcadas[q.id]; else S.marcadas[q.id] = 1;
      salvar(); pintarQuestao(); pintarFolha();
    };
    var ant = document.getElementById('bt-ant'), prox = document.getElementById('bt-prox');
    if (ant) ant.onclick = function () { if (S.atual > 0) { S.atual--; salvar(); pintarQuestao(); pintarFolha(); window.scrollTo(0, 0); } };
    if (prox) prox.onclick = function () { if (S.atual < S.ids.length - 1) { S.atual++; salvar(); pintarQuestao(); pintarFolha(); window.scrollTo(0, 0); } };
  }

  function pintarFolha() {
    var f = document.getElementById('folha');
    if (!f || f.style.display === 'none') return;
    f.innerHTML = '<div class="folha-grade">' +
      S.ids.map(function (id, i) {
        var cls = 'fq';
        if (S.respostas[id]) cls += ' feita';
        if (S.marcadas[id]) cls += ' marcada';
        if (i === S.atual) cls += ' atual';
        return '<button class="' + cls + '" data-i="' + i + '" type="button" ' +
               'aria-label="Questão ' + (i + 1) + '">' + (i + 1) + '</button>';
      }).join('') + '</div>' +
      '<div class="folha-legenda">' +
        '<span><i class="f"></i> respondida</span>' +
        '<span><i></i> em branco</span>' +
        '<span><i class="m"></i> marcada para revisar</span>' +
      '</div>';
    f.querySelectorAll('.fq').forEach(function (b) {
      b.onclick = function () {
        S.atual = parseInt(b.dataset.i, 10);
        salvar(); pintarQuestao(); pintarFolha(); window.scrollTo(0, 0);
      };
    });
  }

  function confirmarFim() {
    var faltam = S.ids.length - Object.keys(S.respostas).length;
    var msg = faltam
      ? 'Você ainda tem ' + faltam + ' questão(ões) em branco. Finalizar mesmo assim?'
      : 'Finalizar e corrigir o simulado?';
    if (confirm(msg)) finalizar(false);
  }

  function finalizar(porTempo) {
    if (relogio) clearInterval(relogio);
    S.terminado = true;
    S.gastoAntes = Math.min(tempoGasto(), duracao(S));
    S.retomadoEm = null;
    S.porTempo = !!porTempo;
    S.fimEm = Date.now();
    gravarNoHistorico();
    salvar();
    telaResultado();
  }

  // ═══════════════ tela 3: correção ═══════════════

  function corrigir() {
    var certas = 0, porMateria = {}, erradas = [];
    S.ids.forEach(function (id, i) {
      var q = BANCO.filter(function (x) { return x.id === id; })[0];
      if (!q) return;
      var marcou = S.respostas[id] || null;
      // questão anulada vale o ponto para todos, como na prova
      var acertou = !q.correct_answer || marcou === q.correct_answer;
      if (acertou) certas++;
      var d = q.discipline;
      if (!porMateria[d]) porMateria[d] = { certas: 0, total: 0 };
      porMateria[d].total++;
      if (acertou) porMateria[d].certas++;
      if (!acertou) erradas.push({ i: i, q: q, marcou: marcou });
    });
    return { certas: certas, porMateria: porMateria, erradas: erradas };
  }

  // o comentário do material vem em dois formatos; ambos abrem o
  // julgamento de cada alternativa, e é por ele que se separa.
  // a alternativa do gabarito oficial aparece sempre como gabarito, mesmo quando o comentário do material a chama de errada
  function formatarExplicacao(txt, gab) {
    // "A) Errado" seguido de "A alternativa A está incorreta, pois…": um cabeçalho só
    txt = String(txt || '').replace(/(^|\n)(\s*([A-E])\)\s*(?:Correto|Correta|Certo|Certa|Errado|Errada|Incorreto|Incorreta)\b[ \t:.,-]*)\n+\s*(?:A\s+)?(?:alternativa|assertiva|letra)\s+\3\s+(?:est[áa]|é)\s+(?:corret[ao]|cert[ao]|errad[ao]|incorret[ao])\b[\s:.,-]*/gi, '$1$2\n');
    var JULGA = '(?:Correto|Correta|Certo|Certa|Errado|Errada|Incorreto|Incorreta)';
    var ABRE = '(?:[A-E]\\)\\s*' + JULGA + '\\b' +
               '|(?:A\\s+)?(?:alternativa|assertiva|letra)\\s+[A-E]\\s+(?:est[áa]|é)\\s+' + JULGA + '\\b)';
    var VER = new RegExp('^(?:([A-E])\\)\\s*(' + JULGA + ')' +
              '|(?:A\\s+)?(?:alternativa|assertiva|letra)\\s+([A-E])\\s+(?:est[áa]|é)\\s+(' + JULGA + '))' +
              '\\b[\\s:.,-]*', 'i');
    return txt.split(new RegExp('\\n(?=' + ABRE + ')', 'i')).map(function (bloco) {
      var m = bloco.match(VER);
      var corpo = m ? bloco.slice(m[0].length) : bloco;
      corpo = corpo.replace(/([^.:;?!)"”\s])[ \t]*\n\s*\n\s*/g, '$1 ').replace(/\n{2,}/g, '\u0000').replace(/\n/g, ' ')
                   .replace(/\u0000/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
      if (!corpo && !m) return '';
      var paras = corpo.split('\n').filter(Boolean).map(function (p) {
        return '<p>' + esc(p) + '</p>';
      }).join('');
      if (!m) return '<div class="ex-bloco ex-intro">' + paras + '</div>';
      var letra = m[1] || m[3], veredito = m[2] || m[4];
      var certo = /^(corret|cert)/i.test(veredito);
      if (gab && letra.toUpperCase() === gab && !certo) { veredito = 'Gabarito'; certo = true; }
      return '<div class="ex-bloco ' + (certo ? 'ex-certo' : 'ex-errado') + '">' +
             '<span class="ex-l">' + esc(letra.toUpperCase()) + '</span>' +
             '<div class="ex-txt"><span class="ex-v">' + esc(veredito) + '</span>' + paras + '</div></div>';
    }).join('');
  }

  function telaResultado() {
    var r = corrigir();
    var total = S.ids.length;
    var passou = r.certas >= corte();
    var brancos = total - Object.keys(S.respostas).length;

    var mats = Object.keys(r.porMateria).sort(function (a, b) {
      var pa = r.porMateria[a].certas / r.porMateria[a].total;
      var pb = r.porMateria[b].certas / r.porMateria[b].total;
      return pa - pb;
    });

    var html =
      '<div class="topbar"><div class="page-title"><div class="breadcrumb">Treino · ' + mesAno() + '</div><h1>Resultado do <em>simulado</em></h1></div></div>' +
      '<p class="lead">' + esc(S.nome) + ' · ' + total + ' questões' +
        (S.porTempo ? ' · o tempo acabou antes de você finalizar' : '') + '</p>' +

      '<div class="res-hero" style="margin-top:1.5rem">' +
        '<div class="res-nota">' + r.certas + '<span class="res-de"> / ' + total + '</span></div>' +
        '<div class="res-selo ' + (passou ? 'passou' : 'nao') + '">' +
          (passou ? 'Acima do corte' : 'Abaixo do corte') + '</div>' +
        '<div class="res-linha">' +
          (S.treino ? 'Corte proporcional: <b>' + corte() + ' de ' + total + '</b> · ' : 'Referência: <b>' + CORTE + ' acertos</b> (metade) · ') +
          'Aproveitamento: <b>' + Math.round(r.certas / total * 100) + '%</b> · ' +
          'Tempo: <b>' + hhmmss(S.gastoAntes) + '</b>' +
          (brancos ? ' · <b>' + brancos + '</b> em branco' : '') +
        '</div>' +
      '</div>' +

      '<div class="res-tabela"><h2>Desempenho por matéria</h2>' +
        mats.map(function (m) {
          var d = r.porMateria[m], pct = Math.round(d.certas / d.total * 100);
          var cls = pct >= 70 ? 'bom' : (pct < 50 ? 'ruim' : '');
          return '<div class="mat-linha">' +
                 '<span class="mat-nome">' + esc(m) + '</span>' +
                 '<span class="mat-frac">' + d.certas + '/' + d.total + ' · ' + pct + '%</span>' +
                 '<div class="mat-barra"><div class="mat-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
                 '</div>';
        }).join('') +
      '</div>' +

      '<div class="res-acoes">' +
        '<button class="bt-principal" id="bt-registrar">Registrar nas Estatísticas</button>' +
        '<button class="bt-secundario" id="bt-erros">Mandar erros para o Caderno</button>' +
        '<button class="bt-secundario" id="bt-novo">Fazer outro simulado</button>' +
      '</div>';

    if (r.erradas.length) {
      html += '<div class="res-tabela"><h2>As que você errou (' + r.erradas.length + ')</h2>' +
        r.erradas.map(function (e) {
          var q = e.q;
          return '<div class="rev-q" data-id="' + esc(q.id) + '">' +
            '<div class="rev-cab"><span class="n">' + (e.i + 1) + '</span>' +
            '<span class="m">' + esc(q.discipline) + '</span>' +
            '<span>' + esc(q.topic) + '</span>' +
            '<span class="r">' + (e.marcou ? 'você marcou ' + e.marcou : 'em branco') +
            ' · gabarito ' + esc(q.correct_answer) + '</span></div>' +
            '<div class="rev-corpo">' +
              '<div class="q-enun" style="font-size:.875rem">' + enunciadoQuestao(q) + '</div>' +
              ['a', 'b', 'c', 'd', 'e'].map(function (L) {
                var t = q['alternative_' + L]; if (!t) return '';
                var letra = L.toUpperCase();
                var marca = letra === q.correct_answer ? ' ✓' : (letra === e.marcou ? ' ✕' : '');
                return '<p style="font-size:.875rem;line-height:1.6;margin:.3rem 0;color:' +
                       (letra === q.correct_answer ? 'var(--ink)' : 'var(--ink-soft)') + '">' +
                       '<b>' + letra + marca + ')</b> ' + esc(t) + '</p>';
              }).join('') +
              (q.explanation ? '<div style="margin-top:.9rem">' + formatarExplicacao(q.explanation, q.correct_answer) + '</div>' : '') +
              (q.legal_basis ? '<p class="rev-base"><b>Fundamentação:</b> ' + esc(q.legal_basis) + '</p>' : '') +
              (q.notes ? '<div class="rev-nota">Sobre o material de origem: ' + esc(q.notes) + '</div>' : '') +
            '</div></div>';
        }).join('') +
      '</div>';
    }

    tela.innerHTML = html;

    tela.querySelectorAll('.rev-cab').forEach(function (c) {
      c.onclick = function () { c.parentElement.classList.toggle('aberta'); };
    });
    document.getElementById('bt-registrar').onclick = function () { registrar(r, this); };
    document.getElementById('bt-erros').onclick = function () { mandarErros(r, this); };
    document.getElementById('bt-novo').onclick = function () {
      try { localStorage.removeItem(CHAVE); } catch (e) {}
      S = null; telaEscolher(); window.scrollTo(0, 0);
    };
  }

  function registrar(r, bt) {
    var arr = lerLocal(SIM_KEY, []);
    var hoje = (typeof dataLocalHoje === 'function') ? dataLocalHoje()
             : new Date().toISOString().slice(0, 10);
    var piores = Object.keys(r.porMateria).map(function (m) {
      return { m: m, p: r.porMateria[m].certas / r.porMateria[m].total };
    }).sort(function (a, b) { return a.p - b.p; }).slice(0, 3)
      .map(function (x) { return x.m + ' (' + Math.round(x.p * 100) + '%)'; });

    arr.unshift({
      id: Date.now(),
      tipo: S.treino ? 'simulado' : 'prova_oab',
      nome: S.nome,
      data: hoje,
      total: S.ids.length,
      acertos: r.certas,
      erros: S.ids.length - r.certas,
      pct: Math.round(r.certas / S.ids.length * 100),
      obs: 'Feito no app em ' + hhmmss(S.gastoAntes) + '. Piores matérias: ' + piores.join(', ') + '.',
      criado: new Date().toISOString()
    });
    salvarLocal(SIM_KEY, arr);
    bt.textContent = '✓ Registrado';
    bt.disabled = true;
  }

  // o Caderno de Erros usa apelidos curtos de matéria; o banco usa o
  // nome por extenso. Sem correspondência, vai o nome como está.
  var APELIDO = {
    'Ética Profissional': 'etica', 'Direito Constitucional': 'constitucional',
    'Direito Civil': 'civil', 'Direito Processual Civil': 'proc_civil',
    'Direito Penal': 'penal', 'Direito Processual Penal': 'proc_penal',
    'Direito do Trabalho': 'trabalho', 'Direito Processual do Trabalho': 'proc_trabalho',
    'Direito Tributário': 'tributario', 'Direito Administrativo': 'administrativo',
    'Direito Empresarial': 'empresarial'
  };

  function mandarErros(r, bt) {
    if (typeof erros_add !== 'function') { bt.textContent = 'Caderno indisponível'; return; }
    var n = 0;
    r.erradas.forEach(function (e) {
      erros_add({
        materia: APELIDO[e.q.discipline] || e.q.discipline,
        topico: e.q.topic,
        subtopico: e.q.subtopic,
        motivo: e.marcou ? 'nao_sabia' : 'desatencao',
        o_que_faltou: e.marcou
          ? ('Marquei ' + e.marcou + ', o gabarito é ' + e.q.correct_answer + '.')
          : 'Deixei em branco.',
        explicacao: (e.q.legal_basis || '') ||
                    (e.q.explanation || '').slice(0, 300),
        questao_id: e.q.id
      });
      n++;
    });
    bt.textContent = '✓ ' + n + ' erro(s) no Caderno';
    bt.disabled = true;
  }

  // ═══════════════ início ═══════════════

  document.addEventListener('DOMContentLoaded', function () {
    var guardado = lerLocal(CHAVE, null);
    if (guardado && guardado.terminado) { S = guardado; telaResultado(); return; }
    telaEscolher();
  });

  // sair da aba congela o relógio; voltar retoma de onde parou
  function congelar() {
    if (!S || S.terminado || !S.retomadoEm) return;
    S.gastoAntes = tempoGasto();
    S.retomadoEm = null;
    salvar();
  }
  document.addEventListener('visibilitychange', function () {
    if (!S || S.terminado) return;
    if (document.hidden) congelar();
    else { S.retomadoEm = Date.now(); salvar(); tiquetaque(); }
  });
  // fechar a aba de supetão não dispara visibilitychange em todo navegador
  window.addEventListener('pagehide', congelar);
})();
