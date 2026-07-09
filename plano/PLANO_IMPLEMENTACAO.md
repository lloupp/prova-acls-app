# Plano de Implementação — Prova ACLS App

> **Para Hermes:** Use subagent-driven-development para implementar este plano tarefa por tarefa.

**Objetivo:** APK instalável em tablet onde alunos realizam prova ACLS (50 questões múltipla escolha com imagens ECG) e ao final as respostas são enviadas por email para a professora.

**Arquitetura:** PWA (HTML/CSS/JS) empacotado como APK via Capacitor. Backend serverless em Cloudflare Pages + Workers. Email enviado via Nodemailer (ou MailChannels API gratuita do Cloudflare). Prova carregada do JSON estruturado já disponível no repo.

**Stack:** HTML5 + CSS3 + JavaScript vanilla (sem framework — app simples, leve para tablet), Capacitor (PWA → APK), Cloudflare Pages (hosting), Cloudflare Workers (API email), .pages.dev (domínio gratuito).

---

## Visão Geral do Fluxo

```
[Tablet] → Aluno abre app
  → Tela inicial: nome + turma + edição
  → Prova: 50 questões (1 por tela, com navegação)
    → Texto da questão
    → Imagem ECG (se houver) — IDÊNTICA ao PDF original
    → Cenário clínico (se houver) — em caixa destacada
    → 4 alternativas (A, B, C, D) — tap para selecionar
    → Navegação: anterior/próxima, indicador de progresso
    → Confirmar resposta (opcional) ou deixar em branco
  → Tela final: revisão + enviar
  → POST /api/enviar → Cloudflare Worker → Email para professora
  → Confirmação de envio → reset para próximo aluno
```

---

## Task 1: Inicializar projeto PWA

**Objetivo:** Criar estrutura base do PWA com manifest e service worker.

**Arquivos:**
- Criar: `www/index.html`
- Criar: `www/manifest.json`
- Criar: `www/sw.js`
- Criar: `www/css/style.css`
- Criar: `www/js/app.js`

**Passos:**

1. Criar `www/manifest.json`:
```json
{
  "name": "Prova ACLS",
  "short_name": "Prova ACLS",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#004499",
  "icons": [{"src": "icon.png", "sizes": "512x512", "type": "image/png"}]
}
```

2. Criar `www/index.html` com estrutura base: container `#app`, link para manifest, service worker registration.

3. Criar service worker com cache dos arquivos estáticos (offline-first para prova).

4. Commit:
```bash
git add www/
git commit -m "feat: inicializar PWA com manifest e service worker"
```

---

## Task 2: Carregar prova do JSON

**Objetivo:** App carrega `PROVA_ACLS.json` e exibe questões.

**Arquivos:**
- Criar: `www/data/PROVA_ACLS.json` (cópia do JSON já validado no repo)
- Criar: `www/imagens-ecg/` (cópias das 9 imagens PNG)
- Modificar: `www/js/app.js`

**Passos:**

1. Copiar `PROVA_ACLS.json` para `www/data/PROVA_ACLS.json`.
2. Copiar 9 imagens de `imagens-ecg/` para `www/imagens-ecg/`.
3. Implementar `loadProva()` em `app.js`:
   - `fetch('data/PROVA_ACLS.json')` → `window.provaData`
   - Renderizar tela de identificação (nome, turma, edição do curso)
4. Commit.

---

## Task 3: Tela de identificação do aluno

**Objetivo:** Antes de iniciar a prova, aluno preenche nome, turma e edição.

**Arquivos:**
- Modificar: `www/js/app.js`
- Modificar: `www/css/style.css`

**Passos:**

1. Criar função `renderIndentificacao()` que mostra formulário:
   - Nome completo (texto, obrigatório)
   - Turma (texto ou select)
   - Edição do curso (texto ou select)
2. Validar campos antes de avançar (nome obrigatório).
3. Salvar dados em `window.aluno = {nome, turma, edicao}`.
4. Botão "Iniciar Prova" → `renderQuestao(0)`.
5. Commit.

---

## Task 4: Renderização de questão individual

