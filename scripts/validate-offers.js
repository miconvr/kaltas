// Fails the build if offers.json is malformed. Run: node scripts/validate-offers.js
const fs = require("fs");
const offers = JSON.parse(fs.readFileSync("offers.json", "utf8"));
const required = ["name", "domains", "category", "perk"];
let errors = 0;
const seen = new Set();

offers.forEach((o, i) => {
  const label = `#${i} ${o.name || "(no name)"}`;
  for (const k of required) {
    if (k === "domains" && o.type === "info" && Array.isArray(o.domains)) continue;
    if (o[k] === undefined || o[k] === "" || (Array.isArray(o[k]) && !o[k].length)) {
      console.error(`${label}: missing "${k}"`); errors++;
    }
  }
  if (o.type === "info") {
    if (o.domains.length || o.url || !Array.isArray(o.regions) || !o.regions.length) {
      console.error(`${label}: info entries must have empty domains, no url, and a region`);
      errors++;
    }
  } else if (!o.url) {
    console.error(`${label}: non-info entries need a url`); errors++;
  }
  if (o.url && !/^https:\/\//.test(o.url)) { console.error(`${label}: url must be https`); errors++; }
  if (o.verified && !/^\d{4}-\d{2}$/.test(o.verified)) { console.error(`${label}: verified must be YYYY-MM`); errors++; }
  (o.domains || []).forEach((d) => seen.add(d));
});

if (errors) { console.error(`${errors} problem(s) found`); process.exit(1); }
console.log(`offers.json OK (${offers.length} offers)`);
