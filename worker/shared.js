/* Lógica compartilhada de recebimento/envio das respostas da prova.
 * Usada tanto pelo Worker standalone (worker/email.js) quanto pela
 * Cloudflare Pages Function (functions/api/enviar.js), para não duplicar código.
 *
 * Credenciais NUNCA são hardcoded — vêm do ambiente (env):
 *   PROFESSORA_EMAIL   destinatário (obrigatório)
 *   FROM_EMAIL         remetente verificado (ex.: prova@seu-dominio)
 *   EMAIL_PROVIDER     "brevo" (padrão) | "mailchannels"
 *   BREVO_API_KEY      chave da API Brevo (se EMAIL_PROVIDER=brevo)
 */

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

/* Trata uma requisição POST com as respostas e dispara o email.
 * Retorna sempre um Response pronto (inclusive erros de validação/envio). */
export async function tratarEnvio(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, error: 'JSON inválido' }, 400);
  }

  const erro = validar(payload);
  if (erro) return json({ success: false, error: erro }, 400);

  if (!env.PROFESSORA_EMAIL) return json({ success: false, error: 'Servidor sem destinatário configurado' }, 500);
  const from = env.FROM_EMAIL || 'prova@prova-acls.pages.dev';
  const html = montarEmailHTML(payload);
  const assunto = `[Prova ACLS] ${payload.aluno.nome}` +
    (payload.aluno.turma ? ` - ${payload.aluno.turma}` : '');

  try {
    if ((env.EMAIL_PROVIDER || 'brevo') === 'mailchannels') {
      await enviarMailChannels(env.PROFESSORA_EMAIL, from, assunto, html);
    } else {
      await enviarBrevo(env, env.PROFESSORA_EMAIL, from, assunto, html);
    }
  } catch (e) {
    return json({ success: false, error: 'Falha no envio do email: ' + e.message }, 502);
  }
  return json({ success: true });
}

// ---------- Validação ----------
export function validar(p) {
  if (!p || typeof p !== 'object') return 'Payload ausente';
  if (!p.aluno || !p.aluno.nome || !String(p.aluno.nome).trim()) return 'Nome do aluno obrigatório';
  if (!p.respostas || typeof p.respostas !== 'object') return 'Respostas ausentes';
  for (const [k, v] of Object.entries(p.respostas)) {
    if (!['A', 'B', 'C', 'D'].includes(v)) return `Resposta inválida na questão ${k}`;
  }
  return null;
}

// ---------- Provedores de email ----------
async function enviarBrevo(env, to, from, subject, html) {
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY não configurada');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: from, name: 'Prova ACLS App' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error('Brevo ' + res.status + ': ' + (await res.text()).slice(0, 200));
}

async function enviarMailChannels(to, from, subject, html) {
  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'Prova ACLS App' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (!res.ok) throw new Error('MailChannels ' + res.status + ': ' + (await res.text()).slice(0, 200));
}

// ---------- Montagem do email ----------
export function montarEmailHTML(p) {
  const total = p.total_questoes || 50;
  const resp = p.respostas || {};
  const respondidas = Object.keys(resp).length;
  const dataStr = fmtData(p.data_envio);

  let linhas = '';
  for (let i = 1; i <= total; i++) {
    const r = resp[i] || resp[String(i)];
    linhas += `<tr>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${i}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;font-weight:bold;color:${r ? '#004499' : '#999'}">${r || '—'}</td>
    </tr>`;
  }

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#222">
    <div style="max-width:640px;margin:0 auto">
      <h2 style="color:#004499;border-bottom:2px solid #004499;padding-bottom:8px">Prova ACLS — Respostas Enviadas</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:4px 12px 4px 0"><b>Aluno:</b></td><td>${esc(p.aluno.nome)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Turma:</b></td><td>${esc(p.aluno.turma) || '—'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Edição:</b></td><td>${esc(p.aluno.edicao) || '—'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Prova:</b></td><td>${esc(p.prova || 'Prova ACLS')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Enviada em:</b></td><td>${dataStr}</td></tr>
        <tr><td style="padding:4px 12px 4px 0"><b>Respondidas:</b></td><td>${respondidas} de ${total} (${total - respondidas} em branco)</td></tr>
      </table>
      <h3 style="color:#004499">Gabarito de respostas</h3>
      <table style="border-collapse:collapse;width:100%">
        <tr style="background:#004499;color:#fff">
          <th style="padding:8px 12px;border:1px solid #ddd">Questão</th>
          <th style="padding:8px 12px;border:1px solid #ddd">Resposta</th>
        </tr>
        ${linhas}
      </table>
      <p style="color:#888;font-size:12px;margin-top:20px">Enviado automaticamente pelo app Prova ACLS.</p>
    </div>
  </body></html>`;
}

function fmtData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch { return iso; }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
