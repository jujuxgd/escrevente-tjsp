// Service worker: deixa o site abrir sem internet.
// Rede primeiro (o conteúdo novo sempre ganha quando há conexão); sem rede, ou com a rede
// demorando mais de 4s, usa a cópia guardada. O banco de questões e os cadernos legislativos
// entram no cache na primeira vez que são abertos com internet.
var VERSAO = 'tjsp-v8';
var ESSENCIAIS = ["ativo-core.js", "aulas-dias.js", "auth-guard.js", "banco-questoes.html", "caderno-legislativo.html", "calendario-ativo.js", "calendario.html", "cards.js", "cores-early.js", "cores.js", "erros-core.js", "erros.html", "estatisticas.html", "estudar.html", "estudo-core.js", "firebase-init.js", "hoje-compact.css", "hoje.html", "home.css", "home.js", "humor.js", "index.html", "leitor-pdf.css", "leitor-pdf.js", "materias.html", "page-transition.js", "perfil-ui.css", "perfil-ui.js", "perfil.html", "perfil.js", "plano-dinamico.js", "progresso.js", "reta-final.html", "revisao-biblioteca.js", "revisao.html", "revisar.html", "rumo40.html", "script.js", "sessao-core.js", "sessao.css", "simulado.html", "simulado.js", "style.css", "sync.js", "topnav.css", "topnav.js", "treino.html", "favicon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "manifest.webmanifest", "fonts/Kathen Font by Situjuh (7NTypes).otf", "fonts/Magical Feather.ttf", "fonts/Muthiara demo version.otf", "fonts/Simple Mandala.otf", "tema.css", "favicon-autos.svg", "favicon-palacio.svg", "favicon-grifo.svg", "fc-const.js", "fc-penal.js", "fc-cpp.js", "fc-cpc.js", "fc-adm.js", "fc-normas.js", "fc-pt.js", "fc-info.js", "fc-mat.js"];
var FIREBASE = [
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js'
];
// Login, sincronização e PDFs do Drive precisam da rede de verdade — nunca do cache.
var SO_REDE = /(^|\.)(googleapis\.com|firebaseapp\.com|drive\.google\.com|docs\.google\.com|youtube\.com|youtube-nocookie\.com|vercel-insights\.com)$/;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) {
    return Promise.all(
      ESSENCIAIS.map(function (u) { return c.add(u).catch(function () {}); }).concat(
      FIREBASE.map(function (u) {
        return fetch(new Request(u, { mode: 'no-cors' })).then(function (r) { return c.put(u, r); }).catch(function () {});
      }))
    );
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function doCache(req) {
  var mesmaOrigem = new URL(req.url).origin === self.location.origin;
  return caches.open(VERSAO).then(function (c) {
    return c.match(req, { ignoreSearch: mesmaOrigem }).then(function (r) {
      if (r || !mesmaOrigem || req.mode !== 'navigate') return r;
      return c.match('hoje.html');
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  var fontes = url.hostname === 'fonts.googleapis.com';
  if (SO_REDE.test(url.hostname) && !fontes) return;
  var mesmaOrigem = url.origin === self.location.origin;
  if (!mesmaOrigem && !fontes && !/(^|\.)(gstatic\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname)) return;

  e.respondWith(new Promise(function (resolve) {
    var resolvido = false;
    function entrega(r) { if (!resolvido && r) { resolvido = true; resolve(r); } }
    // páginas e arquivos do site sempre revalidam com o servidor (sem pegar cópia velha do navegador)
    var rede = (mesmaOrigem ? fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req)).then(function (r) {
      if (r && (r.ok || r.type === 'opaque')) {
        var copia = r.clone();
        caches.open(VERSAO).then(function (c) { c.put(req, copia); });
      }
      return r;
    });
    var espera = setTimeout(function () { doCache(req).then(entrega); }, 4000);
    rede.then(function (r) { clearTimeout(espera); entrega(r); })
        .catch(function () {
          clearTimeout(espera);
          doCache(req).then(function (r) { entrega(r || new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })); });
        });
  }));
});
