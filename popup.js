// Kaltas - popup logic.
// Everything runs locally: we read the active tab's hostname (allowed by activeTab
// once the user clicks the icon) and compare it with the offers list.

const $ = (id) => document.getElementById(id);

function matchesHost(offer, host) {
  return (offer.domains || []).some((d) => host === d || host.endsWith("." + d));
}

function getTheme() {
  try {
    const saved = localStorage.getItem("iskolar-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "light";
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

// Pinned deals: the star on a Browse row or on the deal card saves the offer's name on this device
// only (localStorage key iskolar-pins, a JSON array of names). Names that are no longer in
// offers.json are ignored.
const ICON_STAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

function getPins() {
  try {
    const raw = JSON.parse(localStorage.getItem("iskolar-pins") || "[]");
    if (Array.isArray(raw)) return new Set(raw.filter((n) => typeof n === "string"));
  } catch {}
  return new Set();
}

function savePins(set) {
  try {
    if (set.size) localStorage.setItem("iskolar-pins", JSON.stringify([...set]));
    else localStorage.removeItem("iskolar-pins");
  } catch {}
}

const pins = getPins();

function isPinned(name) {
  return pins.has(name);
}

function setPinned(name, on, fromList) {
  if (on) pins.add(name);
  else pins.delete(name);
  savePins(pins);
  document.dispatchEvent(new CustomEvent("kaltas-pins", { detail: { name, fromList } }));
}

function syncPinButton(b) {
  const on = isPinned(b.dataset.name);
  const label = on ? "Remove from saved" : "Save this deal";
  b.setAttribute("aria-pressed", String(on));
  b.setAttribute("aria-label", label + ": " + b.dataset.name);
  b.title = label;
}

function syncPinButtons() {
  document.querySelectorAll(".pin-btn").forEach(syncPinButton);
}

function makePinButton(name) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "pin-btn";
  b.dataset.name = name;
  b.innerHTML = ICON_STAR;
  syncPinButton(b);
  b.addEventListener("click", () => setPinned(name, !isPinned(name), !!b.closest("#all")));
  return b;
}
const SVG_OPEN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ICON_MOON = SVG_OPEN + '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICON_SUN = SVG_OPEN + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICON_EYE_OFF = SVG_OPEN + '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3.2 3.7M6.6 6.6A15 15 0 0 0 3 12s4 6 9 6a9 9 0 0 0 3.4-.7"/></svg>';

function setThemeLabel(button, dark) {
  const label = button.querySelector(".theme-label");
  label.innerHTML = '<span class="label-icon" aria-hidden="true">' + (dark ? ICON_MOON : ICON_SUN) + "</span>" + (dark ? "Dark mode" : "Light mode");
}

function decorateIcons() {
  const fl = document.querySelector("#footer-toggle .theme-label");
  if (fl && !fl.querySelector(".label-icon")) {
    fl.insertAdjacentHTML("afterbegin", '<span class="label-icon" aria-hidden="true">' + ICON_EYE_OFF + "</span>");
  }
}

// A theme change recolors every element at once, but only some elements fade their colors,
// so those lag behind the rest. Pause color fades for two frames so everything changes
// together. The switch knob keeps sliding (see .theme-switching at the end of popup.css).
let themeFreezeToken = 0;
function freezeThemeTransitions() {
  const root = document.documentElement;
  const token = ++themeFreezeToken;
  root.classList.add("theme-switching");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (token === themeFreezeToken) root.classList.remove("theme-switching");
    })
  );
}

function applyTheme(theme) {
  decorateIcons();
  freezeThemeTransitions();
  document.documentElement.dataset.theme = theme;
  const button = $("theme-toggle");
  const dark = theme === "dark";
  button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  button.setAttribute("aria-pressed", String(dark));
  button.title = dark ? "Switch to light mode" : "Switch to dark mode";
  setThemeLabel(button, dark);
}

// Offers past their optional "expires" date (YYYY-MM-DD) are hidden.
function isExpired(offer) {
  return typeof offer.expires === "string" && new Date() > new Date(offer.expires + "T23:59:59");
}

function isInfo(offer) {
  return offer.type === "info";
}

