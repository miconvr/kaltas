# AGENTS.md

Guidance for any AI coding agent working in this repository (Codex, Copilot, Cursor, Gemini, and others). Human contributors can read it too.

Kaltas: Student Discounts is a Chrome extension (Manifest V3) that tells students whether the website they are on has a student discount, with a focus on the Philippines. Repo: `miconvr/kaltas`.

The code on `main` is the source of truth. If this file and the code disagree, fix this file.

## Hard constraints (do not break)

- Manifest V3, plain JavaScript, no build step, no npm, no frameworks.
- Permissions are `activeTab` and `declarativeContent` only. Do not add `tabs`, `storage`, host permissions, or remote code. `declarativeContent` has no install warning and lets Chrome do the URL matching, so the extension never reads tabs or history.
- Domain matching happens locally. The extension never sends the user's browsing data anywhere.
- Only `https:` links may be opened (`safeUrl` in `popup.js` enforces this). Keep it.
- Build DOM with `createElement` and `textContent`. Never use `innerHTML` with offer data.
- Keep `PRIVACY.md` and `README.md` accurate if any data handling or permission changes.
- Never commit API keys. The extension ships no AI key.

## Commands

```bash
node --check popup.js
node --check offers-loader.js
node scripts/validate-offers.js     # must print OK; CI runs it on every push and PR
```

Run the extension locally: open `chrome://extensions`, enable Developer mode, click Load unpacked, select this folder. After editing source files, click Reload on the extension (and check the service worker console too).

## File map

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest (currently version 1.1.4) |
| `popup.html` / `popup.css` | Popup shell and styling. The region picker is built in JS, so the HTML rarely changes |
| `popup.js` | Region logic, host matching, card rendering, browse list, search, settings |
| `background.js` | Service worker. Builds the `declarativeContent` rules and the green-dot icon |
| `offers-loader.js` | Loads the bundled `offers.json` |
| `offers.json` | The data. Source of truth for all perks |
| `scripts/validate-offers.js` | Offer validator, run by `.github/workflows/validate.yml` (Node 20) |
| `api/offer-assistant.js`, `vercel.json` | Optional Vercel + Gemini endpoint. Deployed separately, not called by the extension |
| `icons/`, `store-assets/` | Extension icons, logo, Chrome Web Store screenshots (1280x800) and promo tiles |
| `PRIVACY.md`, `README.md`, `LICENSE` | Privacy policy, public docs, MIT license |

## How offers load (`offers-loader.js`)

`loadOffers()` fetches the bundled `offers.json` from the extension package and returns it. There is no cache and no remote refresh.

- **Offers only reach users in a new extension release.** Pushing to `main` does not update installed copies. Bump `version` in `manifest.json` and publish to the Chrome Web Store.
- `offers.json` may be a bare array or `{ offers: [...] }`; the loader normalizes it, and `popup.js` always receives an array.
- `isValidOffers` only checks for a non-empty list. Per-offer rules live in `scripts/validate-offers.js`. It also rejects unknown `regions` values, bad `expires` dates, malformed domains, duplicate names, and a domain that would show two cards in the same region.

## `offers.json` schema

Each entry is an object:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `category` | string | Shown as a tag, used by search |
| `perk` | string | One generic line. No percentages or promo codes that rotate |
| `url` | string | `https:` only. Omit for info-only entries |
| `domains` | string[] | Hostnames without `www.`. Matches exact host or any subdomain. Empty for info entries |
| `regions` | string[] | `["PH"]`, `["other"]`, `["global"]`. Missing or empty means show everywhere. `"other"` means everyone outside the Philippines, which lets a PH entry and a non-PH entry share a domain without two cards |
| `type` | string | `"info"` means never matched to a site and no link. `popup.js` renders these as info cards (`info-card`) and leaves them out of the toolbar-dot rules |
| `details` | string | Fine print shown in the details dropdown |
| `requirements` | string | Shown as "Who qualifies" |
| `caveats` | string | Shown as "Good to know" |
| `verified` | string | Month last confirmed against an official page, like `"2026-11"`. Leave it out if not verified (the card shows "Needs review") |
| `expires` | string | Optional last day of the offer, `YYYY-MM-DD`. The popup hides the offer after it, and the toolbar dot drops it the next time rules are rebuilt (install, update or browser start) |

If you rename these fields, update `popup.js` too.

## `popup.js` behavior

- Region is `"PH"` or `"other"`. The first-run default is guessed (`navigator.language` ending in `-PH`, or the `Asia/Manila` time zone, means PH, otherwise other) and saved right away in localStorage as `iskolar-region`, so it never changes unless the user changes it with the picker the script builds itself. localStorage survives closing Chrome and restarting the PC; it is lost only on uninstall, profile removal, or Incognito, and it does not sync between devices.
- `inRegion` hides offers whose `regions` has neither `global` nor the current region.
- Matched cards show when the active tab's hostname matches an offer's `domains`. If none match, the browse list opens (unless the user closed it).
- Browse list entries without a usable https `url` render as plain text, not dead links.
- Other localStorage keys: `iskolar-theme`, `iskolar-browse-closed`, `iskolar-footer-hidden`. The `iskolar-` prefix is historical; do not rename keys without a migration, or users lose their settings.
- Keep source files UTF-8 without BOM. Past versions had a browse-list separator character corrupted into mojibake by bad encoding; for non-ASCII characters in JS, prefer escapes (for example `\u00b7`) and check the rendering.

