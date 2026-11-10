// Kaltas - loads the offers list.
// Order: GitHub (raw offers.json, short timeout) -> last good copy saved by the popup ->
// bundled offers.json. The remote file is data only, never code. Anything unreachable or
// malformed falls back quietly, so the popup always has a list to show.

const OFFERS_REMOTE_URL = "https://raw.githubusercontent.com/miconvr/kaltas/main/offers.json";
const OFFERS_REMOTE_TIMEOUT_MS = 3000;
const OFFERS_REMOTE_MAX_CHARS = 500000;
const OFFERS_CACHE_KEY = "iskolar-offers-cache";
const OFFERS_REGIONS = ["PH", "other", "global"];
const OFFERS_DOMAIN_RE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/;

function offersList(data) {
  return Array.isArray(data) ? data : data && data.offers;
}

// Light check, used for the bundled file.
function isValidOffers(data) {
  const list = offersList(data);
  return Array.isArray(list) && list.length > 0;
}

// Per-offer check for remote data. It covers the fields popup.js and background.js rely on,
// mirroring scripts/validate-offers.js. Name and domain duplicates are left to CI.
function isValidOffer(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  for (const k of ["name", "category", "perk"]) {
    if (typeof o[k] !== "string" || !o[k]) return false;
  }
  if (!Array.isArray(o.domains)) return false;
  const domainsOk = o.domains.every(
    (d) => typeof d === "string" && OFFERS_DOMAIN_RE.test(d) && !d.startsWith("www.")
  );
  if (!domainsOk) return false;
  if (o.type === "info") {
    if (o.domains.length || o.url) return false;
    if (!Array.isArray(o.regions) || !o.regions.length) return false;
  } else {
    if (!o.domains.length) return false;
    if (typeof o.url !== "string" || !o.url.startsWith("https://")) return false;
  }
  if (o.regions !== undefined) {
    if (!Array.isArray(o.regions) || !o.regions.every((r) => OFFERS_REGIONS.includes(r))) return false;
  }
  if (o.verified !== undefined && !/^\d{4}-\d{2}$/.test(o.verified)) return false;
  if (o.expires !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(o.expires)) return false;
  for (const k of ["details", "requirements", "caveats"]) {
    if (o[k] !== undefined && typeof o[k] !== "string") return false;
  }
  return true;
}

function isValidRemoteOffers(data) {
  const list = offersList(data);
  return Array.isArray(list) && list.length > 0 && list.length <= 1000 && list.every(isValidOffer);
}

// The service worker has no localStorage, so only the popup keeps a saved copy.
// A copy saved by an older extension version is ignored, because the bundled file may be newer.
function writeOffersCache(list) {
  try {
    if (typeof localStorage === "undefined") return;
    const saved = { v: chrome.runtime.getManifest().version, offers: list };
    localStorage.setItem(OFFERS_CACHE_KEY, JSON.stringify(saved));
  } catch {}
}

function readOffersCache() {
  try {
    if (typeof localStorage === "undefined") return null;
    const saved = JSON.parse(localStorage.getItem(OFFERS_CACHE_KEY) || "null");
    if (saved && saved.v === chrome.runtime.getManifest().version && isValidRemoteOffers(saved.offers)) {
      return saved.offers;
    }
  } catch {}
  return null;
}

async function loadRemoteOffers() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFFERS_REMOTE_TIMEOUT_MS);
  try {
    const res = await fetch(OFFERS_REMOTE_URL, { cache: "no-cache", credentials: "omit", signal: controller.signal });
    if (!res.ok) throw new Error("Remote offers returned " + res.status);
    const text = await res.text();
    if (text.length > OFFERS_REMOTE_MAX_CHARS) throw new Error("Remote offers file is too large");
    const data = JSON.parse(text);
    if (!isValidRemoteOffers(data)) throw new Error("Remote offers failed validation");
    const list = offersList(data);
    writeOffersCache(list);
    return list;
  } finally {
    clearTimeout(timer);
  }
}

async function loadBundledOffers() {
  const res = await fetch(chrome.runtime.getURL("offers.json"));
  if (!res.ok) throw new Error("Bundled offers could not be loaded");
  const data = await res.json();
  if (!isValidOffers(data)) throw new Error("Bundled offers have an invalid format");
  return offersList(data);
}

async function loadOffers() {
  try {
    return await loadRemoteOffers();
  } catch (e) {
    console.warn("Kaltas: using saved or bundled offers (" + (e && e.message ? e.message : e) + ")");
  }
  return readOffersCache() || loadBundledOffers();
}