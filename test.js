#!/usr/bin/env node
/* Klinik mantık regresyon testleri — index.html'den GERÇEK kodu çıkarıp çalıştırır.
   Bağımlılık yok: `node test.js`. Bir eşik/ifade hatası girerse kırmızı verir.
   Kapsam: 15 klinik skor + parasetamol karar motoru + NAC doz rejimi. */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ ${name}${detail ? '  — ' + detail : ''}`); }
}

/* ---- index.html'den kendi-yeterli kod parçalarını çıkar ---- */
function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  if (s < 0) throw new Error('bulunamadı: ' + startMarker);
  const e = html.indexOf(endMarker, s) + endMarker.length;
  return html.slice(s, e);
}
// clinicalScores dizisi + defaultScoreCompute
eval(slice('const clinicalScores=[', '\n  ];').replace('const clinicalScores=', 'globalThis.clinicalScores='));
eval(slice('function defaultScoreCompute', '\n  }').replace('function defaultScoreCompute', 'globalThis.defaultScoreCompute=function'));
// NEWS2 puanlama yardımcısı (news2 compute/interpret bunu çağırır)
eval(slice('function news2Params', '\n  }').replace('function news2Params', 'globalThis.news2Params=function'));

// recalc mantığını taklit et: skor + yorum
function scoreText(id, v) {
  const def = clinicalScores.find(d => d.id === id);
  if (!def) throw new Error('skor yok: ' + id);
  const score = def.compute ? def.compute(v) : defaultScoreCompute(def, v);
  return def.decision ? def.interpret(score, v) : `Skor: ${score} — ${def.interpret(score, v)}`;
}

console.log('clinicalScores yüklendi:', clinicalScores.length, '(20 beklenir)');
check('skor sayısı = 20', clinicalScores.length === 20, String(clinicalScores.length));

/* ---- KLİNİK SKORLAR ---- */
const SCORE_TESTS = [
  // [id, v, beklenen-içerik]
  ['abcd2', { age60: true, bp: true, dm: true }, 'Skor: 3'],
  ['abcd2', { age60: true, bp: true, clinical: 2, duration: 2, dm: true }, 'Yüksek risk'],
  ['timi', { age65: true, rf: true, cad: true }, 'Skor: 3'],
  ['timi', { age65: true, rf: true, cad: true, asa: true, angina: true, st: true, tropo: true }, 'Çok yüksek'],
  ['heart', { history: 0, ekg: 0, age: 0, rf: 0, tropo: 0 }, 'Düşük risk'],
  ['heart', { history: 2, ekg: 2, age: 2, rf: 2, tropo: 2 }, 'Yüksek risk'],
  ['chads', {}, 'Çok düşük'],
  ['chads', { chf: true, htn: true }, 'Skor: 2'],
  ['chads', { age75: true }, 'Skor: 2'],
  ['chads', { female: true }, 'Çok düşük'],                       // yalnız cinsiyet puanı → AK yok
  ['chads', { female: true, htn: true }, 'düşünülmeli'],          // kadında 2 puan → düşünülmeli (önerilir değil)
  ['chads', { htn: true, dm: true }, 'Antikoagülasyon önerilir'],
  ['gbs', { sex: 'M', urea: 5, hb: 14, sbp: 105 }, 'Düşük risk'],  // GBS 1 → düşük risk (ESGE)
  ['curb65', { confusion: true }, 'Düşük risk'],
  ['curb65', { confusion: true, urea: true }, 'Skor: 2'],
  ['qsofa', { rr: true, mental: true }, 'Yüksek risk'],
  ['qsofa', { rr: true }, 'Düşük risk'],
  ['gbs', { sex: 'M', urea: 5, hb: 14, sbp: 120 }, 'Skor: 0'],
  ['gbs', { sex: 'M', urea: 8, hb: 9, sbp: 85, melena: true }, 'hospitalizasyon'],
  ['wellspe', { dvt: true, altdx: true }, 'PE olası'],
  ['wellspe', { hr: true }, 'Düşük olasılık'],
  ['wellsdvt', { cancer: true, paralysis: true, bedridden: true }, 'DVT olası'],
  ['wellsdvt', { altdx: true }, 'Düşük olasılık'],
  ['nexus', {}, 'gerek yok'],
  ['nexus', { tender: true }, 'endike'],
  ['ccr', { hrAge: true }, 'radyografi endike'],
  ['ccr', { lrSitting: true, rom: true }, 'gerek yok'],
  ['ccr', { lrSitting: true }, 'çevrilemiyor'],
  ['pecarn2', {}, 'önerilmez'],
  ['pecarn2', { gcs: true }, '%4,4'],
  ['pecarn2', { hematoma: true }, 'Gözlem vs BT'],
  ['pecarnOlder', { basilar: true }, '%4,3'],
  ['pecarnOlder', {}, 'önerilmez'],
  ['centor', { age: 0 }, 'Skor: 0'],
  ['centor', { exudate: true, nodes: true, fever: true, cough: true, age: 0 }, 'Skor: 4'],
  ['centor', { age: -1 }, 'Skor: -1'],
  // --- yeni eklenen skorlar ---
  ['hasbled', { htn: true, stroke: true }, 'Skor: 2'],
  ['hasbled', { htn: true, renal: true, stroke: true }, 'Yüksek kanama'],
  ['news2', { rr: 18, spo2: 97, o2: 'hava', sbp: 120, hr: 80, acvpu: 'alert', temp: 36.8 }, 'Çok düşük risk'],
  ['news2', { rr: 28, spo2: 90, o2: 'oksijen', sbp: 85, hr: 135, acvpu: 'degisik', temp: 39.5 }, 'Yüksek risk'],
  ['news2', { rr: 26 }, 'tek bir parametrede 3 puan'],
  ['perc', {}, 'PERC negatif'],
  ['perc', { age50: true }, '1 kriter pozitif'],
  ['ottawaAnkle', {}, 'radyografi gerekmez'],
  ['ottawaAnkle', { latMall: true }, 'ayak bileği grafisi'],
  ['ottawaAnkle', { mt5: true }, 'ayak (orta ayak) grafisi'],
  ['ottawaKnee', {}, 'radyografi gerekmez'],
  ['ottawaKnee', { age55: true }, 'diz grafisi endike'],
];
for (const [id, v, exp] of SCORE_TESTS) {
  const r = scoreText(id, v);
  check(`${id} ${JSON.stringify(v)}`, r.includes(exp), `bekl. "${exp}" ← "${r}"`);
}

/* ---- PARASETAMOL: gerçek calcParasetamol'u DOM stub ile çalıştır ---- */
function mkEl() { return { value: '', checked: false, innerHTML: '', style: {} }; }
const els = {};
['para_pattern', 'para_doz', 'para_kilo', 'para_sure', 'para_duzey', 'para_ast',
 'paraResult', 'nacRejim', 'para_doz_row', 'para_sure_row'].forEach(id => els[id] = mkEl());
global.document = { getElementById: id => els[id] || null };
eval(slice('function calcParasetamol', '\n  }\n  window.calcParasetamol')
  .replace('function calcParasetamol', 'globalThis.calcParasetamol=function')
  .replace(/\n  window\.calcParasetamol$/, ''));

function para({ pattern = 'akut', doz = '', kilo = '', sure = '', duzey = '', ast = false }) {
  els.para_pattern.value = pattern; els.para_doz.value = String(doz);
  els.para_kilo.value = String(kilo); els.para_sure.value = String(sure);
  els.para_duzey.value = String(duzey); els.para_ast.checked = ast;
  calcParasetamol();
  return { karar: els.paraResult.innerHTML, nac: els.nacRejim.innerHTML };
}
const PARA_TESTS = [
  ['akut toksik 3sa', { doz: 20, kilo: 70, sure: 3 }, ['286 mg/kg', 'Potansiyel toksik', 'Aktif kömür']],
  ['akut toksik 10sa', { doz: 20, kilo: 70, sure: 10 }, ['ampirik başla']],
  ['akut eşik altı', { doz: 3, kilo: 70, sure: 6 }, ['Eşik altı']],
  ['akut masif 40g', { doz: 40, kilo: 70, sure: 2 }, ['Masif alım', 'Potansiyel toksik']],
  ['akut AST yüksek', { doz: 20, kilo: 70, sure: 6, ast: true }, ['düzeyden bağımsız NAC']],
  ['tekrarlı düzey25', { pattern: 'tekrarli', duzey: 25 }, ['KULLANILAMAZ', '≥20 mcg/mL']],
  ['tekrarlı düzey15', { pattern: 'tekrarli', duzey: 15 }, ['gerekmez']],
  ['güvenilmez düzey12', { pattern: 'guvenilmez', duzey: 12 }, ['>10 mcg/mL']],
  ['güvenilmez düzey8', { pattern: 'guvenilmez', duzey: 8 }, ['gerekmez']],
  // Revised Rumack-Matthew: 4. sa 150, 8. sa 75, 12. sa 37,5 mcg/mL
  ['nomogram 4sa 160 üstte', { doz: 10, kilo: 60, sure: 4, duzey: 160 }, ['150 mcg/mL', 'ÜSTÜNDE', 'NAC başla']],
  ['nomogram 8sa 90 üstte', { doz: 10, kilo: 60, sure: 8, duzey: 90 }, ['75 mcg/mL', 'ÜSTÜNDE']],
  ['nomogram 8sa 60 altta', { doz: 10, kilo: 60, sure: 8, duzey: 60 }, ['çizginin altında', 'genelde gerekmez']],
  ['nomogram 12sa düzeysiz', { doz: 10, kilo: 60, sure: 6 }, ['Düzeyi gir', 'tedavi çizgisi 106']],
];
const deHtml = s => s.replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
for (const [name, inp, expects] of PARA_TESTS) {
  const k = deHtml(para(inp).karar);
  for (const e of expects) check(`parasetamol: ${name} ("${e}")`, k.includes(e), k.trim().slice(0, 120));
}

/* ---- NAC doz rejimi (kilodan mg) ---- */
const nac70 = para({ pattern: 'akut', kilo: 70 }).nac;
[['IV yük 150 mg/kg', '10500 mg'], ['IV 50 mg/kg', '3500 mg'], ['IV 100 mg/kg', '7000 mg'],
 ['oral yük 140 mg/kg', '9800 mg'], ['oral idame 70 mg/kg', '4900 mg'], ['SNAP 200 mg/kg', '14000 mg']]
  .forEach(([n, mg]) => check(`NAC 70kg: ${n}`, nac70.includes(mg), mg));

/* ---- ÖZET ---- */
console.log(`\n${pass} geçti, ${fail} başarısız`);
process.exit(fail ? 1 : 0);
