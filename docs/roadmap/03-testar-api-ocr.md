# Tarefa 03 - Testar a API de OCR

## Prioridade: FACIL-MEDIO | Urgencia: ALTA
## Estimativa: ~1h | Arquivos: testes existentes + novos

---

## Problema
Os testes de OCR existem mas precisam ser validados para garantir que o pipeline funciona corretamente antes do fix do OCR no Android.

## Testes Existentes
- `packages/parsers/__tests__/ocrParser.test.ts` - 9 casos de teste
- `packages/parsers/__tests__/importInvoice.test.ts` - pipeline completo
- `packages/parsers/__tests__/classifier.test.ts` - classificacao de categorias
- `packages/parsers/__tests__/qrcodeParser.test.ts` - parsing QR
- `packages/parsers/__tests__/invoiceReducer.test.ts` - state management

## Cenarios para Testar

### Parser de Texto OCR (`ocrParser.ts`)
1. Formato "Qtd x Preco": `ARROZ TIPO 1 5KG 2 x 22,90`
2. Formato "R$ Preco": `CAFE PREMIUM R$ 15,90`
3. Extracao de data (DD/MM/YYYY)
4. Calculo de total quando ausente
5. Filtragem de linhas header/footer (CNPJ, pagamento)
6. Texto OCR vazio
7. Preservacao de confidence score

### Hybrid OCR Adapter (`hybridOcrAdapter.ts`)
1. Fallback chain: TextRecognition -> Tesseract -> CloudVision
2. Erro "module not linked" tratado corretamente
3. Provider selection via config
4. Confidence threshold

## Como Executar
```bash
npx vitest run packages/parsers/__tests__/ocrParser.test.ts
npx vitest run packages/parsers/__tests__/ # todos os testes de parsers
```

## Arquivos Chave
- `packages/parsers/src/ocrParser.ts` - parser principal
- `packages/parsers/src/hybridOcrAdapter.ts` - adapter com fallback
- `packages/parsers/src/ocrService.ts` - wrapper
- `packages/parsers/src/types.ts` - interfaces OCRAdapter/OCRResult
- `src/services/ocrConfigService.ts` - configuracao persistente
