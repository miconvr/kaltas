// Fails the build if offers.json is malformed. Run: node scripts/validate-offers.js
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("offers.json", "utf8"));
const offers = Array.isArray(data) ? data : data.offers;
if (!Array.isArray(offers) || !offers.length) {
  console.error("offers.json must be a non-empty list");
  process.exit(1);
}

const required = ["name", "domains", "category", "perk"];
const VALID_REGIONS = ["PH", "other", "global"];
let errors = 0;
const names = new Set();

offers.forEach((o, i) => {
  const label = `#${i} ${o.name || "(no name)"}`;
  for (const k of required) {
    if (k === "domains" && o.type === "info" && Array.isArray(o.domains)) continue;
    if (o[k] === undefined || o[k] === "" || (Array.isArray(o[k]) && !o[k].length)) {
      console.error(`${label}: missing "${k}"`); errors++;
    }
  }
  if (o.domains !== undefined && !Array.isArray(o.domains)) {
    console.error(`${label}: domains must be a list`); errors++;
  }
  const domains = Array.isArray(o.domains) ? o.domains : [];
  if (o.type === "info") {
    if (domains.length || o.url || !Array.isArray(o.regions) || !o.regions.length) {
      console.error(`${label}: info entries must have empty domains, no url, and a region`);
      errors++;
    }
  } else if (!o.url) {
    console.error(`${label}: non-info entries need a url`); errors++;
  }
  if (o.url && !/^https:\/\//.test(o.url)) { console.error(`${label}: url must be https`); errors++; }
  if (o.verified && !/^\d{4}-\d{2}$/.test(o.verified)) { console.error(`${label}: verified must be YYYY-MM`); errors++; }

  // A typo here would silently hide the offer in the popup, so fail the build instead.
  if (o.regions !== undefined) {
    if (!Array.isArray(o.regions)) {
      console.error(`${label}: regions must be a list`); errors++;
    } else {
      o.regions.forEach((r) => {
        if (!VALID_REGIONS.includes(r)) {
          console.error(`${label}: unknown region "${r}" (use ${VALID_REGIONS.join(", ")})`); errors++;
        }
      });
    }
  }

  if (o.expires !== undefined) {
    if (typeof o.expires !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.expires) || isNaN(new Date(o.expires + "T00:00:00"))) {
      console.error(`${label}: expires must be a real date like 2026-12-31`); errors++;
    }
  }

  domains.forEach((d) => {
    if (typeof d !== "string" || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(d) || d.startsWith("www.")) {
      console.error(`${label}: bad domain "${d}" (lowercase hostname, no scheme, path or www.)`); errors++;
    }
  });

  if (o.name) {
    if (names.has(o.name)) { console.error(`${label}: duplicate name`); errors++; }
    names.add(o.name);
  }
});

// Same rule as popup.js inRegion(): no regions, or "global", or the user's region.
function visibleIn(o, region) {
  const r = o.regions;
  if (!Array.isArray(r) || r.length === 0) return true;
  return r.includes("global") || r.includes(region);
}

// Two cards for one site in the same region is a data mistake. A PH entry and an "other"
// entry can share a domain because they never show together.
["PH", "other"].forEach((region) => {
  const byDomain = new Map();
  offers.forEach((o) => {
    if (o.type === "info" || !visibleIn(o, region)) return;
    (Array.isArray(o.domains) ? o.domains : []).forEach((d) => {
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d).push(o.name);
    });
  });
  byDomain.forEach((list, d) => {
    if (list.length > 1) {
      console.error(`${d}: ${list.length} offers would show together for region ${region}: ${list.join(", ")}`);
      errors++;
    }
  });
});

if (errors) { console.error(`${errors} problem(s) found`); process.exit(1); }
console.log(`offers.json OK (${offers.length} offers)`);
