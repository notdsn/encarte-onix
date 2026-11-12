const CACHE = "vitrine-v2.3.1";
const ASSETS = ["./", "index.html", "privacidade.html", "css/styles.css", "fonts/fonts.css",
  "fonts/nunito-latin.woff2", "fonts/nunito-latin-ext.woff2", "fonts/oswald-latin.woff2", "fonts/oswald-latin-ext.woff2", "fonts/jakarta-latin.woff2", "fonts/jakarta-latin-ext.woff2",
  "js/app.js", "js/icons.js", "js/stickers.js", "js/stickers3d.js", "js/segments.js", "js/enhance.js", "js/html-to-image.min.js", "js/sortable.min.js", "manifest.webmanifest",
  "stickers/3d/motoboy.webp", "stickers/3d/farmaceutico.webp", "stickers/3d/carrinho.webp", "stickers/3d/sacola.webp",
  "stickers/3d/presente.webp", "stickers/3d/megafone.webp", "stickers/3d/mascote.webp", "stickers/3d/fogo.webp",
  "stickers/3d/relogio.webp", "stickers/3d/etiqueta.webp", "stickers/3d/coracao.webp", "stickers/3d/local.webp",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/favicon.png", "icons/icon-180.png",
  "bg/farmacia-t.webp", "bg/mercado-t.webp", "bg/acougue-t.webp", "bg/hortifruti-t.webp", "bg/padaria-t.webp", "bg/roupas-t.webp", "bg/pet-t.webp", "bg/construcao-t.webp", "bg/beleza-t.webp", "bg/outro-t.webp"];
// Fotos de fundo em tamanho cheio entram no cache na primeira vez que aparecem (não pesa a instalação).
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
