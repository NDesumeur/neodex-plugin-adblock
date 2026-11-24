// Preload of the website session: on YouTube only, gets rid of the ads without YouTube noticing.
// Runs before the page scripts. webFrame.executeJavaScript reaches the page's own JS world and is not
// subject to YouTube's Content-Security-Policy (an injected <script> would be).
// If YouTube's warning ("les bloqueurs de publicités ne sont pas autorisés") still shows up, it is removed and the video resumed.
const { ipcRenderer, webFrame } = require('electron');

const rules = /(^|\.)youtube(-nocookie)?\.com$/.test(location.hostname) && ipcRenderer.sendSync('adblock:youtube', location.href);

// SponsorBlock (réglé dans l'onglet Bloqueur de pubs, même si le blocage des pubs est coupé sur YouTube) : les passages d'une vidéo
// sont demandés au volet système quand la vidéo change ; un passage est sauté une fois, jamais pendant une pub de YouTube
if (window === window.top && /(^|\.)youtube\.com$/.test(location.hostname)) {
  const fr = /^fr/i.test(navigator.language || '');
  const NAMES = fr ? { sponsor: 'sponsor', selfpromo: 'autopromo', interaction: 'rappel d’abonnement', intro: 'générique de début', outro: 'générique de fin', preview: 'aperçu', filler: 'hors-sujet', music_offtopic: 'passage sans musique' }
    : { sponsor: 'sponsor', selfpromo: 'self-promotion', interaction: 'subscribe reminder', intro: 'intro', outro: 'outro', preview: 'preview', filler: 'filler', music_offtopic: 'non-music part' };
  let vid = '', segs = [], done = new Set(), note = null;
  const tell = (cat, sec) => {
    note?.remove(); note = document.createElement('div');
    note.style.cssText = 'position:fixed;z-index:2147483647;left:16px;bottom:72px;padding:8px 12px;background:rgba(20,10,38,.92);color:#fff;font:14px Roboto,Arial,sans-serif;border-left:4px solid #00d400;pointer-events:none';
    note.textContent = (fr ? 'Passé : ' : 'Skipped: ') + (NAMES[cat] || cat) + ' (' + Math.round(sec) + ' s) · SponsorBlock';
    document.documentElement.append(note); const n = note; setTimeout(() => n.remove(), 3500);
  };
  setInterval(() => {
    const id = location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') || '' : '';
    if (id !== vid) { vid = id; segs = []; done = new Set(); if (id) ipcRenderer.invoke('adblock:sponsor', id).then(s => { if (vid === id) segs = s || []; }, () => {}); return; }
    const p = document.getElementById('movie_player'), v = p && p.querySelector('video');
    if (!segs.length || !v || p.classList.contains('ad-showing') || v.paused && v.currentTime === 0) return;
    const t = v.currentTime;
    for (const [s, e, cat] of segs) if (t >= s && t < e - 0.6 && !done.has(s)) { done.add(s); v.currentTime = Math.min(e, v.duration || e); ipcRenderer.send('adblock:sponsored', e - t); tell(cat, e - t); break; }
  }, 300);
}
if (rules) {
  // 1. les scriptlets d'uBlock Origin pour YouTube (listes rafraîchies chaque semaine), avant les scripts de la page
  // un seul script fermé (assemblé dans main.js) : rien n'apparaît dans window que YouTube pourrait repérer
  if (rules.script) webFrame.executeJavaScript(rules.script).catch(() => {});
  if (rules.styles) webFrame.insertCSS(rules.styles);
  // The ad data is left untouched: YouTube spots players whose ad schedule was removed (slow start, then its
  // "ad blockers are not allowed" wall). The ad loads, plays muted, and its "skip" is pressed as soon as YouTube shows it.
  webFrame.executeJavaScript(`(() => {
    // 2. an ad: mute it, press "skip" as soon as it shows; give the sound back afterwards
    // 3. the blocker warning: popups switched off in YouTube's config, the dialog removed if it still comes, the video resumed
    let mutedByUs = false, reloaded = '', told = false;
    setInterval(() => {
      const pop = window.yt?.config_?.openPopupConfig?.supportedPopups; if (pop && pop.adBlockMessageViewModel) pop.adBlockMessageViewModel = false;
      const warn = document.querySelector('ytd-enforcement-message-view-model');
      if (warn) {
        if (!told) { told = true; window.postMessage({neoWall: 1}, location.origin); }  // NeoDex proposes to switch the blocker off on YouTube
        const dlg = warn.closest('tp-yt-paper-dialog');
        if (dlg) { dlg.remove(); document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(b => b.remove()); document.body.style.removeProperty('overflow'); }
        else if (warn.closest('#error-screen, yt-playability-error-supported-renderers')) {  // the player itself refuses: one reload of this video
          const id = new URLSearchParams(location.search).get('v') || location.pathname;
          if (reloaded !== id && sessionStorage.neoYtReload !== id) { reloaded = id; sessionStorage.neoYtReload = id; location.reload(); }
        }
        document.querySelector('#movie_player video')?.play().catch(() => {});
      }
      const p = document.getElementById('movie_player'), v = p && p.querySelector('video');
      if (!v) return;
      if (p.classList.contains('ad-showing')) {
        if (!v.muted) { v.muted = true; mutedByUs = true; }
        // no more 16x: YouTube spots an ad played too fast and puts its wall back. Muted, then "skip" as soon as it shows
        // YouTube ignores a click made by a script on "Passer": the place of the button goes to NeoDex, which clicks it like a real mouse
        const skip = [...document.querySelectorAll('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad button, .ytp-ad-skip-button-container button, [id^="skip-button"] button')]
          .find(b => b.offsetParent && getComputedStyle(b).visibility !== 'hidden' && b.getBoundingClientRect().width > 0);
        if (skip) { skip.click(); const r = skip.getBoundingClientRect(); window.postMessage({neoSkip: [r.left + r.width / 2, r.top + r.height / 2]}, location.origin); }
      } else {
        if (mutedByUs) { v.muted = false; mutedByUs = false; }
      }
    }, 200);
  })()`);

  // the skip button's place, sent by the page above: at most one real click a second
  let lastSkip = 0;
  window.addEventListener('message', e => {
    if (e.source === window && e.data?.neoWall) return ipcRenderer.send('adblock:wall');
    const p = e.source === window && e.data?.neoSkip; if (!Array.isArray(p) || Date.now() - lastSkip < 1000) return;
    lastSkip = Date.now(); const z = webFrame.getZoomFactor(); ipcRenderer.send('adblock:skip', Math.round(p[0] * z), Math.round(p[1] * z));
  });

  // 4. hide ad slots in the pages (home feed, search, sidebar, banners, overlays) and the warning while it is removed
  // never #player-ads (the box next to the player): YouTube checks whether it is hidden, and a hidden one gets the video refused with its wall
  webFrame.insertCSS(`ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer, #masthead-ad,
    ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-companion-slot-renderer, ytd-player-legacy-desktop-watch-ads-renderer,
    .ytp-ad-overlay-container, .ytp-ad-image-overlay, ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    ytd-search-pyv-renderer, ytd-statement-banner-renderer, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model) { display: none !important; }`);
}
