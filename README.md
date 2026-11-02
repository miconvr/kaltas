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

## Adding an offer
```json
{ "name": "…", "domains": ["example.com"], "category": "…", "perk": "…", "url": "https://…", "verified": "YYYY-MM" }
```
Always verify the perk on the official page before adding it.
