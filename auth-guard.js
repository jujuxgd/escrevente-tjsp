// ============================================================
// TJSP · Guarda de autenticação + sincronização com a nuvem
// Precisa ser um <script> comum, carregado logo após firebase-init.js
// no topo do <head>.
//
// Estratégia "otimista": se este navegador já logou com sucesso antes
// (marca tj_auth_ok no localStorage), mostra o app IMEDIATAMENTE, sem
// esperar o Firebase confirmar de novo a cada página — só confere em
// segundo plano. Isso evita esperar o Firebase em toda navegação, já
// que esse app é multi-página (não é um app de página única). Só
// espera de verdade — cobrindo a tela — na primeira vez.
//
// Visual: identidade própria pra essa tela específica (gelo/lilás/
// rosa-queimado, gradiente mesh, card em vidro fosco) — mais neutra
// e "premium SaaS" que o resto do site, que é mais rosa/caloroso.
// Só a assinatura cursiva da logo conecta com a marca.
// ============================================================
(function () {
  var ADMIN_EMAIL = 'juliagabriellems@icloud.com';
  var isDark = (localStorage.getItem('theme') || 'light') === 'dark';

  var T = isDark ? {
    ink: '#F2F0F5', inkSoft: 'rgba(242,240,245,0.68)', inkFaint: 'rgba(242,240,245,0.42)',
    paper: '#1B1A20', paperGlass: 'rgba(30,28,36,0.62)', border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.16)', bg0: '#111016', bg1: '#17151D',
    inputBg: 'rgba(255,255,255,0.04)', shadow: '0 24px 70px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.4)',
  } : {
    ink: '#1C1A20', inkSoft: 'rgba(28,26,32,0.62)', inkFaint: 'rgba(28,26,32,0.4)',
    paper: '#FFFFFF', paperGlass: 'rgba(255,255,255,0.68)', border: 'rgba(28,26,32,0.08)',
    borderStrong: 'rgba(28,26,32,0.14)', bg0: '#F7F5F3', bg1: '#EFECF3',
    inputBg: 'rgba(28,26,32,0.025)', shadow: '0 24px 70px rgba(28,26,32,0.14), 0 6px 18px rgba(28,26,32,0.07)',
  };

  // ── Tema de cor da tela de login — independente da "cor personalizada"
  // do resto do site (§cores.js). Editável pelo botão de engrenagem
  // discreto no canto da tela; guarda só o hex escolhido, e todo o
  // resto (accent, sombra do foco, blobs do fundo) é derivado dele na
  // hora, então qualquer cor — preset ou personalizada — já tinge o
  // degradê inteiro, não só o botão. ──
  var THEME_HEX_KEY = 'tj_login_theme_hex';
  var THEME_PRESETS = [
    { id: 'padrao', label: 'Padrão', hex: '#8B6B80' },
    { id: 'azul',   label: 'Azul',   hex: '#3E6FB0' },
    { id: 'pink',   label: 'Rosa',   hex: '#FF66B8' },
  ];
  var HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function mixRgb(c, targetHex, amt) {
    var t = hexToRgb(targetHex);
    return { r: c.r + (t.r - c.r) * amt, g: c.g + (t.g - c.g) * amt, b: c.b + (t.b - c.b) * amt };
  }
  function rgbaStr(c, a) { return 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + a + ')'; }
  // Deriva accent + as 3 cores dos blobs (antes fixas em lilás/rosa/névoa)
  // a partir de UMA cor só — mantém a variedade de tons do fundo mesh
  // mas sempre coerente com o tema escolhido.
  function temaVars(hex) {
    var base = hexToRgb(hex);
    var claro  = mixRgb(base, '#FFFFFF', 0.35);
    var neutro = mixRgb(base, '#9AA5B8', 0.55);
    return {
      accent: hex,
      accentSoft: rgbaStr(base, isDark ? 0.35 : 0.16),
      blobLav: rgbaStr(claro, isDark ? 0.22 : 0.38),
      blobRose: rgbaStr(base, isDark ? 0.16 : 0.30),
      blobMist: rgbaStr(neutro, isDark ? 0.14 : 0.30),
    };
  }
  var _temaHexSalvo = null;
  try { _temaHexSalvo = localStorage.getItem(THEME_HEX_KEY); } catch (e) {}
  var TEMA_HEX = (_temaHexSalvo && HEX_RE.test(_temaHexSalvo)) ? _temaHexSalvo : THEME_PRESETS[0].hex;
  var TV = temaVars(TEMA_HEX);

  // ── Estilos (classes, não inline) — permite pseudo-classes/animações reais ──
  var css = document.createElement('style');
  css.textContent = `
    #auth-gate * { box-sizing: border-box; }
    #auth-gate {
      --ag-accent: ${TV.accent};
      --ag-accent-soft: ${TV.accentSoft};
      --ag-blob-lav: ${TV.blobLav};
      --ag-blob-rose: ${TV.blobRose};
      --ag-blob-mist: ${TV.blobMist};
    }
    /* Blindagem: o resto do site tem regras globais em elementos "nus"
       (label, h1-h4 etc.) que, sem isso, vazariam pra dentro do overlay
       de login e desconfigurariam o visual sem aviso. */
    #auth-gate h1, #auth-gate h2, #auth-gate h3, #auth-gate p, #auth-gate label, #auth-gate button, #auth-gate input {
      all: revert;
      box-sizing: border-box;
      font-family: inherit;
    }
    #auth-gate {
      position: fixed; inset: 0; z-index: 200000;
      display: flex; align-items: stretch; justify-content: stretch;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${T.bg0};
      opacity: 0; transition: opacity .2s ease;
    }
    .ag-shell {
      position: relative; display: flex; width: 100%; min-height: 100%; overflow: hidden;
      background: linear-gradient(160deg, ${T.bg0} 0%, ${T.bg1} 45%, ${T.bg0} 100%);
      background-size: 240% 240%;
      animation: agGradientDrift 24s ease-in-out infinite;
    }
    @keyframes agGradientDrift { 0%,100% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } }

    /* Fundo com blobs — cobre a tela inteira sempre (mobile inclusive),
       senão o card em vidro fosco não tem nada colorido pra borrar por
       trás e fica com aparência lisa/incompleta */
    .ag-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
    .ag-blob { position: absolute; border-radius: 50%; filter: blur(60px); will-change: transform; opacity: 0.75; }
    .ag-blob-1 { width: 300px; height: 300px; top: -8%; left: -12%; background: var(--ag-blob-lav); animation: agDrift1 26s ease-in-out infinite; }
    .ag-blob-2 { width: 260px; height: 260px; bottom: -10%; left: 10%; background: var(--ag-blob-rose); animation: agDrift2 32s ease-in-out infinite; }
    .ag-blob-3 { width: 240px; height: 240px; top: 18%; right: -14%; background: var(--ag-blob-mist); animation: agDrift3 22s ease-in-out infinite; }
    @media (min-width: 900px) {
      .ag-blob { opacity: 1; }
      .ag-blob-1 { width: 480px; height: 480px; }
      .ag-blob-2 { width: 420px; height: 420px; }
      .ag-blob-3 { width: 380px; height: 380px; }
    }
    @keyframes agDrift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.08); } }
    @keyframes agDrift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,-40px) scale(1.05); } }
    @keyframes agDrift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-25px,25px) scale(0.95); } }

    /* Painel de atmosfera (saudação, frase, relógio) — conteúdo textual
       só no desktop; o fundo com blobs (acima) já é universal */
    .ag-atmos { position: relative; z-index: 1; flex: 1.35; display: none; }
    @media (min-width: 900px) { .ag-atmos { display: flex; flex-direction: column; justify-content: space-between; padding: 3.2rem 3.6rem; } }
    .ag-grain {
      position: absolute; inset: -50%; opacity: ${isDark ? '0.05' : '0.035'}; pointer-events: none; mix-blend-mode: ${isDark ? 'overlay' : 'multiply'};
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .ag-brandmark { font-family: MagicalFeather, cursive; font-size: 2.3rem; font-weight: normal; color: ${T.ink}; opacity: 0.94; position: relative; z-index: 1; line-height: 1; }
    .ag-hero { position: relative; z-index: 1; max-width: 420px; }
    #auth-gate .ag-hero h1 { font-family: 'Fraunces', serif; font-size: 2.3rem; font-weight: 500; letter-spacing: -0.01em; line-height: 1.15; color: ${T.ink}; margin: 0 0 0.9rem; }
    #auth-gate .ag-hero p { font-size: 0.98rem; line-height: 1.6; color: ${T.inkSoft}; margin: 0; font-weight: 400; }
    .ag-footer-row { position: relative; z-index: 1; display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    #auth-gate .ag-quote { font-size: 0.82rem; font-style: italic; color: ${T.inkFaint}; max-width: 300px; line-height: 1.5; margin: 0; }
    .ag-clock { font-variant-numeric: tabular-nums; font-size: 0.82rem; color: ${T.inkFaint}; white-space: nowrap; letter-spacing: 0.02em; }

    /* Painel do formulário */
    .ag-formside { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1.5rem; position: relative; z-index: 1; overflow-y: auto; }
    @media (min-width: 900px) { .ag-formside { background: ${T.paper}; box-shadow: -1px 0 0 ${T.border}; } }

    .ag-card {
      width: 100%; max-width: 380px;
      background: ${T.paperGlass}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid ${T.border}; border-radius: 22px;
      padding: 2.4rem 2.1rem; box-shadow: ${T.shadow};
      animation: agCardIn .55s cubic-bezier(.16,1,.3,1);
    }
    @keyframes agCardIn { from { opacity: 0; transform: translateY(16px) scale(0.97); filter: blur(4px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    .ag-card.ag-shake { animation: agShake .45s; }
    @keyframes agShake { 15%,85% { transform: translateX(-1px); } 25%,75% { transform: translateX(3px); } 35%,65% { transform: translateX(-6px); } 45%,55% { transform: translateX(6px); } }

    /* Sem painel de atmosfera no celular, a assinatura cursiva "Exame da
       Ordem" solta acima do card virava um segundo título competindo com
       o de dentro do card — duas saudações antes da pessoa sequer ver o
       formulário. Cortada por inteiro no celular (o desktop mantém a
       assinatura completa no painel lateral, onde ela tem espaço de
       sobra pra funcionar). */
    #auth-gate .ag-card h2 { font-family: 'Fraunces', serif; font-size: 1.44rem; font-weight: 500; letter-spacing: -0.005em; text-transform: none; color: ${T.ink}; margin: 0 0 0.3rem; text-align: center; }
    #auth-gate .ag-card .ag-sub { font-size: 0.84rem; color: ${T.inkSoft}; margin: 0 0 1.6rem; line-height: 1.5; text-align: center; }

    /* Celular: o card tem o MESMO max-width de 380px do desktop, mas em
       telas estreitas (depois de descontar o padding do .ag-formside) ele
       nunca chega perto disso — sobra menos espaço real pro mesmo tamanho
       fixo de fonte, e a proporção que funciona nos 380px do desktop fica
       apertada/desequilibrada num card de ~300px. Sem a assinatura acima
       pra preencher, o card carrega a composição inteira sozinho — ganha
       mais respiro interno (padding maior), não menos. */
    @media (max-width: 480px) {
      .ag-formside { padding: 1.2rem; }
      .ag-card { padding: 2.6rem 1.7rem; }
      #auth-gate .ag-card h2 { font-size: 1.3rem; margin-bottom: 0.5rem; }
      #auth-gate .ag-card .ag-sub { font-size: 0.82rem; margin-bottom: 1.7rem; }
      /* 16px é o limiar do zoom automático do Safari iOS ao focar um campo
         — abaixo disso (0.94rem ≈ 15px) a página pula de tamanho sozinha
         ao tocar no e-mail/senha. Só sobe no celular pra não alterar a
         aparência no desktop, que já está do jeito certo. */
      #auth-gate .ag-field input { font-size: 1rem; }
    }

    .ag-alert { font-size: 0.8rem; padding: 0.7rem 0.9rem; border-radius: 12px; margin-bottom: 1.1rem; line-height: 1.45; animation: agAlertIn .25s ease; }
    @keyframes agAlertIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .ag-alert-err { background: ${isDark ? 'rgba(224,102,102,0.14)' : '#FDECEC'}; color: ${isDark ? '#F0A0A0' : '#B23A3A'}; }
    .ag-alert-ok  { background: ${isDark ? 'rgba(107,168,120,0.14)' : '#E9F5EC'}; color: ${isDark ? '#9CD1A8' : '#2F7A44'}; }

    .ag-field { position: relative; margin-bottom: 0.85rem; }
    /* Tamanho/cor valem pra qualquer ícone do campo (inclusive o de
       mostrar/ocultar senha, aninhado dentro de .ag-field-toggle) — mas o
       posicionamento absoluto é só do ícone à esquerda (filho direto de
       .ag-field). Um seletor único pros dois JÁ FOI o bug: ao virar
       position:absolute, o ícone do botão de olho saía do fluxo normal,
       o botão colapsava pro tamanho do padding (perdendo a área clicável)
       e o ícone "vazava" visualmente pra fora do quadrado. */
    .ag-field svg { width: 17px; height: 17px; color: ${T.inkFaint}; transition: color .18s ease; }
    .ag-field > svg { position: absolute; left: 0.95rem; top: 50%; transform: translateY(-50%); pointer-events: none; }
    #auth-gate .ag-field input {
      width: 100%; padding: 0.82rem 0.95rem 0.82rem 2.6rem; border-radius: 12px;
      border: 1.5px solid ${T.border}; background: ${T.inputBg}; color: ${T.ink};
      font-family: inherit; font-size: 0.94rem; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    #auth-gate .ag-field input::placeholder { color: ${T.inkFaint}; }
    #auth-gate .ag-field input:focus { outline: none; border-color: var(--ag-accent); box-shadow: 0 0 0 4px var(--ag-accent-soft); background: ${T.paper}; }
    .ag-field:focus-within svg { color: var(--ag-accent); }
    #auth-gate .ag-field-toggle {
      position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; padding: 0.4rem; color: ${T.inkFaint};
      display: flex; align-items: center; border-radius: 8px; transition: color .15s ease;
    }
    #auth-gate .ag-field-toggle:hover { color: ${T.inkSoft}; }

    #auth-gate .ag-remember { display: flex; align-items: center; gap: 0.55rem; font-size: 0.82rem; font-weight: 400; letter-spacing: normal; text-transform: none; color: ${T.inkSoft}; cursor: pointer; user-select: none; margin: 0.3rem 0 1.3rem; }
    #auth-gate .ag-remember input { width: 16px; height: 16px; accent-color: var(--ag-accent); cursor: pointer; }

    #auth-gate .ag-btn {
      width: 100%; padding: 0.85rem; border: none; border-radius: 12px;
      background: var(--ag-accent); color: #fff; font-family: inherit; font-size: 0.92rem; font-weight: 600;
      cursor: pointer; transition: filter .15s ease, transform .08s ease, box-shadow .18s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    }
    #auth-gate .ag-btn:hover:not(:disabled) { filter: brightness(1.08); box-shadow: 0 6px 18px var(--ag-accent-soft); }
    #auth-gate .ag-btn:active:not(:disabled) { transform: scale(0.98); }
    #auth-gate .ag-btn:disabled { opacity: 0.82; cursor: default; }
    #auth-gate .ag-btn:focus-visible { outline: 2px solid var(--ag-accent); outline-offset: 2px; }

    .ag-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: agSpin .7s linear infinite; flex-shrink: 0; }
    @keyframes agSpin { to { transform: rotate(360deg); } }

    .ag-links { display: flex; justify-content: space-between; align-items: center; margin-top: 1.2rem; gap: 0.6rem; flex-wrap: wrap; }
    #auth-gate .ag-link { background: none; border: none; color: ${T.inkFaint}; font-size: 0.78rem; cursor: pointer; font-family: inherit; padding: 0.2rem 0; transition: color .15s ease; border-bottom: 1px solid transparent; }
    #auth-gate .ag-link:hover { color: var(--ag-accent); border-bottom-color: var(--ag-accent); }
    #auth-gate .ag-link:focus-visible { outline: 2px solid var(--ag-accent); outline-offset: 2px; border-radius: 4px; }

    #auth-gate .ag-hint { font-size: 0.76rem; color: ${T.inkFaint}; line-height: 1.5; margin: 0 0 1rem; }

    .ag-waiting { text-align: center; }
    .ag-waiting-icon { width: 46px; height: 46px; margin: 0 auto 1rem; border-radius: 50%; background: var(--ag-accent-soft); color: var(--ag-accent); display: flex; align-items: center; justify-content: center; animation: agPulseRing 2.4s ease-in-out infinite; }
    @keyframes agPulseRing { 0%,100% { box-shadow: 0 0 0 0 var(--ag-accent-soft); } 50% { box-shadow: 0 0 0 10px transparent; } }

    @media (prefers-reduced-motion: reduce) {
      #auth-gate, #auth-gate * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
    }

    /* ── Botão de tema (engrenagem) — discreto, canto da tela, só visível
       enquanto o overlay de login está ativo. Fica FORA de #auth-gate
       (irmão dele), porque montarShell() reescreve #auth-gate por inteiro
       a cada troca de tela (login/cadastro/etc.) e apagaria um botão que
       estivesse lá dentro. */
    #ag-theme-btn {
      all: revert; box-sizing: border-box; position: fixed; z-index: 200001;
      bottom: 1rem; right: 1rem; width: 34px; height: 34px; border-radius: 50%;
      border: 1px solid ${T.border}; background: ${T.paperGlass}; backdrop-filter: blur(12px);
      color: ${T.inkFaint}; display: flex; align-items: center; justify-content: center;
      cursor: pointer; opacity: 0; transition: opacity .2s ease, color .15s ease, transform .15s ease;
      pointer-events: none;
    }
    #ag-theme-btn.ag-visible { opacity: 0.6; pointer-events: auto; }
    #ag-theme-btn.ag-visible:hover { opacity: 1; color: ${T.ink}; transform: rotate(35deg); }
    #ag-theme-btn svg { width: 16px; height: 16px; }

    #ag-theme-pop {
      all: revert; box-sizing: border-box; position: fixed; z-index: 200002;
      bottom: 4rem; right: 1rem; width: 210px;
      background: ${T.paperGlass}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid ${T.border}; border-radius: 16px; box-shadow: ${T.shadow};
      padding: 0.9rem; display: none; font-family: 'Inter', sans-serif;
    }
    #ag-theme-pop.ag-open { display: block; animation: agAlertIn .18s ease; }
    #ag-theme-pop .ag-theme-label { font-size: 0.66rem; letter-spacing: 0.1em; text-transform: uppercase; color: ${T.inkFaint}; font-weight: 600; margin: 0 0 0.6rem; }
    #ag-theme-pop .ag-theme-swatches { display: flex; gap: 0.5rem; margin-bottom: 0.7rem; }
    #ag-theme-pop .ag-theme-swatch {
      all: revert; box-sizing: border-box; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; padding: 0; transition: transform .15s ease, border-color .15s ease;
    }
    #ag-theme-pop .ag-theme-swatch:hover { transform: scale(1.08); }
    #ag-theme-pop .ag-theme-swatch.ag-active { border-color: ${T.ink}; }
    #ag-theme-pop .ag-theme-custom { display: flex; align-items: center; gap: 0.5rem; padding-top: 0.65rem; border-top: 1px dotted ${T.border}; }
    #ag-theme-pop .ag-theme-custom input[type="color"] {
      all: revert; box-sizing: border-box; width: 30px; height: 30px; padding: 0; border: 1px solid ${T.border};
      border-radius: 8px; cursor: pointer; background: none; flex-shrink: 0;
    }
    #ag-theme-pop .ag-theme-custom input[type="text"] {
      all: revert; box-sizing: border-box; flex: 1; min-width: 0; padding: 0.4rem 0.55rem; border: 1px solid ${T.border};
      border-radius: 8px; font-size: 0.78rem; font-family: inherit; background: ${T.inputBg}; color: ${T.ink};
    }
  `;
  document.head.appendChild(css);

  // ── Ícones (inline, sem dependência externa) ──
  var ICO = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m3 6.5 9 6.5 9-6.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.2 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.5 6.6C3.7 8.4 2 12 2 12s3.8 7 10 7c1.4 0 2.7-.3 3.8-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    hourglass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };

  var FRASES = [
    'Devagar se chega mais rápido do que parece.',
    'Todo capítulo estudado é um passo a menos até a aprovação.',
    'Constância vence intensidade — um pouco todo dia.',
    'A calma também é estratégia de prova.',
    'Foco no processo; a aprovação é consequência.',
  ];

  var overlay = document.createElement('div');
  overlay.id = 'auth-gate';
  document.documentElement.appendChild(overlay);

  // ── Botão de tema (engrenagem) + popover — ver comentário na CSS acima
  // sobre por que ficam fora de #auth-gate. Só existe pra tela de login;
  // some junto com o overlay assim que o app aparece. ──
  var themeBtn = document.createElement('button');
  themeBtn.id = 'ag-theme-btn';
  themeBtn.type = 'button';
  themeBtn.title = 'Personalizar tema';
  themeBtn.setAttribute('aria-label', 'Personalizar tema da tela de login');
  themeBtn.innerHTML = ICO.gear;
  document.documentElement.appendChild(themeBtn);

  var themePop = document.createElement('div');
  themePop.id = 'ag-theme-pop';
  themePop.innerHTML =
    '<div class="ag-theme-label">Tema da tela de login</div>' +
    '<div class="ag-theme-swatches">' +
      THEME_PRESETS.map(function (p) {
        return '<button type="button" class="ag-theme-swatch" data-hex="' + p.hex + '" title="' + p.label + '" aria-label="' + p.label + '" style="background:' + p.hex + '"></button>';
      }).join('') +
    '</div>' +
    '<div class="ag-theme-custom">' +
      '<input type="color" id="ag-theme-picker" value="' + TEMA_HEX + '" aria-label="Cor personalizada">' +
      '<input type="text" id="ag-theme-hex" maxlength="7" placeholder="#RRGGBB" value="' + TEMA_HEX + '">' +
    '</div>';
  document.documentElement.appendChild(themePop);

  function atualizarSwatchesAtivos() {
    themePop.querySelectorAll('.ag-theme-swatch').forEach(function (sw) {
      sw.classList.toggle('ag-active', sw.dataset.hex.toLowerCase() === TEMA_HEX.toLowerCase());
    });
  }
  atualizarSwatchesAtivos();

  function aplicarTema(hex) {
    hex = (hex || '').trim();
    if (hex && hex[0] !== '#') hex = '#' + hex;
    if (!HEX_RE.test(hex)) return false;
    TEMA_HEX = hex;
    TV = temaVars(hex);
    overlay.style.setProperty('--ag-accent', TV.accent);
    overlay.style.setProperty('--ag-accent-soft', TV.accentSoft);
    overlay.style.setProperty('--ag-blob-lav', TV.blobLav);
    overlay.style.setProperty('--ag-blob-rose', TV.blobRose);
    overlay.style.setProperty('--ag-blob-mist', TV.blobMist);
    try { localStorage.setItem(THEME_HEX_KEY, hex); } catch (e) {}
    atualizarSwatchesAtivos();
    var picker = document.getElementById('ag-theme-picker');
    var hexField = document.getElementById('ag-theme-hex');
    if (picker) picker.value = hex;
    if (hexField) { hexField.value = hex; hexField.style.borderColor = ''; }
    return true;
  }

  themePop.querySelectorAll('.ag-theme-swatch').forEach(function (sw) {
    sw.addEventListener('click', function () { aplicarTema(sw.dataset.hex); });
  });
  document.getElementById('ag-theme-picker').addEventListener('input', function (e) { aplicarTema(e.target.value); });
  var hexFieldEl = document.getElementById('ag-theme-hex');
  hexFieldEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!aplicarTema(hexFieldEl.value)) hexFieldEl.style.borderColor = '#c0392b';
  });
  hexFieldEl.addEventListener('blur', function () {
    if (hexFieldEl.value && !aplicarTema(hexFieldEl.value)) hexFieldEl.style.borderColor = '#c0392b';
  });
  hexFieldEl.addEventListener('input', function () { hexFieldEl.style.borderColor = ''; });

  themeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    themePop.classList.toggle('ag-open');
  });
  document.addEventListener('click', function (e) {
    if (themePop.classList.contains('ag-open') && !themePop.contains(e.target) && e.target !== themeBtn) {
      themePop.classList.remove('ag-open');
    }
  });

  var jaLogouAntes = false;
  try { jaLogouAntes = localStorage.getItem('tj_auth_ok') === '1'; } catch (e) {}
  var overlayAtivo = false;
  var loadingTimer = null;
  var clockTimer = null;

  function marcarLogado(sim) {
    try {
      if (sim) localStorage.setItem('tj_auth_ok', '1');
      else localStorage.removeItem('tj_auth_ok');
    } catch (e) {}
  }

  function esconderApp() {
    if (document.getElementById('auth-gate-hide-app')) return;
    var style = document.createElement('style');
    style.id = 'auth-gate-hide-app';
    style.textContent = '.app, .mobile-menu-btn, .sidebar-toggle-btn { visibility: hidden !important; }';
    document.head.appendChild(style);
  }

  function ativarOverlay() {
    themeBtn.classList.add('ag-visible');
    if (overlayAtivo) return;
    overlayAtivo = true;
    requestAnimationFrame(function () { overlay.style.opacity = '1'; });
    esconderApp();
  }

  function mostrarApp() {
    clearTimeout(loadingTimer);
    clearInterval(clockTimer);
    marcarLogado(true);
    var style = document.getElementById('auth-gate-hide-app');
    if (style) style.remove();
    overlay.style.opacity = '0';
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 220);
    overlayAtivo = false;
    themeBtn.classList.remove('ag-visible');
    themePop.classList.remove('ag-open');
  }

  function saudacaoAtual() {
    var h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  // Monta a casca comum (atmosfera + card) — cada tela só passa o miolo do card
  function montarShell(cardHtml) {
    clearTimeout(loadingTimer);
    ativarOverlay();
    var frase = FRASES[Math.floor(Math.random() * FRASES.length)];
    overlay.innerHTML =
      '<div class="ag-shell">' +
        '<div class="ag-bg"><div class="ag-blob ag-blob-1"></div><div class="ag-blob ag-blob-2"></div><div class="ag-blob ag-blob-3"></div><div class="ag-grain"></div></div>' +
        '<div class="ag-atmos">' +
          '<div class="ag-brandmark">Escrevente TJSP</div>' +
          '<div class="ag-hero">' +
            '<h1 id="ag-greeting">' + saudacaoAtual() + '.</h1>' +
            '<p>Um espaço quieto pra organizar o estudo e manter o ritmo até a prova.</p>' +
          '</div>' +
          '<div class="ag-footer-row">' +
            '<p class="ag-quote">“' + frase + '”</p>' +
            '<span class="ag-clock" id="ag-clock"></span>' +
          '</div>' +
        '</div>' +
        '<div class="ag-formside"><div class="ag-card">' + cardHtml + '</div></div>' +
      '</div>';

    clearInterval(clockTimer);
    var clockEl = document.getElementById('ag-clock');
    function tick() {
      if (!clockEl || !clockEl.isConnected) { clearInterval(clockTimer); return; }
      clockEl.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    tick();
    clockTimer = setInterval(tick, 15000);
  }

  function fazerCartaoTremer() {
    var cardEl = overlay.querySelector('.ag-card');
    if (!cardEl) return;
    cardEl.classList.remove('ag-shake');
    void cardEl.offsetWidth;
    cardEl.classList.add('ag-shake');
  }

  function montarCampoSenha(id, placeholder, autocomplete) {
    return '<div class="ag-field">' + ICO.lock +
      '<input id="' + id + '" type="password" placeholder="' + placeholder + '" autocomplete="' + autocomplete + '" required minlength="6" style="padding-right:2.6rem">' +
      '<button type="button" class="ag-field-toggle" data-alvo="' + id + '" aria-label="Mostrar senha">' + ICO.eye + '</button>' +
    '</div>';
  }

  function wireTogglesSenha(root) {
    root.querySelectorAll('.ag-field-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.alvo);
        if (!input) return;
        var mostrando = input.type === 'text';
        input.type = mostrando ? 'password' : 'text';
        btn.innerHTML = mostrando ? ICO.eye : ICO.eyeOff;
        btn.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
      });
    });
  }

  // ── Tela: login ──
  function renderLoginForm(erro) {
    montarShell(
      '<h2>Que bom te ver de novo</h2>' +
      '<p class="ag-sub">Entre para continuar seus estudos</p>' +
      (erro ? '<div class="ag-alert ag-alert-err" role="alert">' + erro + '</div>' : '') +
      '<form id="auth-gate-form">' +
        '<div class="ag-field">' + ICO.mail + '<input id="auth-gate-email" type="email" placeholder="E-mail" autocomplete="username" required></div>' +
        montarCampoSenha('auth-gate-senha', 'Senha', 'current-password') +
        '<label class="ag-remember"><input type="checkbox" id="auth-gate-lembrar" checked> Manter conectada neste navegador</label>' +
        '<button type="submit" class="ag-btn" id="auth-gate-btn">Entrar</button>' +
      '</form>' +
      '<div class="ag-links">' +
        '<button type="button" class="ag-link" id="auth-gate-esqueci">Esqueci minha senha</button>' +
        '<button type="button" class="ag-link" id="auth-gate-ir-cadastro">Solicitar acesso</button>' +
      '</div>'
    );
    wireTogglesSenha(overlay);

    document.getElementById('auth-gate-ir-cadastro').addEventListener('click', function () { renderSignupForm(null); });
    document.getElementById('auth-gate-esqueci').addEventListener('click', function () {
      var emailField = document.getElementById('auth-gate-email');
      renderRecuperarSenha((emailField && emailField.value.trim()) || '');
    });

    document.getElementById('auth-gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('auth-gate-email').value.trim();
      var senha = document.getElementById('auth-gate-senha').value;
      var lembrar = document.getElementById('auth-gate-lembrar').checked;
      var btn = document.getElementById('auth-gate-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="ag-spinner"></span>Entrando…';
      var persistencia = lembrar ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
      window._fbAuth.setPersistence(persistencia)
        .then(function () { return window._fbAuth.signInWithEmailAndPassword(email, senha); })
        .catch(function (err) {
          var msg = 'Não foi possível entrar. Confira o e-mail e a senha.';
          if (err && err.code === 'auth/invalid-email') msg = 'E-mail inválido.';
          if (err && err.code === 'auth/too-many-requests') msg = 'Muitas tentativas — aguarde um pouco e tente de novo.';
          fazerCartaoTremer();
          renderLoginForm(msg);
        });
    });
  }

  // ── Tela: recuperar senha ──
  function renderRecuperarSenha(emailInicial, mensagem, erro) {
    montarShell(
      '<h2>Recuperar senha</h2>' +
      '<p class="ag-sub">Digite seu e-mail — enviamos um link pra criar uma senha nova.</p>' +
      (erro ? '<div class="ag-alert ag-alert-err" role="alert">' + erro + '</div>' : '') +
      (mensagem ? '<div class="ag-alert ag-alert-ok" role="status">' + mensagem + '</div>' : '') +
      '<form id="auth-gate-recuperar-form">' +
        '<div class="ag-field" style="margin-bottom:1.3rem">' + ICO.mail + '<input id="auth-gate-recuperar-email" type="email" placeholder="E-mail" autocomplete="username" required value="' + (emailInicial || '').replace(/"/g, '') + '"></div>' +
        '<button type="submit" class="ag-btn" id="auth-gate-recuperar-btn">Enviar link de recuperação</button>' +
      '</form>' +
      '<div class="ag-links" style="justify-content:center">' +
        '<button type="button" class="ag-link" id="auth-gate-voltar-login">Voltar pro login</button>' +
      '</div>'
    );

    document.getElementById('auth-gate-voltar-login').addEventListener('click', function () { renderLoginForm(null); });

    document.getElementById('auth-gate-recuperar-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('auth-gate-recuperar-email').value.trim();
      var btn = document.getElementById('auth-gate-recuperar-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="ag-spinner"></span>Enviando…';
      window._fbAuth.sendPasswordResetEmail(email)
        .then(function () {
          renderRecuperarSenha(email, 'Link enviado! Confere sua caixa de entrada (e o spam) e clica no link pra criar uma senha nova.');
        })
        .catch(function (err) {
          var msg = 'Não foi possível enviar o link. Confere se o e-mail está certo.';
          if (err && err.code === 'auth/invalid-email') msg = 'E-mail inválido.';
          if (err && err.code === 'auth/too-many-requests') msg = 'Muitas tentativas — aguarde um pouco e tente de novo.';
          renderRecuperarSenha(email, null, msg);
        });
    });
  }

  // ── Tela: solicitar acesso ──
  function renderSignupForm(erro) {
    montarShell(
      '<h2>Solicitar acesso</h2>' +
      '<p class="ag-sub">Crie uma conta — o acesso fica pendente até ser aprovado.</p>' +
      (erro ? '<div class="ag-alert ag-alert-err" role="alert">' + erro + '</div>' : '') +
      '<form id="auth-gate-signup-form">' +
        '<div class="ag-field">' + ICO.mail + '<input id="auth-gate-signup-email" type="email" placeholder="E-mail" autocomplete="username" required></div>' +
        montarCampoSenha('auth-gate-signup-senha', 'Crie uma senha (mín. 6 caracteres)', 'new-password') +
        montarCampoSenha('auth-gate-signup-senha2', 'Confirme a senha', 'new-password') +
        '<p class="ag-hint">Depois de enviar, você recebe um aviso assim que o acesso for liberado.</p>' +
        '<button type="submit" class="ag-btn" id="auth-gate-signup-btn">Solicitar acesso</button>' +
      '</form>' +
      '<div class="ag-links" style="justify-content:center">' +
        '<button type="button" class="ag-link" id="auth-gate-ir-login">Já tenho acesso — entrar</button>' +
      '</div>'
    );
    wireTogglesSenha(overlay);

    document.getElementById('auth-gate-ir-login').addEventListener('click', function () { renderLoginForm(null); });

    document.getElementById('auth-gate-signup-form').addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        var email = document.getElementById('auth-gate-signup-email').value.trim();
        var senha = document.getElementById('auth-gate-signup-senha').value;
        var senha2 = document.getElementById('auth-gate-signup-senha2').value;
        if (senha !== senha2) { fazerCartaoTremer(); renderSignupForm('As senhas não coincidem.'); return; }
        if (typeof window._fbAuth === 'undefined' || typeof firebase === 'undefined') {
          fazerCartaoTremer();
          renderSignupForm('O sistema de login não carregou direito. Recarregue a página e tente de novo.');
          return;
        }
        var btn = document.getElementById('auth-gate-signup-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="ag-spinner"></span>Enviando…';
        window._fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
          .then(function () { return window._fbAuth.createUserWithEmailAndPassword(email, senha); })
          .then(function (cred) {
            if (!window._fbDb) return;
            return window._fbDb.collection('usuarios_autorizados').doc(cred.user.uid).set({
              email: email, aprovado: false, criado_em: firebase.firestore.FieldValue.serverTimestamp(),
            });
          })
          .catch(function (err) {
            var msg = 'Não foi possível enviar a solicitação.';
            if (err && err.code === 'auth/email-already-in-use') msg = 'Esse e-mail já tem uma conta — tenta entrar em vez de solicitar de novo.';
            else if (err && err.code === 'auth/invalid-email') msg = 'E-mail inválido.';
            else if (err && err.code === 'auth/weak-password') msg = 'Senha muito fraca — use pelo menos 6 caracteres.';
            else if (err && err.code === 'permission-denied') msg = 'A conta foi criada, mas o pedido de acesso não pôde ser salvo (regras do banco de dados). Avise a administradora.';
            else if (err && err.code) msg = 'Erro: ' + err.code;
            else if (err && err.message) msg = 'Erro: ' + err.message;
            fazerCartaoTremer();
            renderSignupForm(msg);
          });
        // onAuthStateChanged cuida do que acontece depois (tela de aguardando aprovação)
      } catch (errGeral) {
        fazerCartaoTremer();
        renderSignupForm('Erro inesperado: ' + (errGeral && errGeral.message ? errGeral.message : errGeral));
      }
    });
  }

  // ── Tela: aguardando aprovação ──
  function renderAguardandoAprovacao(email) {
    montarShell(
      '<div class="ag-waiting">' +
        '<div class="ag-waiting-icon">' + ICO.hourglass + '</div>' +
        '<h2>Quase lá</h2>' +
        '<p class="ag-sub">Seu pedido de acesso (<strong>' + email + '</strong>) está aguardando aprovação. Esta página atualiza sozinha assim que for liberado — pode deixar aberta.</p>' +
        '<button type="button" class="ag-link" id="auth-gate-sair-espera">Sair</button>' +
      '</div>'
    );
    document.getElementById('auth-gate-sair-espera').addEventListener('click', function () {
      window._fbAuth.signOut().then(function () { location.reload(); });
    });
  }

  function iniciarSincronizacao(user) {
    if (typeof window._syncOAB !== 'undefined' && window._syncOAB.iniciar) {
      window._syncOAB.iniciar(user);
    }
  }

  if (jaLogouAntes) {
    loadingTimer = setTimeout(ativarOverlay, 2000);
  } else {
    ativarOverlay();
  }

  if (typeof window._fbAuth === 'undefined') {
    ativarOverlay();
    overlay.innerHTML = '<div class="ag-shell"><div class="ag-formside"><div class="ag-card" style="text-align:center"><p class="ag-sub">Não foi possível carregar o sistema de login. Verifique sua conexão e recarregue a página.</p></div></div></div>';
    return;
  }

  // Cache local de aprovação — evita esperar a Firestore ir e voltar em
  // toda navegação (site multi-página, sem SPA: cada clique recarrega
  // tudo do zero). Sem isso, o overlay otimista (1200ms) quase sempre
  // vencia antes da resposta da Firestore chegar, causando o "pisca e
  // demora ~5s" — o app aparecia, sumia, e só voltava quando a rede
  // respondia. Guarda o uid já aprovado e mostra o app na hora nas
  // próximas vezes; a checagem em segundo plano continua rodando e
  // revoga o acesso se o status realmente mudar.
  var APROVADO_KEY = 'tj_approved_uid';

  var _unsubAprovacao = null;
  window._fbAuth.onAuthStateChanged(function (user) {
    if (_unsubAprovacao) { _unsubAprovacao(); _unsubAprovacao = null; }
    if (!user) { try { localStorage.removeItem(APROVADO_KEY); } catch (e) {} renderLoginForm(null); return; }

    if (user.email === ADMIN_EMAIL) { mostrarApp(); iniciarSincronizacao(user); return; }
    if (!window._fbDb) { mostrarApp(); iniciarSincronizacao(user); return; }

    var jaAprovadoAntes = false;
    try { jaAprovadoAntes = localStorage.getItem(APROVADO_KEY) === user.uid; } catch (e) {}
    if (jaAprovadoAntes) { mostrarApp(); iniciarSincronizacao(user); }

    _unsubAprovacao = window._fbDb.collection('usuarios_autorizados').doc(user.uid).onSnapshot(function (snap) {
      var dados = snap.exists ? snap.data() : null;
      if (dados && dados.aprovado === true) {
        try { localStorage.setItem(APROVADO_KEY, user.uid); } catch (e) {}
        mostrarApp(); iniciarSincronizacao(user);
      } else {
        try { localStorage.removeItem(APROVADO_KEY); } catch (e) {}
        renderAguardandoAprovacao(user.email || '');
      }
    }, function () { if (!jaAprovadoAntes) renderAguardandoAprovacao(user.email || ''); });
  });
})();
