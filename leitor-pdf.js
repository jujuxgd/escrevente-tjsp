// Leitor de PDF do Drive com grifos e anotações (PDF.js).
// O PDF vem pela API do Drive (chave restrita aos domínios do site, só lê arquivos com link aberto);
// sem acesso, cai para o preview do Drive como antes.
// Grifos em tj_grifos_v1: { "<idArquivo>|<idGrifo>": {p, r:[[x,y,w,h]...] (0–1 da página), c, t, n, u, x?} }
// u = horário da última alteração; x = apagado (fica para a sincronização não ressuscitar o grifo).
(function () {
  var CHAVE = 'AIzaSyAmSnV2qyIAfzqXuYxsGvYIgaKl45TqIoU';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var K = 'tj_grifos_v1';
  var CORES = [
    { id: 'am', nome: 'Amarelo', bg: 'rgba(255,214,10,.42)' },
    { id: 'vd', nome: 'Verde', bg: 'rgba(110,200,120,.38)' },
    { id: 'rs', nome: 'Rosa', bg: 'rgba(240,120,170,.36)' },
    { id: 'az', nome: 'Azul', bg: 'rgba(90,160,240,.34)' }
  ];
  function cor(id) { return (CORES.filter(function (c) { return c.id === id; })[0] || CORES[0]).bg; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function ler() { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } }
  function gravar(t) {
    try {
      localStorage.setItem(K, JSON.stringify(t));
      localStorage.setItem('tj_local_rev', String(Date.now()));
      if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) window._syncOAB.notificarAlteracaoLocal(K);
    } catch (e) {}
  }
  function grifosDe(arq) {
    var t = ler(), out = [];
    Object.keys(t).forEach(function (k) {
      var i = k.indexOf('|');
      if (k.slice(0, i) === arq && !t[k].x) out.push(Object.assign({ id: k.slice(i + 1) }, t[k]));
    });
    return out.sort(function (a, b) { return a.p - b.p || (a.r[0][1] - b.r[0][1]); });
  }
  function salvarGrifo(arq, g) {
    var t = ler(), k = arq + '|' + g.id, o = Object.assign({}, g); delete o.id; o.u = Date.now();
    t[k] = o; gravar(t);
  }
  function apagarGrifo(arq, id) {
    var t = ler(), k = arq + '|' + id;
    if (t[k]) { t[k] = { x: 1, u: Date.now(), p: t[k].p, r: [], c: t[k].c }; gravar(t); }
  }

  var _lib = null;
  function carregarLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (_lib) return _lib;
    _lib = new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
      s.onerror = erro;
      document.head.appendChild(s);
    });
    return _lib;
  }
  var _cache = {};
  // PDFs baixados ficam guardados no navegador (Cache Storage): abrir de novo não gasta internet.
  function baixar(arq) {
    if (_cache[arq]) return _cache[arq];
    var chave = location.origin + '/__pdf/' + arq, cx = null;
    var abrir = window.caches ? caches.open('tj-pdfs-v1').then(function (c) { cx = c; return c.match(chave); }).catch(function () { return null; }) : Promise.resolve(null);
    _cache[arq] = abrir.then(function (r) {
      if (r) return r.arrayBuffer();
      return fetch('https://www.googleapis.com/drive/v3/files/' + arq + '?alt=media&key=' + CHAVE).then(function (r2) {
        if (!r2.ok) throw new Error('drive ' + r2.status);
        if (cx) cx.put(chave, r2.clone()).catch(function () {});
        return r2.arrayBuffer();
      });
    }).catch(function (e) { delete _cache[arq]; throw e; });
    return _cache[arq];
  }

  // Sem resposta em 90 s, cai no preview do Drive em vez de ficar carregando para sempre.
  function comPrazo(p, ms) {
    return Promise.race([p, new Promise(function (ok, erro) { setTimeout(function () { erro(new Error('tempo esgotado')); }, ms); })]);
  }

  // ── barra de cores que aparece sobre a seleção ──
  var barra = null, pendente = null;
  function montarBarra() {
    if (barra) return barra;
    barra = document.createElement('div');
    barra.className = 'lp-barra';
    barra.innerHTML = CORES.map(function (c) { return '<button type="button" data-cor="' + c.id + '" title="' + c.nome + '" style="background:' + c.bg + '"></button>'; }).join('') +
      '<span class="lp-sep"></span><button type="button" data-nota="1" class="lp-bnota" title="Grifar e anotar">✎</button>';
    barra.addEventListener('mousedown', function (e) { e.preventDefault(); });
    barra.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !pendente) return;
      var p = pendente; pendente = null; esconderBarra();
      var g = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), p: p.p, r: p.r, c: b.dataset.cor || 'am', t: p.t, n: '' };
      salvarGrifo(p.arq, g);
      var sel = window.getSelection(); if (sel) sel.removeAllRanges();
      p.viewer.redesenhar();
      if (b.dataset.nota) p.viewer.abrirNota(g.id);
    });
    document.body.appendChild(barra);
    return barra;
  }
  function esconderBarra() { if (barra) barra.classList.remove('on'); }
  function mostrarBarra(x, y) {
    montarBarra();
    barra.style.left = Math.max(8, Math.min(x - 90, window.innerWidth - 190)) + 'px';
    barra.style.top = Math.max(8, y - 48) + 'px';
    barra.classList.add('on');
  }

  var VIEWERS = [];
  function verificarSelecao() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { if (!(barra && barra.matches(':hover'))) { pendente = null; esconderBarra(); } return; }
    var range = sel.getRangeAt(0), no = range.commonAncestorContainer;
    var el = no.nodeType === 1 ? no : no.parentElement;
    var pag = el && el.closest('.lp-pag');
    var texto = sel.toString().replace(/\s+/g, ' ').trim();
    if (!pag || texto.length < 2) { pendente = null; esconderBarra(); return; }
    var v = VIEWERS.filter(function (x) { return x.raiz.contains(pag); })[0]; if (!v) return;
    var caixa = pag.getBoundingClientRect(), rs = [];
    Array.prototype.forEach.call(range.getClientRects(), function (q) {
      if (q.width < 2 || q.height < 2) return;
      var x = Math.max(q.left, caixa.left), y = Math.max(q.top, caixa.top);
      var x2 = Math.min(q.right, caixa.right), y2 = Math.min(q.bottom, caixa.bottom);
      if (x2 - x < 2 || y2 - y < 2) return;
      rs.push([(x - caixa.left) / caixa.width, (y - caixa.top) / caixa.height, (x2 - x) / caixa.width, (y2 - y) / caixa.height].map(function (n) { return Math.round(n * 10000) / 10000; }));
    });
    if (!rs.length) return;
    pendente = { arq: v.arq, p: +pag.dataset.p, r: rs, t: texto.slice(0, 300), viewer: v };
    var ult = range.getBoundingClientRect();
    mostrarBarra(ult.left + ult.width / 2, ult.top);
  }
  var _t = null;
  document.addEventListener('selectionchange', function () { clearTimeout(_t); _t = setTimeout(verificarSelecao, 250); });
  document.addEventListener('scroll', function () { if (pendente) { var s = window.getSelection(); if (s && s.rangeCount) { var r = s.getRangeAt(0).getBoundingClientRect(); mostrarBarra(r.left + r.width / 2, r.top); } } }, true);

  // ── um leitor por PDF ──
  function Leitor(raiz, arq, opts) {
    this.raiz = raiz; this.arq = arq; this.opts = opts || {}; this.paginas = []; this.area = false;
    VIEWERS.push(this);
  }
  Leitor.prototype.meus = function () {
    var de = this.opts.de || 1, ate = this.opts.ate || 1e9;
    return grifosDe(this.arq).filter(function (g) { return g.p >= de && g.p <= ate; });
  };
  Leitor.prototype.iniciar = function () {
    var self = this, raiz = this.raiz;
    raiz.classList.add('lp');
    raiz.innerHTML = '<div class="lp-topo"><span class="lp-info">Carregando o PDF…</span>' +
      '<span class="lp-acoes"><button type="button" class="lp-b" data-a="area" title="Para páginas escaneadas: arraste um retângulo para grifar">▭ Grifar área</button>' +
      '<button type="button" class="lp-b" data-a="lista" title="Mostrar ou esconder a lista de grifos">✎ Grifos <b class="lp-ng">0</b></button>' +
      '<button type="button" class="lp-b" data-a="zoom-" aria-label="Diminuir">−</button><span class="lp-zoom"></span><button type="button" class="lp-b" data-a="zoom+" aria-label="Aumentar">+</button>' +
      '<button type="button" class="lp-b" data-a="cheia">⛶ Tela cheia</button>' +
      '<a class="lp-b" href="https://drive.google.com/file/d/' + this.arq + '/view" target="_blank" rel="noopener">Drive ↗</a></span></div>' +
      '<div class="lp-corpo"><div class="lp-paginas"></div><aside class="lp-lista"></aside></div>';
    if (this.opts.caixa) { raiz.classList.add('lp-caixa'); this.opts.rolagem = raiz.querySelector('.lp-corpo'); }
    var zoomSalvo = parseFloat(localStorage.getItem('tj_lp_zoom3'));
    this.zoom = zoomSalvo >= 0.6 && zoomSalvo <= 3 ? zoomSalvo : 1;
    function mostrarZoom() { raiz.querySelector('.lp-zoom').textContent = Math.round(self.zoom * 100) + '%'; }
    function mudarZoom(z) {
      self.zoom = Math.round(Math.min(3, Math.max(0.6, z)) * 100) / 100;
      try { localStorage.setItem('tj_lp_zoom3', String(self.zoom)); } catch (e) {}
      mostrarZoom(); self.renderizar();
    }
    mostrarZoom();
    raiz.querySelector('.lp-topo').addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'area') { self.area = !self.area; b.classList.toggle('on', self.area); raiz.classList.toggle('modo-area', self.area); }
      if (b.dataset.a === 'cheia') self.telaCheia(!raiz.classList.contains('lp-cheia'));
      if (b.dataset.a === 'lista') { b.classList.toggle('on', raiz.classList.toggle('lp-com-lista')); if (Math.abs(self._largura - self.largura()) > 40) self.renderizar(); }
      if (b.dataset.a === 'zoom+') mudarZoom(self.zoom + 0.25);
      if (b.dataset.a === 'zoom-') mudarZoom(self.zoom - 0.25);
    });
    this.lista();
    return comPrazo(Promise.all([carregarLib(), baixar(this.arq)]).then(function (r) {
      return r[0].getDocument({ data: new Uint8Array(r[1].slice(0)) }).promise;
    }), 90000).then(function (doc) {
      self.doc = doc;
      self.de = Math.max(1, self.opts.de || 1); self.ate = Math.min(doc.numPages, self.opts.ate || doc.numPages);
      raiz.querySelector('.lp-info').textContent = (self.opts.de ? 'Páginas ' + self.de + '–' + self.ate + ' de ' + doc.numPages : doc.numPages + (doc.numPages === 1 ? ' página' : ' páginas')) + ' · selecione um trecho para grifar';
      return self.medirMargem().then(function () { return self.renderizar(); }).then(function () { self.voltarPosicao(); });
    }).then(function () {
      var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (Math.abs(self._largura - self.largura()) > 40) self.renderizar(); }, 300); });
    }).catch(function (e) {
      console.warn('Leitor PDF: usando o preview do Drive', e);
      raiz.classList.remove('lp');
      raiz.innerHTML = '<p class="ss-vazio" style="margin:0 0 .5rem">Não deu para abrir o leitor com grifos agora — mostrando o PDF pelo Drive.</p>' +
        '<iframe class="vde-pdf" src="https://drive.google.com/file/d/' + self.arq + '/preview" allow="autoplay"></iframe>';
    });
  };
  // margem branca dos lados (pelo texto das primeiras páginas): cortada para a página ganhar largura
  Leitor.prototype.medirMargem = function () {
    var self = this, doc = this.doc, ns = [];
    this.corte = 0;
    for (var i = this.de; i <= Math.min(this.ate, this.de + 2); i++) ns.push(i);
    return Promise.all(ns.map(function (n) {
      return doc.getPage(n).then(function (pg) {
        if (pg.rotate % 180) return null;
        var vb = pg.view, w = vb[2] - vb[0];
        return pg.getTextContent().then(function (tc) {
          var esq = w, dir = w;
          tc.items.forEach(function (it) {
            if (!it.str || !it.str.trim() || it.transform[1] || it.transform[2]) return;
            var x = it.transform[4] - vb[0];
            esq = Math.min(esq, x); dir = Math.min(dir, w - x - it.width);
          });
          return esq < w ? Math.max(0, Math.min(esq, dir) - 14) / w : null;
        });
      });
    })).then(function (rs) {
      rs = rs.filter(function (r) { return r !== null; });
      if (rs.length) self.corte = Math.min(0.12, Math.min.apply(null, rs));
    }).catch(function () { self.corte = 0; });
  };
  Leitor.prototype.paginaAtual = function () {
    var topo = this.opts.rolagem ? this.opts.rolagem.getBoundingClientRect().top : 0, atual = this.de || 1;
    this.paginas.forEach(function (info, n) { if (info && info.el.getBoundingClientRect().top <= topo + 80) atual = n; });
    return atual;
  };
  Leitor.prototype.telaCheia = function (on) {
    var self = this, raiz = this.raiz, corpo = raiz.querySelector('.lp-corpo'), n = this.paginaAtual();
    if (on) { this._rolagemAntes = this.opts.rolagem; this.opts.rolagem = corpo; } else this.opts.rolagem = this._rolagemAntes;
    raiz.classList.toggle('lp-cheia', on);
    document.documentElement.classList.toggle('lp-travada', on);
    raiz.querySelector('[data-a="cheia"]').textContent = on ? '✕ Fechar' : '⛶ Tela cheia';
    if (on && !this._esc) {
      this._esc = function (e) { if (e.key === 'Escape' && raiz.classList.contains('lp-cheia')) self.telaCheia(false); };
      document.addEventListener('keydown', this._esc);
    }
    var r = this.renderizar();
    if (r) r.then(function () {
      var info = self.paginas[n]; if (!info) return;
      if (self.opts.rolagem) self.opts.rolagem.scrollTop += info.el.getBoundingClientRect().top - self.opts.rolagem.getBoundingClientRect().top - 8;
      else if (!on) window.scrollTo(0, info.el.getBoundingClientRect().top + window.scrollY - 90);
    });
  };
  // Página em que o PDF estava (por arquivo e trecho, só neste aparelho): ao trocar de aba no Hoje o leitor é montado
  // de novo e voltava para a primeira página.
  var K_POS = 'tj_lp_pos';
  Leitor.prototype.chavePos = function () { return this.arq + ':' + (this.opts.de || 1); };
  Leitor.prototype.voltarPosicao = function () {
    var self = this, rol = this.opts.rolagem, pos = {};
    try { pos = JSON.parse(localStorage.getItem(K_POS)) || {}; } catch (e) {}
    var info = this.paginas[pos[this.chavePos()]];
    if (info && pos[this.chavePos()] > this.de) {
      if (rol) rol.scrollTop += info.el.getBoundingClientRect().top - rol.getBoundingClientRect().top - 8;
      else window.scrollTo(0, info.el.getBoundingClientRect().top + window.scrollY - 90);
    }
    var t;
    function guardar() {
      clearTimeout(t);
      t = setTimeout(function () {
        if (!self.raiz.isConnected) return;
        try { pos = JSON.parse(localStorage.getItem(K_POS)) || {}; } catch (e) { pos = {}; }
        pos[self.chavePos()] = self.paginaAtual();
        try { localStorage.setItem(K_POS, JSON.stringify(pos)); } catch (e) {}
      }, 400);
    }
    this.raiz.querySelector('.lp-corpo').addEventListener('scroll', guardar, { passive: true });
    window.addEventListener('scroll', guardar, { passive: true });
  };
  Leitor.prototype.largura = function () { return this.raiz.querySelector('.lp-paginas').clientWidth - 2; };
  Leitor.prototype.renderizar = function () {
    var self = this, doc = this.doc, alvo = this.raiz.querySelector('.lp-paginas');
    if (!doc) return;
    this._largura = this.largura();
    alvo.innerHTML = '';
    this.paginas = [];
    // vários cliques seguidos no zoom: só a última renderização vale
    var vez = this._vez = (this._vez || 0) + 1;
    if (this._obs) this._obs.disconnect();
    var obs = this._obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { obs.unobserve(e.target); self.desenharPagina(+e.target.dataset.p); } });
    }, { root: this.opts.rolagem || null, rootMargin: '600px 0px' });
    var feitas = [], de = this.de || 1, ate = this.ate || doc.numPages;
    for (var i = de; i <= ate; i++) feitas.push(doc.getPage(i));
    return Promise.all(feitas).then(function (pgs) {
      if (vez !== self._vez) return;
      pgs.forEach(function (pg, j) {
        var i = j + de - 1;
        var base = pg.getViewport({ scale: 1 });
        var corte = self.corte || 0;
        var escala = Math.min(self._largura, 1000) / (base.width * (1 - 2 * corte)) * self.zoom;
        var vp = pg.getViewport({ scale: escala });
        var mold = document.createElement('div');
        mold.className = 'lp-moldura';
        mold.style.width = Math.floor(vp.width * (1 - 2 * corte)) + 'px';
        var d = document.createElement('div');
        d.className = 'lp-pag'; d.dataset.p = i + 1;
        d.style.width = Math.floor(vp.width) + 'px'; d.style.height = Math.floor(vp.height) + 'px';
        d.style.marginLeft = -Math.floor(vp.width * corte) + 'px';
        d.style.setProperty('--scale-factor', escala);
        d.innerHTML = '<canvas></canvas><div class="lp-grifos"></div><div class="textLayer"></div>';
        mold.innerHTML = '<span class="lp-num">' + (i + 1) + '</span>';
        mold.insertBefore(d, mold.firstChild);
        alvo.appendChild(mold);
        self.paginas[i + 1] = { pg: pg, vp: vp, el: d };
        self.ligarArea(d);
        obs.observe(d);
      });
      self.redesenhar();
    });
  };
  Leitor.prototype.desenharPagina = function (n) {
    var info = this.paginas[n]; if (!info || info.feita) return;
    info.feita = true;
    var dpr = Math.min(window.devicePixelRatio || 1, 3), c = info.el.querySelector('canvas');
    c.width = Math.floor(info.vp.width * dpr); c.height = Math.floor(info.vp.height * dpr);
    c.style.width = Math.floor(info.vp.width) + 'px'; c.style.height = Math.floor(info.vp.height) + 'px';
    info.pg.render({ canvasContext: c.getContext('2d'), viewport: info.vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
    var tl = info.el.querySelector('.textLayer');
    info.pg.getTextContent().then(function (tc) {
      window.pdfjsLib.renderTextLayer({ textContentSource: tc, container: tl, viewport: info.vp, textDivs: [] });
    });
  };
  Leitor.prototype.redesenhar = function () {
    var self = this, gs = this.meus();
    this.paginas.forEach(function (info, n) {
      if (!info) return;
      info.el.querySelector('.lp-grifos').innerHTML = gs.filter(function (g) { return g.p === n; }).map(function (g) {
        return g.r.map(function (q, i) {
          return '<div class="lp-g' + (g.n ? ' tem-nota' : '') + '" data-g="' + g.id + '" style="left:' + q[0] * 100 + '%;top:' + q[1] * 100 + '%;width:' + q[2] * 100 + '%;height:' + q[3] * 100 + '%;background:' + cor(g.c) + '">' +
            (i === 0 && g.n ? '<span class="lp-gn">✎</span>' : '') + '</div>';
        }).join('');
      }).join('');
    });
    this.lista();
  };
  Leitor.prototype.lista = function () {
    var gs = this.meus(), el = this.raiz.querySelector('.lp-lista'); if (!el) return;
    var ng = this.raiz.querySelector('.lp-ng'); if (ng) ng.textContent = gs.length;
    el.innerHTML = '<div class="lp-lt">Meus grifos <b>' + gs.length + '</b></div>' + (gs.length ? gs.map(function (g) {
      return '<button type="button" class="lp-it" data-ir="' + g.id + '"><span class="lp-cor" style="background:' + cor(g.c) + '"></span>' +
        '<span><small>p. ' + g.p + '</small>' + esc(g.t || 'Área grifada') + (g.n ? '<em>' + esc(g.n) + '</em>' : '') + '</span></button>';
    }).join('') : '<p class="lp-vazio">Selecione um trecho do PDF e escolha a cor. ✎ grifa e já abre a anotação.</p>');
  };
  Leitor.prototype.irPara = function (id) {
    var g = grifosDe(this.arq).filter(function (x) { return x.id === id; })[0]; if (!g) return;
    var info = this.paginas[g.p]; if (!info) return;
    var cx = this.opts.rolagem;
    if (cx) {
      var y2 = info.el.getBoundingClientRect().top - cx.getBoundingClientRect().top + cx.scrollTop + g.r[0][1] * info.el.offsetHeight - 80;
      cx.scrollTo({ top: y2, behavior: 'smooth' });
    } else {
      var y = info.el.getBoundingClientRect().top + window.scrollY + g.r[0][1] * info.el.offsetHeight - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    var el = info.el.querySelector('[data-g="' + id + '"]');
    if (el) { el.classList.add('pisca'); setTimeout(function () { el.classList.remove('pisca'); }, 1400); }
  };
  Leitor.prototype.abrirNota = function (id) {
    var self = this, g = grifosDe(this.arq).filter(function (x) { return x.id === id; })[0]; if (!g) return;
    var info = this.paginas[g.p]; if (!info) return;
    var velho = document.querySelector('.lp-pop'); if (velho) velho.remove();
    var pop = document.createElement('div');
    pop.className = 'lp-pop';
    pop.innerHTML = '<div class="lp-pop-cores">' + CORES.map(function (c) { return '<button type="button" data-cor="' + c.id + '" class="' + (c.id === g.c ? 'on' : '') + '" style="background:' + c.bg + '" title="' + c.nome + '"></button>'; }).join('') +
      '<button type="button" class="lp-apagar" title="Apagar grifo">Apagar</button></div>' +
      (g.t ? '<blockquote>' + esc(g.t) + '</blockquote>' : '') +
      '<textarea placeholder="Sua anotação (ex.: cai muito, reler o art. 7º)">' + esc(g.n || '') + '</textarea>' +
      '<div class="lp-pop-acoes"><button type="button" class="btn" data-fechar="1">Fechar</button><button type="button" class="btn btn-primary" data-salvar="1">Salvar</button></div>';
    info.el.appendChild(pop);
    var q = g.r[g.r.length - 1];
    pop.style.top = Math.min((q[1] + q[3]) * info.el.offsetHeight + 6, info.el.offsetHeight - 10) + 'px';
    pop.style.left = Math.max(4, Math.min(q[0] * info.el.offsetWidth, info.el.offsetWidth - 290)) + 'px';
    var ta = pop.querySelector('textarea'); ta.focus();
    pop.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    pop.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cor) { g.c = b.dataset.cor; pop.querySelectorAll('[data-cor]').forEach(function (x) { x.classList.toggle('on', x === b); }); salvarGrifo(self.arq, Object.assign({}, g, { n: ta.value.trim() })); self.redesenhar(); return; }
      if (b.classList.contains('lp-apagar')) { apagarGrifo(self.arq, g.id); pop.remove(); self.redesenhar(); return; }
      if (b.dataset.salvar) { g.n = ta.value.trim(); salvarGrifo(self.arq, g); }
      pop.remove(); self.redesenhar();
    });
  };
  // Grifar área: arrastar um retângulo (páginas escaneadas, tabelas, esquemas)
  Leitor.prototype.ligarArea = function (pag) {
    var self = this, ini = null, caixa = null;
    function pos(e) { var t = e.touches ? e.touches[0] : e, r = pag.getBoundingClientRect(); return [(t.clientX - r.left) / r.width, (t.clientY - r.top) / r.height]; }
    function comeca(e) {
      if (!self.area) return;
      e.preventDefault(); ini = pos(e);
      caixa = document.createElement('div'); caixa.className = 'lp-g lp-arrasto'; pag.querySelector('.lp-grifos').appendChild(caixa);
    }
    function move(e) {
      if (!ini) return; e.preventDefault();
      var p = pos(e), x = Math.min(ini[0], p[0]), y = Math.min(ini[1], p[1]);
      caixa.style.cssText = 'left:' + x * 100 + '%;top:' + y * 100 + '%;width:' + Math.abs(p[0] - ini[0]) * 100 + '%;height:' + Math.abs(p[1] - ini[1]) * 100 + '%;background:' + cor('am');
    }
    function fim(e) {
      if (!ini) return;
      var p = e.changedTouches ? (function () { var t = e.changedTouches[0], r = pag.getBoundingClientRect(); return [(t.clientX - r.left) / r.width, (t.clientY - r.top) / r.height]; })() : pos(e);
      var q = [Math.min(ini[0], p[0]), Math.min(ini[1], p[1]), Math.abs(p[0] - ini[0]), Math.abs(p[1] - ini[1])];
      ini = null; caixa.remove();
      if (q[2] < 0.02 || q[3] < 0.008) return;
      var g = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), p: +pag.dataset.p, r: [q.map(function (n) { return Math.round(n * 10000) / 10000; })], c: 'am', t: '', n: '' };
      salvarGrifo(self.arq, g); self.redesenhar(); self.abrirNota(g.id);
    }
    pag.addEventListener('mousedown', comeca); pag.addEventListener('touchstart', comeca, { passive: false });
    pag.addEventListener('mousemove', move); pag.addEventListener('touchmove', move, { passive: false });
    pag.addEventListener('mouseup', fim); pag.addEventListener('touchend', fim);
  };

  // clique num grifo (a camada de grifos fica sob o texto; acha pelo ponto clicado)
  document.addEventListener('click', function (e) {
    var it = e.target.closest('.lp-it');
    if (it) { var v0 = VIEWERS.filter(function (x) { return x.raiz.contains(it); })[0]; if (v0) { v0.irPara(it.dataset.ir); v0.abrirNota(it.dataset.ir); } return; }
    var pag = e.target.closest('.lp-pag'); if (!pag || e.target.closest('.lp-pop')) return;
    var s = window.getSelection(); if (s && !s.isCollapsed) return;
    var v = VIEWERS.filter(function (x) { return x.raiz.contains(pag); })[0]; if (!v || v.area) return;
    var r = pag.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    var achou = grifosDe(v.arq).filter(function (g) {
      return g.p === +pag.dataset.p && g.r.some(function (q) { return x >= q[0] && x <= q[0] + q[2] && y >= q[1] && y <= q[1] + q[3]; });
    })[0];
    if (achou) v.abrirNota(achou.id);
    else { var pop = document.querySelector('.lp-pop'); if (pop) pop.remove(); }
  });

  window.LEITOR = {
    montar: function (el, arq, opts) { var v = new Leitor(el, arq, opts); v.iniciar(); return v; },
    grifosDe: grifosDe, CORES: CORES,
    listarPasta: function (pasta) {
      var q = encodeURIComponent("'" + pasta + "' in parents and trashed=false and mimeType='application/pdf'");
      return fetch('https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name)&pageSize=1000&key=' + CHAVE)
        .then(function (r) { if (!r.ok) throw new Error('drive ' + r.status); return r.json(); })
        .then(function (j) { return j.files || []; });
    }
  };
})();