**Objetivo:** Exibir uma questão por tela — texto, imagem ECG (se houver), cenário (se houver), alternativas.

**Arquivos:**
- Modificar: `www/js/app.js`
- Modificar: `www/css/style.css`

**Passos:**

1. Criar function `renderQuestao(index)`:
   - Número da questão (ex: "Questão 3 de 50")
   - Barra de progresso
   - Se `q.scenario`: exibir caixa destacada com texto do cenário (fundo cinza claro, borda)
   - Se `q.image`: exibir `<img src="imagens-ecg/${q.image}" style="width:100%">`
   - Texto da questão
   - 4 botões para alternativas (A, B, C, D)
   - Alternativa selecionada fica destacada (cor de fundo)
   - Salvar seleção em `window.respostas[q.id]`
2. Botões de navegação: "Anterior" e "Próxima"
3. Se última questão, botão "Revisar e Enviar"
4. Commit.

**Verificar:** Abrir `www/index.html` no browser, navegar por algumas questões, confirmar que:
- Q2 mostra imagem ECG
- Q11 mostra cenário clínico em destaque
- Alternativas selecionam corretamente
- Navegação anterior/próxima funciona

---

## Task 5: Tela de revisão e envio

**Objetivo:** Antes de enviar, aluno revisa resposta.

**Arquivos:**
- Modificar: `www/js/app.js`
- Modificar: `www/css/style.css`

**Passos:**

1. Criar function `renderRevisao()`:
   - Lista de todas as 50 questões com a resposta selecionada (ou "Em branco")
   - Tap em qualquer questão volta para editá-la
   - Contador: "35 respondidas, 15 em branco"
2. Botão "Enviar Respostas"
3. Confirmar envio (dialog: "Tem certeza? Não poderá alterar.")
4. Ao confirmar → `enviarRespostas()`
5. Commit.

---

## Task 6: Envio das respostas (frontend)

**Objetivo:** Enviar dados via POST para API do backend.

**Arquivos:**
- Modificar: `www/js/app.js`

**Passos:**

1. Criar function `enviarRespostas()`:
   ```javascript
   const payload = {
     aluno: window.aluno,
     prova: "Prova ACLS - Exame A",
     data_envio: new Date().toISOString(),
     respostas: window.respostas // {1: "A", 2: "C", ...}
   };
   const res = await fetch('/api/enviar', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify(payload)
   });
   ```
2. Se sucesso: mostrar confirmação, resetar app para próximo aluno.
3. Se erro: mensagem + botão "Tentar novamente".
4. Commit.

---

## Task 7: Backend Cloudflare Worker (email)

**Objetivo:** Worker recebe POST e envia email via MailChannels (gratuito no Cloudflare).

**Arquivos:**
- Criar: `worker/email.js`
- Criar: `wrangler.toml`

**Passos:**

1. Criar `wrangler.toml`:
```toml
name = "prova-acls-api"
main = "worker/email.js"
compatibility_date = "2024-01-01"
```

2. Implementar Worker que:
   - Recebe POST `/api/enviar`
   - Valida payload (nome, respostas)
   - Formata email em HTML:
     - Cabeçalho: nome do aluno, turma, edição, data
     - Tabela: Q1 → A, Q2 → C, ... Q50 → B
     - Estatísticas: X respondidas, Y em branco
   - Envia via MailChannels API:
   ```javascript
   await fetch('https://api.mailchannels.net/tx/v1/send', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       personalizations: [{to: [{email: PROFESSORA_EMAIL}]}],
       from: {email: 'prova@aclstest.pages.dev', name: 'Prova ACLS App'},
       subject: `[Prova ACLS] ${aluno.nome} - ${aluno.turma}`,
       content: [{type: 'text/html', value: htmlEmail}]
     })
   });
   ```
   - Retorna `{success: true}` ou `{success: false, error: msg}`
3. Variável de ambiente: `PROFESSORA_EMAIL` (configurada no dashboard do Cloudflare).
4. Deploy: `npx wrangler deploy`
5. Commit.

---

## Task 8: Deploy frontend no Cloudflare Pages

**Objetivo:** Publicar o PWA em subdomínio .pages.dev.

