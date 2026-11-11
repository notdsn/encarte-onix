/* Deixar bonita com IA — v2.2.1
 * Recorte principal: IS-Net (DIS, "isnet-general-use", Apache-2.0), pesos em 8 bits (~44 MiB).
 * Modo leve / reserva: U²-Net u2netp (Apache-2.0, ~4,4 MiB).
 * Motor: ONNX Runtime Web 1.17.3 (MIT). Tudo roda no aparelho, nada é enviado.
 */
(function () {
  "use strict";

  const CACHE = "vitrine-ai-v1";
  const WASM_BYTES = 10551547;
  const ORT_JS_BYTES = 145070;
  const MODELS = {
    isnet: { file: "isnet-u8.onnx", bytes: 46539271, label: "IS-Net (DIS) 8 bits", mean: [0.5, 0.5, 0.5], std: [1, 1, 1], dynamic: true },
    u2netp: { file: "u2netp.onnx", bytes: 4574861, label: "U²-Net u2netp", mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225], dynamic: false, size: 320 },
  };
  const OUT = 1200;            // tamanho final da foto (quadrada)
  const FILL = 0.86;           // quanto do quadro o produto ocupa
  const MAX_SIDE = 2048;       // resolução máxima de trabalho da foto original
  const ORIG_SIDE = 2048;      // original guardado para reprocessar

  const root = () => new URL("ai/", document.baseURI);
  const url = (p) => new URL(p, root()).href;

  const sessions = {};
  const loadingP = {};
  let lastSeg = null; // { key, engine, mask, mw, mh }

  const supported = () => typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
  const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  function report(cb, p, msg) { if (cb) cb(p, msg); }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error("Não deu para carregar o motor de IA."));
      document.head.appendChild(s);
    });
  }

  async function fetchCached(u, expected, onProgress, label) {
    let cache = null;
    try { cache = await caches.open(CACHE); } catch { cache = null; }
    const hit = cache && (await cache.match(u));
    if (hit) { onProgress && onProgress(1, label + " (já no aparelho)"); return new Uint8Array(await hit.arrayBuffer()); }
    const res = await fetch(u, { cache: "default" });
    if (!res.ok) throw new Error("Falha ao baixar a IA (" + res.status + "). Verifique a internet.");
    const total = Number(res.headers.get("content-length")) || expected || 0;
    let buf;
    if (!res.body || !res.body.getReader) {
      buf = new Uint8Array(await res.arrayBuffer());
    } else {
      const reader = res.body.getReader();
      buf = new Uint8Array(Math.max(total, 1));
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (received + value.byteLength > buf.length) { const nb = new Uint8Array(Math.max(buf.length * 2, received + value.byteLength)); nb.set(buf.subarray(0, received)); buf = nb; }
        buf.set(value, received);
        received += value.byteLength;
        if (total && onProgress) onProgress(Math.min(0.99, received / total), label + " " + Math.round((100 * received) / total) + "%");
      }
      buf = buf.subarray(0, received);
    }
    if (cache) {
      try {
        const headers = new Headers({ "Content-Type": res.headers.get("Content-Type") || "application/octet-stream", "Content-Length": String(buf.length) });
        await cache.put(u, new Response(buf.slice(), { status: 200, headers }));
      } catch (e) { console.warn("cache da IA cheio", e); }
    }
    onProgress && onProgress(1, label);
    return buf;
  }

  async function ensureRuntime(onProgress) {
    if (window.ort && window.ort.__vitrineReady) return window.ort;
    await fetchCached(url("ort/ort.wasm.min.js"), ORT_JS_BYTES, (f, l) => report(onProgress, 0.02 * f, l), "Biblioteca de IA");
    await fetchCached(url("ort/ort-wasm-simd.wasm"), WASM_BYTES, (f, l) => report(onProgress, 0.02 + 0.18 * f, l), "Motor de IA");
    if (!window.ort) await loadScript(url("ort/ort.wasm.min.js"));
    const ort = window.ort;
    if (!ort) throw new Error("O motor de IA não iniciou.");
    ort.env.wasm.wasmPaths = url("ort/");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.proxy = false;
    ort.__vitrineReady = true;
    return ort;
  }

  async function ensureLoaded(onProgress, engine) {
    engine = engine || pickEngine().engine;
    if (sessions[engine]) { report(onProgress, 1, "Modelo pronto"); return sessions[engine]; }
    if (loadingP[engine]) return loadingP[engine];
    if (!supported()) throw new Error("Este aparelho não suporta o processamento com IA.");
    const M = MODELS[engine];
    loadingP[engine] = (async () => {
      const big = engine === "isnet";
      report(onProgress, 0.01, big ? "Baixando a IA de recorte (só na primeira vez, ~57 MB)…" : "Baixando a IA leve (só na primeira vez)…");
      const ort = await ensureRuntime(onProgress);
      const bytes = await fetchCached(url(M.file), M.bytes, (f, l) => report(onProgress, 0.2 + 0.7 * f, l), "Modelo de recorte");
      report(onProgress, 0.93, "Preparando a IA…");
      const s = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      sessions[engine] = s;
      report(onProgress, 1, "Modelo pronto");
      return s;
    })();
    try { return await loadingP[engine]; }
    finally { loadingP[engine] = null; }
  }

  function pickEngine(force) {
    if (force) return { engine: force, res: force === "isnet" ? 768 : 320 };
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    if (mem < 2) return { engine: "u2netp", res: 320 };
    if (mem >= 6 && cores >= 8) return { engine: "isnet", res: 1024 };
    return { engine: "isnet", res: mem <= 2 ? 640 : 768 };
  }

  // ---------- imagens ----------
  function loadImg(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Não foi possível ler a foto."));
      i.src = src;
    });
  }
  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function ctx2d(c) { const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; return x; }

  // Redução em etapas (metade por vez) para não serrilhar nem borrar.
  function resizeHQ(src, sx, sy, sw, sh, dw, dh) {
    let cur = src, cx = sx, cy = sy, cw = sw, ch = sh;
    while (cw / 2 > dw && ch / 2 > dh) {
      const nw = Math.max(dw, Math.round(cw / 2)), nh = Math.max(dh, Math.round(ch / 2));
      const c = canvas(nw, nh); ctx2d(c).drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
      cur = c; cx = 0; cy = 0; cw = nw; ch = nh;
    }
    const out = canvas(dw, dh); ctx2d(out).drawImage(cur, cx, cy, cw, ch, 0, 0, dw, dh);
    return out;
  }

  function toWorking(img) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) throw new Error("Foto inválida.");
    const s = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    return resizeHQ(img, 0, 0, w0, h0, Math.max(1, Math.round(w0 * s)), Math.max(1, Math.round(h0 * s)));
  }

  // ---------- segmentação ----------
  async function segment(engine, res, work, onProgress, timeout) {
    const sess = await ensureLoaded((p, m) => report(onProgress, 0.05 + p * 0.6, m), engine);
    const M = MODELS[engine];
    const W = work.width, H = work.height;
    let mw, mh;
    if (M.dynamic) {
      const s = res / Math.max(W, H);
      mw = Math.max(64, Math.round((W * s) / 32) * 32);
      mh = Math.max(64, Math.round((H * s) / 32) * 32);
    } else { mw = mh = M.size; }
    report(onProgress, 0.68, "Encontrando o produto…");
    const small = resizeHQ(work, 0, 0, W, H, mw, mh);
    const { data } = ctx2d(small).getImageData(0, 0, mw, mh);
    const n = mw * mh, t = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      t[i] = (data[i * 4] / 255 - M.mean[0]) / M.std[0];
      t[n + i] = (data[i * 4 + 1] / 255 - M.mean[1]) / M.std[1];
      t[2 * n + i] = (data[i * 4 + 2] / 255 - M.mean[2]) / M.std[2];
    }
    const ort = window.ort;
    const input = new ort.Tensor("float32", t, [1, 3, mh, mw]);
    const inName = (sess.inputNames && sess.inputNames[0]) || "input_image";
    // tick de progresso enquanto a IA roda (não dá para medir por dentro)
    let tick = 0.7;
    const iv = setInterval(() => { tick = Math.min(0.88, tick + 0.006); report(onProgress, tick, "Removendo o fundo… (pode levar alguns segundos)"); }, 400);
    const t0 = now();
    let out;
    try {
      out = await Promise.race([
        sess.run({ [inName]: input }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("O processamento demorou demais neste aparelho.")), timeout || 150000)),
      ]);
    } finally { clearInterval(iv); }
    const ms = now() - t0;
    const outName = (sess.outputNames && sess.outputNames[0]) || Object.keys(out)[0];
    const arr = out[outName].data;
    const m = new Float32Array(n);
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < n; i++) { const v = arr[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    const span = mx - mn || 1;
    for (let i = 0; i < n; i++) m[i] = (arr[i] - mn) / span;
    return { mask: m, mw, mh, ms, engine };
  }

  // ---------- limpeza da máscara (baixa resolução) ----------
  function morph(src, w, h, r, isMin) {
    // separável: linhas e depois colunas
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) {
        let v = isMin ? 1 : 0;
        const a = Math.max(0, x - r), b = Math.min(w - 1, x + r);
        for (let k = a; k <= b; k++) { const s = src[o + k]; if (isMin ? s < v : s > v) v = s; }
        tmp[o + x] = v;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let v = isMin ? 1 : 0;
        const a = Math.max(0, y - r), b = Math.min(h - 1, y + r);
        for (let k = a; k <= b; k++) { const s = tmp[k * w + x]; if (isMin ? s < v : s > v) v = s; }
        out[y * w + x] = v;
      }
    }
    return out;
  }

  function label(bin, w, h) {
    const labels = new Int32Array(w * h), comps = [], stack = [];
    let id = 0;
    for (let i = 0; i < bin.length; i++) {
      if (labels[i] || !bin[i]) continue;
      id++;
      let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, border = false;
      stack.push(i); labels[i] = id;
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p / w) | 0;
        area++; sx += x; sy += y;
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
        if (x > 0 && !labels[p - 1] && bin[p - 1]) { labels[p - 1] = id; stack.push(p - 1); }
        if (x < w - 1 && !labels[p + 1] && bin[p + 1]) { labels[p + 1] = id; stack.push(p + 1); }
        if (y > 0 && !labels[p - w] && bin[p - w]) { labels[p - w] = id; stack.push(p - w); }
        if (y < h - 1 && !labels[p + w] && bin[p + w]) { labels[p + w] = id; stack.push(p + w); }
      }
      comps.push({ id, area, cx: sx / area, cy: sy / area, x0, y0, x1, y1, border });
    }
    return { labels, comps };
  }

  function cleanMask(mask, w, h) {
    const n = w * h, r = Math.max(1, Math.round(Math.max(w, h) / 300));
    // abre para cortar ligações finas (cabos, sombras) entre objetos
    const opened = morph(morph(mask, w, h, r, true), w, h, r, false);
    const bin = new Uint8Array(n);
    for (let i = 0; i < n; i++) bin[i] = opened[i] > 0.5 ? 1 : 0;
    const { labels, comps } = label(bin, w, h);
    if (!comps.length) return null;
    const cx = (w - 1) / 2, cy = (h - 1) / 2, diag = Math.hypot(cx, cy) || 1;
    let best = null, bestS = -1;
    for (const c of comps) {
      if (c.area < n * 0.002) continue;
      const dist = Math.hypot(c.cx - cx, c.cy - cy) / diag;
      const box = (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1);
      const score = c.area * Math.pow(1.15 - dist, 2) * (0.5 + c.area / box) * (c.border ? 0.6 : 1);
      if (score > bestS) { bestS = score; best = c; }
    }
    if (!best) return null;
    // mantém pedaços que pertencem ao mesmo produto (tampa, alça…)
    const keep = new Set([best.id]);
    const bw = best.x1 - best.x0, bh = best.y1 - best.y0;
    for (const c of comps) {
      if (c.id === best.id || c.area < best.area * 0.01) continue;
      const inside = c.cx >= best.x0 - bw * 0.04 && c.cx <= best.x1 + bw * 0.04 && c.cy >= best.y0 - bh * 0.04 && c.cy <= best.y1 + bh * 0.04;
      if (inside) keep.add(c.id);
    }
    let sel = new Float32Array(n);
    for (let i = 0; i < n; i++) if (keep.has(labels[i])) sel[i] = 1;
    // corta "rabichos" finos grudados no produto (papel, cabo, borda de outro objeto)
    const r2 = Math.max(r, Math.round(Math.min(bw, bh) * 0.03));
    if (r2 > r) {
      const op = morph(morph(sel, w, h, r2, true), w, h, r2, false);
      const b2 = new Uint8Array(n);
      for (let i = 0; i < n; i++) b2[i] = op[i] > 0.5 ? 1 : 0;
      const l2 = label(b2, w, h);
      if (l2.comps.length) {
        let big = l2.comps[0]; for (const c of l2.comps) if (c.area > big.area) big = c;
        if (big.area > best.area * 0.6) {
          const core = new Float32Array(n);
          for (let i = 0; i < n; i++) if (l2.labels[i] === big.id) core[i] = 1;
          const g2 = morph(core, w, h, 2, false);
          for (let i = 0; i < n; i++) if (!g2[i]) sel[i] = 0;
        }
      }
    }
    // fecha buracos pequenos dentro do produto (rótulo branco "comido")
    const holes = new Uint8Array(n);
    for (let i = 0; i < n; i++) holes[i] = sel[i] ? 0 : 1;
    const hl = label(holes, w, h);
    let selArea = 0; for (let i = 0; i < n; i++) selArea += sel[i];
    const fill = new Set();
    for (const c of hl.comps) if (!c.border && c.area < selArea * 0.015) fill.add(c.id);
    const grown = morph(sel, w, h, r + 2, false);
    const out = new Float32Array(n);
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let i = 0; i < n; i++) {
      let v = grown[i] > 0 ? mask[i] : 0;
      if (fill.has(hl.labels[i])) v = Math.max(v, 0.98);
      out[i] = v;
      if (v > 0.5) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    }
    if (x1 <= x0 || y1 <= y0) return null;
    return { mask: out, box: { x0, y0, x1, y1 } };
  }

  // ---------- refinamento em alta resolução ----------
  function boxBlur(src, w, h, r) {
    // média em janela (2r+1)² via soma acumulada separável — O(n)
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      const o = y * w; let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[o + x] = acc;
        acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
      }
    }
    const k = 1 / ((2 * r + 1) * (2 * r + 1));
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc * k;
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  // Filtro guiado (He et al.): cola a borda da máscara nas bordas reais da foto.
  function guidedFilter(I, p, w, h, r, eps) {
    const n = w * h;
    const Ip = new Float32Array(n), II = new Float32Array(n);
    for (let i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i]; }
    const mI = boxBlur(I, w, h, r), mp = boxBlur(p, w, h, r), mIp = boxBlur(Ip, w, h, r), mII = boxBlur(II, w, h, r);
    const a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const cov = mIp[i] - mI[i] * mp[i], v = mII[i] - mI[i] * mI[i];
      a[i] = cov / (v + eps); b[i] = mp[i] - a[i] * mI[i];
    }
    const ma = boxBlur(a, w, h, r), mb = boxBlur(b, w, h, r);
    const q = new Float32Array(n);
    for (let i = 0; i < n; i++) q[i] = ma[i] * I[i] + mb[i];
    return q;
  }

  function upsample(mask, mw, mh, sx, sy, sw, sh, W, H, dw, dh) {
    // amostra a máscara (coordenadas mw×mh ↔ foto W×H) na região (sx,sy,sw,sh) com saída dw×dh
    const out = new Float32Array(dw * dh);
    const kx = mw / W, ky = mh / H;
    for (let y = 0; y < dh; y++) {
      const fy = Math.min(mh - 1, Math.max(0, (sy + ((y + 0.5) * sh) / dh) * ky - 0.5));
      const y0 = fy | 0, y1 = Math.min(mh - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < dw; x++) {
        const fx = Math.min(mw - 1, Math.max(0, (sx + ((x + 0.5) * sw) / dw) * kx - 0.5));
        const x0 = fx | 0, x1 = Math.min(mw - 1, x0 + 1), wx = fx - x0;
        const a = mask[y0 * mw + x0], b = mask[y0 * mw + x1], c = mask[y1 * mw + x0], d = mask[y1 * mw + x1];
        out[y * dw + x] = (a * (1 - wx) + b * wx) * (1 - wy) + (c * (1 - wx) + d * wx) * wy;
      }
    }
    return out;
  }

  function refineAlpha(rgba, coarse, w, h) {
    const n = w * h, I = new Float32Array(n);
    for (let i = 0; i < n; i++) I[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
    const r = Math.max(2, Math.round(Math.max(w, h) / 280));
    const q = guidedFilter(I, coarse, w, h, r, 2e-3);
    // faixa de incerteza: só mexe perto da borda; dentro/fora fica firme
    const near = boxBlur(coarse, w, h, r * 2);
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let v;
      if (near[i] > 0.995) v = 1;
      else if (near[i] < 0.005) v = 0;
      else v = 0.5 * q[i] + 0.5 * coarse[i];
      // aperta a borda: tira halo semitransparente e preenche o interior
      v = clamp01((v - 0.08) / 0.84);
      a[i] = v * v * (3 - 2 * v);
    }
    // borda bem fina e suave (meio pixel)
    const soft = boxBlur(a, w, h, 1);
    for (let i = 0; i < n; i++) a[i] = 0.5 * a[i] + 0.5 * soft[i];
    return a;
  }

  // Tira a "contaminação" de cor do fundo que fica na borda (halo).
  function decontaminate(rgba, a, w, h) {
    const n = w * h, r = Math.max(3, Math.round(Math.max(w, h) / 160));
    const fr = new Float32Array(n), fg = new Float32Array(n), fb = new Float32Array(n), wa = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const k = a[i] > 0.9 ? 1 : 0;
      wa[i] = k; fr[i] = rgba[i * 4] * k; fg[i] = rgba[i * 4 + 1] * k; fb[i] = rgba[i * 4 + 2] * k;
    }
    const bwa = boxBlur(wa, w, h, r), br = boxBlur(fr, w, h, r), bg = boxBlur(fg, w, h, r), bb = boxBlur(fb, w, h, r);
    for (let i = 0; i < n; i++) {
      const al = a[i];
      if (al >= 0.97 || al <= 0.01 || bwa[i] < 1e-3) continue;
      const t = Math.pow(1 - al, 0.7);
      rgba[i * 4] = rgba[i * 4] * (1 - t) + (br[i] / bwa[i]) * t;
      rgba[i * 4 + 1] = rgba[i * 4 + 1] * (1 - t) + (bg[i] / bwa[i]) * t;
      rgba[i * 4 + 2] = rgba[i * 4 + 2] * (1 - t) + (bb[i] / bwa[i]) * t;
    }
  }

  // Ajuste suave: níveis automáticos, um pouco de luz e cor, nitidez fina.
  function enhancePixels(d, a, w, h) {
    const n = w * h, hist = new Uint32Array(256);
    let cnt = 0, sum = 0;
    for (let i = 0; i < n; i++) {
      if (a[i] < 0.9) continue;
      const y = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) | 0;
      hist[y]++; cnt++; sum += y;
    }
    if (cnt > 50) {
      let acc = 0, lo = 0, hi = 255;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= cnt * 0.01) { lo = v; break; } }
      acc = 0;
      for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= cnt * 0.01) { hi = v; break; } }
      lo = Math.min(lo, 40); hi = Math.max(hi, 200);
      const mean = sum / cnt;
      const gamma = mean < 105 ? 0.85 : mean < 125 ? 0.93 : 1;
      const lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) {
        let x = clamp01((v - lo) / Math.max(1, hi - lo));
        x = Math.pow(x, gamma);
        lut[v] = Math.round(v * 0.4 + x * 255 * 0.6);
      }
      for (let i = 0; i < n; i++) {
        if (a[i] <= 0) continue;
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const ny = lut[Math.max(0, Math.min(255, y | 0))];
        const k = y > 1 ? ny / y : 1;
        let R = r * k, G = g * k, B = b * k;
        const yy = 0.2126 * R + 0.7152 * G + 0.0722 * B, sat = 1.06;
        d[i * 4] = yy + (R - yy) * sat; d[i * 4 + 1] = yy + (G - yy) * sat; d[i * 4 + 2] = yy + (B - yy) * sat;
      }
    }
    // unsharp mask leve (raio 1, quantidade 0,55, limiar 2)
    const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    for (let i = 0; i < n; i++) { ch[0][i] = d[i * 4]; ch[1][i] = d[i * 4 + 1]; ch[2][i] = d[i * 4 + 2]; }
    for (let k = 0; k < 3; k++) {
      const bl = boxBlur(ch[k], w, h, 1);
      for (let i = 0; i < n; i++) {
        if (a[i] < 0.5) continue;
        const diff = ch[k][i] - bl[i];
        if (Math.abs(diff) > 2) d[i * 4 + k] = ch[k][i] + diff * 0.55;
      }
    }
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return { r: 255, g: 255, b: 255 };
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function exportURL(c) {
    try { const u = c.toDataURL("image/webp", 0.92); if (u.startsWith("data:image/webp")) return u; } catch {}
    return c.toDataURL("image/jpeg", 0.92);
  }

  function compose(work, seg, opts) {
    const W = work.width, H = work.height;
    const cl = cleanMask(seg.mask, seg.mw, seg.mh);
    if (!cl) throw new Error("Não encontrei o produto na foto. Tente aproximar o item ou ajuste manualmente.");
    const kx = W / seg.mw, ky = H / seg.mh;
    let bx0 = cl.box.x0 * kx, by0 = cl.box.y0 * ky, bx1 = (cl.box.x1 + 1) * kx, by1 = (cl.box.y1 + 1) * ky;
    const pad = Math.max(bx1 - bx0, by1 - by0) * 0.04;
    const sx = Math.max(0, Math.floor(bx0 - pad)), sy = Math.max(0, Math.floor(by0 - pad));
    const sw = Math.min(W, Math.ceil(bx1 + pad)) - sx, sh = Math.min(H, Math.ceil(by1 + pad)) - sy;
    // tamanho final do produto no quadro (aumenta no máx. 2,5×)
    const target = OUT * FILL;
    const fit = Math.min(target / sw, target / sh, 2.5);
    const dw = Math.max(8, Math.round(sw * fit)), dh = Math.max(8, Math.round(sh * fit));

    const cut = resizeHQ(work, sx, sy, sw, sh, dw, dh);
    const cctx = ctx2d(cut);
    const img = cctx.getImageData(0, 0, dw, dh);
    const coarse = upsample(cl.mask, seg.mw, seg.mh, sx, sy, sw, sh, W, H, dw, dh);
    const alpha = refineAlpha(img.data, coarse, dw, dh);
    decontaminate(img.data, alpha, dw, dh);
    enhancePixels(img.data, alpha, dw, dh);
    for (let i = 0; i < dw * dh; i++) img.data[i * 4 + 3] = Math.round(alpha[i] * 255);
    cctx.putImageData(img, 0, 0);

    const out = canvas(OUT, OUT), ctx = ctx2d(out);
    if (opts.background === "tint") {
      const c = hexToRgb(opts.tint || "#2563EB"), t = 0.08;
      ctx.fillStyle = `rgb(${Math.round(255 * (1 - t) + c.r * t)},${Math.round(255 * (1 - t) + c.g * t)},${Math.round(255 * (1 - t) + c.b * t)})`;
    } else ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUT, OUT);
    const dx = Math.round((OUT - dw) / 2), dy = Math.round((OUT - dh) / 2);
    // sombra de contato suave embaixo do produto
    ctx.save();
    const sy0 = dy + dh * 0.985, sr = dw * 0.42;
    const g = ctx.createRadialGradient(OUT / 2, sy0, 0, OUT / 2, sy0, sr);
    g.addColorStop(0, "rgba(16,24,40,0.18)"); g.addColorStop(1, "rgba(16,24,40,0)");
    ctx.fillStyle = g;
    ctx.translate(0, sy0); ctx.scale(1, 0.09); ctx.translate(0, -sy0);
    ctx.beginPath(); ctx.arc(OUT / 2, sy0, sr, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = "rgba(16,24,40,0.18)"; ctx.shadowBlur = Math.round(OUT * 0.03); ctx.shadowOffsetY = Math.round(OUT * 0.012);
    ctx.drawImage(cut, dx, dy);
    ctx.restore();
    ctx.drawImage(cut, dx, dy);
    return out;
  }

  async function enhance(src, opts = {}) {
    const onProgress = opts.onProgress;
    if (!supported()) throw new Error("Este aparelho não suporta o processamento com IA.");
    report(onProgress, 0.01, "Lendo a foto…");
    const img = typeof src === "string" ? await loadImg(src) : src;
    const work = toWorking(img);
    let key = (typeof src === "string" ? src.length + ":" + src.slice(-64) : "") + ":" + work.width + "x" + work.height;
    const choice = pickEngine(opts.engine);
    if (opts.res) choice.res = opts.res;
    const dims = work.width + "x" + work.height;
    key += ":" + choice.engine + choice.res;
    let seg = lastSeg && (lastSeg.key === key || (opts.reuse && lastSeg.dims === dims)) ? lastSeg : null;
    if (!seg) {
      try {
        seg = await segment(choice.engine, choice.res, work, onProgress, opts.timeout);
      } catch (e) {
        if (choice.engine !== "isnet") throw e;
        console.warn("IS-Net falhou, usando o modo leve", e);
        report(onProgress, 0.1, "Usando a IA leve neste aparelho…");
        seg = await segment("u2netp", 320, work, onProgress, opts.timeout);
        seg.fallback = true;
      }
      seg.key = key; seg.dims = dims;
      lastSeg = seg;
    }
    report(onProgress, 0.9, "Ajustando bordas e cores…");
    await new Promise((r) => setTimeout(r, 0));
    const t1 = now();
    const out = compose(work, seg, opts);
    report(onProgress, 1, "Pronto");
    return {
      canvas: out,
      dataURL: exportURL(out),
      original: work.width > ORIG_SIDE || work.height > ORIG_SIDE ? null : work.toDataURL("image/jpeg", 0.92),
      engine: seg.engine,
      fallback: !!seg.fallback,
      inferMs: seg.ms,
      postMs: now() - t1,
    };
  }

  window.VitrineEnhance = {
    supported,
    sizes: { isnet: MODELS.isnet.bytes, u2netp: MODELS.u2netp.bytes, wasm: WASM_BYTES, js: ORT_JS_BYTES },
    model: { name: "IS-Net (DIS) 8 bits + U²-Net u2netp (reserva)", license: "Apache-2.0", runtime: "ONNX Runtime Web 1.17.3 (MIT)" },
    ensureLoaded,
    enhance,
    pickEngine,
    isWeak() {
      if (!supported()) return "unsupported";
      if (navigator.deviceMemory && navigator.deviceMemory < 2) return "low-memory";
      return null;
    },
  };
})();
