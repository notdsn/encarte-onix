(function () {
  "use strict";

  const DB_NAME = "vitrine-ofertas";
  const LEGACY_KEY = "encarte-onix-v1";
  const LS_KEY = "vitrine-ofertas-v2";
  const MAX_PRODUCTS = 12;
  const DEFAULT_DISCLAIMER =
    "Imagens ilustrativas. Ofertas válidas enquanto durarem os estoques. Consulte o farmacêutico. Medicamentos podem causar efeitos adversos: leia a bula e, quando exigido, apresente a receita.";
  const GENERIC_DISCLAIMER = "Imagens ilustrativas. Ofertas válidas enquanto durarem os estoques ou no período indicado.";

  const PRESETS = {
    onix: { label: "Drogarias Ônix", name: "Drogarias Ônix", slogan: "Cuidar de você é com a gente", c1: "#D61E26", c2: "#1C3FAA", c3: "#FFD600", mark: "cruz", disclaimer: DEFAULT_DISCLAIMER },
    farmacia: { label: "Farmácia (genérico)", name: "Minha Farmácia", slogan: "Saúde com preço justo", c1: "#0E8A6A", c2: "#2A7DE1", c3: "#FFCF3A", mark: "cruz", disclaimer: DEFAULT_DISCLAIMER },
    mercado: { label: "Mercado / loja", name: "Minha Loja", slogan: "Economia todo dia", c1: "#E4572E", c2: "#17324D", c3: "#FFC914", mark: "inicial", disclaimer: GENERIC_DISCLAIMER },
    beleza: { label: "Perfumaria / beleza", name: "Minha Perfumaria", slogan: "Beleza que cabe no bolso", c1: "#D63384", c2: "#7B2D8B", c3: "#FFD6EA", mark: "inicial", disclaimer: GENERIC_DISCLAIMER },
  };

  const THEMES = [
    { id: "classico", label: "Clássico", sw: ["var(--c1)", "#f3f4f8", "#102054"] },
    { id: "relampago", label: "Relâmpago", sw: ["var(--c1)", "var(--c1)", "var(--c3)"] },
    { id: "clean", label: "Clean", sw: ["#fff", "#f6f7fb", "#f0f2f8"] },
    { id: "noite", label: "Noite", sw: ["#0b1638", "#15244f", "#070f28"] },
    { id: "saude", label: "Saúde (verde)", sw: ["#0e8a6a", "#eaf7f2", "#0b3b30"] },
    { id: "beleza", label: "Beleza (rosa)", sw: ["#d63384", "#fdf0f6", "#4a1d4f"] },
    { id: "black", label: "Black Friday", sw: ["#0d0d0d", "#1c1c1c", "#f5c400"] },
    { id: "natal", label: "Natal", sw: ["#b3121f", "#fbf6ee", "#116b3a"] },
  ];

  const TITLE_SUGGESTIONS = ["Ofertas da Semana", "Ofertas do Mês", "Só Hoje!", "Black Friday", "Dia das Mães", "Saldão", "Ofertas de Natal"];
  const BADGES = ["Oferta", "Novidade", "Mais vendido", "Leve 2 pague 1", "Leve 3 pague 2", "Limite por cliente"];
  const FORMAT_SIZE = { story: { w: 1080, h: 1920 }, feed: { w: 1080, h: 1080 }, a4: { w: 1240, h: 1754 } };

  const $ = (id) => document.getElementById(id);
  const el = {
    flyer: $("flyer"), scale: $("flyer-scale"), frame: $("preview-frame"),
    title: $("fld-title"), from: $("fld-from"), to: $("fld-to"),
    preset: $("fld-preset"), store: $("fld-store"), slogan: $("fld-slogan"),
    c1: $("fld-c1"), c2: $("fld-c2"), c3: $("fld-c3"), mark: $("fld-mark"),
    address: $("fld-address"), whatsapp: $("fld-whatsapp"), instagram: $("fld-instagram"),
    logo: $("fld-logo"), logoPreview: $("logo-preview"), logoClear: $("btn-logo-clear"),
    logoOnly: $("fld-logo-only"), logoOnlyWrap: $("logo-only-wrap"),
    disclaimer: $("fld-disclaimer"), list: $("product-list"), empty: $("empty-products"),
    count: $("product-count"), add: $("btn-add"),
    toast: $("toast"), toastText: $("toast-text"), toastUndo: $("toast-undo"),
    fs: $("fs-overlay"), fsInner: $("fs-inner"), curName: $("current-flyer-name"),
  };

  // ---------- utils ----------
  const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  function addDaysISO(iso, days) { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + days); return dt.toISOString().slice(0, 10); }
  function formatDateBR(iso) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return y && m && d ? `${d}/${m}/${y}` : ""; }
  const uid = (p = "p") => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function parseBRL(str) {
    if (str == null || str === "") return null;
    let s = String(str).trim().replace(/[R$\s]/gi, "");
    if (!s) return null;
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  const formatBRL = (n) => (n == null || !Number.isFinite(Number(n)) ? "" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  const formatInputPrice = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function discountPct(a, b) { if (a == null || b == null) return null; a = Number(a); b = Number(b); if (!(a > 0) || !(b >= 0) || b >= a) return null; const p = Math.round((1 - b / a) * 100); return p > 0 ? p : null; }
  const densityFor = (n) => (n <= 1 ? "hero" : n <= 4 ? "comfortable" : n <= 8 ? "dense" : "compact");
  function colsFor(format, n) {
    if (n <= 1) return 1;
    if (format === "feed" || format === "a4") return n <= 4 ? 2 : n <= 9 ? 3 : 4;
    if (n === 2) return 1;
    return n <= 6 ? 2 : 3;
  }
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeColor = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : d);

  // ---------- storage (IndexedDB with localStorage fallback) ----------
  function idbOpen() {
    return new Promise((res, rej) => {
      if (!("indexedDB" in window)) return rej(new Error("sem idb"));
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  let dbp = null;
  const db = () => (dbp = dbp || idbOpen());
  async function storeGet() {
    try {
      const d = await db();
      return await new Promise((res, rej) => { const t = d.transaction("kv").objectStore("kv").get("state"); t.onsuccess = () => res(t.result || null); t.onerror = () => rej(t.error); });
    } catch { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; } }
  }
  async function storeSet(v) {
    try {
      const d = await db();
      await new Promise((res, rej) => { const tx = d.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, "state"); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    } catch { localStorage.setItem(LS_KEY, JSON.stringify(v)); }
  }

  // ---------- model ----------
  function brandFromPreset(key, keep) {
    const p = PRESETS[key] || PRESETS.onix;
    return { preset: key, name: p.name, slogan: p.slogan, c1: p.c1, c2: p.c2, c3: p.c3, mark: p.mark, logo: "", logoOnly: false,
      address: keep?.address || "", whatsapp: keep?.whatsapp || "", instagram: keep?.instagram || "" };
  }
  function sampleProducts() {
    const mk = (name, details, o, n, badge = "") => ({ id: uid(), name, details, oldPrice: o, newPrice: n, photo: "", badge });
    return [
      mk("Vitamina C 1g", "caixa com 30 comprimidos", 24.9, 16.9),
      mk("Protetor Solar FPS 60", "frasco 120 ml", 79.9, 54.9, "Oferta"),
      mk("Fralda geriátrica G", "pacote com 30 unidades", 69.9, 49.9, "Leve 3 pague 2"),
      mk("Shampoo antiqueda", "frasco 300 ml", 39.9, 27.9),
    ];
  }
  function newFlyer(name, withSample) {
    const from = todayISO();
    return { id: uid("f"), name: name || "Encarte " + formatDateBR(from), updatedAt: Date.now(), theme: "classico", format: "story",
      title: "Ofertas da Semana", dateFrom: from, dateTo: addDaysISO(from, 6), disclaimer: null, products: withSample ? sampleProducts() : [] };
  }
  function normProduct(p) {
    return { id: p.id || uid(), name: p.name || "", details: p.details || "", oldPrice: p.oldPrice == null || p.oldPrice === "" ? null : Number(p.oldPrice),
      newPrice: p.newPrice == null || p.newPrice === "" ? null : Number(p.newPrice), photo: p.photo || "", badge: p.badge || "" };
  }
  function normalize(s) {
    const st = s && typeof s === "object" ? s : {};
    st.version = 2;
    st.brand = { ...brandFromPreset("onix"), ...(st.brand || {}) };
    if (!Array.isArray(st.flyers) || !st.flyers.length) st.flyers = [newFlyer("Meu primeiro encarte", true)];
    st.flyers = st.flyers.map((f) => ({ ...newFlyer(), ...f, products: (f.products || []).slice(0, MAX_PRODUCTS).map(normProduct) }));
    if (!st.flyers.some((f) => f.id === st.currentId)) st.currentId = st.flyers[0].id;
    st.onboarded = !!st.onboarded;
    return st;
  }
  function migrateLegacy() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      const brand = brandFromPreset("onix", o);
      if (o.logo) { brand.logo = o.logo; brand.logoOnly = !!o.logoOnly; }
      const f = newFlyer("Encarte Ônix");
      Object.assign(f, { theme: ["classico", "relampago", "clean", "noite"].includes(o.theme) ? o.theme : "classico", format: o.format || "story",
        title: o.title || f.title, dateFrom: o.dateFrom || f.dateFrom, dateTo: o.dateTo || f.dateTo, disclaimer: o.disclaimer || null, products: o.products || [] });
      return { brand, flyers: [f], currentId: f.id, onboarded: true };
    } catch { return null; }
  }

  let state;
  const cur = () => state.flyers.find((f) => f.id === state.currentId);
  let saveTimer = 0;
  function persist() {
    const f = cur(); if (f) f.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => storeSet(state).catch(() => toast("Não deu para salvar: o armazenamento do aparelho está cheio. Remova fotos ou exporte o backup.", { error: true })), 250);
  }

  // ---------- toast with undo ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, opts = {}) {
    el.toast.hidden = false;
    el.toast.classList.toggle("error", !!opts.error);
    el.toastText.textContent = msg;
    undoFn = opts.undo || null;
    el.toastUndo.hidden = !undoFn;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; undoFn = null; }, opts.undo ? 7000 : 3200);
  }
  el.toastUndo.addEventListener("click", () => { const f = undoFn; undoFn = null; el.toast.hidden = true; if (f) f(); });

  // ---------- images ----------
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Não foi possível ler a imagem.")); i.src = src; }); }
  function fileToDataURL(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
  async function shrinkLogo(file) {
    if (!file || !file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
    const img = await loadImg(await fileToDataURL(file));
    const s = Math.min(1, 600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  }

  // ---------- photo crop dialog ----------
  const crop = { img: null, zoom: 1, x: 0, y: 0, pid: null };
  const cv = $("crop-canvas"), cx = cv.getContext("2d");
  function drawCrop(target, size) {
    const ctx = target ? target.getContext("2d") : cx; const S = size || cv.width;
    ctx.clearRect(0, 0, S, S);
    if ($("crop-white").checked) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, S, S); }
    if (!crop.img) return;
    const k = S / cv.width;
    const w = crop.img.width * crop.zoom * k, h = crop.img.height * crop.zoom * k;
    ctx.drawImage(crop.img, S / 2 - w / 2 + crop.x * k, S / 2 - h / 2 + crop.y * k, w, h);
    if ($("crop-clean").checked) {
      const d = ctx.getImageData(0, 0, S, S), a = d.data;
      for (let i = 0; i < a.length; i += 4) { const m = Math.min(a[i], a[i + 1], a[i + 2]); if (m > 225 && a[i + 3] > 0) { a[i] = a[i + 1] = a[i + 2] = 255; } }
      ctx.putImageData(d, 0, 0);
    }
  }
  function fitCrop() { if (!crop.img) return; crop.zoom = Math.min(cv.width / crop.img.width, cv.height / crop.img.height) * 0.92; crop.x = crop.y = 0; $("crop-zoom").value = crop.zoom; drawCrop(); }
  async function openCrop(pid, file) {
    try {
      crop.img = await loadImg(file ? await fileToDataURL(file) : productById(pid).photo);
      crop.pid = pid;
      const zr = $("crop-zoom"); const base = Math.min(cv.width / crop.img.width, cv.height / crop.img.height);
      zr.min = (base * 0.4).toFixed(3); zr.max = (base * 5).toFixed(3); zr.step = (base / 100).toFixed(4);
      fitCrop(); openDialog($("dlg-photo"));
    } catch (e) { toast(e.message || "Não deu para abrir a foto.", { error: true }); }
  }
  (function bindCrop() {
    let drag = null;
    cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ox: crop.x, oy: crop.y }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => { if (!drag) return; const k = cv.width / cv.getBoundingClientRect().width; crop.x = drag.ox + (e.clientX - drag.x) * k; crop.y = drag.oy + (e.clientY - drag.y) * k; drawCrop(); });
    cv.addEventListener("pointerup", () => (drag = null));
    cv.addEventListener("wheel", (e) => { e.preventDefault(); crop.zoom *= e.deltaY < 0 ? 1.06 : 0.94; $("crop-zoom").value = crop.zoom; drawCrop(); }, { passive: false });
    $("crop-zoom").addEventListener("input", (e) => { crop.zoom = Number(e.target.value); drawCrop(); });
    $("crop-white").addEventListener("change", () => drawCrop());
    $("crop-clean").addEventListener("change", () => drawCrop());
    $("crop-fit").addEventListener("click", fitCrop);
    $("crop-apply").addEventListener("click", () => {
      const out = document.createElement("canvas"); out.width = out.height = 800; drawCrop(out, 800);
      const p = productById(crop.pid);
      if (p) { p.photo = $("crop-white").checked ? out.toDataURL("image/jpeg", 0.85) : out.toDataURL("image/png"); persist(); renderProductList(); renderFlyer(); }
      closeDialog($("dlg-photo"));
    });
  })();

  // ---------- dialogs ----------
  function openDialog(d) { if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); }
  function closeDialog(d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); }
  document.querySelectorAll("dialog [data-close]").forEach((b) => b.addEventListener("click", () => closeDialog(b.closest("dialog"))));

  // ---------- form fill ----------
  function fillSelect(sel, value) {
    sel.innerHTML = Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join("") + `<option value="custom">Personalizada</option>`;
    sel.value = value in PRESETS ? value : "custom";
  }
  function renderThemes() {
    const f = cur();
    $("theme-group").innerHTML = THEMES.map((t) => `<label class="theme-swatch"><input type="radio" name="theme" value="${t.id}" ${t.id === f.theme ? "checked" : ""}>
      <span class="sw" style="--c1:${state.brand.c1};--c2:${state.brand.c2};--c3:${state.brand.c3}"><i style="background:${t.sw[0]}"></i><i style="background:${t.sw[1]}"></i><i style="background:${t.sw[2]}"></i></span>${esc(t.label)}</label>`).join("");
    document.querySelectorAll('input[name="theme"]').forEach((i) => i.addEventListener("change", () => { if (i.checked) { cur().theme = i.value; persist(); renderFlyer(); } }));
  }
  function fillForm() {
    const f = cur(), b = state.brand;
    el.title.value = f.title || ""; el.from.value = f.dateFrom || ""; el.to.value = f.dateTo || "";
    el.disclaimer.value = f.disclaimer ?? (PRESETS[b.preset]?.disclaimer || DEFAULT_DISCLAIMER);
    fillSelect(el.preset, b.preset);
    el.store.value = b.name || ""; el.slogan.value = b.slogan || "";
    el.c1.value = safeColor(b.c1, "#D61E26"); el.c2.value = safeColor(b.c2, "#1C3FAA"); el.c3.value = safeColor(b.c3, "#FFD600");
    el.mark.value = b.mark || "cruz"; el.logoOnly.checked = !!b.logoOnly;
    el.address.value = b.address || ""; el.whatsapp.value = b.whatsapp || ""; el.instagram.value = b.instagram || "";
    document.querySelectorAll('input[name="format"]').forEach((i) => (i.checked = i.value === f.format));
    el.curName.textContent = f.name;
    renderThemes(); updateLogoChrome(); renderProductList();
  }
  function logoHTML(b) {
    if (b.logo) return `<div class="fl-logo img"><img src="${b.logo}" alt=""></div>`;
    if (b.mark === "nenhum") return "";
    if (b.mark === "inicial") return `<div class="fl-logo"><span class="ini">${esc((b.name || "?").trim().charAt(0).toUpperCase())}</span></div>`;
    return `<div class="fl-logo"><span class="cross"></span></div>`;
  }
  function updateLogoChrome() {
    const b = state.brand;
    el.logoPreview.style.background = b.logo ? "#fff" : b.c2;
    el.logoPreview.innerHTML = b.logo ? `<img src="${b.logo}" alt="">` : `<div class="flyer" style="width:64px;height:64px;--logo:64px;--c2:${b.c2};background:transparent">${logoHTML(b)}</div>`;
    el.logoClear.hidden = !b.logo; el.logoOnlyWrap.hidden = !b.logo;
  }

  // ---------- product list ----------
  const productById = (id) => cur().products.find((p) => p.id === id);
  function renderProductList() {
    const ps = cur().products;
    el.list.innerHTML = "";
    ps.forEach((p, i) => el.list.appendChild(productCard(p, i)));
    el.count.textContent = `(${ps.length}/${MAX_PRODUCTS})`;
    el.add.disabled = ps.length >= MAX_PRODUCTS;
    el.add.textContent = ps.length >= MAX_PRODUCTS ? "Limite de 12 produtos" : "+ Adicionar produto";
    el.empty.hidden = ps.length > 0;
  }
  function productCard(p, idx) {
    const w = document.createElement("article");
    w.className = "p-card"; w.dataset.id = p.id;
    const off = discountPct(p.oldPrice, p.newPrice);
    w.innerHTML = `
      <div class="p-head-row">
        <button type="button" class="p-handle" aria-label="Arrastar para reordenar o produto ${idx + 1}">⠿</button>
        <span class="p-title">${idx + 1}. ${esc(p.name || "Novo produto")}</span>
        <button type="button" class="p-remove" data-act="remove" aria-label="Remover ${esc(p.name || "produto")}">Remover</button>
      </div>
      <div class="p-top">
        <label class="p-photo ${p.photo ? "has-img" : ""}" aria-label="${p.photo ? "Trocar foto" : "Adicionar foto"} do produto">
          ${p.photo ? `<img src="${p.photo}" alt="">` : "＋ Foto"}
          <input type="file" accept="image/*" data-act="photo">
        </label>
        <div class="p-fields">
          <label class="field">Nome<input type="text" data-act="name" maxlength="60" value="${esc(p.name)}" placeholder="Nome do produto"></label>
          <label class="field">Detalhes<input type="text" data-act="details" maxlength="80" value="${esc(p.details)}" placeholder="ex.: caixa 30 comprimidos"></label>
        </div>
      </div>
      <div class="p-prices">
        <label class="field">De<input type="text" inputmode="decimal" data-act="oldPrice" value="${p.oldPrice == null ? "" : formatInputPrice(p.oldPrice)}" placeholder="0,00"></label>
        <label class="field">Por<input type="text" inputmode="decimal" data-act="newPrice" value="${p.newPrice == null ? "" : formatInputPrice(p.newPrice)}" placeholder="0,00"></label>
        <div class="p-off ${off == null ? "is-empty" : ""}" aria-live="polite">${off == null ? "—" : "-" + off + "%"}</div>
      </div>
      <label class="field">Selo<input type="text" list="badge-list" data-act="badge" maxlength="32" value="${esc(p.badge)}" placeholder="ex.: Leve 3 pague 2"></label>
      <div class="p-actions">
        ${p.photo ? `<button type="button" class="btn-text" data-act="crop">Ajustar foto</button><button type="button" class="btn-text" data-act="nophoto">Tirar foto</button>` : "<span></span>"}
        <button type="button" class="btn-text" data-act="dup">Duplicar</button>
      </div>`;
    w.addEventListener("input", onProductInput);
    w.addEventListener("change", onProductInput);
    w.addEventListener("click", onProductClick);
    w.addEventListener("focusout", onProductBlur);
    return w;
  }
  function onProductInput(ev) {
    const act = ev.target.dataset.act, p = productById(ev.currentTarget.dataset.id);
    if (!p) return;
    if (act === "photo") { if (ev.type === "change" && ev.target.files?.[0]) { const f = ev.target.files[0]; ev.target.value = ""; openCrop(p.id, f); } return; }
    if (act === "name") { p.name = ev.target.value; ev.currentTarget.querySelector(".p-title").textContent = `${cur().products.indexOf(p) + 1}. ${p.name || "Novo produto"}`; }
    else if (act === "details" || act === "badge") p[act] = ev.target.value;
    else if (act === "oldPrice" || act === "newPrice") {
      p[act] = parseBRL(ev.target.value);
      const off = discountPct(p.oldPrice, p.newPrice), b = ev.currentTarget.querySelector(".p-off");
      b.textContent = off == null ? "—" : "-" + off + "%"; b.classList.toggle("is-empty", off == null);
    } else return;
    persist(); renderFlyer();
  }
  function onProductBlur(ev) {
    const act = ev.target.dataset.act;
    if (act !== "oldPrice" && act !== "newPrice") return;
    const p = productById(ev.currentTarget.dataset.id);
    if (p) ev.target.value = p[act] == null ? "" : formatInputPrice(p[act]);
  }
  function onProductClick(ev) {
    const btn = ev.target.closest("button[data-act]"); if (!btn) return;
    const ps = cur().products, i = ps.findIndex((p) => p.id === ev.currentTarget.dataset.id); if (i < 0) return;
    const act = btn.dataset.act;
    if (act === "remove") {
      const [removed] = ps.splice(i, 1); const fid = state.currentId;
      toast(`“${removed.name || "Produto"}” removido.`, { undo: () => { const f = state.flyers.find((x) => x.id === fid); if (f) { f.products.splice(i, 0, removed); persist(); if (fid === state.currentId) { renderProductList(); renderFlyer(); } } } });
    } else if (act === "dup") {
      if (ps.length >= MAX_PRODUCTS) return toast("Limite de 12 produtos.");
      ps.splice(i + 1, 0, { ...clone(ps[i]), id: uid() });
    } else if (act === "nophoto") ps[i].photo = "";
    else if (act === "crop") return openCrop(ps[i].id);
    else return;
    persist(); renderProductList(); renderFlyer();
  }
  function initSortable() {
    if (!window.Sortable) return;
    window.Sortable.create(el.list, {
      handle: ".p-handle", animation: 150, delay: 0, ghostClass: "sortable-ghost", chosenClass: "sortable-chosen",
      onEnd: (e) => { if (e.oldIndex === e.newIndex) return; const ps = cur().products; const [it] = ps.splice(e.oldIndex, 1); ps.splice(e.newIndex, 0, it); persist(); renderProductList(); renderFlyer(); },
    });
  }

  // ---------- flyer render ----------
  function datesLine(f) {
    const a = formatDateBR(f.dateFrom), b = formatDateBR(f.dateTo);
    if (a && b) return `Ofertas válidas de ${a} a ${b}`;
    if (a) return `Ofertas válidas a partir de ${a}`;
    if (b) return `Ofertas válidas até ${b}`;
    return "";
  }
  function contactBits(b) {
    const out = [];
    if (b.address?.trim()) out.push(`<span>📍 ${esc(b.address.trim())}</span>`);
    if (b.whatsapp?.trim()) out.push(`<span>WhatsApp ${esc(b.whatsapp.trim())}</span>`);
    if (b.instagram?.trim()) { let ig = b.instagram.trim(); if (!ig.startsWith("@") && !ig.includes("/")) ig = "@" + ig; out.push(`<span>${esc(ig)}</span>`); }
    return out;
  }
  function flyerHTML(f, b) {
    const n = f.products.length;
    const cards = n ? f.products.map((p) => {
      const off = discountPct(p.oldPrice, p.newPrice);
      const letter = (p.name || "?").trim().charAt(0).toUpperCase() || "?";
      const de = p.oldPrice != null && p.newPrice != null && p.oldPrice > p.newPrice ? `<span class="card-de">de ${formatBRL(p.oldPrice)}</span>` : "";
      const price = p.newPrice ?? p.oldPrice;
      const por = price != null ? `<span class="card-por">${de ? "<small>por</small> " : ""}${formatBRL(price)}</span>` : "";
      return `<article class="card"><div class="card-photo">${p.badge ? `<span class="card-badge">${esc(p.badge)}</span>` : ""}${off != null ? `<span class="card-off">-${off}%</span>` : ""}${p.photo ? `<img src="${p.photo}" alt="">` : `<span class="card-mono">${esc(letter)}</span>`}</div>
        <h2 class="card-name">${esc(p.name || "Produto")}</h2>${p.details ? `<p class="card-det">${esc(p.details)}</p>` : ""}<div class="card-prices">${de}${por}</div></article>`;
    }).join("") : `<div class="fl-empty"><b>Suas ofertas aqui</b><span>Adicione produtos no editor abaixo</span></div>`;
    const hideName = b.logo && b.logoOnly;
    const dates = datesLine(f), contacts = contactBits(b);
    const disc = f.disclaimer ?? (PRESETS[b.preset]?.disclaimer || DEFAULT_DISCLAIMER);
    return `<header class="fl-head"><div class="fl-brand">${logoHTML(b)}${hideName ? "" : `<div><div class="fl-name">${esc(b.name || "Sua loja")}</div>${b.slogan ? `<div class="fl-tag">${esc(b.slogan)}</div>` : ""}</div>`}</div>
      <div class="fl-band"><h1 class="fl-title">${esc(f.title || "Ofertas da Semana")}</h1>${dates ? `<p class="fl-dates">${esc(dates)}</p>` : ""}</div></header>
      <section class="fl-grid">${cards}</section>
      <footer class="fl-foot">${contacts.length ? `<div class="fl-contact">${contacts.join("")}</div>` : ""}${disc ? `<p class="fl-disc">${esc(disc)}</p>` : ""}</footer>`;
  }
  function applyFlyerAttrs(node, f, b) {
    const n = f.products.length, size = FORMAT_SIZE[f.format] || FORMAT_SIZE.story;
    Object.assign(node.dataset, { format: f.format, theme: f.theme, count: String(n), cols: String(colsFor(f.format, n)), density: densityFor(n) });
    node.style.width = size.w + "px"; node.style.height = size.h + "px";
    node.style.setProperty("--c1", safeColor(b.c1, "#D61E26")); node.style.setProperty("--c2", safeColor(b.c2, "#1C3FAA")); node.style.setProperty("--c3", safeColor(b.c3, "#FFD600"));
  }
  function renderFlyer() {
    const f = cur(), b = state.brand;
    applyFlyerAttrs(el.flyer, f, b);
    el.flyer.innerHTML = flyerHTML(f, b);
    document.querySelector('meta[name="theme-color"]').content = "#1C3FAA";
    scalePreview();
  }
  function scalePreview(frame = el.frame, scaleEl = el.scale, flyer = el.flyer) {
    const size = FORMAT_SIZE[flyer.dataset.format] || FORMAT_SIZE.story;
    const s = Math.min(1, (frame.clientWidth || 1) / size.w);
    scaleEl.style.width = size.w + "px"; scaleEl.style.height = size.h + "px"; scaleEl.style.transform = `scale(${s})`;
    frame.style.height = Math.round(size.h * s) + "px";
  }

  // ---------- flyers dialog ----------
  function renderFlyerList() {
    const list = [...state.flyers].sort((a, b) => b.updatedAt - a.updatedAt);
    $("flyer-list").innerHTML = list.map((f) => `<div class="fl-item ${f.id === state.currentId ? "current" : ""}" data-id="${f.id}">
      <div class="info"><strong>${esc(f.name)}</strong><small>${f.products.length} produto(s) · ${new Date(f.updatedAt).toLocaleDateString("pt-BR")}</small></div>
      ${f.id === state.currentId ? "<small>Aberto</small>" : `<button type="button" data-a="open">Abrir</button>`}
      <button type="button" data-a="rename" aria-label="Renomear ${esc(f.name)}">✎</button>
      <button type="button" data-a="del" aria-label="Apagar ${esc(f.name)}">🗑</button></div>`).join("");
  }
  $("flyer-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const id = b.closest(".fl-item").dataset.id, idx = state.flyers.findIndex((f) => f.id === id), f = state.flyers[idx];
    if (b.dataset.a === "open") { state.currentId = id; persist(); fillForm(); renderFlyer(); closeDialog($("dlg-flyers")); toast(`“${f.name}” aberto.`); }
    else if (b.dataset.a === "rename") { const nm = prompt("Nome do encarte:", f.name); if (nm && nm.trim()) { f.name = nm.trim().slice(0, 50); persist(); renderFlyerList(); el.curName.textContent = cur().name; } }
    else if (b.dataset.a === "del") {
      if (state.flyers.length === 1) { toast("Você precisa ter pelo menos um encarte."); return; }
      if (!confirm(`Apagar o encarte “${f.name}”?`)) return;
      state.flyers.splice(idx, 1); const wasCur = state.currentId === id; if (wasCur) state.currentId = state.flyers[0].id;
      persist(); renderFlyerList(); if (wasCur) { fillForm(); renderFlyer(); }
      toast(`Encarte “${f.name}” apagado.`, { undo: () => { state.flyers.splice(idx, 0, f); persist(); renderFlyerList(); } });
    }
  });
  $("btn-flyers").addEventListener("click", () => { renderFlyerList(); openDialog($("dlg-flyers")); });
  $("btn-new-flyer").addEventListener("click", () => {
    const f = newFlyer(); const c = cur(); f.theme = c.theme; f.format = c.format;
    state.flyers.push(f); state.currentId = f.id; persist(); fillForm(); renderFlyer(); closeDialog($("dlg-flyers")); toast("Novo encarte criado.");
  });
  $("btn-dup-flyer").addEventListener("click", () => {
    const f = { ...clone(cur()), id: uid("f"), name: cur().name + " (cópia)", updatedAt: Date.now() };
    f.products = f.products.map((p) => ({ ...p, id: uid() }));
    state.flyers.push(f); state.currentId = f.id; persist(); fillForm(); renderFlyer(); closeDialog($("dlg-flyers")); toast("Encarte duplicado.");
  });

  // ---------- onboarding ----------
  let onbStep = 1;
  function showOnb(step) {
    onbStep = step;
    document.querySelectorAll("#dlg-onboard .onb").forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
    document.querySelectorAll("#dlg-onboard .onb-dots span").forEach((d, i) => d.classList.toggle("on", i === step - 1));
    $("onb-next").textContent = step === 3 ? "Começar" : "Continuar";
  }
  function startOnboarding() {
    fillSelect($("onb-preset"), state.brand.preset === "onix" ? "farmacia" : state.brand.preset);
    $("onb-preset").querySelector('option[value="custom"]')?.remove();
    $("onb-store").value = state.brand.preset === "onix" ? "" : state.brand.name;
    showOnb(1); openDialog($("dlg-onboard"));
  }
  function finishOnboarding() {
    if (onbStep >= 2) {
      const key = $("onb-preset").value, name = $("onb-store").value.trim();
      if (key !== state.brand.preset || name) {
        state.brand = { ...brandFromPreset(key, state.brand), logo: state.brand.logo, logoOnly: state.brand.logoOnly };
        if (name) state.brand.name = name;
        cur().disclaimer = null;
      }
    }
    state.onboarded = true; persist(); fillForm(); renderFlyer(); closeDialog($("dlg-onboard"));
  }
  $("onb-next").addEventListener("click", () => (onbStep < 3 ? showOnb(onbStep + 1) : finishOnboarding()));
  $("onb-skip").addEventListener("click", () => { onbStep = 1; finishOnboarding(); });
  $("dlg-onboard").addEventListener("cancel", () => { state.onboarded = true; persist(); });
  $("btn-help").addEventListener("click", startOnboarding);

  // ---------- bindings ----------
  function bindForm() {
    const fl = (key) => (e) => { cur()[key] = e.target.value; persist(); renderFlyer(); };
    el.title.addEventListener("input", fl("title"));
    el.from.addEventListener("input", fl("dateFrom"));
    el.to.addEventListener("input", fl("dateTo"));
    el.disclaimer.addEventListener("input", fl("disclaimer"));
    $("btn-disc-reset").addEventListener("click", () => { cur().disclaimer = null; persist(); fillForm(); renderFlyer(); });
    $("title-chips").innerHTML = TITLE_SUGGESTIONS.map((t) => `<button type="button" class="chip">${esc(t)}</button>`).join("");
    $("title-chips").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; cur().title = c.textContent; el.title.value = c.textContent; persist(); renderFlyer(); });
    const dl = document.createElement("datalist"); dl.id = "badge-list"; dl.innerHTML = BADGES.map((b) => `<option value="${esc(b)}">`).join(""); document.body.appendChild(dl);

    const br = (key, getter) => (e) => { state.brand[key] = getter ? getter(e.target) : e.target.value; if (["name", "slogan", "c1", "c2", "c3", "mark"].includes(key)) { state.brand.preset = "custom"; el.preset.value = "custom"; } persist(); updateLogoChrome(); if (/^c\d$/.test(key)) renderThemes(); renderFlyer(); };
    el.store.addEventListener("input", br("name")); el.slogan.addEventListener("input", br("slogan"));
    el.c1.addEventListener("input", br("c1")); el.c2.addEventListener("input", br("c2")); el.c3.addEventListener("input", br("c3"));
    el.mark.addEventListener("change", br("mark")); el.logoOnly.addEventListener("change", br("logoOnly", (t) => t.checked));
    el.address.addEventListener("input", br("address")); el.whatsapp.addEventListener("input", br("whatsapp")); el.instagram.addEventListener("input", br("instagram"));
    el.preset.addEventListener("change", () => {
      const k = el.preset.value; if (!(k in PRESETS)) return;
      const prev = clone(state.brand);
      state.brand = { ...brandFromPreset(k, state.brand), logo: state.brand.logo, logoOnly: state.brand.logoOnly };
      persist(); fillForm(); renderFlyer();
      toast(`Marca “${PRESETS[k].label}” aplicada.`, { undo: () => { state.brand = prev; persist(); fillForm(); renderFlyer(); } });
    });
    el.logo.addEventListener("change", async (e) => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
      try { state.brand.logo = await shrinkLogo(file); persist(); updateLogoChrome(); renderFlyer(); } catch (err) { toast(err.message, { error: true }); }
    });
    el.logoClear.addEventListener("click", () => { const old = state.brand.logo; state.brand.logo = ""; state.brand.logoOnly = false; el.logoOnly.checked = false; persist(); updateLogoChrome(); renderFlyer();
      toast("Logo removido.", { undo: () => { state.brand.logo = old; persist(); updateLogoChrome(); renderFlyer(); } }); });

    document.querySelectorAll('input[name="format"]').forEach((i) => i.addEventListener("change", () => { if (i.checked) { cur().format = i.value; persist(); renderFlyer(); } }));
    el.add.addEventListener("click", () => {
      const ps = cur().products; if (ps.length >= MAX_PRODUCTS) return;
      ps.push({ id: uid(), name: "", details: "", oldPrice: null, newPrice: null, photo: "", badge: "" });
      persist(); renderProductList(); renderFlyer();
      el.list.querySelector(".p-card:last-child input[data-act='name']")?.focus();
    });
    $("btn-png").addEventListener("click", () => exportPng(false));
    $("btn-share").addEventListener("click", () => exportPng(true));
    $("btn-print").addEventListener("click", printA4);
    $("btn-export-json").addEventListener("click", exportJson);
    $("fld-import-json").addEventListener("change", importJson);
    $("btn-fullscreen").addEventListener("click", openFullscreen);
    $("btn-fs-close").addEventListener("click", closeFullscreen);
    el.fs.addEventListener("click", (e) => { if (e.target === el.fs) closeFullscreen(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.fs.hidden) closeFullscreen(); });
  }

  // ---------- export ----------
  function fileName() {
    const f = cur();
    const raw = (f.title || "encarte").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "encarte";
    return `${raw}-${f.format}.png`;
  }
  const waitImgs = (root) => Promise.all([...root.querySelectorAll("img")].map((i) => (i.complete && i.naturalWidth ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  async function renderPngBlob() {
    if (!window.htmlToImage?.toBlob) throw new Error("A exportação ainda está carregando. Tente de novo.");
    const f = cur(), size = FORMAT_SIZE[f.format] || FORMAT_SIZE.story;
    const cover = document.createElement("div");
    cover.style.cssText = "position:fixed;inset:0;z-index:9998;background:rgba(16,32,84,.6);display:grid;place-items:center;color:#fff;font:800 18px Nunito,sans-serif;";
    cover.textContent = "Gerando imagem…";
    const node = el.flyer.cloneNode(true); node.removeAttribute("id");
    node.style.cssText += `;position:fixed;left:0;top:0;margin:0;transform:none;z-index:9997;width:${size.w}px;height:${size.h}px;`;
    document.body.append(node, cover);
    try {
      await document.fonts.ready; await waitImgs(node);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const blob = await window.htmlToImage.toBlob(node, { pixelRatio: 1, canvasWidth: size.w, canvasHeight: size.h, width: size.w, height: size.h, backgroundColor: getComputedStyle(node).backgroundColor || "#fff" });
      if (!blob) throw new Error("A exportação não gerou a imagem.");
      return blob;
    } finally { node.remove(); cover.remove(); }
  }
  async function exportPng(share) {
    const btn = share ? $("btn-share") : $("btn-png"), old = btn.textContent;
    btn.disabled = true; btn.textContent = "Gerando…";
    try {
      const blob = await renderPngBlob(), name = fileName();
      if (share && navigator.share) {
        const file = new File([blob], name, { type: "image/png" });
        const payload = { files: [file], title: cur().title };
        if (!navigator.canShare || navigator.canShare(payload)) {
          try { await navigator.share(payload); toast("Encarte compartilhado."); return; } catch (e) { if (e?.name === "AbortError") return; }
        }
      }
      const href = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
      toast(share ? "Compartilhar não está disponível aqui; o PNG foi baixado." : "PNG salvo.");
    } catch (e) { console.error(e); toast(e.message || "Não deu para gerar o PNG.", { error: true }); }
    finally { btn.disabled = false; btn.textContent = old; }
  }
  function printA4() {
    const f = cur(), prev = f.format;
    if (prev !== "a4") { f.format = "a4"; renderFlyer(); }
    document.documentElement.style.setProperty("--print-scale", String(793 / 1240));
    const restore = () => { if (prev !== "a4") { f.format = prev; renderFlyer(); } window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    setTimeout(() => window.print(), 60);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify({ app: "vitrine-de-ofertas", ...state }, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vitrine-ofertas-backup-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); toast("Backup baixado.");
  }
  function importJson(e) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        let data = JSON.parse(r.result);
        if (!data || typeof data !== "object") throw 0;
        if (!data.flyers && Array.isArray(data.products)) { localStorage.setItem(LEGACY_KEY, r.result); data = migrateLegacy(); }
        if (!confirm("Importar este backup vai substituir seus encartes atuais. Continuar?")) return;
        const prev = state;
        state = normalize({ ...data, onboarded: true }); persist(); fillForm(); renderFlyer();
        toast("Backup importado.", { undo: () => { state = prev; persist(); fillForm(); renderFlyer(); } });
      } catch { toast("Esse arquivo não é um backup válido.", { error: true }); }
    };
    r.readAsText(file);
  }
  function openFullscreen() {
    el.fs.hidden = false;
    const holder = document.createElement("div"); holder.className = "preview-frame"; holder.style.width = "min(100%, 460px)";
    const sc = document.createElement("div"); sc.className = "flyer-scale";
    const c = el.flyer.cloneNode(true); c.removeAttribute("id");
    sc.appendChild(c); holder.appendChild(sc); el.fsInner.replaceChildren(holder);
    requestAnimationFrame(() => scalePreview(holder, sc, c));
    $("btn-fs-close").focus();
  }
  function closeFullscreen() { el.fs.hidden = true; el.fsInner.replaceChildren(); $("btn-fullscreen").focus(); }

  // ---------- boot ----------
  async function boot() {
    let saved = await storeGet();
    if (!saved) saved = migrateLegacy();
    state = normalize(saved);
    bindForm(); fillForm(); renderFlyer(); initSortable();
    window.addEventListener("resize", () => scalePreview());
    if (!state.onboarded) startOnboarding();
    if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
    window.__vitrine = { get state() { return state; }, renderPngBlob };
  }
  boot();
})();
