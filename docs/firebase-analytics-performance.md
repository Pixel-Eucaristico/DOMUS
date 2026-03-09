# Firebase Analytics & Performance no DOMUS

Guia completo e amigável para entender, usar e manter o Firebase Analytics e Performance Monitoring no projeto DOMUS.

---

## O que é o quê?

### Firebase Analytics
Pense nele como um "contador de cliques inteligente". Ele registra **o que os usuários fazem** no app:
- Qual tela abriram
- Qual botão clicaram
- Quanto tempo ficaram em cada lugar
- Se o app crashou

**Nenhum dado financeiro é coletado** — apenas métricas de navegação e uso.

### Firebase Performance Monitoring
Pense nele como um "médico do app". Ele mede **a saúde técnica**:
- Quanto tempo o app demora para abrir
- Se alguma tela está lenta (FPS baixo)
- Se chamadas de rede estão demorando
- Frames lentos e congelados

---

## Como funciona no DOMUS?

### Fluxo do consentimento

```
App abre pela primeira vez
        │
        ▼
┌─────────────────────────┐
│ Modal de Consentimento  │
│                         │
│  "Compartilhar Dados    │
│   Anônimos"             │
│                         │
│  "Não, obrigado"        │
└──────────┬──────────────┘
           │
     ┌─────┴─────┐
     │           │
   Aceita     Recusa
     │           │
     ▼           ▼
  Firebase    Nada é
  ligado      coletado
```

**Importante**: A coleta começa **desligada por padrão**. Só liga se o usuário aceitar.

O usuário pode mudar de ideia a qualquer momento em:
**Configurações → Analytics & Performance**

---

## Estrutura dos Arquivos

```
src/modules/analytics/
├── domain/
│   └── AnalyticsSettings.ts          ← Modelo de dados (o que salvar)
├── application/
│   └── AnalyticsSettingsStore.ts      ← Lê/salva preferências no AsyncStorage
└── infrastructure/
    └── AnalyticsService.ts            ← Fala com o Firebase de verdade

src/components/analytics/
└── AnalyticsConsentModal.tsx          ← Modal bonito de "aceita ou não?"

src/hooks/
└── useAnalyticsInit.ts                ← Hook que inicializa no startup

app/
└── analytics-settings.tsx             ← Tela de configurações

Raiz do projeto:
├── google-services.json               ← Config Firebase para Android
├── GoogleService-Info.plist            ← Config Firebase para iOS
└── firebase.json                       ← Desabilita coleta automática
```

---

## Como os dados são salvos localmente

As preferências do usuário ficam no **AsyncStorage** (no celular), com a chave:
```
domus_analytics_settings_v1
```

O formato salvo é:
```json
{
  "analyticsEnabled": false,
  "performanceEnabled": false,
  "hasCompletedConsent": false
}
```

- `analyticsEnabled` → Usuário quer enviar dados de uso?
- `performanceEnabled` → Usuário quer enviar dados de performance?
- `hasCompletedConsent` → Já viu o modal? (para não mostrar de novo)

---

## Como o Firebase é inicializado

### 1. App abre → `useAnalyticsInit` roda
```
_layout.tsx
    └── <AnalyticsInitRunner />
            └── useAnalyticsInit()
                    └── initFirebase()
```

### 2. `initFirebase()` verifica as preferências
```
1. Lê as configurações salvas
2. Se nenhum toggle está ligado → NÃO inicializa (nada acontece)
3. Se analytics está ligado → Liga coleta de analytics
4. Se performance está ligado → Liga coleta de performance
```

### 3. Tudo é lazy-loaded
As bibliotecas do Firebase são importadas com `await import(...)`, ou seja:
- Se o usuário **nunca aceitar**, o Firebase **nunca é carregado** na memória
- Não afeta performance de quem não quer usar
- Na web, tudo é ignorado automaticamente

---

## Como registrar eventos personalizados

### Evento simples
```typescript
import { logEvent } from "@/src/modules/analytics/infrastructure/AnalyticsService";

// Registrar que o usuário criou uma transação
await logEvent("transaction_created", {
  type: "expense",          // receita ou despesa
  category: "alimentacao",  // categoria
});
```

### Registrar tela visitada
```typescript
import { logScreenView } from "@/src/modules/analytics/infrastructure/AnalyticsService";

// Registrar que o usuário abriu a tela de transações
await logScreenView("TransactionsScreen");
```

