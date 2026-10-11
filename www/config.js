/* Configuração de runtime do app.
 *
 * Build WEB (Cloudflare Pages): deixe vazio — o app usa a mesma origem (/api/enviar),
 * servida pela Pages Function em functions/api/enviar.js.
 *
 * Build APK (Capacitor): a origem é https://localhost, então o caminho relativo NÃO
 * resolve. Aponte para a URL pública completa da API antes de `npm run build && cap sync`:
 *   window.ACLS_API_URL = 'https://prova-acls.pages.dev/api/enviar';
 */
window.ACLS_API_URL = '';
