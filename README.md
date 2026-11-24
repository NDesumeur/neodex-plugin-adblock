# Bloqueur de pubs

Le bloqueur de pubs et de traqueurs des sites ouverts dans NeoDex. C'est le bouton **ADBLOCK** de la barre d'adresse.

*English version: [README.en.md](README.en.md)*

## Masquer un bloc et SponsorBlock (nouveau en 1.1.0)

Clic droit sur ADBLOCK, puis MASQUER UN BLOC… : clique sur un bloc d'une page (flèches pour l'agrandir ou le réduire), il disparaît de ce site à chaque visite. Liste des blocs masqués dans l'onglet du plugin. Sur YouTube, les passages sponsorisés sont sautés tout seuls (SponsorBlock, catégories au choix).

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

## Masquer un bloc d’une page (1.1.0)

Une pub ou un bloc gênant que les listes laissent passer ? Clic droit sur **ADBLOCK**, puis **MASQUER UN BLOC…**.

- Montre le bloc avec la souris : il s’entoure de rouge. **↑** prend le bloc qui le contient (plus grand), **↓** revient en arrière, **Échap** annule.
- Le clic le masque tout de suite, et à chaque visite de ce site.
- L’onglet du plugin liste les **blocs masqués** par site : la croix en rend un, **TOUT RENDRE** les rend tous.
- Rien ne sort de ton PC. Couper le bloqueur sur un site montre aussi ses blocs masqués.

## YouTube : les passages sponsorisés sautés (1.1.0)

Pendant une vidéo YouTube, les passages sponsorisés sont sautés tout seuls, avec une petite note en bas à gauche (« Passé : sponsor (45 s) »). Les passages viennent de **SponsorBlock**, une base remplie par les spectateurs.

- La carte **YOUTUBE : PASSAGES SPONSORISÉS** l’allume ou le coupe, et choisit quoi sauter : sponsors, autopromo, rappels d’abonnement (cochés d’office), génériques, aperçus, hors-sujet, passages sans musique.
- Un passage n’est sauté qu’une fois : revenir en arrière dedans le laisse jouer.
- NeoDex n’envoie que les 4 premiers caractères d’une empreinte de la vidéo : SponsorBlock ne sait pas laquelle tu regardes.
- Marche aussi quand le blocage des pubs est coupé sur YouTube, et pour les vidéos ouvertes depuis Chaînes YouTube.
