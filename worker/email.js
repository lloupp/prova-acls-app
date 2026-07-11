export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname !== '/api/enviar') {
      return new Response('Not Found', { status: 404 });
    }
    
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    
    try {
      const data = await request.json();
      
      // Validação básica
      if (!data.aluno?.nome || !data.respostas) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Dados incompletos: nome e respostas são obrigatórios' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const htmlBody = formatarEmail(data);
      const to = env.PROFESSORA_EMAIL || 'professora@example.com';
      
      // Tentar via Cloudflare Email Service binding
      if (env.SEND_EMAIL) {
        try {
          await env.SEND_EMAIL.send({
            from: 'prova@prova-acls.pages.dev',
            to: to,
            subject: `[Prova ACLS] ${data.aluno.nome} - ${data.aluno.turma}`,
            html: htmlBody,
            text: formatarTextoPlano(data)
          });
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          // Fallback para Resend
        }
      }
      
      // Fallback via Resend API (se configurado)
      if (env.RESEND_API_KEY) {
        try {
          const res = await fetch('https://api.resend.com/v1/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Prova ACLS <prova@prova-acls.pages.dev>',
              to: [to],
              subject: `[Prova ACLS] ${data.aluno.nome} - ${data.aluno.turma}`,
              html: htmlBody
            })
          });
          
          if (!res.ok) throw new Error(`Resend error: ${res.status}`);
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: err.message 
          }), { status: 500 });
        }
      }
      
      // Nenhum método disponível
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Nenhum método de email configurado. Configure SEND_EMAIL ou RESEND_API_KEY' 
      }), { status: 500 });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), { status: 500 });
    }
  }
};

function formatarEmail(data) {
  const respondidas = Object.keys(data.respostas).length;
  const totalQuestoes = 50;
  
  let tabela = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;"><tr style="background:#004499;color:white;"><th>Questão</th><th>Resposta</th></tr>';
  for (let i = 1; i <= totalQuestoes; i++) {
    const resp = data.respostas[i] || '<em>Em branco</em>';
    tabela += `<tr><td>${i}</td><td>${resp}</td></tr>`;
  }
  tabela += '</table>';
  
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h1 style="color:#004499;">Prova ACLS - Respostas do Aluno</h1>
      <div style="background:#f0f0f0;padding:15px;border-radius:6px;margin:15px 0;">
        <p><strong>Aluno:</strong> ${data.aluno.nome}</p>
        <p><strong>Turma:</strong> ${data.aluno.turma}</p>
        <p><strong>Edição:</strong> ${data.aluno.edicao}</p>
        <p><strong>Data de envio:</strong> ${new Date(data.data_envio).toLocaleString('pt-BR')}</p>
      </div>
      <hr>
      <p style="font-size:1.1em;"><strong>Respostas:</strong> ${respondidas} de ${totalQuestoes} questões respondidas</p>
      ${tabela}
    </body>
    </html>
  `;
}

function formatarTextoPlano(data) {
  const respondidas = Object.keys(data.respostas).length;
  let linhas = [
    'Prova ACLS - Respostas do Aluno',
    '==============================',
    `Aluno: ${data.aluno.nome}`,
    `Turma: ${data.aluno.turma}`,
    `Edição: ${data.aluno.edicao}`,
    `Data: ${new Date(data.data_envio).toLocaleString('pt-BR')}`,
    '',
    'Respostas:',
  ];
  
  for (let i = 1; i <= 50; i++) {
    const resp = data.respostas[i] || 'Em branco';
    linhas.push(`Q${i}: ${resp}`);
  }
  
  return linhas.join('\n');
}