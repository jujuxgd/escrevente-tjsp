// Perfil — recompõe sem recriar nós: o JS da página continua
// preenchendo #resumo-grid, #badge-grid, os gráficos etc.
document.addEventListener('DOMContentLoaded', function () {
  var main = document.querySelector('main');
  if (!main || !document.getElementById('resumo-grid')) return;
  document.body.classList.add('perfil');

  function rotuloDe(texto) {
    var alvo = null;
    main.querySelectorAll('.section-label').forEach(function (s) {
      if (s.textContent.trim().toLowerCase() === texto) alvo = s;
    });
    return alvo;
  }

  // ── Conquistas: cabeçalho com contagem e grade recolhida ──
  (function conquistas() {
    var grid = document.getElementById('badge-grid');
    var sub = document.getElementById('conquistas-sub-txt');
    if (!grid || !sub) return;

    var head = document.createElement('div');
    head.className = 'conq-head';
    head.innerHTML = '<span class="txt"><b id="conq-n">0</b> de <b id="conq-t">0</b> conquistas</span>' +
      '<span class="conq-bar"><i id="conq-fill" style="width:0%"></i></span>' +
      '<button class="conq-btn" type="button" aria-expanded="false" aria-controls="badge-grid">Ver conquistas</button>';
    sub.insertAdjacentElement('afterend', head);
    grid.hidden = true;

    var btn = head.querySelector('.conq-btn');
    btn.addEventListener('click', function () {
      var abrir = grid.hidden;
      grid.hidden = !abrir;
      btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      btn.textContent = abrir ? 'Esconder conquistas' : 'Ver conquistas';
    });

    function lerContagem() {
      var m = (sub.textContent || '').match(/(\d+)\s+de\s+(\d+)/);
      if (!m) return;
      document.getElementById('conq-n').textContent = m[1];
      document.getElementById('conq-t').textContent = m[2];
      document.getElementById('conq-fill').style.width = (m[2] > 0 ? (m[1] / m[2]) * 100 : 0) + '%';
    }
    new MutationObserver(lerContagem).observe(sub, { childList: true, characterData: true, subtree: true });
    setTimeout(lerContagem, 150);
    setTimeout(lerContagem, 700);
  })();

  // ── Insights vazio: esconde a seção inteira ──
  setTimeout(function () {
    var ig = document.getElementById('insights-grid');
    if (ig && ig.querySelector('.insights-empty')) {
      ig.classList.add('secao-vazia');
      var r = rotuloDe('insights');
      if (r) r.classList.add('secao-vazia');
    }
  }, 300);

  // ── Configurações vão para o fim: ajuste não é o assunto da página ──
  var rotuloCfg = rotuloDe('configurações');
  if (rotuloCfg) {
    var blocoCfg = rotuloCfg.nextElementSibling;
    main.appendChild(rotuloCfg);
    if (blocoCfg) main.appendChild(blocoCfg);
  }

  // ── Perfil enxuto: os números de estudo ficam nas Estatísticas ──
  ['resumo', 'conquistas', 'insights', 'progresso de estudo', 'gráficos de humor'].forEach(function (t) {
    var r = rotuloDe(t); if (!r) return;
    var el = r.nextElementSibling;
    while (el && !el.classList.contains('section-label')) { var prox = el.nextElementSibling; el.style.display = 'none'; el = prox; }
    r.style.display = 'none';
  });
  var stats = document.querySelector('.perfil-stats');
  if (stats) stats.remove();
  var jornada = document.getElementById('perfil-jornada');
  if (jornada) {
    var ver = function () { jornada.innerHTML = '<a href="estatisticas.html" style="color:var(--rose-deep);font-weight:500">Ver suas estatísticas de estudo</a>'; };
    ver(); setTimeout(ver, 300); setTimeout(ver, 900);
  }
});
