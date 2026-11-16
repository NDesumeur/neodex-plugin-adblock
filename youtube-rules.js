// Les règles YouTube d'uBlock Origin, lues à la source comme uBlock Origin le fait (ses listes « uBlock filters », « Quick fixes »,
// « Unbreak »), rafraîchies toutes les 12 h : YouTube change souvent, les correctifs d'uBO arrivent dans « Quick fixes » en quelques heures.
// Seuls les scriptlets (##+js) qui visent le site sont gardés, exceptions (#@#+js) retirées ; ils sont assemblés en un seul script
// avec les fonctions de Ghostery (reprises d'uBO), chaque fonction commune déclarée une fois, comme dans uBO.
const fs = require('fs'), path = require('path');
const { CosmeticFilter } = require('@ghostery/adblocker');

const LISTS = ['filters', 'quick-fixes', 'unbreak'];
const SOURCES = n => [`https://ublockorigin.github.io/uAssets/filters/${n}.min.txt`, `https://cdn.jsdelivr.net/gh/uBlockOrigin/uAssets@master/filters/${n}.min.txt`];
const MAX_AGE = 12 * 3600e3;
// les conditions !#if des listes, vues par uBlock Origin dans Chromium (version complète, pas uBO Lite)
const ENV = new Set(['ext_ublock', 'env_chromium', 'cap_user_stylesheet']);

function condition(expr) {
  if (!/^[\w\s!&|()]+$/.test(expr)) return false;
  const js = expr.replace(/\w+/g, w => ENV.has(w) ? 'true' : 'false');
  try { return Function('return (' + js + ')')(); } catch { return false; }  // seulement true/false/!/&&/||/() à ce stade
}
function preprocess(text) {
  const out = [], stack = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('!#if ')) { stack.push(condition(line.slice(5).trim())); continue; }
    if (line === '!#else') { stack[stack.length - 1] = !stack[stack.length - 1]; continue; }
    if (line === '!#endif') { stack.pop(); continue; }
    if (stack.every(Boolean) && line && !line.startsWith('!')) out.push(line);
  }
  return out;
}

// les scriptlets de ces listes qui s'appliquent à hostname : [{name, args}] dans l'ordre des listes
function rulesFor(lines, hostname) {
  const domain = hostname.split('.').slice(-2).join('.'), keep = new Map(), off = new Set();
  let allOff = false;
  for (const line of lines) {
    if (!line.includes('#+js(')) continue;
    let f; try { f = CosmeticFilter.parse(line); } catch { continue; }
    if (!f || !f.isScriptInject() || line.startsWith('#') || !f.match(hostname, domain)) continue;  // les règles sans site visent tout le web : laissées à Ghostery
    const s = f.parseScript(); if (!s) continue;
    const key = s.name.replace(/\.js$/, '') + '|' + s.args.join('|');
    if (f.isUnhide()) { if (!s.name) allOff = true; else off.add(key); } else keep.set(key, s);
  }
  return allOff ? [] : [...keep].filter(([k]) => !off.has(k)).map(([, s]) => s);
}

function assemble(resources, calls) {
  const deps = new Set(), body = [];
  for (const { name, args } of calls) {
    const s = resources.getRawScriptlet(name); if (!s) continue;  // un scriptlet que Ghostery n'a pas encore : sauté
    for (const d of resources.getScriptletDependencies(s)) deps.add(d);
    body.push(`try { (${s.body})(...${JSON.stringify(args)}); } catch (e) {}`);
  }
  if (!body.length) return '';
  return `(function () { var scriptletGlobals = {};\n${[...deps].join(';\n')};\nif (typeof safeSelf === 'function') scriptletGlobals.safeSelf = safeSelf();\n${body.join('\n')}\n})();`;
}

module.exports = function youtubeRules({ dir, fetch }) {
  const file = path.join(dir, 'ubo-youtube.txt');
  let lines = null, built = new Map(), loading = null;
  const load = () => { try { lines = preprocess(fs.readFileSync(file, 'utf8')); built = new Map(); } catch { lines = null; } };
  async function refresh() {
    const parts = [];
    for (const n of LISTS) {
      let text = null;
      for (const u of SOURCES(n)) try { const r = await fetch(u, { signal: AbortSignal.timeout(20000) }); if (r.ok) { text = await r.text(); break; } } catch {}
      if (text == null) throw new Error('liste uBO ' + n + ' injoignable');
      // seulement les lignes qui parlent de YouTube : le fichier gardé reste petit (quelques Ko au lieu de 2 Mo)
      parts.push(text.split(/\r?\n/).filter(l => l.startsWith('!#') || /youtube/i.test(l)).join('\n'));
    }
    fs.writeFileSync(file, parts.join('\n'));
    load();
  }
  function ensureFresh() {
    let age = Infinity; try { age = Date.now() - fs.statSync(file).mtimeMs; } catch {}
    if (age > MAX_AGE && !loading) loading = refresh().catch(e => console.error('règles YouTube d\'uBO :', e.message)).finally(() => { loading = null; });
  }
  load();
  return {
    ensureFresh,
    // le script à injecter pour ce site ; null si les listes ne sont pas encore là (Ghostery prend le relais)
    script(resources, hostname) {
      ensureFresh();
      if (!lines) return null;
      if (!built.has(hostname)) built.set(hostname, assemble(resources, rulesFor(lines, hostname)));
      return built.get(hostname);
    },
    assemble, _rulesFor: rulesFor, _preprocess: preprocess,
  };
};

// node youtube-rules.js : vérifie le préprocesseur et le choix des règles
if (require.main === module) {
  const L = preprocess('!#if env_firefox\nwww.youtube.com##+js(set, a, 1)\n!#else\nwww.youtube.com##+js(set, b, 1)\n!#endif\nyoutube.com##+js(set, c, 1)\nexample.com##+js(set, d, 1)\nwww.youtube.com#@#+js(set, c, 1)\n! commentaire');
  const r = rulesFor(L, 'www.youtube.com').map(s => s.args[0]);
  console.assert(JSON.stringify(r) === '["b"]', 'règles : ' + JSON.stringify(r));
  console.assert(condition('!ext_ubol') === true && condition('env_mobile') === false && condition('alert(1)') === false, 'conditions');
  console.log(JSON.stringify(r) === '["b"]' ? 'youtube-rules OK' : 'youtube-rules ÉCHEC');
}
