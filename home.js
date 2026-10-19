// Início — recompõe o painel sem recriar nós (o JS da página
// continua preenchendo os mesmos ids).
document.addEventListener('DOMContentLoaded', function () {
  var main = document.querySelector('main');
  if (!main || !document.querySelector('.today-card')) return;
  document.body.classList.add('home');

  var INICIO = new Date(2026, 9, 20);
  var PROVA = new Date(2027, 2, 14);
  var CAL = window.CAL_ATIVO, S = window.SESSAO;

  // ── a citação sai do hero e vira uma linha sob a saudação ──
  var quote = document.getElementById('hero-quote');
  var titulo = document.querySelector('.topbar .page-title');
  if (quote && titulo) { quote.classList.add('home-quote'); titulo.appendChild(quote); }

  // ── linha do tempo até a prova ──
  var hoje = typeof getCurrentDate === 'function' ? getCurrentDate() : new Date(); hoje.setHours(0, 0, 0, 0);
  var total = PROVA - INICIO;
  var pct = Math.max(0, Math.min(100, ((hoje - INICIO) / total) * 100));
  var dias = Math.max(0, Math.round((PROVA - hoje) / 86400000));
  var diaEstudo = S ? S.indice() + 1 : 1;
  var totalDias = CAL ? CAL.dias.length : 91;
  var revPct = ((new Date(2027, 2, 1) - INICIO) / total) * 100;

  var tl = document.createElement('section');
  tl.className = 'tl';
  tl.innerHTML =
    '<div class="tl-head">' +
    '<div class="tl-now">Dia <b>' + Math.max(1, diaEstudo) + '</b> de ' + totalDias + '</div>' +
    '<div class="tl-left">' + dias + ' dias para a prova</div>' +
    '</div>' +
    '<div class="tl-track"><span class="tl-tick" style="left:' + revPct + '%"></span><span class="tl-fill"></span><span class="tl-dot"></span></div>' +
    '<div class="tl-marks"><span>20 out · início</span><span>14 mar · prova TJSP</span></div>';
  var topbar = main.querySelector('.topbar');
  (topbar && topbar.parentNode === main) ? main.insertBefore(tl, topbar.nextSibling)
    : main.insertBefore(tl, main.firstChild);
  requestAnimationFrame(function () {
    tl.querySelector('.tl-fill').style.width = pct + '%';
    tl.querySelector('.tl-dot').style.left = pct + '%';
  });

  // ── bloco de hoje: envolve o lado esquerdo e põe o anel à direita ──
  var card = document.querySelector('.today-card');
  var left = document.createElement('div');
  left.className = 'today-left';
  while (card.firstChild) left.appendChild(card.firstChild);
  card.appendChild(left);

  // as duas caixas vazias (questões/acerto) já aparecem no card Questões
  ['stat-questoes', 'stat-acertos'].forEach(function (id) {
    var n = document.getElementById(id);
    if (n && n.closest('.today-stat')) n.closest('.today-stat').remove();
  });

  var R = 54, C = 2 * Math.PI * R;
  var ring = document.createElement('div');
  ring.className = 'home-ring';
  ring.innerHTML =
    '<div class="home-ring-fig"><svg viewBox="0 0 130 130" aria-hidden="true">' +
    '<circle class="home-ring-bg" cx="65" cy="65" r="' + R + '"/>' +
    '<circle class="home-ring-fg" id="home-arc" cx="65" cy="65" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/>' +
    '</svg><div class="home-ring-c"><b id="home-pct">0%</b></div></div>' +
    '<div class="home-ring-t" id="home-ring-t">0 de ' + totalDias + ' dias</div>';
  card.appendChild(ring);

  // o anel segue os textos que o progresso.js já preenche
  var fonteP = document.getElementById('progress-pct-text');
  var fonteD = document.getElementById('progress-days-text');
  function syncRing() {
    var p = parseFloat((fonteP && fonteP.textContent || '0').replace('%', '').replace(',', '.')) || 0;
    document.getElementById('home-pct').textContent = Math.round(p) + '%';
    document.getElementById('home-arc').style.strokeDashoffset = C * (1 - p / 100);
    if (fonteD) document.getElementById('home-ring-t').textContent = fonteD.textContent.replace(' concluídos', '');
  }
  if (fonteP) {
    new MutationObserver(syncRing).observe(fonteP.parentNode, { subtree: true, childList: true, characterData: true });
  }
  setTimeout(syncRing, 120);
  setTimeout(syncRing, 600);

  // ── progresso: um painel só, três colunas divididas por fio ──
  var mat = document.querySelector('.progress-row .span-5');
  var mapa = document.querySelector('.progress-row .span-4');
  var concl = document.querySelector('.progress-row .span-3');
  var questoes = document.getElementById('questoes-summary');
  var row = document.querySelector('.progress-row');

  if (mat && mapa && questoes && row) {
    var painel = document.createElement('section');
    painel.className = 'prog-panel';

    function coluna(classe, fontes) {
      var col = document.createElement('div');
      col.className = 'prog-col ' + classe;
      fontes.forEach(function (f) {
        if (!f) return;
        while (f.firstChild) col.appendChild(f.firstChild);
        f.remove();
      });
      painel.appendChild(col);
      return col;
    }
    coluna('prog-mat', [mat]);
    // o segundo título repetia "Dias concluídos" — fica só o fio separando
    if (concl) {
      var h = concl.querySelector('h4'); if (h) h.remove();
      var sub = document.createElement('div');
      sub.className = 'prog-sub';
      while (concl.firstChild) sub.appendChild(concl.firstChild);
      concl.appendChild(sub);
    }
    var cConst = coluna('prog-const', [mapa, concl]);
    coluna('prog-q', [questoes]);

    // legenda do mapa
    var heat = cConst.querySelector('#heatmap-container');
    if (heat) {
      var leg = document.createElement('div');
      leg.className = 'heat-leg';
      leg.innerHTML = '<span>menos</span><i></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>mais</span>';
      heat.insertAdjacentElement('afterend', leg);
    }

    row.insertAdjacentElement('afterend', painel);
    row.remove();
  }

  // ── humor: faixa fina no fim ──
  var humor = document.querySelector('.mood-widget');
  if (humor) {
    humor.classList.add('mood-strip');
    main.appendChild(humor);
    var col = document.querySelector('.side-cards-col');
    if (col) col.remove();
  }
});
