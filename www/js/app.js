/* Prova ACLS — App de prova em tablet (vanilla JS)
 * Fluxo: identificação -> questões (1 por tela) -> revisão -> envio -> confirmação
 */
(() => {
  'use strict';

  // Endpoint da API de envio. Em produção (Cloudflare Pages) usa caminho relativo.
  // Permite override via window.ACLS_API_URL (ex.: quando empacotado no APK apontando p/ Worker).
  const API_URL = (window.ACLS_API_URL || '/api/enviar');
  const STORAGE_KEY = 'acls_sessao_v1';
  const OUTBOX_KEY = 'acls_outbox_v1';   // envios pendentes (resistentes a fechar o app)

  const app = document.getElementById('app');
  const state = {
    prova: null,
    aluno: { nome: '', turma: '', edicao: '' },
    respostas: {},   // { [id]: "A" }
    indice: 0,
    enviando: false,
    flushing: false,      // mutex do reenvio da outbox
    envioAtual: null,     // payload do envio em andamento (reusado pelo "Tentar novamente")
    tela: 'carregando',   // carregando | identificacao | questao | revisao | fim
  };

  // Reenvia provas pendentes de sessões anteriores sempre que a conexão voltar.
  window.addEventListener('online', () => { flushOutbox(); });

  // ---------- Persistência local (resistente a fechar o app no meio) ----------
  function salvar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        aluno: state.aluno, respostas: state.respostas, indice: state.indice,
      }));
    } catch (_) { /* modo privado / storage cheio: segue sem persistir */ }
  }
  function restaurar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (s && s.aluno && s.aluno.nome) {
        state.aluno = s.aluno;
        state.respostas = s.respostas || {};
        state.indice = s.indice || 0;
        return true;
      }
    } catch (_) {}
    return false;
  }
  function limparSessao() {
    state.aluno = { nome: '', turma: '', edicao: '' };
    state.respostas = {};
    state.indice = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  // ---------- Outbox: envios pendentes (garante que nenhuma prova se perca) ----------
  // Uma prova enviada é gravada aqui ANTES de tentar a rede; só sai da fila após
  // confirmação do servidor. Se o app for fechado com envio pendente, o flush no
  // próximo carregamento (ou quando a conexão voltar) reenvia automaticamente.
  function lerOutbox() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || []; }
    catch (_) { return []; }
  }
  function gravarOutbox(fila) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(fila)); } catch (_) {}
  }
  function enfileirar(payload) {
    const fila = lerOutbox();
    if (!fila.some(p => p._id === payload._id)) { fila.push(payload); gravarOutbox(fila); }
  }
  function removerDaOutbox(id) {
    gravarOutbox(lerOutbox().filter(p => p._id !== id));
  }
  // Envia um payload à API; resolve true se aceito, lança em erro de rede/servidor.
  async function postar(payload) {
    const { _id, ...corpo } = payload;   // _id é interno, não vai para o servidor
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const data = await res.json().catch(() => ({}));
    // Só consideramos entregue quando o servidor confirma explicitamente {success:true}.
    // Assim um 200 mal-roteado (ex.: fallback SPA em HTML) não é contado como enviado.
    if (!res.ok || data.success !== true) {
      throw new Error(data.error || ('HTTP ' + res.status));
    }
    return true;
  }
  // Tenta reenviar tudo que ficou pendente de execuções anteriores (silencioso).
  // Mutex (state.flushing) impede que dois gatilhos (load, evento online, retry)
  // postem o mesmo payload em paralelo e dupliquem o email.
  async function flushOutbox() {
    if (state.flushing || state.enviando) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    state.flushing = true;
    try {
      for (const payload of lerOutbox()) {
        try { await postar(payload); removerDaOutbox(payload._id); }
        catch (_) { return; }   // rede indisponível: mantém na fila p/ próxima tentativa
      }
    } finally { state.flushing = false; }
  }

  // ---------- Utilidades ----------
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const totalQ = () => state.prova.questoes.length;
  const respondidas = () => Object.keys(state.respostas).length;

  // Imagem de ECG a exibir na questão `i`. Em blocos de cenário (várias questões
  // com o MESMO texto de cenário), o traçado aparece só na 1ª questão do JSON, mas
  // é clinicamente referenciado por todas (ex.: Q32-35 "se o ritmo permanecer o
  // mesmo"). Aqui a questão herda o ECG da 1ª questão do bloco de cenário idêntico,
  // para o aluno sempre ter o ritmo à vista sem precisar navegar de volta.
  function imagemDaQuestao(q, i) {
    if (q.image) return { arquivo: q.image, herdada: false };
    if (q.scenario) {
      for (let j = i - 1; j >= 0; j--) {
        const ant = state.prova.questoes[j];
        if (ant.scenario !== q.scenario) break;   // saiu do bloco do cenário
        if (ant.image) return { arquivo: ant.image, herdada: true };
      }
    }
    return null;
  }

  // ---------- Carregamento da prova ----------
  async function carregar() {
    renderCentro('spinner', '', 'Carregando prova…');
    try {
      const res = await fetch('data/PROVA_ACLS.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.prova = await res.json();
      if (!Array.isArray(state.prova.questoes) || !state.prova.questoes.length) {
        throw new Error('JSON inválido');
      }
    } catch (e) {
      renderCentro('⚠️', 'Não foi possível carregar a prova',
        'Verifique a conexão e tente novamente.',
        [{ txt: 'Recarregar', cls: 'btn', fn: () => location.reload() }]);
      return;
    }
    flushOutbox();   // reenvia (silenciosamente) qualquer prova pendente de antes
    if (restaurar()) renderRetomar();
    else renderIdentificacao();
  }

  // ---------- Tela: retomar sessão anterior ----------
  function renderRetomar() {
    app.innerHTML = '';
    app.appendChild(el(`
      <div class="centro">
        <div class="icone">↩️</div>
        <h2>Prova em andamento</h2>
        <p>Encontramos uma prova iniciada por <strong>${esc(state.aluno.nome)}</strong>
           (${respondidas()} de ${totalQ()} respondidas). Deseja continuar?</p>
      </div>`));
    const acoes = el('<div class="nav-fixa"></div>');
    const bNovo = el('<button class="btn btn-secundario">Nova prova</button>');
    const bCont = el('<button class="btn">Continuar</button>');
    bNovo.onclick = () => { limparSessao(); renderIdentificacao(); };
    bCont.onclick = () => renderQuestao(state.indice);
    acoes.append(bNovo, bCont);
    app.appendChild(acoes);
  }

  // ---------- Tela: identificação ----------
  function renderIdentificacao() {
    state.tela = 'identificacao';
    app.innerHTML = '';
    const p = state.prova;
    const tela = el(`
      <div class="tela">
        <div class="hero">
          <h1>${esc(p.titulo || 'Prova ACLS')}</h1>
          <p class="sub">${esc(p.subtitulo || '')}</p>
          <span class="selo">${totalQ()} questões · múltipla escolha</span>
        </div>
        <div class="form-card">
          <div class="campo">
            <label for="f-nome">Nome completo *</label>
            <input id="f-nome" type="text" autocomplete="name" placeholder="Digite seu nome">
            <div class="erro-campo" id="erro-nome" hidden>Informe seu nome para iniciar.</div>
          </div>
          <div class="campo">
            <label for="f-turma">Turma</label>
            <input id="f-turma" type="text" placeholder="Ex.: Turma 2026-1">
          </div>
          <div class="campo">
            <label for="f-edicao">Edição do curso</label>
            <input id="f-edicao" type="text" placeholder="Ex.: ACLS Abril/2026">
          </div>
          <button class="btn btn-bloco" id="btn-iniciar">Iniciar prova</button>
        </div>
      </div>`);
    app.appendChild(tela);

    const nome = tela.querySelector('#f-nome');
    const turma = tela.querySelector('#f-turma');
    const edicao = tela.querySelector('#f-edicao');
    nome.value = state.aluno.nome; turma.value = state.aluno.turma; edicao.value = state.aluno.edicao;

    tela.querySelector('#btn-iniciar').onclick = () => {
      if (!nome.value.trim()) {
        tela.querySelector('#erro-nome').hidden = false;
        nome.focus();
        return;
      }
      state.aluno = { nome: nome.value.trim(), turma: turma.value.trim(), edicao: edicao.value.trim() };
      state.indice = 0;
      salvar();
      renderQuestao(0);
    };
  }

  // ---------- Tela: questão ----------
  function renderQuestao(i) {
    state.indice = i = Math.max(0, Math.min(i, totalQ() - 1));
    state.tela = 'questao';
    salvar();
    const q = state.prova.questoes[i];
    const sel = state.respostas[q.id];
    app.innerHTML = '';

    // Topo com progresso
    const pct = Math.round((respondidas() / totalQ()) * 100);
    app.appendChild(el(`
      <div class="topo">
        <div class="topo-linha">
          <span class="contador">Questão ${i + 1} de ${totalQ()}</span>
          <span class="aluno-nome">${esc(state.aluno.nome)}</span>
        </div>
        <div class="progresso"><div style="width:${pct}%"></div></div>
      </div>`));

    // Corpo
    const corpo = el('<div class="questao"></div>');
    if (q.scenario) {
      corpo.appendChild(el(`<div class="cenario"><strong>Cenário clínico</strong>${esc(q.scenario)}</div>`));
    }
    const ecg = imagemDaQuestao(q, i);
    if (ecg) {
      // WebP (≈30 KB, precacheado pelo SW p/ offline) como fonte primária; PNG como
      // fallback universal caso a WebView não suporte WebP. O zoom abre a WebP, que é
      // a garantida offline. Ver otimização em scripts/optimize-images.py.
      const webp = 'imagens-ecg/' + esc(ecg.arquivo).replace(/\.png$/i, '.webp');
      const png = 'imagens-ecg/' + esc(ecg.arquivo);
      const dica = ecg.herdada
        ? 'Mesmo ritmo do cenário — toque para ampliar'
        : 'Toque na imagem para ampliar';
      const wrap = el(`<div class="ecg-wrap">
          <picture>
            <source srcset="${webp}" type="image/webp">
            <img src="${png}" alt="Traçado de ECG da questão ${q.id}" loading="eager">
          </picture>
          <p class="ecg-hint">${dica}</p>
        </div>`);
      wrap.querySelector('img').onclick = () => abrirZoom(webp);
      corpo.appendChild(wrap);
    }
    corpo.appendChild(el(`<p class="enunciado">${esc(q.text)}</p>`));

    const lista = el('<div class="alternativas"></div>');
    for (const letra of ['A', 'B', 'C', 'D']) {
      if (!q.options[letra]) continue;
      const b = el(`<button class="alt${sel === letra ? ' selecionada' : ''}" data-letra="${letra}" aria-pressed="${sel === letra}">
          <span class="letra">${letra}</span>
          <span class="txt">${esc(q.options[letra])}</span>
        </button>`);
      b.onclick = () => {
        state.respostas[q.id] = letra;
        salvar();
        lista.querySelectorAll('.alt').forEach(a => { a.classList.remove('selecionada'); a.setAttribute('aria-pressed', 'false'); });
        b.classList.add('selecionada');
        b.setAttribute('aria-pressed', 'true');
        app.querySelector('.progresso > div').style.width =
          Math.round((respondidas() / totalQ()) * 100) + '%';
      };
      lista.appendChild(b);
    }
    corpo.appendChild(lista);
    app.appendChild(corpo);

    // Navegação
    const nav = el('<div class="nav-fixa"></div>');
    const bPrev = el(`<button class="btn btn-secundario">← Anterior</button>`);
    bPrev.disabled = i === 0;
    bPrev.onclick = () => renderQuestao(i - 1);
    nav.appendChild(bPrev);
    if (i === totalQ() - 1) {
      const bRev = el('<button class="btn btn-verde">Revisar e enviar</button>');
      bRev.onclick = renderRevisao;
      nav.appendChild(bRev);
    } else {
      const bNext = el('<button class="btn">Próxima →</button>');
      bNext.onclick = () => renderQuestao(i + 1);
      nav.appendChild(bNext);
    }
    app.appendChild(nav);
    window.scrollTo(0, 0);
  }

  // ---------- Zoom de imagem (pan + zoom, essencial para leitura do ECG) ----------
  const zoomState = { escala: 1, x: 0, y: 0, arrastando: false, px: 0, py: 0, pinchDist: 0 };
  function abrirZoom(src) {
    const ov = document.getElementById('zoom-overlay');
    const palco = document.getElementById('zoom-palco');
    const img = document.getElementById('zoom-img');
    img.src = src;
    zoomState.escala = 1; zoomState.x = 0; zoomState.y = 0;
    aplicarZoom();
    ov.hidden = false;

    const fechar = () => {
      ov.hidden = true;
      palco.onpointerdown = palco.onpointermove = palco.onpointerup = null;
      palco.onwheel = null; palco.ontouchmove = null;
    };
    ov.querySelector('.zoom-close').onclick = fechar;
    // Fechar só ao tocar fora da imagem (o palco cobre a área útil).
    ov.onclick = (e) => { if (e.target === ov) fechar(); };

    ov.querySelectorAll('.zoom-btn').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        const a = b.dataset.zoom;
        if (a === 'in') setEscala(zoomState.escala * 1.5);
        else if (a === 'out') setEscala(zoomState.escala / 1.5);
        else { zoomState.escala = 1; zoomState.x = 0; zoomState.y = 0; aplicarZoom(); }
      };
    });

    // Duplo-toque/clique alterna entre 1x e 2.5x.
    img.ondblclick = () => setEscala(zoomState.escala > 1 ? 1 : 2.5);

    // Roda do mouse amplia/reduz.
    palco.onwheel = (e) => { e.preventDefault(); setEscala(zoomState.escala * (e.deltaY < 0 ? 1.15 : 0.87)); };

    // Arraste (pan) com ponteiro único.
    palco.onpointerdown = (e) => {
      zoomState.arrastando = true; zoomState.px = e.clientX; zoomState.py = e.clientY;
      palco.setPointerCapture(e.pointerId);
    };
    palco.onpointermove = (e) => {
      if (!zoomState.arrastando) return;
      zoomState.x += e.clientX - zoomState.px;
      zoomState.y += e.clientY - zoomState.py;
      zoomState.px = e.clientX; zoomState.py = e.clientY;
      aplicarZoom();
    };
    palco.onpointerup = () => { zoomState.arrastando = false; };

    // Pinça (dois dedos) — controla a escala pela distância entre os toques.
    palco.ontouchmove = (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
      if (zoomState.pinchDist) setEscala(zoomState.escala * (d / zoomState.pinchDist));
      zoomState.pinchDist = d;
    };
    palco.ontouchend = () => { zoomState.pinchDist = 0; };
  }
  function setEscala(v) {
    zoomState.escala = Math.max(1, Math.min(v, 6));
    if (zoomState.escala === 1) { zoomState.x = 0; zoomState.y = 0; }
    aplicarZoom();
  }
  function aplicarZoom() {
    const img = document.getElementById('zoom-img');
    img.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.escala})`;
    const lbl = document.querySelector('.zoom-btn[data-zoom="reset"]');
    if (lbl) lbl.textContent = Math.round(zoomState.escala * 100) + '%';
  }

  // ---------- Tela: revisão ----------
  function renderRevisao() {
    state.tela = 'revisao';
    app.innerHTML = '';
    const resp = respondidas();
    const pend = totalQ() - resp;
    const primeiraEmBranco = state.prova.questoes.findIndex(q => !state.respostas[q.id]);
    const rev = el('<div class="revisao"></div>');
    rev.appendChild(el('<h2>Revisão das respostas</h2>'));
    rev.appendChild(el(`
      <div class="resumo-stats">
        <div class="stat"><div class="num">${resp}</div><div class="lbl">respondidas</div></div>
        <div class="stat ${pend ? 'pend' : ''}"><div class="num">${pend}</div><div class="lbl">em branco</div></div>
      </div>`));
    rev.appendChild(el('<p style="color:var(--texto-suave);font-size:.9rem">Toque em uma questão para revisá-la.</p>'));

    const grade = el('<div class="grade-questoes"></div>');
    state.prova.questoes.forEach((q, idx) => {
      const r = state.respostas[q.id];
      const chip = el(`<button class="chip ${r ? 'respondida' : 'pendente'}">
          <span>${idx + 1}</span><span class="r">${r || '—'}</span></button>`);
      chip.onclick = () => renderQuestao(idx);
      grade.appendChild(chip);
    });
    rev.appendChild(grade);
    app.appendChild(rev);

    const nav = el('<div class="nav-fixa"></div>');
    if (primeiraEmBranco >= 0) {
      const bBranco = el('<button class="btn btn-secundario">Ir p/ em branco</button>');
      bBranco.onclick = () => renderQuestao(primeiraEmBranco);
      nav.appendChild(bBranco);
    } else {
      const bVoltar = el('<button class="btn btn-secundario">← Questões</button>');
      bVoltar.onclick = () => renderQuestao(state.indice);
      nav.appendChild(bVoltar);
    }
    const bEnviar = el('<button class="btn btn-verde">Enviar respostas</button>');
    bEnviar.onclick = confirmarEnvio;
    nav.appendChild(bEnviar);
    app.appendChild(nav);
    window.scrollTo(0, 0);
  }

  function confirmarEnvio() {
    const pend = totalQ() - respondidas();
    const msg = pend > 0
      ? `Você deixou ${pend} questão(ões) em branco. Após enviar, não será possível alterar. Deseja enviar mesmo assim?`
      : 'Após enviar, não será possível alterar as respostas. Deseja enviar?';
    if (window.confirm(msg)) enviarRespostas();
  }

  // ---------- Envio ----------
  // Payload do envio atual, mantido em state para que "Tentar novamente" reuse o
  // mesmo _id (evita duplicar a prova na outbox a cada tentativa).
  function enviarRespostas() {
    if (state.enviando) return;
    if (!state.envioAtual) {
      const data_envio = new Date().toISOString();
      state.envioAtual = {
        _id: `${state.aluno.nome}|${data_envio}`,
        aluno: state.aluno,
        prova: state.prova.titulo || 'Prova ACLS',
        data_envio,
        total_questoes: totalQ(),
        respondidas: respondidas(),
        respostas: state.respostas,
      };
    }
    return despacharEnvio(state.envioAtual);
  }

  async function despacharEnvio(payload) {
    state.enviando = true;
    renderCentro('spinner', '', 'Enviando respostas…');
    enfileirar(payload);   // grava ANTES da rede: nada se perde se o app fechar
    try {
      await postar(payload);
      removerDaOutbox(payload._id);
      state.enviando = false;
      state.envioAtual = null;
      renderSucesso();
    } catch (e) {
      state.enviando = false;
      renderErroEnvio(e.message || 'Falha de rede');
    }
  }

  function renderSucesso() {
    state.tela = 'fim';
    limparSessao();
    app.innerHTML = '';
    app.appendChild(el(`
      <div class="centro">
        <div class="icone">✅</div>
        <h2>Respostas enviadas!</h2>
        <p>A prova foi enviada com sucesso à professora. Você já pode entregar o tablet.</p>
      </div>`));
    const nav = el('<div class="nav-fixa"></div>');
    const b = el('<button class="btn btn-bloco">Iniciar prova de outro aluno</button>');
    b.onclick = renderIdentificacao;
    nav.appendChild(b);
    app.appendChild(nav);
  }

  function renderErroEnvio(motivo) {
    state.tela = 'erro';
    app.innerHTML = '';
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    app.appendChild(el(`
      <div class="centro">
        <div class="icone">${offline ? '📶' : '⚠️'}</div>
        <h2>Não foi possível enviar</h2>
        <p>${offline
          ? 'Sem conexão no momento. Suas respostas estão salvas na fila de envio e serão entregues automaticamente quando a internet voltar — mesmo que o app seja fechado.'
          : 'Suas respostas estão salvas neste tablet e na fila de envio. Verifique a internet e tente novamente.'}</p>
        <div class="alerta">Detalhe: ${esc(motivo)}</div>
      </div>`));
    // Ao reconectar, o flush global esvazia a outbox; se este envio saiu da fila,
    // mostra a tela de sucesso. Não posta aqui para não duplicar com o flush global.
    window.addEventListener('online', function retomar() {
      window.removeEventListener('online', retomar);
      flushOutbox().then(() => {
        if (state.tela === 'erro' && state.envioAtual &&
            !lerOutbox().some(p => p._id === state.envioAtual._id)) {
          state.envioAtual = null;
          renderSucesso();
        }
      });
    }, { once: true });
    const nav = el('<div class="nav-fixa"></div>');
    const bRev = el('<button class="btn btn-secundario">Revisar</button>');
    bRev.onclick = renderRevisao;
    const bTenta = el('<button class="btn btn-verde">Tentar novamente</button>');
    bTenta.onclick = enviarRespostas;
    nav.append(bRev, bTenta);
    app.appendChild(nav);
  }

  // ---------- Tela central genérica ----------
  function renderCentro(icone, titulo, texto, acoes) {
    app.innerHTML = '';
    const ic = icone === 'spinner' ? '<div class="spinner"></div>' : `<div class="icone">${icone}</div>`;
    app.appendChild(el(`
      <div class="centro">
        ${ic}
        ${titulo ? `<h2>${esc(titulo)}</h2>` : ''}
        ${texto ? `<p>${esc(texto)}</p>` : ''}
      </div>`));
    if (acoes && acoes.length) {
      const nav = el('<div class="nav-fixa"></div>');
      acoes.forEach(a => { const b = el(`<button class="${a.cls} btn-bloco">${esc(a.txt)}</button>`); b.onclick = a.fn; nav.appendChild(b); });
      app.appendChild(nav);
    }
  }

  // ---------- Atalhos de teclado (tablets com teclado / operação rápida) ----------
  document.addEventListener('keydown', (e) => {
    // Fecha o zoom com Esc esteja onde estiver.
    const ov = document.getElementById('zoom-overlay');
    if (e.key === 'Escape' && ov && !ov.hidden) { ov.querySelector('.zoom-close').click(); return; }
    if (state.tela !== 'questao') return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

    const k = e.key.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(k)) {
      const alt = app.querySelector(`.alt[data-letra="${k}"]`);
      if (alt) { alt.click(); e.preventDefault(); }
    } else if (e.key === 'ArrowRight') {
      const b = app.querySelector('.nav-fixa .btn:not(.btn-secundario)');
      if (b) { b.click(); e.preventDefault(); }
    } else if (e.key === 'ArrowLeft') {
      const b = app.querySelector('.nav-fixa .btn-secundario');
      if (b && !b.disabled) { b.click(); e.preventDefault(); }
    }
  });

  document.addEventListener('DOMContentLoaded', carregar);
})();
