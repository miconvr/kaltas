const OFFERS_URL = "https://raw.githubusercontent.com/miconvr/iskolar/main/offers.json";
const CACHE_KEY = "iskolar.offers.v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

function isValidOffers(data) {
  const list = Array.isArray(data) ? data : data && data.offers;
  return Array.isArray(list) && list.length > 0;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidOffers(parsed.data) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
  } catch {}
}

async function refreshOffers() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OFFERS_URL, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!isValidOffers(data)) throw new Error("Bad offers format");
    writeCache(data);
  } catch (err) {
    console.warn("Iskolar: offers refresh failed, using existing data.", err);
  } finally {
    clearTimeout(timer);
  }
}

async function loadOffers() {
  const cached = readCache();
  const stale = !cached || Date.now() - cached.time > MAX_AGE_MS;
  if (stale) refreshOffers();
  if (cached) return cached.data;
  const res = await fetch(chrome.runtime.getURL("offers.json"));
  return res.json();
}
