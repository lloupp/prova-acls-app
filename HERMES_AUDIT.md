# Auditoria Hermes — prova-acls-app

Gerado em: `2026-09-06 12:04:13`

## Escopo

- **Não alterei código-fonte nem arquivos de configuração.**
- Arquivo criado/atualizado por pedido do Eduardo: `HERMES_AUDIT.md`.
- Testes executados apenas quando havia comando/estrutura detectável, com timeout curto e sem instalar dependências do projeto.

## Resumo

- Tipo detectado: **Node/JavaScript app**
- Arquivos analisados: **246**
- Tamanho aproximado analisado: **74.19 MB**

## Linguagens / tipos de arquivo

- Outro: 157
- YAML: 53
- JavaScript: 13
- JSON: 10
- Java: 3
- Markdown: 2
- PDF: 2
- HTML: 2
- CSS: 2
- TOML: 1

## Arquivos principais vistos

- `.env.example`
- `.gitignore`
- `.playwright-mcp/console-2026-07-19T13-05-46-849Z.log`
- `.playwright-mcp/console-2026-07-19T17-12-17-345Z.log`
- `.playwright-mcp/console-2026-07-19T17-24-07-719Z.log`
- `.playwright-mcp/console-2026-07-20T03-02-26-548Z.log`
- `.playwright-mcp/console-2026-07-20T05-17-03-129Z.log`
- `.playwright-mcp/console-2026-07-20T09-03-09-387Z.log`
- `.playwright-mcp/console-2026-07-20T20-17-33-567Z.log`
- `.playwright-mcp/console-2026-07-20T21-02-13-343Z.log`
- `.playwright-mcp/console-2026-07-21T03-01-13-721Z.log`
- `.playwright-mcp/console-2026-07-21T09-01-28-833Z.log`
- `.playwright-mcp/page-2026-07-19T13-05-47-270Z.yml`
- `.playwright-mcp/page-2026-07-19T17-12-17-708Z.yml`
- `.playwright-mcp/page-2026-07-19T17-12-48-437Z.yml`
- `.playwright-mcp/page-2026-07-19T17-13-15-672Z.yml`
- `.playwright-mcp/page-2026-07-19T17-13-21-024Z.yml`
- `.playwright-mcp/page-2026-07-19T17-13-29-770Z.yml`
- `.playwright-mcp/page-2026-07-19T17-13-48-730Z.yml`
- `.playwright-mcp/page-2026-07-19T17-14-23-011Z.yml`
- `.playwright-mcp/page-2026-07-19T17-14-30-012Z.yml`
- `.playwright-mcp/page-2026-07-19T17-24-07-913Z.yml`
- `.playwright-mcp/page-2026-07-19T17-24-30-626Z.yml`
- `.playwright-mcp/page-2026-07-19T17-24-34-323Z.yml`
- `.playwright-mcp/page-2026-07-19T17-26-56-483Z.yml`
- `.playwright-mcp/page-2026-07-19T17-27-09-450Z.yml`
- `.playwright-mcp/page-2026-07-19T17-27-14-663Z.yml`
- `.playwright-mcp/page-2026-07-19T17-27-39-752Z.yml`
- `.playwright-mcp/page-2026-07-19T17-27-43-516Z.yml`
- `.playwright-mcp/page-2026-07-19T17-27-47-667Z.yml`
- `.playwright-mcp/page-2026-07-19T17-27-52-175Z.yml`
- `.playwright-mcp/page-2026-07-19T17-27-55-774Z.yml`
- `.playwright-mcp/page-2026-07-19T17-28-58-518Z.yml`
- `.playwright-mcp/page-2026-07-20T03-02-26-725Z.yml`
- `.playwright-mcp/page-2026-07-20T03-02-37-161Z.yml`
- `.playwright-mcp/page-2026-07-20T03-02-44-188Z.yml`
- `.playwright-mcp/page-2026-07-20T03-02-50-412Z.yml`
- `.playwright-mcp/page-2026-07-20T03-02-51-468Z.yml`
- `.playwright-mcp/page-2026-07-20T05-17-03-977Z.yml`
- `.playwright-mcp/page-2026-07-20T09-03-09-577Z.yml`
- … mais 206 arquivo(s)

## Estado Git

- Comando: `git status --short --branch`
- Exit code: `0`

```text
## main...origin/main
?? .env.example
?? .gitignore
?? .playwright-mcp/
?? capacitor.config.json
?? functions/
?? id.png
?? package-lock.json
?? package.json
?? q11-cenario.png
?? q2-ecg-render.png
?? q2-ecg.png
?? q2.png
?? q33.png
?? revisao.png
?? scripts/
?? sucesso.png
?? tela-id.png
?? tela-identificacao.png
?? worker/
?? wrangler.toml
?? www/
?? zoom-check.png
?? zoom-test.png
?? zoom.png
```

## Resultado dos testes / validações

### ✅ OK
- Comando: `npm test -- --watch=false`
- Exit code: `0`
- Tempo: `0.52s`

```text
> prova-acls-app@1.0.0 test
> node scripts/validate.js --watch=false

[1m== Validação Prova ACLS ==[0m

[1mPROVA_ACLS.json[0m
  [32m✓[0m 50 questões (50)
  [32m✓[0m ids únicos
  [32m✓[0m 9 questões com imagem ECG
  [32m✓[0m 10 questões com cenário clínico

[1mwww/data/PROVA_ACLS.json[0m
  [32m✓[0m 50 questões (50)
  [32m✓[0m ids únicos
  [32m✓[0m 9 questões com imagem ECG
  [32m✓[0m 10 questões com cenário clínico

[1mImagens WebP (www/imagens-ecg/)[0m
  [32m✓[0m 9 imagens WebP (9)

[32m✓ Tudo válido.[0m
```

### ✅ OK
- Comando: `npm run build`
- Exit code: `0`
- Tempo: `8.7s`

```text
> prova-acls-app@1.0.0 build
> cp PROVA_ACLS.json www/data/PROVA_ACLS.json && python3 scripts/optimize-images.py

  ecg_q02.png: 3.9MB -> 0.03MB  (1200x176) WebP q75
  ecg_q09.png: 5.5MB -> 0.03MB  (1200x224) WebP q75
  ecg_q22.png: 5.4MB -> 0.03MB  (1200x224) WebP q75
  ecg_q25.png: 5.5MB -> 0.03MB  (1200x231) WebP q75
  ecg_q29.png: 4.9MB -> 0.04MB  (1200x175) WebP q75
  ecg_q32_cenario.png: 3.9MB -> 0.03MB  (1200x176) WebP q75
  ecg_q42.png: 4.0MB -> 0.04MB  (1200x181) WebP q75
  ecg_q48.png: 5.9MB -> 0.04MB  (1200x223) WebP q75
  ecg_q50.png: 4.4MB -> 0.03MB  (1200x176) WebP q75
Total: 43.6MB -> 0.3MB (1% do original) | 9 imagens
```

### ✅ OK
- Comando: `python3 -m compileall -q /home/eduardodlima/projetos/prova-acls-app/scripts/optimize-images.py`
- Exit code: `0`
- Tempo: `0.79s`

```text
(sem saída)
```


## Propostas gerais de melhoria

1. Separar código fonte em estrutura clara (`src/`, `public/`, testes).
2. Criar documentação curta de arquitetura (`docs/arquitetura.md`).

## Próximo passo sugerido

Priorizar pequenas melhorias incrementais com teste antes/depois, porque o estado atual validou sem falhas nos checks executados.
