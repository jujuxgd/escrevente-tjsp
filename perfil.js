// ============================================================
// OAB · Perfil do Usuário (nome + foto, salvos no localStorage)
// ============================================================

(function () {
  const NAME_KEY = 'tj_perfil_nome';
  const FOTO_KEY = 'tj_perfil_foto';
  const GENERO_KEY = 'tj_perfil_genero'; // 'f' (padrão) ou 'm'
  const DEFAULT_NAME = 'Estudante';

  function getNome() {
    try { return (localStorage.getItem(NAME_KEY) || '').trim() || DEFAULT_NAME; } catch (e) { return DEFAULT_NAME; }
  }
  function getFoto() {
    try { return localStorage.getItem(FOTO_KEY) || ''; } catch (e) { return ''; }
  }
  function _notificar(chave) {
    try { localStorage.setItem('tj_local_rev', String(Date.now())); } catch (e) {}
    if (window._syncOAB && window._syncOAB.notificarAlteracaoLocal) {
      try { window._syncOAB.notificarAlteracaoLocal(chave); } catch (e) {}
    }
  }
  function setNome(nome) {
    try { localStorage.setItem(NAME_KEY, (nome || '').trim() || DEFAULT_NAME); } catch (e) {}
    _notificar(NAME_KEY);
  }
  function setFoto(dataUrl) {
    try {
      if (dataUrl) localStorage.setItem(FOTO_KEY, dataUrl);
      else localStorage.removeItem(FOTO_KEY);
    } catch (e) {}
    _notificar(FOTO_KEY);
  }
  function getGenero() {
    try { return localStorage.getItem(GENERO_KEY) === 'm' ? 'm' : 'f'; } catch (e) { return 'f'; }
  }
  function setGenero(g) {
    try { localStorage.setItem(GENERO_KEY, g === 'm' ? 'm' : 'f'); } catch (e) {}
    _notificar(GENERO_KEY);
  }

  // Formas masculinas equivalentes — usadas só para EXIBIÇÃO. Os dados
  // internos (humor.js, estatísticas etc.) continuam sempre salvos e
  // comparados no feminino, isso é puramente cosmético na tela.
  const MASC_MAP = {
    'Cansada': 'Cansado',   'cansada': 'cansado',
    'Perdida': 'Perdido',   'perdida': 'perdido',
    'Focada': 'Focado',     'focada': 'focado',
    'Confiante': 'Confiante', 'confiante': 'confiante',
    'Empolgada': 'Empolgado', 'empolgada': 'empolgado',
    'Estudante': 'Estudante', 'estudante': 'estudante',
    'Logada': 'Logado', 'logada': 'logado',
  };
  // Troca o final de uma frase que termina numa palavra no feminino
  // (ex: "Você esteve focada" -> "Você esteve focado"), sem precisar
  // reescrever a frase toda em cada tela que exibe isso.
  function formatarGenero(texto) {
    if (getGenero() !== 'm' || !texto) return texto;
    if (Object.prototype.hasOwnProperty.call(MASC_MAP, texto)) return MASC_MAP[texto];
    // Tenta trocar a última palavra da frase, se for uma das conhecidas
    const partes = texto.split(' ');
    const ultima = partes[partes.length - 1];
    if (Object.prototype.hasOwnProperty.call(MASC_MAP, ultima)) {
      partes[partes.length - 1] = MASC_MAP[ultima];
      return partes.join(' ');
    }
    return texto;
  }

  function renderAvatar(container, nome, foto) {
    container.innerHTML = '';
    if (foto) {
      const img = document.createElement('img');
      img.src = foto;
      img.alt = nome;
      container.appendChild(img);
    } else {
      const img = document.createElement('img');
      img.src = 'foto-perfil.jpg';
      img.alt = nome;
      img.onerror = function () {
        this.remove();
        container.textContent = (nome.trim().charAt(0) || 'E').toUpperCase();
      };
      container.appendChild(img);
    }
  }

  function aplicarPerfil() {
    const nome = getNome();
    const foto = getFoto();
    document.querySelectorAll('.profile-card .name').forEach(el => { el.textContent = nome; });
    document.querySelectorAll('.profile-avatar').forEach(av => renderAvatar(av, nome, foto));
    document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = nome; });
  }

  // ── Compressão simples da foto via canvas (evita estourar o localStorage) ──
  function processarFoto(file, cb) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const size = 220;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        cb(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Modal "Editar Perfil" ──
  let _fotoTmp = null;

  function construirModal() {
    if (document.getElementById('perfil-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'perfil-modal-overlay';
    overlay.className = 'ju-modal-overlay';
    overlay.innerHTML = `
      <div class="ju-modal-panel">
        <div class="ju-modal-title">Editar Perfil</div>
        <div style="display:flex;justify-content:center;margin-bottom:1.2rem">
          <div style="position:relative">
            <div class="profile-avatar" id="perfil-modal-avatar" style="width:76px;height:76px;font-size:1.6rem"></div>
            <label for="perfil-modal-foto" style="position:absolute;bottom:-4px;right:-4px;width:26px;height:26px;border-radius:50%;background:var(--rose-600);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.72rem;border:2px solid var(--paper)" title="Trocar foto">✎</label>
            <input type="file" id="perfil-modal-foto" accept="image/*" style="display:none">
          </div>
        </div>
        <div class="ju-modal-field">
          <label for="perfil-modal-nome">Nome</label>
          <input type="text" id="perfil-modal-nome" maxlength="40" placeholder="Seu nome">
        </div>
        <div class="ju-modal-field">
          <label>Quer ser chamado(a) no...</label>
          <div style="display:flex;gap:0.5rem;margin-top:0.3rem">
            <button type="button" class="perfil-genero-btn" data-genero="f" style="flex:1;padding:0.55rem;border:1.5px solid var(--line);border-radius:var(--radius-sm);background:var(--paper);color:var(--ink);font-family:inherit;font-size:0.85rem;cursor:pointer;transition:all var(--transition)">Feminino</button>
            <button type="button" class="perfil-genero-btn" data-genero="m" style="flex:1;padding:0.55rem;border:1.5px solid var(--line);border-radius:var(--radius-sm);background:var(--paper);color:var(--ink);font-family:inherit;font-size:0.85rem;cursor:pointer;transition:all var(--transition)">Masculino</button>
          </div>
        </div>
        <div class="ju-modal-actions">
          <button class="btn" id="perfil-modal-cancelar">Cancelar</button>
          <button class="btn btn-primary" id="perfil-modal-salvar">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) fecharModal(); });
    document.getElementById('perfil-modal-cancelar').addEventListener('click', fecharModal);
    document.getElementById('perfil-modal-salvar').addEventListener('click', salvar);
    document.getElementById('perfil-modal-foto').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      processarFoto(file, dataUrl => {
        _fotoTmp = dataUrl;
        renderAvatar(document.getElementById('perfil-modal-avatar'), getNome(), _fotoTmp);
      });
    });
    document.querySelectorAll('.perfil-genero-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _generoTmp = btn.dataset.genero;
        _marcarGeneroSelecionado();
      });
    });
  }

  let _generoTmp = 'f';
  function _marcarGeneroSelecionado() {
    document.querySelectorAll('.perfil-genero-btn').forEach(btn => {
      const ativo = btn.dataset.genero === _generoTmp;
      btn.style.background = ativo ? 'var(--rose-deep)' : 'var(--paper)';
      btn.style.borderColor = ativo ? 'var(--rose-deep)' : 'var(--line)';
      btn.style.color = ativo ? '#fff' : 'var(--ink)';
    });
  }

  function abrirModal() {
    construirModal();
    _fotoTmp = getFoto();
    _generoTmp = getGenero();
    document.getElementById('perfil-modal-nome').value = getNome() === DEFAULT_NAME ? '' : getNome();
    renderAvatar(document.getElementById('perfil-modal-avatar'), getNome(), _fotoTmp);
    _marcarGeneroSelecionado();
    document.getElementById('perfil-modal-overlay').classList.add('active');
  }

  function fecharModal() {
    const overlay = document.getElementById('perfil-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function salvar() {
    const nomeInput = document.getElementById('perfil-modal-nome').value;
    setNome(nomeInput);
    setFoto(_fotoTmp);
    setGenero(_generoTmp);
    aplicarPerfil();
    fecharModal();
    // Recarrega pra qualquer texto gendrado na tela (humor, insights
    // etc.) já nascer certo, sem precisar de lógica extra em cada tela
    location.reload();
  }

  // ── Backup completo: exporta/importa TODO o localStorage do app ──
  const ULTIMO_BACKUP_KEY = 'tj_ultimo_backup';
  function getUltimoBackup() {
    try { return localStorage.getItem(ULTIMO_BACKUP_KEY) || null; } catch (e) { return null; }
  }
  // Reaproveitada tanto pelo export pra arquivo quanto pelo envio pra nuvem
  function coletarDadosLocalStorage() {
    const dados = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      dados[k] = localStorage.getItem(k);
    }
    return dados;
  }
  // Reaproveitada tanto pelo import de arquivo quanto pelo download da nuvem
  function aplicarDadosLocalStorage(dados) {
    if (!dados || typeof dados !== 'object') throw new Error('Dados inválidos');
    Object.keys(dados).forEach(k => {
      try {
        // null representa uma chave removida no aparelho de origem (ex.:
        // desmarcar uma videoaula) — setItem(k, null) gravaria a STRING
        // "null" em vez de refletir a remoção.
        if (dados[k] === null) localStorage.removeItem(k);
        else localStorage.setItem(k, dados[k]);
      } catch (e) {}
    });
  }
  function exportarBackupCompleto() {
    const dados = coletarDadosLocalStorage();
    const payload = { app: 'preparatorio-oab', exportado_em: new Date().toISOString(), dados };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const data = dataLocalHoje();
    a.href = url;
    a.download = `tj_backup_${data}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try { localStorage.setItem(ULTIMO_BACKUP_KEY, new Date().toISOString()); } catch (e) {}
  }

  function importarBackupCompleto(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const payload = JSON.parse(e.target.result);
          const dados = (payload && typeof payload === 'object' && payload.dados) ? payload.dados : payload;
          aplicarDadosLocalStorage(dados);
          resolve();
        } catch (err) { reject(err); }
      };
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  // Clicar no card do perfil (avatar/nome na sidebar) abre a página completa
  // /perfil.html — painel pessoal com humor, insights, histórico e gráficos.
  function injetarClickCard() {
    const jaNaPagina = /(^|\/)perfil\.html$/.test(location.pathname);
    document.querySelectorAll('.profile-card').forEach(card => {
      if (card.dataset.painelLigado) return;
      card.dataset.painelLigado = '1';
      if (jaNaPagina) return;
      card.addEventListener('click', () => { location.href = 'perfil.html'; });
    });
  }

  // ── Botão de editar sobre o avatar da sidebar ──
  // (a .profile-avatar tem overflow:hidden para recortar a foto em círculo,
  // então o botão precisa ficar num wrapper irmão, não dentro dela.)
  function injetarBotaoEditar() {
    document.querySelectorAll('.profile-card').forEach(card => {
      if (card.querySelector('.perfil-edit-btn')) return;
      const avatar = card.querySelector('.profile-avatar');
      if (!avatar) return;
      const wrap = document.createElement('div');
      wrap.className = 'perfil-avatar-wrap';
      wrap.style.cssText = 'position:relative;flex-shrink:0';
      avatar.parentNode.insertBefore(wrap, avatar);
      wrap.appendChild(avatar);

      const btn = document.createElement('button');
      btn.className = 'perfil-edit-btn';
      btn.title = 'Editar perfil';
      btn.setAttribute('aria-label', 'Editar perfil');
      btn.style.cssText = 'position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:var(--rose-600);color:#fff;border:2px solid var(--paper);display:flex;align-items:center;justify-content:center;font-size:.55rem;cursor:pointer;padding:0;line-height:1';
      btn.textContent = '✎';
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); abrirModal(); });
      wrap.appendChild(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    aplicarPerfil();
    injetarBotaoEditar();
    injetarClickCard();
  });

  window._perfilOAB = { getNome, getFoto, getGenero, setGenero, formatarGenero, abrirModal, exportarBackupCompleto, importarBackupCompleto, getUltimoBackup, coletarDadosLocalStorage, aplicarDadosLocalStorage };
})();
