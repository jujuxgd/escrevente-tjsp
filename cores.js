// ============================================================
// OAB · Intensidade do Rosa
// Substitui o antigo seletor multi-matiz (§5.6 da Especificação Visual v1).
// A marca é SEMPRE rosa — aqui só se ajusta a intensidade da cor de ação,
// sem nunca sair do rosa. Mantém apenas o eixo claro/escuro como tema.
// ============================================================

(function () {
  const KEY = 'tj_rose_intensity';
  const CUSTOM_KEY = 'tj_rose_custom_hex';

  // Cada nível gera a escala rosa inteira (50…900) a partir de uma cor-base,
  // para que todo elemento do site — não só botões — acompanhe a troca de tema.
  const BASES = {
    sutil:    '#B14A77', // mais empoeirado, suave
    couture:  '#C8336F', // padrão da marca
    vibrante: '#E01571', // mais saturado, punchy
  };
  const LEVELS = {
    sutil:    buildRamp(BASES.sutil),
    couture:  buildRamp(BASES.couture),
    vibrante: buildRamp(BASES.vibrante),
  };
  const ORDER = [
    ['sutil',    'Sutil'],
    ['couture',  'Couture'],
    ['vibrante', 'Vibrante'],
  ];

  // ── Cor personalizada — seletor de cor ou código hex digitado ──
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function lighten(hex, amt) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  }
  function darken(hex, amt) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
  }
  // Gera a escala completa (50…900) a partir de uma única cor-base (nível 600),
  // para que blush, soft, deep etc. sempre acompanhem a cor escolhida.
  // Faixa e barra do topo usam a cor escolhida; só escurecem o necessário para o texto branco continuar legível.
  function corFaixa(hex) {
    function lum(h) { const c = hexToRgb(h); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
    let h = hex, i = 0;
    while (lum(h) > 0.3 && i++ < 20) h = darken(h, 0.06);
    return h;
  }
  function buildRamp(base) {
    return {
      '--rose-50':  lighten(base, 0.95),
      '--rose-100': lighten(base, 0.88),
      '--rose-300': lighten(base, 0.55),
      '--rose-500': lighten(base, 0.18),
      '--rose-600': base,
      '--rose-700': darken(base, 0.18),
      '--rose-900': darken(base, 0.55),
      '--faixa':    corFaixa(base),
    };
  }
  function normalizeHex(v) {
    v = (v || '').trim();
    if (v && v[0] !== '#') v = '#' + v;
    return v;
  }
  function isValidHex(v) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
  }

  // ── Aliases (--rose, --rose-deep, --rose-soft, --blush) ──
  // style.css redefine esses aliases com valores fixos dentro de
  // [data-theme="dark"], o que travava a cor em rosa no modo escuro
  // mesmo depois de trocar a intensidade/cor personalizada. Aqui eles
  // são recalculados a partir da MESMA cor-base e aplicados via inline
  // style, que tem prioridade sobre a regra fixa da folha de estilos.
  function applyAliases(base) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const root = document.documentElement;
    const c0 = hexToRgb(base), escura = Math.max(c0.r, c0.g, c0.b) < 102; // preto/cinza-escuro: no escuro, o destaque vira tom claro
    const set = isDark ? (escura ? {
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
    Object.entries(set).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  function applyCustom(rawHex) {
    const hex = normalizeHex(rawHex);
    if (!isValidHex(hex)) return false;
    const root = document.documentElement;
    const rose600 = hex;
    const ramp = buildRamp(hex);
    Object.entries(ramp).forEach(([k, v]) => root.style.setProperty(k, v));
    applyAliases(hex);
    try {
      localStorage.setItem(KEY, 'custom');
      localStorage.setItem(CUSTOM_KEY, rose600);
    } catch (e) {}
    document.querySelectorAll('._ri-sw').forEach(b => {
      b.setAttribute('aria-pressed', 'false');
      b.style.borderColor = 'var(--line)';
      b.style.color = 'var(--ink-soft)';
      b.style.fontWeight = '500';
    });
    const picker = document.getElementById('_ri-custom-picker');
    const hexField = document.getElementById('_ri-custom-hex');
    if (picker)   picker.value = rose600;
    if (hexField) hexField.value = rose600;
    return true;
  }

  // Limpa qualquer preferência do esquema multi-matiz retirado (magenta, violeta…),
  // que de outro modo sobrescreveria o design system rosa ao carregar.
  try { localStorage.removeItem('tj_accent_color'); } catch (e) {}

  function apply(level) {
    const set = LEVELS[level] ? level : 'couture';
    const root = document.documentElement;
    Object.entries(LEVELS[set]).forEach(([k, v]) => root.style.setProperty(k, v));
    applyAliases(BASES[set]);
    try { localStorage.setItem(KEY, set); } catch (e) {}
    document.querySelectorAll('._ri-sw').forEach(b => {
      const active = b.dataset.level === set;
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
      b.style.boxShadow = active ? '0 0 0 2px var(--paper), 0 0 0 4px var(--rose-600)' : 'none';
      b.style.transform = active ? 'scale(1.08)' : 'scale(1)';
    });
    const picker = document.getElementById('_ri-custom-picker');
    const hexField = document.getElementById('_ri-custom-hex');
    if (picker)   picker.value = LEVELS[set]['--rose-600'];
    if (hexField) { hexField.value = LEVELS[set]['--rose-600']; hexField.style.borderColor = 'var(--line)'; }
  }

  function load() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (!saved) {
      // Nunca configurou nada — padrão agora é preto, não mais rosa
      try { localStorage.setItem(CUSTOM_KEY, '#000000'); } catch (e) {}
      applyCustom('#000000');
      return;
    }
    if (saved === 'custom') {
      let hex = null;
      try { hex = localStorage.getItem(CUSTOM_KEY); } catch (e) {}
      if (hex && applyCustom(hex)) return;
      saved = 'couture'; // hex inválido/ausente — volta ao padrão
    }
    apply(saved);
  }

  function buildControl() {
    if (document.getElementById('_ri-wrap')) return;
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return;

    const wrap = document.createElement('div');
    wrap.id = '_ri-wrap';
    wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center';

    const toggle = document.createElement('button');
    toggle.className = 'btn btn-ghost';
    toggle.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:0;width:32px;height:32px;border-radius:50%';
    toggle.title = 'Cor personalizada';
    toggle.setAttribute('aria-label', 'Cor personalizada');
    toggle.innerHTML = '<span style="width:18px;height:18px;border-radius:50%;background:var(--rose-600);display:inline-block;flex-shrink:0;border:1px solid rgba(0,0,0,.08)"></span>';
    toggle.addEventListener('click', e => { e.stopPropagation(); _toggle(); });
    wrap.appendChild(toggle);

    const dd = document.createElement('div');
    dd.id = '_ri-dd';
    dd.style.cssText = [
      'display:none', 'position:absolute', 'top:calc(100% + 8px)', 'right:0',
      'background:var(--paper)', 'border:1px solid var(--line)', 'border-radius:var(--radius)',
      'box-shadow:var(--shadow-lg)', 'padding:1rem', 'min-width:200px', 'z-index:9999'
    ].join(';');

    const customLabel = document.createElement('div');
    customLabel.style.cssText = 'font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faded);margin-bottom:.5rem;font-weight:600';
    customLabel.textContent = 'Cor personalizada';
    dd.appendChild(customLabel);

    const customRow = document.createElement('div');
    customRow.style.cssText = 'display:flex;align-items:center;gap:.5rem';

    const currentRose = getComputedStyle(document.documentElement).getPropertyValue('--rose-600').trim() || '#C8336F';

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.id = '_ri-custom-picker';
    picker.value = currentRose;
    picker.title = 'Escolher cor';
    picker.style.cssText = 'width:34px;height:34px;padding:0;border:1px solid var(--line);border-radius:var(--radius-sm);cursor:pointer;background:none;flex-shrink:0';
    picker.addEventListener('input', () => applyCustom(picker.value));

    const hexField = document.createElement('input');
    hexField.type = 'text';
    hexField.id = '_ri-custom-hex';
    hexField.placeholder = '#RRGGBB';
    hexField.maxLength = 7;
    hexField.value = currentRose;
    hexField.style.cssText = 'flex:1;min-width:0;padding:.45rem .6rem;border:1px solid var(--line);border-radius:var(--radius-sm);font-size:.8rem;font-family:inherit;background:var(--paper-tint);color:var(--ink)';
    hexField.addEventListener('input', () => { hexField.style.borderColor = 'var(--line)'; });
    hexField.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!applyCustom(hexField.value)) hexField.style.borderColor = '#c0392b';
    });
    hexField.addEventListener('blur', () => {
      if (hexField.value && !applyCustom(hexField.value)) hexField.style.borderColor = '#c0392b';
    });

    customRow.appendChild(picker);
    customRow.appendChild(hexField);
    dd.appendChild(customRow);

    dd.addEventListener('click', e => e.stopPropagation());
    wrap.appendChild(dd);

    actions.insertBefore(wrap, actions.firstChild);
    document.addEventListener('click', () => _toggle(false));
  }

  let _open = false;
  function _toggle(force) {
    _open = force !== undefined ? force : !_open;
    const dd = document.getElementById('_ri-dd');
    const wrap = document.getElementById('_ri-wrap');
    if (!dd) return;
    if (!_open) { dd.style.display = 'none'; return; }
    dd.style.display = 'block';
    if (!wrap) return;
    // Posiciona com coordenadas fixas calculadas em JS: no mobile o
    // botão fica perto da borda esquerda da tela, e o painel (aberto
    // sempre pra esquerda via right:0) vazava pra fora, ficando
    // inacessível. Assim ele nunca ultrapassa a viewport.
    dd.style.position = 'fixed';
    dd.style.right = 'auto';
    const wrapRect = wrap.getBoundingClientRect();
    const ddWidth = Math.min(dd.offsetWidth || 220, window.innerWidth - 16);
    dd.style.maxWidth = (window.innerWidth - 16) + 'px';
    let left = wrapRect.right - ddWidth; // tenta alinhar pela direita do botão (padrão)
    left = Math.max(8, Math.min(left, window.innerWidth - ddWidth - 8));
    dd.style.left = left + 'px';
    dd.style.top = (wrapRect.bottom + 8) + 'px';
  }

  // Re-aplica ao alternar claro/escuro (mantém compat com toggleTheme).
  const _origThemeToggle = window.toggleTheme;
  if (typeof _origThemeToggle === 'function') {
    window.toggleTheme = function () { _origThemeToggle(); setTimeout(load, 60); };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop();
    if (!page || page === '' || page === 'index.html') buildControl();
    load();
  });

  // API compatível com chamadas externas existentes.
  window._coresOAB = { apply, applyCustom, reset: () => apply('couture') };
})();
