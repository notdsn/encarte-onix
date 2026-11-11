/* Deixar bonita com IA — U²-Net u2netp (Apache-2.0) + ONNX Runtime Web 1.17.3 (MIT). Tudo no aparelho. */
(function () {
  "use strict";

  const CACHE = "vitrine-ai-v1";
  const SIZE = 320;
  const MEAN = [0.485, 0.456, 0.406];
  const STD = [0.229, 0.224, 0.225];
  const MODEL_BYTES = 4574861;
  const WASM_BYTES = 10551547;
  const ORT_JS_BYTES = 145070;
  const TOTAL_BYTES = MODEL_BYTES + WASM_BYTES + ORT_JS_BYTES;
  const OUT = 800;
  const MAX_SIDE = 1600;

  const assets = () => {
    const root = new URL("ai/", document.baseURI);
    return {
      model: new URL("u2netp.onnx", root).href,
      ortJs: new URL("ort/ort.wasm.min.js", root).href,
      wasmDir: new URL("ort/", root).href,
      wasm: new URL("ort/ort-wasm-simd.wasm", root).href,
    };
  };

  let session = null;
  let loading = null;

  const supported = () => typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error("Não deu para carregar o motor de IA."));
      document.head.appendChild(s);
    });
  }

  async function fetchWithProgress(url, expected, onProgress, label) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(url);
    if (hit) { onProgress && onProgress(1, label + " (já no aparelho)"); return hit; }
    const res = await fetch(url, { cache: "default" });
    if (!res.ok) throw new Error("Falha ao baixar o modelo de IA (" + res.status + ").");
    const total = Number(res.headers.get("content-length")) || expected || 0;
    if (!res.body) {
      const clone = res.clone();
      await cache.put(url, clone);
      onProgress && onProgress(1, label);
      return res;
    }
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total) onProgress && onProgress(Math.min(0.99, received / total), label);
    }
    const buf = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "application/octet-stream");
    headers.set("Content-Length", String(buf.length));
    const out = new Response(buf, { status: 200, headers });
    await cache.put(url, out.clone());
    onProgress && onProgress(1, label);
    return out;
  }

  function report(onProgress, p, msg) { if (onProgress) onProgress(p, msg); }

  async function ensureLoaded(onProgress) {
    if (session) { report(onProgress, 1, "Modelo pronto"); return session; }
    if (loading) return loading;
    if (!supported()) throw new Error("Este aparelho não suporta o processamento com IA.");
    loading = (async () => {
      const a = assets();
      report(onProgress, 0.02, "Baixando o modelo de IA (só na primeira vez, ~15 MB)…");
      // Weighted overall progress: wasm ~69%, model ~30%, js ~1%
      await fetchWithProgress(a.ortJs, ORT_JS_BYTES, (f, l) => report(onProgress, 0.02 + 0.03 * f, l || "Biblioteca de IA…"), "Biblioteca de IA");
      await fetchWithProgress(a.wasm, WASM_BYTES, (f, l) => report(onProgress, 0.05 + 0.50 * f, l || "Motor de IA…"), "Motor de IA");
      await fetchWithProgress(a.model, MODEL_BYTES, (f, l) => report(onProgress, 0.55 + 0.25 * f, l || "Modelo de recorte…"), "Modelo de recorte");
      if (!window.ort) {
        report(onProgress, 0.82, "Preparando o motor…");
        await loadScript(a.ortJs);
      }
      const ort = window.ort;
      if (!ort) throw new Error("O motor de IA não iniciou.");
      ort.env.wasm.wasmPaths = a.wasmDir;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      ort.env.wasm.proxy = false;
      report(onProgress, 0.86, "Carregando o modelo…");
      session = await ort.InferenceSession.create(a.model, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      report(onProgress, 1, "Modelo pronto");
      return session;
    })();
    try { return await loading; }
    finally { if (!session) loading = null; }
  }

  function loadImg(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Não foi possível ler a foto."));
      i.src = src;
    });
  }

  function toWorking(img) {
    let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("Foto inválida.");
    const s = Math.min(1, MAX_SIDE / Math.max(w, h));
    w = Math.max(1, Math.round(w * s));
    h = Math.max(1, Math.round(h * s));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return c;
  }

  function makeTensor(canvas) {
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    c.getContext("2d").drawImage(canvas, 0, 0, SIZE, SIZE);
    const { data } = c.getContext("2d").getImageData(0, 0, SIZE, SIZE);
    const t = new Float32Array(3 * SIZE * SIZE);
    const n = SIZE * SIZE;
    for (let i = 0; i < n; i++) {
      t[i] = (data[i * 4] / 255 - MEAN[0]) / STD[0];
      t[n + i] = (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
      t[2 * n + i] = (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
    }
    return new window.ort.Tensor("float32", t, [1, 3, SIZE, SIZE]);
  }

  function firstOutput(result, sess) {
    const name = (sess.outputNames && sess.outputNames[0]) || Object.keys(result)[0];
    return result[name];
  }

  function maskFromTensor(tensor) {
    const dims = tensor.dims || [];
    const arr = tensor.data;
    // Typical [1,1,320,320] or [1,320,320]
    const n = SIZE * SIZE;
    let off = 0;
    if (arr.length > n) off = 0; // first channel
    const m = new Float32Array(n);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = arr[off + i];
      m[i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min || 1;
    for (let i = 0; i < n; i++) m[i] = (m[i] - min) / span;
    return m;
  }

  function upsampleMask(mask, w, h) {
    const out = new Float32Array(w * h);
    const xRatio = (SIZE - 1) / Math.max(1, w - 1);
    const yRatio = (SIZE - 1) / Math.max(1, h - 1);
    for (let y = 0; y < h; y++) {
      const fy = y * yRatio, y0 = fy | 0, y1 = Math.min(SIZE - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = x * xRatio, x0 = fx | 0, x1 = Math.min(SIZE - 1, x0 + 1), wx = fx - x0;
        const a = mask[y0 * SIZE + x0], b = mask[y0 * SIZE + x1];
        const c = mask[y1 * SIZE + x0], d = mask[y1 * SIZE + x1];
        out[y * w + x] = a * (1 - wx) * (1 - wy) + b * wx * (1 - wy) + c * (1 - wx) * wy + d * wx * wy;
      }
    }
    return out;
  }

  function refineMask(mask, w, h) {
    // Contrast + slight box blur (feather)
    const tmp = new Float32Array(mask.length);
    const lo = 0.12, hi = 0.82, span = hi - lo;
    for (let i = 0; i < mask.length; i++) {
      let v = (mask[i] - lo) / span;
      if (v < 0) v = 0; else if (v > 1) v = 1;
      tmp[i] = v * v * (3 - 2 * v); // smoothstep
    }
    const out = new Float32Array(tmp.length);
    const r = 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, n = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= w) continue;
            s += tmp[yy * w + xx]; n++;
          }
        }
        out[y * w + x] = s / n;
      }
    }
    return keepMainSubject(out, w, h);
  }

  function morphMinMax(src, w, h, radius, mode) {
    const out = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = mode === "min" ? 1 : 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= w) continue;
            const s = src[yy * w + xx];
            if (mode === "min") { if (s < v) v = s; } else if (s > v) v = s;
          }
        }
        out[y * w + x] = v;
      }
    }
    return out;
  }

  function keepMainSubject(mask, w, h) {
    // Break thin links (cables) then keep the strongest central object.
    const opened = morphMinMax(morphMinMax(mask, w, h, 3, "min"), w, h, 3, "max");
    const thr = 0.22;
    const labels = new Int32Array(w * h);
    const comps = [];
    const stack = [];
    let cid = 0;
    for (let i = 0; i < opened.length; i++) {
      if (labels[i] || opened[i] < thr) continue;
      cid++;
      let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
      stack.push(i); labels[i] = cid;
      while (stack.length) {
        const p = stack.pop();
        const x = p % w, y = (p / w) | 0;
        area++; sx += x; sy += y;
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
        const tryPush = (q, qx, qy) => {
          if (qx < 0 || qy < 0 || qx >= w || qy >= h) return;
          if (labels[q] || opened[q] < thr) return;
          labels[q] = cid; stack.push(q);
        };
        tryPush(p - 1, x - 1, y); tryPush(p + 1, x + 1, y);
        tryPush(p - w, x, y - 1); tryPush(p + w, x, y + 1);
      }
      comps.push({ id: cid, area, cx: sx / area, cy: sy / area, x0, y0, x1, y1 });
    }
    if (!comps.length) return mask;
    const cx = (w - 1) / 2, cy = (h - 1) / 2, diag = Math.hypot(cx, cy) || 1;
    let best = comps[0], bestS = -1;
    for (const c of comps) {
      const dist = Math.hypot(c.cx - cx, c.cy - cy) / diag;
      const box = (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1) || 1;
      const score = c.area * (1.2 - dist) * (0.4 + c.area / box);
      if (score > bestS) { bestS = score; best = c; }
    }
    const selected = new Float32Array(mask.length);
    for (let i = 0; i < mask.length; i++) if (labels[i] === best.id) selected[i] = 1;
    const grown = morphMinMax(selected, w, h, 2, "max");
    const out = new Float32Array(mask.length);
    for (let i = 0; i < mask.length; i++) out[i] = grown[i] > 0.05 ? mask[i] : 0;
    return out;
  }

  function bboxOf(mask, w, h, thr) {
    let x0 = w, y0 = h, x1 = 0, y1 = 0, count = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x] > thr) {
          if (x < x0) x0 = x; if (y < y0) y0 = y;
          if (x > x1) x1 = x; if (y > y1) y1 = y;
          count++;
        }
      }
    }
    if (count < 16 || x1 <= x0 || y1 <= y0) return null;
    return { x0, y0, x1, y1, count, frac: count / (w * h) };
  }

  function enhancePixels(data, w, h) {
    const n = w * h;
    // Gray-world white balance on solid subject pixels
    let rS = 0, gS = 0, bS = 0, c = 0;
    for (let i = 0; i < n; i++) {
      const a = data[i * 4 + 3];
      if (a < 200) continue;
      rS += data[i * 4]; gS += data[i * 4 + 1]; bS += data[i * 4 + 2]; c++;
    }
    if (c > 20) {
      const rA = rS / c, gA = gS / c, bA = bS / c;
      const gray = (rA + gA + bA) / 3;
      const sr = gray / (rA || 1), sg = gray / (gA || 1), sb = gray / (bA || 1);
      const k = 0.7;
      const rr = 1 + (sr - 1) * k, gg = 1 + (sg - 1) * k, bb = 1 + (sb - 1) * k;
      for (let i = 0; i < n; i++) {
        if (!data[i * 4 + 3]) continue;
        data[i * 4] = Math.max(0, Math.min(255, data[i * 4] * rr));
        data[i * 4 + 1] = Math.max(0, Math.min(255, data[i * 4 + 1] * gg));
        data[i * 4 + 2] = Math.max(0, Math.min(255, data[i * 4 + 2] * bb));
      }
    }
    // Auto contrast (2–98%) on subject luma
    const lumas = [];
    for (let i = 0; i < n; i++) {
      if (data[i * 4 + 3] < 200) continue;
      lumas.push(0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]);
    }
    if (lumas.length > 20) {
      lumas.sort((a, b) => a - b);
      const p2 = lumas[Math.floor(lumas.length * 0.02)];
      const p98 = lumas[Math.floor(lumas.length * 0.98)];
      const span = Math.max(16, p98 - p2);
      const scale = 240 / span, target = 0.85; // mild
      for (let i = 0; i < n; i++) {
        if (!data[i * 4 + 3]) continue;
        for (let k = 0; k < 3; k++) {
          const v = (data[i * 4 + k] - p2) * scale + 8;
          data[i * 4 + k] = Math.max(0, Math.min(255, data[i * 4 + k] * (1 - target) + v * target));
        }
      }
    }
    // Slight saturation + brightness
    for (let i = 0; i < n; i++) {
      if (!data[i * 4 + 3]) continue;
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sat = 1.12, bri = 1.04;
      data[i * 4] = Math.max(0, Math.min(255, (y + (r - y) * sat) * bri));
      data[i * 4 + 1] = Math.max(0, Math.min(255, (y + (g - y) * sat) * bri));
      data[i * 4 + 2] = Math.max(0, Math.min(255, (y + (b - y) * sat) * bri));
    }
    // Unsharp mask (3x3)
    const copy = new Uint8ClampedArray(data);
    const kx = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // mild sharpen already in kernel; we'll blend
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        if (copy[i + 3] < 32) continue;
        for (let k = 0; k < 3; k++) {
          let s = 0, ti = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              s += copy[((y + dy) * w + (x + dx)) * 4 + k] * kx[ti++];
            }
          }
          data[i + k] = Math.max(0, Math.min(255, copy[i + k] * 0.55 + s * 0.45));
        }
      }
    }
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return { r: 255, g: 255, b: 255 };
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function compose(srcCanvas, mask, opts) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const img = srcCanvas.getContext("2d").getImageData(0, 0, w, h);
    for (let i = 0; i < w * h; i++) img.data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(mask[i] * 255)));
    enhancePixels(img.data, w, h);

    const box = bboxOf(mask, w, h, 0.12);
    if (!box) throw new Error("Não encontrei o produto na foto. Tente aproximar o item ou ajuste manualmente.");
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const pad = Math.round(Math.max(bw, bh) * 0.14);
    const sx = Math.max(0, box.x0 - pad), sy = Math.max(0, box.y0 - pad);
    const sw = Math.min(w - sx, bw + pad * 2), sh = Math.min(h - sy, bh + pad * 2);

    const cut = document.createElement("canvas");
    cut.width = sw; cut.height = sh;
    cut.getContext("2d").putImageData(img, -sx, -sy);

    const out = document.createElement("canvas");
    out.width = out.height = OUT;
    const ctx = out.getContext("2d");
    const bg = opts.background === "tint" ? hexToRgb(opts.tint || "#D61E26") : { r: 255, g: 255, b: 255 };
    if (opts.background === "tint") {
      const t = 0.08;
      ctx.fillStyle = `rgb(${Math.round(255 * (1 - t) + bg.r * t)},${Math.round(255 * (1 - t) + bg.g * t)},${Math.round(255 * (1 - t) + bg.b * t)})`;
    } else {
      ctx.fillStyle = "#fff";
    }
    ctx.fillRect(0, 0, OUT, OUT);

    const fit = Math.min((OUT * 0.84) / sw, (OUT * 0.84) / sh);
    const dw = Math.round(sw * fit), dh = Math.round(sh * fit);
    const dx = Math.round((OUT - dw) / 2), dy = Math.round((OUT - dh) / 2 + OUT * 0.01);

    ctx.save();
    ctx.shadowColor = "rgba(16,24,40,0.28)";
    ctx.shadowBlur = Math.max(12, Math.round(OUT * 0.035));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(6, Math.round(OUT * 0.016));
    ctx.drawImage(cut, dx, dy, dw, dh);
    ctx.restore();
    // draw again without extra shadow accumulation
    ctx.shadowColor = "transparent";
    ctx.drawImage(cut, dx, dy, dw, dh);
    return out;
  }

  async function enhance(src, opts = {}) {
    const onProgress = opts.onProgress;
    const sess = await ensureLoaded((p, m) => report(onProgress, p * 0.7, m));
    report(onProgress, 0.72, "Lendo a foto…");
    const img = typeof src === "string" || !src.tagName ? await loadImg(typeof src === "string" ? src : src) : src;
    const source = typeof src === "string" ? src : (src.src || "");
    const work = toWorking(img);
    report(onProgress, 0.78, "Removendo o fundo…");
    const inputName = (sess.inputNames && sess.inputNames[0]) || "input.1";
    const tensor = makeTensor(work);
    const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const result = await Promise.race([
      sess.run({ [inputName]: tensor }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("O processamento demorou demais neste aparelho.")), opts.timeout || 90000)),
    ]);
    const ms = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
    report(onProgress, 0.90, "Melhorando cores e recorte…");
    const raw = firstOutput(result, sess);
    let mask = maskFromTensor(raw);
    mask = upsampleMask(mask, work.width, work.height);
    mask = refineMask(mask, work.width, work.height);
    const canvas = compose(work, mask, opts);
    report(onProgress, 1, "Pronto");
    return {
      canvas,
      dataURL: canvas.toDataURL("image/jpeg", 0.88),
      inferMs: ms,
    };
  }

  window.VitrineEnhance = {
    supported,
    sizes: { model: MODEL_BYTES, wasm: WASM_BYTES, js: ORT_JS_BYTES, total: TOTAL_BYTES },
    model: { name: "u2netp (U²-Net)", license: "Apache-2.0", runtime: "ONNX Runtime Web 1.17.3 (MIT)", bytes: TOTAL_BYTES },
    ensureLoaded,
    enhance,
    isWeak() {
      if (!supported()) return "unsupported";
      if (navigator.deviceMemory && navigator.deviceMemory < 2) return "low-memory";
      return null;
    },
  };
})();
