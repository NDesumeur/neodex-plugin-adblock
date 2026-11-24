# Ad blocker

The ad and tracker blocker for the sites opened in NeoDex. It is the **ADBLOCK** button in the address bar.

*Version française : [README.md](README.md)*

## Hide a block and SponsorBlock (new in 1.1.0)

Right-click ADBLOCK, then HIDE A BLOCK…: click a block of a page (arrows to make it bigger or smaller), it disappears from that site on every visit. List of hidden blocks in the plugin tab. On YouTube, sponsored parts are skipped by themselves (SponsorBlock, categories of your choice).

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

## Hide a block of a page (1.1.0)

An ad or an annoying block that the lists let through? Right-click **ADBLOCK**, then **HIDE A BLOCK…**.

- Point at the block with the mouse: it gets a red outline. **↑** takes the block around it (bigger), **↓** goes back, **Esc** cancels.
- The click hides it right away, and on every visit to that site.
- The plugin tab lists the **hidden blocks** per site: the cross brings one back, **BRING ALL BACK** brings them all back.
- Nothing leaves your PC. Turning the blocker off on a site also shows its hidden blocks.

## YouTube: sponsored parts skipped (1.1.0)

During a YouTube video, sponsored parts are skipped by themselves, with a small note at the bottom left (“Skipped: sponsor (45 s)”). The parts come from **SponsorBlock**, a database filled in by viewers.

- The **YOUTUBE: SPONSORED PARTS** card turns it on or off and chooses what to skip: sponsors, self-promotion, subscribe reminders (ticked by default), intros, outros, previews, filler, non-music parts.
- A part is skipped only once: going back into it lets it play.
- NeoDex only sends the first 4 characters of a fingerprint of the video: SponsorBlock does not know which one you watch.
- Also works when ad blocking is off on YouTube, and for videos opened from YouTube Channels.
