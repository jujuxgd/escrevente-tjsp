// ============================================
// TJSP Escrevente · Plano de Estudos
// ============================================

// DATA DO SISTEMA
// Por padrão usa a data real, mas você pode simular datas pra testar
function getCurrentDate() {
  // Tenta pegar data simulada do localStorage (formato: YYYY-MM-DD)
  const simulated = localStorage.getItem('simulatedDate');
  if (simulated) {
    const [y, m, d] = simulated.split('-').map(Number);
    return new Date(y, m - 1, d); // mês é 0-indexed
  }
  return new Date();
}

// Usar no console pra testar: setSimulatedDate('2026-06-02')
function setSimulatedDate(dateStr) {
  localStorage.setItem('simulatedDate', dateStr);
  window.location.reload();
}

// Limpar simulação: clearSimulatedDate()
function clearSimulatedDate() {
  localStorage.removeItem('simulatedDate');
  window.location.reload();
}

// DATAS IMPORTANTES
const EXAM_DATE   = new Date(2027, 2, 14);  // 14 de março de 2027 — TJSP Escrevente
const STUDY_START = new Date(2026, 9, 20);  // 20 de outubro de 2026

// ── Calendário de dias úteis ───────────────────
function isWeekday(date) {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5;
}

// Retorna o número do dia de estudo (1-N) para uma data calendar.
// Conta apenas dias úteis a partir de 10/07/2026.
function getStudyDayForDate(date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const start = new Date(2026, 9, 20); start.setHours(0,0,0,0);
  if (d < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= d) {
    if (isWeekday(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.min(count, 120);
}

// Retorna true se hoje está na reta final (01–13 mar 2027)
function isRevisaoEstrategica() {
  const d = getCurrentDate();
  return d.getFullYear() === 2027 && d.getMonth() === 2 && d.getDate() >= 1 && d.getDate() <= 13;
}

// Retorna true se hoje é o dia da prova (14 de março de 2027)
function isDiaProva() {
  const d = getCurrentDate();
  return d.getFullYear() === 2027 && d.getMonth() === 2 && d.getDate() === 14;
}

// Nomes dos meses e dias em PT-BR
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT   = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function getFormattedDate(date) {
  const d = date || getCurrentDate();
  return `${DAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()].toLowerCase()}`;
}

function getMonthYear(date) {
  const d = date || getCurrentDate();
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

// Calcular dias restantes até a prova
function getDaysUntilExam() {
  const today = getCurrentDate();
  const diff = EXAM_DATE - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Retorna o dia de estudo atual baseado no calendário.
// Fins de semana retornam o número do último dia útil.
// Retorna o dia de estudo atual baseado no SEU PROGRESSO — não mais no
// calendário fixo. É sempre o primeiro dia do plano que você ainda não
// concluiu, então o app acompanha o seu ritmo (nos dias que você pode
// estudar), em vez de cobrar um cronograma rígido de datas.
function getStudyDay() {
  if (typeof carregarProgresso !== 'function') {
    // progresso.js ainda não carregou nesta página — usa o calendário
    // fixo só como último recurso, pra nunca quebrar a página
    let today = getCurrentDate();
    today.setHours(0,0,0,0);
    if (!isWeekday(today)) {
      const prev = new Date(today);
      while (!isWeekday(prev)) prev.setDate(prev.getDate() - 1);
      return getStudyDayForDate(prev);
    }
    return getStudyDayForDate(today) || 1;
  }
  const prog = carregarProgresso();
  let dia = 1;
  while (dia < 120 && prog.dias && prog.dias[String(dia)] && prog.dias[String(dia)].concluido) {
    dia++;
  }
  return dia;
}

// THEME TOGGLE
(function() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);

  const label = document.querySelector('.theme-label');
  if (label) label.textContent = next === 'dark' ? 'Modo claro' : 'Modo escuro';
}

// Aviso visível quando simulatedDate está ativo — sem isso, uma data de
// teste esquecida no localStorage faz "Hoje" mostrar o dia errado de forma
// silenciosa e muito difícil de perceber (só um F12 revelaria a causa).
(function _avisarDataSimulada() {
  const sim = localStorage.getItem('simulatedDate');
  if (!sim) return;
  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0524b;color:#fff;font-family:Inter,sans-serif;font-size:0.78rem;padding:0.4rem 0.8rem;text-align:center;display:flex;align-items:center;justify-content:center;gap:0.8rem';
  badge.innerHTML = `<span>🧪 Data simulada ativa: <strong>${sim}</strong> — "Hoje" não reflete a data real</span><button type="button" style="background:#fff;color:#c0524b;border:none;border-radius:4px;padding:0.15rem 0.6rem;font-size:0.72rem;font-weight:600;cursor:pointer">Limpar e usar data real</button>`;
  badge.querySelector('button').addEventListener('click', () => { if (typeof clearSimulatedDate === 'function') clearSimulatedDate(); });
  const _inserir = () => document.body.prepend(badge);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _inserir);
  else _inserir();
})();

document.addEventListener('DOMContentLoaded', () => {
  const label = document.querySelector('.theme-label');
  if (label) {
    const theme = document.documentElement.getAttribute('data-theme');
    label.textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
  }

  // Atualizar contadores na página
  updateCountdowns();

  // Badge de Revisar e streak — calculados após todos os scripts carregarem
  setTimeout(() => {
    atualizarBadgeRevisar();
    atualizarStreak();
  }, 0);
});

// Dias seguidos marcados em "Estudei hoje" (tj_ativo_check_v1). Hoje ainda sem marca não quebra a
// sequência, nem os dias leves/véspera do plano (marcados, contam).
function streakOAB() {
  let ck = {};
  try { ck = JSON.parse(localStorage.getItem('tj_ativo_check_v1') || '{}') || {}; } catch (e) {}
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const leve = {};
  if (window.CAL_ATIVO) CAL_ATIVO.dias.forEach(x => { if (x.tipo === 'leve' || x.tipo === 'vespera') leve[x.d] = 1; });
  const ok = k => !!(ck[k] && ck[k].feito);
  const d = getCurrentDate();
  let seq = 0;
  if (!ok(iso(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const k = iso(d);
    if (ok(k)) seq++;
    else if (!leve[k]) break;
    d.setDate(d.getDate() - 1);
  }
  return seq;
}
function atualizarStreak() {
  const seq = streakOAB();
  document.querySelectorAll('.streak-pill .count').forEach(el => { el.textContent = seq; });
  return seq;
}

function atualizarBadgeRevisar() {
  const links = document.querySelectorAll('a.nav-link[href="revisar.html"]');
  if (!links.length) return;
  // Garante que cada link de Revisar tenha um badge — cria se não existir
  const badges = [];
  links.forEach(link => {
    let b = link.querySelector('.badge');
    if (!b) {
      b = document.createElement('span');
      b.className = 'badge';
      b.style.display = 'none';
      b.textContent = '0';
      link.appendChild(b);
    }
    badges.push(b);
  });
  let count = 0;
  try {
    if (typeof contarRevisoesPendentes === 'function') {
      count = contarRevisoesPendentes();
    } else if (typeof carregarProgresso === 'function') {
      // Fallback (progresso.js antigo ainda não recarregado/cacheado)
      const prog    = carregarProgresso();
      const hoje    = new Date();
      Object.entries(prog.dias || {}).forEach(([numDia, d]) => {
        if (!d.concluido || !d.data_conclusao) return;
        const diff = Math.round((hoje - new Date(d.data_conclusao)) / 864e5);
        if (diff < 1) return;
        if (typeof getDadosDia === 'function' && !getDadosDia(parseInt(numDia))) return;
        count++;
      });
    }
  } catch(e) {}
  badges.forEach(b => {
    if (count > 0) { b.textContent = count; b.style.display = ''; }
    else b.style.display = 'none';
  });
}

// Atualizar todos os contadores de dias
function updateCountdowns() {
  const today = getCurrentDate();
  const studyDay = getStudyDay();
  const daysLeft = getDaysUntilExam();

  // Countdown até a prova
  document.querySelectorAll('.countdown .number, [data-countdown]').forEach(el => {
    el.textContent = daysLeft;
  });

  // Dia atual do plano
  document.querySelectorAll('[data-study-day]').forEach(el => {
    el.textContent = studyDay > 0 ? studyDay : '—';
  });

  // Número do dia no mês (ex: 19)
  document.querySelectorAll('[data-today-day]').forEach(el => {
    el.textContent = today.getDate();
  });

  // Nome do mês (ex: Junho)
  document.querySelectorAll('[data-today-month]').forEach(el => {
    el.textContent = MONTHS_PT[today.getMonth()];
  });

  // Data completa no breadcrumb (ex: Terça, 19 de maio)
  document.querySelectorAll('[data-full-date]').forEach(el => {
    el.textContent = getFormattedDate(today);
  });

  // Mês e ano para painel (ex: Junho 2026)
  document.querySelectorAll('[data-month-year]').forEach(el => {
    el.textContent = getMonthYear(today);
  });
}

// TOAST GLOBAL — feedback visual no lugar de alert()/confirm() nativos
function mostrarToast(mensagem, emoji) {
  let wrap = document.querySelector('.app-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'app-toast-wrap';
    document.body.appendChild(wrap);
  }
  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.innerHTML = `<span class="app-toast-icon">${emoji || '✦'}</span><span class="app-toast-text">${mensagem}</span>`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// CONFETE DE PÉTALAS
function showPetals() {
  const petals = ['🌸', '🌺', '💮', '🌷'];
  for (let i = 0; i < 25; i++) {
    setTimeout(() => {
      const petal = document.createElement('div');
      petal.className = 'petal';
      petal.textContent = petals[Math.floor(Math.random() * petals.length)];
      petal.style.left = Math.random() * 100 + 'vw';
      petal.style.animationDuration = (2 + Math.random() * 2) + 's';
      petal.style.fontSize = (1 + Math.random() * 1) + 'rem';
      document.body.appendChild(petal);
      setTimeout(() => petal.remove(), 4000);
    }, i * 80);
  }
}

// MOBILE NAV TOGGLE — com backdrop e fecho ao tocar fora / num link
function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  if (!sb) return;
  const open = sb.classList.toggle('open');
  let bd = document.getElementById('sidebar-backdrop');
  if (open) {
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'sidebar-backdrop';
      bd.addEventListener('click', toggleSidebar);
      // Precisa nascer dentro de .app (mesmo stacking context da sidebar).
      // Se ficar no <body>, o z-index dele passa a competir no contexto
      // raiz e acaba renderizando por cima da sidebar no iOS, bloqueando
      // os toques nos links de navegação.
      const app = document.querySelector('.app') || document.body;
      app.appendChild(bd);
    }
    bd.classList.add('show');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('menu-open');
  } else {
    if (bd) bd.classList.remove('show');
    document.body.style.overflow = '';
    document.body.classList.remove('menu-open');
  }
}

// Fecha o menu mobile ao clicar num link da nav
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.sidebar .nav-link').forEach(function (a) {
    a.addEventListener('click', function () {
      const sb = document.querySelector('.sidebar');
      if (sb && sb.classList.contains('open')) toggleSidebar();
    });
  });
});

