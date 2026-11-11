# AGENTS.md

Guidance for AI agents and contributors working on this repo.

## What this is

Kaltas is a Chrome extension (Manifest V3) that shows student deals (discounts and free student plans) for the website you're on.

- Store name (manifest `name`): Kaltas - Find Student Deals
- Toolbar hover text (`default_title`): Kaltas
- Current version: 1.1.7

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
- `.github/workflows/`: validation, link check and lead finding
- `store-assets/`: Chrome Web Store images. Not part of the zip.
  - `screenshots/screenshot-1-1280x800.png` to `screenshot-5-1280x800.png`
  - `promo-small-440x280.png`, `promo-marquee-1400x560.png`
- `PRIVACY.md`: privacy policy
- `README.md`: project overview

## Rules

- Keep the brand name as "Kaltas". Use "student deals" wording to match the store name.
- Offers are global. There are no regions, region filters, or location pickers. Do not add them.
- Do not add tracking, analytics, or remote code.
- Any change to the name, description, permissions, or data handling must also be reflected in `PRIVACY.md`, `README.md`, and the store listing.
- Every change to `offers.json` must pass `node scripts/validate-offers.js`.
- Do not put the number of available deals in store images, the README, or the store listing. It changes often.
- In store images, GitHub Student Developer Pack is the featured deal.

## Popup design

- The category label sits under each item name in the Browse list, not above it.
- The settings button opens a small popup over the header row. The closed panel must stay hidden (the `hidden` attribute).
- Style tweaks are added at the end of `popup.css`, and later rules override earlier ones. Check the end of the file before changing a style.
- Store screenshots show the real popup, so retake them if the popup layout changes.

## Releasing

1. Bump `version` in `manifest.json`.
2. Run `node scripts/validate-offers.js` and `node --check popup.js`.
3. Commit, push, and tag the commit `vX.Y.Z`.
4. Build the zip with only the extension files:
   `tar -a -c -f kaltas-X.Y.Z.zip manifest.json background.js offers-loader.js popup.html popup.js popup.css offers.json icons fonts`
5. List the zip with `tar -tf` and confirm it has no `.git`, scripts, docs, `store-assets`, or `AGENTS.md`.
6. Upload the zip in the Chrome Web Store dashboard and submit for review.
7. Update the store description and images if the name or UI changed. Screenshots are 1280x800, the small tile is 440x280 and the marquee is 1400x560, all 24-bit PNG with no alpha.

## Testing checklist

- Load the folder unpacked in `chrome://extensions`.
- Open the popup on a site with offers and on a site without.
- Check the toolbar badge and the popup text.
- Open settings and confirm both toggles work and nothing is cut off.
- Confirm there are no console errors in the popup or service worker.