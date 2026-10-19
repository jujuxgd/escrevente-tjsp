// Calendário que se reorganiza quando Julia adianta conteúdo.
// Carregar logo depois de calendario-ativo.js: reescreve CAL_ATIVO.dias da fase 1 em memória.
//
// O plano fixo vira uma fila de conteúdos (n = DIA do VDE, na ordem do calendário). Adiantar grava
// em tj_adiantado_v1 {n: data em que foi estudado}; o resto da fila anda para trás (ver aplicar).
(function () {
  var CAL = window.CAL_ATIVO; if (!CAL) return;
  var K = 'tj_adiantado_v1';
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var HOJE = typeof dataLocalHoje === 'function' ? dataLocalHoje() : iso(new Date());
  function ler() { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } }
  function gravar(v) {
    try {
      localStorage.setItem(K, JSON.stringify(v));
      localStorage.setItem('tj_local_rev', String(Date.now()));
      if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) window._syncOAB.notificarAlteracaoLocal(K);
    } catch (e) {}
  }

  // fila original: um item por PDF do VDE, com os tópicos dele e a data prevista
  var ORIGINAL = CAL.dias.map(function (x) { return JSON.parse(JSON.stringify(x)); });
  var FILA = [], VAGAS = {};
  ORIGINAL.forEach(function (x) {
    if (x.f !== 1 || x.tipo !== 'estudo' || !x.top) return;
    var ns = [];
    x.top.forEach(function (t) {
      var u = FILA.filter(function (y) { return y.n === t.n; })[0];
      if (!u) { u = { n: t.n, d: x.d, tops: [] }; FILA.push(u); ns.push(t.n); }
      u.tops.push(t);
    });
    VAGAS[x.d] = ns.length;
  });
  var POR_N = {}; FILA.forEach(function (u) { POR_N[u.n] = u; });

  // Fila corrida desde o 1º dia: cada dia de estudo pega as próximas vagas da fila (sem os adiantados) e
  // recebe também o que foi adiantado nele. Adiantar o Dia 3 hoje puxa o resto: o que era do dia seguinte
  // vira o de amanhã, e os dias que sobram no fim viram revisão extra.
  var DATA_DE = {};
  function aplicar() {
    var adi = ler(), porData = {};
    Object.keys(adi).forEach(function (n) { if (POR_N[n]) (porData[adi[n]] = porData[adi[n]] || []).push(POR_N[n]); });
    var fila = FILA.filter(function (u) { return !adi[u.n]; }), k = 0;
    var vistos = {};
    DATA_DE = {};
    Object.keys(adi).forEach(function (n) { DATA_DE[n] = adi[n]; });
    CAL.dias = ORIGINAL.map(function (x) {
      var y = JSON.parse(JSON.stringify(x));
      if (x.f !== 1 || x.tipo !== 'estudo') {
        if (porData[x.d]) {
          y.top = [];
          porData[x.d].forEach(function (u) { y.top = y.top.concat(u.tops); });
          y.adiantado = true;
        }
        return y;
      }
      var us = [];
      for (var i = 0; i < VAGAS[x.d] && k < fila.length; i++) { DATA_DE[fila[k].n] = x.d; us.push(fila[k++]); }
      us = us.concat(porData[x.d] || []);
      if (us.length) {
        y.top = [];
        us.sort(function (a, b) { return FILA.indexOf(a) - FILA.indexOf(b); }).forEach(function (u) { y.top = y.top.concat(u.tops); });
        if (us.some(function (u) { return adi[u.n] === x.d && u.d !== x.d; })) y.adiantado = true;
        vistos[x.d] = us;
        return y;
      }
      // dia sem conteúdo: revisão extra do que foi estudado uma semana antes
      var antes = new Date(x.d + 'T12:00:00'); antes.setDate(antes.getDate() - 7);
      var base = vistos[iso(antes)] || [];
      var foco = [];
      base.forEach(function (u) { u.tops.forEach(function (t) { if (foco.indexOf(t.d) < 0) foco.push(t.d); }); });
      delete y.top;
      y.tipo = 'revisao';
      y.extra = true;
      y.foco = foco.length ? foco.slice(0, 2) : ['Língua Portuguesa', 'Direito Constitucional'];
      return y;
    });
  }
  aplicar();

  window.PLANO = {
    HOJE: HOJE,
    adiantados: ler,
    // próximo PDF ainda não estudado, na ordem do VDE, previsto para depois de hoje
    proximo: function () {
      var adi = ler(), u = FILA.filter(function (v) { return !adi[v.n] && DATA_DE[v.n] > HOJE; })[0];
      return u ? { n: u.n, tops: u.tops, d: DATA_DE[u.n] } : null;
    },
    adiantar: function (n) { var a = ler(); a[n] = HOJE; gravar(a); },
    desfazer: function (n) { var a = ler(); delete a[n]; gravar(a); },
    adiantadosHoje: function () {
      var a = ler(); return FILA.filter(function (u) { return a[u.n] === HOJE && u.d !== HOJE; });
    },
    dataPrevista: function (n) { return DATA_DE[n] || null; },
    fimDoConteudo: function () {
      var ult = null; CAL.dias.forEach(function (x) { if (x.top && x.f === 1) ult = x.d; }); return ult;
    }
  };
})();
