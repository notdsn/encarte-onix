/* Figurinhas 3D — arte original Nextwave Studio Brasil. Recoloração no aparelho (matiz da área vermelha → cor principal da marca). */
(function () {
  "use strict";
  const BASE = "stickers/3d/";
  const KEY_HUE = 1;          /* graus — vermelho puro das artes */
  const HUE_RANGE = 14;       /* raio em graus com queda suave */
  const SAT_MIN = 0.55;
  const SAT_FULL = 0.72;
  const C = {
    "3d-motoboy":       ["Motoboy", "motoboy.webp"],
    "3d-farmaceutico":  ["Farmacêutico", "farmaceutico.webp"],
    "3d-carrinho":      ["Carrinho", "carrinho.webp"],
    "3d-sacola":        ["Sacola", "sacola.webp"],
    "3d-presente":      ["Presente", "presente.webp"],
    "3d-megafone":      ["Megafone", "megafone.webp"],
    "3d-mascote":       ["Mascote", "mascote.webp"],
    "3d-fogo":          ["Imperdível", "fogo.webp"],
    "3d-relogio":       ["Só hoje", "relogio.webp"],
    "3d-etiqueta":      ["Desconto", "etiqueta.webp"],
    "3d-coracao":       ["Coração", "coracao.webp"],
    "3d-local":         ["Localização", "local.webp"],
  };
  const CAPTIONS = {
    "3d-motoboy": "Entregamos em casa!",
    "3d-farmaceutico": "Consulte o farmacêutico",
    "3d-carrinho": "Leve mais por menos",
    "3d-sacola": "Compre e economize",
    "3d-presente": "Ideal para presentear",
    "3d-megafone": "Oferta relâmpago",
    "3d-mascote": "A gente recomenda!",
    "3d-fogo": "Imperdível",
    "3d-relogio": "Só hoje",
    "3d-etiqueta": "Super desconto",
    "3d-coracao": "Cuide da sua saúde",
    "3d-local": "Venha nos visitar",
  };

  window.STICKERS_3D = {};
  Object.keys(C).forEach((id) => {
    window.STICKERS_3D[id] = { label: C[id][0], src: BASE + C[id][1], file: C[id][1], keyHue: KEY_HUE };
  });
  window.STICKER_CAPTIONS = Object.assign(window.STICKER_CAPTIONS || {}, CAPTIONS);

  window.stickerInfo = function (id) {
    if (window.STICKERS_3D && window.STICKERS_3D[id]) {
      const s = window.STICKERS_3D[id];
      return { id, label: s.label, set: "3d", type: "img", src: s.src };
    }
    if (window.STICKERS && window.STICKERS[id]) {
      return { id, label: window.STICKERS[id][0], set: "classicas", type: "svg" };
    }
    return null;
  };
  window.stickerMarkup = function (id) {
    const info = window.stickerInfo(id);
    if (!info) return "";
    if (info.type === "svg") return window.stickerSVG(id);
    return `<img class="stk stk-3d" data-kind="${id}" alt="" src="${info.src}" width="512" height="512" draggable="false">`;
  };
  window.stickerIds = function (set) {
    if (set === "3d") return Object.keys(window.STICKERS_3D || {});
    if (set === "classicas") return Object.keys(window.STICKERS || {});
    return Object.keys(window.STICKERS_3D || {}).concat(Object.keys(window.STICKERS || {}));
  };

  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "");
    if (h.length !== 6) return { r: 214, g: 30, b: 38 };
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h, s: max ? d / max : 0, v: max };
  }
  function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  function hueDist(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }
  function lerpHue(from, to, w) {
    const d = ((to - from + 540) % 360) - 180;
    return (from + d * w + 360) % 360;
  }

  const originals = new Map();
  const cache = new Map();
  const pending = new Map();

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Falha ao carregar figurinha"));
      im.src = src;
    });
  }
  async function getOriginal(id) {
    if (originals.has(id)) return originals.get(id);
    const meta = window.STICKERS_3D[id];
    if (!meta) throw new Error("figurinha 3D desconhecida");
    const im = await loadImg(meta.src);
    const c = document.createElement("canvas");
    c.width = im.naturalWidth || 512;
    c.height = im.naturalHeight || 512;
    const ctx = c.getContext("2d");
    ctx.drawImage(im, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    originals.set(id, data);
    return data;
  }
  function shiftPixels(src, targetHue, keyHue) {
    const data = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    const d = data.data;
    const range = HUE_RANGE;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 10) continue;
      const hsv = rgbToHsv(d[i], d[i + 1], d[i + 2]);
      if (hsv.s < SAT_MIN) continue;
      const dist = hueDist(hsv.h * 360, keyHue);
      if (dist > range) continue;
      let w = 1 - dist / range;
      w = w * w * (3 - 2 * w);
      if (hsv.s < SAT_FULL) w *= (hsv.s - SAT_MIN) / (SAT_FULL - SAT_MIN);
      if (w <= 0.01) continue;
      const nh = lerpHue(hsv.h * 360, targetHue, w) / 360;
      const [nr, ng, nb] = hsvToRgb(nh, hsv.s, hsv.v);
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    }
    return data;
  }
  async function recolor(id, c1) {
    const color = String(c1 || "#2563EB").toLowerCase();
    const key = id + "|" + color;
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);
    const work = (async () => {
      const src = await getOriginal(id);
      const rgb = hexToRgb(color);
      const target = rgbToHsv(rgb.r, rgb.g, rgb.b);
      const keyHue = (window.STICKERS_3D[id] && window.STICKERS_3D[id].keyHue) || KEY_HUE;
      const shifted = shiftPixels(src, target.h * 360, keyHue);
      const c = document.createElement("canvas");
      c.width = src.width; c.height = src.height;
      c.getContext("2d").putImageData(shifted, 0, 0);
      let url;
      try { url = c.toDataURL("image/webp", 0.92); } catch { url = c.toDataURL("image/png"); }
      cache.set(key, url);
      return url;
    })();
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  }

  async function apply(root, c1) {
    if (!root) return;
    const imgs = [...root.querySelectorAll("img.stk-3d")];
    if (!imgs.length) return;
    await Promise.all(imgs.map(async (img) => {
      const id = img.dataset.kind;
      if (!window.STICKERS_3D[id]) return;
      try {
        const url = await recolor(id, c1);
        if (img.getAttribute("src") !== url) {
          img.src = url;
          if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
        }
      } catch (err) { console.warn("recolor 3D", id, err); }
    }));
  }

  window.recolorStickers3D = apply;
  window.recolorSticker3D = recolor;
})();
