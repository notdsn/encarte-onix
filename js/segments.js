/* Tipos de negócio (segmentos): textos, exemplos, cores, modelos e figurinhas sugeridas. */
(function () {
  "use strict";
  const PHARMA_DISC = "Imagens ilustrativas. Ofertas válidas enquanto durarem os estoques. Consulte o farmacêutico. Medicamentos podem causar efeitos adversos: leia a bula e, quando exigido, apresente a receita.";
  const GENERIC = "Imagens ilustrativas. Ofertas válidas enquanto durarem os estoques ou no período indicado.";
  const COMMON_TITLES = ["Ofertas da Semana", "Só Hoje!", "Black Friday", "Ofertas de Natal"];
  const COMMON_BADGES = ["Oferta", "Novidade", "Mais vendido", "Limite por cliente"];
  // only pharmacy-specific stickers; moved to the end of the gallery for other segments
  const PHARMA_ONLY = ["3d-farmaceutico", "farmaceutico", "capsula", "coracao-saude"];

  const S = {
    farmacia: {
      label: "Farmácia / drogaria", emoji: "💊",
      brand: { name: "Minha Farmácia", slogan: "Saúde com preço justo", c1: "#0E8A6A", c2: "#2A7DE1", c3: "#FFCF3A", mark: "cruz" },
      storeEx: "Farmácia Central", sloganEx: "Saúde com preço justo", detailsEx: "caixa 30 comprimidos", badgeEx: "Leve 3 pague 2",
      disclaimer: PHARMA_DISC, theme: "classico",
      titles: ["Ofertas da Semana", "Ofertas do Mês", "Dia das Mães", "Saldão"],
      badges: ["Leve 2 pague 1", "Leve 3 pague 2", "Genérico"],
      products: [["Vitamina C 1g", "caixa com 30 comprimidos", 24.9, 16.9], ["Protetor Solar FPS 60", "frasco 120 ml", 79.9, 54.9, "Oferta"], ["Fralda geriátrica G", "pacote com 30 unidades", 69.9, 49.9, "Leve 3 pague 2"], ["Shampoo antiqueda", "frasco 300 ml", 39.9, 27.9]],
      stickers: [["3d-motoboy", "footer-left", "m", "Entregamos em casa!"], ["3d-relogio", "tl", "s", "Só hoje"], ["3d-fogo", "tr", "s", "Imperdível"]],
      suggest: ["3d-motoboy", "3d-farmaceutico", "3d-coracao", "3d-relogio", "3d-fogo", "3d-etiqueta", "farmaceutico", "capsula", "coracao-saude", "bebe", "beleza"],
      captions: {},
    },
    mercado: {
      label: "Supermercado / mercado", emoji: "🛒",
      brand: { name: "Meu Mercado", slogan: "Economia todo dia", c1: "#E4572E", c2: "#17324D", c3: "#FFC914", mark: "icone" },
      storeEx: "Mercado Bom Preço", sloganEx: "Economia todo dia", detailsEx: "pacote 5 kg", badgeEx: "Leve 3 pague 2",
      disclaimer: GENERIC + " Vendas limitadas a quantidades de consumo familiar.", theme: "relampago",
      titles: ["Ofertas da Semana", "Sextou no Mercado", "Ofertas de Fim de Semana", "Aniversário da Loja", "Saldão"],
      badges: ["Leve 3 pague 2", "Preço baixo", "Clube de descontos", "Leve 2 pague 1"],
      products: [["Arroz tipo 1", "pacote 5 kg", 32.9, 24.9, "Preço baixo"], ["Feijão carioca", "pacote 1 kg", 9.49, 6.99], ["Óleo de soja", "garrafa 900 ml", 8.99, 6.49], ["Café torrado e moído", "pacote 500 g", 24.9, 18.9, "Leve 3 pague 2"]],
      stickers: [["3d-carrinho", "footer-left", "m", "Leve mais por menos"], ["3d-relogio", "tl", "s", "Só hoje"], ["3d-etiqueta", "tr", "s", "Super desconto"]],
      suggest: ["3d-carrinho", "3d-sacola", "3d-etiqueta", "3d-megafone", "3d-relogio", "3d-motoboy", "carrinho", "sacola", "familia", "desconto"],
      captions: { "3d-coracao": "Feito para sua família" },
    },
    acougue: {
      label: "Açougue / casa de carnes", emoji: "🥩",
      brand: { name: "Meu Açougue", slogan: "Carne de qualidade todo dia", c1: "#B3121F", c2: "#2B1A14", c3: "#F2C14E", mark: "icone" },
      storeEx: "Casa de Carnes Boi Bom", sloganEx: "Carne de qualidade todo dia", detailsEx: "preço do kg", badgeEx: "Para o churrasco",
      disclaimer: GENERIC + " Preços por quilo; o peso pode variar.", theme: "noite",
      titles: ["Churrasco de Fim de Semana", "Ofertas do Açougue", "Sexta do Churrasco", "Ofertas da Semana"],
      badges: ["Preço do kg", "Para o churrasco", "Corte especial", "Fresquinho"],
      products: [["Picanha bovina", "preço do kg", 89.9, 69.9, "Para o churrasco"], ["Contrafilé", "preço do kg", 54.9, 44.9], ["Linguiça toscana", "preço do kg", 26.9, 19.9], ["Frango a passarinho", "preço do kg", 19.9, 14.9, "Fresquinho"]],
      stickers: [["3d-fogo", "tr", "s", "Imperdível"], ["3d-motoboy", "footer-left", "m", "Entregamos em casa!"], ["3d-relogio", "tl", "s", "Só hoje"]],
      suggest: ["3d-fogo", "3d-etiqueta", "3d-motoboy", "3d-megafone", "3d-relogio", "3d-sacola", "imperdivel", "desconto", "familia"],
      captions: { "3d-fogo": "Bom para o churrasco", "3d-coracao": "Feito com carinho" },
    },
    hortifruti: {
      label: "Hortifrúti / sacolão", emoji: "🥦",
      brand: { name: "Meu Hortifrúti", slogan: "Fresquinho todo dia", c1: "#2E9E44", c2: "#14532D", c3: "#FFB703", mark: "icone" },
      storeEx: "Hortifrúti da Praça", sloganEx: "Fresquinho todo dia", detailsEx: "preço do kg", badgeEx: "Fresquinho",
      disclaimer: GENERIC + " Preços por quilo ou unidade, conforme indicado.", theme: "saude",
      titles: ["Quarta Verde", "Feira da Semana", "Hortifrúti Fresquinho", "Ofertas da Semana"],
      badges: ["Fresquinho", "Do produtor", "Preço do kg", "Orgânico"],
      products: [["Tomate", "preço do kg", 8.99, 5.99, "Fresquinho"], ["Banana prata", "preço do kg", 6.99, 4.49], ["Alface crespa", "unidade", 3.99, 2.49], ["Laranja pera", "preço do kg", 5.99, 3.99, "Do produtor"]],
      stickers: [["3d-sacola", "footer-left", "m", "Compre e economize"], ["3d-relogio", "tl", "s", "Só hoje"], ["3d-coracao", "tr", "s", "Fresquinho pra você"]],
      suggest: ["3d-sacola", "3d-carrinho", "3d-coracao", "3d-etiqueta", "3d-relogio", "3d-motoboy", "sacola", "carrinho", "familia"],
      captions: { "3d-coracao": "Fresquinho pra você" },
    },
    padaria: {
      label: "Padaria / confeitaria", emoji: "🥖",
      brand: { name: "Minha Padaria", slogan: "Pão quentinho toda hora", c1: "#C26A1B", c2: "#4A2C17", c3: "#F6D28B", mark: "icone" },
      storeEx: "Padaria Pão Dourado", sloganEx: "Pão quentinho toda hora", detailsEx: "unidade", badgeEx: "Saindo do forno",
      disclaimer: GENERIC, theme: "premium",
      titles: ["Café da Manhã em Oferta", "Promoção da Padaria", "Fornada do Dia", "Ofertas da Semana"],
      badges: ["Saindo do forno", "Feito aqui", "Preço do kg", "Encomende"],
      products: [["Pão francês", "preço do kg", 16.9, 12.9, "Saindo do forno"], ["Bolo de cenoura", "com cobertura de chocolate", 29.9, 22.9, "Feito aqui"], ["Sonho recheado", "unidade", 6.5, 4.5], ["Café coado + pão na chapa", "combo", 12.0, 8.9]],
      stickers: [["3d-coracao", "tr", "s", "Feito com carinho"], ["3d-motoboy", "footer-left", "m", "Entregamos em casa!"], ["3d-relogio", "tl", "s", "Só hoje"]],
      suggest: ["3d-coracao", "3d-relogio", "3d-motoboy", "3d-presente", "3d-sacola", "3d-mascote", "familia", "estrelas", "presente"],
      captions: { "3d-coracao": "Feito com carinho", "3d-presente": "Encomende para sua festa" },
    },
    roupas: {
      label: "Roupas / calçados", emoji: "👗",
      brand: { name: "Minha Loja", slogan: "Moda que cabe no bolso", c1: "#111111", c2: "#E11D48", c3: "#F5F5F4", mark: "inicial" },
      storeEx: "Bella Moda", sloganEx: "Moda que cabe no bolso", detailsEx: "tam. P ao GG", badgeEx: "Nova coleção",
      disclaimer: GENERIC + " Tamanhos e cores sujeitos à disponibilidade.", theme: "premium",
      titles: ["Liquida", "Nova Coleção", "Queima de Estoque", "Dia dos Namorados", "Dia das Mães"],
      badges: ["Nova coleção", "Últimas peças", "Em até 3x", "Tam. P ao GG"],
      products: [["Vestido midi floral", "tam. P ao GG", 159.9, 99.9, "Nova coleção"], ["Calça jeans masculina", "tam. 38 ao 48", 139.9, 89.9], ["Tênis casual", "nº 34 ao 43", 199.9, 149.9, "Em até 3x"], ["Camiseta básica", "várias cores", 49.9, 29.9, "Últimas peças"]],
      stickers: [["3d-sacola", "footer-left", "m", "Compre e economize"], ["3d-etiqueta", "tr", "s", "Super desconto"], ["3d-presente", "tl", "s", "Ideal para presentear"]],
      suggest: ["3d-sacola", "3d-etiqueta", "3d-presente", "3d-megafone", "3d-coracao", "3d-relogio", "beleza", "sacola", "desconto", "presente"],
      captions: { "3d-coracao": "Peças que você vai amar" },
    },
    pet: {
      label: "Pet shop", emoji: "🐾",
      brand: { name: "Meu Pet Shop", slogan: "Carinho para o seu pet", c1: "#7C3AED", c2: "#0EA5E9", c3: "#FDE047", mark: "icone" },
      storeEx: "Pet Amigo", sloganEx: "Carinho para o seu pet", detailsEx: "pacote 10 kg", badgeEx: "Para cães",
      disclaimer: GENERIC + " Consulte um médico-veterinário antes de usar medicamentos.", theme: "gradiente",
      titles: ["Semana Pet", "Ofertas para seu Pet", "Mês do Pet", "Ofertas da Semana"],
      badges: ["Para cães", "Para gatos", "Banho e tosa", "Leve 2 pague 1"],
      products: [["Ração para cães adultos", "pacote 10 kg", 149.9, 119.9, "Para cães"], ["Areia higiênica", "pacote 4 kg", 24.9, 17.9, "Para gatos"], ["Petisco bifinho", "pacote 500 g", 29.9, 21.9], ["Banho e tosa", "porte pequeno", 70.0, 55.0, "Banho e tosa"]],
      stickers: [["3d-coracao", "tr", "s", "Amor de pet"], ["3d-motoboy", "footer-left", "m", "Entregamos em casa!"], ["3d-relogio", "tl", "s", "Só hoje"]],
      suggest: ["3d-coracao", "3d-motoboy", "3d-mascote", "3d-presente", "3d-etiqueta", "3d-relogio", "familia", "estrelas"],
      captions: { "3d-coracao": "Amor de pet", "3d-mascote": "Seu pet aprova!" },
    },
    construcao: {
      label: "Material de construção", emoji: "🧱",
      brand: { name: "Minha Casa & Construção", slogan: "Tudo para sua obra", c1: "#F59E0B", c2: "#1F2937", c3: "#FDE68A", mark: "icone" },
      storeEx: "Constrular Materiais", sloganEx: "Tudo para sua obra", detailsEx: "saco 50 kg", badgeEx: "Pronta entrega",
      disclaimer: GENERIC + " Frete e prazo de entrega conforme a região.", theme: "relampago",
      titles: ["Feirão da Construção", "Reforma em Oferta", "Ofertas da Obra", "Ofertas do Mês"],
      badges: ["Pronta entrega", "Em até 10x", "Preço de obra", "Frete grátis"],
      products: [["Cimento CP II", "saco 50 kg", 42.9, 36.9, "Pronta entrega"], ["Tinta acrílica branca", "lata 18 L", 389.9, 299.9, "Em até 10x"], ["Piso cerâmico 60x60", "preço do m²", 49.9, 34.9], ["Argamassa AC-I", "saco 20 kg", 19.9, 14.9]],
      stickers: [["3d-motoboy", "footer-left", "m", "Entregamos na sua obra!"], ["3d-etiqueta", "tr", "s", "Super desconto"], ["3d-megafone", "tl", "s", "Oferta relâmpago"]],
      suggest: ["3d-motoboy", "3d-etiqueta", "3d-megafone", "3d-carrinho", "3d-local", "3d-relogio", "frete-gratis", "desconto", "localizacao"],
      captions: { "3d-motoboy": "Entregamos na sua obra!", "3d-coracao": "Sua casa do jeito que você quer" },
    },
    beleza: {
      label: "Perfumaria / beleza", emoji: "💄",
      brand: { name: "Minha Perfumaria", slogan: "Beleza que cabe no bolso", c1: "#D63384", c2: "#7B2D8B", c3: "#FFD6EA", mark: "inicial" },
      storeEx: "Perfumaria Bela", sloganEx: "Beleza que cabe no bolso", detailsEx: "frasco 100 ml", badgeEx: "Kit presente",
      disclaimer: GENERIC, theme: "beleza",
      titles: ["Semana da Beleza", "Dia das Mães", "Dia dos Namorados", "Ofertas da Semana"],
      badges: ["Kit presente", "Leve 2 pague 1", "Lançamento", "Em até 3x"],
      products: [["Perfume feminino", "frasco 100 ml", 189.9, 139.9, "Lançamento"], ["Creme hidratante", "pote 250 g", 39.9, 27.9], ["Batom matte", "várias cores", 29.9, 19.9, "Leve 2 pague 1"], ["Kit shampoo + condicionador", "2 × 300 ml", 49.9, 36.9, "Kit presente"]],
      stickers: [["3d-presente", "tl", "s", "Ideal para presentear"], ["3d-coracao", "tr", "s", "Beleza e cuidados"], ["3d-sacola", "footer-left", "m", "Compre e economize"]],
      suggest: ["3d-presente", "3d-coracao", "3d-sacola", "3d-etiqueta", "3d-relogio", "3d-motoboy", "beleza", "presente", "estrelas"],
      captions: { "3d-coracao": "Beleza e cuidados" },
    },
    outro: {
      label: "Outro tipo de loja", emoji: "🏪",
      brand: { name: "Minha Loja", slogan: "As melhores ofertas da cidade", c1: "#2563EB", c2: "#0F172A", c3: "#FACC15", mark: "inicial" },
      storeEx: "Loja do Bairro", sloganEx: "As melhores ofertas da cidade", detailsEx: "unidade", badgeEx: "Leve 3 pague 2",
      disclaimer: GENERIC, theme: "gradiente",
      titles: ["Ofertas da Semana", "Ofertas do Mês", "Saldão", "Aniversário da Loja"],
      badges: ["Leve 3 pague 2", "Leve 2 pague 1", "Em até 3x"],
      products: [["Produto em destaque", "unidade", 49.9, 34.9, "Oferta"], ["Kit promocional", "3 itens", 89.9, 64.9], ["Novidade da semana", "unidade", 29.9, 22.9, "Novidade"], ["Combo econômico", "leve mais, pague menos", 59.9, 44.9]],
      stickers: [["3d-sacola", "footer-left", "m", "Compre e economize"], ["3d-relogio", "tl", "s", "Só hoje"], ["3d-fogo", "tr", "s", "Imperdível"]],
      suggest: ["3d-sacola", "3d-etiqueta", "3d-megafone", "3d-relogio", "3d-fogo", "3d-motoboy", "3d-local"],
      captions: { "3d-coracao": "Feito para você" },
    },
  };
  Object.keys(S).forEach((k) => {
    const s = S[k]; s.id = k;
    s.titles = [...new Set([...s.titles, ...COMMON_TITLES])];
    s.badges = [...new Set([...s.badges, ...COMMON_BADGES])];
  });

  window.SEGMENTS = S;
  window.SEGMENT_ORDER = ["mercado", "acougue", "hortifruti", "padaria", "farmacia", "roupas", "pet", "construcao", "beleza", "outro"];
  window.PHARMA_DISCLAIMER = PHARMA_DISC;
  window.GENERIC_DISCLAIMER = GENERIC;
  window.segmentOf = (id) => S[id] || S.farmacia;
  // Ordena figurinhas: sugeridas primeiro; as específicas de farmácia vão pro fim nos outros segmentos.
  window.orderStickersFor = (id, ids) => {
    const seg = S[id] || S.farmacia, sug = seg.suggest || [];
    const rank = (k) => { const i = sug.indexOf(k); if (i >= 0) return i; if (id !== "farmacia" && PHARMA_ONLY.includes(k)) return 1e4; return 1e3; };
    return ids.map((k, i) => [k, rank(k), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map((x) => x[0]);
  };
  window.isSuggestedSticker = (id, k) => ((S[id] || S.farmacia).suggest || []).includes(k);
})();