### Eventos que o Firebase já rastreia automaticamente (sem código)
Quando analytics está habilitado, o Firebase já coleta sozinho:
| Evento | O que é |
|--------|---------|
| `first_open` | Primeira vez que abriu o app |
| `session_start` | Iniciou uma sessão |
| `app_update` | Atualizou o app |
| `app_remove` | Desinstalou o app |
| `os_update` | Atualizou o sistema operacional |
| `app_exception` | App crashou |

Você **não precisa** registrar esses — são automáticos.

---

## Como ver os dados no Firebase Console

### Acessar o Console
1. Abra https://console.firebase.google.com
2. Selecione o projeto **domus-finance-97990251-ae0b0**
3. No menu lateral, clique em **Analytics** ou **Performance**

### Analytics → Dashboard
- **Usuários ativos**: Quantas pessoas estão usando agora
- **Eventos**: Lista de todos os eventos registrados
- **Telas**: Quais telas são mais visitadas
- **Retenção**: Quantos usuários voltam depois de X dias
- **Dados demográficos**: País, idioma, dispositivo (sem dados pessoais)

### Analytics → Events
Aqui você vê todos os eventos (os automáticos + os seus personalizados).
Clique em qualquer evento para ver:
- Quantas vezes aconteceu
- Em quais dispositivos
- Distribuição por dia/semana

### Performance → Dashboard
- **Tempo de inicialização**: Quanto tempo leva para o app abrir
- **Telas lentas**: Quais telas têm frames lentos
- **Requisições HTTP**: Tempo de resposta de APIs
- **Traces personalizados**: Medições que você criar (ver abaixo)

---

## Como medir performance de código específico

### Trace personalizado (medir tempo de algo)
```typescript
import perf from "@react-native-firebase/perf";

async function importarNotaFiscal(file: string) {
  // Cria um "cronômetro" chamado "import_invoice"
  const trace = await perf().newTrace("import_invoice");
  await trace.start();

  // ... seu código aqui ...
  const resultado = await processarArquivo(file);

  // Adiciona informações extras ao trace
  trace.putMetric("items_count", resultado.items.length);
  trace.putAttribute("file_type", "xml");

  await trace.stop(); // Para o cronômetro

  return resultado;
}
```

No Firebase Console → Performance → Traces, você vai ver:
- Tempo médio da operação `import_invoice`
- Distribuição (percentil 50, 90, 95)
- Quantidade de itens processados
- Tipo de arquivo

### Monitorar requisição HTTP (automático)
O Firebase Performance **já monitora automaticamente** todas as requisições HTTP/HTTPS. Você vai ver no console:
- URL da requisição
- Tempo de resposta
- Taxa de sucesso
- Tamanho da resposta

---

## Como funciona o `firebase.json`

O arquivo `firebase.json` na raiz do projeto controla o comportamento **padrão** do Firebase antes de qualquer código rodar:

```json
{
  "react-native": {
    "analytics_auto_collection_enabled": false,
    "perf_auto_perf_collection_enabled": false
  }
}
```

**Por que `false`?** Porque queremos que o usuário escolha primeiro. Se fosse `true`, o Firebase começaria a coletar dados desde o primeiro segundo, antes mesmo do modal aparecer.

Depois que o usuário aceita, nosso código liga a coleta manualmente:
```typescript
analytics().setAnalyticsCollectionEnabled(true);
perf().setPerformanceCollectionEnabled(true);
```

---

## Como funciona o `google-services.json` e `GoogleService-Info.plist`

Esses são os "cartões de identidade" que conectam o app ao projeto Firebase.

| Arquivo | Plataforma | Onde fica |
|---------|-----------|-----------|
| `google-services.json` | Android | Raiz do projeto |
| `GoogleService-Info.plist` | iOS | Raiz do projeto |

O Expo lê esses arquivos graças às configurações no `app.json`:
```json
"android": {
  "googleServicesFile": "./google-services.json"
},
"ios": {
  "googleServicesFile": "./GoogleService-Info.plist"
}
```

**NUNCA** compartilhe esses arquivos publicamente (coloque no `.gitignore` se o repo for público). Eles contêm a API key do Firebase.

---

## Configuração do Expo (o que cada coisa faz)

### `app.json` → plugins

```json
// Garante que a build nativa tem as versões certas
["expo-build-properties", {
  "android": { "minSdkVersion": 24, "compileSdkVersion": 35, "targetSdkVersion": 35 },
  "ios": { "deploymentTarget": "15.1", "useFrameworks": "static" }
}]

// Inicializa o Firebase nativo (obrigatório, sempre primeiro)
["@react-native-firebase/app", {
  "android_app_id": "...",
  "ios_app_id": "..."
}]

// Habilita Firebase Performance na build nativa
"@react-native-firebase/perf"
```

