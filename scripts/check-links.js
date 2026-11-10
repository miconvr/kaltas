// Weekly link check for offers.json. Run: node scripts/check-links.js [offers.json]
// Writes link-report.md and, inside GitHub Actions, sets has_problems=true when something
// needs a look. It never edits offers.json: a person reviews every change.
const fs = require("fs");

const file = process.argv[2] || "offers.json";
const TIMEOUT_MS = Number(process.env.LINK_TIMEOUT_MS) || 20000;
const RETRY_DELAY_MS = Number(process.env.LINK_RETRY_MS) || 2000;
const CONCURRENCY = 4;
const UA = "Mozilla/5.0 (compatible; KaltasLinkCheck/1.0; +https://github.com/miconvr/kaltas)";

let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error("Could not read " + file + ": " + e.message);
  process.exit(1);
}
const offers = (Array.isArray(data) ? data : data.offers || []).filter((o) => o && o.type !== "info" && o.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bareHost = (u) => new URL(u).hostname.replace(/^www\./, "").toLowerCase();

// support.example.com and example.com count as the same site.
function sameSite(a, b) {
  const x = bareHost(a);
  const y = bareHost(b);
  return x === y || x.endsWith("." + y) || y.endsWith("." + x);
}

// Pages that ask you to sign in cannot be checked without an account.
function looksLikeSignIn(u) {
  const x = new URL(u);
  return /^(accounts|login|signin|auth|id|sso)\./i.test(x.hostname) ||
    /\/(sign-?in|log-?in|sso|oauth2?|auth)(\/|$)/i.test(x.pathname);
}

// Returns { kind, note }. kind is ok, broken, moved, home or unverified.
async function checkOnce(url) {
  let res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const code = (e && e.cause && e.cause.code) || (e && e.code) || "";
    if (code === "ENOTFOUND") return { kind: "broken", note: "domain not found" };
    if (/^CERT_|^UNABLE_TO_VERIFY|^DEPTH_ZERO|^ERR_TLS_CERT|^SELF_SIGNED/.test(code)) {
      return { kind: "broken", note: "certificate problem (" + code + ")" };
    }
    const why = e && e.name === "TimeoutError" ? "timed out" : code || (e && e.message) || "network error";
    return { kind: "unverified", note: why };
  }
  try { if (res.body) await res.body.cancel(); } catch {}

  if (res.status === 404 || res.status === 410) return { kind: "broken", note: "HTTP " + res.status };
  if (res.status >= 200 && res.status < 300) {
    const from = new URL(url);
    const to = new URL(res.url);
    if (looksLikeSignIn(res.url) && !looksLikeSignIn(url)) {
      return { kind: "unverified", note: "redirects to a sign-in page, open it by hand" };
    }
    if (!sameSite(url, res.url)) return { kind: "moved", note: "now redirects to " + res.url };
    const toHome = (to.pathname === "/" || to.pathname === "") && from.pathname !== "/" && from.pathname !== "";
    if (toHome) return { kind: "home", note: "redirects to the site's home page" };
    return { kind: "ok", note: "" };
  }
  return { kind: "unverified", note: "HTTP " + res.status + ", site may block automated checks" };
}

async function check(url) {
  let r = await checkOnce(url);
  if (r.kind === "unverified") {
    await sleep(RETRY_DELAY_MS);
    r = await checkOnce(url);
  }
  return r;
}

async function main() {
  const results = new Array(offers.length);
  let next = 0;
  async function worker() {
    while (next < offers.length) {
      const i = next++;
      results[i] = { offer: offers[i], ...(await check(offers[i].url)) };
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, offers.length) }, worker));

  const by = (k) => results.filter((r) => r.kind === k);
  const line = (r) => "- **" + r.offer.name + "**: " + r.offer.url + (r.note ? " (" + r.note + ")" : "");
  const sections = [
    ["Broken: fix or remove", by("broken")],
    ["Moved to another site", by("moved")],
    ["Redirects to a home page (offer may have ended)", by("home")],
    ["Could not verify (often a site blocking automated checks, open these by hand)", by("unverified")],
  ];
  const problems = by("broken").length + by("moved").length + by("home").length;

  let md = "Weekly link check, " + new Date().toISOString().slice(0, 10) + ". Checked " + results.length + " offer links.\n\n";
  sections.forEach(([title, list]) => {
    if (list.length) md += "## " + title + "\n\n" + list.map(line).join("\n") + "\n\n";
  });
  md += "Nothing was changed automatically. Open each link, confirm against the official page, then edit `offers.json` (set `verified` to the current month) or remove the offer, and open a pull request.\n";
  fs.writeFileSync("link-report.md", md);

  console.log("Checked " + results.length + ": ok " + by("ok").length + ", broken " + by("broken").length +
    ", moved " + by("moved").length + ", home " + by("home").length + ", unverified " + by("unverified").length);
  results.filter((r) => r.kind !== "ok").forEach((r) => console.log("  " + r.kind.padEnd(10) + " " + r.offer.name + " - " + r.note));

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, "has_problems=" + (problems > 0) + "\n");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });