// ============================================================
// OAB · Aplica a cor personalizada ANTES do primeiro paint
// Precisa ser um <script> comum (não defer/async) no topo do <head>,
// senão o navegador desenha a página com a cor rosa padrão do
// style.css primeiro e só depois troca — causando o "flash" ao
// navegar entre páginas. Este arquivo é intencionalmente pequeno
// e síncrono; a lógica completa (com o dropdown, etc.) mora em
// cores.js, que roda depois, normalmente.
// ============================================================
(function () {
  try {
    function hexToRgb(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const num = parseInt(hex, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }
    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    }
    function lighten(hex, amt) { const c = hexToRgb(hex); return rgbToHex(c.r + (255-c.r)*amt, c.g + (255-c.g)*amt, c.b + (255-c.b)*amt); }
    function darken(hex, amt)  { const c = hexToRgb(hex); return rgbToHex(c.r*(1-amt), c.g*(1-amt), c.b*(1-amt)); }

    // Faixa e barra do topo usam a cor escolhida; só escurecem o necessário para o texto branco continuar legível.
    // Detalhe claro da faixa (nome, aba ativa, progresso): bronze com preto/cinza, um tom claro da própria cor nas cores vivas.
    function corDestaque(hex) {
      const c = hexToRgb(hex), sat = (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
      return sat < 0.15 ? '#E9D9B5' : lighten(hex, 0.78);
    }
    function corFaixa(hex) {
      function lum(h) { const c = hexToRgb(h); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
      let h = hex, i = 0;
      while (lum(h) > 0.3 && i++ < 20) h = darken(h, 0.06);
      return h;
    }

    const BASES = { sutil: '#B14A77', couture: '#C8336F', vibrante: '#E01571' };
    const KEY = 'tj_rose_intensity', CUSTOM_KEY = 'tj_rose_custom_hex';
    const PADRAO_NOVO_USUARIO = '#000000'; // preto — quem nunca configurou nada cai aqui

    const saved = localStorage.getItem(KEY);
    let base;
    if (saved === 'custom') {
      const hex = localStorage.getItem(CUSTOM_KEY);
      base = (hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) ? hex : PADRAO_NOVO_USUARIO;
    } else if (saved && BASES[saved]) {
      base = BASES[saved];
    } else {
      base = PADRAO_NOVO_USUARIO;
    }

    const root = document.documentElement;
    const ramp = {
      '--rose-50':  lighten(base, 0.95),
      '--rose-100': lighten(base, 0.88),
      '--rose-300': lighten(base, 0.55),
      '--rose-500': lighten(base, 0.18),
      '--rose-600': base,
      '--rose-700': darken(base, 0.18),
      '--rose-900': darken(base, 0.55),
      '--faixa':    corFaixa(base),
      '--faixa-claro': corDestaque(base),
    };
    Object.entries(ramp).forEach(([k, v]) => root.style.setProperty(k, v));

    // Tema claro/escuro também é decidido aqui, cedo — os aliases
    // (--rose, --rose-deep etc.) dependem de qual modo está ativo.
    const theme = localStorage.getItem('theme') || 'light';
    root.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    const c0 = hexToRgb(base), escura = Math.max(c0.r, c0.g, c0.b) < 102; // preto/cinza-escuro: no escuro, o destaque vira tom claro
    const aliases = isDark ? (escura ? {
      // tons médios: legíveis como texto no fundo escuro e como fundo de botão com texto branco
      '--rose':      lighten(base, 0.42),
      '--rose-deep': lighten(base, 0.55),
      '--rose-soft': lighten(base, 0.14),
      '--blush':     lighten(base, 0.08),
      '--rose-50':   lighten(base, 0.08),
      '--rose-100':  lighten(base, 0.14),
      '--rose-300':  lighten(base, 0.35),
    } : {
      '--rose':      lighten(base, 0.32),
      '--rose-deep': lighten(base, 0.20),
      '--rose-soft': darken(base, 0.75),
      '--blush':     darken(base, 0.82),
      // tons claros da escala viram tons escuros: senão etiquetas e seleções ficam brancas no modo escuro
      '--rose-50':   darken(base, 0.82),
      '--rose-100':  darken(base, 0.75),
      '--rose-300':  darken(base, 0.45),
    }) : {
      '--rose':      lighten(base, 0.18),
      '--rose-deep': base,
      '--rose-soft': lighten(base, 0.88),
      '--blush':     lighten(base, 0.95),
      '--rose-50':   lighten(base, 0.95),
      '--rose-100':  lighten(base, 0.88),
      '--rose-300':  lighten(base, 0.55),
    };
    Object.entries(aliases).forEach(([k, v]) => root.style.setProperty(k, v));
  } catch (e) {}
})();

// Identidade visual do Escrevente (tema.css), em todas as páginas.
(function () {
  var root = document.documentElement, h = document.head || root;
  root.setAttribute('data-skin', 'palacio');
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'tema.css?v=3'; h.appendChild(css);
})();
