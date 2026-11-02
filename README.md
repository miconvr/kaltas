# Iskolar

Iskolar is a Chrome extension (Manifest V3, plain JS) for Filipino students. Click the icon on any website to see what it offers students.

## Load it locally
1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked** and select this folder
4. Pin the extension, visit e.g. github.com or canva.com, click the icon

## Files
- `manifest.json` - permissions (only `activeTab`) and popup
- `offers.json` - the data. Add an entry to add a perk
- `popup.html/css/js` - the UI and matching logic
- `api/offer-assistant.js` - optional Vercel function for explaining a curated offer with Gemini. It is not required by the extension.

## Adding an offer
```json
{ "name": "…", "domains": ["example.com"], "category": "…", "perk": "…", "url": "https://…", "verified": "YYYY-MM" }
```
Always verify the perk on the official page before adding it.

## Optional AI assistant

The extension must not contain an AI API key. The optional `api/offer-assistant.js`
function keeps `GEMINI_API_KEY` on Vercel and accepts only a student question plus
the selected offer's existing text. It cannot discover, verify, or publish offers.

Deploy the repository to Vercel, then configure:

- `GEMINI_API_KEY`: a server-side Gemini API key
- `GEMINI_MODEL`: optional model name, default `gemini-2.0-flash`

The endpoint is `POST /api/offer-assistant`. It is intentionally not wired into
the popup until a deployed URL, rate limit, and abuse policy are configured.
Never commit the API key.

## Keeping offer data trustworthy

Automation can flag likely stale pages, but it should not automatically publish
student discounts. A safe workflow is: scheduled source checks, a proposed
change, an official-page review, then a pull request. Keep rotating prices and
promos out of `perk` text, and update `verified` whenever an official page is
re-checked.
