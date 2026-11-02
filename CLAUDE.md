# Iskolar: agent handoff

Iskolar is a Chrome extension (Manifest V3) that tells students whether the website they are on has a student discount, with a focus on the Philippines. Repo: `miconvr/iskolar`. Local folder: `$HOME\Downloads\iskolar` (Windows, PowerShell).

## Working style (read this first)

- **Deliver everything as a copy-paste PowerShell block.** Whenever you create or change a file, give the owner one terminal block that writes it, not an attachment and not a "paste this into your editor" instruction.
- Write files with `[System.IO.File]::WriteAllText("$PWD\<file>", $text, (New-Object System.Text.UTF8Encoding($false)))`, using a single-quoted here-string (`@'` ... `'@`) for the content. The closing `'@` must sit at the very start of a line.
- Start every block with `cd $HOME\Downloads\iskolar`.
- Keep pasted content ASCII-only where possible. For special characters in code, use escapes (for example `\u00B7` for the middle dot in JavaScript).
- For small edits to an existing file, prefer a targeted `-replace` or a full rewrite. Never use `>` or `Out-File` for source files.
- End each block with a one-line check command (for example `Select-String`) and say what output to expect.
- Give one small, checkable step at a time. Then say how to test it (reload at chrome://extensions, which site to open, what should appear) and give the git commands.
- When you need the contents of a file, ask the owner to run `notepad <file>`, press Ctrl+A, Ctrl+C, and paste it into the chat. Terminal scrollback is not the file.

## Hard constraints (do not break)

- Manifest V3, plain JavaScript, no build step, no npm, no frameworks.
- Only the `activeTab` permission. Do not add `tabs`, `storage`, host permissions, or remote code.
- Domain matching happens locally. The extension never sends the user's browsing data anywhere.
- Only `https:` links may be opened (`safeUrl` in popup.js enforces this). Keep it.
- Build DOM with `createElement` and `textContent`. Never use `innerHTML` with offer data, because offers.json is fetched remotely.
- Keep `PRIVACY.md` accurate if any data handling changes.

## File map

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest |
| `popup.html` / `popup.css` | Popup shell and styling. The region picker and info box are built in JS, so the HTML rarely changes |
| `popup.js` | Region logic, host matching, card rendering, browse list, search |
| `offers-loader.js` | Loads offers: localStorage cache, refreshed from GitHub raw, bundled fallback |
| `offers.json` | The data. Source of truth for all perks |
| `icons/`, `scripts/`, `.github/` | Assets, helper scripts, CI |

## How offers load (offers-loader.js)

1. `loadOffers()` reads the localStorage cache (`iskolar.offers.v1`).
2. If the cache is missing or older than 24 hours, it triggers `refreshOffers()` in the background. This fetches `https://raw.githubusercontent.com/miconvr/iskolar/main/offers.json` with a 4 second timeout.
3. It returns the cache if present. Otherwise it returns the bundled `offers.json` from the extension package.

Consequences you must remember:

- **Pushing to `main` is what ships data.** Users get new offers within about 24 hours, plus one extra popup open, because a stale cache is returned first while the refresh runs in the background.
- **Bundled `offers.json` is only the first-run fallback.** Keep it in sync with `main`.
- **Validation is shallow.** `isValidOffers` only checks that the list is a non-empty array. It does not check per-offer fields, so entries with empty `domains` or no `url` (the `type: "info"` entries) are not discarded by the loader.
- **If the offers.json schema changes in a breaking way, bump `CACHE_KEY`** (for example to `iskolar.offers.v2`) so old cached data does not get fed to new code.
- `loadOffers()` may return either a bare array or `{ offers: [...] }` (the validator accepts both), but `popup.js` calls `offers.filter(...)` directly. Keep offers.json a bare array, or normalize in `popup.js` before changing the format.

## offers.json schema

Each entry is an object:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `category` | string | Shown as a tag, used by search |
| `perk` | string | One generic line. No percentages or promo codes that rotate |
| `url` | string | `https:` only. Omit for info-only entries |
| `domains` | string[] | Hostnames without `www.`. Matches exact host or any subdomain. Empty for info entries |
| `regions` | string[] | `["PH"]`, `["global"]`, or both. Missing or empty means show everywhere |
| `type` | string | `"info"` means never matched to a site. Rendered in the "Also worth knowing" box with no link |
| `details` | string | Fine print shown in the Details dropdown |
| `requirements` | string | Shown as "Who qualifies" |
| `caveats` | string | Shown as "Good to know" |
| `verified` | boolean | `false` until someone opens the official page and confirms |
| `lastChecked` | string | Date of the last manual check |

The field names `details`, `requirements`, `caveats`, `type`, `regions` and `lastChecked` were chosen by the assistant, not inherited from the original file. If you rename them, update `popup.js` too.

## popup.js behavior

- Region is `"PH"` or `"other"`. The default is guessed from `navigator.language` (`-PH` means PH), saved in localStorage as `iskolar-region`, and changeable via a picker that the script builds itself.
- `inRegion` hides offers whose `regions` has neither `global` nor the current region.
- Matched cards show when the active tab's hostname matches an offer's `domains`. If none match, the browse list opens.
- Info-only offers are never matched to a site. They always show (region permitting) under "Also worth knowing".
- The browse list separator must be a real middle dot, written as `\u00B7` in the JS source. Past versions were corrupted into mojibake by bad encoding.

## Environment gotchas (this has bitten us)

The owner works in Windows PowerShell and pastes commands from chat. Past problems:

- A pasted line containing `>` was treated as redirection and created two junk files whose names start with "kolar" and "t_version". Check they are gone: `Get-ChildItem -Force -File | Where-Object { $_.Name -notmatch '^[A-Za-z0-9_.\-]+$' }`.
- Terminal scrollback is not the file contents (see Working style).
- Write files as UTF-8 **without BOM**. Avoid `Out-File` and `>` for source files.
- Do **not** re-run any earlier `Copy-Item ... offers.backup.json` revert. The repo was restored to the merged 14-offer `offers.json` (commit `2edbbf4`).

## Verification policy

- Prefer official domains. News and aggregator articles are not enough to mark `verified: true`.
- Keep perk text generic. Rotating promos, percentages and gift cards go stale.
- Mark `verified: false` and add a caveat when a source is secondary.
- Update `lastChecked` whenever an entry is re-checked.

## Current state and next steps

Done:
- Merged 14-offer `offers.json` is in the repo.
- Region filter, Details dropdown and info box were written in `popup.js` (delivered as a PowerShell block). **Confirm the owner actually applied it and tested it.**

To do, in order:
1. Confirm `popup.js` is the new version: `Select-String -Path popup.js -Pattern "inRegion"`. Reload the extension at chrome://extensions, open spotify.com, and check the Details dropdown, the region picker and the browse list separator.
2. Delete the two junk files if still present, then `git add -A`, commit and push.
3. Add the two info-only entries to `offers.json` (the loader will not reject them):
   - Rail student discount: `type: "info"`, `domains: []`, no `url`, `regions: ["PH"]`. Students get 50% off on LRT-1, LRT-2 and MRT-3 by showing ID at a station. Caveat: since March 23, 2026, reports say MRT-3 and LRT-2 give everyone 50% off with a blue Beep card "until further notice", so the student perk may add nothing on those lines. Sources so far are news coverage only, so `verified: false`.
   - Student Fare Discount Act (RA 11314): `type: "info"`, same shape.
4. Verify the pending entries against official pages and flip `verified`:
   - Apple Education Store PH: confirm the exact store URL (linking the homepage is the safe option for now).
   - Philippine Airlines student discount: details came from a secondary source. Confirm on philippineairlines.com.
   - Microsoft: no Philippines-specific page was found. Hold off until someone opens the PH Microsoft Store and confirms.
   - Spotify and YouTube Premium: currently `["PH", "global"]`. Drop `"global"` if they should only show in the Philippines.
5. After each `offers.json` change, update `lastChecked`, push to `main`, and remember it takes up to 24 hours (plus one extra popup open) to reach users with a warm cache. To test sooner, run `localStorage.removeItem("iskolar.offers.v1")` in the popup's DevTools console.

## Testing checklist before every push

- Extension reloads with no errors on chrome://extensions.
- Spotify: card shows with a Details dropdown.
- A site with no offer: the message appears and the browse list opens.
- The region picker switches PH and other correctly, and the choice persists.
- Info entries show under "Also worth knowing" and have no link.
- The browse list separator renders as a clean middle dot, not garbled text.