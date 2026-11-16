# Inventário de Dados Persistidos Fora do Log

Este documento inventaria e classifica todas as chaves persistidas fora do log de eventos (`SQLiteEventStore`) em código de produção (`app/`, `src/`, `packages/`), abrangendo `AsyncStorage`, `SecureStore` (incluindo `SecureStorageService`) e `webSecrets`.

## Classes de Classificação

- **`vira evento`**: Preferência ou configuração do usuário que deve ser migrada para o log de eventos (ex.: `SETTING_CHANGED`) para sincronizar entre aparelhos.
- **`usa outro canal`**: Dado que já possui canal próprio de sincronização ou representa o próprio armazenamento local do log.
- **`não sincroniza`**: Estado estritamente local do aparelho (cursores de sync, caches, timestamps, flags de interface, consentimentos locais ou dados sensíveis mantidos fora do sync). Inclui a subclasse **`não sincroniza (consentimento por aparelho)`** para permissões de acesso da IA.
- **`é segredo`**: Credencial, chave criptográfica, token OAuth, chave de API ou configuração de bloqueio local que deve permanecer exclusivamente em armazenamento seguro (`SecureStore` no nativo / `webSecrets` na web) e nunca sincronizar via log comum.

## Inventário Completo

| Chave | Armazenamento | Origem | Classe | Motivo |
|---|---|---|---|---|
| `domus_theme_mode_v1` | AsyncStorage | `src/hooks/useThemePreferences.ts`, `src/context/AppStateProvider.tsx` | `vira evento` | Preferência visual de tema (`system`/`light`/`dark`) que deve acompanhar o usuário entre aparelhos. |
| `domus_sound_enabled_v1` | AsyncStorage | `src/hooks/useThemePreferences.ts`, `src/context/AppStateProvider.tsx` | `vira evento` | Preferência de efeitos sonoros que deve acompanhar o usuário entre aparelhos. |
| `domus_notification_settings_v1` | AsyncStorage | `src/modules/notifications/domain/NotificationSettings.ts`, `src/modules/notifications/application/NotificationSettingsStore.ts` | `vira evento` | Preferências de alertas e horário silencioso que pertencem ao perfil do usuário. |
| `domus_support_modes_v2` | AsyncStorage | `src/modules/monetization/MonetizationSettingsStore.ts` | `vira evento` | Escolha dos modos de apoio ao app que deve refletir a preferência do usuário entre aparelhos. |
| `domus_support_mode_v1` | AsyncStorage | `src/modules/monetization/MonetizationSettingsStore.ts` | `não sincroniza` | Chave legada mantida apenas em leitura para migração para `domus_support_modes_v2`. |
| `@domus:ocr_config` | AsyncStorage | `src/services/ocrConfigService.ts` | `vira evento` | Preferência de provedor de OCR (`mlkit`/`cloud_vision`/`vision_ai`) e endpoint (sem a chave de API). |
| `domus_ai_settings_v1` | SecureStore (`SecureStorageService`) | `src/modules/ai/domain/AISettings.ts`, `src/hooks/useAISettings.ts`, `src/hooks/usePayslipScanner.ts` | `vira evento` | Preferências gerais da IA (provedor, tier, orçamento, voz, tooltips), exceto `AIDataPermissions` que permanece por aparelho. |
| `AIDataPermissions` (`domus_ai_settings_v1.dataPermissions`) | SecureStore (`SecureStorageService`) | `src/modules/ai/domain/AISettings.ts`, `src/hooks/useAISettings.ts` | `não sincroniza (consentimento por aparelho)` | Consentimento granular de quais dados financeiros a IA pode acessar; decisão explícita e isolada por aparelho. |
| `domus_ai_custom_prices` | SecureStore (`SecureStorageService`) | `src/modules/ai/infrastructure/TokenPricingService.ts` | `vira evento` | Tabela customizada de preços de tokens configurada pelo usuário. |
| `domus_events_v1` | webSecrets / AsyncStorage (legado web) | `src/context/webEventLogStorage.ts` | `usa outro canal` | Persistência cifrada do próprio log de eventos na web; os eventos já sincronizam via Nostr e Google Drive. |
| `domus_nostr_group_code` | SecureStore / webSecrets | `src/context/syncStorage.ts` | `é segredo` | Código legado do grupo Nostr usado para derivar chaves de sincronização; migrado para fora do AsyncStorage. |
| `domus_strong_group_secret_v1` | SecureStore / webSecrets | `src/context/syncStorage.ts` | `é segredo` | Segredo criptográfico de 256 bits do Grupo Forte (E2E); compartilhado apenas via pareamento explícito (QR/código). |
| `domus_auto_backup_device_key` | SecureStore / webSecrets | `src/modules/backup/infrastructure/deviceBackupKey.ts` | `é segredo` | Chave criptográfica do dispositivo para cifragem de backups. |
| `domus_gdrive_tokens_v1` | SecureStore / webSecrets | `src/modules/backup/infrastructure/GoogleDriveService.ts` | `é segredo` | Tokens OAuth de acesso e renovação da conta Google Drive deste aparelho. |
| `domus_ocr_cloud_vision_api_key` | SecureStore / webSecrets | `src/services/ocrConfigService.ts` | `é segredo` | Chave de API do Google Cloud Vision configurada pelo usuário. |
| `domus_ai_key_*` | SecureStore (`SecureStorageService`) | `src/modules/ai/domain/AISettings.ts`, `src/modules/ai/infrastructure/SecureKeyService.ts` | `é segredo` | Chaves de API dos provedores de IA (`domus_ai_key_${provider}`) cifradas com AES-256-GCM. |
| `domus_security_settings_v1` | SecureStore (`SecureStorageService`) | `src/modules/security/application/SecurityService.ts`, `src/hooks/useEventStore.ts` | `é segredo` | Configuração de bloqueio local (hash/salt do PIN e biometria) específica deste aparelho. |
| `domus_device_id` | AsyncStorage | `src/context/syncStorage.ts`, `src/hooks/useEventStore.ts` | `não sincroniza` | Identificador único deste aparelho na assinatura e autoria dos eventos. |
| `domus_last_sync_ts` | AsyncStorage | `src/context/syncStorage.ts`, `src/context/useSyncEngine.ts` | `não sincroniza` | Timestamp da última sincronização Nostr executada por este aparelho. |
| `domus_nostr_last_push_hash` | AsyncStorage | `src/context/syncStorage.ts`, `src/context/useSyncEngine.ts` | `não sincroniza` | Hash do último lote de eventos enviado aos relays por este aparelho. |
| `domus_group_push_hashes_v1` | AsyncStorage | `src/context/syncStorage.ts`, `src/context/useSyncEngine.ts` | `não sincroniza` | Mapa local de hashes enviados por grupo Nostr para evitar republicações redundantes. |
| `domus_sync_group_tracking_v1` | AsyncStorage | `src/context/syncStorage.ts`, `src/context/useSyncEngine.ts` | `não sincroniza` | Rastreamento local de eventos confirmados por grupo neste aparelho. |
| `@domus:handled_remote_markers` | AsyncStorage | `src/context/syncStorage.ts` | `não sincroniza` | IDs de marcadores remotos (reset/restore) já processados por este aparelho. |
| `domus_relay_cursor_v1` | AsyncStorage | `src/modules/syncPayload.ts`, `src/modules/syncCoordinator.ts` | `não sincroniza` | Cursor temporal (`created_at`) de leitura nos relays Nostr específico deste aparelho. |
| `domus_nostr_last_pull_ts` | AsyncStorage | `src/modules/syncPayload.ts`, `src/modules/syncCoordinator.ts` | `não sincroniza` | Chave legada de cursor de pull mantida apenas para remoção na limpeza. |
| `domus_legacy_cutoff_warning_sent_*` | AsyncStorage | `src/context/strongGroupSync.ts`, `src/context/useSyncEngine.ts` | `não sincroniza` | Flag local por grupo legado (`domus_legacy_cutoff_warning_sent_${legacyGroupId}`) indicando que este aparelho já publicou o aviso de corte. |
| `domus_auto_backup_last_ts` | AsyncStorage | `src/hooks/useAutoBackup.ts` | `não sincroniza` | Timestamp do último backup automático realizado por este aparelho. |
| `domus_gdrive_last_sync` | AsyncStorage | `src/modules/backup/infrastructure/GoogleDriveService.ts` | `não sincroniza` | Timestamp do último envio de backup para o Google Drive a partir deste aparelho. |
| `domus_gdrive_file_id` | AsyncStorage | `src/modules/backup/infrastructure/GoogleDriveService.ts` | `não sincroniza` | Cache local do ID do arquivo de backup no Google Drive. |
| `domus_is_catholic_v1` | AsyncStorage | `src/hooks/useThemePreferences.ts` | `não sincroniza` | Dado religioso sensível; mantido fora do sync neste épico até a criptografia forte do Épico 10. |
| `domus_analytics_settings_v1` | AsyncStorage | `src/modules/analytics/domain/AnalyticsSettings.ts`, `src/modules/analytics/application/AnalyticsSettingsStore.ts` | `não sincroniza` | Consentimento LGPD de telemetria, performance e crash reports por aparelho. |
| `domus_personalized_ads_v1` | AsyncStorage | `src/modules/monetization/adConsent.ts` | `não sincroniza` | Consentimento de anúncios personalizados específico deste aparelho (AD-6). |
| `domus_external_lookups_v1` | AsyncStorage | `src/modules/privacy/externalLookups.ts` | `não sincroniza` | Consentimento por aparelho para consultas a serviços externos (código de barras, NCM, preços e ícones) (AD-6). |
| `domus_welcome_done_v1` | AsyncStorage | `src/context/DemoModeProvider.tsx`, `src/modules/privacy/externalLookups.ts` | `não sincroniza` | Flag local indicando se o carrossel de boas-vindas já foi concluído neste aparelho. |
| `domus_daily_ad_last_v1` | AsyncStorage | `src/modules/monetization/MonetizationSettingsStore.ts` | `não sincroniza` | Data local da última exibição do anúncio intersticial diário neste aparelho. |
| `domus_screen_intro_v1_*` | AsyncStorage | `src/hooks/useScreenIntro.ts` | `não sincroniza` | Flags locais por tela (`domus_screen_intro_v1_${screenKey}`) de introduções já visualizadas neste aparelho. |
| `domus_ai_last_greeting_date_v1` | AsyncStorage | `app/ai-chat.tsx`, `src/components/debug/DebugTools.tsx` | `não sincroniza` | Data local da última saudação diária da IA gerada neste aparelho. |
| `@domus:ai_chat_history` | AsyncStorage | `src/hooks/useAIConsultant.ts` | `não sincroniza` | Histórico/cache local de mensagens do chat da IA neste aparelho. |
| `@domus/vision_ocr_result` | AsyncStorage | `app/ai-chat.tsx`, `app/import-invoice.tsx` | `não sincroniza` | Buffer temporário local para passagem de resultado de OCR por visão entre telas. |
| `domus_ai_tokens_v1` | SecureStore (`SecureStorageService`) | `src/modules/ai/application/TokenTracker.ts` | `não sincroniza` | Contagem diária local de tokens e caracteres TTS consumidos neste aparelho. |
| `domus_ai_tokens_monthly_v1` | SecureStore (`SecureStorageService`) | `src/modules/ai/application/TokenTracker.ts` | `não sincroniza` | Contagem mensal local de tokens consumidos neste aparelho. |
| `@price_refresh_timestamps` | AsyncStorage | `src/hooks/usePriceRefresh.ts` | `não sincroniza` | Cache local de timestamps de atualização de preços da wishlist neste aparelho. |
| `@domus/siscomex_ncm_cache` | AsyncStorage | `src/services/siscomexCacheService.ts` | `não sincroniza` | Cache local da tabela NCM do Siscomex (~2 MB) para evitar downloads repetidos. |
| `@domus/siscomex_ncm_updated` | AsyncStorage | `src/services/siscomexCacheService.ts` | `não sincroniza` | Timestamp da última atualização do cache local da tabela NCM do Siscomex. |
