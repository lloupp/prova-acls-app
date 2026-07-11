// Estado global
window.provaData = null;
window.aluno = null;
window.respostas = {};
window.questaoAtual = 0;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  // Registrar service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
  
  // Carregar dados da prova
  await loadProva();
  
  // Mostrar tela de identificação
  renderIdentificacao();
});

// Carregar dados da prova
async function loadProva() {
  const res = await fetch('data/PROVA_ACLS.json');
  window.provaData = await res.json();
}

// Renderizar tela de identificação
function renderIdentificacao() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen active">
      <h1>Prova ACLS - Exame A</h1>
      <p style="margin-bottom: 20px;">American Heart Association - 13 de abril de 2021</p>
      
      <div class="form-group">
        <label for="nome">Nome completo *</label>
        <input type="text" id="nome" required>
      </div>
      
      <div class="form-group">
        <label for="turma">Turma</label>
        <input type="text" id="turma" placeholder="Ex: Turma A">
      </div>
      
      <div class="form-group">
        <label for="edicao">Edição do curso</label>
        <input type="text" id="edicao" placeholder="Ex: 2024.1">
      </div>
      
      <button onclick="iniciarProva()">Iniciar Prova</button>
      <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">* Campo obrigatório</p>
    </div>
  `;
}

// Iniciar prova
function iniciarProva() {
  const nome = document.getElementById('nome').value.trim();
  if (!nome) {
    alert('Nome é obrigatório!');
    return;
  }
  
  window.aluno = {
    nome,
    turma: document.getElementById('turma').value.trim() || 'Não informado',
    edicao: document.getElementById('edicao').value.trim() || 'Não informado'
  };
  
  window.questaoAtual = 0;
  renderQuestao(0);
}

// Renderizar questão
function renderQuestao(index) {
  const q = window.provaData.questoes[index];
  const app = document.getElementById('app');
  
  let html = `
    <div class="screen active">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${(index + 1) / window.provaData.total_questoes * 100}%"></div>
      </div>
      <h2>Questão ${q.id} de ${window.provaData.total_questoes}</h2>
  `;
  
  if (q.scenario) {
    html += `<div class="scenario-box">${q.scenario}</div>`;
  }
  
  if (q.image) {
    html += `<img src="imagens-ecg/${q.image}" class="ecg-image" alt="ECG da questão ${q.id}">`;
  }
  
  html += `<p class="question-text">${q.text}</p>
      <div class="options">
  `;
  
  ['A', 'B', 'C', 'D'].forEach(opt => {
    const selected = window.respostas[q.id] === opt ? 'selected' : '';
    html += `<button class="option-btn ${selected}" onclick="selecionarResposta('${opt}')">${opt}) ${q.options[opt]}</button>`;
  });
  
  html += `</div>
      <div class="nav-buttons">
        <button class="secondary" onclick="navegar(-1)" ${index === 0 ? 'disabled' : ''}>Anterior</button>
        ${index === window.provaData.total_questoes - 1 
          ? '<button onclick="renderRevisao()">Revisar e Enviar</button>' 
          : '<button onclick="navegar(1)">Próxima</button>'}
      </div>
    </div>
  `;
  
  app.innerHTML = html;
  window.questaoAtual = index;
}

// Selecionar resposta
function selecionarResposta(opcao) {
  const qid = window.provaData.questoes[window.questaoAtual].id;
  window.respostas[qid] = opcao;
  renderQuestao(window.questaoAtual);
}

// Navegar entre questões
function navegar(delta) {
  const newIndex = window.questaoAtual + delta;
  if (newIndex >= 0 && newIndex < window.provaData.total_questoes) {
    renderQuestao(newIndex);
  }
}

// Renderizar tela de revisão
function renderRevisao() {
  const respondidas = Object.keys(window.respostas).length;
  const total = window.provaData.total_questoes;
  
  let html = `
    <div class="screen active">
      <h1>Revisar Respostas</h1>
      <p style="margin-bottom: 15px;"><strong>${respondidas}</strong> respondidas, <strong>${total - respondidas}</strong> em branco</p>
  `;
  
  window.provaData.questoes.forEach(q => {
    const resposta = window.respostas[q.id] || 'Em branco';
    const classe = resposta !== 'Em branco' ? 'answered' : 'blank';
    html += `
      <div class="review-item ${classe}" onclick="renderQuestao(${q.id - 1})">
        <span>Q${q.id}</span>
        <span>${resposta}</span>
      </div>
    `;
  });
  
  html += `
      <div style="margin-top: 20px;">
        <button class="secondary" onclick="renderQuestao(window.questaoAtual)">Voltar à prova</button>
        <button onclick="enviarRespostas()">Enviar Respostas</button>
      </div>
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
}

// Enviar respostas
async function enviarRespostas() {
  if (!confirm('Tem certeza? Não poderá alterar após o envio.')) return;
  
  const payload = {
    aluno: window.aluno,
    prova: window.provaData.titulo,
    data_envio: new Date().toISOString(),
    respostas: window.respostas
  };
  
  try {
    const res = await fetch('/api/enviar', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    
    if (result.success) {
      alert('Respostas enviadas com sucesso!');
      resetApp();
    } else {
      throw new Error(result.error || 'Erro desconhecido');
    }
  } catch (err) {
    alert('Erro ao enviar: ' + err.message);
  }
}

// Resetar app
function resetApp() {
  window.aluno = null;
  window.respostas = {};
  window.questaoAtual = 0;
  renderIdentificacao();
}