function makeDetails(offer) {
  const rows = [
    ["About", offer.details],
    ["Who qualifies", offer.requirements],
    ["Good to know", offer.caveats],
  ].filter(([, text]) => typeof text === "string" && text);
  if (!rows.length) return null;

  const box = document.createElement("details");
  const sum = document.createElement("summary");
  sum.textContent = "Details";
  box.append(sum);
  // The rows sit in a scroll box. When the open details would push the popup past 600px, fitDetails caps the box.
  const scroll = document.createElement("div");
  scroll.className = "detail-scroll";
  rows.forEach(([label, text]) => {
    const p = document.createElement("p");
    const b = document.createElement("strong");
    b.textContent = label + ": ";
    p.append(b, text);
    scroll.append(p);
  });
  box.append(scroll);
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

  const p = document.createElement("p");
  p.textContent = offer.perk;

  const fig = isInfo(offer) ? null : (offer.perk || "").match(/(?:up to\s+)?\d{1,3}\s?%\s*off/i);
  if (fig) {
    const f = document.createElement("div");
    f.className = "perk-figure";
    f.textContent = fig[0].charAt(0).toUpperCase() + fig[0].slice(1);
    card.append(tag, h2, f, p);
  } else {
    card.append(tag, h2, p);
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
    report.href = "https://github.com/miconvr/kaltas/issues/new";
    report.target = "_blank";
    report.rel = "noopener noreferrer";
    report.textContent = "Report an outdated offer";
    card.append(report);
  }
  if (!isInfo(offer)) card.prepend(makePinButton(offer.name));
  return card;
}

function categoryIcon(category) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = {
    "Dev Tools": ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
    "Cloud": ["M6.5 19a4.5 4.5 0 0 1-.4-8.98 6 6 0 0 1 11.7.98A4 4 0 0 1 17.5 19Z"],
    "Design": ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"],
    "AI Tools": ["M12 5l1.9 5.1L19 12l-5.1 1.9L12 19l-1.9-5.1L5 12l5.1-1.9Z"],
    "Productivity": ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
    "Writing": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"],
    "Learning": ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
    "Laptops": ["M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"],
    "Phones & Tablets": ["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M12 18h.01"],
    "Hardware": ["M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M8 21h8", "M12 17v4"],
    "Entertainment": ["M9 18V5l12-2v13", "M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z", "M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
    "Shopping": ["M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
    "Transport": ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z", "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
    "Travel": ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
    "Info": ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 16v-4", "M12 8h.01"]
  };
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.style.verticalAlign = "-2px";
  svg.style.marginRight = "2px";
  (ICONS[Object.keys(ICONS).find((k) => k.toLowerCase() === String(category || "").toLowerCase())] || ICONS["Info"]).forEach((d) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  });
  return svg;
}
const CATEGORY_ORDER = ["Dev Tools", "Cloud", "Design", "AI Tools", "Productivity", "Writing", "Learning", "Laptops", "Phones & Tablets", "Hardware", "Entertainment", "Shopping", "Transport", "Travel"];
function categoryRank(category) {
  const i = CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === String(category || "").toLowerCase());
  return i === -1 ? CATEGORY_ORDER.length : i;
}

// current: the offers that match the site the user is on. Their rows get the "You are here" dot.
function renderList(offers, query = "", current = []) {
  const ul = $("all");
  ul.replaceChildren();
  const q = query.trim().toLowerCase();
  offers
    .filter((o) => !q || ((o.name || "") + " " + (o.category || "") + " " + (o.perk || "")).toLowerCase().includes(q))
    .sort((a, b) => (isPinned(b.name) - isPinned(a.name)) || categoryRank(a.category) - categoryRank(b.category))
    .forEach((o, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--i", Math.min(i, 7)); // row entrance order (see popup.css)
      const name = document.createElement("span");
      name.className = "offer-name";
      name.textContent = o.name;
      const small = document.createElement("small");
      small.replaceChildren(categoryIcon(o.category), " " + (o.category || ""));
      const here = current.includes(o);
      if (here) {
        // Decorative and out of flow (see .here-dot in popup.css): it never affects the row's layout.
        const dot = document.createElement("span");
        dot.className = "here-dot";
        dot.setAttribute("aria-hidden", "true");
        small.append(dot);
        li.classList.add("is-current");
      }
      const href = o.url ? safeUrl(o.url) : "#";
      if (href === "#") {
        // No usable https link: show the name as plain text instead of a dead link.
        const row = document.createElement("div");
        row.className = "row-static";
        row.append(name, small);
        li.append(row);
      } else {
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        if (here) a.setAttribute("aria-current", "true");
        a.append(name, small);
        li.append(a);
      }
      if (isPinned(o.name)) li.classList.add("is-pinned");
      li.append(makePinButton(o.name));
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

// While a deal card's details are open, popup.css hides the Browse row and the footer (html.card-details-open).
// On close they stay hidden until the card has finished collapsing, so the popup never grows past 600px
// mid-animation (that made the scrollbar flash).
let detailsCloseTimer = 0;
let detailsFitTimer = 0;

// Cap the details scroll box so the popup stays within 600px. Measured only after the open animation has
// finished, because the footer and Browse row are still collapsing before that.
function fitDetails(d) {
  const wrap = d.querySelector(".detail-scroll");
  if (!wrap || !d.open) return;
  wrap.style.maxHeight = "";
  const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const over = total - 600;
  if (over > 0) wrap.style.maxHeight = Math.max(60, wrap.offsetHeight - over - 1) + "px";
}

document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.closest("#matches .card")) return;
  clearTimeout(detailsCloseTimer);
  clearTimeout(detailsFitTimer);
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue("--dur-slow").trim();
  const ms = raw.endsWith("ms") ? parseFloat(raw) : raw.endsWith("s") ? parseFloat(raw) * 1000 : 300;
  if (d.open) {
    root.classList.add("card-details-open");
    const wrap = d.querySelector(".detail-scroll");
    if (wrap) wrap.style.maxHeight = "";
    detailsFitTimer = setTimeout(() => fitDetails(d), (ms || 300) + 100);
    return;
  }
  detailsCloseTimer = setTimeout(() => root.classList.remove("card-details-open"), (ms || 300) + 80);
}, true);

