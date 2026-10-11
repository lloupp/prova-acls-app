/* Cloudflare Pages Function — serve POST /api/enviar na MESMA origem do frontend.
 *
 * É o que o app chama por padrão (fetch relativo '/api/enviar'), evitando CORS e
 * configuração de rotas de Worker. Reaproveita toda a lógica de worker/shared.js.
 *
 * Configure no projeto Pages (Settings → Environment variables / Secrets):
 *   PROFESSORA_EMAIL, FROM_EMAIL, EMAIL_PROVIDER, BREVO_API_KEY
 */
import { tratarEnvio, json, CORS } from '../../worker/shared.js';

export async function onRequestPost(context) {
  return tratarEnvio(context.request, context.env);
}

export function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export function onRequest(context) {
  return json({ success: false, error: 'Método não permitido' }, 405);
}
