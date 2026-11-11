(function () {
  "use strict";

  const STORAGE_KEY = "encarte-onix-v1";
  const MAX_PRODUCTS = 12;
  const DEFAULT_DISCLAIMER =
    "Imagens ilustrativas. Ofertas válidas enquanto durarem os estoques. Consulte o farmacêutico. Medicamentos podem causar efeitos adversos: leia a bula e, quando exigido, apresente a receita.";
  const TAGLINE = "Cuidar de você é com a gente";
  const WORDMARK = "Drogarias Ônix";
  const DEFAULT_MARK = "icons/mark.png";

  const BADGE_PRESETS = [
    "",
    "Oferta",
    "Novidade",
    "Mais vendido",
    "Leve 2 pague 1",
    "Leve 3 pague 2",
    "Limite por cliente",
  ];

  const FORMAT_SIZE = {
    story: { w: 1080, h: 1920 },
    feed: { w: 1080, h: 1080 },
    a4: { w: 1240, h: 1754 },
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    flyer: $("flyer"),
    scale: $("flyer-scale"),
    frame: $("preview-frame"),
    title: $("fld-title"),
    from: $("fld-from"),
    to: $("fld-to"),
    address: $("fld-address"),
    whatsapp: $("fld-whatsapp"),
    instagram: $("fld-instagram"),
    logo: $("fld-logo"),
    logoImg: $("logo-img"),
    logoClear: $("btn-logo-clear"),
    logoOnly: $("fld-logo-only"),
    logoOnlyWrap: $("logo-only-wrap"),
    disclaimer: $("fld-disclaimer"),
    list: $("product-list"),
    count: $("product-count"),
    add: $("btn-add"),
    toast: $("toast"),
    fs: $("fs-overlay"),
    fsInner: $("fs-inner"),
  };

  function todayISO() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function addDaysISO(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }

  function formatDateBR(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  }

  function uid() {
    return "p" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function parseBRL(str) {
    if (str == null || str === "") return null;
    let s = String(str).trim().replace(/[R$\s]/gi, "");
    if (!s) return null;
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function formatBRL(n) {
    if (n == null || !Number.isFinite(Number(n))) return "";
    return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function discountPct(oldP, newP) {
    if (oldP == null || newP == null) return null;
    const a = Number(oldP);
    const b = Number(newP);
    if (!(a > 0) || !(b >= 0) || b >= a) return null;
    return Math.round((1 - b / a) * 100);
  }

  function densityFor(n) {
    if (n <= 1) return "hero";
    if (n <= 4) return "comfortable";
    if (n <= 8) return "dense";
    return "compact";
  }

  function colsFor(format, n) {
    if (n <= 1) return 1;
    if (format === "feed") {
      if (n <= 4) return 2;
      if (n <= 9) return 3;
      return 4;
    }
    if (format === "a4") {
      if (n === 2) return 2;
      if (n <= 4) return 2;
      if (n <= 9) return 3;
      return 4;
    }
    if (n === 2) return 1;
    if (n <= 6) return 2;
    return 3;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sampleProducts() {
    return [
      { id: uid(), name: "Vitamina C 1g", details: "caixa com 30 comprimidos", oldPrice: 24.9, newPrice: 16.9, photo: "", badge: "" },
      { id: uid(), name: "Dipirona 500mg", details: "caixa com 20 comprimidos", oldPrice: 12.9, newPrice: 8.99, photo: "", badge: "" },
      { id: uid(), name: "Protetor Solar FPS 60", details: "frasco 120 ml", oldPrice: 79.9, newPrice: 54.9, photo: "", badge: "Oferta" },
      { id: uid(), name: "Fralda geriátrica G", details: "pacote com 30 unidades", oldPrice: 69.9, newPrice: 49.9, photo: "", badge: "Leve 3 pague 2" },
      { id: uid(), name: "Shampoo antiqueda", details: "frasco 300 ml", oldPrice: 39.9, newPrice: 27.9, photo: "", badge: "" },
      { id: uid(), name: "Magnésio 260mg", details: "frasco com 60 comprimidos", oldPrice: 14.9, newPrice: 9.99, photo: "", badge: "" },
    ];
  }

  function defaultState() {
    const from = todayISO();
    return {
      theme: "classico",
      format: "story",
      title: "Ofertas da Semana",
      dateFrom: from,
      dateTo: addDaysISO(from, 6),
      address: "",
      whatsapp: "",
      instagram: "",
      logo: "",
      logoOnly: false,
      disclaimer: DEFAULT_DISCLAIMER,
      products: sampleProducts(),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const data = JSON.parse(raw);
      const base = defaultState();
      const merged = { ...base, ...data };
      if (!Array.isArray(merged.products)) merged.products = [];
      merged.products = merged.products.slice(0, MAX_PRODUCTS).map((p) => ({
        id: p.id || uid(),
        name: p.name || "",
        details: p.details || "",
        oldPrice: p.oldPrice == null || p.oldPrice === "" ? null : Number(p.oldPrice),
        newPrice: p.newPrice == null || p.newPrice === "" ? null : Number(p.newPrice),
        photo: p.photo || "",
        badge: p.badge || "",
      }));
      return merged;
    } catch (err) {
      console.warn("Não foi possível ler o encarte salvo:", err);
      return defaultState();
    }
  }

  let state = loadState();
  let saveTimer = 0;

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        toast("Não deu para salvar: o armazenamento do navegador está cheio. Remova algumas fotos ou exporte o JSON.", true);
        console.warn(err);
      }
    }, 200);
  }

  function toast(msg, isError) {
    const t = el.toast;
    t.hidden = false;
    t.classList.toggle("error", !!isError);
    t.textContent = msg;
    clearTimeout(toast._id);
    toast._id = setTimeout(() => {
      t.hidden = true;
    }, 3200);
  }

  function compressImage(file, maxSize, quality, mime) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(mime || "image/jpeg", quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler a imagem."));
      };
      img.src = url;
    });
  }

  async function readUpload(file, kind) {
    if (!file || !file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
    const keepAlpha = /png|webp|svg/i.test(file.type) && kind === "logo";
    if (keepAlpha && file.size < 800_000) {
      return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }
    const max = kind === "logo" ? 700 : 900;
    const quality = kind === "logo" ? 0.9 : 0.82;
    const mime = keepAlpha ? "image/png" : "image/jpeg";
    return compressImage(file, max, quality, mime);
  }

  function fillForm() {
    el.title.value = state.title || "";
    el.from.value = state.dateFrom || "";
    el.to.value = state.dateTo || "";
    el.address.value = state.address || "";
    el.whatsapp.value = state.whatsapp || "";
    el.instagram.value = state.instagram || "";
    el.disclaimer.value = state.disclaimer || "";
    el.logoOnly.checked = !!state.logoOnly;
    document.querySelectorAll('input[name="format"]').forEach((i) => {
      i.checked = i.value === state.format;
    });
    document.querySelectorAll('input[name="theme"]').forEach((i) => {
      i.checked = i.value === state.theme;
    });
    updateLogoChrome();
    renderProductList();
  }

  function updateLogoChrome() {
    el.logoImg.src = state.logo || DEFAULT_MARK;
    el.logoClear.hidden = !state.logo;
    el.logoOnlyWrap.hidden = !state.logo;
  }

  function renderProductList() {
    el.list.innerHTML = "";
    state.products.forEach((p, idx) => {
      el.list.appendChild(productCard(p, idx));
    });
    el.count.textContent = `(${state.products.length}/${MAX_PRODUCTS})`;
    el.add.disabled = state.products.length >= MAX_PRODUCTS;
  }

  function productCard(p, idx) {
    const wrap = document.createElement("article");
    wrap.className = "p-card";
    wrap.dataset.id = p.id;
    const off = discountPct(p.oldPrice, p.newPrice);
    const options = BADGE_PRESETS.map((b) => {
      const sel = b === (p.badge || "") ? " selected" : "";
      const label = b || "Sem selo";
      return `<option value="${escapeHtml(b)}"${sel}>${escapeHtml(label)}</option>`;
    }).join("");
    const custom = p.badge && !BADGE_PRESETS.includes(p.badge);
    wrap.innerHTML = `
      <div class="p-top">
        <label class="p-photo ${p.photo ? "has-img" : ""}">
          ${p.photo ? `<img src="${p.photo}" alt="">` : "Toque para foto"}
          <input type="file" accept="image/*" data-act="photo">
        </label>
        <div class="p-fields">
          <label class="field">Nome
            <input type="text" data-act="name" maxlength="60" value="${escapeHtml(p.name)}" placeholder="Nome do produto">
          </label>
          <label class="field">Detalhes
            <input type="text" data-act="details" maxlength="80" value="${escapeHtml(p.details)}" placeholder="ex.: caixa 30 comprimidos">
          </label>
        </div>
      </div>
      <div class="p-prices">
        <label class="field">De (preço antigo)
          <input type="text" inputmode="decimal" data-act="oldPrice" value="${p.oldPrice == null ? "" : formatInputPrice(p.oldPrice)}" placeholder="R$ 0,00">
        </label>
        <label class="field">Por (preço novo)
          <input type="text" inputmode="decimal" data-act="newPrice" value="${p.newPrice == null ? "" : formatInputPrice(p.newPrice)}" placeholder="R$ 0,00">
        </label>
        <div class="p-off ${off == null ? "is-empty" : ""}">${off == null ? "—" : "-" + off + "%"}</div>
      </div>
      <label class="field">Selo
        <input type="text" list="badge-list-${p.id}" data-act="badge" maxlength="32" value="${escapeHtml(p.badge)}" placeholder="ex.: Leve 3 pague 2">
        <datalist id="badge-list-${p.id}">${options}</datalist>
      </label>
      <div class="p-actions">
        <div class="p-move">
          <button type="button" data-act="up" ${idx === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
          <button type="button" data-act="down" ${idx === state.products.length - 1 ? "disabled" : ""} aria-label="Descer">↓</button>
        </div>
        ${p.photo ? `<button type="button" class="btn-text" data-act="nophoto">Tirar foto</button>` : ""}
        <button type="button" class="p-remove" data-act="remove">Remover</button>
      </div>
    `;
    wrap.addEventListener("input", onProductInput);
    wrap.addEventListener("change", onProductInput);
    wrap.addEventListener("click", onProductClick);
    wrap.addEventListener("focusout", onProductBlur);
    return wrap;
  }

  function formatInputPrice(n) {
    return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function productById(id) {
    return state.products.find((p) => p.id === id);
  }

  function onProductInput(ev) {
    const act = ev.target.dataset.act;
    const id = ev.currentTarget.dataset.id;
    const p = productById(id);
    if (!p) return;
    if (act === "name") p.name = ev.target.value;
    else if (act === "details") p.details = ev.target.value;
    else if (act === "badge") p.badge = ev.target.value;
    else if (act === "oldPrice" || act === "newPrice") {
      p[act] = parseBRL(ev.target.value);
      const off = discountPct(p.oldPrice, p.newPrice);
      const badge = ev.currentTarget.querySelector(".p-off");
      if (badge) {
        badge.textContent = off == null ? "—" : "-" + off + "%";
        badge.classList.toggle("is-empty", off == null);
      }
    } else if (act === "photo" && ev.target.files && ev.target.files[0]) {
      const file = ev.target.files[0];
      ev.target.value = "";
      readUpload(file, "product")
        .then((data) => {
          p.photo = data;
          persist();
          renderProductList();
          renderFlyer();
        })
        .catch((err) => toast(err.message || "Não deu para usar essa foto.", true));
      return;
    } else {
      return;
    }
    persist();
    renderFlyer();
  }

  function onProductBlur(ev) {
    const act = ev.target.dataset.act;
    if (act !== "oldPrice" && act !== "newPrice") return;
    const p = productById(ev.currentTarget.dataset.id);
    if (!p) return;
    ev.target.value = p[act] == null ? "" : formatInputPrice(p[act]);
  }

  function onProductClick(ev) {
    const btn = ev.target.closest("[data-act]");
    if (!btn || btn.tagName !== "BUTTON") return;
    const id = ev.currentTarget.dataset.id;
    const i = state.products.findIndex((p) => p.id === id);
    if (i < 0) return;
    const act = btn.dataset.act;
    if (act === "remove") {
      state.products.splice(i, 1);
    } else if (act === "up" && i > 0) {
      const [it] = state.products.splice(i, 1);
      state.products.splice(i - 1, 0, it);
    } else if (act === "down" && i < state.products.length - 1) {
      const [it] = state.products.splice(i, 1);
      state.products.splice(i + 1, 0, it);
    } else if (act === "nophoto") {
      state.products[i].photo = "";
    } else {
      return;
    }
    persist();
    renderProductList();
    renderFlyer();
  }

  function datesLine() {
    const a = formatDateBR(state.dateFrom);
    const b = formatDateBR(state.dateTo);
    if (a && b) return `Ofertas válidas de ${a} a ${b}`;
    if (a) return `Ofertas válidas a partir de ${a}`;
    if (b) return `Ofertas válidas até ${b}`;
    return "";
  }

  function contactBits() {
    const bits = [];
    if (state.address && state.address.trim()) bits.push(`<span>${escapeHtml(state.address.trim())}</span>`);
    if (state.whatsapp && state.whatsapp.trim()) bits.push(`<span>WhatsApp ${escapeHtml(state.whatsapp.trim())}</span>`);
    if (state.instagram && state.instagram.trim()) {
      let ig = state.instagram.trim();
      if (!ig.startsWith("@") && !ig.includes("instagram.com")) ig = "@" + ig.replace(/^@/, "");
      bits.push(`<span>${escapeHtml(ig)}</span>`);
    }
    return bits;
  }

  function renderFlyer() {
    const n = state.products.length;
    const format = state.format || "story";
    const theme = state.theme || "classico";
    const flyer = el.flyer;
    flyer.dataset.format = format;
    flyer.dataset.theme = theme;
    flyer.dataset.count = String(n);
    flyer.dataset.cols = String(colsFor(format, n));
    flyer.dataset.density = densityFor(n);
    const size = FORMAT_SIZE[format] || FORMAT_SIZE.story;
    flyer.style.width = size.w + "px";
    flyer.style.height = size.h + "px";

    const logoSrc = state.logo || DEFAULT_MARK;
    const hideName = !!(state.logo && state.logoOnly);
    const dates = datesLine();
    const contacts = contactBits();

    const cards = n
      ? state.products
          .map((p) => {
            const off = discountPct(p.oldPrice, p.newPrice);
            const letter = (p.name || "?").trim().charAt(0).toUpperCase() || "?";
            const photo = p.photo
              ? `<img src="${p.photo}" alt="">`
              : `<span class="card-mono">${escapeHtml(letter)}</span>`;
            const badge = p.badge ? `<span class="card-badge">${escapeHtml(p.badge)}</span>` : "";
            const offEl = off != null ? `<span class="card-off">-${off}%</span>` : "";
            const de = p.oldPrice != null ? `<span class="card-de">de ${formatBRL(p.oldPrice)}</span>` : "";
            const por =
              p.newPrice != null
                ? `<span class="card-por"><small>por</small> ${formatBRL(p.newPrice)}</span>`
                : p.oldPrice != null
                ? `<span class="card-por">${formatBRL(p.oldPrice)}</span>`
                : "";
            return `<article class="card">
              <div class="card-photo">${badge}${offEl}${photo}</div>
              <h2 class="card-name">${escapeHtml(p.name || "Produto")}</h2>
              ${p.details ? `<p class="card-det">${escapeHtml(p.details)}</p>` : ""}
              <div class="card-prices">${de}${por}</div>
            </article>`;
          })
          .join("")
      : `<div class="fl-empty">Adicione produtos ao encarte</div>`;

    flyer.innerHTML = `
      <header class="fl-head">
        <div class="fl-brand">
          <div class="fl-logo"><img src="${logoSrc}" alt=""></div>
          ${
            hideName
              ? ""
              : `<div><div class="fl-name">${WORDMARK}</div><div class="fl-tag">${TAGLINE}</div></div>`
          }
        </div>
        <div class="fl-band">
          <h1 class="fl-title">${escapeHtml(state.title || "Ofertas da Semana")}</h1>
          ${dates ? `<p class="fl-dates">${escapeHtml(dates)}</p>` : ""}
        </div>
      </header>
      <section class="fl-grid">${cards}</section>
      <footer class="fl-foot">
        ${contacts.length ? `<div class="fl-contact">${contacts.join("")}</div>` : ""}
        <p class="fl-disc">${escapeHtml(state.disclaimer || DEFAULT_DISCLAIMER)}</p>
      </footer>
    `;
    scalePreview();
  }

  function scalePreview(targetFrame, targetScale, targetFlyer) {
    const frame = targetFrame || el.frame;
    const scaleEl = targetScale || el.scale;
    const flyer = targetFlyer || el.flyer;
    const size = FORMAT_SIZE[flyer.dataset.format] || FORMAT_SIZE.story;
    const avail = frame.clientWidth || 1;
    const scale = Math.min(1, avail / size.w);
    scaleEl.style.width = size.w + "px";
    scaleEl.style.height = size.h + "px";
    scaleEl.style.transform = `scale(${scale})`;
    frame.style.height = Math.round(size.h * scale) + "px";
  }

  function bindForm() {
    const sync = (key, getter) => (ev) => {
      state[key] = getter ? getter(ev.target) : ev.target.value;
      persist();
      renderFlyer();
    };
    el.title.addEventListener("input", sync("title"));
    el.from.addEventListener("input", sync("dateFrom"));
    el.to.addEventListener("input", sync("dateTo"));
    el.address.addEventListener("input", sync("address"));
    el.whatsapp.addEventListener("input", sync("whatsapp"));
    el.instagram.addEventListener("input", sync("instagram"));
    el.disclaimer.addEventListener("input", sync("disclaimer"));
    el.logoOnly.addEventListener("change", sync("logoOnly", (t) => t.checked));

    document.querySelectorAll('input[name="format"]').forEach((i) => {
      i.addEventListener("change", () => {
        if (i.checked) {
          state.format = i.value;
          persist();
          renderFlyer();
        }
      });
    });
    document.querySelectorAll('input[name="theme"]').forEach((i) => {
      i.addEventListener("change", () => {
        if (i.checked) {
          state.theme = i.value;
          persist();
          renderFlyer();
        }
      });
    });

    el.logo.addEventListener("change", async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!file) return;
      try {
        state.logo = await readUpload(file, "logo");
        persist();
        updateLogoChrome();
        renderFlyer();
      } catch (err) {
        toast(err.message || "Não deu para usar esse logo.", true);
      }
    });
    el.logoClear.addEventListener("click", () => {
      state.logo = "";
      state.logoOnly = false;
      el.logoOnly.checked = false;
      persist();
      updateLogoChrome();
      renderFlyer();
    });

    el.add.addEventListener("click", () => {
      if (state.products.length >= MAX_PRODUCTS) return;
      state.products.push({
        id: uid(),
        name: "",
        details: "",
        oldPrice: null,
        newPrice: null,
        photo: "",
        badge: "",
      });
      persist();
      renderProductList();
      renderFlyer();
      const last = el.list.querySelector(".p-card:last-child input[data-act='name']");
      if (last) last.focus();
    });

    $("btn-png").addEventListener("click", () => exportPng({ share: false }));
    $("btn-share").addEventListener("click", () => exportPng({ share: true }));
    $("btn-print").addEventListener("click", printA4);
    $("btn-export-json").addEventListener("click", exportJson);
    $("fld-import-json").addEventListener("change", importJson);
    $("btn-sample").addEventListener("click", () => {
      if (!confirm("Isso substitui o encarte atual pelo exemplo. Continuar?")) return;
      const keepContacts = {
        address: state.address,
        whatsapp: state.whatsapp,
        instagram: state.instagram,
        logo: state.logo,
        logoOnly: state.logoOnly,
      };
      state = { ...defaultState(), ...keepContacts };
      persist();
      fillForm();
      renderFlyer();
      toast("Exemplo carregado.");
    });
    $("btn-clear").addEventListener("click", () => {
      if (!confirm("Apagar todos os produtos e voltar ao encarte em branco?")) return;
      const from = todayISO();
      state.products = [];
      state.title = "Ofertas da Semana";
      state.dateFrom = from;
      state.dateTo = addDaysISO(from, 6);
      state.disclaimer = DEFAULT_DISCLAIMER;
      persist();
      fillForm();
      renderFlyer();
    });

    $("btn-fullscreen").addEventListener("click", openFullscreen);
    $("btn-fs-close").addEventListener("click", closeFullscreen);
    el.fs.addEventListener("click", (ev) => {
      if (ev.target === el.fs) closeFullscreen();
    });
  }

  function fileName() {
    const raw = (state.title || "encarte-onix")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "encarte-onix";
    return `${raw}-${state.format}.png`;
  }

  function waitForImages(root) {
    const imgs = [...root.querySelectorAll("img")];
    return Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );
  }

  async function renderPngBlob() {
    if (!window.htmlToImage || typeof window.htmlToImage.toBlob !== "function") {
      throw new Error("A biblioteca de exportação não carregou.");
    }
    const size = FORMAT_SIZE[state.format] || FORMAT_SIZE.story;
    const src = el.flyer;
    // html-to-image captura em branco se o nó estiver fora da viewport.
    // Clona na tela e cobre com um aviso enquanto gera.
    const cover = document.createElement("div");
    cover.setAttribute("role", "status");
    cover.style.cssText = "position:fixed;inset:0;z-index:9998;background:rgba(16,32,84,.55);display:grid;place-items:center;color:#fff;font-weight:800;font-family:Nunito,sans-serif;font-size:18px;";
    cover.textContent = "Gerando imagem…";
    const clone = src.cloneNode(true);
    clone.id = "flyer-export";
    clone.style.cssText = `position:fixed;left:0;top:0;margin:0;transform:none;z-index:9997;width:${size.w}px;height:${size.h}px;`;
    document.body.appendChild(clone);
    document.body.appendChild(cover);
    try {
      await document.fonts.ready;
      await waitForImages(clone);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const blob = await window.htmlToImage.toBlob(clone, {
        pixelRatio: 1,
        canvasWidth: size.w,
        canvasHeight: size.h,
        width: size.w,
        height: size.h,
        backgroundColor: getComputedStyle(clone).backgroundColor || "#ffffff",
        cacheBust: true,
        style: { transform: "none", left: "0px", top: "0px" },
      });
      if (!blob) throw new Error("A exportação não gerou a imagem.");
      return blob;
    } finally {
      clone.remove();
      cover.remove();
    }
  }

  async function exportPng({ share }) {
    const btn = share ? $("btn-share") : $("btn-png");
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Gerando…";
    try {
      const blob = await renderPngBlob();
      const name = fileName();
      const file = new File([blob], name, { type: "image/png" });
      if (share && navigator.share) {
        const payload = { files: [file], title: state.title || WORDMARK, text: `${WORDMARK} — ${state.title || "Ofertas"}` };
        const can = !navigator.canShare || navigator.canShare(payload);
        if (can) {
          try {
            await navigator.share(payload);
            toast("Encarte compartilhado.");
            return;
          } catch (err) {
            if (err && err.name === "AbortError") return;
          }
        }
      }
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
      toast(share ? "O compartilhar não está disponível neste navegador. O PNG foi baixado." : "PNG salvo.");
    } catch (err) {
      console.error(err);
      toast(err.message || "Não deu para gerar o PNG.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function printA4() {
    const prev = state.format;
    if (prev !== "a4") {
      state.format = "a4";
      document.querySelectorAll('input[name="format"]').forEach((i) => {
        i.checked = i.value === "a4";
      });
      renderFlyer();
    }
    const restore = () => {
      if (prev !== "a4") {
        state.format = prev;
        document.querySelectorAll('input[name="format"]').forEach((i) => {
          i.checked = i.value === prev;
        });
        renderFlyer();
      }
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    setTimeout(() => window.print(), 50);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "encarte-onix-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Backup JSON baixado.");
  }

  function importJson(ev) {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object") throw new Error("Arquivo inválido.");
        const base = defaultState();
        state = { ...base, ...data };
        if (!Array.isArray(state.products)) state.products = [];
        state.products = state.products.slice(0, MAX_PRODUCTS);
        persist();
        fillForm();
        renderFlyer();
        toast("Backup importado.");
      } catch (err) {
        toast("Não deu para importar esse JSON.", true);
      }
    };
    reader.readAsText(file);
  }

  function openFullscreen() {
    el.fs.hidden = false;
    const holder = document.createElement("div");
    holder.className = "preview-frame";
    holder.style.width = "min(100%, 420px)";
    const scale = document.createElement("div");
    scale.className = "flyer-scale";
    const clone = el.flyer.cloneNode(true);
    clone.id = "flyer-fs";
    scale.appendChild(clone);
    holder.appendChild(scale);
    el.fsInner.innerHTML = "";
    el.fsInner.appendChild(holder);
    requestAnimationFrame(() => scalePreview(holder, scale, clone));
  }

  function closeFullscreen() {
    el.fs.hidden = true;
    el.fsInner.innerHTML = "";
  }

  window.addEventListener("resize", () => scalePreview());
  window.addEventListener("orientationchange", () => setTimeout(() => scalePreview(), 200));

  bindForm();
  fillForm();
  renderFlyer();
  window.addEventListener("load", () => scalePreview());
})();
