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

function getTheme() {
  try {
    const saved = localStorage.getItem("iskolar-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "dark";
}

function saveTheme(theme) {
  try {
    localStorage.setItem("iskolar-theme", theme);
  } catch {}
}

function getBrowseClosed() {
  try {
    return localStorage.getItem("iskolar-browse-closed") === "1";
  } catch {}
  return false;
}

function saveBrowseClosed(closed) {
  try {
    if (closed) localStorage.setItem("iskolar-browse-closed", "1");
    else localStorage.removeItem("iskolar-browse-closed");
  } catch {}
}

function getFooterHidden() {
  try {
    return localStorage.getItem("iskolar-footer-hidden") === "1";
  } catch {}
  return false;
}

function saveFooterHidden(hidden) {
  try {
    if (hidden) localStorage.setItem("iskolar-footer-hidden", "1");
    else localStorage.removeItem("iskolar-footer-hidden");
  } catch {}
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = $("theme-toggle");
  const dark = theme === "dark";
  button.setAttribute("aria-label", dark ? "Enable light mode" : "Enable dark mode");
  button.setAttribute("aria-pressed", String(dark));
  button.querySelector(".theme-label").textContent = dark ? "Light mode" : "Dark mode";
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
  sum.textContent = "Who qualifies & details";
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

  const fig = isInfo(offer) ? null : (offer.perk || "").match(/(?:up to\s+)?\d{1,3}\s?%\s*off/i);
  if (fig) {
    const f = document.createElement("div");
    f.className = "perk-figure";
    f.textContent = fig[0].charAt(0).toUpperCase() + fig[0].slice(1);
    card.append(tag, h2, f, status, p);
  } else {
    card.append(tag, h2, status, p);
  }

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
  $("site").textContent = host ? "You're on " + host : "Open a website to check it";

  let region = getRegion();
  let query = "";
  let theme = getTheme();
  applyTheme(theme);

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
  label.dataset.region = region;
  label.append(select);
  $("site").after(label);

  function render() {
    const visible = offers.filter((o) => inRegion(o, region));
    const sites = visible.filter((o) => !isInfo(o));
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
      strong.textContent = "No student deal on this site";
      const message = document.createElement("span");
      message.textContent = " Try the list below, or search for a store.";
      p.replaceChildren(strong, message);
      box.append(p);
      if (!getBrowseClosed()) $("browse").open = true;
    }

    renderList(sites, query);
  }

  select.addEventListener("change", () => {
    region = select.value;
    label.dataset.region = region;
    saveRegion(region);
    render();
  });
  $("browse").querySelector("summary").addEventListener("click", function () {
    saveBrowseClosed($("browse").open);
  });
  const panel = $("settings-panel");
  const gear = $("settings-btn");
  const footerBtn = $("footer-toggle");
  function applyFooter(hidden) {
    document.querySelector("footer").hidden = hidden;
    footerBtn.setAttribute("aria-pressed", String(hidden));
  }
  applyFooter(getFooterHidden());
  gear.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    gear.setAttribute("aria-expanded", String(open));
  });
  footerBtn.addEventListener("click", () => {
    const hidden = footerBtn.getAttribute("aria-pressed") !== "true";
    saveFooterHidden(hidden);
    applyFooter(hidden);
  });  $("theme-toggle").addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    saveTheme(theme);
    applyTheme(theme);
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