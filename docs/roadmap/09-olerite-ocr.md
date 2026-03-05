# Tarefa 09 - Adicionar Leitor de Olerite por OCR

## Prioridade: COMPLEXO | Urgencia: MEDIA
## Estimativa: ~6-10h | Arquivos: ~8-12

---

## Problema
Adicionar funcionalidade de leitura de olerite (medidor de oleo) via OCR que:
1. Capture o valor via camera/OCR
2. Adicione diretamente como valor no app
3. Armazene historico dos valores para referencia futura

## Conceito
"Olerite" refere-se a leituras de medidores (possivelmente oleometros, medidores de combustivel ou oleo). O sistema deve:
- Capturar imagem do medidor
- Extrair valor numerico via OCR
- Salvar como transacao ou registro separado
- Manter historico para comparacao

## Dependencia
- **Tarefa 05 (Fix OCR Android)** deve ser concluida primeiro, pois o OCR base precisa funcionar

## Arquitetura Proposta

### 1. Novo Parser: `oleriteParser.ts`
```typescript
// packages/parsers/src/oleriteParser.ts
interface OleriteReading {
  value: number;        // Valor lido
  unit: string;         // Litros, ml, etc.
  confidence: number;   // Confianca do OCR
  imageUri: string;     // Foto original
  timestamp: Date;
  location?: string;    // Opcional: local da leitura
}

function parseOleriteFromOCR(ocrText: string): OleriteReading | null {
  // Regex para extrair numeros de medidores
  // Padroes comuns: "123.456", "1234,5 L", "Vol: 45.2"
}
```

### 2. Storage: Historico de Leituras
```typescript
// Novo evento no event sourcing
interface OleriteReadingEvent {
  type: "OLERITE_READING_ADDED";
  payload: OleriteReading;
}
```

### 3. Tela de Captura
- Reutilizar `OcrScanScreen.tsx` como base
- Adicionar modo "medidor" com guia visual para posicionar camera
- Preview do valor extraido com opcao de corrigir manualmente

### 4. Tela de Historico
- Lista cronologica de leituras
- Grafico de evolucao dos valores
- Calculo de consumo medio entre leituras

## Arquivos a Criar/Modificar
| Arquivo | Acao |
|---------|------|
| `packages/parsers/src/oleriteParser.ts` | CRIAR - parser especifico |
| `packages/parsers/src/types.ts` | MODIFICAR - adicionar interfaces |
| `app/olerite.tsx` | CRIAR - tela principal |
| `src/components/olerite/` | CRIAR - componentes UI |
| `packages/domain/src/olerite.ts` | CRIAR - eventos/reducer |
| `packages/events/src/types.ts` | MODIFICAR - novo tipo evento |
| `src/hooks/useOleriteScanner.ts` | CRIAR - hook de captura |
| `packages/parsers/__tests__/oleriteParser.test.ts` | CRIAR - testes |

## Pontos de Atencao
- Depende do OCR funcionar no Android (Tarefa 05)
- Numeros em medidores podem ter fontes/formatos peculiares
- Considerar usar ML Kit com modelo customizado para melhor precisao em medidores
- Valores devem ser validados (range razoavel, formato numerico)
- Historico pode ser util para calcular consumo mensal automaticamente
