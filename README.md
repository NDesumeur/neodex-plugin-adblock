# Bloqueur de pubs

Le bloqueur de pubs et de traqueurs des sites ouverts dans NeoDex. C'est le bouton **ADBLOCK** de la barre d'adresse.

*English version: [README.en.md](README.en.md)*

## Utilisation

- **Clic** sur ADBLOCK : couper ou rallumer le bloqueur sur le site affiché (la page se recharge).
- **Clic droit** : « une pub est passée ? ». La liste des sites que la page a chargés sans blocage : coche ceux qui affichent la pub, ils sont bloqués partout.
- L'onglet du plugin : le couper ou le rallumer partout, les sites où il est coupé, les domaines que tu as bloqués.

## Ce qu'il bloque

- Toutes les listes d'**uBlock Origin** (pubs, pistage, nuisances, bandeaux de cookies) et **EasyList**, par le moteur de **Ghostery**. Elles sont téléchargées une fois par semaine (quelques Mo) dans le dossier du plugin.
- **YouTube** a ses propres règles, reprises d'uBlock Origin toutes les 12 heures : vidéos sans pubs, et le bouton « Passer » cliqué pour toi. Si YouTube repère quand même le bloqueur, NeoDex propose de le couper sur YouTube seulement.
- Les lecteurs vidéo des sites d'anime (uqload, sendvid) sont laissés tranquilles : les listes les cassent.

L'anti-pistage (les cookies tiers jamais renvoyés) reste dans NeoDex, dans Paramètres › Navigateur. Ce plugin lui dit seulement sur quels sites il est coupé.

## Depuis NeoDex 3.1

Avant NeoDex 3.2, le bloqueur était dans NeoDex. Au premier lancement du plugin, tes réglages d'alors sont repris : bloqueur allumé ou non, sites exclus, domaines bloqués.

## Autorisations

**Accès complet** : le bloqueur filtre les requêtes de tous les sites ouverts dans NeoDex, et ajoute son script sur YouTube. Rien n'est envoyé ailleurs.

## Synchronisation

Aucune : chaque PC a ses listes et ses sites exclus.
