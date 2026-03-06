# Sistema OCR Híbrido - OrcaFacil

## 📋 Visão Geral

O OrcaFacil possui um sistema OCR (Optical Character Recognition) híbrido que automaticamente tenta múltiplos provedores para garantir o melhor resultado possível na leitura de notas fiscais.

## 🎯 Provedores Disponíveis

### 1. ML Kit OCR via rn-mlkit-ocr (Padrao - ON-DEVICE)
- ✅ **100% Gratuito**
- ✅ **Funciona Offline** (modelo bundled no app)
- ✅ **Alta Precisao**
- ✅ **Rapido** (~1-2 segundos)
- 🔧 **Biblioteca**: [`rn-mlkit-ocr`](https://github.com/ahmeterenodaci/rn-mlkit-ocr)
- 🔧 **Expo Plugin**: Sim (config plugin nativo, `ocrUseBundled: true`)

**Como funciona:**
- Usa ML Kit (Google) no Android e Vision Framework (Apple) no iOS
- Processa localmente no dispositivo (privacidade garantida)
- Suporta Latin scripts (Portugues, Ingles, Espanhol, etc.)
- Modelo bundled no APK/IPA, nao precisa download em runtime

### 2. Tesseract.js (Fallback - REAL)
- ✅ **100% Gratuito**
- ✅ **Open Source**
- ✅ **Funciona em qualquer plataforma** (Web, iOS, Android)
- ⚠️ **Mais Lento** (~3-5 segundos)
- 📦 **Biblioteca**: `tesseract.js`

**Como funciona:**
- Engine OCR open source mais popular do mundo
- Desenvolvido originalmente pela HP, mantido pelo Google
- Processa em JavaScript puro (funciona até no navegador)
- Modelo em Português incluído

### 3. Google Cloud Vision API (Opcional - REAL)
- 💰 **Pago** (requer conta Google Cloud)
- 🌐 **Requer Internet**
- ✅ **Melhor Precisão**
- ✅ **Rápido** (~1-2 segundos)
- 🔑 **Usuário fornece API Key**

**Como funciona:**
- Envia imagem para servidores do Google Cloud
- Usa modelos de IA mais avançados que ML Kit
- Cobra por requisição (grátis até 1000 requisições/mês)
- Perfeito para casos onde precisão é crítica

## 🔄 Fluxo de Fallback Automático

```
┌─────────────────────────────────────┐
│  Usuário tira foto da nota fiscal   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Tenta Provedor Preferido          │
│   (Padrão: ML Kit)                   │
└──────────────┬──────────────────────┘
               │
               ▼
         ┌──────────┐
         │Sucesso?  │
         │Conf≥60%? │
         └─────┬────┘
          Sim  │  Não
               ▼     │
         ┌─────────┐│
         │ Retorna ││
         │Resultado││
         └─────────┘│
                    │
                    ▼
          ┌──────────────────┐
          │ Tenta Tesseract   │
          └─────────┬─────────┘
                    │
                    ▼
              ┌──────────┐
              │Sucesso?  │
              │Conf≥60%? │
              └─────┬────┘
          Sim       │  Não
                    ▼     │
              ┌─────────┐│
              │ Retorna ││
              │Resultado││
              └─────────┘│
                         │
                         ▼
               ┌──────────────────┐
               │ Tenta Cloud Vision│
               │ (se configurado)  │
               └─────────┬─────────┘
                         │
                         ▼
                   ┌──────────┐
                   │ Sucesso? │
                   └─────┬────┘
                    Sim  │  Não
                         ▼     │
                   ┌─────────┐│
                   │ Retorna ││
                   │Resultado││
                   └─────────┘│
                              │
                              ▼
                        ┌──────────┐
                        │  Erro    │
                        │ "Nenhum" │
                        │"provedor"│
                        │"funcionou"
                        └──────────┘
```

## ⚙️ Como Configurar

### Configuracao Padrao (ML Kit)

O rn-mlkit-ocr possui um Expo config plugin que configura tudo automaticamente.
Nao e necessario rodar `npx expo prebuild` manualmente.

1. Instale as dependencias:
```bash
npm install
```

2. Compile o app via EAS Build ou localmente:
```bash
eas build --profile development --platform android
# ou localmente:
npm run android  # ou npm run ios
```

3. Pronto! O OCR ja funciona com suporte a Portugues (script latino).

### Configuração Opcional (Cloud Vision API)

Se você quiser usar o Cloud Vision para máxima precisão:

#### 1. Criar Projeto no Google Cloud

```bash
# Acesse: https://console.cloud.google.com
```

1. Crie um novo projeto ou selecione existente
2. Ative a **Cloud Vision API**
3. Vá em **APIs & Services > Credentials**
4. Clique em **Create Credentials > API Key**
5. Copie a API Key gerada

#### 2. Configurar no App

1. Abra o OrcaFacil
2. Vá em **Importar Nota Fiscal**
3. Clique em **⚙️ Configurar OCR**
4. Selecione **Cloud Vision API** como provedor preferido
5. Cole sua API Key
6. Salve

#### 3. Pronto!

Agora o sistema usará Cloud Vision primeiro, com fallback para ML Kit e Tesseract se necessário.

## 📱 Como Usar

### Opção 1: QR Code (Recomendado)

**Melhor opção**: Dados vêm direto da SEFAZ, 100% precisos.

1. Abra **Importar Nota Fiscal**
2. Escolha:
   - **Escanear QR Code** → Usa câmera ao vivo
   - **Ler QR da Galeria** → Usa foto salva

### Opção 2: OCR (Notas sem QR)

**Para notas antigas ou danificadas**:

1. Abra **Importar Nota Fiscal**
2. Escolha:
   - **Tirar Foto para OCR** → Tira foto direto
   - **Importar da Galeria** → Usa foto salva
3. Sistema processa com ML Kit → Tesseract → Cloud Vision (se configurado)
4. Revise os itens reconhecidos
5. Confirme importação

## 🎯 Dicas para Melhor Precisão

### Ao Tirar Foto para OCR:

1. **Iluminação**: Boa luz natural ou artificial uniforme
2. **Foco**: Aguarde câmera focar antes de tirar
3. **Enquadramento**: Nota inteira visível, sem cortes
4. **Ângulo**: Perpendicular à nota (não de lado)
5. **Fundo**: Contraste com a nota (ex: nota branca em mesa escura)
6. **Resolução**: Não use zoom digital, aproxime o celular

### Exemplos:

#### ✅ BOM
```
┌────────────────────┐
│                    │
│  📄 NOTA FISCAL    │
│                    │
│  Item 1  R$ 10,00  │
│  Item 2  R$ 20,00  │
│                    │
│  TOTAL   R$ 30,00  │
│                    │
└────────────────────┘
   (Foto reta, bem iluminada)
```

#### ❌ RUIM
```
    ┌─────────────┐
   /              /
  /  📄 NOTA     /
 /     (SOMBRA) /
└──────────────┘
   (Foto de lado, com sombra)
```

## 🔍 O Que é Extraído

O sistema OCR extrai automaticamente:

### Informações da Empresa
- Nome do estabelecimento
- CNPJ (quando disponível)

### Itens da Nota
- **Descrição** do produto
- **Quantidade**
- **Preço unitário**
- **Preço total**

### Valores
- **Total da nota**
- **Frete** (quando presente)
- **Descontos** (quando presentes)

### Metadados
- **Data** da compra
- **Chave de acesso** (quando disponível)

## 🎨 Classificação Automática

Após extrair o texto, o sistema:

1. **Classifica cada item** em categorias (alimentação, higiene, lazer, etc.)
2. **Reclassifica frete** para categoria predominante
3. **Calcula 50/30/20** automaticamente
4. **Cria transação** com itens individualizados

## 🐛 Troubleshooting

### "Nenhum texto detectado"

**Causa**: Imagem muito escura ou desfocada
**Solução**: Tire nova foto com melhor iluminação

### "Confidence muito baixa"

**Causa**: Texto difícil de ler (borrado, amassado)
**Solução**:
1. Tente alisar a nota
2. Melhore iluminação
3. Configure Cloud Vision API para melhor precisão

### "Itens errados reconhecidos"

**Causa**: OCR confundiu cabeçalho/rodapé com itens
**Solução**: Sistema filtra automaticamente termos comuns. Se persistir, use QR Code.

### "ML Kit nao funciona"

**Causa**: App rodando no Expo Go (sem modulos nativos) ou modelo nao incluido
**Solucao**: Faca um build nativo via EAS Build ou localmente:
```bash
eas build --profile development --platform android
# ou localmente:
npm run android
```

### "Cloud Vision retorna erro 403"

**Causa**: API Key inválida ou API não ativada
**Solução**:
1. Verifique se Cloud Vision API está ativa no projeto
2. Confirme que API Key está correta
3. Verifique cotas no Google Cloud Console

## 📊 Performance

| Provedor      | Tempo Médio | Precisão | Offline | Custo         |
|---------------|-------------|----------|---------|---------------|
| ML Kit        | 1-2s        | 85-90%   | ✅ Sim  | Grátis        |
| Tesseract     | 3-5s        | 75-85%   | ✅ Sim  | Grátis        |
| Cloud Vision  | 1-2s        | 95-98%   | ❌ Não  | $1.50/1000req |

## 🔐 Privacidade

### ML Kit
- ✅ Processa **100% localmente** no dispositivo
- ✅ Nenhum dado enviado para servidores
- ✅ Modelo baixado apenas uma vez

### Tesseract
- ✅ Processa **100% localmente** (JavaScript)
- ✅ Nenhum dado enviado para servidores
- ✅ Totalmente open source

### Cloud Vision (Opcional)
- ⚠️ Imagem **enviada** para Google Cloud
- ⚠️ Processada em servidores do Google
- ✅ Dados **não armazenados** (conforme política Google)
- ✅ Usuário **controla** quando usar (configurável)

## 📚 Referencias e Creditos

### Bibliotecas OCR
| Biblioteca | Autor | Licenca | Docs Oficiais |
|---|---|---|---|
| [rn-mlkit-ocr](https://github.com/ahmeterenodaci/rn-mlkit-ocr) | [@ahmeterenodaci](https://github.com/ahmeterenodaci) | MIT | [README](https://github.com/ahmeterenodaci/rn-mlkit-ocr#readme) |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | naptha | Apache-2.0 | [Docs](https://tesseract.projectnaptha.com/) |

### Documentacao Oficial
- [Google ML Kit Text Recognition](https://developers.google.com/ml-kit/vision/text-recognition) - Engine por tras do rn-mlkit-ocr
- [ML Kit Supported Languages](https://developers.google.com/ml-kit/vision/text-recognition/v2/languages) - Lista completa de idiomas suportados
- [Google Cloud Vision API](https://cloud.google.com/vision/docs/ocr) - API paga opcional (fallback)

### Expo / React Native
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

## 🚀 Próximos Passos

Melhorias futuras planejadas:

1. **Pré-processamento de imagem**
   - Correção de perspectiva
   - Ajuste de contraste/brilho
   - Remoção de ruído

2. **Treinamento customizado**
   - Modelo específico para notas fiscais brasileiras
   - Reconhecimento de formato NFC-e/NF-e

3. **Cache inteligente**
   - Evitar reprocessar mesma nota
   - Histórico de OCR com scores

4. **Feedback do usuário**
   - Permitir correção de itens mal reconhecidos
   - Melhorar modelo com feedbacks

---

**Desenvolvido com ❤️ para o OrcaFacil**
