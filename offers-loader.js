function isValidOffers(data) {
  const list = Array.isArray(data) ? data : data && data.offers;
  return Array.isArray(list) && list.length > 0;
}

async function loadOffers() {
  const res = await fetch(chrome.runtime.getURL("offers.json"));
  if (!res.ok) throw new Error("Bundled offers could not be loaded");
  const data = await res.json();
  if (!isValidOffers(data)) throw new Error("Bundled offers have an invalid format");
  return Array.isArray(data) ? data : data.offers;
}
