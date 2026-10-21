// ============================================================
// TJSP · Sincronização com a nuvem (Firestore)
// Guarda um "snapshot" do localStorage num documento por usuário
// (backups_tjsp/{uid} — coleção separada da OAB, que usa backups/{uid}), reaproveitando a mesma estrutura de dados do
// backup em arquivo já existente em perfil.js. Não substitui o
// localStorage como fonte principal — só mantém uma cópia sincronizada
// na nuvem, protegida por login.
//
// Sincronização em tempo real: cada gravação local carimba
// localStorage['tj_local_rev'] com Date.now() (feito pelas próprias
// funções de gravação — salvarProgresso, erros_save, _saveSims, etc.),
// que também passam a CHAVE que mudou (ex.: 'tj_progresso_v1') pra
// notificarAlteracaoLocal/enviarParaNuvem. Com a chave em mãos, o push
// manda só {[chave]: valor, tj_local_rev} com merge:true — o Firestore
// faz merge por campo dentro do mapa "dados", preservando as chaves de
// OUTROS domínios de dados (ex.: simulados) que este aparelho não
// tocou. Sem isso, cada push mandava o localStorage inteiro e
// sobrescrevia o documento todo: dois aparelhos com alterações
// diferentes (ex.: simulados só no tablet, progresso só no notebook)
// faziam o último a salvar apagar os dados do outro na nuvem. Só o
// primeiro sync de uma conta e o reset total (index.html) continuam
// mandando o localStorage inteiro (sem chave) — nesses casos um
// overwrite completo é o comportamento certo.
// Esse carimbo viaja pro Firestore dentro do próprio blob de dados.
// Um listener onSnapshot compara a revisão da nuvem com a local: só
// aplica quando a nuvem é ESTRITAMENTE mais nova, o que naturalmente
// ignora o eco da própria escrita (mesma revisão) e evita repetir o
// loop de recarregamento que já existiu aqui antes.
// Snapshots com hasPendingWrites (escrita ainda não confirmada pelo
// servidor) são ignorados, e antes de aplicar um snapshot remoto mais
// novo o listener espera qualquer push local em andamento (guardado em
// _envioEmAndamento) terminar e reavalia a comparação — sem isso, um
// aparelho podia dar um location.reload() com dados da nuvem que ainda
// não incluíam a própria mudança que esse aparelho acabara de salvar
// (ex.: dar feedback num flashcard e ele sumir sem entrar no histórico
// de Estatísticas, porque o reload aconteceu antes do push terminar).
// ============================================================
(function () {
  const COLECAO = 'backups_tjsp';
  let _unsubscribe = null;
  let _aplicando = false;
  let _envioEmAndamento = null; // Promise do push mais recente ainda não confirmado pelo servidor
  let _revNuvem = 0; // maior tj_local_rev já visto na nuvem

  // Preferências/estado de ESTE aparelho: nunca vão pra nuvem nem são
  // aplicadas vindas dela (uma data simulada ou o "dia de hoje" de um
  // aparelho não podem mudar o outro).
  const SO_LOCAIS = ['theme', 'simulatedDate', 'tj_current_day', 'tj_current_day_date',
    'tj_auth_ok', 'tj_approved_uid', 'tj_uid_ativo', 'tj_ultimo_backup',
    'tj_rose_intensity', 'tj_rose_custom_hex', 'tj_accent_color', 'tj_sidebar_collapsed',
    'tj_pecas_cron', 'tj_ativo_dia', 'tj_sync_t', 'tj_vde_pasta', 'tj_lp_zoom3', 'tj_anki_cache'];
  function soLocal(k) { return SO_LOCAIS.indexOf(k) >= 0; }

  // ── Hora da última alteração de cada chave ──
  // Cada chave gravada carrega o horário em que mudou (local em tj_sync_t,
  // na nuvem no campo `t` do documento). Ao receber a nuvem, vale a chave
  // mais nova, uma a uma; antes, valia o documento inteiro do aparelho com a
  // revisão maior — uma gravação qualquer no PC fazia ele ignorar (e depois
  // sobrescrever) os flashcards feitos no celular.
  const K_T = 'tj_sync_t';
  let _tNuvem = {};
  let _nuvemLida = false; // só depois do 1º snapshot dá para saber o que a nuvem já tem
  function tLocal() { try { return JSON.parse(localStorage.getItem(K_T)) || {}; } catch (e) { return {}; } }
  function gravarTLocal(t) { try { localStorage.setItem(K_T, JSON.stringify(t)); } catch (e) {} }
  function carimbar(chave, ts) { const t = tLocal(); t[chave] = ts || Date.now(); gravarTLocal(t); return t[chave]; }

  // Chaves que são mapas de itens independentes: em vez de um lado vencer o
  // outro, junta item por item (o cartão/questão respondido por último vence).
  function jsonOu(v, padrao) { try { return v == null ? padrao : (JSON.parse(v) || padrao); } catch (e) { return padrao; } }
  const MESCLAR = {
    tj_fc_estado_v1: function (a, b) {
      const h = x => (x && x.h) || [];
      const ult = x => { const l = h(x); return l.length ? l[l.length - 1][0] : ''; };
      return (h(b).length > h(a).length || (h(b).length === h(a).length && ult(b) > ult(a))) ? b : a;
    },
    tj_bq_respostas: function (a, b) {
      return String((b && b.ultima_data) || '') > String((a && a.ultima_data) || '') ? b : a;
    },
    tj_ativo_check_v1: function (a, b) { return Object.assign({}, a, b); },
    tj_grifos_v1: function (a, b) { return ((b && b.u) || 0) > ((a && a.u) || 0) ? b : a; }
  };
  function mesclar(chave, local, nuvem) {
    const A = jsonOu(local, {}), B = jsonOu(nuvem, {}), f = MESCLAR[chave], out = {};
    Object.keys(A).forEach(k => { out[k] = A[k]; });
    Object.keys(B).forEach(k => { out[k] = (k in A) ? f(A[k], B[k]) : B[k]; });
    return JSON.stringify(out);
  }
  function filtrarSincronizaveis(dados) {
    const out = {};
    Object.keys(dados).forEach(k => { if (!soLocal(k)) out[k] = dados[k]; });
    return out;
  }

  // ── Estado visível da sincronização ──
  // Só aparece quando há o que avisar (enviando, sem conexão, falha ou
  // dados perto do limite de 1 MB do documento); some sozinho ao confirmar.
  const LIMITE_AVISO_BYTES = 800 * 1024;
  let _status = 'ok';
  let _pill = null;
  let _timerOculta = null;
  function tamanhoLocal() {
    try { return new Blob([JSON.stringify(filtrarSincronizaveis(window._perfilOAB.coletarDadosLocalStorage()))]).size; }
    catch (e) { return 0; }
  }
  function definirStatus(novo) {
    _status = novo;
    window._syncOAB && (window._syncOAB.status = novo);
    try { document.dispatchEvent(new CustomEvent('tj-sync-status', { detail: novo })); } catch (e) {}
    const TEXTOS = {
      enviando: 'Sincronizando…',
      offline: 'Sem conexão — salvo neste aparelho',
      erro: 'Falha ao sincronizar — tentando de novo',
      limite: 'Dados perto do limite da nuvem — exporte um backup',
      ok: 'Sincronizado ✓'
    };
    if (!document.body) return;
    if (!_pill) {
      _pill = document.createElement('div');
      _pill.setAttribute('role', 'status');
      _pill.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;' +
        'background:var(--paper,#fff);color:var(--ink,#2c2420);border:1px solid var(--line,#e8e0da);' +
        'border-radius:999px;padding:.4rem .9rem;font:500 .75rem Inter,sans-serif;' +
        'box-shadow:0 2px 10px rgba(44,36,32,.12);display:none;max-width:90vw;text-align:center';
      document.body.appendChild(_pill);
    }
    clearTimeout(_timerOculta);
    if (novo === 'enviando') { _pill.style.display = 'none'; return; }
    _pill.textContent = TEXTOS[novo] || '';
    _pill.style.display = 'block';
    if (novo === 'ok') _timerOculta = setTimeout(() => { _pill.style.display = 'none'; }, 1800);
  }

  function docRef(uid) {
    return window._fbDb.collection(COLECAO).doc(uid);
  }

  function localRev() {
    return Number(localStorage.getItem('tj_local_rev') || 0);
  }

  // Envia o estado atual pro Firestore, sempre em modo merge: com
  // `chave`, manda só essa chave do localStorage; sem `chave` (rede de
  // segurança ao trocar de aba/fechar), manda o localStorage inteiro,
  // mas ainda em merge — nunca apaga uma chave que só existe na nuvem
  // (de outro aparelho) que este aparelho não tem localmente.
  function enviarParaNuvem(uid, chave) {
    if (!window._fbDb || !uid || !window._perfilOAB) return Promise.resolve(false);
    if (chave && soLocal(chave)) return Promise.resolve(false);
    // Rede de segurança (sem chave): só envia se este aparelho tem algo
    // mais novo que a nuvem. Sem isso, um aparelho que ficou offline
    // mandava o localStorage velho com tj_local_rev menor e fazia a
    // revisão da nuvem RETROCEDER — o outro aparelho ficava ignorando
    // mudanças e os dois divergiam sem perceber.
    if (!chave && localRev() <= _revNuvem) return Promise.resolve(false);
    // localStorage.getItem devolve null quando a chave foi removida (ex.:
    // desmarcar uma videoaula, cancelar uma edição sem conteúdo anterior).
    // Manda esse null como valor de campo mesmo (Firestore guarda null de
    // verdade, não apaga o campo) — aplicarDadosLocalStorage sabe converter
    // esse null de volta num removeItem local no outro aparelho, em vez de
    // gravar a string "null" (o que localStorage.setItem faria).
    const tl = tLocal();
    let dados, t = {};
    if (chave) {
      dados = { [chave]: localStorage.getItem(chave), tj_local_rev: localStorage.getItem('tj_local_rev') };
      t[chave] = tl[chave] || carimbar(chave);
    } else {
      // Rede de segurança: só as chaves que mudaram aqui depois da última
      // versão vista na nuvem — nunca o localStorage inteiro por cima.
      if (!_nuvemLida) return Promise.resolve(false);
      dados = {};
      const todos = filtrarSincronizaveis(window._perfilOAB.coletarDadosLocalStorage());
      Object.keys(todos).forEach(k => {
        if ((tl[k] || 0) > (_tNuvem[k] || 0)) { dados[k] = todos[k]; t[k] = tl[k]; }
      });
      if (!Object.keys(dados).length) return Promise.resolve(false);
      dados.tj_local_rev = String(Math.max(localRev(), _revNuvem));
    }
    Object.keys(t).forEach(k => { _tNuvem[k] = Math.max(_tNuvem[k] || 0, t[k]); });
    const payload = { dados, t, atualizado_em: firebase.firestore.FieldValue.serverTimestamp() };
    if (navigator.onLine === false) { definirStatus('offline'); }
    const escrita = docRef(uid).set(payload, { merge: true }).then(() => {
      try { localStorage.setItem('tj_ultimo_backup', new Date().toISOString()); } catch (e) {}
      definirStatus(tamanhoLocal() > LIMITE_AVISO_BYTES ? 'limite' : 'ok');
      return true;
    }).catch(err => {
      console.error('Erro ao enviar pra nuvem:', err);
      definirStatus(navigator.onLine === false ? 'offline' : 'erro');
      _agendarNovaTentativa(uid);
      return false;
    });
    // Guardado pra handleSnapshot esperar antes de decidir se a nuvem
    // está mais nova (ver comentário em handleSnapshot).
    _envioEmAndamento = escrita;
    return escrita;
  }

  // Reenvia o localStorage (só se houver algo mais novo que a nuvem)
  // quando a conexão volta ou depois de uma falha.
  let _tentando = null;
  function _agendarNovaTentativa(uid) {
    if (_tentando) return;
    _tentando = setTimeout(() => { _tentando = null; enviarParaNuvem(uid); }, 15000);
  }

  // Overwrite de verdade (sem merge) — só faz sentido quando a intenção
  // é apagar o que estiver na nuvem: primeiro sync de uma conta nova
  // (não existe doc ainda, não faz diferença) e o reset total do app
  // (index.html), onde o objetivo é justamente zerar tudo, inclusive
  // na nuvem.
  function enviarSnapshotCompleto(uid) {
    if (!window._fbDb || !uid || !window._perfilOAB) return Promise.resolve(false);
    const dados = filtrarSincronizaveis(window._perfilOAB.coletarDadosLocalStorage());
    return docRef(uid).set({
      dados,
      atualizado_em: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(() => {
      try { localStorage.setItem('tj_ultimo_backup', new Date().toISOString()); } catch (e) {}
      return true;
    }).catch(err => { console.error('Erro ao enviar pra nuvem:', err); return false; });
  }

  // Baixa o snapshot da nuvem e aplica no localStorage deste aparelho
  // (fetch único — usado pelo botão manual "Baixar da nuvem").
  function baixarDaNuvem(uid) {
    if (!window._fbDb || !uid || !window._perfilOAB) return Promise.resolve(null);
    return docRef(uid).get().then(snap => {
      if (!snap.exists) return null;
      const data = snap.data();
      if (data && data.dados) {
        window._perfilOAB.aplicarDadosLocalStorage(filtrarSincronizaveis(data.dados));
        return data;
      }
      return null;
    }).catch(err => { console.error('Erro ao baixar da nuvem:', err); return null; });
  }

  // Um campo de formulário focado não deve levar um reload no meio da
  // digitação — tenta de novo em breve em vez de aplicar na hora.
  function aguardandoDigitacao() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
  }

  // Compara a nuvem com este aparelho chave a chave. Devolve as chaves que
  // precisam ser gravadas aqui e as que este aparelho precisa reenviar.
  function reconciliar(data) {
    const dados = filtrarSincronizaveis(data.dados || {}), tn = data.t || {}, tl = tLocal();
    const revNuvem = Number((data.dados || {}).tj_local_rev || 0);
    const aplicar = {}, reenviar = [];
    Object.keys(dados).forEach(k => {
      if (k === 'tj_local_rev') return;
      const vn = dados[k], vl = localStorage.getItem(k);
      if (vn === vl) return;
      if (MESCLAR[k] && vn != null && vl != null) {
        const m = mesclar(k, vl, vn);
        if (m !== vl) aplicar[k] = m;
        if (m !== vn) reenviar.push(k);
        return;
      }
      if (tn[k] || tl[k]) {
        if ((tn[k] || 0) > (tl[k] || 0)) aplicar[k] = vn;
        return;
      }
      // Chave antiga, sem horário dos dois lados: vale a regra de antes.
      if (vl == null || revNuvem > localRev()) aplicar[k] = vn;
    });
    return { aplicar, reenviar, tn };
  }

  function aplicarSnapshotRemoto(uid, data, tentativa) {
    if (_aplicando) return;
    if (aguardandoDigitacao() && (tentativa || 0) < 20) {
      setTimeout(() => aplicarSnapshotRemoto(uid, data, (tentativa || 0) + 1), 1000);
      return;
    }
    const r = reconciliar(data);
    const chaves = Object.keys(r.aplicar);
    if (chaves.length) {
      const tl = tLocal();
      chaves.forEach(k => {
        try { if (r.aplicar[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, r.aplicar[k]); } catch (e) {}
        tl[k] = Math.max(tl[k] || 0, r.tn[k] || 0);
      });
      gravarTLocal(tl);
      const revNuvem = Number((data.dados || {}).tj_local_rev || 0);
      if (revNuvem > localRev()) try { localStorage.setItem('tj_local_rev', String(revNuvem)); } catch (e) {}
    }
    const envios = r.reenviar.map(k => { carimbar(k); return enviarParaNuvem(uid, k); });
    if (chaves.length) {
      _aplicando = true;
      Promise.all(envios).then(() => location.reload(), () => location.reload());
    }
  }

  function handleSnapshot(uid, snap) {
    if (_aplicando) return;
    // Eco otimista de uma escrita ainda não confirmada pelo servidor
    // (nossa própria ou não) — espera confirmar antes de decidir algo.
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists) {
      // Primeira vez usando sync nesta conta — envia o que já existe localmente.
      enviarSnapshotCompleto(uid);
      return;
    }
    const data = snap.data();
    if (!data || !data.dados) return;
    _revNuvem = Math.max(_revNuvem, Number(data.dados.tj_local_rev || 0));
    Object.keys(data.t || {}).forEach(k => { _tNuvem[k] = Math.max(_tNuvem[k] || 0, data.t[k]); });
    _nuvemLida = true;
    // Um push deste aparelho ainda em voo pode não estar neste snapshot:
    // espera ele confirmar e relê o documento antes de comparar.
    Promise.resolve(_envioEmAndamento).then(() => docRef(uid).get()).then(freshSnap => {
      if (!freshSnap.exists) return;
      const freshData = freshSnap.data();
      if (freshData && freshData.dados) aplicarSnapshotRemoto(uid, freshData);
    }).catch(err => console.error('Erro ao reavaliar snapshot remoto:', err));
  }

  // Dados pessoais ficam em dezenas de chaves diferentes no localStorage
  // (progresso, humor, perfil, microresumos, questões, simulados...).
  // Mais seguro limpar TUDO exceto uma pequena lista de preferências de
  // aparelho (tema, cor) do que tentar listar cada chave pessoal à mão.
  const PRESERVAR_AO_TROCAR_CONTA = ['theme', 'tj_rose_intensity', 'tj_rose_custom_hex', 'simulatedDate'];
  function limparDadosLocaisDoApp() {
    const chaves = [];
    for (let i = 0; i < localStorage.length; i++) chaves.push(localStorage.key(i));
    chaves.forEach(k => {
      if (!PRESERVAR_AO_TROCAR_CONTA.includes(k)) {
        try { localStorage.removeItem(k); } catch (e) {}
      }
    });
  }

  // Chamada pelo auth-guard.js assim que o login é confirmado.
  function iniciar(user) {
    const uid = user.uid;

    // Este aparelho pode ter sido usado por outra conta antes (ex: testar
    // o cadastro no mesmo navegador do admin) -- se o dono da sessão
    // mudou, os dados locais pertencem à pessoa anterior e não podem
    // "vazar" pra conta nova.
    let uidAnterior = null;
    try { uidAnterior = localStorage.getItem('tj_uid_ativo'); } catch (e) {}
    if (uidAnterior && uidAnterior !== uid) {
      limparDadosLocaisDoApp();
      try { localStorage.setItem('tj_uid_ativo', uid); } catch (e) {}
      // A página já desenhou na tela com os dados antigos antes desta
      // limpeza rodar (ela só acontece depois que o login termina de
      // confirmar) -- sem recarregar, o visual continuaria mostrando
      // o nome/progresso da conta anterior mesmo com o localStorage
      // já limpo por baixo.
      location.reload();
      return;
    }
    try { localStorage.setItem('tj_uid_ativo', uid); } catch (e) {}

    window._syncOAB._uid = uid;

    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    _unsubscribe = docRef(uid).onSnapshot(
      snap => handleSnapshot(uid, snap),
      err => console.error('Erro no listener de sincronização:', err)
    );

    // Envia pra nuvem silenciosamente ao trocar de aba/sair da página,
    // como rede de segurança além do push logo após cada gravação.
    window.addEventListener('online', () => enviarParaNuvem(uid));
    window.addEventListener('offline', () => definirStatus('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') enviarParaNuvem(uid);
    });
    window.addEventListener('pagehide', () => enviarParaNuvem(uid));
  }

  // Chamada pelas funções de gravação (salvarProgresso, erros_save,
  // _saveSims, etc.) logo depois de carimbar tj_local_rev, pra propagar
  // a mudança rápido em vez de esperar o usuário trocar de aba.
  function notificarAlteracaoLocal(chave) {
    if (!soLocal(chave)) carimbar(chave);
    const uid = window._syncOAB._uid;
    if (!uid) return;
    enviarParaNuvem(uid, chave);
  }

  window._syncOAB = { iniciar, enviarParaNuvem, enviarSnapshotCompleto, baixarDaNuvem, notificarAlteracaoLocal, _uid: null };
})();
