// ============================================================
// OAB · Histórico de Humor (base do Perfil / diário de evolução)
// Cada registro de humor é salvo automaticamente no localStorage,
// com data, horário, humor e emoji — sem precisar de botão "Salvar".
// ============================================================

(function () {
  const LOG_KEY = 'tj_humor_log';

  // Escala 1–5 na mesma ordem em que os botões já aparecem no card
  // "Como você tá hoje?" — do estado mais desgastante ao mais positivo.
  const MOODS = [
    { label: 'Cansada',   emoji: '🌙', valor: 1 },
    { label: 'Perdida',   emoji: '🌀', valor: 2 },
    { label: 'Focada',    emoji: '✨', valor: 3 },
    { label: 'Confiante', emoji: '⚡', valor: 4 },
    { label: 'Empolgada', emoji: '🎉', valor: 5 },
  ];
  const POSITIVOS = ['Focada', 'Confiante', 'Empolgada'];
  const NEGATIVOS = ['Cansada', 'Perdida'];
  const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function getMoods() { return MOODS; }
  function moodInfo(label) { return MOODS.find(m => m.label === label) || null; }

  function _agora() {
    try { return typeof getCurrentDate === 'function' ? getCurrentDate() : new Date(); } catch (e) { return new Date(); }
  }

  // Data local (YYYY-MM-DD) — nunca usar toISOString().split('T')[0]
  // aqui, pois isso usa UTC e "vira o dia" perto da meia-noite em fusos
  // negativos (Brasil, UTC-3), fazendo o humor registado à noite cair
  // no dia errado.
  function _dataLocal(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; }
  }

  function _salvarLog(log) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {}
    try { localStorage.setItem('tj_local_rev', String(Date.now())); } catch (e) {}
    if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) {
      try { window._syncOAB.notificarAlteracaoLocal(LOG_KEY); } catch (e) {}
    }
  }

  // Registra automaticamente ao clicar num humor — sem precisar salvar.
  function registrarHumor(label) {
    const info = moodInfo(label);
    if (!info) return null;
    const agora = new Date(); // horário real do clique, mesmo com data simulada em getCurrentDate
    const dataBase = _agora();
    const data = _dataLocal(dataBase);
    const hora = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
    const entry = { data, hora, humor: label, emoji: info.emoji, valor: info.valor };

    const log = getLog();
    log.push(entry);
    _salvarLog(log);
    try {
      localStorage.setItem('mood_' + data, label); // compat com telas existentes
      if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) window._syncOAB.notificarAlteracaoLocal('mood_' + data);
    } catch (e) {}
    return entry;
  }

  function getHumorHoje() {
    const data = _dataLocal(_agora());
    const doDia = getLog().filter(e => e.data === data);
    return doDia.length ? doDia[doDia.length - 1] : null;
  }

  // Último registro de cada dia (para timeline, calendário e gráficos diários)
  function getHumorPorDia() {
    const porDia = {};
    getLog().forEach(e => { porDia[e.data] = e; });
    return porDia;
  }

  function getInsights() {
    const porDia = getHumorPorDia();
    const dias = Object.keys(porDia).sort();
    const total = dias.length;
    if (!total) return null;

    const freq = {};
    MOODS.forEach(m => { freq[m.label] = 0; });
    dias.forEach(d => { freq[porDia[d].humor]++; });
    const maisFrequenteEntry = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

    const porDiaSemana = {};
    dias.forEach(d => {
      const dow = new Date(d + 'T12:00:00').getDay();
      if (!porDiaSemana[dow]) porDiaSemana[dow] = { soma: 0, n: 0 };
      porDiaSemana[dow].soma += porDia[d].valor;
      porDiaSemana[dow].n++;
    });
    let melhorDow = null, piorDow = null, melhorMedia = -Infinity, piorMedia = Infinity;
    Object.entries(porDiaSemana).forEach(([dow, v]) => {
      const media = v.soma / v.n;
      if (media > melhorMedia) { melhorMedia = media; melhorDow = dow; }
      if (media < piorMedia) { piorMedia = media; piorDow = dow; }
    });

    let maxSeq = 0, seqAtual = 0;
    dias.forEach(d => {
      if (POSITIVOS.includes(porDia[d].humor)) { seqAtual++; maxSeq = Math.max(maxSeq, seqAtual); }
      else seqAtual = 0;
    });

    const diasEstressantes = dias.filter(d => NEGATIVOS.includes(porDia[d].humor)).length;

    const hoje = _agora();
    const limite7 = new Date(hoje); limite7.setDate(limite7.getDate() - 7);
    const limite14 = new Date(hoje); limite14.setDate(limite14.getDate() - 14);
    const limite30 = new Date(hoje); limite30.setDate(limite30.getDate() - 30);

    const ultimos7 = dias.filter(d => new Date(d) > limite7);
    const ultimos30 = dias.filter(d => new Date(d) > limite30);
    const anteriores7 = dias.filter(d => new Date(d) > limite14 && new Date(d) <= limite7);

    const media = arr => arr.length ? arr.reduce((s, d) => s + porDia[d].valor, 0) / arr.length : null;
    const mediaSemana = media(ultimos7);
    const mediaSemanaAnterior = media(anteriores7);
    const mediaUltimos30 = media(ultimos30);

    let tendencia = null;
    if (mediaSemana !== null && mediaSemanaAnterior !== null) {
      const diff = mediaSemana - mediaSemanaAnterior;
      tendencia = diff > 0.15 ? 'subindo' : diff < -0.15 ? 'caindo' : 'estável';
    }

    return {
      totalDias: total,
      maisFrequente: maisFrequenteEntry[1] > 0 ? {
        humor: maisFrequenteEntry[0],
        emoji: moodInfo(maisFrequenteEntry[0]).emoji,
        pct: Math.round(maisFrequenteEntry[1] / total * 100),
      } : null,
      melhorDia: melhorDow !== null ? DIAS_SEMANA[melhorDow] : null,
      piorDia: piorDow !== null ? DIAS_SEMANA[piorDow] : null,
      maxSequenciaFeliz: maxSeq,
      diasEstressantes,
      mediaSemana,
      mediaSemanaAnterior,
      mediaUltimos30,
      tendencia,
      distribuicao: MOODS.map(m => ({
        label: m.label, emoji: m.emoji,
        pct: total ? Math.round(freq[m.label] / total * 100) : 0,
        count: freq[m.label],
      })),
    };
  }

  // Últimos N dias com registro, ordenado do mais recente (para gráfico de evolução)
  function getEvolucao(dias) {
    const porDia = getHumorPorDia();
    const hoje = _agora();
    const out = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const ds = _dataLocal(d);
      out.push({ data: ds, registro: porDia[ds] || null });
    }
    return out;
  }

  window.HumorOAB = {
    getMoods, moodInfo, registrarHumor, getHumorHoje, getHumorPorDia, getLog,
    getInsights, getEvolucao, POSITIVOS, NEGATIVOS, DIAS_SEMANA, DIAS_SEMANA_ABREV,
  };
})();
