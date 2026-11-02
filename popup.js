// Iskolar - popup logic.
// Everything runs locally: we read the active tab's hostname (allowed by activeTab
// once the user clicks the icon) and compare it with the offers list.

const $ = (id) => document.getElementById(id);

function matchesHost(offer, host) {
  return (offer.domains || []).some((d) => host === d || host.endsWith("." + d));
}

// Region is "PH" or "other". We guess from the browser language and let the user change it.
function getRegion() {
  try {
    const saved = localStorage.getItem("iskolar-region");
    if (saved === "PH" || saved === "other") return saved;
  } catch {}
  return /-PH$/i.test(navigator.language || "") ? "PH" : "other";
}

function saveRegion(region) {
  try {
    localStorage.setItem("iskolar-region", region);
  } catch {}
}

// Offers without a regions list show everywhere.
function inRegion(offer, region) {
  const r = offer.regions;
  if (!Array.isArray(r) || r.length === 0) return true;
  return r.includes("global") || r.includes(region);
}

function isInfo(offer) {
  return offer.type === "info";
}

function verificationLabel(offer) {
  if (!/^\d{4}-\d{2}$/.test(offer.verified || "")) return "Needs review";
  const [year, month] = offer.verified.split("-").map(Number);
  const checked = new Date(year, month - 1, 1);
  const ageMonths = (new Date().getFullYear() - checked.getFullYear()) * 12
    + new Date().getMonth() - checked.getMonth();
  return ageMonths > 12 ? "Review overdue" : "Checked " + checked.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function makeDetails(offer) {
  const rows = [
    ["Details", offer.details],
    ["Who qualifies", offer.requirements],
    ["Good to know", offer.caveats],
  ].filter(([, text]) => typeof text === "string" && text);
  if (!rows.length) return null;

  const box = document.createElement("details");
  const sum = document.createElement("summary");
  sum.textContent = "Details";
  box.append(sum);
  rows.forEach(([label, text]) => {
    const p = document.createElement("p");
    const b = document.createElement("strong");
    b.textContent = label + ": ";
    p.append(b, text);
    box.append(p);
  });
  return box;
}

function makeCard(offer) {
  const card = document.createElement("div");
  card.className = isInfo(offer) ? "card info-card" : "card";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = offer.category || "Info";

  const h2 = document.createElement("h2");
  h2.textContent = offer.name;

  const status = document.createElement("span");
  status.className = offer.verified ? "verification" : "verification verification-warning";
  status.textContent = verificationLabel(offer);

  const p = document.createElement("p");
  p.textContent = offer.perk;

  card.append(tag, h2, status, p);

  const more = makeDetails(offer);
  if (more) card.append(more);

  if (offer.url) {
    const a = document.createElement("a");
    a.className = "btn";
    a.href = safeUrl(offer.url);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "View offer";
    card.append(a);
  }

  if (!isInfo(offer)) {
    const report = document.createElement("a");
    report.className = "report-link";
    report.href = "https://github.com/miconvr/iskolar/issues/new";
    report.target = "_blank";
    report.rel = "noopener noreferrer";
    report.textContent = "Report an outdated offer";
    card.append(report);
  }
  return card;
}

function renderList(offers, query = "") {
  const ul = $("all");
  ul.replaceChildren();
  const q = query.trim().toLowerCase();
  offers
    .filter((o) => !q || ((o.name || "") + " " + (o.category || "") + " " + (o.perk || "")).toLowerCase().includes(q))
    .forEach((o) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = safeUrl(o.url);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = o.name + " ";
      const small = document.createElement("small");
      small.textContent = "\u00B7 " + (o.category || "");
      a.append(small);
      li.append(a);
      ul.append(li);
    });
}

async function getHost() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function init() {
  let offers = [];
  try {
    offers = await loadOffers();
  } catch (e) {
    $("matches").textContent = "Couldn't load offers.";
    return;
  }

  const host = await getHost();
  $("site").textContent = host ? "On " + host : "Open a website to check it";

  let region = getRegion();
  let query = "";

  // Region picker, built here so popup.html doesn't need to change.
  const label = document.createElement("label");
  label.className = "region-picker";
  label.textContent = "Region: ";
  const select = document.createElement("select");
  [["PH", "Philippines"], ["other", "Other countries"]].forEach(([value, text]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    select.append(opt);
  });
  select.value = region;
  label.append(select);
  $("site").after(label);

  // Extra box for info-only entries (for example rail fares), shown under the matches.
  const infoBox = document.createElement("div");
  $("matches").after(infoBox);

  function render() {
    const visible = offers.filter((o) => inRegion(o, region));
    const sites = visible.filter((o) => !isInfo(o));
    const infos = visible.filter(isInfo);
    $("browse").querySelector(".summary-count").textContent = sites.length + " available";

    const box = $("matches");
    box.replaceChildren();
    const hits = host ? sites.filter((o) => matchesHost(o, host)) : [];
    if (hits.length) {
      const heading = document.createElement("p");
      heading.className = "match-label match-label-found";
      heading.textContent = hits.length === 1 ? "1 student perk found" : hits.length + " student perks found";
      box.append(heading);
      hits.forEach((o) => box.append(makeCard(o)));
    } else if (host) {
      const p = document.createElement("p");
      p.className = "empty-state";
      const strong = document.createElement("strong");
      strong.textContent = "Nothing matched yet";
      const message = document.createElement("span");
      message.textContent = " Browse the list below to find another student perk.";
      p.replaceChildren(strong, message);
      box.append(p);
      $("browse").open = true;
    }

    infoBox.replaceChildren();
    if (infos.length) {
      const h = document.createElement("p");
      h.className = "info-heading";
      h.textContent = "Also worth knowing";
      infoBox.append(h);
      infos.forEach((o) => infoBox.append(makeCard(o)));
    }

    renderList(sites, query);
  }

  select.addEventListener("change", () => {
    region = select.value;
    saveRegion(region);
    render();
  });
  $("search").addEventListener("input", (e) => {
    query = e.target.value;
    render();
  });

  render();
}

init();

// Only allow https links, so a bad remote entry can't open anything unsafe.
function safeUrl(u) {
  try {
    const p = new URL(u);
    return p.protocol === "https:" ? p.href : "#";
  } catch {
    return "#";
  }
}