async function init() {
  let theme = getTheme();
  applyTheme(theme);

  const panel = $("settings-panel");
  const gear = $("settings-btn");
  const footerBtn = $("footer-toggle");
  function applyFooter(hidden) {
    document.querySelector("footer").hidden = hidden;
    footerBtn.setAttribute("aria-pressed", String(hidden));
    footerBtn.title = hidden ? "Show footer" : "Hide footer";
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
  });
  $("theme-toggle").addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    saveTheme(theme);
    applyTheme(theme);
  });

  let offers = [];
  try {
    offers = await loadOffers();
  } catch (e) {
    $("matches").textContent = "Couldn't load offers.";
    return;
  }

  const host = await getHost();
  $("site").textContent = host ? "You're on " + host : "Open a website to check it";

  let query = "";
  let lastMatchesKey = "";
  function render() {
    const visible = offers.filter((o) => !isExpired(o));
    const sites = visible.filter((o) => !isInfo(o));
    $("browse").querySelector(".summary-count").textContent = sites.length + " available";

    const box = $("matches");
    const hits = host ? sites.filter((o) => matchesHost(o, host)) : [];
    const key = host + "|" + hits.map((o) => o.name).join(",");
    const unchanged = key === lastMatchesKey;
    lastMatchesKey = key;
    if (!unchanged) box.replaceChildren();
    if (unchanged) {
      // matches box already correct, leave it alone
    } else if (hits.length) {
      const heading = document.createElement("p");
      heading.className = "match-label match-label-found";
      heading.textContent = hits.length === 1 ? "1 student deal found" : hits.length + " student deals found";
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

    renderList(sites, query, hits);
  }

  $("browse").querySelector("summary").addEventListener("click", function () {
    saveBrowseClosed($("browse").open);
  });
  // While searching, rows appear without the open animation; opening or closing Browse resets it.
  $("search").addEventListener("input", (e) => {
    query = e.target.value;
    $("all").classList.add("is-filtering");
    render();
  });
  $("browse").addEventListener("toggle", () => $("all").classList.remove("is-filtering"));

  // Pinning or unpinning from anywhere: sync every star, then re-sort the list.
  // is-filtering keeps the row fade from replaying (same as while searching).
  document.addEventListener("kaltas-pins", (e) => {
    syncPinButtons();
    $("all").classList.add("is-filtering");
    render();
    if (e.detail && e.detail.fromList) {
      // The row was rebuilt, so put keyboard focus back on the star of the same offer.
      const next = [...document.querySelectorAll("#all .pin-btn")].find((b) => b.dataset.name === e.detail.name);
      if (next) next.focus();
    }
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

/* 1.1.8: deal found -> browse starts closed */
(function () {
  const browse = document.getElementById("browse");
  const matches = document.getElementById("matches");
  let done = false;
  function closeOnce() {
    if (!done && matches.querySelector(".card")) { done = true; browse.open = false; }
  }
  new MutationObserver(closeOnce).observe(matches, { childList: true });
  closeOnce();
})();
