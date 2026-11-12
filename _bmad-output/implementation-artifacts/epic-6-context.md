# Epic 6 Context: Segredos protegidos no aparelho

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Garantir que segredos e credenciais sensíveis (chave do OCR, chave do auto-backup, segredos de sincronização e o histórico de eventos na web) nunca fiquem armazenados em texto puro nem sofram queda silenciosa para armazenamento desprotegido. O épico migra chaves para `expo-secure-store` no nativo e `webSecrets` (AES-GCM) na web com migração automática sem perda de dados, remove quedas silenciosas de segurança e introduz barreira automatizada por testes contra novas gravações de segredos em `AsyncStorage` (NFR-1).

## Stories

- Story 6.1: Mover a chave do OCR para o armazenamento seguro
- Story 6.2: Mover a chave do auto-backup para o armazenamento seguro
- Story 6.3: Tirar a queda silenciosa do SecureStore para o AsyncStorage
- Story 6.4: Cifrar o log de eventos da web
- Story 6.5: Barrar por teste novo segredo em AsyncStorage

## Requirements & Constraints

- **Proteção de Segredos Atuais (FR-23):** Todas as credenciais de autenticação, chaves de API e senhas locais devem residir exclusivamente em armazenamento protegido por hardware (`expo-secure-store` com Keychain no iOS e KeyStore / EncryptedSharedPreferences no Android) ou cifradas com AES-GCM via `webSecrets` (WebCrypto com chave não exportável no IndexedDB) na plataforma web.
- **Log Cifrado na Web (FR-18):** Na web, onde não existe SQLite nativo com criptografia de sistema operacional, o log financeiro completo em `AsyncStorage` (`domus_events_v1`) deve ser cifrado com AES-GCM em lote, sem impactar a fluidez da UI em logs volumosos (até 5.000 eventos).
- **Barreira de Não Regressão por Teste (NFR-1):** Verificação automatizada por testes varrendo o código em busca de chamadas de escrita (`AsyncStorage.setItem`) contendo termos como `PASSWORD`, `SECRET`, `TOKEN` ou `API_KEY`, falhando a CI caso qualquer segredo seja gravado fora de exceções documentadas.
- **Migração Transparente e Sem Perdas:** Dispositivos que já possuam chaves gravadas na versão anterior devem migrar os valores de forma automática e transparente no primeiro arranque, sem exigir nova digitação nem invalidar backups pré-existentes.
- **Tratamento de Falha Sem Queda Silenciosa:** Se o armazenamento seguro falhar em tempo de execução, o app não deve gravar o segredo em texto puro em `AsyncStorage`. Deve manter o segredo em memória volátil durante a sessão atual e notificar o usuário com mensagem explicativa em pt-BR via `appAlert`.

## Technical Decisions

- **Armazenamento Seguro Nativo vs Web (AD-6):** Uso de `expo-secure-store` em plataformas móveis nativas (iOS/Android) e módulo `webSecrets` (`src/context/webSecrets.ts`) com WebCrypto API (AES-GCM 256 bits) na Web.
- **Isolamento de Configuração Não Sensível:** No serviço de OCR (`OCRConfigService`), apenas a chave `cloudVisionApiKey` é extraída para armazenamento seguro; as preferências não sensíveis (ex.: `preferredProvider`) permanecem em `AsyncStorage` (`@domus:ocr_config`).
- **Segurança de Auto-Backup:** A chave do dispositivo de auto-backup (`domus_auto_backup_device_key`) migra de `AsyncStorage` para `SecureStore`/`webSecrets` mantendo o valor estritamente idêntico, preservando a capacidade de restauração.
- **Ausência de Alerta Nativo:** Notificações de falha no armazenamento seguro devem utilizar o componente customizado do app (`appAlert` em `src/services/appAlert.ts`), sem uso de `Alert.alert` do sistema.

## Cross-Story Dependencies

- **Sequenciamento interno do Épico 6:**
  - Story 6.1 (Chave do OCR) e Story 6.2 (Chave do auto-backup) padronizam a migração de segredos legados do `AsyncStorage` para `SecureStore` / `webSecrets`.
  - Story 6.3 elimina a queda permissiva para `AsyncStorage` em `saveGroupCode` (`src/context/syncStorage.ts`), mantendo o segredo em memória volátil e alertando o usuário.
  - Story 6.4 estende a cifragem com `webSecrets` para o log completo de eventos da web.
  - Story 6.5 fecha o épico com um teste de regressão estático que bloqueia qualquer nova ocorrência de segredo em `AsyncStorage`.
- **Relação com Épicos Anteriores:**
  - O Épico 4 já blindou o segredo do Grupo forte (`STRONG_GROUP_SECRET_KEY`) em `SecureStore` e `webSecrets`, servindo como modelo arquitetural de referência.