// ── Sidebar retrátil (desktop) — estado persiste entre páginas ──
const SIDEBAR_COLLAPSE_KEY = 'tj_sidebar_collapsed';

function toggleSidebarCollapse() {
  const app = document.querySelector('.app');
  const btn = document.querySelector('.sidebar-toggle-btn');
  if (!app) return;
  const collapsed = app.classList.toggle('sidebar-collapsed');
  if (btn) {
    btn.classList.toggle('collapsed', collapsed);
    btn.textContent = collapsed ? '›' : '‹';
    btn.title = collapsed ? 'Mostrar menu' : 'Esconder menu';
  }
  localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
}

document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem(SIDEBAR_COLLAPSE_KEY) !== '1') return;
  const app = document.querySelector('.app');
  const btn = document.querySelector('.sidebar-toggle-btn');
  if (app) app.classList.add('sidebar-collapsed');
  if (btn) {
    btn.classList.add('collapsed');
    btn.textContent = '›';
    btn.title = 'Mostrar menu';
  }
});

// Modo Foco existe apenas no Caderno Legislativo (clToggleFocus, definido
// inline em caderno-legislativo.html) — não é mais injetado globalmente.

// ============================================
// STREAK DE ESTUDOS (dias seguidos)
// ============================================
// (Os itens "checklist de tarefas", "mood tracker" e "banco de erros
// rápido" que existiam aqui foram removidos: nenhuma página tem os
// elementos .task-check, #mood-selector ou #banco-erros que essas
// funções procuravam — eram código morto. Mood já tem um sistema
// próprio e funcional em humor.js.)

