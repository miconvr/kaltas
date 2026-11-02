// Iskolar - popup logic.
// Everything runs locally: we read the active tab's hostname (allowed by activeTab
// once the user clicks the icon) and compare it with the bundled offers.json.

const $ = (id) => document.getElementById(id);

function matchesHost(offer, host) {
  return offer.domains.some((d) => host === d || host.endsWith("." + d));
}

function makeCard(offer) {
  const card = document.createElement("div");
  card.className = "card";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = offer.category;

  const h2 = document.createElement("h2");
  h2.textContent = offer.name;

  const p = document.createElement("p");
  p.textContent = offer.perk;

  const a = document.createElement("a");
  a.className = "btn";
  a.href = offer.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "View offer";

  card.append(tag, h2, p, a);
  return card;
}

function renderList(offers, query = "") {
  const ul = $("all");
  ul.replaceChildren();
  const q = query.trim().toLowerCase();
  offers
    .filter((o) => !q || (o.name + " " + o.category + " " + o.perk).toLowerCase().includes(q))
    .forEach((o) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = o.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = o.name + " ";
      const small = document.createElement("small");
      small.textContent = "· " + o.category;
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
    offers = await (await fetch("offers.json")).json();
  } catch (e) {
    $("matches").textContent = "Couldn't load offers.";
    return;
  }

  const host = await getHost();
  $("site").textContent = host ? "On " + host : "Open a website to check it";

  const hits = host ? offers.filter((o) => matchesHost(o, host)) : [];
  const box = $("matches");
  if (hits.length) {
    hits.forEach((o) => box.append(makeCard(o)));
  } else if (host) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No student offer on file for this site yet.";
    box.append(p);
    $("browse").open = true;
  }

  renderList(offers);
  $("search").addEventListener("input", (e) => renderList(offers, e.target.value));
}

init();