## Toolbar badge (`background.js`)

- On install and update, the service worker reads `offers.json`, collects the domains of every non-info offer, and registers one `declarativeContent` rule. Chrome swaps in a generated icon with a green dot (top right) while the active tab's host equals a domain or ends with `.domain`.
- The dot icon is drawn at runtime with `OffscreenCanvas` from `icons/icon128.png`; there is no separate asset.
- The badge ignores the region picker, because the service worker cannot read the popup's localStorage and `storage` is not allowed. A PH-only offer can therefore light the dot for someone set to "other". The popup still filters by region.
- Rules are rebuilt on install, update and browser start. Chrome keeps them between rebuilds. The startup rebuild is what drops offers past their `expires` date.

## Offer verification policy

- Prefer official domains. News and aggregator articles are not enough to set `verified`.
- Keep perk text generic. Rotating promos, percentages and gift cards go stale.
- Leave `verified` out and add a caveat when a source is secondary.
- Set `verified` to the current month (for example `"2026-11"`) whenever an entry is re-checked against an official page.
- Remove offers the provider has ended (for example PAL Global Student Plus, whose sales period ended 2023-12-31).
- Automation may flag broken URLs or changed pages but must never publish a discount automatically. Flow: source check, proposed change, official-page review, pull request, updated `offers.json`, extension release.

## Current state and open items

- Apple: `Apple Education Store (PH)` is `regions: ["PH"]` and links `https://www.apple.com/ph-edu/store`; the generic `Apple Education Store` is `regions: ["other"]`.
- `Google AI Plus for Students` is `["global"]`, verified 2026-11 against Google's blog post and the Google One help page. It is unavailable in the US, Hong Kong, Macau and Tunisia, and Google's post also excludes Bolivia, Albania and Canada. Claim deadline is 2026-12-31, so the entry has `"expires": "2026-12-31"` and hides itself after that date. Delete it in a later release.
- Spotify and YouTube Premium stay `["global"]`, checked against their official pages.
- Perplexity Education Pro is `["global"]` with no `verified` date. Philippines availability is unconfirmed, so the card shows "Needs review". Set `verified` once someone has verified with a Philippine school.
- Proton's student discounts are deliberately not listed: Proton's own pages limit them to students in the US, UK, France and Germany (checked 2026-11). Revisit if the Philippines is added.
- The AI endpoint in `api/` is not wired into the popup. If it ever is, add rate limiting, usage limits and a deployed endpoint URL first. It must only explain existing curated offers, never discover, verify, invent or publish discounts. Env vars: `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.0-flash`).

## Testing checklist before every push

- Extension reloads with no errors on `chrome://extensions` (check the service worker's console too).
- `node scripts/validate-offers.js` prints OK.
- On spotify.com the toolbar icon shows a green dot and the card has a details dropdown. On a site with no offer the icon has no dot, the message appears, and the browse list opens.
- The region picker switches PH and other correctly, and the choice persists after closing and reopening Chrome. A fresh install with the Asia/Manila time zone starts on Philippines.
- Any non-ASCII text in the popup renders cleanly (no mojibake).
- Before releasing, bump `version` in `manifest.json`.

## Working with the owner

The owner (Mico) develops on Windows with PowerShell and often applies changes by pasting terminal commands.

- **With repo access and push rights:** edit the files directly.
- **Without repo access (chat only):** deliver each file change as one copy-paste PowerShell block, not an attachment.
  - Start every block with `cd $HOME\Downloads\kaltas`.
  - Write files with `[System.IO.File]::WriteAllText("$PWD\<file>", $text, (New-Object System.Text.UTF8Encoding($false)))`, using a single-quoted here-string. The closing marker must sit at the very start of a line.
  - Never use `>` or `Out-File` for source files. A pasted `>` was once treated as redirection and created junk files; write UTF-8 without BOM. To check for junk files: `Get-ChildItem -Force -File | Where-Object { $_.Name -notmatch '^[A-Za-z0-9_.\-]+$' }`.
  - Keep pasted content ASCII-only where possible; use escapes for special characters in code.
  - End each block with a one-line check command (for example `Select-String`) and say what output to expect.
  - Give one small, checkable step at a time, then say how to test it (reload at `chrome://extensions`, which site to open, what should appear) and give the git commands.
  - To read a file the owner has locally, ask them to run `notepad <file>`, press Ctrl+A, Ctrl+C, and paste it into chat. Terminal scrollback is not the file.
- Keep changes focused: one request is one scope. Do not expand into an unrequested audit.

## Conventions

- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`), lowercase, imperative, no trailing period.
- The project is an independent open-source student project (MIT). It is not affiliated with scholarship platforms or any similarly named product. Brand names in `offers.json` belong to their owners.