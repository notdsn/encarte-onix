/* Figurinhas — arte vetorial original (Nextwave Studio Brasil). Classes: a=cor principal, b=secundária, c=destaque. */
(function () {
  "use strict";
  const burst = (cx, cy, r1, r2, n) => { let p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, t = (Math.PI * i) / n - Math.PI / 2; p.push((cx + r * Math.cos(t)).toFixed(1) + "," + (cy + r * Math.sin(t)).toFixed(1)); } return p.join(" "); };
  const star = (cx, cy, r) => burst(cx, cy, r, r * 0.45, 5);
  const T = (x, y, s, txt, cls = "w", extra = "") => `<text x="${x}" y="${y}" font-size="${s}" class="${cls} t" text-anchor="middle" ${extra}>${txt}</text>`;
  const S = {
    motoboy: ["Motoboy entrega", `
      <rect x="6" y="104" width="30" height="4" rx="2" class="g"/><rect x="0" y="94" width="22" height="4" rx="2" class="g"/>
      <rect x="10" y="36" width="34" height="30" rx="5" class="c"/><rect x="10" y="46" width="34" height="6" class="b"/><path d="M22 41h10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 90 Q34 70 56 70 L82 70 Q92 70 96 84 L100 92 Z" class="b"/><rect x="40" y="66" width="28" height="7" rx="3.5" class="k"/>
      <path d="M92 60 L100 92" stroke="#1b1f2e" stroke-width="4" stroke-linecap="round"/><rect x="86" y="56" width="14" height="5" rx="2.5" class="k"/>
      <circle cx="34" cy="96" r="13" class="k"/><circle cx="34" cy="96" r="6" class="g"/><circle cx="100" cy="96" r="13" class="k"/><circle cx="100" cy="96" r="6" class="g"/>
      <path d="M52 66 L60 46 L78 46 L84 60" class="a" stroke-linejoin="round"/><path d="M58 50 L60 70 L72 70 Z" class="a"/>
      <path d="M60 68 L72 70 L80 84" stroke="#2b2f45" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M76 50 L92 58" stroke-width="6" stroke-linecap="round" class="as" fill="none"/><circle cx="92" cy="58" r="3.5" class="s"/>
      <circle cx="68" cy="34" r="13" class="a"/><path d="M68 26 a10 10 0 0 1 12 10 L68 38 Z" class="k"/><path d="M57 37 h12" stroke="#fff" stroke-width="2" opacity=".6"/>
      <rect x="54" y="44" width="10" height="4" rx="2" class="c"/>`],
    farmaceutico: ["Farmacêutico", `
      <path d="M18 118 Q20 78 60 76 Q100 78 102 118 Z" class="w" stroke="#d5dbe8" stroke-width="2"/>
      <path d="M48 78 L60 104 L72 78 Z" class="a"/><path d="M42 80 L60 118 M78 80 L60 118" stroke="#d5dbe8" stroke-width="2"/>
      <rect x="78" y="92" width="14" height="10" rx="2" class="b"/><path d="M85 94v6M82 97h6" stroke="#fff" stroke-width="2"/>
      <rect x="52" y="64" width="16" height="14" class="s"/><circle cx="60" cy="46" r="22" class="s"/>
      <path d="M38 44 Q38 20 60 20 Q84 20 82 44 Q76 30 60 32 Q46 32 38 44Z" class="h"/>
      <circle cx="52" cy="48" r="2.6" class="k"/><circle cx="68" cy="48" r="2.6" class="k"/><path d="M52 57 Q60 63 68 57" stroke="#1b1f2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M36 84 Q30 104 44 108" stroke="#2b2f45" stroke-width="3" fill="none"/><circle cx="45" cy="108" r="4" class="g"/>`],
    carrinho: ["Carrinho", `
      <path d="M8 22 h16 l12 52 h58 l12 -38 H30" stroke="#1b1f2e" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M34 38 H100 L92 66 H40 Z" class="a"/><path d="M50 38v28M66 38v28M82 38v28" stroke="#fff" stroke-width="3" opacity=".5"/>
      <rect x="40" y="18" width="18" height="22" rx="3" class="c"/><rect x="62" y="12" width="16" height="28" rx="3" class="b"/>
      <circle cx="44" cy="92" r="9" class="k"/><circle cx="88" cy="92" r="9" class="k"/><circle cx="44" cy="92" r="3.5" class="g"/><circle cx="88" cy="92" r="3.5" class="g"/>`],
    sacola: ["Sacola", `
      <path d="M42 40 V30 a18 18 0 0 1 36 0 V40" stroke="#1b1f2e" stroke-width="6" fill="none"/>
      <path d="M22 40 H98 L92 112 H28 Z" class="a"/><path d="M22 40 H98 L97 52 H23Z" class="b"/>
      <polygon points="${star(60, 80, 18)}" class="c"/><circle cx="42" cy="46" r="3.5" class="k"/><circle cx="78" cy="46" r="3.5" class="k"/>`],
    "frete-gratis": ["Frete grátis", `
      <rect x="6" y="36" width="64" height="44" rx="6" class="a"/><path d="M70 50 H92 L108 66 V80 H70Z" class="b"/><path d="M76 54 H90 L100 66 H76Z" class="w" opacity=".85"/>
      <circle cx="28" cy="84" r="10" class="k"/><circle cx="88" cy="84" r="10" class="k"/><circle cx="28" cy="84" r="4" class="g"/><circle cx="88" cy="84" r="4" class="g"/>
      <rect x="4" y="96" width="112" height="22" rx="11" class="c"/>${T(60, 112, 15, "FRETE GRÁTIS", "k")}
      ${T(38, 64, 15, "GRÁTIS", "w")}`],
    presente: ["Presente", `
      <rect x="16" y="50" width="88" height="62" rx="6" class="a"/><rect x="10" y="38" width="100" height="18" rx="5" class="a" opacity=".85"/>
      <rect x="52" y="38" width="16" height="74" class="c"/><path d="M60 38 C40 10 22 30 40 38 Z M60 38 C80 10 98 30 80 38 Z" class="b"/><circle cx="60" cy="38" r="6" class="c"/>`],
    "coracao-saude": ["Coração saúde", `
      <path d="M60 108 C10 72 8 40 30 28 C44 20 56 28 60 38 C64 28 76 20 90 28 C112 40 110 72 60 108Z" class="a"/>
      <path d="M18 62 H44 L52 46 L62 80 L70 58 L76 62 H102" stroke="#fff" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="90" cy="36" r="10" class="w" opacity=".35"/>`],
    capsula: ["Cápsula", `
      <g transform="rotate(-35 60 60)"><rect x="18" y="42" width="84" height="36" rx="18" class="w" stroke="#d5dbe8" stroke-width="2"/><path d="M36 42 H60 V78 H36 A18 18 0 0 1 36 42Z" class="a"/><rect x="26" y="48" width="22" height="6" rx="3" fill="#fff" opacity=".45"/></g>
      <circle cx="88" cy="92" r="18" class="b"/><path d="M76 92 H100" stroke="#fff" stroke-width="3" opacity=".7"/>
      <polygon points="${star(26, 26, 10)}" class="c"/>`],
    bebe: ["Mamãe e bebê", `
      <rect x="44" y="10" width="20" height="12" rx="6" class="c"/><path d="M40 22 H68 V30 H40Z" class="b"/>
      <rect x="34" y="30" width="40" height="76" rx="14" class="w" stroke="#d5dbe8" stroke-width="2"/><rect x="34" y="62" width="40" height="44" rx="14" class="a" opacity=".85"/>
      <path d="M42 44h10M42 52h14M42 60h10" stroke="#9aa3b8" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M96 100 C78 88 78 74 87 70 C92 68 95 71 96 74 C97 71 100 68 105 70 C114 74 114 88 96 100Z" class="b"/>`],
    beleza: ["Beleza", `
      <rect x="20" y="62" width="26" height="48" rx="4" class="k"/><rect x="22" y="44" width="22" height="20" rx="2" class="c"/><path d="M24 44 L24 26 Q33 14 42 26 L42 44Z" class="a"/>
      <rect x="62" y="48" width="44" height="62" rx="12" class="b" opacity=".9"/><rect x="74" y="34" width="20" height="16" rx="3" class="c"/><rect x="80" y="24" width="8" height="12" rx="2" class="k"/>
      <circle cx="84" cy="80" r="12" class="w" opacity=".35"/><polygon points="${star(100, 26, 7)}" class="c"/><polygon points="${star(56, 22, 5)}" class="a"/>`],
    imperdivel: ["Imperdível", `
      <path d="M60 6 C64 30 92 40 90 70 C88 96 70 108 60 108 C44 108 26 96 28 70 C29 54 40 46 42 34 C50 44 50 52 56 56 C60 40 54 22 60 6Z" class="a"/>
      <path d="M60 52 C64 66 76 72 74 88 C72 100 64 104 60 104 C52 104 44 98 46 86 C48 76 56 72 60 52Z" class="c"/>
      <rect x="6" y="88" width="108" height="26" rx="13" class="k"/>${T(60, 107, 16, "IMPERDÍVEL", "c")}`],
    "so-hoje": ["Só hoje", `
      <circle cx="60" cy="50" r="40" class="a"/><circle cx="60" cy="50" r="31" class="w"/><path d="M60 30 V50 L74 58" stroke="#1b1f2e" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="28" y="4" width="16" height="10" rx="4" class="b"/><rect x="76" y="4" width="16" height="10" rx="4" class="b"/>
      <rect x="10" y="88" width="100" height="26" rx="13" class="c"/>${T(60, 107, 17, "SÓ HOJE!", "k")}`],
    desconto: ["Desconto %", `<polygon points="${burst(60, 60, 56, 44, 16)}" class="a"/><polygon points="${burst(60, 60, 46, 40, 16)}" class="c" opacity=".25"/>${T(60, 66, 30, "OFF", "w")}${T(60, 90, 14, "DESCONTO", "c")}
      <text x="60" y="44" font-size="26" class="c t" text-anchor="middle">%</text>`],
    conversa: ["Peça pelo chat", `
      <path d="M14 20 H106 a10 10 0 0 1 10 10 V74 a10 10 0 0 1 -10 10 H44 L22 104 L26 84 H14 a10 10 0 0 1 -10 -10 V30 a10 10 0 0 1 10 -10Z" class="a"/>
      <path d="M38 40 c0 -4 8 -6 9 -2 l2 8 c1 3 -3 5 -3 5 c3 7 8 12 15 15 c0 0 2 -4 5 -3 l8 2 c4 1 2 9 -2 9 c-20 0 -34 -14 -34 -34Z" class="w"/>
      ${T(92, 60, 13, "PEÇA", "c")}${T(92, 74, 13, "AQUI", "c")}`],
    "black-friday": ["Black Friday", `
      <path d="M30 14 H108 V106 H30 L6 60Z" class="k"/><circle cx="26" cy="60" r="6" class="c"/>
      ${T(68, 52, 22, "BLACK", "c")}${T(68, 76, 18, "FRIDAY", "w")}<rect x="40" y="86" width="56" height="10" rx="5" class="a"/>`],
    natal: ["Natal", `
      <polygon points="60,14 96,62 78,62 104,98 16,98 42,62 24,62" class="b"/><rect x="52" y="98" width="16" height="16" class="h"/>
      <polygon points="${star(60, 14, 11)}" class="c"/>
      <circle cx="46" cy="56" r="5" class="a"/><circle cx="72" cy="48" r="4" class="c"/><circle cx="40" cy="86" r="5" class="c"/><circle cx="64" cy="78" r="5" class="a"/><circle cx="84" cy="88" r="5" class="a"/>`],
    familia: ["Família", `
      <circle cx="34" cy="38" r="14" class="s"/><path d="M14 104 Q14 58 34 58 Q54 58 54 104Z" class="a"/>
      <circle cx="86" cy="38" r="14" class="s"/><path d="M66 104 Q66 58 86 58 Q106 58 106 104Z" class="b"/>
      <circle cx="60" cy="62" r="11" class="s"/><path d="M44 112 Q44 78 60 78 Q76 78 76 112Z" class="c"/>
      <path d="M20 34 Q22 20 34 22 Q46 22 48 36 Q40 28 20 34Z" class="h"/><path d="M72 36 Q74 22 86 22 Q100 22 100 40 Q96 30 72 36Z" class="h"/>`],
    mascote: ["Mascote joinha", `
      <path d="M26 118 Q28 86 60 84 Q92 86 94 118Z" class="a"/><path d="M50 84 L60 98 L70 84Z" class="w"/>
      <circle cx="60" cy="52" r="32" class="s"/><path d="M28 50 Q26 18 60 18 Q94 18 92 50 Q84 30 60 32 Q40 32 28 50Z" class="h"/>
      <circle cx="48" cy="54" r="4" class="k"/><path d="M68 54 q5 -5 10 0" stroke="#1b1f2e" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M46 68 Q60 80 74 68" stroke="#1b1f2e" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="40" cy="64" r="4" fill="#ff8fa3" opacity=".6"/><circle cx="80" cy="64" r="4" fill="#ff8fa3" opacity=".6"/>
      <path d="M92 104 V86 c0-6 4-12 7-16 l2 -6 c3-4 8 0 6 6 l-2 8 h9 c5 0 6 6 3 8 c3 2 2 7-1 8 c2 2 1 6-3 7 c1 3-1 6-5 6 H96Z" class="c" stroke="#1b1f2e" stroke-width="2.5"/>`],
    estrelas: ["Avaliação 5 estrelas", `
      <rect x="4" y="34" width="112" height="52" rx="26" class="a"/>
      ${[20, 40, 60, 80, 100].map((x) => `<polygon points="${star(x, 60, 11)}" class="c"/>`).join("")}
      ${T(60, 108, 15, "NOTA MÁXIMA", "k")}`],
    localizacao: ["Localização", `
      <ellipse cx="60" cy="108" rx="30" ry="7" class="k" opacity=".25"/>
      <path d="M60 106 C36 76 22 60 22 42 a38 38 0 0 1 76 0 C98 60 84 76 60 106Z" class="a"/><circle cx="60" cy="42" r="16" class="w"/>
      <path d="M53 42h14M60 35v14" stroke="currentColor" class="bs" stroke-width="5" stroke-linecap="round"/>`],
  };
  const STYLE = `<style>
    .a{fill:var(--c1,#D61E26)} .b{fill:var(--c2,#1C3FAA)} .c{fill:var(--c3,#FFD600)}
    .k{fill:#1b1f2e} .w{fill:#fff} .s{fill:#f0c4a0} .h{fill:#3a2a22} .g{fill:#6b7280}
    .as{stroke:var(--c1,#D61E26);fill:none} .bs{stroke:var(--c2,#1C3FAA);fill:none}
    .t{font-family:Oswald,Nunito,Arial,sans-serif;font-weight:700}
  </style>`;
  window.STICKERS = S;
  window.STICKER_CAPTIONS = {
    motoboy: "Entregamos em casa!", farmaceutico: "Consulte o farmacêutico",
    carrinho: "Leve mais por menos", sacola: "Compre e economize",
    "frete-gratis": "", presente: "Ideal para presentear",
    "coracao-saude": "Cuide da sua saúde", capsula: "Saúde em oferta",
    bebe: "Cuidados com o bebê", beleza: "Beleza e cuidados",
    imperdivel: "", "so-hoje": "",
    desconto: "", conversa: "Peça pelo WhatsApp",
    "black-friday": "", natal: "Feliz Natal",
    familia: "Para toda a família", mascote: "A gente recomenda!",
    estrelas: "", localizacao: "Venha nos visitar"
  };
  /* Words already painted on the SVG — don't also show them as a caption pill. */
  window.STICKER_TEXT = {
    "frete-gratis": ["Frete grátis", "Grátis"],
    imperdivel: ["Imperdível"],
    "so-hoje": ["Só hoje"],
    desconto: ["Desconto", "OFF"],
    conversa: ["Peça aqui"],
    "black-friday": ["Black Friday"],
    estrelas: ["Nota máxima"],
  };
  const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  window.stickerCaptionOK = (kind, caption) => {
    const cap = fold(caption);
    if (!cap) return false;
    const baked = window.STICKER_TEXT[kind] || [];
    return !baked.some((w) => { const b = fold(w); return b && (cap === b || cap.includes(b) || b.includes(cap)); });
  };
  window.stickerSVG = (id) => { const s = S[id]; return s ? `<svg class="stk" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${s[0]}">${STYLE}${s[1]}</svg>` : ""; };
})();
