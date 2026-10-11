/* Cloudflare Worker standalone — recebe as respostas da prova e envia por email.
 *
 * A lógica de validação/montagem/envio vive em worker/shared.js e é compartilhada
 * com a Pages Function (functions/api/enviar.js). Deploy: `npx wrangler deploy`.
 *
 * Credenciais NUNCA são hardcoded — vêm de secrets do Worker:
 *   npx wrangler secret put BREVO_API_KEY   (e PROFESSORA_EMAIL, FROM_EMAIL, etc.)
 */
import { tratarEnvio, json, CORS } from './shared.js';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ success: false, error: 'Método não permitido' }, 405);
    return tratarEnvio(request, env);
  },
};
