# AGENTS.md

Guidance for AI agents and contributors working on this repo.

## What this is

Kaltas is a Chrome extension (Manifest V3) that shows student discounts and free student plans for the website you're on.

- Store name (manifest `name`): Kaltas - Find Student Deals
- Toolbar hover text (`default_title`): Kaltas
- Current version: 1.1.7

## Files

- `manifest.json`: extension name, version, permissions, toolbar title
- `background.js`: service worker
- `offers-loader.js`: loads the offers data
- `popup.js`: popup behavior
- `scripts/find-leads.js`: helper script for finding new offers
- `PRIVACY.md`: privacy policy
- `README.md`: project overview

## Rules

- Keep the brand name as "Kaltas". Use "student deals" wording to match the store name.
- Offers are global. There are no regions, region filters, or location pickers. Do not add them.
- Do not add tracking, analytics, or remote code.
- Any change to the name, description, permissions, or data handling must also be reflected in `PRIVACY.md`, `README.md`, and the store listing.

## Releasing

1. Bump `version` in `manifest.json`.
2. Zip the extension files only (no `.git`, scripts, or docs).
3. Upload the zip in the Chrome Web Store dashboard and submit for review.
4. Update the store description and screenshots if the name or UI changed.

## Testing checklist

- Load the folder unpacked in `chrome://extensions`.
- Open the popup on a site with offers and on a site without.
- Check the toolbar badge and the popup text.
- Confirm there are no console errors in the popup or service worker.
