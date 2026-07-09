# Prova ACLS App

App para realização de prova ACLS (American Heart Association) em tablet — múltipla escolha com imagens de ECG, envio de respostas por email para a professora.

## Estrutura do Repositório

```
prova-acls-app/
├── pdfs/                    # PDFs originais da prova
│   ├── PROVA_ACLS.pdf       # PDF original (escaneado)
│   └── PROVA_ACLS_OCR.pdf   # PDF com texto extraível
├── imagens-ecg/             # 9 imagens de ritmos de ECG extraídas do PDF
│   ├── ecg_q02.png          # Q2 - Identificar ritmo
│   ├── ecg_q09.png          # Q9 - Bloqueio AV
│   ├── ecg_q22.png          # Q22 - Bloqueio AV
│   ├── ecg_q25.png          # Q25 - Bloqueio AV
│   ├── ecg_q29.png          # Q29 - Ritmo RCP
│   ├── ecg_q32_cenario.png  # Q32-35 - Cenário mulher 68 anos
│   ├── ecg_q42.png          # Q42 - Tratamento ritmo
│   ├── ecg_q48.png          # Q48 - Tratamento ritmo
│   └── ecg_q50.png          # Q50 - Caracterizar ritmo
├── paginas/                 # 11 páginas renderizadas do PDF (referência visual)
├── PROVA_ACLS.json          # Prova estruturada (50 questões, alternativas, imagens, cenários)
├── PROVA_TEXTO_BRUTO.txt    # Texto extraído do PDF via OCR
├── plano/                   # Plano de implementação do APK
│   └── PLANO_IMPLEMENTACAO.md
└── README.md                # Este arquivo
```

## Conteúdo da Prova

| Campo | Valor |
|---|---|
| **Título** | Prova ACLS - Exame A |
| **Instituição** | American Heart Association |
| **Data** | 13 de abril de 2021 |
| **Total de questões** | 50 |
| **Tipo** | Múltipla escolha (A, B, C, D) |
| **Com imagem ECG** | 9 questões (Q2, Q9, Q22, Q25, Q29, Q32, Q42, Q48, Q50) |
| **Com cenário clínico** | 10 questões (Q11-16: homem 45 anos; Q32-35: mulher 68 anos) |

## JSON — Estrutura

```json
{
  "titulo": "Prova ACLS - Exame A",
  "total_questoes": 50,
  "questoes": [
    {
      "id": 1,
      "text": "Qual desses exames deve ser realizado...",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."}
    },
    {
      "id": 2,
      "text": "Qual das opções melhor descreve esse ritmo?",
      "image": "ecg_q02.png",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."}
    },
    {
      "id": 11,
      "text": "Com base na apresentação inicial...",
      "scenario": "Há 2 dias, um homem de 45 anos...",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."}
    }
  ]
}
```

## Decisões de Arquitetura (Confirmadas)

| Decisão | Escolha |
|---|---|
| Backend | Cloudflare Pages + Workers (free, sem VPS) |
| Domínio | Subdomínio gratuito (.pages.dev) |
| Formato tablet | APK real instalável via sideload (sem Play Store) |
| Dispositivo | Tablet compartilhado, várias turmas/edições |
| Volume | 10-50 alunos simultâneos |
| Questões | Múltipla escolha (A-D) |
| Imagens | Essenciais — 9 questões dependem de leitura visual de ECG |
| Envio respostas | Servidor → email da professora via Nodemailer |

## Próximos Passos

Ver `plano/PLANO_IMPLEMENTACAO.md` para o plano detalhado de implementação.
