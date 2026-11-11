(function () {
  "use strict";

  const DB_NAME = "vitrine-ofertas";
  const LEGACY_KEY = "encarte-onix-v1";
  const LS_KEY = "vitrine-ofertas-v2";
  const MAX_PRODUCTS = 12;
  const SEGS = window.SEGMENTS, SEG_ORDER = window.SEGMENT_ORDER;
  const DEFAULT_SEGMENT = "farmacia"; // só para dados antigos (antes dos tipos de negócio)
  const NEW_USER_SEGMENT = "outro";
  // Cores neutras usadas quando a loja ainda não tem marca.
  const NEUTRAL = { c1: "#2563EB", c2: "#0F172A", c3: "#FACC15" };
  // Loja em branco: quem instala o app começa sem nenhuma loja pré-preenchida.
  const BLANK_BRAND = { preset: "none", name: "", slogan: "", c1: NEUTRAL.c1, c2: NEUTRAL.c2, c3: NEUTRAL.c3, mark: "icone", logo: "", logoSrc: "", logoCutout: false, logoOnly: false, address: "", whatsapp: "", instagram: "" };
  // Modelos de marca: um genérico para cada tipo de negócio.
  const PRESETS = {};
  SEG_ORDER.forEach((k) => { PRESETS[k] = { label: SEGS[k].label + " (genérico)", ...SEGS[k].brand, segment: k }; });

  const THEMES = [
    { id: "classico", label: "Clássico", sw: ["var(--c1)", "#f3f4f8", "#102054"] },
    { id: "relampago", label: "Relâmpago", sw: ["var(--c1)", "var(--c1)", "var(--c3)"] },
    { id: "clean", label: "Clean", sw: ["#fff", "#f6f7fb", "#f0f2f8"] },
    { id: "noite", label: "Noite", sw: ["#0b1638", "#15244f", "#070f28"] },
    { id: "saude", label: "Verde", sw: ["#0e8a6a", "#eaf7f2", "#0b3b30"] },
    { id: "beleza", label: "Rosa", sw: ["#d63384", "#fdf0f6", "#4a1d4f"] },
    { id: "black", label: "Black Friday", sw: ["#0d0d0d", "#1c1c1c", "#f5c400"] },
    { id: "natal", label: "Natal", sw: ["#b3121f", "#fbf6ee", "#116b3a"] },
    { id: "gradiente", label: "Gradiente", sw: ["linear-gradient(135deg,var(--c1),var(--c2))", "#fff", "var(--c3)"], novo: true },
    { id: "premium", label: "Premium", sw: ["#f7f3ec", "#fff", "#1a1a1a"], novo: true },
    { id: "neon", label: "Neon Sale", sw: ["#0a0420", "#ff2bd6", "#00f0ff"], novo: true },
  ];

  const SEG = () => window.segmentOf(state && state.segment);
  const FORMAT_SIZE = { story: { w: 1080, h: 1920 }, feed: { w: 1080, h: 1080 }, a4: { w: 1240, h: 1754 } };
  const MAX_STICKERS = 8;
  const STK_POS = [
    ["footer-left", "Rodapé esquerdo"], ["footer-right", "Rodapé direito"],
    ["tl", "Canto superior esquerdo"], ["tr", "Canto superior direito"],
    ["bl", "Canto inferior esquerdo"], ["br", "Canto inferior direito"],
  ];
  const STK_SIZES = [["s", "P"], ["m", "M"], ["l", "G"]];

  const $ = (id) => document.getElementById(id);
  const el = {
    flyer: $("flyer"), scale: $("flyer-scale"), frame: $("preview-frame"),
    title: $("fld-title"), from: $("fld-from"), to: $("fld-to"),
    preset: $("fld-preset"), store: $("fld-store"), slogan: $("fld-slogan"),
    c1: $("fld-c1"), c2: $("fld-c2"), c3: $("fld-c3"), mark: $("fld-mark"),
    address: $("fld-address"), whatsapp: $("fld-whatsapp"), instagram: $("fld-instagram"),
    logo: $("fld-logo"), logoCam: $("fld-logo-cam"), logoPreview: $("logo-preview"), logoClear: $("btn-logo-clear"),
    logoOnly: $("fld-logo-only"), logoOnlyWrap: $("logo-only-wrap"),
    logoCutout: $("fld-logo-cutout"), logoCutoutWrap: $("logo-cutout-wrap"), logoText: $("lbl-logo-text"),
    disclaimer: $("fld-disclaimer"), list: $("product-list"), empty: $("empty-products"),
    count: $("product-count"), add: $("btn-add"),
    stkGallery: $("stk-gallery"), stkUsed: $("stk-used"), stkCount: $("sticker-count"),
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
  const ic = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
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
    const p = PRESETS[key];
    if (!p) return { ...BLANK_BRAND, address: keep?.address || "", whatsapp: keep?.whatsapp || "", instagram: keep?.instagram || "" };
    return { preset: key, name: p.name, slogan: p.slogan, c1: p.c1, c2: p.c2, c3: p.c3, mark: p.mark, logo: "", logoSrc: "", logoCutout: false, logoOnly: false,
      address: keep?.address || "", whatsapp: keep?.whatsapp || "", instagram: keep?.instagram || "" };
  }
  function sampleProducts(segId) {
    return window.segmentOf(segId).products.map(([name, details, o, n, badge = ""]) => ({ id: uid(), name, details, oldPrice: o, newPrice: n, photo: "", photoSrc: "", badge }));
  }
  function sampleContent(segId) {
    const seg = window.segmentOf(segId);
    return { theme: seg.theme, title: seg.titles[0], sampleSeg: seg.id, products: sampleProducts(seg.id),
      stickers: seg.stickers.map(([kind, pos, size, caption]) => ({ id: uid("s"), kind, pos, size, caption })) };
  }
  // O encarte de exemplo ainda não foi mexido? (mesmos nomes de produto do exemplo)
  function isUntouchedSample(f) {
    if (!f) return false;
    const names = window.segmentOf(f.sampleSeg || DEFAULT_SEGMENT).products.map((p) => p[0]).join("|");
    return f.products.map((p) => p.name).join("|") === names && f.products.every((p) => !p.photo);
  }
  function newFlyer(name, withSample, segId) {
    const from = todayISO();
    const seg = window.segmentOf(segId || (state && state.segment));
    const f = { id: uid("f"), name: name || "Encarte " + formatDateBR(from), updatedAt: Date.now(), theme: seg.theme, format: "story",
      title: seg.titles[0], dateFrom: from, dateTo: addDaysISO(from, 6), disclaimer: null, products: [], stickers: [] };
    return withSample ? Object.assign(f, sampleContent(seg.id)) : f;
  }
  function normSticker(s) {
    const known = window.stickerInfo ? window.stickerInfo(s.kind) : (window.STICKERS || {})[s.kind];
    const posOk = STK_POS.some(([k]) => k === s.pos);
    const sizeOk = STK_SIZES.some(([k]) => k === s.size);
    return {
      id: s.id || uid("s"),
      kind: known ? s.kind : "motoboy",
      pos: posOk ? s.pos : "footer-left",
      size: sizeOk ? s.size : "m",
      caption: typeof s.caption === "string" ? s.caption.slice(0, 48) : "",
    };
  }
  function normProduct(p) {
    return { id: p.id || uid(), name: p.name || "", details: p.details || "", oldPrice: p.oldPrice == null || p.oldPrice === "" ? null : Number(p.oldPrice),
      newPrice: p.newPrice == null || p.newPrice === "" ? null : Number(p.newPrice), photo: p.photo || "", photoSrc: p.photoSrc || "", badge: p.badge || "" };
  }
  function normalize(s) {
    const fresh = !(s && typeof s === "object");
    const st = fresh ? {} : s;
    st.version = 3;
    // usuário novo: tipo neutro até escolher no primeiro acesso.
    // migração: quem já usava o app antes dos tipos de negócio era de farmácia (ou escolheu a marca de mercado/beleza)
    if (!SEGS[st.segment]) st.segment = fresh ? NEW_USER_SEGMENT : st.brand && SEGS[st.brand.preset] ? st.brand.preset : DEFAULT_SEGMENT;
    st.brand = { ...BLANK_BRAND, ...(st.brand || {}) };
    if (!Array.isArray(st.flyers) || !st.flyers.length) st.flyers = [newFlyer("Meu primeiro encarte", true, st.segment)];
    st.flyers = st.flyers.map((f) => ({ ...newFlyer(null, false, st.segment), ...f, products: (f.products || []).slice(0, MAX_PRODUCTS).map(normProduct), stickers: (f.stickers || []).slice(0, MAX_STICKERS).map(normSticker) }));
    if (!st.flyers.some((f) => f.id === st.currentId)) st.currentId = st.flyers[0].id;
    st.onboarded = !!st.onboarded;
    return st;
  }
  function migrateLegacy() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      // A versão 1 tinha a marca fixa da loja de quem a usava; mantém essa marca para não perder os dados.
      const brand = { ...BLANK_BRAND, preset: "custom", name: o.name || "Drogarias Ônix", slogan: o.slogan || "Cuidar de você é com a gente", c1: "#D61E26", c2: "#1C3FAA", c3: "#FFD600", mark: "cruz",
        address: o.address || "", whatsapp: o.whatsapp || "", instagram: o.instagram || "" };
      if (o.logo) { brand.logo = o.logo; brand.logoOnly = !!o.logoOnly; }
      const f = newFlyer("Meu encarte", false, "farmacia");
      Object.assign(f, { theme: ["classico", "relampago", "clean", "noite"].includes(o.theme) ? o.theme : "classico", format: o.format || "story",
        title: o.title || f.title, dateFrom: o.dateFrom || f.dateFrom, dateTo: o.dateTo || f.dateTo, disclaimer: o.disclaimer || null, products: o.products || [] });
      return { brand, segment: "farmacia", flyers: [f], currentId: f.id, onboarded: true };
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
  const LOGO_MAX = 512;
  const LOGO_OK = /^(image\/(png|jpeg|jpg|pjpeg|x-png|webp))$/i;
  async function decodeImage(fileOrUrl) {
    if (fileOrUrl && typeof fileOrUrl !== "string" && typeof createImageBitmap === "function") {
      try { return await createImageBitmap(fileOrUrl, { imageOrientation: "from-image" }); } catch {}
    }
    const src = typeof fileOrUrl === "string" ? fileOrUrl : await fileToDataURL(fileOrUrl);
    return loadImg(src);
  }
  async function shrinkLogo(file) {
    if (!file) throw new Error("Escolha um arquivo de imagem.");
    const name = (file.name || "").toLowerCase();
    const typeOk = LOGO_OK.test(file.type || "") || /\.(png|jpe?g|webp)$/.test(name) || (file.type || "").startsWith("image/");
    if (!typeOk) throw new Error("Envie um logo em PNG, JPG ou WebP.");
    const img = await decodeImage(file);
    const w0 = img.width, h0 = img.height;
    if (!w0 || !h0) throw new Error("Não foi possível ler a imagem.");
    const s = Math.min(1, LOGO_MAX / Math.max(w0, h0));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w0 * s));
    c.height = Math.max(1, Math.round(h0 * s));
    const x = c.getContext("2d", { alpha: true });
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    if (img.close) try { img.close(); } catch {}
    return c.toDataURL("image/png");
  }
  function keepLogoFields(b) { return { logo: b.logo || "", logoSrc: b.logoSrc || "", logoCutout: !!b.logoCutout, logoOnly: !!b.logoOnly }; }

  // Guarda a foto original (até 2048 px) para a IA trabalhar com qualidade, não com o recorte pequeno.
  async function keepOriginal(dataURL) {
    try {
      const img = await loadImg(dataURL);
      const s = Math.min(1, 2048 / Math.max(img.width, img.height));
      if (s === 1 && dataURL.length < 2.5e6) return dataURL;
      const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.92);
    } catch { return ""; }
  }

  // ---------- photo crop dialog ----------
  const crop = { img: null, zoom: 1, x: 0, y: 0, pid: null, orig: "" };
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
  async function openCrop(pid, file, src) {
    try {
      const fromFile = file && typeof File !== "undefined" && file instanceof File;
      const url = src || (typeof file === "string" ? file : null);
      const raw = fromFile ? await fileToDataURL(file) : null;
      crop.orig = raw ? await keepOriginal(raw) : "";
      crop.img = await loadImg(crop.orig || raw || url || productById(pid).photo);
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
      const out = document.createElement("canvas"); out.width = out.height = 1200; out.getContext("2d").imageSmoothingQuality = "high"; drawCrop(out, 1200);
      const p = productById(crop.pid);
      if (p) {
        p.photo = $("crop-white").checked ? out.toDataURL("image/jpeg", 0.92) : out.toDataURL("image/png");
        if (crop.orig) p.photoSrc = crop.orig;
        persist(); renderProductList(); renderFlyer();
      }
      closeDialog($("dlg-photo"));
    });
  })();

  // ---------- deixar bonita com IA ----------
  const enh = { pid: null, before: "", after: "", opts: { background: "white" }, busy: false };
  function showEnhPane(name) {
    $("enh-progress").hidden = name !== "progress";
    $("enh-result").hidden = name !== "result";
    $("enh-fail").hidden = name !== "fail";
  }
  function setEnhProgress(p, msg) {
    $("enh-status").textContent = msg || "Trabalhando…";
    $("enh-bar").value = Math.max(0, Math.min(100, Math.round((p || 0) * 100)));
  }
  async function srcForProduct(pid, file) {
    if (file) return typeof file === "string" ? file : await fileToDataURL(file);
    const p = productById(pid);
    if (p?.photoSrc) return p.photoSrc;
    if (p?.photo) return p.photo;
    return null;
  }
  async function openEnhance(pid, file) {
    const p = productById(pid);
    if (!p) return;
    if (!file && !p.photo) {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.addEventListener("change", () => { if (inp.files?.[0]) openEnhance(pid, inp.files[0]); });
      inp.click();
      return;
    }
    const API = window.VitrineEnhance;
    if (!API) { toast("A melhoria com IA ainda está carregando. Tente de novo.", { error: true }); return; }
    if (!API.supported()) {
      enh.pid = pid; enh.before = await srcForProduct(pid, file);
      showEnhPane("fail");
      $("enh-fail-text").textContent = "Este aparelho não consegue rodar a IA. Você pode cortar a foto na mão e deixar o fundo branco.";
      openDialog($("dlg-enhance"));
      return;
    }
    enh.pid = pid;
    enh.before = await srcForProduct(pid, file);
    enh.after = "";
    enh.opts.background = $("enh-tint").checked ? "tint" : "white";
    showEnhPane("progress");
    setEnhProgress(0.01, "Preparando…");
    openDialog($("dlg-enhance"));
    const weak = API.isWeak();
    if (weak === "low-memory") setEnhProgress(0.02, "Este aparelho é mais simples; pode demorar um pouco…");
    enh.busy = true;
    try {
      const tint = safeColor(state.brand.c1, NEUTRAL.c1);
      const out = await API.enhance(enh.before, {
        background: enh.opts.background, tint,
        onProgress: setEnhProgress,
      });
      enh.after = out.dataURL;
      if (out.original) enh.before = out.original;
      $("enh-before").src = enh.before;
      $("enh-after").src = enh.after;
      showEnhPane("result");
    } catch (e) {
      console.error(e);
      $("enh-fail-text").textContent = (e && e.message ? e.message + " " : "") + "Você pode cortar a foto na mão e deixar o fundo branco.";
      showEnhPane("fail");
    } finally { enh.busy = false; }
  }
  async function rerunEnhance() {
    if (!enh.before || enh.busy) return;
    const API = window.VitrineEnhance;
    showEnhPane("progress");
    setEnhProgress(0.7, "Aplicando o novo fundo…");
    enh.busy = true;
    try {
      const out = await API.enhance(enh.before, {
        background: $("enh-tint").checked ? "tint" : "white",
        tint: safeColor(state.brand.c1, NEUTRAL.c1),
        onProgress: setEnhProgress, reuse: true,
      });
      enh.after = out.dataURL;
      $("enh-after").src = enh.after;
      showEnhPane("result");
    } catch (e) {
      $("enh-fail-text").textContent = e.message || "Não deu para processar.";
      showEnhPane("fail");
    } finally { enh.busy = false; }
  }
  function applyEnhance() {
    const p = productById(enh.pid);
    if (!p || !enh.after) return;
    const prev = p.photo, prevSrc = p.photoSrc;
    p.photo = enh.after;
    if (enh.before && enh.before.startsWith("data:")) p.photoSrc = enh.before;
    persist(); renderProductList(); renderFlyer();
    closeDialog($("dlg-enhance"));
    toast("Foto melhorada com IA.", { undo: () => { p.photo = prev; p.photoSrc = prevSrc; persist(); renderProductList(); renderFlyer(); } });
  }
  function enhanceToManual() {
    const pid = enh.pid, src = enh.after || enh.before;
    closeDialog($("dlg-enhance"));
    if (pid && src) openCrop(pid, src);
  }
  $("enh-apply").addEventListener("click", applyEnhance);
  $("enh-manual").addEventListener("click", enhanceToManual);
  $("enh-fallback").addEventListener("click", enhanceToManual);
  $("enh-tint").addEventListener("change", () => { if (enh.after && !enh.busy) rerunEnhance(); });
  $("dlg-enhance").addEventListener("cancel", (e) => { if (enh.busy) e.preventDefault(); });
  $("crop-enhance").addEventListener("click", () => {
    const pid = crop.pid;
    if (!pid) return;
    const src = crop.orig || productById(pid)?.photoSrc || crop.img?.src || productById(pid)?.photo;
    closeDialog($("dlg-photo"));
    if (src) openEnhance(pid, src);
  });

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
      <span class="sw" style="--c1:${state.brand.c1};--c2:${state.brand.c2};--c3:${state.brand.c3}"><i style="background:${t.sw[0]}"></i><i style="background:${t.sw[1]}"></i><i style="background:${t.sw[2]}"></i></span><span class="th-label">${esc(t.label)}</span>${t.novo ? '<em class="new">novo</em>' : ""}</label>`).join("");
    document.querySelectorAll('input[name="theme"]').forEach((i) => i.addEventListener("change", () => { if (i.checked) { cur().theme = i.value; persist(); renderFlyer(); } }));
  }
  function fillForm() {
    const f = cur(), b = state.brand;
    el.title.value = f.title || ""; el.from.value = f.dateFrom || ""; el.to.value = f.dateTo || "";
    el.disclaimer.value = f.disclaimer ?? SEG().disclaimer;
    fillSelect(el.preset, b.preset);
    el.store.value = b.name || ""; el.slogan.value = b.slogan || "";
    el.c1.value = safeColor(b.c1, NEUTRAL.c1); el.c2.value = safeColor(b.c2, NEUTRAL.c2); el.c3.value = safeColor(b.c3, NEUTRAL.c3);
    el.mark.value = b.mark || "icone"; el.logoOnly.checked = !!b.logoOnly;
    el.address.value = b.address || ""; el.whatsapp.value = b.whatsapp || ""; el.instagram.value = b.instagram || "";
    document.querySelectorAll('input[name="format"]').forEach((i) => (i.checked = i.value === f.format));
    el.curName.textContent = f.name;
    renderSegmentUI(); renderThemes(); updateLogoChrome(); renderProductList(); renderStickerUI();
  }
  function segOptions() { return SEG_ORDER.map((k) => `<option value="${k}">${SEGS[k].emoji} ${esc(SEGS[k].label)}</option>`).join(""); }
  function renderSegmentUI() {
    const seg = SEG();
    const fs = $("fld-segment"); if (fs) { if (!fs.options.length) fs.innerHTML = segOptions(); fs.value = seg.id; }
    $("title-chips").innerHTML = seg.titles.map((t) => `<button type="button" class="chip">${esc(t)}</button>`).join("");
    el.title.placeholder = seg.titles[0];
    el.slogan.placeholder = "ex.: " + seg.sloganEx;
    $("onb-store").placeholder = "ex.: " + seg.storeEx;
    let dl = $("badge-list"); if (!dl) { dl = document.createElement("datalist"); dl.id = "badge-list"; document.body.appendChild(dl); }
    dl.innerHTML = seg.badges.map((b) => `<option value="${esc(b)}">`).join("");
  }
  function logoHTML(b) {
    if (b.logo) return `<div class="fl-logo img"><img src="${b.logo}" alt=""></div>`;
    if (b.mark === "nenhum") return "";
    if (b.mark === "icone") return `<div class="fl-logo"><span class="emo">${SEG().emoji}</span></div>`;
    if (b.mark === "inicial") return `<div class="fl-logo"><span class="ini">${esc((b.name || "?").trim().charAt(0).toUpperCase())}</span></div>`;
    return `<div class="fl-logo"><span class="cross"></span></div>`;
  }
  function logoPreviewHTML(b, size) {
    const s = size || 80;
    if (b.logo) return `<img src="${b.logo}" alt="">`;
    return `<div class="flyer" style="width:${s}px;height:${s}px;--logo:${s}px;--c2:${b.c2};background:transparent">${logoHTML(b)}</div>`;
  }
  function updateLogoChrome() {
    const b = state.brand, has = !!b.logo;
    const previews = [el.logoPreview, $("onb-logo-preview")].filter(Boolean);
    previews.forEach((node) => {
      node.classList.toggle("has-img", has);
      node.innerHTML = logoPreviewHTML(b, 80);
    });
    [el.logoText, $("onb-logo-text")].filter(Boolean).forEach((n) => { n.textContent = has ? "Trocar" : "Enviar logo"; });
    [el.logoClear, $("onb-logo-clear")].filter(Boolean).forEach((n) => { n.hidden = !has; });
    [el.logoCutoutWrap, $("onb-logo-cutout-wrap")].filter(Boolean).forEach((n) => { n.hidden = !has; });
    [el.logoCutout, $("onb-logo-cutout")].filter(Boolean).forEach((n) => { n.checked = !!b.logoCutout; });
    if (el.logoOnlyWrap) el.logoOnlyWrap.hidden = !has;
  }
  async function applyLogoFile(file) {
    const data = await shrinkLogo(file);
    state.brand.logo = data;
    state.brand.logoSrc = data;
    state.brand.logoCutout = false;
    persist(); updateLogoChrome(); renderFlyer();
  }
  function clearLogo() {
    const old = keepLogoFields(state.brand);
    state.brand.logo = ""; state.brand.logoSrc = ""; state.brand.logoCutout = false; state.brand.logoOnly = false;
    if (el.logoOnly) el.logoOnly.checked = false;
    persist(); updateLogoChrome(); renderFlyer();
    toast("Logo removido.", { undo: () => { Object.assign(state.brand, old); persist(); updateLogoChrome(); renderFlyer(); } });
  }
  let logoAiBusy = false, logoAiTitle = "";
  async function setLogoCutout(on) {
    if (!on) {
      if (state.brand.logoSrc) state.brand.logo = state.brand.logoSrc;
      state.brand.logoCutout = false;
      persist(); updateLogoChrome(); renderFlyer();
      return;
    }
    const src = state.brand.logoSrc || state.brand.logo;
    if (!src) { updateLogoChrome(); return; }
    const API = window.VitrineEnhance;
    if (!API || !API.cutout) { toast("A IA ainda está carregando. Tente de novo.", { error: true }); updateLogoChrome(); return; }
    if (!API.supported()) { toast("Este aparelho não consegue tirar o fundo com IA.", { error: true }); updateLogoChrome(); return; }
    if (logoAiBusy) return;
    logoAiBusy = true;
    const dlg = $("dlg-enhance");
    logoAiTitle = $("dlg-enhance-title").textContent;
    $("dlg-enhance-title").textContent = "Tirar fundo com IA";
    dlg.classList.add("is-logo");
    showEnhPane("progress");
    setEnhProgress(0.01, "Preparando…");
    openDialog(dlg);
    try {
      const out = await API.cutout(src, { onProgress: setEnhProgress, maxSide: LOGO_MAX });
      state.brand.logoSrc = src;
      state.brand.logo = out.dataURL;
      state.brand.logoCutout = true;
      persist(); updateLogoChrome(); renderFlyer();
      closeDialog(dlg);
      toast("Fundo do logo removido.");
    } catch (e) {
      console.error(e);
      state.brand.logoCutout = false;
      updateLogoChrome();
      $("enh-fail-text").textContent = (e && e.message ? e.message : "Não deu para tirar o fundo.") + " Você pode usar o logo do jeito que está.";
      showEnhPane("fail");
    } finally {
      logoAiBusy = false;
    }
  }

  // ---------- product list ----------
  const productById = (id) => cur().products.find((p) => p.id === id);
  function renderProductList() {
    const ps = cur().products;
    el.list.innerHTML = "";
    ps.forEach((p, i) => el.list.appendChild(productCard(p, i)));
    el.count.textContent = `(${ps.length}/${MAX_PRODUCTS})`;
    el.add.disabled = ps.length >= MAX_PRODUCTS;
    el.add.innerHTML = ps.length >= MAX_PRODUCTS ? "Limite de 12 produtos" : `${ic("plus")} Adicionar produto`;
    el.empty.hidden = ps.length > 0;
  }
  function productCard(p, idx) {
    const w = document.createElement("article");
    w.className = "p-card"; w.dataset.id = p.id;
    const off = discountPct(p.oldPrice, p.newPrice);
    w.innerHTML = `
      <div class="p-head-row">
        <button type="button" class="p-handle" aria-label="Arrastar para reordenar o produto ${idx + 1}">${ic("grip-vertical")}</button>
        <span class="p-title">${idx + 1}. ${esc(p.name || "Novo produto")}</span>
        <button type="button" class="p-remove" data-act="remove" aria-label="Remover ${esc(p.name || "produto")}">${ic("trash-2")}</button>
      </div>
      <div class="p-top">
        <label class="p-photo ${p.photo ? "has-img" : ""}" aria-label="${p.photo ? "Trocar foto" : "Adicionar foto"} do produto">
          ${p.photo ? `<img src="${p.photo}" alt="">` : `${ic("image")}<span>Foto</span>`}
          <input type="file" accept="image/*" data-act="photo">
        </label>
        <div class="p-fields">
          <label class="field">Nome<input type="text" data-act="name" maxlength="60" value="${esc(p.name)}" placeholder="Nome do produto"></label>
          <label class="field">Detalhes<input type="text" data-act="details" maxlength="80" value="${esc(p.details)}" placeholder="ex.: ${esc(SEG().detailsEx)}"></label>
        </div>
      </div>
      <div class="p-prices">
        <label class="field">De<input type="text" inputmode="decimal" data-act="oldPrice" value="${p.oldPrice == null ? "" : formatInputPrice(p.oldPrice)}" placeholder="0,00"></label>
        <label class="field">Por<input type="text" inputmode="decimal" data-act="newPrice" value="${p.newPrice == null ? "" : formatInputPrice(p.newPrice)}" placeholder="0,00"></label>
        <div class="p-off ${off == null ? "is-empty" : ""}" aria-live="polite">${off == null ? "—" : "-" + off + "%"}</div>
      </div>
      <label class="field">Selo<input type="text" list="badge-list" data-act="badge" maxlength="32" value="${esc(p.badge)}" placeholder="ex.: ${esc(SEG().badgeEx)}"></label>
      <div class="p-actions">
        ${p.photo ? `<button type="button" class="btn-text" data-act="crop">${ic("crop")} Ajustar</button><button type="button" class="btn-text" data-act="nophoto">${ic("x")} Tirar foto</button>` : "<span></span>"}
        <button type="button" class="btn-text" data-act="enhance">${ic("sparkles")} Deixar bonita com IA</button>
        <button type="button" class="btn-text" data-act="dup">${ic("copy")} Duplicar</button>
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
    } else if (act === "nophoto") { ps[i].photo = ""; ps[i].photoSrc = ""; }
    else if (act === "crop") return openCrop(ps[i].id);
    else if (act === "enhance") return openEnhance(ps[i].id);
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

  // ---------- figurinhas ----------
  let stkSet = "3d";
  function brandColors() {
    const b = state.brand;
    return { c1: safeColor(b.c1, NEUTRAL.c1), c2: safeColor(b.c2, NEUTRAL.c2), c3: safeColor(b.c3, NEUTRAL.c3) };
  }
  function applyStickerColors() {
    const { c1, c2, c3 } = brandColors();
    [el.stkGallery, el.stkUsed, el.flyer].forEach((n) => { if (!n) return; n.style.setProperty("--c1", c1); n.style.setProperty("--c2", c2); n.style.setProperty("--c3", c3); });
    if (window.recolorStickers3D) {
      window.recolorStickers3D(el.stkGallery, c1);
      window.recolorStickers3D(el.stkUsed, c1);
      window.recolorStickers3D(el.flyer, c1);
    }
  }
  function nextStickerPos() {
    const used = new Set((cur().stickers || []).map((s) => s.pos));
    return (STK_POS.find(([p]) => !used.has(p)) || STK_POS[0])[0];
  }
  function renderStickerGallery() {
    let ids = window.stickerIds ? window.stickerIds(stkSet) : Object.keys(window.STICKERS || {});
    if (window.orderStickersFor) ids = window.orderStickersFor(state.segment, ids);
    el.stkGallery.innerHTML = ids.map((id) => {
      const info = window.stickerInfo ? window.stickerInfo(id) : { label: (window.STICKERS[id] || ["Figurinha"])[0] };
      const mark = window.stickerMarkup ? window.stickerMarkup(id) : window.stickerSVG(id);
      const sug = window.isSuggestedSticker && window.isSuggestedSticker(state.segment, id);
      return `<button type="button" class="stk-pick${sug ? " is-sug" : ""}" data-kind="${id}" role="listitem" aria-label="Adicionar figurinha ${esc(info.label)}${sug ? " (sugerida)" : ""}">${mark}<span>${esc(info.label)}</span></button>`;
    }).join("");
    document.querySelectorAll(".stk-set").forEach((b) => {
      const on = b.dataset.set === stkSet;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    el.stkGallery.setAttribute("aria-labelledby", stkSet === "3d" ? "stk-tab-3d" : "stk-tab-classicas");
    const { c1 } = brandColors();
    if (window.recolorStickers3D) window.recolorStickers3D(el.stkGallery, c1);
  }
  function renderStickerUsed() {
    const list = cur().stickers || [];
    el.stkCount.textContent = `(${list.length}/${MAX_STICKERS})`;
    el.stkUsed.innerHTML = list.map((s) => {
      const info = window.stickerInfo ? window.stickerInfo(s.kind) : { label: (window.STICKERS[s.kind] || ["Figurinha"])[0] };
      const label = info.label;
      const mark = window.stickerMarkup ? window.stickerMarkup(s.kind) : window.stickerSVG(s.kind);
      const posOpts = STK_POS.map(([v, l]) => `<option value="${v}" ${v === s.pos ? "selected" : ""}>${esc(l)}</option>`).join("");
      const sizes = STK_SIZES.map(([v, l]) => `<button type="button" data-act="size" data-size="${v}" aria-pressed="${s.size === v}">${l}</button>`).join("");
      return `<article class="stk-item" data-id="${s.id}">
        <div class="stk-thumb" aria-hidden="true">${mark}</div>
        <div class="stk-fields">
          <strong class="p-title">${esc(label)}</strong>
          <div class="stk-row">
            <label class="field">Posição<select data-act="pos">${posOpts}</select></label>
            <div class="field">Tamanho<div class="stk-size" role="group" aria-label="Tamanho">${sizes}</div></div>
          </div>
          <label class="field">Texto ao lado (opcional)<input type="text" data-act="caption" maxlength="48" value="${esc(s.caption)}" placeholder="ex.: Entregamos em casa!"></label>
        </div>
        <button type="button" class="p-remove" data-act="remove" aria-label="Remover ${esc(label)}">${ic("trash-2")}</button>
      </article>`;
    }).join("");
    applyStickerColors();
  }
  function renderStickerUI() { applyStickerColors(); renderStickerUsed(); }
  function addSticker(kind) {
    const f = cur();
    f.stickers = f.stickers || [];
    if (f.stickers.length >= MAX_STICKERS) return toast("Limite de 8 figurinhas neste encarte.");
    const info = window.stickerInfo ? window.stickerInfo(kind) : (window.STICKERS || {})[kind];
    if (!info) return;
    const caps = window.STICKER_CAPTIONS || {};
    const cap = SEG().captions?.[kind] ?? caps[kind] ?? "";
    f.stickers.push({ id: uid("s"), kind, pos: nextStickerPos(), size: "m", caption: (window.stickerCaptionOK && !window.stickerCaptionOK(kind, cap)) ? "" : cap });
    persist(); renderStickerUsed(); renderFlyer();
    const label = info.label || info[0] || "Figurinha";
    toast(`Figurinha “${label}” adicionada.`);
    el.stkUsed.lastElementChild?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function initStickers() {
    renderStickerGallery();
    document.querySelectorAll(".stk-set").forEach((b) => b.addEventListener("click", () => {
      stkSet = b.dataset.set || "3d";
      renderStickerGallery();
    }));
    el.stkGallery.addEventListener("click", (e) => {
      const b = e.target.closest(".stk-pick"); if (b) addSticker(b.dataset.kind);
    });
    el.stkUsed.addEventListener("input", (e) => {
      const item = e.target.closest(".stk-item"); if (!item) return;
      const s = (cur().stickers || []).find((x) => x.id === item.dataset.id); if (!s) return;
      if (e.target.dataset.act === "caption") { s.caption = e.target.value.slice(0, 48); persist(); renderFlyer(); }
    });
    el.stkUsed.addEventListener("change", (e) => {
      const item = e.target.closest(".stk-item"); if (!item) return;
      const s = (cur().stickers || []).find((x) => x.id === item.dataset.id); if (!s) return;
      if (e.target.dataset.act === "pos") { s.pos = e.target.value; persist(); renderFlyer(); }
    });
    el.stkUsed.addEventListener("click", (e) => {
      const item = e.target.closest(".stk-item"); if (!item) return;
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const list = cur().stickers || [], i = list.findIndex((x) => x.id === item.dataset.id); if (i < 0) return;
      if (btn.dataset.act === "size") { list[i].size = btn.dataset.size; persist(); renderStickerUsed(); renderFlyer(); }
      else if (btn.dataset.act === "remove") {
        const [removed] = list.splice(i, 1); const fid = state.currentId;
        persist(); renderStickerUsed(); renderFlyer();
        toast(`Figurinha removida.`, { undo: () => { const f = state.flyers.find((x) => x.id === fid); if (f) { f.stickers.splice(i, 0, removed); persist(); if (fid === state.currentId) { renderStickerUsed(); renderFlyer(); } } } });
      }
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
    const disc = f.disclaimer ?? SEG().disclaimer;
    const stks = (f.stickers || []).filter((s) => window.stickerInfo ? window.stickerInfo(s.kind) : window.STICKERS && window.STICKERS[s.kind]);
    const stkNode = (s) => {
      const raw = (s.caption || "").trim();
      const cap = (window.stickerCaptionOK ? window.stickerCaptionOK(s.kind, raw) : !!raw) ? raw : "";
      const mark = window.stickerMarkup ? window.stickerMarkup(s.kind) : window.stickerSVG(s.kind);
      return `<div class="fl-stk" data-pos="${esc(s.pos)}" data-size="${esc(s.size || "m")}">${mark}${cap ? `<span class="fl-stk-cap">${esc(cap)}</span>` : ""}</div>`;
    };
    const corners = stks.filter((s) => /^(tl|tr|bl|br)$/.test(s.pos)).map(stkNode).join("");
    const footStk = stks.filter((s) => String(s.pos).startsWith("footer")).map(stkNode).join("");
    return `<header class="fl-head"><div class="fl-brand">${logoHTML(b)}${hideName ? "" : `<div class="fl-brand-text"><div class="fl-name">${esc(b.name || "Nome da sua loja")}</div>${b.slogan ? `<div class="fl-tag">${esc(b.slogan)}</div>` : ""}</div>`}</div>
      <div class="fl-band"><h1 class="fl-title">${esc(f.title || "Ofertas da Semana")}</h1>${dates ? `<p class="fl-dates">${esc(dates)}</p>` : ""}</div></header>
      <div class="fl-body"><section class="fl-grid">${cards}</section>${corners}</div>
      <footer class="fl-foot">${footStk ? `<div class="fl-stk-foot">${footStk}</div>` : ""}${contacts.length ? `<div class="fl-contact">${contacts.join("")}</div>` : ""}${disc ? `<p class="fl-disc">${esc(disc)}</p>` : ""}</footer>`;
  }
  function applyFlyerAttrs(node, f, b) {
    const n = f.products.length, size = FORMAT_SIZE[f.format] || FORMAT_SIZE.story;
    const stks = f.stickers || [];
    const rank = { s: 1, m: 2, l: 3 }, sizeOf = (list) => {
      let m = 0; list.forEach((s) => { m = Math.max(m, rank[s.size] || 2); });
      return m ? ["", "s", "m", "l"][m] : "";
    };
    const top = stks.filter((s) => s.pos === "tl" || s.pos === "tr");
    const bot = stks.filter((s) => s.pos === "bl" || s.pos === "br");
    Object.assign(node.dataset, {
      format: f.format, theme: f.theme, count: String(n), cols: String(colsFor(f.format, n)), density: densityFor(n),
      stkTop: sizeOf(top), stkBottom: sizeOf(bot),
      stkTl: top.some((s) => s.pos === "tl") ? "1" : "", stkTr: top.some((s) => s.pos === "tr") ? "1" : "",
      stkBl: bot.some((s) => s.pos === "bl") ? "1" : "", stkBr: bot.some((s) => s.pos === "br") ? "1" : "",
    });
    node.style.width = size.w + "px"; node.style.height = size.h + "px";
    node.style.setProperty("--c1", safeColor(b.c1, NEUTRAL.c1)); node.style.setProperty("--c2", safeColor(b.c2, NEUTRAL.c2)); node.style.setProperty("--c3", safeColor(b.c3, NEUTRAL.c3));
  }
  function renderFlyer() {
    const f = cur(), b = state.brand;
    applyFlyerAttrs(el.flyer, f, b);
    el.flyer.innerHTML = flyerHTML(f, b);
    scalePreview();
    if (window.recolorStickers3D) window.recolorStickers3D(el.flyer, safeColor(b.c1, NEUTRAL.c1));
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
      <button type="button" data-a="rename" aria-label="Renomear ${esc(f.name)}">${ic("pencil")}</button>
      <button type="button" data-a="del" aria-label="Apagar ${esc(f.name)}">${ic("trash-2")}</button></div>`).join("");
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
    f.stickers = (f.stickers || []).map((s) => ({ ...s, id: uid("s") }));
    state.flyers.push(f); state.currentId = f.id; persist(); fillForm(); renderFlyer(); closeDialog($("dlg-flyers")); toast("Encarte duplicado.");
  });

  // ---------- onboarding ----------
  // Primeiro acesso: começa no passo 1, exige escolher o tipo de negócio e digitar o nome da loja (sem "Pular").
  let onbStep = 1;
  const onbRequired = () => !state.onboarded;
  function showOnb(step) {
    onbStep = step;
    document.querySelectorAll("#dlg-onboard .onb").forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
    document.querySelectorAll("#dlg-onboard .onb-dots span").forEach((d, i) => d.classList.toggle("on", i === step - 1));
    $("onb-next").textContent = step === 3 ? "Começar" : "Continuar";
    $("onb-skip").hidden = onbRequired();
    $("onb-back").hidden = !(onbRequired() && step > 1);
    onbError("");
  }
  function onbError(msg) { const e = $("onb-error"); if (!e) return; e.textContent = msg; e.hidden = !msg; }
  let onbSeg = null;
  function renderOnbSegs() {
    $("onb-seg").innerHTML = SEG_ORDER.map((k) => `<button type="button" class="biz-item" role="radio" aria-checked="${k === onbSeg}" data-seg="${k}"><span class="biz-emo" aria-hidden="true">${SEGS[k].emoji}</span><span>${esc(SEGS[k].label)}</span></button>`).join("");
    $("onb-store").placeholder = onbSeg ? "ex.: " + window.segmentOf(onbSeg).storeEx : "Nome da sua loja";
  }
  $("onb-seg").addEventListener("click", (e) => { const b = e.target.closest(".biz-item"); if (!b) return; onbSeg = b.dataset.seg; renderOnbSegs(); onbError(""); });
  function startOnboarding() {
    onbSeg = state.onboarded ? state.segment : null;
    renderOnbSegs();
    $("onb-store").value = isPresetName(state.brand.name) ? "" : state.brand.name;
    updateLogoChrome();
    showOnb(1); openDialog($("dlg-onboard"));
  }
  function validateOnbStep2() {
    if (!onbRequired()) return true;
    if (!onbSeg) { onbError("Escolha o tipo do seu negócio."); return false; }
    if (!$("onb-store").value.trim()) { onbError("Digite o nome da sua loja."); $("onb-store").focus(); return false; }
    return true;
  }
  function finishOnboarding() {
    const first = onbRequired();
    if (onbStep >= 2) {
      const name = $("onb-store").value.trim();
      if (onbSeg && (onbSeg !== state.segment || first)) {
        applySegment(onbSeg, { name, brand: true });
        if (first) state.brand.slogan = ""; // loja nova: slogan em branco (só o exemplo no campo)
      }
      else if (name) { state.brand.name = name; if (!PRESETS[state.brand.preset]) state.brand.preset = "custom"; }
    }
    state.onboarded = true; persist(); fillForm(); renderFlyer(); closeDialog($("dlg-onboard"));
  }
  const isPresetName = (n) => !n || Object.values(PRESETS).some((p) => p.name === n);
  // Troca o tipo de negócio: textos, sugestões, aviso, figurinhas; marca e exemplo só se ainda forem os padrões.
  function applySegment(k, opts = {}) {
    if (!SEGS[k]) return null;
    const prev = clone({ segment: state.segment, brand: state.brand, flyer: cur() });
    state.segment = k;
    const b = state.brand;
    if (opts.brand || b.preset !== "custom") {
      const keepName = opts.name || (isPresetName(b.name) ? "" : b.name);
      state.brand = { ...brandFromPreset(k, b), ...keepLogoFields(b) };
      if (keepName) state.brand.name = keepName;
    }
    const f = cur();
    if (isUntouchedSample(f)) Object.assign(f, sampleContent(k));
    if (f.disclaimer && Object.values(SEGS).some((s) => s.disclaimer === f.disclaimer)) f.disclaimer = null;
    persist(); fillForm(); renderFlyer(); renderStickerGallery();
    return prev;
  }
  $("onb-next").addEventListener("click", () => {
    if (onbStep === 2 && !validateOnbStep2()) return;
    if (onbStep < 3) showOnb(onbStep + 1); else finishOnboarding();
  });
  $("onb-back").addEventListener("click", () => { if (onbStep > 1) showOnb(onbStep - 1); });
  $("onb-store").addEventListener("input", () => onbError(""));
  $("onb-skip").addEventListener("click", () => { if (onbRequired()) return; onbStep = 1; finishOnboarding(); });
  $("dlg-onboard").addEventListener("cancel", (e) => { if (onbRequired()) { e.preventDefault(); return; } });
  // Se o navegador fechar a janela mesmo assim (Voltar do Android), reabre até terminar o primeiro acesso.
  $("dlg-onboard").addEventListener("close", () => { if (onbRequired()) setTimeout(() => { if (onbRequired()) { openDialog($("dlg-onboard")); showOnb(onbStep); } }, 0); });
  $("btn-help").addEventListener("click", startOnboarding);
  $("dlg-enhance").addEventListener("close", () => {
    $("dlg-enhance").classList.remove("is-logo");
    if (logoAiTitle) $("dlg-enhance-title").textContent = logoAiTitle;
  });

  // ---------- bindings ----------
  function bindForm() {
    const fl = (key) => (e) => { cur()[key] = e.target.value; persist(); renderFlyer(); };
    el.title.addEventListener("input", fl("title"));
    el.from.addEventListener("input", fl("dateFrom"));
    el.to.addEventListener("input", fl("dateTo"));
    el.disclaimer.addEventListener("input", fl("disclaimer"));
    $("btn-disc-reset").addEventListener("click", () => { cur().disclaimer = null; persist(); fillForm(); renderFlyer(); });
    $("title-chips").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; cur().title = c.textContent; el.title.value = c.textContent; persist(); renderFlyer(); });
    $("fld-segment").innerHTML = segOptions();
    $("fld-segment").addEventListener("change", (e) => {
      const k = e.target.value, prev = applySegment(k);
      if (!prev) return;
      toast(`Tipo de negócio: ${SEGS[k].label}.`, { undo: () => {
        state.segment = prev.segment; state.brand = prev.brand;
        const i = state.flyers.findIndex((x) => x.id === prev.flyer.id); if (i >= 0) state.flyers[i] = prev.flyer;
        persist(); fillForm(); renderFlyer(); renderStickerGallery();
      } });
    });

    const br = (key, getter) => (e) => { state.brand[key] = getter ? getter(e.target) : e.target.value; if (["name", "slogan", "c1", "c2", "c3", "mark"].includes(key)) { state.brand.preset = "custom"; el.preset.value = "custom"; } persist(); updateLogoChrome(); if (/^c\d$/.test(key)) { renderThemes(); applyStickerColors(); } renderFlyer(); };
    el.store.addEventListener("input", br("name")); el.slogan.addEventListener("input", br("slogan"));
    el.c1.addEventListener("input", br("c1")); el.c2.addEventListener("input", br("c2")); el.c3.addEventListener("input", br("c3"));
    el.mark.addEventListener("change", br("mark")); el.logoOnly.addEventListener("change", br("logoOnly", (t) => t.checked));
    el.address.addEventListener("input", br("address")); el.whatsapp.addEventListener("input", br("whatsapp")); el.instagram.addEventListener("input", br("instagram"));
    el.preset.addEventListener("change", () => {
      const k = el.preset.value; if (!(k in PRESETS)) return;
      const prev = clone(state.brand);
      state.brand = { ...brandFromPreset(k, state.brand), ...keepLogoFields(state.brand) };
      persist(); fillForm(); renderFlyer();
      toast(`Marca “${PRESETS[k].label}” aplicada.`, { undo: () => { state.brand = prev; persist(); fillForm(); renderFlyer(); } });
    });
    const onLogoFile = async (e) => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
      try { await applyLogoFile(file); } catch (err) { toast(err.message, { error: true }); }
    };
    [el.logo, el.logoCam, $("onb-logo"), $("onb-logo-cam")].filter(Boolean).forEach((n) => n.addEventListener("change", onLogoFile));
    [el.logoClear, $("onb-logo-clear")].filter(Boolean).forEach((n) => n.addEventListener("click", clearLogo));
    [el.logoCutout, $("onb-logo-cutout")].filter(Boolean).forEach((n) => n.addEventListener("change", (e) => { setLogoCutout(e.target.checked); }));

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
      if (window.recolorStickers3D) await window.recolorStickers3D(node, safeColor(state.brand.c1, NEUTRAL.c1));
      await document.fonts.ready; await waitImgs(node);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const blob = await window.htmlToImage.toBlob(node, { pixelRatio: 1, canvasWidth: size.w, canvasHeight: size.h, width: size.w, height: size.h, backgroundColor: getComputedStyle(node).backgroundColor || "#fff" });
      if (!blob) throw new Error("A exportação não gerou a imagem.");
      return blob;
    } finally { node.remove(); cover.remove(); }
  }
  async function exportPng(share) {
    if ($("dlg-export").open) closeDialog($("dlg-export"));
    const btn = share ? $("btn-share") : $("btn-png"), old = btn.innerHTML;
    btn.disabled = true;
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
    finally { btn.disabled = false; btn.innerHTML = old; }
  }
  function printA4() {
    if ($("dlg-export").open) closeDialog($("dlg-export"));
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

  // ---------- modern chrome: dark mode + tab bar ----------
  function applyMode(dark) {
    document.documentElement.dataset.mode = dark ? "dark" : "light";
    $("btn-theme-mode").innerHTML = ic(dark ? "sun" : "moon");
    $("btn-theme-mode").setAttribute("aria-pressed", String(dark));
    document.querySelector('meta[name="theme-color"]').content = dark ? "#0b1020" : "#1C3FAA";
  }
  function initChrome() {
    let saved = null; try { saved = localStorage.getItem("vitrine-mode"); } catch {}
    applyMode(saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
    $("btn-theme-mode").addEventListener("click", () => { const d = document.documentElement.dataset.mode !== "dark"; applyMode(d); try { localStorage.setItem("vitrine-mode", d ? "dark" : "light"); } catch {} });
    const tabs = [...document.querySelectorAll(".tab[data-go]")];
    const smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    tabs.forEach((b) => b.addEventListener("click", () => { const s = $(b.dataset.go); const y = s.getBoundingClientRect().top + scrollY - 76; scrollTo({ top: Math.max(0, y), behavior: smooth }); }));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) tabs.forEach((t) => t.classList.toggle("active", t.dataset.go === e.target.id)); }), { rootMargin: "-40% 0px -55% 0px" });
      tabs.forEach((t) => io.observe($(t.dataset.go)));
    }
    $("btn-export").addEventListener("click", () => openDialog($("dlg-export")));
  }

  // ---------- boot ----------
  async function boot() {
    let saved = await storeGet();
    if (!saved) saved = migrateLegacy();
    state = normalize(saved);
    bindForm(); initStickers(); fillForm(); renderFlyer(); initSortable(); initChrome();
    window.addEventListener("resize", () => scalePreview());
    if (!state.onboarded) startOnboarding();
    if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
    window.__vitrine = { get state() { return state; }, renderPngBlob, renderFlyer, renderStickerUI, renderStickerGallery, openEnhance, openCrop, applyLogoFile, shrinkLogo, updateLogoChrome, persist, fillForm, setStickerSet(s) { stkSet = s; renderStickerGallery(); } };
  }
  boot();
})();
