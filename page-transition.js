// ============================================================
// OAB · Transição de página ("floração")
// Precisa ser um <script> comum (não defer/async), carregado logo
// após cores-early.js no topo do <head>: cria o véu já coberto
// ANTES do primeiro paint (evita flash do conteúdo cru), depois
// o dissolve suavemente. Ao clicar num link interno, faz o caminho
// inverso antes de navegar de verdade — dá sensação de transição
// de app único, mesmo sendo várias páginas separadas.
// ============================================================
// ============================================================
// OAB · Transição de página (só entrada)
// Precisa ser um <script> comum (não defer/async), carregado logo
// após cores-early.js no topo do <head>: cria o véu já coberto
// ANTES do primeiro paint (evita flash de cor errada ao navegar),
// depois o dissolve rápido assim que a página está pronta. Não
// atrasa a navegação em si — só suaviza a chegada.
// ============================================================
(function () {
  var isDark = (localStorage.getItem('theme') || 'light') === 'dark';
  var paper = isDark ? '#211C18' : '#FFFFFF';

  var veil = document.createElement('div');
  veil.id = 'page-veil';
  veil.style.cssText = 'position:fixed;inset:0;z-index:100000;opacity:1;pointer-events:none;' +
    'background:' + paper + ';transition:opacity .15s ease-out;';
  document.documentElement.appendChild(veil);

  function reveal() { veil.style.opacity = '0'; }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reveal);
  } else {
    reveal();
  }
  // Rede de segurança final — nunca deixa o véu preso na tela
  setTimeout(reveal, 350);
})();
