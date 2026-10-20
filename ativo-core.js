// Revisão ativa (a partir de 12/10/2026): flashcards de revisão com "sei"/"errei".
// Usado por: sessao-core.js (hoje.html, revisar.html, calendario.html, painel-erros.html)
//
// Regra de cada cartão (estado em tj_fc_estado_v1): ver responder() — errei/difícil/bom/fácil.
(function () {
  var K_FC = 'tj_fc_estado_v1';
  var K_QPT = 'tj_ativo_questoes_por_topico';
  var ESCADA = [3, 7, 15];
  var VESPERA = '2027-03-13';
  var NOVOS_POR_MATERIA = 10;

  function hoje() {
    return typeof dataLocalHoje === 'function' ? dataLocalHoje() : iso(new Date());
  }
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function somaDias(s, n) {
    var p = s.split('-').map(Number);
    return iso(new Date(p[0], p[1] - 1, p[2] + n));
  }
  function ler(k, padrao) {
    try { return JSON.parse(localStorage.getItem(k)) || padrao; } catch (e) { return padrao; }
  }
  function gravar(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      localStorage.setItem('tj_local_rev', String(Date.now()));
      if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) window._syncOAB.notificarAlteracaoLocal(k);
    } catch (e) {}
  }

  // Um arquivo de flashcards por matéria; carregados sob demanda.
  var ARQUIVOS = ['fc-const.js', 'fc-penal.js', 'fc-cpp.js', 'fc-cpc.js', 'fc-adm.js', 'fc-normas.js', 'fc-pt.js', 'fc-info.js', 'fc-mat.js', 'fc-estatuto.js', 'fc-regimento.js', 'fc-interna.js'];
  var _carga = null;
  function carregarCartoes() {
    if (_carga) return _carga;
    _carga = Promise.all(ARQUIVOS.map(function (arq) {
      return new Promise(function (ok) {
        var s = document.createElement('script');
        s.src = arq; s.onload = ok; s.onerror = ok;
        document.head.appendChild(s);
      });
    })).then(cartoes);
    return _carga;
  }

  function cartoes() { return window.FC_VDE || []; }
  function porId(id) { return cartoes().filter(function (c) { return c.id === id; })[0] || null; }
  function estados() { return ler(K_FC, {}); }

  // Errados antes de 13/10/2026 ficaram agendados para o dia seguinte (escada antiga 1→7→15).
  // A data efetiva nunca fica antes de 3 dias depois do último erro — vale também para dado antigo vindo da nuvem.
  function proxDe(e) {
    var h = e.h || [], ult = h[h.length - 1];
    if (e.n === 0 && e.prox && ult && ult[1] === 'e') { var c = somaDias(ult[0], ESCADA[0]); if (e.prox < c) return c; }
    return e.prox;
  }

  // Revisão marcada para depois da véspera é puxada para 13/03, para nada ficar para trás.
  function agendar(base, dias) {
    var alvo = somaDias(base, dias);
    return alvo > VESPERA && base < VESPERA ? VESPERA : alvo;
  }

  // 4 respostas, como no Anki (desde 14/10/2026). O intervalo cresce a partir do último:
  //   errei → 1 dia · difícil → 3 dias (ou um pouco mais que o último) · bom → 7 (ou 2,5× o último) · fácil → 15 (ou 3,5×).
  //   Fácil com intervalo já de 15+ dias, ou bom com 30+, tira o cartão da rotação.
  // Estados antigos (escada 3→7→15) guardavam só o degrau n; o intervalo vem dele.
  var NOTAS = ['errei', 'dificil', 'bom', 'facil'];
  function intervaloAtual(e) {
    if (!e) return 0;
    if (e.iv) return e.iv;
    return e.n == null ? 0 : ESCADA[Math.min(e.n, ESCADA.length - 1)];
  }
  function proximoIntervalo(e, nota) {
    var iv = intervaloAtual(e);
    if (nota === 'errei') return 1;
    if (nota === 'dificil') return Math.max(3, Math.round(iv * 1.2));
    if (nota === 'bom') return iv >= 30 ? 0 : (iv ? Math.max(7, Math.round(iv * 2.5)) : 7);
    return iv >= 15 ? 0 : (iv ? Math.max(15, Math.round(iv * 3.5)) : 15);
  }
  function previa(id) {
    var e = estados()[id], out = {};
    NOTAS.forEach(function (nota) { out[nota] = proximoIntervalo(e, nota); });
    return out;
  }
  function responder(id, nota) {
    if (nota === true) nota = 'bom';
    if (nota === false) nota = 'errei';
    var todos = estados(), h = hoje();
    var e = todos[id] || { h: [] };
    var dias = proximoIntervalo(e, nota);
    e.h = (e.h || []).concat([[h, nota === 'errei' ? 'e' : nota[0]]]).slice(-12);
    if (nota === 'errei') e.erros = (e.erros || 0) + 1;
    e.n = null;
    if (!dias) { e.fora = true; delete e.prox; delete e.iv; }
    else { e.fora = false; e.iv = dias; e.prox = agendar(h, dias); }
    todos[id] = e;
    gravar(K_FC, todos);
    return e;
  }

  function vencidos(data) {
    var h = data || hoje(), est = estados();
    return cartoes().filter(function (c) {
      var e = est[c.id];
      return e && !e.fora && e.prox && proxDe(e) <= h;
    }).sort(function (a, b) { return proxDe(est[a.id]).localeCompare(proxDe(est[b.id])); });
  }

  // Cartões ainda não vistos das matérias do dia, na ordem das revisões.
  function novos(disciplinas, limite) {
    var est = estados(), max = limite == null ? NOVOS_POR_MATERIA : limite, cont = {};
    return cartoes().filter(function (c) {
      if (est[c.id] || disciplinas.indexOf(c.d) < 0) return false;
      cont[c.d] = (cont[c.d] || 0) + 1;
      return cont[c.d] <= max;
    }).map(function (c, i) { return [disciplinas.indexOf(c.d), i, c]; })
      .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
  }

  function resumo() {
    var est = estados(), r = { total: cartoes().length, vistos: 0, fora: 0, emRevisao: 0, vencidos: vencidos().length };
    cartoes().forEach(function (c) {
      var e = est[c.id]; if (!e) return;
      r.vistos++;
      if (e.fora) r.fora++; else r.emRevisao++;
    });
    return r;
  }

  // Erros por disciplina e tema: cartões que já levaram "errei" + Caderno de Erros pendente.
  function painelErros() {
    var est = estados(), out = {};
    function soma(disc, tema, campo) {
      var d = out[disc] || (out[disc] = { fc: 0, cad: 0, temas: {} });
      d[campo]++;
      var t = d.temas[tema || '—'] || (d.temas[tema || '—'] = { fc: 0, cad: 0 });
      t[campo]++;
    }
    cartoes().forEach(function (c) { var e = est[c.id]; if (e && e.erros) soma(c.d, c.t, 'fc'); });
    if (typeof erros_get === 'function') {
      erros_get().forEach(function (x) {
        if (x.status === 'dominada' || x.flashcard_id) return;
        var disc = (window.ESTUDO && ESTUDO.disciplinaDoBanco((window.MATERIAS_ERROS || {})[x.materia] || x.materia)) || x.materia || 'Sem matéria';
        soma(disc, x.topico, 'cad');
      });
    }
    return out;
  }

  function diaDoCalendario(data) {
    var cal = window.CAL_ATIVO; if (!cal) return null;
    var d = data || hoje();
    return cal.dias.filter(function (x) { return x.d === d; })[0] || null;
  }

  function questoesPorTopico() {
    var n = parseInt(localStorage.getItem(K_QPT), 10);
    return n > 0 ? n : 10;
  }
  function definirQuestoesPorTopico(n) { gravar(K_QPT, n); }

  window.ATIVO = {
    ESCADA: ESCADA, ARQUIVOS: ARQUIVOS, hoje: hoje, somaDias: somaDias,
    carregarCartoes: carregarCartoes, cartoes: cartoes, porId: porId, estados: estados, responder: responder, previa: previa,
    vencidos: vencidos, novos: novos, resumo: resumo, painelErros: painelErros,
    questoesPorTopico: questoesPorTopico, definirQuestoesPorTopico: definirQuestoesPorTopico,
    diaDoCalendario: diaDoCalendario
  };
})();
