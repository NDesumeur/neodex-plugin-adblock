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
`;
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
    p.append(el('b', '', 'Une pub est passée ?'), el('div', 'hint', list.length ? 'Ces sites ont été chargés par la page sans être bloqués. Coche ceux qui affichent la pub : ils seront bloqués partout.' : 'Rien d’un autre site n’est passé sur cette page. La pub vient du site lui-même : recharge la page puis réessaie.'), rows);
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
  const view = ctx.view, big = el('div', 'abBig'), go = el('button', 'btn px'), lists = el('div', 'abHint'), offBox = el('div', 'abChips'), mineBox = el('div', 'abChips');
  const card = (title, ...kids) => { const c = el('div', 'abCard'); c.append(el('div', 't', title), ...kids); return c; };
  const wrap = el('div', 'abWrap');
  wrap.append(
    card('BLOQUEUR', big, go, lists, el('div', 'abHint', 'Toutes les listes d’uBlock Origin (pubs, pistage, nuisances, bandeaux de cookies) et EasyList, rafraîchies chaque semaine. YouTube a ses propres règles, reprises d’uBlock Origin toutes les 12 heures.')),
    card('SITES OÙ IL EST COUPÉ', offBox, el('div', 'abHint', 'Le bouton ADBLOCK de la barre d’adresse en ajoute un. La croix y rallume le bloqueur.')),
    card('DOMAINES QUE TU AS BLOQUÉS', mineBox, el('div', 'abHint', 'Ajoutés par le clic droit sur ADBLOCK (« une pub est passée ? »). La croix le débloque.')));
  view.replaceChildren(wrap);
  go.onclick = async () => { st = await call('set', !st.on); paint(); toast(st.on ? 'Bloqueur de pubs rallumé' : 'Bloqueur de pubs coupé partout'); };
  // comme les étiquettes des Paramètres de NeoDex : le nom, puis sa croix
  const chips = (box, list, empty, run, tip) => box.replaceChildren(...(list.length ? list.map(h => { const c = el('span', 'chip', h), x = el('button', 'x', 'X'); x.title = tip + ' ' + h; x.onclick = () => run(h); c.append(x); return c; }) : [el('span', 'abHint', empty)]));
  function render() {
    big.textContent = st.on ? 'ALLUMÉ' : 'COUPÉ'; big.className = 'abBig' + (st.on ? ' on' : '');
    go.textContent = st.on ? 'COUPER PARTOUT' : 'RALLUMER';
    lists.textContent = st.lists ? 'Listes du ' + new Date(st.lists).toLocaleDateString('fr-FR') + (st.ready ? '' : ' · chargement…') : 'Listes en cours de téléchargement (quelques Mo, une fois par semaine)…';
    chips(offBox, st.off, 'Aucun.', async h => { st = await call('site', h, false); paint(); }, 'Rallumer le bloqueur sur');
    chips(mineBox, st.mine, 'Aucun.', async h => { st = await call('unmine', h); paint(); }, 'Débloquer');
  }
  view.__ab = { state: () => st, paint };
  paint(); render();
  ctx.onClose(() => { alive = false; btn.remove(); document.querySelector('.adPop')?.remove(); if (window.updateShield !== prevShield) window.updateShield = prevShield || (() => {}); });
}
