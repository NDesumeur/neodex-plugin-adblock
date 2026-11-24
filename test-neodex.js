// lancé par le test « local » de NeoDex : le bouton ADBLOCK est à sa place, une adresse de pub est bloquée sur un vrai site, elle passe
// quand le site est exclu, et l'onglet du plugin le montre ; rien ne déborde
module.exports = async ({ js, sleep, shot = async () => {} }) => {
  const call = (n, ...a) => js(`neo.pluginMain('neodex.adblock', ${JSON.stringify(n)}${a.map(x => ', ' + JSON.stringify(x)).join('')})`);
  const b = await js(`(() => { const b = document.getElementById('bAdblock'); return { txt: b?.textContent, next: b?.nextElementSibling?.id, n: document.querySelectorAll('#bAdblock').length }; })()`);
  if (!/^ADBLOCK/.test(b.txt || '') || b.next !== 'bShield' || b.n !== 1) throw new Error('bouton : ' + JSON.stringify(b));
  // les listes : téléchargées au premier lancement (quelques Mo)
  let st = await call('state'); for (let i = 0; i < 120 && !st.ready; i++) { await sleep(500); st = await call('state'); }
  if (!st.ready || !st.on) throw new Error('bloqueur pas prêt : ' + JSON.stringify(st));
  await js("tabs.slice().forEach(closeTab); newTab('https://example.com'), 0"); await sleep(4000);
  const ad = () => js(`active.v.executeJavaScript("fetch('https://securepubads.g.doubleclick.net/tag/js/gpt.js?' + Math.random(), {mode: 'no-cors'}).then(() => 'chargée', () => 'bloquée')")`);
  const on = await ad(), btnOn = await js("document.getElementById('bAdblock').textContent");
  await js("document.getElementById('bAdblock').click(), 0"); await sleep(2500);
  const off = await ad(), btnOff = await js("document.getElementById('bAdblock').textContent"), st2 = await call('state');
  await js("document.getElementById('bAdblock').click(), 0"); await sleep(1500);
  if (on !== 'bloquée' || off !== 'chargée' || btnOn !== 'ADBLOCK ON' || btnOff !== 'ADBLOCK OFF' || !st2.off.includes('example.com')) throw new Error('blocage : ' + JSON.stringify({ on, off, btnOn, btnOff, excl: st2.off }));
  // MASQUER UN BLOC : une petite page locale, le bloc de pub choisi à la souris (un cran plus grand avec ↑), masqué, gardé après rechargement, puis rendu
  const srv = require('http').createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    r.end('<!doctype html><title>Le journal</title><h1>Le journal</h1><div class="cadre-haut"><span class="txt">Achetez ici</span><img alt="" width="300" height="60"></div><p id="texte">Un article à lire.</p>'); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port;
  const inPage = c => js(`active.v.executeJavaScript(${JSON.stringify(c)})`);
  let picked = '';
  try {
    await js(`tabs.slice().forEach(closeTab); newTab(${JSON.stringify(base + '/')}), 0`); await sleep(2500);
    await js(`document.getElementById('bAdblock').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })), 0`); await sleep(800);
    await js(`[...document.querySelectorAll('.adPop button')].find(b => /MASQUER UN BLOC|HIDE A BLOCK/.test(b.textContent)).click(), 0`); await sleep(800);
    await inPage(`(() => { const t = document.querySelector('.txt'), r = t.getBoundingClientRect(); t.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + 3, clientY: r.top + 3, bubbles: true })); return 1; })()`); await sleep(200);
    await inPage(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })), 1`); await sleep(200); await shot('selecteur');
    await inPage(`document.querySelector('.cadre-haut').dispatchEvent(new MouseEvent('click', { bubbles: true })), 1`); await sleep(1200);
    const st = await call('state'); picked = (st.hide?.['127.0.0.1'] || [])[0] || '';
    if (picked !== 'div.cadre-haut') throw new Error('bloc choisi : ' + JSON.stringify(st.hide));
    const vis = () => inPage(`[getComputedStyle(document.querySelector('.cadre-haut')).display, getComputedStyle(document.getElementById('texte')).display].join()`);
    if (await vis() !== 'none,block') throw new Error('bloc pas masqué : ' + await vis());
    await js(`active.v.reload(), 0`); await sleep(2500);
    if (await vis() !== 'none,block') throw new Error('bloc revenu après rechargement : ' + await vis());
    await call('unhide', '127.0.0.1'); await sleep(2500);
    if (await vis() !== 'block,block') throw new Error('bloc pas rendu : ' + await vis());
  } finally { srv.close(); await call('unhide', '127.0.0.1').catch(() => {}); }
  // SponsorBlock : une vidéo qui a des passages sponsorisés (prise dans la base elle-même), ses passages lus par le volet système ; puis les catégories
  let sbTxt = 'SponsorBlock injoignable';
  const crypto = require('crypto'); let vid = '';
  for (const pre of ['0000', '1a2b', 'abcd', 'f00d']) { try { const r = await fetch('https://sponsor.ajay.app/api/skipSegments/' + pre + '?categories=' + encodeURIComponent('["sponsor"]')); if (!r.ok) continue;
    const x = (await r.json()).find(v => /^[\w-]{11}$/.test(v.videoID) && v.segments.some(g => g.category === 'sponsor' && (g.actionType || 'skip') === 'skip' && g.segment[0] < 2 && g.segment[1] > 15)); if (x) { vid = x.videoID; break; } } catch {} }
  if (vid) {
    if (crypto.createHash('sha256').update(vid).digest('hex').slice(0, 4).length !== 4) throw new Error('empreinte');
    const segs = await call('sbSegments', vid);
    if (!segs.length || !segs.every(g => g[1] > g[0] && typeof g[2] === 'string')) throw new Error('passages SponsorBlock : ' + JSON.stringify(segs));
    await call('sb', { on: false }); const none = await call('sbSegments', vid); await call('sb', { on: true });
    if (none.length) throw new Error('SponsorBlock coupé mais des passages rendus');
    sbTxt = 'SponsorBlock : ' + segs.length + ' passage(s) lus pour une vidéo de la base, rien quand il est coupé';
    // pour de vrai, si YouTube veut bien lancer la vidéo ici : le premier passage est-il sauté ? (indicatif : YouTube peut demander un consentement ou passer une pub)
    try {
      await js(`tabs.slice().forEach(closeTab); newTab('https://www.youtube.com/watch?v=${vid}'), 0`);
      let seen = '';
      for (let i = 0; i < 40 && !seen; i++) { await sleep(500); const t = await js(`active.v.executeJavaScript("(() => { const v = document.querySelector('#movie_player video'); if (v && v.paused) { v.muted = true; v.play().catch(() => {}); } return v && !document.getElementById('movie_player').classList.contains('ad-showing') ? v.currentTime : -1; })()")`).catch(() => -1);
        if (t >= segs[0][1] - 1 && t < segs[0][1] + 20) seen = 'sauté à ' + Math.round(t) + ' s'; }
      sbTxt += ' ; lecture réelle : ' + (seen || 'pas observée (indicatif)');
      await js(`tabs.slice().forEach(closeTab), 0`);
    } catch (e) { sbTxt += ' ; lecture réelle impossible'; }
  }
  // l'onglet du plugin
  await js("tabs.slice().forEach(closeTab); newTab('plugin:neodex.adblock'), 0"); await sleep(1200); await shot('onglet');
  const v = await js(`(() => { const w = document.querySelector('.abWrap'); return { big: w?.querySelector('.abBig')?.textContent, cards: w?.querySelectorAll('.abCard').length,
    over: [...document.querySelectorAll('.abWrap *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length }; })()`);
  if (v.big !== 'ALLUMÉ' && v.big !== 'ON' || v.cards !== 5) throw new Error('onglet : ' + JSON.stringify(v));
  if (v.over) throw new Error(v.over + ' élément(s) débordent à droite');
  return `bouton ADBLOCK avant la place du VPN, pub ${on} puis ${off} quand example.com est exclu, bloc « ${picked} » choisi à la souris (↑ : un cran plus grand), masqué, gardé au rechargement puis rendu, ${sbTxt}, onglet avec ${v.cards} cartes`;
};
