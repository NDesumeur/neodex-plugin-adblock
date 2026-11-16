// Bloqueur de pubs, volet système : le moteur de Ghostery avec toutes les listes d'uBlock Origin (filtres, vie privée, nuisances,
// bandeaux de cookies) et EasyList, rafraîchies chaque semaine, posé sur les sessions des sites de NeoDex (api.webSessions).
// YouTube a son propre traitement (youtube-adblock.js et youtube-rules.js) : les listes génériques y cachent le lecteur.
// Avant NeoDex 3.2, tout ceci était dans NeoDex (app/main.js) ; les réglages d'alors sont repris une fois (« legacy »).
const path = require('path'), fs = require('fs');
const { ElectronBlocker, Request } = require('@ghostery/adblocker-electron');

const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const isYouTube = h => /(^|\.)youtube(-nocookie)?\.com$/.test(h);
// les lecteurs vidéo des sites d'anime : les listes génériques les cassent, le bloqueur les laisse (eux et les pages qui les montrent)
const PLAYER_HOSTS = /(^|\.)(uqload|sendvid)\.[a-z]+$/;
// le « site » d'une adresse : ses deux derniers morceaux (mail.google.com -> google.com), trois pour co.uk, com.au…
// shortcut: liste des suffixes à deux morceaux réduite aux plus courants, prendre la Public Suffix List si un site se plaint
const siteOf = h => { const p = String(h).split('.'); return p.slice(/^(co|com|org|net|gouv|ac|gov|edu)$/.test(p[p.length - 2]) && p.length > 2 ? -3 : -2).join('.'); };
console.assert(siteOf('mail.google.com') === 'google.com' && siteOf('www.bbc.co.uk') === 'bbc.co.uk', 'siteOf');

