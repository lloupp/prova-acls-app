/* Validação da prova: 50 questões, opções A-D não vazias, imagens existentes.
 * Usado como `npm test`. Sai com código 1 se houver qualquer erro.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const erros = [];
const avisos = [];

function ok(msg) { console.log('  \x1b[32m✓\x1b[0m ' + msg); }
function fail(msg) { erros.push(msg); console.log('  \x1b[31m✗\x1b[0m ' + msg); }

// Valida o JSON em uma dada localização
function validarJSON(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { fail(`Arquivo ausente: ${rel}`); return null; }
  let prova;
  try { prova = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { fail(`JSON inválido em ${rel}: ${e.message}`); return null; }

  console.log(`\n\x1b[1m${rel}\x1b[0m`);
  const qs = prova.questoes;
  if (!Array.isArray(qs)) { fail('questoes não é um array'); return prova; }

  qs.length === 50 ? ok(`50 questões (${qs.length})`) : fail(`Esperadas 50 questões, encontradas ${qs.length}`);
  prova.total_questoes === qs.length || avisos.push(`total_questoes (${prova.total_questoes}) ≠ nº de questões (${qs.length})`);

  const ids = new Set();
  let comImagem = 0, comCenario = 0;
  for (const q of qs) {
    const tag = `Q${q.id}`;
    if (ids.has(q.id)) fail(`${tag}: id duplicado`);
    ids.add(q.id);
    if (!q.text || !q.text.trim()) fail(`${tag}: enunciado vazio`);
    const opt = q.options || {};
    const chaves = Object.keys(opt).sort().join('');
    if (chaves !== 'ABCD') fail(`${tag}: opções esperadas A,B,C,D — encontradas [${chaves}]`);
    for (const k of ['A', 'B', 'C', 'D']) {
      if (!opt[k] || !String(opt[k]).trim()) fail(`${tag}: opção ${k} vazia`);
    }
    if (q.image) {
      comImagem++;
      const imgWww = path.join(ROOT, 'www', 'imagens-ecg', q.image);
      if (!fs.existsSync(imgWww)) fail(`${tag}: imagem não copiada para www/imagens-ecg/${q.image} (rode npm run build)`);
    }
    if (q.scenario) comCenario++;
  }
  ids.size === qs.length ? ok('ids únicos') : fail('ids duplicados encontrados');
  ok(`${comImagem} questões com imagem ECG`);
  ok(`${comCenario} questões com cenário clínico`);
  return prova;
}

console.log('\x1b[1m== Validação Prova ACLS ==\x1b[0m');
validarJSON('PROVA_ACLS.json');
validarJSON('www/data/PROVA_ACLS.json');

// Verifica que as 9 imagens WebP existem em www/imagens-ecg/
console.log('\n\x1b[1mImagens WebP (www/imagens-ecg/)\x1b[0m');
const imgsWww = fs.existsSync(path.join(ROOT, 'www', 'imagens-ecg'))
  ? fs.readdirSync(path.join(ROOT, 'www', 'imagens-ecg')).filter(f => f.endsWith('.webp')) : [];
imgsWww.length === 9 ? ok(`9 imagens WebP (${imgsWww.length})`) : fail(`Esperadas 9 imagens WebP, encontradas ${imgsWww.length}`);

if (avisos.length) {
  console.log('\n\x1b[33mAvisos:\x1b[0m');
  avisos.forEach(a => console.log('  ! ' + a));
}

console.log('');
if (erros.length) {
  console.log(`\x1b[31m✗ ${erros.length} erro(s) encontrado(s).\x1b[0m`);
  process.exit(1);
}
console.log('\x1b[32m✓ Tudo válido.\x1b[0m');
