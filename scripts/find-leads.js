// Weekly deal leads. Run: node scripts/find-leads.js [sources.json]
// Reads public community lists of student discounts, keeps links to sites that offers.json
// does not cover yet, and writes leads-issue.md. These are LEADS, not offers: a person checks
// each one against the official page before anything is added. It never edits offers.json.
const fs = require("fs");

const configFile = process.argv[2] || "scripts/discovery-sources.json";
const offersFile = process.env.OFFERS_FILE || "offers.json";
const seenFile = process.env.SEEN_FILE || "";
const TIMEOUT_MS = Number(process.env.LEADS_TIMEOUT_MS) || 20000;
const MAX_CHARS = 2000000;

const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
const minSources = Number(config.minSources) || 2;
const maxLeads = Number(config.maxLeads) || 10;
const sources = Array.isArray(config.sources) ? config.sources : [];

const NOISE = new Set([
  "github.com", "githubusercontent.com", "github.io", "shields.io", "badgen.net", "twitter.com", "x.com",
  "linkedin.com", "facebook.com", "instagram.com", "youtube.com", "youtu.be", "medium.com", "reddit.com",
  "wikipedia.org", "rawgit.com", "buymeacoffee.com", "ko-fi.com", "discord.com", "discord.gg", "t.me",
  "creativecommons.org", "opensource.org", "dev.to",
]);
const GENERIC_NAME = /^(link|here|website|visit|url|get|click here|more|source|offer|apply|sign up|learn more|read more)$/i;
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "edu", "ac", "gov"]);

function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

// Site-level name: example.com, or example.com.ph for country-style endings.
function siteOf(host) {
  const p = host.split(".");
  if (p.length > 2 && p[p.length - 1].length === 2 && SECOND_LEVEL.has(p[p.length - 2])) return p.slice(-3).join(".");
  return p.slice(-2).join(".");
}

// Text from community lists is untrusted: no tags, no @mentions, no markdown links, short.
function cleanText(line) {
  return line
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/@/g, "(at)")
    .replace(/[*`_>|#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "KaltasLeads/1.0 (+https://github.com/miconvr/kaltas)" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();
  if (text.length > MAX_CHARS) throw new Error("file too large");
  return text;
}

function extract(text, sourceName, found) {
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*([*+-]|\d+\.|\|)/.test(line)) continue;
    for (const m of line.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)) {
      const url = m[2];
      const host = hostOf(url);
      if (!host || /\.(png|jpe?g|gif|svg|webp|ico)(\?|$)/i.test(new URL(url).pathname)) continue;
      const site = siteOf(host);
      if (NOISE.has(site)) continue;
      if (!found.has(site)) found.set(site, { site, name: "", url, line: cleanText(line), sources: new Set() });
      const entry = found.get(site);
      entry.sources.add(sourceName);
      const label = cleanText(m[1]);
      if (!entry.name && label && !GENERIC_NAME.test(label)) entry.name = label;
    }
  }
}

async function main() {
  const offers = JSON.parse(fs.readFileSync(offersFile, "utf8"));
  const list = Array.isArray(offers) ? offers : offers.offers || [];
  const covered = new Set();
  list.forEach((o) => {
    (o.domains || []).forEach((d) => covered.add(siteOf(d)));
    if (o.url && hostOf(o.url)) covered.add(siteOf(hostOf(o.url)));
  });

  const seen = new Set();
  if (seenFile && fs.existsSync(seenFile)) {
    fs.readFileSync(seenFile, "utf8").split(/\r?\n/).map((s) => s.trim().toLowerCase()).filter(Boolean).forEach((s) => seen.add(s));
  }

  const found = new Map();
  const failed = [];
  let okCount = 0;
  for (const src of sources) {
    try {
      extract(await fetchText(src.url), src.name || src.url, found);
      okCount++;
    } catch (e) {
      failed.push((src.name || src.url) + " (" + (e && e.message ? e.message : e) + ")");
    }
  }
  if (!okCount) {
    console.error("No source could be read: " + failed.join("; "));
    process.exit(1);
  }

  const fresh = [...found.values()].filter((v) => !covered.has(v.site) && !seen.has(v.site));
  const strong = fresh
    .filter((v) => v.sources.size >= minSources)
    .sort((a, b) => b.sources.size - a.sources.size || a.site.localeCompare(b.site));
  const picked = strong.slice(0, maxLeads);
  const waiting = strong.length - picked.length;
  const weaker = fresh.length - strong.length;

  console.log("Sources read: " + okCount + "/" + sources.length + ". New sites: " + fresh.length +
    ". In " + minSources + "+ lists: " + strong.length + ". Reporting: " + picked.length + ".");
  failed.forEach((f) => console.log("  source failed: " + f));
  picked.forEach((v) => console.log("  " + v.sources.size + "/" + okCount + "  " + v.site + "  " + (v.name || "(no name)")));

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, "has_leads=" + (picked.length > 0) + "\n");
  }
  if (!picked.length) return;

  let md = "Weekly student-deal leads, " + new Date().toISOString().slice(0, 10) + ".\n\n";
  md += "These links come from public community lists. They are **leads, not verified offers**. For each one, open the official page, check that it applies in the Philippines, and only then add it to `offers.json` (set `verified` to the current month). Check each address before signing in anywhere.\n\n";
  picked.forEach((v, i) => {
    md += (i + 1) + ". **" + (v.name || v.site) + "** - " + v.url + " - in " + v.sources.size + " of " + okCount + " lists\n";
    if (v.line) md += "   > " + v.line + "\n";
  });
  md += "\n";
  if (waiting > 0) md += waiting + " more new leads are waiting for the next weeks.\n";
  if (weaker > 0) md += weaker + " more sites appear in only one list. Lower `minSources` in `scripts/discovery-sources.json` to see them.\n";
  if (failed.length) md += "Sources that could not be read this time: " + failed.join("; ") + ".\n";
  md += "\nClose this issue when you have gone through the list. Leads shown here are not shown again, so closing it means you have seen them.\n\n";
  md += "<!-- leads: " + picked.map((v) => v.site).join(",") + " -->\n";
  fs.writeFileSync("leads-issue.md", md);
}

main().catch((e) => { console.error(e); process.exit(1); });