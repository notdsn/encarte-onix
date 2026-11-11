# Modelos de IA (processamento no aparelho)

Usados só quando a pessoa toca em **Deixar bonita com IA**.
Não entram no precache do service worker; o app baixa na primeira vez e guarda no Cache Storage.

| Arquivo | Tamanho | Licença |
|---|---|---|
| `u2netp.onnx` | 4.574.861 bytes (~4,4 MiB) | Apache-2.0 (U-2-Net, Qin et al.) |
| `ort/ort.wasm.min.js` + `ort/ort-wasm-simd.wasm` | ~10,2 MiB | MIT (ONNX Runtime 1.17.3) |

Total na primeira vez: cerca de 14,6 MB. Depois funciona offline.