**Passos:**

1. Instalar Wrangler CLI: `npm i -g wrangler`
2. Autenticar: `wrangler login`
3. Deploy do frontend:
   ```bash
   wrangler pages deploy www --project-name prova-acls
   ```
4. URL resultante: `https://prova-acls.pages.dev`
5. Configurar Worker route para `/api/*` no mesmo domínio.
6. Commit.

---

## Task 9: Empacotar APK com Capacitor

**Objetivo:** Gerar arquivo .apk instalável via sideload no tablet.

**Arquivos:**
- Criar: `package.json`
- Criar: `capacitor.config.json`
- Modificar: `www/` (garantir que tudo funciona offline)

**Passos:**

1. Instalar Capacitor:
   ```bash
   npm init -y
   npm i @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Criar `capacitor.config.json`:
   ```json
   {
     "appId": "com.aclsprova.app",
     "appName": "Prova ACLS",
     "webDir": "www",
     "server": {"url": "https://prova-acls.pages.dev"}
   }
   ```
   > **Nota:** `server.url` faz o app carregar do servidor (atualiza sem reinstalar APK). Se offline, fallback para arquivos locais.
3. Adicionar Android:
   ```bash
   npx cap add android
   ```
4. Build do APK:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
5. APK gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`
6. Transferir .apk para o tablet (USB ou download direto).
7. Commit.

---

## Task 10: Testes e validação no tablet

**Objetivo:** Confirmar funcionamento end-to-end no dispositivo real.

**Passos:**

1. Instalar APK no tablet (sideload).
2. Abrir app → preencher nome/turma → iniciar prova.
3. Navegar por questões:
   - ✅ Q2 mostra imagem ECG do ritmo
   - ✅ Q11-16 mostram cenário clínico
   - ✅ Q32-35 mostram cenário + imagem ECG
   - ✅ Alternativas selecionam corretamente
4. Revisar e enviar.
5. Confirmar email recebido pela professora.
6. Resetar app → proximo aluno.
7. Commit final.

---

## Riscos e Considerações

| Risco | Mitigação |
|---|---|
| MailChannels pode desativar free tier | Alternativa: Nodemailer via SMTP Brevo/SendGrid free |
| Tablet sem internet ao enviar | Salvar respostas localmente (localStorage), enviar em background |
| Imagens ECG muito grandes (3-5MB cada) | Otimizar com `sharp` para ~200KB cada antes do deploy |
| Vários alunos usam mesmo tablet | Reset automático após envio + botão "Novo Aluno" na confirmação |
| Email da professora pode ir para spam | Configurar SPF/DKIM no Cloudflare Pages DNS |

## Considerações sobre as Imagens ECG

As 9 imagens de ECG foram extraídas diretamente do PDF original em alta resolução (~3700px largura). Para o app:

1. **Otimização:** Converter para WebP com largura máx 1200px (~100-200KB cada) antes de incluir no `www/`.
2. **Fidelidade:** As imagens devem ser **idênticas** ao PDF original — o aluno precisa ler o ritmo cardíaco corretamente.
3. **Display:** Largura 100% do container, scroll horizontal se necessário em tablets pequenos.
4. **Zoom:** Permitir pinch-to-zoom na imagem (importante para detalhes do ECG).

## Domínio e Email

- **Frontend:** `https://prova-acls.pages.dev` (Cloudflare Pages free)
- **API:** `https://prova-acls-api.<seu-subdomínio>.workers.dev` (Cloudflare Workers free)
- **Email remetente:** `prova@prova-acls.pages.dev` (via MailChannels)
- **Email destinatário:** `<email da professora>` (variável de ambiente no Worker)

## Estimativa de Tempo

| Task | Tempo |
|---|---|
| Task 1-2 (PWA + JSON) | 30 min |
| Task 3-5 (Telas do app) | 1-2h |
| Task 6-7 (Email + Worker) | 1h |
| Task 8 (Deploy) | 15 min |
| Task 9 (APK) | 1h (instalar Android SDK) |
| Task 10 (Testes) | 30 min |
| **Total** | **~4-5h** |