### `expo-dev-client`
O Firebase usa **código nativo** (Java/Kotlin no Android, Swift/ObjC no iOS). O Expo Go padrão **não suporta** código nativo customizado. Por isso instalamos o `expo-dev-client`:
- Cria um "Expo Go personalizado" que inclui as libs nativas
- Necessário para **testar** Firebase no celular durante desenvolvimento

### Como gerar a build de desenvolvimento
```bash
# Gera o APK de desenvolvimento (Android)
eas build --platform android --profile development

# Instale o APK no celular e abra
# Depois rode o metro bundler:
npx expo start --dev-client
```

---

## Checklist: Tudo que precisa estar configurado

### Arquivos na raiz
- [x] `google-services.json` — Config Android (baixado do Firebase Console)
- [x] `GoogleService-Info.plist` — Config iOS (baixado do Firebase Console)
- [x] `firebase.json` — Desabilita coleta automática

### package.json (dependências)
- [x] `@react-native-firebase/app` — Core do Firebase
- [x] `@react-native-firebase/analytics` — Analytics
- [x] `@react-native-firebase/perf` — Performance
- [x] `expo-dev-client` — Dev client para código nativo
- [x] `expo-build-properties` — Config de build nativa

### app.json (plugins na ordem)
- [x] `expo-build-properties` (com minSdkVersion e useFrameworks)
- [x] `@react-native-firebase/app` (com app IDs)
- [x] `@react-native-firebase/perf`

### app.json (plataformas)
- [x] `android.googleServicesFile` → `./google-services.json`
- [x] `ios.googleServicesFile` → `./GoogleService-Info.plist`

### Código
- [x] `AnalyticsService.ts` — Serviço de inicialização e eventos
- [x] `AnalyticsConsentModal.tsx` — Modal de consentimento
- [x] `useAnalyticsInit.ts` — Hook de inicialização
- [x] `analytics-settings.tsx` — Tela de configurações
- [x] `_layout.tsx` — Integração do init + consent host + rota

---

## Perguntas Frequentes

### "O app vai ficar mais pesado?"
Sim, mas pouco. O Firebase adiciona ~2-3 MB ao tamanho do app. O maior impacto é no **tempo de build**, não no tamanho.

### "E se o usuário recusar, o Firebase carrega mesmo assim?"
**Não.** Usamos lazy-loading (`await import(...)`). Se o usuário recusar, as libs do Firebase nunca são importadas para a memória.

### "Funciona na web?"
**Não.** Todas as funções verificam `Platform.OS === "web"` e retornam imediatamente. O Firebase neste projeto é exclusivo para Android e iOS.

### "Funciona no Expo Go?"
**Não.** O Firebase usa código nativo, então precisa do `expo-dev-client`. Use `eas build --profile development` para gerar um dev client.

### "Quanto tempo demora para os dados aparecerem no Console?"
- **Tempo real** (StreamView): ~5 segundos
- **Relatórios completos**: 24 a 48 horas
- **Performance**: ~12 horas para o primeiro dado

### "Como debugar se os eventos estão sendo enviados?"
```bash
# Android — ver eventos em tempo real no terminal
adb shell setprop debug.firebase.analytics.app br.com.pixeleucaristico.domus

# Depois abra o Firebase Console → Analytics → DebugView
# Os eventos aparecem em tempo real
```

### "Posso adicionar mais módulos do Firebase depois?"
Sim! Exemplos comuns:
```bash
npm install @react-native-firebase/crashlytics  # Relatórios de crash detalhados
npm install @react-native-firebase/messaging     # Push notifications (FCM)
npm install @react-native-firebase/remote-config # Configuração remota (A/B testing)
```
Depois adicione o plugin no `app.json` e faça uma nova build.

---

## Referências

- [React Native Firebase — Docs oficiais](https://rnfirebase.io/)
- [Firebase Analytics — Referência](https://rnfirebase.io/analytics/usage)
- [Firebase Performance — Referência](https://rnfirebase.io/perf/usage)
- [Expo + Firebase — Guia oficial](https://docs.expo.dev/guides/using-firebase/)
- [Firebase Console](https://console.firebase.google.com/project/domus-finance-97990251-ae0b0)
