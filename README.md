# Prova ACLS App

App para realização de prova ACLS em tablet — múltipla escolha com imagens ECG, envio por email.

## Estrutura

```
prova-acls-app/
├── www/                    # PWA frontend
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js               # Service worker (offline-first)
│   ├── css/style.css
│   ├── js/app.js           # Lógica da aplicação
│   ├── data/PROVA_ACLS.json
│   └── imagens-ecg/        # 9 imagens ECG
├── worker/                 # Cloudflare Worker backend
│   └── email.js
├── docs/
│   └── BUILD_APK.md        # Instruções para build APK
├── package.json
└── capacitor.config.json
```

## Funcionalidades Implementadas

- [x] PWA com manifest e service worker
- [x] Carregamento de 50 questões do JSON
- [x] Exibição de imagens ECG (9 questões)
- [x] Cenários clínicos (10 questões)
- [x] Navegação anterior/próxima
- [x] Tela de revisão com contador
- [x] Envio de respostas via API

## Setup

```bash
npm install
npm run dev  # Servir localmente em http://localhost:3000
```

## Deploy

Ver `docs/BUILD_APK.md` para instruções completas.

### Frontend (Cloudflare Pages)
```bash
npx wrangler pages deploy www --project-name prova-acls
```

### Backend (Cloudflare Worker)
```bash
npx wrangler deploy worker/email.js --config wrangler.toml
```

## Configurações Necessárias

No Cloudflare Dashboard:
- Variável: `PROFESSORA_EMAIL` — email para onde enviar as respostas
- Binding: `SEND_EMAIL` — Cloudflare Email Service
- Alternativa: `RESEND_API_KEY` — API key do Resend.com