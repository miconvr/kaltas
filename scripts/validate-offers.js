// Fails the build if offers.json is malformed. Run: node scripts/validate-offers.js
const fs = require("fs");
const offers = JSON.parse(fs.readFileSync("offers.json", "utf8"));
const required = ["name", "domains", "category", "perk", "url", "verified"];
let errors = 0;
const seen = new Set();

offers.forEach((o, i) => {
  const label = `#${i} ${o.name || "(no name)"}`;
  for (const k of required) {
    if (o[k] === undefined || o[k] === "" || (Array.isArray(o[k]) && !o[k].length)) {
      console.error(`${label}: missing "${k}"`); errors++;
    }
  }
  if (o.url && !/^https:\/\//.test(o.url)) { console.error(`${label}: url must be https`); errors++; }
  if (o.verified && !/^\d{4}-\d{2}$/.test(o.verified)) { console.error(`${label}: verified must be YYYY-MM`); errors++; }
  (o.domains || []).forEach((d) => {
    if (seen.has(d)) { console.error(`${label}: duplicate domain ${d}`); errors++; }
    seen.add(d);
  });
});

if (errors) { console.error(`${errors} problem(s) found`); process.exit(1); }
console.log(`offers.json OK (${offers.length} offers)`);
