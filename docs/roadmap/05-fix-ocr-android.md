# Tarefa 05 - Corrigir OCR no Android (Build) - CONCLUIDA

## Prioridade: MEDIO | Urgencia: CRITICA
## Status: CONCLUIDA

---

## Problema Original
O leitor de OCR nao funcionava apos build para Android. O erro indicava que o modulo nativo `react-native-text-recognition` nao estava linkado.

## Causa Raiz
1. `react-native-text-recognition@1.0.2` nao possui Expo config plugin
2. Patch existente so atualizava gradle SDK 29->34, nao resolvia linking
3. Biblioteca abandonada, sem suporte a Expo SDK 54+

## Solucao Aplicada: Migracao para `rn-mlkit-ocr`

### O que foi feito:
1. **Removido** `react-native-text-recognition` e seu patch (`react-native-text-recognition+1.0.2.patch`)
2. **Instalado** `rn-mlkit-ocr` - possui Expo config plugin nativo
3. **Configurado** plugin em `app.json` com `languageModelType: "bundled"` (modelo Latin bundled no APK)
4. **Atualizado** `HybridOCRAdapter` para usar `MlkitOcr.detectFromUri()` ao inves de `TextRecognition.default.recognize()`
5. **Atualizado** provider padrao de `textrecognition` para `mlkit` em:
   - `hybridOcrAdapter.ts`
   - `useInvoiceScanner.ts`
   - `ocrConfigService.ts`
   - `ocr-settings.tsx`
6. **Atualizado** documentacao (`OCR_SYSTEM.md`, `ROADMAP.md`)

### Arquivos Modificados
| Arquivo | Mudanca |
|---------|---------|
| `package.json` | -react-native-text-recognition, +rn-mlkit-ocr |
| `app.json` | +plugin rn-mlkit-ocr (bundled) |
| `packages/parsers/src/hybridOcrAdapter.ts` | MlkitOcr.detectFromUri() |
| `src/hooks/useInvoiceScanner.ts` | Provider padrao → mlkit |
| `src/services/ocrConfigService.ts` | Default → mlkit |
| `app/ocr-settings.tsx` | UI atualizada para mlkit |
| `patches/react-native-text-recognition+1.0.2.patch` | REMOVIDO |

### Compatibilidade Mantida
- `textrecognition` como provider e tratado como alias para `mlkit` no adapter
- Fallback chain continua: mlkit → cloudvision
- Tesseract continua disponivel apenas na web
- Tela de configuracoes OCR mantida com mesma UX

### Referencia
- [rn-mlkit-ocr (GitHub)](https://github.com/ahmeterenodaci/rn-mlkit-ocr)
- [ML Kit Text Recognition (Google)](https://developers.google.com/ml-kit/vision/text-recognition)
