// Bloqueur de pubs, côté page : le bouton ADBLOCK de la barre d'adresse (clic : couper / rallumer sur le site ; clic droit : « une pub
// est passée ? »), l'alerte quand YouTube repère le bloqueur, et l'onglet du plugin (allumé ou non, sites exclus, domaines bloqués).
// Tout le blocage se fait dans le volet système (main.js).
const CSS = `
#bAdblock.off{--c:#5a1f36;color:var(--red,#ff4f6d)} #bAdblock.na{opacity:.4}
.adPop{position:fixed;z-index:46;width:min(430px,calc(100vw - 16px));max-height:70vh;display:flex;flex-direction:column;gap:8px;padding:14px} .adPop>b{font:14px var(--title);color:var(--pink)}
.adRows{overflow-y:auto;display:flex;flex-direction:column} .adRow{display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:var(--cp,pointer)} .adRow:hover{background:rgba(var(--mgr),.12)}
.adRow span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .adRow small{color:var(--muted);font-size:11px} .adNav{display:flex;justify-content:flex-end;gap:8px}
.abWrap{max-width:clamp(720px,72vw,1400px);margin:0 auto;padding:clamp(16px,1.6vw,30px);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));align-items:start;gap:clamp(12px,1.2vw,22px);box-sizing:border-box}
.abCard{padding:clamp(14px,1.3vw,24px);display:flex;flex-direction:column;gap:10px;background:color-mix(in srgb,var(--line2,#3a2a6e) 45%,#000);box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e);min-width:0}
.abCard .t{font:clamp(8px,.6vw,11px) var(--title);letter-spacing:1px;color:var(--lilac,#c9bde6)}
.abBig{font:clamp(20px,1.7vw,32px) var(--title);color:#fff}.abBig.on{color:#3fdc7a}
.abHint{font-size:clamp(12px,.85vw,15px);color:var(--muted,#9a8cc0);line-height:1.5}
.abChips{display:flex;flex-wrap:wrap;gap:6px} .abChips .chip{max-width:100%;overflow:hidden;text-overflow:ellipsis}
.abSite{display:flex;flex-direction:column;gap:6px;padding:8px 0;border-top:1px solid var(--line2,#3a2a6e)} .abSite:first-child{border-top:0}
.abSite>div{display:flex;align-items:center;gap:8px;color:#fff} .abSite>div span{flex:1;overflow:hidden;text-overflow:ellipsis} .abSite .chip{font:12px Consolas,monospace}
.adPick{align-self:flex-start}
.abCats{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 12px} .abCats label{display:flex;align-items:center;gap:8px;cursor:var(--cp,pointer);color:#fff;font-size:clamp(13px,.88vw,15px)} .abCats input{width:18px;height:18px}
`;
// le sélecteur d'éléments, lancé dans la page du site : la souris montre un bloc, ↑ ↓ l'agrandit ou le réduit, le clic le masque.
// Il rend le sélecteur CSS du bloc (un id stable, sinon les classes et la place parmi ses frères, jusqu'à ne désigner que lui), ou null (Échap).
// Les noms qui ressemblent à du hasard (chiffres, majuscules mêlées) changent à chaque visite : ils sont laissés de côté.
function pickerInPage(txt) {
  return new Promise(done => {
    window.__ndPick?.();
    const box = document.createElement('div'), tip = document.createElement('div');
    box.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;background:rgba(255,77,109,.22);outline:2px solid #ff4d6d;left:0;top:0;width:0;height:0';
    tip.style.cssText = 'position:fixed;z-index:2147483647;left:16px;bottom:16px;max-width:min(560px,60vw);padding:8px 14px;background:#140a26;color:#fff;font:14px system-ui,sans-serif;box-shadow:0 0 0 2px #ff4d6d;pointer-events:none;white-space:pre-wrap;text-align:center;overflow-wrap:anywhere';
    const stable = s => !!s && s.length < 40 && !/\d{3,}/.test(s) && !/[A-Z].*\d|\d.*[A-Z]/.test(s) && !/^(css|sc|jsx|emotion|svelte)-/i.test(s);
    const sel = el => {
      const parts = [];
      for (let e = el; e && e.nodeType === 1 && e !== document.body && e !== document.documentElement; e = e.parentElement) {
        if (e.id && stable(e.id)) { parts.unshift('#' + CSS.escape(e.id)); break; }
        let p = e.tagName.toLowerCase(); const cls = [...e.classList].filter(stable).slice(0, 2);
        if (cls.length) p += cls.map(c => '.' + CSS.escape(c)).join('');
        const par = e.parentElement; if (par && [...par.children].filter(c => c.matches(p)).length > 1) p += ':nth-child(' + ([...par.children].indexOf(e) + 1) + ')';
        parts.unshift(p); if (document.querySelectorAll(parts.join(' > ')).length === 1) break;
      }
      return parts.join(' > ');
    };
    let cur = null, stack = [];
    const show = () => { if (!cur) return; const r = cur.getBoundingClientRect(); Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); tip.textContent = txt.help + '\n' + sel(cur); };
    const block = e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
    const move = e => { const t = document.elementFromPoint(e.clientX, e.clientY); if (t && t !== cur && t !== document.body && t !== document.documentElement) { cur = t; stack = []; show(); } };
    const pickIt = e => { block(e); if (!cur) return; const s = sel(cur), all = document.querySelectorAll(s); all.forEach(x => x.style.setProperty('display', 'none', 'important')); stop({ selector: s, count: all.length }); };
    const up = () => { const p = cur?.parentElement; if (p && p !== document.body && p !== document.documentElement) { stack.push(cur); cur = p; show(); } };
    const down = () => { if (stack.length) { cur = stack.pop(); show(); } };
    const key = e => { if (e.key === 'Escape') { block(e); stop(null); } else if (e.key === 'ArrowUp') { block(e); up(); } else if (e.key === 'ArrowDown') { block(e); down(); } else if (e.key === 'Enter') pickIt(e); };
    const evs = [['mousemove', move], ['click', pickIt], ['mousedown', block], ['mouseup', block], ['pointerdown', block], ['pointerup', block], ['contextmenu', block], ['keydown', key]];
    const stop = r => { for (const [n, f] of evs) removeEventListener(n, f, true); box.remove(); tip.remove(); delete window.__ndPick; done(r); };
    for (const [n, f] of evs) addEventListener(n, f, true);
    window.__ndPick = () => stop(null);
    tip.textContent = txt.start; document.documentElement.append(box, tip);
  });
}

