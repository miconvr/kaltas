// Weekly cleanup of offers.json. Run: node scripts/prune-offers.js
// Removes an offer when its "expires" date has passed, or when its link has been dead
// (404, 410, domain gone, bad certificate, or redirect to the site's home page) for
// STRIKES weeks in a row. Strikes are kept in scripts/link-state.json. Offers whose
// pages only moved or could not be checked are never removed here.
// Safety stops: nothing is removed when many links fail at once (probably a network
// problem) or when one run would remove more than MAX_REMOVALS offers.
// Writes prune-report.md and, inside GitHub Actions, sets changed=true when it edited files.
const fs = require("fs");
const { check } = require("./check-links.js");

const OFFERS_FILE = process.env.OFFERS_FILE || "offers.json";
const STATE_FILE = process.env.STATE_FILE || "scripts/link-state.json";
const STRIKES = Number(process.env.PRUNE_STRIKES) || 3;
const MAX_REMOVALS = Number(process.env.PRUNE_MAX_REMOVALS) || 3;
const MAX_FAIL_SHARE = 0.25;
const CONCURRENCY = 4;
const DEAD = new Set(["broken", "home"]);

const today = new Date().toISOString().slice(0, 10);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

async function main() {
  const raw = fs.readFileSync(OFFERS_FILE, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(OFFERS_FILE + " must be a list");
  const state = readJson(STATE_FILE, {});

  const expired = data.filter((o) => typeof o.expires === "string" && o.expires < today);
  const live = data.filter((o) => !expired.includes(o) && o.type !== "info" && o.url);

  const results = new Array(live.length);
  let next = 0;
  async function worker() {
    while (next < live.length) {
      const i = next++;
      results[i] = await check(live[i].url);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, live.length) }, worker));

  const newState = {};
  const dead = [];
  let failing = 0;
  live.forEach((o, i) => {
    const r = results[i];
    const prev = (state[o.name] && state[o.name].strikes) || 0;
    if (DEAD.has(r.kind)) {
      failing++;
      const strikes = prev + 1;
      newState[o.name] = { strikes, last: r.kind + (r.note ? ": " + r.note : "") };
      if (strikes >= STRIKES) dead.push({ offer: o, note: r.note || r.kind, strikes });
    } else if (r.kind === "unverified" && prev) {
      newState[o.name] = state[o.name]; // can't tell this week: keep the count, don't add to it
    }
  });

  console.log("Checked " + live.length + " links, " + failing + " dead this week, " + expired.length + " expired by date.");
  live.forEach((o, i) => { if (results[i].kind !== "ok") console.log("  " + results[i].kind.padEnd(10) + " " + o.name + " - " + results[i].note); });

  let allowDead = dead;
  const notes = [];
  if (live.length && failing / live.length > MAX_FAIL_SHARE) {
    // Probably a network problem on the runner: this week counts for nothing.
    allowDead = [];
    Object.keys(newState).forEach((k) => delete newState[k]);
    Object.assign(newState, state);
    notes.push("Too many links failed at once (" + failing + " of " + live.length + "), so no link-based removals were made and no strikes were counted this week.");
  } else if (dead.length > MAX_REMOVALS) {
    allowDead = [];
    notes.push(dead.length + " offers reached " + STRIKES + " dead weeks in one run (limit " + MAX_REMOVALS + "), so none were removed. Review them by hand: " + dead.map((d) => d.offer.name).join(", ") + ".");
  }

  const removeNames = new Set([...expired.map((o) => o.name), ...allowDead.map((d) => d.offer.name)]);
  const keepNames = new Set(data.filter((o) => !removeNames.has(o.name)).map((o) => o.name));
  Object.keys(newState).forEach((k) => { if (!keepNames.has(k)) delete newState[k]; });

  const out = { removed: [], notes };
  expired.forEach((o) => out.removed.push(o.name + " (expired " + o.expires + ")"));
  allowDead.forEach((d) => out.removed.push(d.offer.name + " (link dead " + d.strikes + " weeks: " + d.note + ")"));

  let changed = false;
  if (removeNames.size) {
    const kept = data.filter((o) => !removeNames.has(o.name));
    if (!kept.length) throw new Error("Refusing to write an empty offers list");
    const nl = raw.includes("\r\n") ? "\r\n" : "\n";
    const body = JSON.stringify(kept, null, 4).replace(/\n/g, nl);
    fs.writeFileSync(OFFERS_FILE, body + (raw.endsWith("\n") ? nl : ""));
    changed = true;
  }

  const stateText = Object.keys(newState).length ? JSON.stringify(newState, null, 2) + "\n" : "{}\n";
  const oldStateText = fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, "utf8") : "";
  if (stateText !== oldStateText && !(oldStateText === "" && stateText === "{}\n")) {
    fs.writeFileSync(STATE_FILE, stateText);
    changed = true;
  }

  let md = "Weekly cleanup, " + today + ".\n\n";
  md += out.removed.length ? "Removed:\n\n" + out.removed.map((s) => "- " + s).join("\n") + "\n\n" : "Nothing was removed.\n\n";
  if (notes.length) md += notes.join("\n") + "\n";
  fs.writeFileSync("prune-report.md", md);
  out.removed.forEach((s) => console.log("removed: " + s));
  notes.forEach((s) => console.log(s));

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, "changed=" + changed + "\n" + "removed=" + (removeNames.size > 0) + "\n");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
