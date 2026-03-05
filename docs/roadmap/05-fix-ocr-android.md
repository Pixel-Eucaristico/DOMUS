# Tarefa 05 - Corrigir OCR que Nao Funciona no Android (Build)

## Prioridade: MEDIO | Urgencia: CRITICA
## Estimativa: ~3-4h | Arquivos: ~5

---

## Problema
O leitor de OCR nao funciona apos build para Android. O erro indica que o modulo nativo `react-native-text-recognition` nao esta linkado.

## Diagnostico Detalhado

### Fluxo do Erro
```
Usuario clica "OCR Foto"
  -> OcrScanScreen captura imagem
  -> handleOCRMultiple() chamado (useInvoiceScanner.ts:66)
  -> buildOCRService() cria HybridOCRAdapter
  -> recognizeWithTextRecognition() importado dinamicamente
  -> ERRO: "Module doesn't seem to be linked"
  -> Convertido para "OCR_UNAVAILABLE"
  -> Mostra: "OCR nao disponivel. Faca o build nativo (expo prebuild)..."
```

### Causa Raiz
1. **Modulo nativo nao compilado:** `react-native-text-recognition` usa ML Kit (Android) que precisa ser compilado nativamente
2. **Patch incompleto:** Existe patch `react-native-text-recognition+1.0.2.patch` que atualiza SDK 29->34 e buildTools 29.0.2->34.0.0, mas nao resolve linking
3. **eas.json sem prebuild:** Configuracao de build nao inclui `expo prebuild` explicitamente
4. **Tesseract indisponivel em mobile:** Fallback para Tesseract.js verifica `typeof document === "undefined"` e pula em React Native (requer Web Workers + WASM)

### Arquivos Envolvidos
| Arquivo | Papel | Linha Chave |
|---------|-------|-------------|
| `packages/parsers/src/hybridOcrAdapter.ts` | Adapter com fallback chain | L105-128 (erro "not linked") |
| `src/hooks/useInvoiceScanner.ts` | Trigger OCR + error handling | L66, L94-107 |
| `src/components/invoice/OcrScanScreen.tsx` | UI camera para OCR | Captura de imagem |
| `eas.json` | Config de build | Falta prebuild config |
| `app.json` | Plugins Expo | L65-69 (vision-camera config) |
| `patches/react-native-text-recognition+1.0.2.patch` | Fix versoes gradle | SDK/buildTools update |

## Solucao Proposta

### Passo 1: Verificar/Corrigir eas.json
```json
{
  "build": {
    "development": {
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Passo 2: Garantir expo prebuild
```bash
npx expo prebuild --clean
```
Isso gera o projeto Android nativo com todas as dependencias linkadas.

### Passo 3: Verificar AndroidManifest.xml
Confirmar que permissoes de camera estao presentes apos prebuild.

### Passo 4: Testar build local
```bash
npx expo run:android
```

### Passo 5: Melhorar error handling
Em `hybridOcrAdapter.ts`, adicionar mensagem mais especifica sobre o que fazer quando OCR falha.

## Alternativa: Substituir react-native-text-recognition
Se o modulo continuar problematico, considerar migrar para:
- `@react-native-ml-kit/text-recognition` (mais mantido)
- `expo-camera` com frame processor + ML Kit

## Pontos de Atencao
- O patch existente pode conflitar com versoes novas do gradle
- `react-native-vision-camera` esta configurado no app.json mas NAO e usado para OCR (e usado para QR)
- Cloud Vision API e fallback pago que requer internet + API key
