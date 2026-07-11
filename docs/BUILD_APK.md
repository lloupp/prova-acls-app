# Build APK - Instruções

## Requisitos (em Linux com Android Studio)
- Android SDK instalado
- Android Studio ou linha de comando com Gradle
- JDK 11+

## Passos para build

```bash
# 1. Adicionar plataforma Android ao projeto
npx cap add android

# 2. Sincronizar assets
npx cap sync

# 3. Abrir no Android Studio (opcional)
npx cap open android

# 4. Build via Gradle
cd android
./gradlew assembleRelease

# APK gerado em: android/app/build/outputs/apk/release/app-release.apk
```

## Deploy Cloudflare (em Termux ou Linux)

```bash
# Instalar Wrangler se não tiver
npm install -g wrangler

# Login com conta Cloudflare
wrangler login

# Deploy do Worker
cd worker
npx wrangler deploy

# Deploy do frontend (do diretório raiz)
npx wrangler pages deploy www --project-name prova-acls
```

## Configuração do Worker

1. No Cloudflare Dashboard:
   - Criar variável `PROFESSORA_EMAIL` com o email da professora
   - Configurar binding `SEND_EMAIL` ou `RESEND_API_KEY`

2. Configurar domínio:
   - Criar domínio no Cloudflare
   - Configurar Email Sending (requer verificação de destinatários)