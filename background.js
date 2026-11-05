// Kaltas - toolbar badge.
// Puts a green dot on the toolbar icon when the current site has a student offer.
//
// This uses declarativeContent, so Chrome itself matches the page URL against the rules
// below. The extension never reads your tabs or browsing history and needs no host
// permissions. Rules are rebuilt from the bundled offers.json on install and update.
// The badge ignores the region picker (the popup's setting is not visible here), so it can
// show on a site whose only offer is for another region. The popup still filters by region.

const DOT_COLOR = "#16a34a";
const ICON_SIZES = [16, 32, 48];

async function loadOffers() {
  const res = await fetch(chrome.runtime.getURL("offers.json"));
  if (!res.ok) throw new Error("Bundled offers could not be loaded");
  const data = await res.json();
  return Array.isArray(data) ? data : data.offers || [];
}

// The normal icon with a plain green dot in the top-right corner.
async function makeBadgedIcon() {
  const res = await fetch(chrome.runtime.getURL("icons/icon128.png"));
  const bitmap = await createImageBitmap(await res.blob());
  const imageData = {};
  for (const size of ICON_SIZES) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, size, size);
    const radius = size * 0.2;
    const cx = size - radius;
    const cy = radius;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = DOT_COLOR;
    ctx.fill();
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  return imageData;
}

// Matches the domain itself and any subdomain, the same way popup.js does.
function conditionsFor(domain) {
  const schemes = ["https", "http"];
  return [
    new chrome.declarativeContent.PageStateMatcher({ pageUrl: { hostEquals: domain, schemes } }),
    new chrome.declarativeContent.PageStateMatcher({ pageUrl: { hostSuffix: "." + domain, schemes } }),
  ];
}

async function registerRules() {
  const offers = (await loadOffers()).filter((o) => !(typeof o.expires === "string" && new Date() > new Date(o.expires + "T23:59:59")));
  const domains = new Set();
  offers.forEach((o) => {
    if (o.type === "info") return;
    (o.domains || []).forEach((d) => d && domains.add(d));
  });
  if (!domains.size) return;

  const imageData = await makeBadgedIcon();
  const conditions = [...domains].flatMap(conditionsFor);
  await chrome.declarativeContent.onPageChanged.removeRules();
  await chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions,
      actions: [new chrome.declarativeContent.SetIcon({ imageData })],
    },
  ]);
}

chrome.runtime.onInstalled.addListener(() => {
  registerRules().catch((e) => console.error("Kaltas: could not register badge rules", e));
});
