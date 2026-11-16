# Ad blocker

The ad and tracker blocker for the sites opened in NeoDex. It is the **ADBLOCK** button in the address bar.

*Version française : [README.md](README.md)*

## Use

- **Click** ADBLOCK: turn the blocker off or back on for the site shown (the page reloads).
- **Right click**: "an ad got through?". The sites the page loaded without blocking: tick the ones showing the ad, they are blocked everywhere.
- The plugin's tab: turn it off or on everywhere, the sites where it is off, the domains you blocked.

## What it blocks

- Every **uBlock Origin** list (ads, tracking, annoyances, cookie banners) and **EasyList**, through **Ghostery**'s engine. They are downloaded once a week (a few MB) into the plugin's folder.
- **YouTube** has its own rules, taken from uBlock Origin every 12 hours: videos without ads, and the "Skip" button clicked for you. If YouTube still spots the blocker, NeoDex offers to turn it off on YouTube only.
- The video players of anime sites (uqload, sendvid) are left alone: the lists break them.

Anti-tracking (third-party cookies never sent back) stays in NeoDex, in Settings › Browser. This plugin only tells it on which sites it is off.

## Since NeoDex 3.1

Before NeoDex 3.2 the blocker was built into NeoDex. The first time the plugin starts, your settings from then are kept: blocker on or off, excluded sites, blocked domains.

## Permissions

**Full access**: the blocker filters the requests of every site opened in NeoDex and adds its script on YouTube. Nothing is sent anywhere.

## Sync

None: each PC has its own lists and excluded sites.
