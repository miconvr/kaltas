# AGENTS.md

Guidance for AI agents and contributors working on this repo.

## What this is

Kaltas is a Chrome extension (Manifest V3) that shows student deals (discounts and free student plans) for the website you're on.

- Store name (manifest `name`): Kaltas - Find Student Deals
- Toolbar hover text (`default_title`): Kaltas
- Current version: 1.2.0

## Files

- `manifest.json`: extension name, version, permissions, toolbar title
- `background.js`: service worker
- `offers-loader.js`: loads the offers data (GitHub copy, then the last saved copy, then the bundled file)
- `offers.json`: the bundled list of offers (data only, no code)
- `popup.html`, `popup.css`, `popup.js`: the popup (layout, styles, behavior)
- `icons/`, `fonts/`: extension icons and the Inter font files
- `scripts/validate-offers.js`: checks `offers.json`. Run it before every release.
- `scripts/check-links.js`: checks that offer links still work
- `scripts/find-leads.js`, `scripts/discovery-sources.json`: helper for finding new offers
- `scripts/logo-small.svg`: small logo file kept with the scripts
- `.github/workflows/`: validation, link check and lead finding (they run on Node 22)
- `store-assets/`: Chrome Web Store images. Not part of the zip.
  - `screenshots/screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` (1280x800; more can be added as `screenshot-N.png`, up to 5)
  - `promo/promo-small-440x280.png`, `promo/promo-marquee-1400x560.png`
  - `icons/`: Web Store icons. `store-icon-128.png` and `store-icon-512.png` are transparent, `store-icon-tile-128.png` and `store-icon-tile-512.png` sit on the dark tile. All are built from `icons/logo.png`
- `PRIVACY.md`: privacy policy
- `README.md`: project overview. Its Screenshots section shows the three store screenshots (`screenshot-1`, `-2`, `-3`, each 640px wide) by relative path, so update it if those files are renamed, replaced or added to. The promo images are not shown in the README.

## Rules

- Keep the brand name as "Kaltas". Use "student deals" wording to match the store name.
- Offers are global. There are no regions, region filters, or location pickers. Do not add them.
- Every offer in `offers.json` still carries `"regions": ["global"]`. The popup ignores it, but installed versions up to 1.1.6 read the live file from GitHub and reject the whole list when an `info` entry has no `regions`. `validate-offers.js` checks `info` entries for it. Do not remove the field.
- Saved settings and the offers copy use `iskolar-` keys in localStorage (the extension's earlier name). Leave the names alone: renaming them would reset every user's saved theme, footer and browse choices.
- Commit messages are short and plain (`fix:`, `docs:`, `chore:`). Do not add co-author or tool attribution lines.
- Do not add tracking, analytics, or remote code.
- Any change to the name, description, permissions, or data handling must also be reflected in `PRIVACY.md`, `README.md`, and the store listing.
- Every change to `offers.json` must pass `node scripts/validate-offers.js`.
- Do not put the number of available deals in store images, the README, or the store listing. It changes often.
- In store images, GitHub Student Developer Pack is the featured deal.
- In store images, the dark popup is the main one and the light popup is secondary.
- `icons/logo.png` is the original master. Build `icon16/32/48/128.png` and `store-assets/store-icon-128.png` from it, and use it in the popup header. Do not re-render it from `logo.svg`.

## Popup design

- The category label sits under each item name in the Browse list, not above it.
- The settings button opens a small pill in the header row, just left of the button. The closed panel keeps the `hidden` attribute, and CSS fades it out and blocks clicks and keyboard focus so it can animate in and out. Do not rely on `display: none` for it.
- Theme changes: `popup.js` adds the `theme-switching` class to `<html>` for two frames, and a rule in `popup.css` (search for `theme-switching`) pauses color transitions during that time so every color changes together. Keep both. Only `transform` stays animated, so the switch knob still slides.
- Motion: use `--dur-fast` / `--dur-base` / `--dur-slow` and `--ease-out`, and animate `transform` and `opacity` only. Anything inside the Browse list must be opacity-only, so it cannot create scrollbars or change the list's scroll area. Every animation needs a `prefers-reduced-motion` fallback. The "Motion pass" block at the end of `popup.css` holds the popup-open, list-row, theme-icon and press animations; `popup.js` sets `--i` on each row and toggles `.is-filtering` on `#all` so rows don't replay while searching.
- The two settings toggles are icon-only, so their tooltips (`title`) describe the action and are updated in `popup.js` when the state changes.
- Style tweaks are added at the end of `popup.css`. Many rules start with `:root body`, so a new rule must be at least as specific as the one it overrides, or it silently loses. Search the file for the selector before changing a style.
- Store screenshots show the real popup, so retake them if the popup layout changes.

## Popup height

Chrome caps the popup at 600px tall and cuts off anything past that. Check these states after any layout change:

- Browse list: every row is a fixed `--row-h` (61px) and the list is `--row-h * --browse-rows` (4 rows) tall in every state, so it always shows 4 whole rows. Names are one line and truncate, so nothing in a row can change its height. Do not add per-state `max-height` values for `#all`; change `--row-h` or `--browse-rows` instead.
- No deal on the site, Browse open: the footer links must be fully visible. `#browse[open]` gets a smaller top margin in this state.
- Deal found, Browse open: same list height. The row for the current site has a small pulsing accent dot after its category label (`.here-dot`). It is out of flow, so it never changes wrapping or row size. Do not turn it back into text or padding.
- Browse closed, and non-web pages such as `chrome://extensions`.
- To measure, run `document.querySelector('footer').getBoundingClientRect().bottom` in the popup console. It should print 600 or less.

## Releasing

1. Bump `version` in `manifest.json`.
2. Run `node scripts/validate-offers.js` and `node --check popup.js`.
3. Commit, push, and tag the commit `vX.Y.Z` (always with the leading `v`). If only `store-assets/` or `README.md` change after tagging, the tag can stay, since neither is in the zip.
4. Build the zip with only the extension files, into the git-ignored `dist/` folder (run `mkdir dist` first):
   `tar -a -c -f dist/kaltas-X.Y.Z.zip manifest.json background.js offers-loader.js popup.html popup.js popup.css offers.json icons fonts`
5. List the zip with `tar -tf` and confirm it has no `.git`, scripts, docs, `store-assets`, or `AGENTS.md`.
6. Upload the zip in the Chrome Web Store dashboard and submit for review.
7. Update the store description and images if the name or UI changed. Screenshots are 1280x800, the small tile is 440x280 and the marquee is 1400x560, all 24-bit PNG with no alpha.

## Testing checklist

- Load the folder unpacked in `chrome://extensions`.
- Open the popup on a site with offers and on a site without.
- Check the toolbar badge and the popup text.
- Open settings and confirm both toggles work and nothing is cut off. Hover each toggle: the tooltip names the action ("Switch to light mode", "Hide footer", and so on).
- Switch between dark and light a few times with a deal showing: every color should change at the same moment, with nothing fading in behind the rest.
- With Browse open, on a site with no deal and on a site with a deal: the footer links are fully visible and the list shows 4 whole rows.
- Run `document.querySelector('footer').getBoundingClientRect().bottom` in the popup console in each state. It should print 600 or less.
- Confirm there are no console errors in the popup or service worker.
