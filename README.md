<div align="center">
  <img src="icons/logo.png" alt="Kaltas logo" width="120" height="120">
  <h1>Kaltas: Student Discounts</h1>
  <p>A privacy-first Chrome extension that helps students find discounts and education perks on the website they are visiting.</p>
  <p>
    <a href="https://github.com/miconvr/kaltas">Source code</a> ·
    <a href="https://github.com/miconvr/kaltas/issues">Report an offer problem</a> ·
    <a href="PRIVACY.md">Privacy policy</a>
  </p>
</div>

> **Note:** Kaltas is a guide, not a guarantee. Offers can change, have country restrictions, or require verification. Confirm the current terms on the official offer page before purchasing.

## Features

- Matches the current site locally against a curated offer list (Philippines first, global offers supported)
- Green toolbar dot when the site has a student offer
- Shows eligibility, requirements, caveats and the last verification month
- Philippines and Other countries region filters
- Dark theme by default, with a Light option and a Hide footer setting
- Works offline with a bundled offer list
- Opens HTTPS offer links only
- Report an outdated offer through GitHub
- No browsing history, page content, accounts or analytics collected

## Screenshots

<p align="center">
  <img src="store-assets/screenshots/01-spot-student-perks.png" alt="Spot student perks" width="640">
</p>
<p align="center">
  <img src="store-assets/screenshots/02-browse-every-deal.png" alt="Browse every deal" width="640">
</p>
<p align="center">
  <img src="store-assets/screenshots/03-private-by-design.png" alt="Private by design" width="640">
</p>

## Tech stack

- **Extension:** Chrome Manifest V3, HTML, CSS and vanilla JavaScript
- **Data:** bundled `offers.json` (no remote offer list)
- **Permissions:** `activeTab` and `declarativeContent` only
- **Optional:** Vercel function that explains an existing offer using Google Gemini (not required, no key in the extension)

## Run locally

Requires Chrome (or another Chromium browser) and Git.

```bash
git clone https://github.com/miconvr/kaltas.git
cd kaltas
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `kaltas` folder.
3. Pin Kaltas and open it on a supported website.

After changing source files, click **Reload** on Kaltas in `chrome://extensions`.

## Checks

```bash
node --check popup.js
node --check offers-loader.js
node scripts/validate-offers.js
```

## Contributing

Only add or update an offer after checking an official source, and keep the text generic so prices and promo codes don't go stale. Run `node scripts/validate-offers.js` before opening a pull request. Every offer change is reviewed before release.

## Privacy

Kaltas compares the current tab hostname with local data after you open the popup. Theme and footer choices stay on your device. Read the full [privacy policy](PRIVACY.md).

## Disclaimer

Kaltas is an independent, open-source student project. It is not affiliated with, endorsed by, or connected to any other product, platform or organization with a similar name, including scholarship platforms. Product names, logos and trademarks in the offer list belong to their owners and do not imply endorsement.

## License

[MIT License](LICENSE)
