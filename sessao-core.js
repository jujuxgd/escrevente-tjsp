// Sessão do dia da revisão ativa: flashcards no próprio cartão, questões por tópico,
// checklist do dia, calendário até a prova e painel de erros.
// Usado por: hoje.html, revisar.html, calendario.html, painel-erros.html
(function () {
  var K_RESP = 'tj_bq_respostas', K_DIA = 'tj_ativo_dia', K_CHECK = 'tj_ativo_check_v1';
  var DIAS_SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var GABARITACO = {};
  // nome da matéria em revisao-biblioteca.js
  var NOME_REV = {
    'Língua Portuguesa': 'Português', 'Direito Constitucional': 'Constitucional', 'Direito Processual Civil': 'Processo Civil',
    'Direito Penal': 'Penal', 'Direito Processual Penal': 'Processo Penal', 'Direito Administrativo': 'Administrativo',
    'Normas da Corregedoria': 'Normas da Corregedoria', 'Estatuto da Pessoa com Deficiência': 'Estatuto PcD'
  };
  // matéria de reforço nos dias de revisão: Português é eliminatório e o bloco com mais peso fora do Direito
  var ETICA = 'Língua Portuguesa';
  var TIPO = {
    estudo: 'Conteúdo do dia', simulado: 'Simulado completo', revisao: 'Revisão',
    leve: 'Dia leve', vespera: 'Véspera · só flashcards leves', prova: 'Dia da prova'
  };

  var CAL = window.CAL_ATIVO;
  var HOJE = ATIVO.hoje();
  var DATA = new URLSearchParams(location.search).get('data') || HOJE;
  if (CAL && DATA < CAL.dias[0].d) DATA = CAL.dias[0].d;
  if (CAL && DATA > CAL.dias[CAL.dias.length - 1].d) DATA = CAL.dias[CAL.dias.length - 1].d;
  var DIA = ATIVO.diaDoCalendario(DATA);

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ler(k, p) { try { return JSON.parse(localStorage.getItem(k)) || p; } catch (e) { return p; } }
  function gravar(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      localStorage.setItem('tj_local_rev', String(Date.now()));
      if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) window._syncOAB.notificarAlteracaoLocal(k);
    } catch (e) {}
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function curto(d) { return (CAL && CAL.curto && CAL.curto[d]) || String(d).replace(/^Direito (do |Processual )?/, ''); }
  function partes(iso) { var p = iso.split('-').map(Number); return { a: p[0], m: p[1], d: p[2], dt: new Date(p[0], p[1] - 1, p[2]) }; }
  function dataLonga(iso) { var p = partes(iso); return DIAS_SEM[p.dt.getDay()] + ', ' + p.d + ' ' + MESES[p.m - 1]; }
  function drive(id) { return 'https://drive.google.com/file/d/' + id + '/preview'; }
  var MATERIAL_REV = { 1: 'Tabelas NEAF', 2: 'Bizus', 3: 'Apostila NEAF' };
  function linkRevisao(disc, r) {
    var a = NOME_REV[disc];
    var item = (window.BIBLIOTECA_REVISAO || []).filter(function (x) { return x.g === 'rev' && x.a === a && String(x.b) === String(r); })[0];
    return item ? drive(item.id) : null;
  }
  function linkTopico(t) {
    if (t.k && GABARITACO[t.d]) return { href: drive(GABARITACO[t.d]), txt: 'Gabaritaço · DICAS ' + t.k[0] + '–' + t.k[1] };
    var r = t.rev && linkRevisao(t.d, t.rev);
    return r ? { href: r, txt: MATERIAL_REV[t.rev] || 'Revisão ' + t.rev } : null;
  }
  function banco() { return window.BANCO_QUESTOES || []; }
  var _QPOR = null;
  function qpor(id) {
    if (!_QPOR) { _QPOR = {}; banco().forEach(function (q) { _QPOR[q.id] = q; }); }
    return _QPOR[id];
  }
  function nomeExame(n) {
    var q = banco().filter(function (x) { return x.exam_number === n; })[0];
    return q ? q.exam : 'Prova ' + n;
  }
  var _banco = null;
  function carregarBanco() {
    if (banco().length) return Promise.resolve();
    if (!_banco) _banco = new Promise(function (ok) {
      var s = document.createElement('script');
      s.src = 'questoes-banco.js'; s.onload = ok; s.onerror = ok;
      document.head.appendChild(s);
    }).then(function () { _QPOR = null; });
    return _banco;
  }

  // ── posição no calendário ──
  function indice(d) { return CAL ? CAL.dias.map(function (x) { return x.d; }).indexOf(d || DATA) : -1; }
  function vizinho(passo) { var i = indice(); return CAL && CAL.dias[i + passo] ? CAL.dias[i + passo].d : null; }
  function resumoDoDia(x) {
    x = x || DIA; if (!x) return '';
    if (x.top) return x.top.map(function (t) { return curto(t.d) + ' (' + t.s + ')'; }).join(' e ');
    if (x.tipo === 'simulado') return 'Simulado completo' + (x.sim.exame ? ' · ' + nomeExame(x.sim.exame) : '');
    if (x.tipo === 'revisao') return (x.extra ? 'Revisão extra (você adiantou): ' : 'Revisão com foco em ') + x.foco.map(curto).join(' e ') + (x.extra ? '' : ' + Português');
    if (x.tipo === 'leve') return 'Flashcards vencidos e 10 questões de Português';
    if (x.tipo === 'vespera') return 'Só flashcards leves. Nada novo.';
    return 'Prova objetiva e redação · TJSP';
  }
  function disciplinasDoDia(x) {
    x = x || DIA; if (!x) return [];
    return x.top ? uniq(x.top.map(function (t) { return t.d; })) : x.foco ? x.foco.concat([ETICA]) : [];
  }

  // ── fila de flashcards do dia ──
  var STOP = ['de','da','do','das','dos','e','em','no','na','nos','nas','com','para','por','sem','ao','aos','os','as','um','uma','geral','direito','sobre','entre','pela','pelo','contra','crime','crimes','teoria','processo','processual','direitos','juridico','poder','publico','publica','publicos','publicas','pessoal','procedimento'];
  // tema do dia sem palavra em comum com o tema do cartão
  var SINONIMOS = { 'Intervenção do Estado na propriedade': 'desapropriação' };
  function tokens(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter(function (w) { return (w.length >= 4 || w === 'fe') && STOP.indexOf(w) < 0; })
      .map(function (w) { return w.slice(0, 6); });
  }
  // Flashcards novos do tema de cada PDF do dia (sem cartão do tema, nenhum novo daquela matéria).
  // Cartão visto pela primeira vez nesta data continua ocupando a vaga dele: recarregar a página
  // (ou adiantar outro PDF) não puxa mais cartões do mesmo tema.
  function vistoNoDia(e) { return !!(e && e.h && e.h.length && e.h[0][0] === DATA); }
  function novosDoDia() {
    var est = ATIVO.estados(), out = [], feitos = [], vistos = {};
    function livre(c) { return !est[c.id] || vistoNoDia(est[c.id]); }
    function poe(c) { vistos[c.id] = 1; (est[c.id] ? feitos : out).push(c); }
    if (!DIA.top) {
      var cont = {}, ds = disciplinasDoDia();
      ATIVO.cartoes().forEach(function (c) {
        if (ds.indexOf(c.d) < 0 || !livre(c)) return;
        cont[c.d] = (cont[c.d] || 0) + 1;
        if (cont[c.d] <= 10) poe(c);
      });
      out.sort(function (a, b) { return ds.indexOf(a.d) - ds.indexOf(b.d); });
      return { novos: out, feitos: feitos };
    }
    DIA.top.forEach(function (t) {
      var cand = ATIVO.cartoes().filter(function (c) { return c.d === t.d && livre(c) && !vistos[c.id]; });
      // palavra do nome da matéria ("penal", "tribut…") só conta se o cartão não tiver outra
      var nomeDisc = tokens(t.d);
      function casam(txt) {
        var alvo = tokens(txt);
        return cand.filter(function (c) {
          var tk = tokens(c.t), proprias = tk.filter(function (w) { return nomeDisc.indexOf(w) < 0; });
          return (proprias.length ? proprias : tk).some(function (w) { return alvo.indexOf(w) >= 0; });
        });
      }
      // primeiro pelo tema do PDF; só se nada casar, pelos tópicos do banco
      var doTema = casam(t.s + ' ' + (SINONIMOS[t.s] || ''));
      if (!doTema.length) doTema = casam((t.q || []).join(' '));
      doTema.slice(0, 15).forEach(poe);
    });
    return { novos: out, feitos: feitos };
  }
  function fila() {
    // num dia futuro aberto antes da hora, revisões só valem até hoje: o que vence amanhã fica para amanhã
    var venc = ATIVO.vencidos(DATA > HOJE ? HOJE : DATA);
    if (!DIA) return { venc: venc, novos: [], feitos: [] };
    if (DIA.tipo === 'vespera') return { venc: venc.slice(0, 30), novos: [], feitos: [] };
    if (DIA.tipo === 'leve' || DIA.tipo === 'prova') return { venc: venc, novos: [], feitos: [] };
    var nv = novosDoDia();
    return { venc: venc, novos: nv.novos, feitos: nv.feitos };
  }

  // ── PDFs do dia do VDE ──
  // A pasta do Drive manda: dia que falta em VDE_DIAS ou arquivo que sumiu da pasta é trocado pelo que está lá.
  var K_PASTA = 'tj_vde_pasta';
  function mesclarPasta(fs) {
    var V = window.VDE_DIAS = window.VDE_DIAS || {}, existe = {}, porN = {}, mudou = [];
    fs.forEach(function (f) {
      existe[f.id] = 1;
      var m = /^Dia\s+(\d+)\s*-/i.exec(f.name || '');
      if (m) (porN[+m[1]] = porN[+m[1]] || []).push(f);
    });
    Object.keys(porN).forEach(function (n) {
      var atual = [].concat(V[n] || []);
      if (atual.length && atual.every(function (id) { return existe[id]; })) return;
      var ids = porN[n].sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (f) { return f.id; });
      V[n] = ids.length === 1 ? ids[0] : ids;
      mudou.push(+n);
    });
    return mudou;
  }
  var cachePasta = ler(K_PASTA, null);
  if (window.VDE_PASTA && cachePasta && cachePasta.f) mesclarPasta(cachePasta.f);
  function sincPasta(aoMudar) {
    if (!window.VDE_PASTA || !window.LEITOR || !LEITOR.listarPasta) return;
    if (cachePasta && Date.now() - cachePasta.t < 6 * 36e5) return;
    LEITOR.listarPasta(window.VDE_PASTA).then(function (fs) {
      cachePasta = { t: Date.now(), f: fs.map(function (f) { return { id: f.id, name: f.name }; }) };
      try { localStorage.setItem(K_PASTA, JSON.stringify(cachePasta)); } catch (e) {}
      var m = mesclarPasta(fs);
      if (m.length && aoMudar) aoMudar(m);
    }).catch(function () {});
  }
  function pdfsDoDia() {
    if (!DIA || !DIA.top) return [];
    var ns = [];
    DIA.top.forEach(function (t) {
      if (t.n == null) return;
      var x = ns.filter(function (y) { return y.n === t.n; })[0];
      if (!x) ns.push(x = { n: t.n, ids: [].concat((window.VDE_DIAS || {})[t.n] || []), temas: [], fonte: t.o || 'Estratégia' });
      x.temas.push(curto(t.d) + (t.a ? ' · ' + t.a : '') + ': ' + t.s);
    });
    return ns;
  }
  // Dias de revisão: o próximo material de revisão (1→2→3) ainda não feita de cada matéria em foco.
  var K_REVST = 'tj_revisao_status_v1';
  function revisoesDoDia() {
    if (!DIA || DIA.tipo !== 'revisao' || !DIA.foco) return [];
    var st = ler(K_REVST, {}), lib = window.BIBLIOTECA_REVISAO || [];
    return DIA.foco.map(function (d) {
      var its = lib.filter(function (x) { return x.g === 'rev' && x.a === NOME_REV[d]; }).sort(function (a, b) { return +a.b - +b.b; });
      if (!its.length) return null;
      var it = its.filter(function (x) { return !(st[x.id] && st[x.id].s === 'feito'); })[0] || its[its.length - 1];
      return { d: d, r: it.b, id: it.id, feita: !!(st[it.id] && st[it.id].s === 'feito') };
    }).filter(Boolean);
  }
  function marcarRevisao(id, d) {
    var st = ler(K_REVST, {}); st[id] = { s: 'feito', d: HOJE }; gravar(K_REVST, st);
    marcar('rv-' + d, true);
  }
  function htmlRevisoes() {
    return revisoesDoDia().map(function (r) {
      return '<div class="ss-bloco"><h3><span class="n">' + (MATERIAL_REV[r.r] || 'Revisão ' + r.r) + '</span>' + esc(curto(r.d)) + '</h3>' +
        (window.LEITOR ? '<div class="lp-host" data-arq="' + r.id + '"></div>' : '<iframe class="vde-pdf" src="' + drive(r.id) + '"></iframe>') +
        '<div class="ss-acoes" style="margin-top:.8rem">' + (r.feita ? '<span class="ss-vazio">Revisão marcada como feita ✓</span>'
          : '<button type="button" class="btn btn-primary" data-rev-feita="' + r.id + '" data-rev-d="' + esc(r.d) + '">Marcar como feita</button>') + '</div></div>';
    }).join('');
  }
  function dm(iso) { var p = partes(iso); return p.d + '/' + String(p.m).padStart(2, '0'); }
  function htmlAdiantar() {
    if (!window.PLANO || DATA !== HOJE) return '';
    var h = '', feitos = PLANO.adiantadosHoje(), prox = PLANO.proximo();
    if (feitos.length) h += '<div class="adi-feitos">' + feitos.map(function (u) {
      return '<span>Adiantado: ' + esc(u.tops.map(function (t) { return curto(t.d); }).join(' + ')) +
        ' <button type="button" data-desfazer="' + u.n + '">desfazer</button></span>';
    }).join('') + '</div>';
    if (prox) h += '<div class="adi"><div><div class="adi-eb">Terminou? Adiante o próximo</div>' +
      '<b>' + esc(prox.tops.map(function (t) { return curto(t.d) + ' · ' + (t.a || '') + ': ' + t.s; }).join(' · ')) + '</b>' +
      '<small>Previsto para ' + dm(prox.d) + '. O calendário anda para frente e os dias que sobrarem viram revisão extra.</small></div>' +
      '<button type="button" class="btn btn-primary" data-adiantar="' + prox.n + '">Adiantar</button></div>';
    else if (!feitos.length) h += '';
    return h;
  }
  function htmlConteudo() {
    var ps = pdfsDoDia();
    if (!ps.length) {
      var rv = htmlRevisoes();
      return (rv ? '<div class="ss-bloco"><p style="margin:0">' + esc(resumoDoDia()) + '. Releia o material de revisão de cada matéria em foco e grife o que ainda escapa.</p></div>' + rv
        : '<div class="ss-bloco"><p class="ss-vazio" style="margin:0">Hoje não tem PDF novo: ' + esc(resumoDoDia()) + '.</p></div>') + htmlAdiantar();
    }
    var gabFeito = {};
    return ps.map(function (p) {
      return '<div class="ss-bloco"><h3><span class="n">' + (p.fonte === 'NEAF' ? 'Apostila NEAF' : 'Aula do dia · ' + esc(p.fonte)) + '</span>' + esc(p.temas.join(' · ')) + '</h3>' +
        (p.ids.length ? p.ids.map(function (x, i) {
          // trecho de apostila: {id, de, ate} abre só as páginas do tema do dia
          var id = x.id || x, faixa = x.de ? ' data-de="' + x.de + '" data-ate="' + x.ate + '"' : '';
          return (p.ids.length > 1 ? '<div class="lp-parte">Parte ' + (i + 1) + '</div>' : '') +
            (window.LEITOR ? '<div class="lp-host" data-arq="' + id + '"' + faixa + '></div>'
              : '<iframe class="vde-pdf" src="https://drive.google.com/file/d/' + id + '/preview" title="PDF da aula ' + p.n + '" allow="autoplay"></iframe>');
        }).join('')
          : '<p class="ss-vazio">O PDF desta aula ainda não está ligado. Quando estiver, ele aparece aqui.</p>') + '</div>' +
        htmlGabaritaco(function (t) { return t.n === p.n; }, gabFeito);
    }).join('') + htmlGabaritaco(function () { return true; }, gabFeito) + htmlAdiantar();
  }
  // Trecho do Gabaritaço de cada tema do dia (só as páginas das DICAS), aberto sob demanda.
  function htmlGabaritaco(filtro, feito) {
    var G = window.GABARITACO; if (!G || !DIA || !DIA.top) return '';
    return DIA.top.filter(function (t, i) {
      if (!t.k || !G[t.d] || feito[i] || !filtro(t)) return false;
      return (feito[i] = true);
    }).map(function (t) {
      // a página onde começa a DICA seguinte só entra se ela não abrir a página (senão é toda do próximo tema)
      var g = G[t.d], de = g.dica[t.k[0] - 1] || 1, prox = g.dica[t.k[1]];
      var ate = prox ? Math.max(de, prox - (g.topo && g.topo[t.k[1]] ? 1 : 0)) : g.paginas;
      return '<div class="ss-bloco gab-bloco"><h3><span class="n">Gabaritaço · DICAS ' + t.k[0] + '–' + t.k[1] + '</span>' + esc(curto(t.d) + ': ' + t.s) + '</h3>' +
        '<div class="gab-host" data-arq="' + g.id + '" data-de="' + de + '" data-ate="' + ate + '">' +
        '<p class="ss-vazio" style="margin:0 0 .6rem">Questões que já caíram sobre o tema, com as dicas do VDE (páginas ' + de + '–' + ate + ').</p>' +
        '<button type="button" class="btn" data-abrir-gab="1">Abrir o trecho do Gabaritaço</button></div></div>';
    }).join('');
  }

  function montarConteudo(el) {
    el.innerHTML = htmlConteudo();
    if (window.LEITOR) el.querySelectorAll('.lp-host').forEach(function (h) {
      LEITOR.montar(h, h.dataset.arq, h.dataset.de ? { caixa: true, de: +h.dataset.de, ate: +h.dataset.ate } : { caixa: true });
    });
  }

  // ── checklist do dia ──
  function checks() { var t = ler(K_CHECK, {}); return t[DATA] || {}; }
  function marcar(id, valor) {
    var t = ler(K_CHECK, {}), d = t[DATA] || (t[DATA] = {});
    if (valor) d[id] = 1; else delete d[id];
    gravar(K_CHECK, t);
    document.querySelectorAll('[data-ck="' + id + '"]').forEach(function (li) { li.classList.toggle('done', !!valor); li.querySelector('.ck').textContent = valor ? '✓' : ''; });
    document.dispatchEvent(new CustomEvent('sessao:checklist'));
  }
  function itensChecklist() {
    if (!DIA) return [];
    var it = [], f = fila(), n = f.venc.length + f.novos.length;
    if (DIA.tipo === 'prova') return [{ id: 'prova', t: 'Prova do TJSP · objetiva e redação', s: 'Documento com foto, caneta preta de material transparente. Confira horário e local no cartão de convocação da Vunesp.' }];
    revisoesDoDia().forEach(function (r) { it.push({ id: 'rv-' + r.d, t: (MATERIAL_REV[r.r] || 'Revisão ' + r.r) + ' · ' + curto(r.d), s: 'Ler e grifar na aba Conteúdo', aba: 'conteudo' }); });
    pdfsDoDia().forEach(function (p) { it.push({ id: 'p' + p.n, t: 'Estudar ' + esc(p.temas[0].split(': ')[0]), s: esc(p.temas.join(' · ')) + ' · aba Conteúdo', aba: 'conteudo' }); });
    it.push({ id: 'fc', t: 'Flashcards do dia', s: n ? f.venc.length + ' vencidos + ' + f.novos.length + ' novos · aba Flashcards' : f.feitos.length ? f.feitos.length + ' novos feitos hoje' : 'Nada vence hoje', aba: 'flashcards' });
    if (DIA.top) DIA.top.forEach(function (t, i) {
      var l = linkTopico(t);
      it.push({ id: 't' + i, t: curto(t.d) + ' · ' + t.s, aba: 'questoes',
        s: 'Resolva ' + ATIVO.questoesPorTopico() + ' questões na aba Questões' + (l ? ' · dicas no <a href="' + l.href + '" target="_blank" rel="noopener">' + esc(l.txt) + ' ↗</a>' : '') });
    });
    if (DIA.tipo === 'revisao' || DIA.tipo === 'leve') it.push({ id: 'etica', t: 'Reforço em Português', s: (DIA.tipo === 'leve' ? 10 : 20) + ' questões, erradas primeiro · aba Questões', aba: 'questoes' });
    if (DIA.tipo === 'revisao') it.push({ id: 'cad', t: 'Caderno de erros do dia', s: '<a href="erros.html">Abrir o caderno →</a>' });
    if (DIA.sim) {
      var completo = DIA.sim.modo === 'completo';
      it.push({ id: 'sim', t: completo ? 'Simulado completo' + (DIA.sim.exame ? ' · ' + nomeExame(DIA.sim.exame) : '') : 'Simulado parcial · 20 questões em 1 hora',
        s: '<a href="simulado.html' + (completo ? (DIA.sim.exame ? '?exame=' + DIA.sim.exame : '') : '?treino=fracas') + '">Ir para o simulado →</a> · na correção, mande os erros para o caderno' });
    }
    return it;
  }
  function htmlChecklist() {
    var c = checks();
    return '<ul class="ck-lista">' + itensChecklist().map(function (x) {
      var ok = !!c[x.id];
      return '<li data-ck="' + x.id + '"' + (ok ? ' class="done"' : '') + '><span class="ck">' + (ok ? '✓' : '') + '</span><div><div class="ck-t">' + esc(x.t) + '</div>' +
        (x.s ? '<div class="ck-s">' + x.s + '</div>' : '') + '</div></li>';
    }).join('') + '</ul>';
  }
  function progressoChecklist() {
    var it = itensChecklist(), c = checks();
    return { feitos: it.filter(function (x) { return c[x.id]; }).length, total: it.length };
  }

  // ── flashcards: um cartão por vez, dentro do próprio bloco ──
  function montarFlashcards(el, cartoes, opts) {
    opts = opts || {};
    var st = { fila: cartoes.slice(), idx: 0, sabidos: 0, verso: false };
    function desenhar() {
      if (!st.fila.length) { el.innerHTML = '<p class="ss-vazio">' + (opts.vazio || 'Nenhum flashcard para agora.') + '</p>'; return; }
      if (st.idx >= st.fila.length) {
        el.innerHTML = '<div class="fc-player"><h3 style="font-family:Fraunces,serif;font-weight:500;color:var(--rose-deep);margin:0 0 .5rem">Flashcards concluídos</h3>' +
          '<p style="font-size:.9rem;color:var(--ink-soft);margin:0">' + st.sabidos + ' de ' + st.fila.length + ' você lembrou. Os que você errou voltam amanhã.</p></div>';
        if (opts.fim) opts.fim(st);
        return;
      }
      var c = st.fila[st.idx], e = ATIVO.estados()[c.id], origem = linkRevisao(c.d, c.r);
      var h = '<div class="fc-player"><div class="topo"><span>' + (st.idx + 1) + ' de ' + st.fila.length + (e ? ' · revisão' : ' · novo') + '</span></div>' +
        '<div class="ss-bar"><i style="width:' + Math.round(st.idx / st.fila.length * 100) + '%"></i></div>' +
        '<div class="fc-meta">' + esc(curto(c.d)) + ' · ' + esc(c.t) +
          (origem ? ' · <a href="' + origem + '" target="_blank" rel="noopener" style="color:inherit">' + (MATERIAL_REV[c.r] || 'Revisão ' + c.r) + ' ↗</a>' : (c.r ? ' · ' + (MATERIAL_REV[c.r] || 'Revisão ' + c.r) : '')) + '</div>' +
        '<div class="fc-frente">' + esc(c.f) + '</div>';
      if (!st.verso) h += '<div class="fc-bts"><button class="btn btn-primary" data-fc="mostrar">Mostrar resposta</button></div>';
      else h += '<div class="fc-verso">' + esc(c.v) +
        '<div class="base"><b>Base:</b> ' + (c.b ? esc(c.b) : 'não citada na revisão') + (c.c || !c.b ? '<span class="fc-tag">conferir</span>' : '') +
        (c.n ? '<div class="base">' + esc(c.n) + '</div>' : '') + '</div>' +
        (c.p ? '<div class="fc-peg"><b>Pegadinha:</b> ' + esc(c.p) + '</div>' : '') + '</div>' +
        (function () {
          var pv = ATIVO.previa(c.id);
          function quando(d) { return !d ? 'sai da revisão' : d === 1 ? 'amanhã' : d + ' dias'; }
          return '<div class="fc-bts fc-4">' + [['errei', 'Errei'], ['dificil', 'Difícil'], ['bom', 'Bom'], ['facil', 'Fácil']].map(function (o) {
            return '<button class="btn fc-' + o[0] + '" data-fc="' + o[0] + '"><b>' + o[1] + '</b><small>' + quando(pv[o[0]]) + '</small></button>';
          }).join('') + '</div>';
        })();
      el.innerHTML = h + '</div>';
    }
    el.onclick = function (ev) {
      var b = ev.target.closest('[data-fc]'); if (!b) return;
      if (b.dataset.fc === 'mostrar') { st.verso = true; desenhar(); return; }
      ATIVO.responder(st.fila[st.idx].id, b.dataset.fc);
      if (b.dataset.fc !== 'errei') st.sabidos++;
      st.idx++; st.verso = false; desenhar();
    };
    desenhar();
  }

  // ── questões: seleção fica fixa no dia para não embaralhar a cada abertura ──
  // Sorteio guardado por data (antes era uma data só: abrir outro dia apagava o sorteio deste e, ao voltar, vinham questões novas)
  function selecaoDoDia() {
    var t = ler(K_DIA, null), n = ATIVO.questoesPorTopico();
    if (!t || !t.dias) t = { dias: {} };
    var s = t.dias[DATA];
    if (!s || s.n !== n) s = t.dias[DATA] = { n: n, sel: {} };
    s.salvar = function () {
      var ds = Object.keys(t.dias).sort();
      while (ds.length > 21) delete t.dias[ds.shift()];
      try { localStorage.setItem(K_DIA, JSON.stringify(t, function (k, v) { return k === 'salvar' ? undefined : v; })); } catch (e) {}
    };
    return s;
  }
  function escolher(chave, disc, topicos, prioritarias, n, erradasPrimeiro, usadas) {
    var s = selecaoDoDia();
    if (s.sel[chave]) {
      var vistos = {};
      return s.sel[chave].filter(function (id) {
        var q = qpor(id), gr = q && q.duplicate_group;
        if (!gr) return true;
        if (vistos[gr] || (usadas[gr] && !usadas[id])) return false;
        return (vistos[gr] = true);
      });
    }
    var resp = ler(K_RESP, {}), todos = topicos.indexOf('*') >= 0, acertoGrupo = {};
    // a mesma questão saiu em mais de um exame (duplicate_group): conta como uma só
    banco().forEach(function (q) { if (q.duplicate_group && resp[q.id] && resp[q.id].ultima_correta) acertoGrupo[q.duplicate_group] = 1; });
    var pool = banco().filter(function (q) {
      return q.discipline === disc && q.correct_answer && !usadas[q.id] && !(q.duplicate_group && usadas[q.duplicate_group]) && (todos || topicos.indexOf(q.topic) >= 0);
    });
    function nivel(q) {
      var r = resp[q.id];
      // respondida a partir desta data = já era questão deste dia: volta primeiro, mesmo se o sorteio se perdeu (outro aparelho)
      if (respostaDoDia(r)) return -1;
      if ((r && r.ultima_correta) || acertoGrupo[q.duplicate_group]) return 9;
      var g = (prioritarias || []).indexOf(q.id) >= 0;
      if (erradasPrimeiro) return r ? 0 : g ? 1 : 2;
      return g ? 0 : r ? 2 : 1;
    }
    pool.sort(function (a, b) { return nivel(a) - nivel(b) || b.exam_number - a.exam_number; });
    var grupos = {};
    var ids = pool.filter(function (q) {
      if (nivel(q) >= 9) return false;
      if (q.duplicate_group) { if (grupos[q.duplicate_group]) return false; grupos[q.duplicate_group] = 1; }
      return true;
    }).slice(0, n).map(function (q) { return q.id; });
    s.sel[chave] = ids;
    s.salvar();
    return ids;
  }

  // comentário: mesma leitura do Banco de Questões
  // a alternativa do gabarito oficial aparece sempre como gabarito, mesmo quando o comentário do material a chama de errada
  function formatarExplicacao(txt, gab) {
    // "A) Errado" seguido de "A alternativa A está incorreta, pois…": um cabeçalho só
    txt = String(txt || '').replace(/(^|\n)(\s*([A-E])\)\s*(?:Correto|Correta|Certo|Certa|Errado|Errada|Incorreto|Incorreta)\b[ \t:.,-]*)\n+\s*(?:A\s+)?(?:alternativa|assertiva|letra)\s+\3\s+(?:est[áa]|é)\s+(?:corret[ao]|cert[ao]|errad[ao]|incorret[ao])\b[\s:.,-]*/gi, '$1$2\n');
    var JULGA = '(?:Correto|Correta|Certo|Certa|Errado|Errada|Incorreto|Incorreta)';
    var ABRE = '(?:[A-E]\\)\\s*' + JULGA + '\\b|(?:A\\s+)?(?:alternativa|assertiva|letra)\\s+[A-E]\\s+(?:est[áa]|é)\\s+' + JULGA + '\\b)';
    var VER = new RegExp('^(?:([A-E])\\)\\s*(' + JULGA + ')|(?:A\\s+)?(?:alternativa|assertiva|letra)\\s+([A-E])\\s+(?:est[áa]|é)\\s+(' + JULGA + '))\\b[\\s:.,-]*', 'i');
    return String(txt || '').split(new RegExp('\\n(?=' + ABRE + ')', 'i')).map(function (bloco) {
      var m = bloco.match(VER), corpo = m ? bloco.slice(m[0].length) : bloco;
      corpo = corpo.replace(/([^.:;?!)"”\s])[ \t]*\n\s*\n\s*/g, '$1 ').replace(/\n{2,}/g, '\u0000').replace(/\n/g, ' ').replace(/\u0000/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
      if (!corpo && !m) return '';
      var paras = corpo.split('\n').filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
      if (!m) return '<div class="ex-bloco">' + paras + '</div>';
      var letra = m[1] || m[3], ver = m[2] || m[4], eGab = gab && letra.toUpperCase() === gab;
      if (eGab && !/^(corret|cert)/i.test(ver)) ver = 'Gabarito';
      return '<div class="ex-bloco ' + (eGab || /^(corret|cert)/i.test(ver) ? 'ex-certo' : 'ex-errado') + '"><span class="ex-l">' + esc(letra.toUpperCase()) +
        '</span><div><span class="ex-v">' + esc(ver) + '</span>' + paras + '</div></div>';
    }).join('');
  }

  function diaLocal(s) { var d = new Date(s); return isNaN(d) ? '' : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  // respondida a partir desta data: mostra o resultado em vez de deixar responder (e contar) de novo
  function respostaDoDia(r) { return r && r.ultima_resposta && r.ultima_data && diaLocal(r.ultima_data) >= DATA ? r : null; }
  function cortarAlt(linha, cortar) {
    if (linha.closest('.ss-q').dataset.feita || linha.classList.contains('cortada') === cortar) return;
    linha.classList.toggle('cortada', cortar);
    linha.querySelector('.ss-alt').disabled = cortar;
    var tes = linha.querySelector('.ss-tes');
    tes.title = (cortar ? 'Trazer de volta a alternativa ' : 'Descartar a alternativa ') + tes.dataset.corta;
    tes.setAttribute('aria-label', tes.title);
  }
  // no toque a tesoura não aparece: arrastar para a esquerda descarta, para a direita traz de volta (como no Banco)
  (function () {
    var LIMIAR = 46, ini = null;
    document.addEventListener('touchstart', function (ev) {
      ini = null;
      if (ev.touches.length !== 1) return;
      var linha = ev.target.closest && ev.target.closest('.ss-linha');
      if (!linha || linha.closest('.ss-q').dataset.feita) return;
      ini = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, linha: linha, alt: linha.querySelector('.ss-alt'), cortada: linha.classList.contains('cortada'), hor: false };
    }, { passive: true });
    document.addEventListener('touchmove', function (ev) {
      if (!ini) return;
      var dx = ev.touches[0].clientX - ini.x, dy = ev.touches[0].clientY - ini.y;
      if (!ini.hor) {
        if (Math.abs(dy) > Math.abs(dx)) { ini = null; return; }
        if (Math.abs(dx) < 10) return;
        ini.hor = true; ini.linha.classList.add('arrastando');
      }
      ev.preventDefault();
      ini.alt.style.transform = 'translateX(' + (ini.cortada ? Math.max(0, dx) : Math.min(0, dx)) / 2 + 'px)';
    }, { passive: false });
    function soltar() { if (!ini) return; ini.linha.classList.remove('arrastando'); ini.alt.style.transform = ''; }
    document.addEventListener('touchend', function (ev) {
      if (!ini) return;
      var i = ini, dx = ev.changedTouches[0].clientX - i.x;
      soltar(); ini = null;
      if (!i.hor) return;
      if (dx <= -LIMIAR) cortarAlt(i.linha, true); else if (dx >= LIMIAR) cortarAlt(i.linha, false);
      if (Math.abs(dx) >= 10) { i.linha.dataset.arrastou = '1'; setTimeout(function () { delete i.linha.dataset.arrastou; }, 400); }
    }, { passive: true });
    document.addEventListener('touchcancel', function () { soltar(); ini = null; }, { passive: true });
  })();
  var TESOURA = '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>';
  function htmlQuestao(id, i, g) {
    var q = qpor(id); if (!q) return '';
    var r = ler(K_RESP, {})[id], gab = (g || []).indexOf(id) >= 0, hoje = respostaDoDia(r);
    return '<div class="ss-q" data-q="' + id + '"' + (hoje ? ' data-feita="1"' : '') + '><div class="meta">' + (i + 1) + ' · ' + esc(nomeExame(q.exam_number)) +
      ', questão ' + q.question_number + (q.topic ? ' · ' + esc(q.topic) : '') + (gab ? ' · <span class="gab">caiu no Gabaritaço</span>' : '') +
      (r && !hoje ? ' · já respondida antes' : '') + '</div>' +
      '<div class="enun">' + enunciadoQuestao(q) + '</div>' +
      ['a', 'b', 'c', 'd', 'e'].map(function (k) {
        var L = k.toUpperCase(), cls = hoje ? (L === q.correct_answer ? ' certa' : L === hoje.ultima_resposta ? ' errada' : '') : '';
        return q['alternative_' + k] ? '<div class="ss-linha"><button class="ss-tes" type="button" data-corta="' + L + '" title="Descartar a alternativa ' + L + '" aria-label="Descartar a alternativa ' + L + '">' + TESOURA + '</button>' +
          '<button class="ss-alt' + cls + '" data-l="' + L + '"' + (hoje ? ' disabled' : '') + '><span class="l">' + L +
          '</span><span>' + esc(q['alternative_' + k]) + '</span></button></div>' : '';
      }).join('') + (hoje ? '' : '<p class="ss-dica-corte">Arraste a alternativa para a esquerda para descartá-la.</p>') + '<div class="fim">' + (hoje ? htmlResultado(q, hoje.ultima_resposta, hoje.ultima_correta) : '') + '</div></div>';
    return h;
  }
  function htmlResultado(q, letra, certa) {
    var chute = !certa && letra === q.correct_answer;
    return '<div class="ss-res">' +
      (certa ? '<b class="ok">Acertou.</b><button data-chute="1">Foi chute → errei</button>'
       : chute ? '<b class="no">Foi chute.</b> Foi para o Caderno de Erros.'
       : '<b class="no">Errou · gabarito ' + q.correct_answer + '.</b> Foi para o Caderno de Erros.') +
      (q.explanation ? '<button data-expl="1">Ver comentário</button>' : '') + '</div>' + (certa ? '' : htmlJustificar(q)) + '<div class="ss-expl" hidden>' + formatarExplicacao(q.explanation, q.correct_answer) +
      (q.legal_basis ? '<p><b>Fundamentação:</b> ' + esc(q.legal_basis) + '</p>' : '') +
      (q.notes ? '<p class="ss-nota">Sobre o material de origem: ' + esc(q.notes) + '</p>' : '') + '</div>';
  }
  function blocoQuestoes(chave, titulo, extra, disc, topicos, g, n, erradasPrimeiro, usadas) {
    var ids = escolher(chave, disc, topicos, g, n, erradasPrimeiro, usadas);
    ids.forEach(function (id) { usadas[id] = 1; var q = qpor(id); if (q && q.duplicate_group) usadas[q.duplicate_group] = 1; });
    return '<div class="ss-top" data-bloco="' + chave + '"><div class="ss-top-cab"><b><span class="mat">' + esc(curto(disc)) + '</span>' + esc(titulo) + '</b>' + (extra || '') + '</div>' +
      (ids.length ? ids.map(function (id, i) { return htmlQuestao(id, i, g); }).join('')
        : '<p class="ss-vazio">Você já acertou todas as questões do banco neste tópico. Use os flashcards e o caderno de erros.</p>') + '</div>';
  }
  function htmlQuestoes() {
    if (!DIA) return '<p class="ss-vazio">Nenhum dia do calendário nesta data.</p>';
    var usadas = {}, n = ATIVO.questoesPorTopico(), h = '';
    if (DIA.top) {
      h += '<div class="ss-bloco"><h3>Questões dos tópicos do dia</h3>' +
        '<p>Questões de provas anteriores da Vunesp na matéria das aulas do dia. Errou, a questão vai para o Caderno de Erros e volta em 3, 7 e 15 dias.</p>' +
        DIA.top.map(function (t, i) {
          var l = linkTopico(t);
          return blocoQuestoes('t' + i, t.s, l ? '<a href="' + l.href + '" target="_blank" rel="noopener">' + esc(l.txt) + ' ↗</a>' : '', t.d, t.q, t.g, n, /^Reforço/.test(t.s), usadas);
        }).join('') + '</div>';
    } else if (DIA.tipo === 'revisao' || DIA.tipo === 'leve') {
      h += '<div class="ss-bloco"><h3>Reforço em Português</h3><p>Erradas primeiro, depois as que você ainda não fez.</p>' +
        blocoQuestoes('etica', 'Português misto', '', ETICA, ['*'], [], DIA.tipo === 'leve' ? 10 : 20, true, usadas) + '</div>';
    } else {
      h += '<div class="ss-bloco"><p class="ss-vazio" style="margin:0">' + esc(resumoDoDia()) + (DIA.sim ? ' · as questões de hoje são as do simulado.' : '') + '</p></div>';
    }
    if (DIA.sim) {
      var completo = DIA.sim.modo === 'completo';
      h += '<div class="ss-bloco"><h3>' + (completo ? 'Simulado completo' : 'Simulado parcial') + '</h3>' +
        '<p>' + (completo ? 'Uma prova anterior inteira, sem gabarito até o fim. Escolha uma que ainda não fez.'
                          : '20 questões em 1 hora nas suas matérias mais fracas.') + ' Na correção, mande os erros para o caderno.</p>' +
        '<div class="ss-acoes"><a class="btn btn-primary" href="simulado.html' + (completo ? (DIA.sim.exame ? '?exame=' + DIA.sim.exame : '') : '?treino=fracas') + '">Ir para o simulado</a></div></div>';
    }
    if (DIA.top && window.ESTUDO) {
      var ex = ESTUDO.extraDaSemana(new Date(DATA + 'T12:00:00'));
      if (ex) h += '<div class="ss-bloco"><h3>Se sobrar tempo · matéria extra da semana</h3><p>' + esc(ex) +
        ' não entra no rodízio das aulas, mas também cai na prova.</p><div class="ss-acoes"><a class="btn" href="' + ESTUDO.linkBanco(ex, 'nao') + '">Questões de ' + esc(ex) + '</a></div></div>';
    }
    if (DIA.top) h += '<div class="ss-cfg">Questões por tópico <select id="cfg-n">' + [5, 10, 15, 20].map(function (v) {
      return '<option' + (v === n ? ' selected' : '') + '>' + v + '</option>';
    }).join('') + '</select><span>(ajuste ao tempo que você tem)</span></div>';
    return h;
  }
  function montarQuestoes(el) {
    el.innerHTML = '<p class="ss-vazio">Carregando questões…</p>';
    return carregarBanco().then(function () { el.innerHTML = htmlQuestoes(); });
  }

  function mandarProCaderno(q, letra) {
    if (typeof erros_add !== 'function') return null;
    return erros_add({
      materia: q.discipline || '', topico: q.topic || '', subtopico: q.subtopic || '', motivo: 'nao_sabia',
      origem: nomeExame(q.exam_number) + ' · questão ' + q.question_number + (letra && letra !== q.correct_answer ? ' · marquei ' + letra : ' · foi chute') + ' · gabarito ' + q.correct_answer,
      explicacao: q.explanation || '', questao_id: q.id
    });
  }
  // errou: escolhe o motivo e anota o que faltou; o registro já está no caderno, aqui ele ganha a justificativa
  function htmlJustificar(q) {
    if (typeof erros_html_justificar !== 'function') return '';
    var reg = erros_da_questao(q.id);
    if (reg && reg.justificada) return htmlJustificado(reg);
    return erros_html_justificar({ titulo: 'Por que você errou? Fica anotado no Caderno de Erros.', botao: 'Salvar justificativa' });
  }
  function htmlJustificado(reg) {
    return '<div class="ej-ok">No caderno · <b>' + esc(MOTIVOS_ERROS[reg.motivo] || reg.motivo) + '</b>' + (reg.o_que_faltou ? ' — ' + esc(reg.o_que_faltou) : '') + '</div>';
  }
  function responderQuestao(card, letra) {
    var id = card.dataset.q, q = qpor(id); if (!q || card.dataset.feita) return;
    card.dataset.feita = '1';
    var certa = letra === q.correct_answer;
    var resp = ler(K_RESP, {}), at = resp[id] || { vezes: 0, acertos: 0, erros: 0 };
    at.vezes += 1; if (certa) at.acertos += 1; else at.erros += 1;
    at.ultima_correta = certa; at.ultima_resposta = letra; at.ultima_data = new Date().toISOString();
    resp[id] = at; gravar(K_RESP, resp);
    if (!certa) mandarProCaderno(q, letra);
    else if (typeof erros_get === 'function') {
      var reg = erros_get().filter(function (x) { return x.questao_id === id && x.status !== 'dominada'; })[0];
      if (reg) erros_registrar_revisao(reg.id, true);
    }
    card.querySelectorAll('.ss-alt').forEach(function (b) {
      b.disabled = true;
      if (b.dataset.l === q.correct_answer) b.classList.add('certa');
      else if (b.dataset.l === letra) b.classList.add('errada');
    });
    card.querySelector('.fim').innerHTML = htmlResultado(q, letra, certa);
    var bloco = card.closest('[data-bloco]');
    if (bloco && !bloco.querySelector('.ss-q:not([data-feita])')) marcar(bloco.dataset.bloco, true);
  }

  // ── calendário até a prova ──
  function htmlCalendario(href) {
    if (!CAL) return '<p class="ss-vazio">Calendário não carregado.</p>';
    href = href || function (d) { return 'hoje.html?data=' + d; };
    var h = '', sem = null, feitos = ler(K_CHECK, {});
    CAL.dias.forEach(function (x) {
      var p = partes(x.d), seg = new Date(p.dt); seg.setDate(p.dt.getDate() - ((p.dt.getDay() + 6) % 7));
      var chave = seg.toDateString();
      if (chave !== sem) {
        if (sem) h += '</div>';
        sem = chave;
        h += '<div class="cal-sem"><h4>Semana de ' + seg.getDate() + ' ' + MESES[seg.getMonth()] + (x.f === 3 ? ' · Reta final' : x.f === 1 ? (x.ritmo === 'leve' ? ' · Ritmo leve' : ' · Férias') : '') + '</h4>';
      }
      var desc = x.top ? x.top.map(function (t) { return '<b>' + esc(curto(t.d)) + '</b> · ' + esc(t.s) + (t.a ? ' <span class="tp">(' + esc(t.a) + ')</span>' : ''); }).join('<br>')
        : x.tipo === 'simulado' ? '<b>Simulado completo</b>'
        : x.tipo === 'revisao' ? 'Revisão: caderno + flashcards (foco ' + x.foco.map(curto).join(' e ') + ') + Português' + (x.sim ? ' · simulado ' + (x.sim.modo === 'completo' ? 'completo' : 'parcial') : '')
        : x.tipo === 'leve' ? 'Leve: flashcards vencidos + 10 questões de Português'
        : x.tipo === 'vespera' ? 'Véspera: só flashcards leves. Nada novo.' : '<b>Prova</b> · objetiva e redação';
      var ok = feitos[x.d] && feitos[x.d].feito;
      h += '<a class="cal-dia' + (x.d === HOJE ? ' hoje' : x.d < HOJE ? ' passado' : '') + '" href="' + href(x.d) + '">' +
        '<span class="dt">' + p.d + '/' + String(p.m).padStart(2, '0') + (ok ? ' ✓' : '') + '<small>' + DIAS_SEM[p.dt.getDay()] + '</small></span><span>' + desc + '</span></a>';
    });
    return h + '</div>';
  }

  // ── painel de erros ──
  function htmlPainel() {
    var pn = ATIVO.painelErros(), est = ATIVO.estados(), cart = ATIVO.cartoes();
    var discs = uniq(Object.keys((CAL && CAL.curto) || {}).concat(Object.keys(pn)));
    var linhas = discs.map(function (d) {
      var p = pn[d] || { fc: 0, cad: 0, temas: {} };
      var meus = cart.filter(function (c) { return c.d === d; });
      var vistos = meus.filter(function (c) { return est[c.id]; }).length;
      var fora = meus.filter(function (c) { return est[c.id] && est[c.id].fora; }).length;
      var temas = Object.keys(p.temas).map(function (t) { return [t, p.temas[t].fc + p.temas[t].cad]; })
        .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3)
        .map(function (t) { return esc(t[0]) + ' (' + t[1] + ')'; }).join(' · ');
      return { tot: p.fc + p.cad, html: '<div class="pn-lin"><span class="disc"><b>' + esc(curto(d)) + '</b></span>' +
        '<span>' + vistos + '/' + meus.length + ' vistos</span><span>' + fora + ' fora</span>' +
        '<span>' + (p.fc + p.cad) + (p.fc + p.cad === 1 ? ' erro' : ' erros') + '</span><span class="temas">' + (temas || '—') + '</span></div>' };
    }).sort(function (a, b) { return b.tot - a.tot; });
    return '<div class="ss-bloco"><h3>Onde você mais erra</h3><p>Soma dos flashcards que já levaram "errei" com os erros pendentes no Caderno de Erros (questões do banco, simulados e registros manuais). Temas com mais erros à direita.</p></div>' +
      '<div class="pn-tab"><div class="pn-lin cab"><span>Matéria</span><span>Flashcards</span><span>Dominados</span><span>Erros</span><span>Temas que mais erra</span></div>' +
      linhas.map(function (l) { return l.html; }).join('') + '</div>';
  }

  // ── cliques de questões e checklist (valem em qualquer página) ──
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var rf = t.closest('[data-rev-feita]');
    if (rf) { marcarRevisao(rf.dataset.revFeita, rf.dataset.revD); rf.outerHTML = '<span class="ss-vazio">Revisão marcada como feita ✓</span>'; return; }
    var ag = t.closest('[data-abrir-gab]');
    if (ag && window.LEITOR) { var hg = ag.closest('.gab-host'); LEITOR.montar(hg, hg.dataset.arq, { de: +hg.dataset.de, ate: +hg.dataset.ate, caixa: true }); return; }
    var ad = t.closest('[data-adiantar]'), dz = t.closest('[data-desfazer]');
    if ((ad || dz) && window.PLANO) {
      if (ad) PLANO.adiantar(+ad.dataset.adiantar); else PLANO.desfazer(+dz.dataset.desfazer);
      var u = new URL(location.href); u.searchParams.set('aba', 'conteudo'); u.searchParams.delete('data');
      setTimeout(function () { location.href = u.toString(); }, 250);
      return;
    }
    var li = t.closest('.ck-lista li[data-ck]');
    if (li && !t.closest('a')) { marcar(li.dataset.ck, !li.classList.contains('done')); return; }
    var sal = t.closest('.ss-q .ej-salvar');
    if (sal) {
      var cq = sal.closest('.ss-q'), qq = qpor(cq.dataset.q), box = sal.closest('.ej');
      var reg = erros_da_questao(qq.id) || mandarProCaderno(qq, (ler(K_RESP, {})[qq.id] || {}).ultima_resposta);
      if (!reg) return;
      var j = erros_ler_justificar(box); j.justificada = true;
      box.outerHTML = htmlJustificado(erros_editar(reg.id, j));
      return;
    }
    var tes = t.closest('.ss-tes');
    if (tes) { cortarAlt(tes.closest('.ss-linha'), !tes.closest('.ss-linha').classList.contains('cortada')); return; }
    var alt = t.closest('.ss-alt');
    if (alt && alt.closest('[data-arrastou]')) return;
    if (alt && !alt.disabled) { responderQuestao(alt.closest('.ss-q'), alt.dataset.l); return; }
    if (t.closest('[data-expl]')) { var ex = t.closest('.ss-q').querySelector('.ss-expl'); ex.hidden = !ex.hidden; return; }
    if (t.closest('[data-chute]')) {
      var card = t.closest('.ss-q'), q = qpor(card.dataset.q);
      var resp = ler(K_RESP, {}), r = resp[q.id];
      if (r) { r.ultima_correta = false; r.acertos = Math.max(0, r.acertos - 1); r.erros += 1; gravar(K_RESP, resp); }
      mandarProCaderno(q, q.correct_answer);
      var res = t.closest('.ss-res');
      t.outerHTML = '<span style="margin-left:.6rem">Foi para o Caderno de Erros.</span>';
      res.insertAdjacentHTML('afterend', htmlJustificar(q));
    }
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'cfg-n') {
      ATIVO.definirQuestoesPorTopico(parseInt(ev.target.value, 10));
      var el = ev.target.closest('[data-questoes]'); if (el) montarQuestoes(el);
    }
  });

  function marcarFeito(v) {
    var t = ler(K_CHECK, {}), d = t[DATA] || (t[DATA] = {});
    if (v) d.feito = 1; else delete d.feito;
    gravar(K_CHECK, t);
  }

  // dia do plano já passado sem "Estudei hoje" (dias leves não contam)
  function atrasados() {
    if (!CAL) return [];
    var f = ler(K_CHECK, {});
    return CAL.dias.filter(function (x) {
      return x.d < HOJE && x.tipo !== 'leve' && x.tipo !== 'vespera' && x.tipo !== 'prova' && !(f[x.d] && f[x.d].feito);
    }).map(function (x) { return x.d; });
  }

  window.SESSAO = {
    DATA: DATA, HOJE: HOJE, DIA: DIA, TIPO: TIPO, ETICA: ETICA,
    esc: esc, curto: curto, dataLonga: dataLonga, partes: partes, MESES: MESES,
    indice: indice, vizinho: vizinho, resumoDoDia: resumoDoDia, disciplinasDoDia: disciplinasDoDia,
    sincPasta: sincPasta, fila: fila, montarFlashcards: montarFlashcards, montarQuestoes: montarQuestoes, carregarBanco: carregarBanco,
    itensChecklist: itensChecklist, htmlChecklist: htmlChecklist, htmlConteudo: htmlConteudo, montarConteudo: montarConteudo, revisoesDoDia: revisoesDoDia, pdfsDoDia: pdfsDoDia, progressoChecklist: progressoChecklist, marcar: marcar,
    feito: function () { return !!checks().feito; }, marcarFeito: marcarFeito, atrasados: atrasados,
    htmlCalendario: htmlCalendario, htmlPainel: htmlPainel, linkRevisao: linkRevisao
  };
})();