export default async function (ctx) {
  const { el, toast, neo, host } = ctx, ID = ctx.id, call = (n, ...a) => neo.pluginMain(ID, n, ...a);
  host.addStyle(CSS);
  let st; try { st = await call('state'); } catch (e) { ctx.view.replaceChildren(el('div', 'hint', 'Le bloqueur ne démarre pas : ' + e.message)); return; }
  let alive = true;
  // les réglages du bloqueur de NeoDex 3.1 (avant qu'il devienne ce plugin) : repris une fois
  try { const s = await neo.getSettings(); st = await call('legacy', { adblock: s.adblock, adblockOff: s.adblockOff, adblockMine: s.adblockMine }); } catch {}

  // le bouton, à la place qu'avait celui de NeoDex : juste avant la place réservée (#bShield), le VPN se met juste après
  document.getElementById('bAdblock')?.remove();
  const btn = el('button', 'btn px', 'ADBLOCK'); btn.id = 'bAdblock';
  const slot = document.getElementById('bShield'); if (slot) slot.before(btn); else document.querySelector('.bBar')?.append(btn);
  const site = () => typeof active !== 'undefined' && active && !active.app && typeof hostOf === 'function' ? hostOf(active.url) : '';
  function paint() {
    const h = site(), off = !st.on || st.off.includes(h);
    btn.className = 'btn px' + (!st.on ? ' na' : off ? ' off' : '');
    btn.textContent = off ? 'ADBLOCK OFF' : 'ADBLOCK ON';
    btn.title = !st.on ? 'Bloqueur coupé partout (onglet Bloqueur de pubs)' : (off ? 'Réactiver' : 'Désactiver') + ' le bloqueur sur ' + (h || 'ce site') + ' · clic droit : une pub est passée ?';
    if (view.isConnected) render();
  }
  // NeoDex appelle updateShield() à chaque nouvelle page ou onglet : le bouton suit le site affiché
  const prevShield = window.updateShield; window.updateShield = () => { try { prevShield?.(); } catch {} paint(); };
  const T = x => host?.t ? host.t(x) : x;
  // MASQUER UN BLOC : le sélecteur d'éléments dans l'onglet affiché, le bloc choisi est gardé pour ce site
  async function pick() {
    const h = site(); if (!h || active.lazy) return toast('Ouvre d’abord la page où est le bloc', true);
    const t = active; document.querySelector('.adPop')?.remove();
    try { t.v.focus(); } catch {}
    toast('Montre le bloc avec la souris et clique dessus · Échap : annuler');
    let r = null;
    try { r = await t.v.executeJavaScript('(' + pickerInPage + ')(' + JSON.stringify({ help: T('Clic : masquer ce bloc · ↑ ↓ : plus grand ou plus petit · Échap : annuler'), start: T('Montre avec la souris le bloc à masquer') }) + ')'); }
    catch (e) { return toast('Impossible sur cette page : ' + e.message, true); }
    if (!r?.selector) return;
    st = await call('hide', h, r.selector); paint();
    toast('Bloc masqué sur ' + h + (r.count > 1 ? ' (' + r.count + ' blocs pareils)' : '') + '. Tu peux le rendre dans l’onglet Bloqueur de pubs.');
  }
  const reloadTab = () => { try { if (typeof onView === 'function') onView(v => v.reload()); } catch {} };
  btn.onclick = async () => {
    const h = site(); if (!h || !st.on) return;
    const off = st.off.includes(h);
    st = await call('site', h, !off); paint(); reloadTab();
    toast((off ? 'Bloqueur réactivé sur ' : 'Bloqueur désactivé sur ') + h);
  };
  // clic droit : « une pub est passée ? » : les sites que la page a chargés sans blocage, à cocher pour les bloquer
  btn.oncontextmenu = async e => {
    e.preventDefault(); document.querySelector('.adPop')?.remove();
    if (!site() || active.lazy || !st.on) return toast('Ouvre le site où la pub est passée', true);
    const list = await call('seen', active.v.getWebContentsId()), r = btn.getBoundingClientRect();
    const p = el('div', 'adPop panel px'), rows = el('div', 'adRows'), ok = el('button', 'btn main px', 'BLOQUER'), no = el('button', 'btn px', 'Fermer');
    p.style.left = Math.max(8, Math.min(innerWidth - 440, r.left - 160)) + 'px'; p.style.top = r.bottom + 8 + 'px';
    const pk = el('button', 'btn px adPick', 'MASQUER UN BLOC…'); pk.title = 'Clique sur un bloc de la page pour le faire disparaître, sur ce site, à chaque visite'; pk.onclick = pick;
    p.append(el('b', '', 'Une pub est passée ?'), pk, el('div', 'hint', list.length ? 'Ces sites ont été chargés par la page sans être bloqués. Coche ceux qui affichent la pub : ils seront bloqués partout.' : 'Rien d’un autre site n’est passé sur cette page. La pub vient du site lui-même : recharge la page puis réessaie.'), rows);
    for (const x of list.slice(0, 40)) {
      const lab = el('label', 'adRow'), cb = el('input'); cb.type = 'checkbox'; cb.value = x.site;  // rien de coché d'avance : un site à lui (son serveur d'images) ressemble souvent à une régie
      lab.append(cb, el('span', '', x.site), el('small', '', x.count + ' · ' + x.types.map(t => ({ subFrame: 'cadre', script: 'script', image: 'image', xhr: 'données', media: 'vidéo' })[t] || t).join(', '))); lab.title = x.hosts.join('\n'); rows.append(lab);
    }
    const nav = el('div', 'adNav'); nav.append(no, ok); if (list.length) p.append(nav); else p.append(no);
    no.onclick = () => p.remove();
    ok.onclick = async () => {
      const sites = [...rows.querySelectorAll('input:checked')].map(c => c.value); if (!sites.length) return toast('Coche au moins un site', true);
      await call('report', { page: active.url, sites }); st = await call('state'); p.remove(); reloadTab();
      toast(sites.length + ' site(s) bloqué(s). Ils sont notés dans pubs-signalees.txt (dossier du plugin) pour la liste de tout le monde.');
    };
    document.body.append(p);
  };
  // le volet système : son état a changé, ou YouTube a repéré le bloqueur et bloque la vidéo
  neo.onPluginMain(e => {
    if (!alive || e.id !== ID) return;
    if (e.name === 'state') { st = e.data; paint(); }
    if (e.name === 'wall' && !st.off.includes('youtube.com') && typeof siteBar === 'function' && typeof tabOfWc === 'function') {
      const t = tabOfWc(e.data); if (!t) return;
      siteBar({ key: 'ytwall', host: 'youtube.com', icon: '!', tab: t, timeout: 90e3, text: 'a repéré le bloqueur de pubs et bloque la vidéo. Couper le bloqueur sur YouTube ? Les pubs reviendront sur YouTube seulement (réactivable dans l’onglet Bloqueur de pubs).',
        actions: [{ label: 'Couper sur YouTube', main: true, run: async () => { st = await call('site', 'youtube.com', true); paint(); t.v.reload(); } }, { label: 'Garder', run: () => {} }] });
    }
  });

  // l'onglet du plugin
  const view = ctx.view, big = el('div', 'abBig'), go = el('button', 'btn px'), lists = el('div', 'abHint'), offBox = el('div', 'abChips'), mineBox = el('div', 'abChips'), hideBox = el('div'), sbBig = el('div', 'abBig'), sbGo = el('button', 'btn px'), sbCats = el('div', 'abCats'), sbStat = el('div', 'abHint');
  const card = (title, ...kids) => { const c = el('div', 'abCard'); c.append(el('div', 't', title), ...kids); return c; };
  const wrap = el('div', 'abWrap');
  wrap.append(
    card('BLOQUEUR', big, go, lists, el('div', 'abHint', 'Toutes les listes d’uBlock Origin (pubs, pistage, nuisances, bandeaux de cookies) et EasyList, rafraîchies chaque semaine. YouTube a ses propres règles, reprises d’uBlock Origin toutes les 12 heures.')),
    card('SITES OÙ IL EST COUPÉ', offBox, el('div', 'abHint', 'Le bouton ADBLOCK de la barre d’adresse en ajoute un. La croix y rallume le bloqueur.')),
    card('BLOCS MASQUÉS', hideBox, el('div', 'abHint', 'Clic droit sur ADBLOCK, puis MASQUER UN BLOC… : clique sur un bloc de la page (↑ ↓ pour l’agrandir ou le réduire) ; il disparaît sur ce site, à chaque visite. La croix le rend.')),
    card('YOUTUBE : PASSAGES SPONSORISÉS', sbBig, sbGo, sbCats, sbStat, el('div', 'abHint', 'Les passages sponsorisés des vidéos YouTube sont sautés tout seuls (avec une petite note en bas à gauche), d’après SponsorBlock, une base remplie par les spectateurs. NeoDex n’envoie que le début d’une empreinte de la vidéo : SponsorBlock ne sait pas laquelle tu regardes. Marche aussi pour les vidéos ouvertes depuis Chaînes YouTube.')),
    card('DOMAINES QUE TU AS BLOQUÉS', mineBox, el('div', 'abHint', 'Ajoutés par le clic droit sur ADBLOCK (« une pub est passée ? »). La croix le débloque.')));
  view.replaceChildren(wrap);
  const SB = [['sponsor', 'Sponsors'], ['selfpromo', 'Autopromo (ses produits, sa chaîne)'], ['interaction', 'Rappels d’abonnement'], ['intro', 'Génériques de début'], ['outro', 'Génériques de fin'], ['preview', 'Aperçus et résumés'], ['filler', 'Passages hors-sujet'], ['music_offtopic', 'Musique : passages sans musique']];
  sbGo.onclick = async () => { st = await call('sb', { on: !st.sb?.on }); paint(); };
  for (const [k, t] of SB) { const l = el('label'), c = el('input'); c.type = 'checkbox'; c.value = k; l.append(c, t); sbCats.append(l);
    c.onchange = async () => { st = await call('sb', { cats: [...sbCats.querySelectorAll('input:checked')].map(x => x.value) }); paint(); }; }
  go.onclick = async () => { st = await call('set', !st.on); paint(); toast(st.on ? 'Bloqueur de pubs rallumé' : 'Bloqueur de pubs coupé partout'); };
  // comme les étiquettes des Paramètres de NeoDex : le nom, puis sa croix
  const chips = (box, list, empty, run, tip) => box.replaceChildren(...(list.length ? list.map(h => { const c = el('span', 'chip', h), x = el('button', 'x', 'X'); x.title = tip + ' ' + h; x.onclick = () => run(h); c.append(x); return c; }) : [el('span', 'abHint', empty)]));
  function render() {
    big.textContent = st.on ? 'ALLUMÉ' : 'COUPÉ'; big.className = 'abBig' + (st.on ? ' on' : '');
    go.textContent = st.on ? 'COUPER PARTOUT' : 'RALLUMER';
    lists.textContent = st.lists ? 'Listes du ' + new Date(st.lists).toLocaleDateString('fr-FR') + (st.ready ? '' : ' · chargement…') : 'Listes en cours de téléchargement (quelques Mo, une fois par semaine)…';
    chips(offBox, st.off, 'Aucun.', async h => { st = await call('site', h, false); paint(); }, 'Rallumer le bloqueur sur');
    const sb = st.sb || { on: false, cats: [], n: 0, saved: 0 };
    sbBig.textContent = sb.on ? 'ALLUMÉ' : 'COUPÉ'; sbBig.className = 'abBig' + (sb.on ? ' on' : ''); sbGo.textContent = sb.on ? 'COUPER' : 'ALLUMER';
    for (const c of sbCats.querySelectorAll('input')) { c.checked = sb.cats.includes(c.value); c.disabled = !sb.on; }
    sbStat.textContent = sb.n ? sb.n + ' passage(s) sauté(s) · ' + Math.round(sb.saved / 60) + ' min gagnées' : 'Aucun passage sauté pour l’instant.';
    const hs = Object.keys(st.hide || {}).sort();
    hideBox.replaceChildren(...(hs.length ? hs.map(h => { const s = el('div', 'abSite'), top = el('div'), all = el('button', 'btn px', 'TOUT RENDRE'), box = el('div', 'abChips');
      all.onclick = async () => { st = await call('unhide', h); paint(); toast('Blocs rendus sur ' + h); };
      top.append(el('span', '', h + ' · ' + st.hide[h].length), all);
      chips(box, st.hide[h], '', async x => { st = await call('unhide', h, x); paint(); }, 'Rendre le bloc'); s.append(top, box); return s; }) : [el('span', 'abHint', 'Aucun.')]));
    chips(mineBox, st.mine, 'Aucun.', async h => { st = await call('unmine', h); paint(); }, 'Débloquer');
  }
  view.__ab = { state: () => st, paint, pick };
  paint(); render();
  ctx.onClose(() => { alive = false; btn.remove(); document.querySelector('.adPop')?.remove(); if (window.updateShield !== prevShield) window.updateShield = prevShield || (() => {}); });
}
