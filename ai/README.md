# Modelos de IA (processamento no aparelho)

Usados só quando a pessoa toca em **Deixar bonita com IA**.
Não entram no precache do service worker; o app baixa na primeira vez e guarda no Cache Storage (`vitrine-ai-v1`).

| Arquivo | Tamanho | Uso | Licença |
|---|---|---|---|
| `isnet-u8.onnx` | 46.539.271 bytes (~44 MiB) | Recorte principal (IS-Net / DIS "isnet-general-use", pesos em 8 bits, entrada dinâmica) | Apache-2.0 (DIS, Qin et al.) |
| `u2netp.onnx` | 4.574.861 bytes (~4,4 MiB) | Modo leve (aparelhos com < 2 GB) e reserva se o IS-Net falhar | Apache-2.0 (U-2-Net, Qin et al.) |
| `ort/ort.wasm.min.js` + `ort/ort-wasm-simd.wasm` | ~10,2 MiB | Motor | MIT (ONNX Runtime 1.17.3) |

Primeira vez: ~57 MB (IS-Net + motor). Depois funciona offline.

Como o `isnet-u8.onnx` foi gerado a partir de `isnet-general-use.onnx` (rembg v0.0.0, 178.648.008 bytes):
1. só a saída principal `output_image` (removidas as 11 saídas auxiliares);
2. altura/largura dinâmicas (os `Resize` passam a usar o tamanho do tensor de atalho), para rodar em 640/768/1024 px mantendo a proporção;
3. pesos das convoluções quantizados por canal para uint8 com `DequantizeLinear` (cálculo continua em float32). Diferença média da máscara vs. float32: < 0,2%.