document.addEventListener('DOMContentLoaded', () => {
    let streak = parseInt(localStorage.getItem('ju_tj_streak') || '0');

    window.baterMetaDoDia = function() {
        const _hoje = getCurrentDate();
        const todayStr = _hoje.getFullYear() + '-' + String(_hoje.getMonth()+1).padStart(2,'0') + '-' + String(_hoje.getDate()).padStart(2,'0');
        const lastBeat = localStorage.getItem('ju_tj_streak_date');
        const nomeUsuario = (typeof window._perfilOAB !== 'undefined' && window._perfilOAB.getNome) ? window._perfilOAB.getNome() : 'Estudante';

        if (lastBeat === todayStr) {
            mostrarToast(`Você já bateu a meta hoje, ${nomeUsuario}! Volta amanhã e continue o streak!`, '💖');
            return;
        }

        streak++;
        localStorage.setItem('ju_tj_streak', streak);
        localStorage.setItem('ju_tj_streak_date', todayStr);
        try { localStorage.setItem('tj_local_rev', String(Date.now())); } catch (e) {}
        if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) {
            try {
                window._syncOAB.notificarAlteracaoLocal('ju_tj_streak');
                window._syncOAB.notificarAlteracaoLocal('ju_tj_streak_date');
            } catch (e) {}
        }

        showPetals();
        const seq = atualizarStreak();
        setTimeout(() => mostrarToast(`Mandou bem, ${nomeUsuario}! Streak: ${seq} ${seq === 1 ? 'dia seguido' : 'dias seguidos'}!`, '✨'), 300);
    };
});