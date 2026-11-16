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
  // l'onglet du plugin
  await js("tabs.slice().forEach(closeTab); newTab('plugin:neodex.adblock'), 0"); await sleep(1200); await shot('onglet');
  const v = await js(`(() => { const w = document.querySelector('.abWrap'); return { big: w?.querySelector('.abBig')?.textContent, cards: w?.querySelectorAll('.abCard').length,
    over: [...document.querySelectorAll('.abWrap *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length }; })()`);
  if (v.big !== 'ALLUMÉ' && v.big !== 'ON' || v.cards !== 3) throw new Error('onglet : ' + JSON.stringify(v));
  if (v.over) throw new Error(v.over + ' élément(s) débordent à droite');
  return `bouton ADBLOCK avant la place du VPN, pub ${on} puis ${off} quand example.com est exclu, onglet avec ${v.cards} cartes`;
};
