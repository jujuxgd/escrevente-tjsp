(function () {
  var P = location.pathname.split('/').pop() || 'index.html';
  var emb = /embed=1/.test(location.search);
  if (emb) document.documentElement.classList.add('embed');

  var I = {
    ini: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    hoje: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    est: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    pra: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16v-3"/><path d="M12 16V8"/><path d="M17 16v-5"/>',
    pec: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    pla: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/>'
  };
  var S = {
    rev: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
    vid: '<polygon points="5 3 19 12 5 21 5 3"/>',
    leg: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    q: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16v-3"/><path d="M12 16V8"/><path d="M17 16v-5"/>',
    banco: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    simf: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
    sim: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 13l2 2 4-4"/>',
    err: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a1 1 0 0 1 3 3l-9 9a2 2 0 0 1-.85.5l-2.9.85a.5.5 0 0 1-.62-.62l.85-2.9a2 2 0 0 1 .5-.85z"/>',
    mat: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    pra: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    fl: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/>'
  };

  var SUB = {
    'estudar.html': [['revisar.html', 'Flashcards', 'rev'], ['revisao.html', 'Biblioteca de revisão', 'leg'], ['materias.html', 'Edital verticalizado', 'mat'], ['caderno-legislativo.html', 'Caderno Legislativo', 'leg'], ['reta-final.html', 'Materiais extras', 'fl']],
    'treino.html': [['rumo40.html', 'Rumo à vaga', 'pra'], ['banco-questoes.html', 'Banco de Questões', 'banco'], ['simulado.html', 'Fazer Simulado', 'simf'], ['erros.html', 'Caderno de Erros', 'err'], ['estatisticas.html', 'Estatísticas', 'q']]
  };
  var FASE = 1;
  var NAV = [
    ['index.html', 'Início', 'ini', ['index.html', '']],
    ['hoje.html', 'Hoje', 'hoje', ['hoje.html', 'dia.html', 'sessao.html']],
    ['calendario.html', 'Calendário', 'cal', ['calendario.html']],
    ['estudar.html', 'Estudar', 'est', ['estudar.html', 'revisar.html', 'revisao.html', 'caderno-legislativo.html', 'reta-final.html', 'materias.html']],
    ['treino.html', 'Treino', 'pra', ['treino.html', 'rumo40.html', 'banco-questoes.html', 'simulado.html', 'erros.html', 'estatisticas.html']]
  ];

  function diasAteProva() {
    var exame = new Date(2027, 2, 14);
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((exame - hoje) / 86400000));
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (emb) { document.body.classList.add('embed'); return; }
    if (P === 'hoje.html') document.body.classList.add('hoje');

    var perfilOn = P === 'perfil.html';

    var links = FASE === 2 ? NAV2.map(function (l) {
      var on = P === 'segunda-fase.html' && ABA === l[3];
      return '<div class="tn-item' + (l[3] === 'guia' ? ' so-pc' : '') + '"><a href="' + l[0] + '"' + (on ? ' class="on" aria-current="page"' : '') +
        '><span class="mi"><svg viewBox="0 0 24 24">' + I[l[2]] + '</svg></span>' + l[1] + '</a></div>';
    }).join('') : NAV.map(function (l) {
      var on = l[3].indexOf(P) > -1;
      var sub = SUB[l[0]];
      var caret = sub ? '<svg class="tn-caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 4l3 3 3-3"/></svg>' : '';
      var subHtml = sub ? '<div class="tn-sub">' + sub.map(function (s) {
        return '<a href="' + s[0] + '"><span class="ic"><svg viewBox="0 0 24 24">' + S[s[2]] + '</svg></span>' + s[1] + '</a>';
      }).join('') + '</div>' : '';
      var attrs = (on ? ' class="on" aria-current="page"' : '') + (sub ? ' aria-expanded="false" aria-haspopup="true"' : '');
      return '<div class="tn-item' + (l[0] === 'index.html' ? ' so-pc' : '') + '"><a href="' + l[0] + '"' + attrs +
        '><span class="mi"><svg viewBox="0 0 24 24">' + I[l[2]] + '</svg></span>' + l[1] + caret + '</a>' + subHtml + '</div>';
    }).join('');

    var d = diasAteProva();
    var bar = document.createElement('header');
    bar.className = 'tn';
    bar.innerHTML =
      '<a class="tn-brand" href="index.html" aria-label="Início">' +
      '<svg class="seal" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 60V30a24 24 0 0 1 48 0v30z" fill="#2E7A5F"/>' +
      '<path d="M18 56V34M27 56V31M37 56V31M46 56V34" stroke="#E9D9B5" stroke-width="3.5" stroke-linecap="round"/><rect x="8" y="56" width="48" height="4" fill="#C9A55A"/></svg>' +
      '<span class="tn-word">Escrevente TJSP</span></a>' +
      '<div class="tn-rule" aria-hidden="true"></div>' +
      '<nav class="tn-links" aria-label="Principal">' + links + '<span class="tn-ink" aria-hidden="true"></span></nav>' +
      '<div class="tn-end">' +
      '<div class="tn-count"><span class="lbl">' + 'Prova em' + '</span><span class="val"><b>' + d + '</b> dias</span></div>' +
      '<button class="tn-icon" type="button" title="Modo escuro" aria-label="Alternar modo escuro" onclick="window.toggleTheme&&toggleTheme()">' +
      '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>' +
      '<a class="tn-av' + (perfilOn ? ' on' : '') + '" href="perfil.html" title="Perfil e estatísticas" aria-label="Perfil e estatísticas">J</a>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);

    // indicador deslizante
    var wrap = bar.querySelector('.tn-links');
    var ink = bar.querySelector('.tn-ink');
    var active = wrap.querySelector('a.on');
    // medir contra a barra: .tn-item é position:relative, então
    // offsetLeft do link sairia relativo ao item, sempre ~0.
    function move(el) {
      if (!el || window.innerWidth <= 900) return;
      var base = wrap.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      ink.style.width = r.width + 'px';
      ink.style.transform = 'translateX(' + (r.left - base.left) + 'px)';
    }
    if (active) {
      move(active);
      requestAnimationFrame(function () { wrap.classList.add('ready'); move(active); });
      // as fontes mudam a largura dos links depois do primeiro desenho
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { move(active); });
      }
      setTimeout(function () { move(active); }, 400);
    }
    wrap.querySelectorAll('.tn-item > a').forEach(function (a) {
      a.addEventListener('mouseenter', function () { move(a); });
      a.addEventListener('focus', function () { move(a); });
    });
    wrap.addEventListener('mouseleave', function () { move(active); });

    // submenus abrem no clique
    function fechaTodos(exceto) {
      wrap.querySelectorAll('.tn-item.open').forEach(function (it) {
        if (it === exceto) return;
        it.classList.remove('open');
        var lk = it.querySelector(':scope > a'); if (lk) lk.setAttribute('aria-expanded', 'false');
      });
    }
    wrap.querySelectorAll('.tn-item').forEach(function (item) {
      if (!item.querySelector('.tn-sub')) return;
      var lk = item.querySelector(':scope > a');
      lk.addEventListener('click', function (ev) {
        if (window.innerWidth <= 900) return;   // no celular vai direto pra página
        ev.preventDefault();
        var abrir = !item.classList.contains('open');
        fechaTodos(item);
        item.classList.toggle('open', abrir);
        lk.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        move(abrir ? lk : active);
      });
    });
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('.tn-item')) { fechaTodos(null); move(active); }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { fechaTodos(null); move(active); }
    });
    window.addEventListener('resize', function () { move(active); });

    var onScroll = function () { bar.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // iPhone com o site instalado: depois do teclado (ou da tela cheia do PDF) a área visível fica
    // deslocada da página e a barra de baixo "flutua" no meio da tela. Desfaz o deslocamento e,
    // se ele persistir, prende a barra na borda de baixo da área visível.
    var vv = window.visualViewport;
    if (vv) {
      var digitando = function () { var a = document.activeElement; return a && a.matches && a.matches('input, textarea, select, [contenteditable="true"]'); };
      var prender = function () {
        var dy = window.innerWidth > 900 || digitando() ? 0 : vv.height + vv.offsetTop - window.innerHeight;
        wrap.style.transform = Math.abs(dy) > 1 ? 'translateY(' + dy + 'px)' : '';
      };
      var corrigir = function () {
        if (!digitando() && vv.offsetTop > 1) window.scrollTo(window.scrollX, window.scrollY);
        prender();
      };
      vv.addEventListener('resize', prender);
      vv.addEventListener('scroll', prender);
      window.addEventListener('scroll', prender, { passive: true });
      document.addEventListener('focusout', function () { setTimeout(corrigir, 350); });
      window.addEventListener('pageshow', corrigir);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) corrigir(); });
    }
  });
})();

// App instalável e offline: manifesto, ícones e service worker em todas as páginas.
(function () {
  var h = document.head;
  function tag(nome, attrs) {
    if (h.querySelector(nome + '[' + Object.keys(attrs)[0] + '="' + attrs[Object.keys(attrs)[0]] + '"]')) return;
    var el = document.createElement(nome);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    h.appendChild(el);
  }
  tag('link', { rel: 'manifest', href: 'manifest.webmanifest' });
  tag('link', { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' });
  tag('meta', { name: 'theme-color', content: '#163F32' });
  tag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  tag('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  tag('meta', { name: 'apple-mobile-web-app-title', content: 'TJSP' });
  tag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