module.exports = function (api) {
  const E = api.electron, { webContents } = E, dataDir = api.dataDir; fs.mkdirSync(dataDir, { recursive: true });
  const cfg = { on: true, off: [], mine: [], ...(api.readDoc('reglages') || {}) };  // off : les sites où il est coupé ; mine : les domaines que tu as bloqués toi-même
  const save = () => api.writeDoc('reglages', cfg);
  const view = () => ({ on: cfg.on, off: cfg.off, mine: cfg.mine, lists: listsAt(), ready: !!blocker });
  const tell = () => api.emit('state', view());
  // coupé partout, sur le site de l'onglet, sur YouTube (géré à part) ou sur un lecteur d'anime
  const blockingOff = url => { const h = hostOf(url); return !cfg.on || isYouTube(h) || PLAYER_HOSTS.test(h) || cfg.off.includes(h); };
  const youtubeOn = () => cfg.on && !cfg.off.includes('youtube.com');
  const LISTS = path.join(dataDir, 'adblock-full.bin'), listsAt = () => { try { return fs.statSync(LISTS).mtimeMs; } catch { return 0; } };
  const uboYoutube = require('./youtube-rules')({ dir: dataDir, fetch });

  let blocker = null, alive = true;
  const sessions = new Set(), preloads = new Map(), adSeen = new Map();  // webContentsId -> [{h, type}] : ce qui est passé sans être bloqué
  const tabUrl = d => d.resourceType === 'mainFrame' ? d.url : (d.webContentsId && webContents.fromId(d.webContentsId)?.getURL()) || d.referrer || d.url;
  function onSession(ses) {
    if (sessions.has(ses)) return; sessions.add(ses);
    // le script YouTube passe avant le premier script de la page (préchargement) ; registerPreloadScript rend son numéro, pour le retirer
    try { preloads.set(ses, ses.registerPreloadScript({ type: 'frame', filePath: path.join(__dirname, 'youtube-adblock.js') })); } catch (e) { console.error('bloqueur, YouTube :', e.message); }
    if (blocker) enable(ses);
  }
  function enable(ses) {
    try { blocker.enableBlockingInSession(ses); } catch {  // le moteur n'enregistre ses messages qu'une fois : une deuxième session (fenêtre privée) n'a que le filtrage réseau
      ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (d, cb) => blocker.onBeforeRequest(d, cb));
      ses.webRequest.onHeadersReceived({ urls: ['<all_urls>'] }, (d, cb) => blocker.onHeadersReceived(d, cb));
    }
  }
  api.webSessions(onSession);

  // les listes : téléchargées par Ghostery une fois par semaine (le fichier est gardé dans le dossier du plugin)
  try { if (Date.now() - listsAt() > 7 * 864e5) fs.unlinkSync(LISTS); } catch {}
  ElectronBlocker.fromPrebuiltFull(fetch, { path: LISTS, read: fs.promises.readFile, write: fs.promises.writeFile }).then(b => {
    if (!alive) return;
    for (const k of ['onBeforeRequest', 'onHeadersReceived']) { const orig = b[k]; b[k] = (d, cb) => blockingOff(tabUrl(d)) || PLAYER_HOSTS.test(hostOf(d.url)) ? cb({}) : orig(d, cb); }
    // « une pub est passée » : ce que chaque onglet a chargé d'un autre site sans être bloqué (les 400 derniers), et les domaines que tu as bloqués toi-même
    const orig = b.onBeforeRequest;
    b.onBeforeRequest = (d, cb) => {
      const h = hostOf(d.url), top = tabUrl(d);
      if (d.resourceType === 'mainFrame' && d.webContentsId) adSeen.delete(d.webContentsId);  // une nouvelle page : on repart de zéro
      if (!blockingOff(top) && cfg.mine.some(m => h === m || h.endsWith('.' + m))) return cb({ cancel: true });
      orig(d, r => { if (!r?.cancel && !r?.redirectURL && d.webContentsId && h && siteOf(h) !== siteOf(hostOf(top))) { const l = adSeen.get(d.webContentsId) || []; l.push({ h, type: d.resourceType }); if (l.length > 400) l.shift(); adSeen.set(d.webContentsId, l); } cb(r); });
    };
    const inject = b.onInjectCosmeticFilters;
    b.onInjectCosmeticFilters = (e, url, msg) => blockingOff(e.sender.getURL()) ? undefined : inject(e, url, msg);
    blocker = b; for (const ses of sessions) enable(ses);
    uboYoutube.ensureFresh(); tell();
  }).catch(e => console.error('bloqueur de pub indisponible :', e.message));

  // NeoDex demande : laisser ce site tranquille (anti-pistage, fenêtres surgissantes) ? cette adresse est-elle une régie de pub ?
  api.blocker?.({
    off: blockingOff,
    isAd: (url, page) => { if (!blocker || blockingOff(page)) return false; try { return !!blocker.match(Request.fromRawDetails({ url, sourceUrl: page, type: 'sub_frame' })).match; } catch { return false; } },
  });

  // YouTube : les règles d'uBlock Origin données d'un coup au préchargement (l'injection de Ghostery, asynchrone, y arrive trop tard)
  const ytStyles = new Map();
  function youtubeRules(url) {
    const h = new URL(url).hostname, script = uboYoutube.script(blocker.resources, h);
    if (!ytStyles.has(h)) {
      let filters = []; const inject = blocker.injectCosmeticFilters;  // les règles elles-mêmes, pas les scripts séparés de Ghostery
      blocker.injectCosmeticFilters = function (f, o) { filters = f; return inject.call(this, f, o); };
      try { const { styles = '' } = blocker.getCosmeticsFilters({ url, hostname: h, domain: h.split('.').slice(-2).join('.'),
        getBaseRules: false, getInjectionRules: true, getExtendedRules: false, getRulesFromHostname: true, getRulesFromDOM: false });
        ytStyles.set(h, { styles, fallback: uboYoutube.assemble(blocker.resources, filters.filter(f => f.isScriptInject()).map(f => f.parseScript()).filter(Boolean)) }); }
      finally { blocker.injectCosmeticFilters = inject; }
    }
    const g = ytStyles.get(h);
    return { script: script ?? g.fallback, styles: g.styles };
  }
  const ipc = {
    'adblock:youtube': (e, url) => {
      const on = youtubeOn(); let rules = { script: '', styles: '' };
      if (on && blocker && url) try { rules = youtubeRules(url); } catch (err) { console.error('règles YouTube :', err.message); }
      e.returnValue = on && rules;
    },
    // le mur anti-bloqueur de YouTube est revenu : la page propose de couper le bloqueur sur YouTube (une fois par onglet)
    'adblock:wall': e => { if (/(^|\.)youtube\.com$/.test(hostOf(e.sender.getURL() || 'about:blank'))) api.emit('wall', e.sender.id); },
    // un vrai clic de souris sur « Passer » (youtube-adblock.js en donne la place) : YouTube ignore les clics des scripts
    'adblock:skip': (e, x, y) => {
      const wc = e.sender; if (!Number.isFinite(x) || !Number.isFinite(y) || !/(^|\.)youtube(-nocookie)?\.com$/.test(new URL(wc.getURL() || 'about:blank').hostname)) return;
      for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) wc.sendInputEvent({ type, x, y, button: 'left', clickCount: 1 });
    },
  };
  for (const [k, f] of Object.entries(ipc)) E.ipcMain.on(k, f);

  // ce que demande la page du plugin
  const reload = () => { for (const wc of webContents.getAllWebContents()) if (!wc.isDestroyed() && wc.getType() === 'webview') try { wc.reload(); } catch {} };
  api.ipcMain.handle('state', () => view());
  api.ipcMain.handle('set', (_, on) => { cfg.on = !!on; save(); reload(); tell(); return view(); });
  api.ipcMain.handle('site', (_, host, off) => {  // couper (off) ou rallumer le bloqueur sur un site
    host = hostOf('https://' + String(host)); if (!host) throw new Error('site invalide');
    cfg.off = off ? [...new Set([...cfg.off, host])] : cfg.off.filter(h => h !== host); save(); tell(); return view();
  });
  api.ipcMain.handle('unmine', (_, site) => { cfg.mine = cfg.mine.filter(m => m !== site); save(); tell(); return view(); });
  api.ipcMain.handle('seen', (_, wcId) => {
    const n = {}; for (const { h, type } of adSeen.get(wcId) || []) { const k = siteOf(h); (n[k] ??= { site: k, hosts: new Set(), types: new Set(), count: 0 }).count++; n[k].hosts.add(h); n[k].types.add(type); }
    return Object.values(n).map(x => ({ site: x.site, hosts: [...x.hosts], types: [...x.types], count: x.count })).sort((a, b) => b.count - a.count);
  });
  // tu bloques des domaines : ils le sont tout de suite, et la liste part dans pubs-signalees.txt (à joindre pour qu'ils entrent dans la liste de tout le monde)
  api.ipcMain.handle('report', (_, { page, sites } = {}) => {
    sites = (Array.isArray(sites) ? sites : []).map(String).filter(s => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)).slice(0, 50);
    cfg.mine = [...new Set([...cfg.mine, ...sites])]; save(); tell();
    fs.appendFileSync(path.join(dataDir, 'pubs-signalees.txt'), new Date().toISOString() + ' ' + String(page).slice(0, 300) + '\n' + sites.map(s => '  ' + s).join('\n') + '\n');
    return cfg.mine;
  });
  // les réglages du bloqueur de NeoDex 3.1 (settings.json), repris une seule fois
  api.ipcMain.handle('legacy', (_, old) => {
    if (cfg.legacy || !old || typeof old !== 'object') return view();
    cfg.legacy = 1;
    if (typeof old.adblock === 'boolean') cfg.on = old.adblock;
    const hosts = l => (Array.isArray(l) ? l : []).map(String).filter(h => /^[a-z0-9.-]+$/i.test(h)).slice(0, 500);
    cfg.off = [...new Set([...cfg.off, ...hosts(old.adblockOff)])]; cfg.mine = [...new Set([...cfg.mine, ...hosts(old.adblockMine)])];
    save(); tell(); return view();
  });

  return () => {  // plugin désactivé ou désinstallé : plus rien ne bloque, les sites rechargés retrouvent tout
    alive = false;
    for (const k of Object.keys(ipc)) E.ipcMain.removeAllListeners(k);
    for (const ses of sessions) {
      try { blocker?.disableBlockingInSession(ses); } catch {}
      try { ses.webRequest.onBeforeRequest(null); ses.webRequest.onHeadersReceived(null); } catch {}
      try { const id = preloads.get(ses); if (id) ses.unregisterPreloadScript(id); } catch {}
    }
    blocker = null;
  };
};
