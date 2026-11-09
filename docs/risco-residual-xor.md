# Análise de Risco Residual: Histórico Passado em Cifra XOR (Story 4.9)

## 1. Resumo Executivo

Este documento registra a análise técnica formal e a avaliação de risco residual associadas aos dados históricos transmitidos através do protocolo legado de sincronização do aplicativo DOMUS.

Entre as versões 1.0.0 e 1.7.9, a sincronização descentralizada do DOMUS baseava-se em um código de grupo curto de 6 caracteres alfanuméricos e uma cifra de fluxo simétrica simples (XOR), sem autenticação de mensagens (AEAD), transmitida através de relays Nostr públicos.

Com a implantação do Epic 4 ("Sync privado de verdade"), o DOMUS introduziu o **Grupo forte** baseado em Segredo de alta entropia de 256 bits (`DOMUS1-...`), chaves independentes derivadas via HKDF e criptografia autenticada AES-GCM com nonces únicos de 96 bits.

A Story 4.9 conclui o corte definitivo do canal legado em `2026-11-20T00:00:00.000Z` e na versão mínima `1.8.0`, bloqueando integralmente qualquer leitura ou escrita no formato XOR. O objetivo deste documento é explicitar os limites de confidencialidade dos eventos passados trafegados em relays públicos antes do corte e atestar as mitigações que habilitam a reativação honesta da declaração de "criptografia de ponta a ponta" (Story 4.10).

---

## 2. Anatomia do Formato Legado e Vetores de Vulnerabilidade

### 2.1 Espaço de Chaves e Entropia Reduzida

O código legado consistia em 6 caracteres escolhidos em um alfabeto de 32 símbolos (Base32 Crockford simplificado), totalizando:

$$\text{Espaço de combinações} = 32^6 = 2^{30} \approx 1{,}07 \times 10^9 \text{ possibilidades}$$

Uma entropia efetiva de aproximadamente 30 bits é insuficiente para resistir a ataques de força bruta computadorizada moderna:
- Um adversário com hardware modesto (GPU de consumo) consegue percorrer $2^{30}$ combinações em menos de 10 segundos.
- A semente de derivação da identidade Nostr (`privateKey` e `publicKey`) e da chave de cifra XOR era gerada a partir da repetição da string do código de 6 caracteres até preencher 32 bytes (com SHA-256), tornando a chave pública no relay Nostr trivialmente reversível por dicionário ou tabela de busca pré-computada (Rainbow table).

### 2.2 Cifra XOR sem Autenticação

A operação de cifragem consistia em um XOR byte a byte com chave estática:

$$C_i = P_i \oplus K_{(i \bmod |K|)}$$

Essa construção apresenta fraquezas criptográficas severas:
1. **Reutilização de chave estática (Two-Time Pad):** Se duas mensagens são cifradas com a mesma chave, $C_1 \oplus C_2 = P_1 \oplus P_2$, permitindo criptoanálise por análise de frequência e texto claro conhecido.
2. **Ausência de integridade/autenticação:** O formato não incluía Tag de Autenticação (MAC). Qualquer observador ou relay Nostr intermediário poderia alterar bits no texto cifrado (ataque de maleabilidade) sem que o destinatário detectasse a corrupção antes da ingestão.

### 2.3 Exposição em Relays Públicos

Os eventos eram publicados em relays Nostr públicos abertos a qualquer cliente na internet:
- Eventos Nostr de tipo parametrizado (NIP-33, kind 30078) utilizavam a tag `d` indexada pela chave pública derivada do código curto.
- Qualquer observador passivo monitorando os relays podia filtrar eventos dessa tag, aplicar força bruta no código de 30 bits e obter o texto plano dos lotes sincronizados.

---

## 3. Mitigações Implementadas no Ciclo de Vida do App

Antes de efetuar o corte definitivo, o projeto implementou sucessivas camadas de mitigação para conter a exposição:

1. **Exclusão Estrita de Dados Altamente Sensíveis (Story 11.4 e Story 4.7):**
   - Holerites completos, salários e dados de renda (`PAYSLIP_*`) foram terminantemente bloqueados no canal legado (`selectOldGroupPushEvents`), nunca tendo sido transmitidos em XOR.
   - Preferências religiosas e dados confessionais (`RELIGIOUS_*`, `CONFESSIONAL_*`) foram adicionados à lista de exclusão estrita (`OLD_GROUP_EXCLUDED_PREFIXES`), operando exclusivamente no Grupo forte com AES-GCM.

2. **Prevenção de Loops e Vazamento Cruzado (Story 4.6 e 4.7):**
   - O `SyncGroupTracker` garantiu que eventos recebidos do canal forte jamais fossem reenviados ao canal legado, impedindo que novos dados protegidos vazassem retroativamente para o formato vulnerável.

3. **Janela de Convivência Transitória Controlada (Story 4.7 e 4.8):**
   - A coexistência foi restrita a 14 dias após a disponibilização do Segredo forte (iniciada em 06/11/2026).
   - Usuários receberam ação assistida de migração ("Migrar para o sync seguro") com confirmação explícita (`appConfirm`) e modal do novo QR Code forte.

4. **Aviso Prévio na Rede (Story 4.9):**
   - Antes da data de corte, o app transmitiu no canal legado o evento de sinalização `LEGACY_GROUP_CUTOFF_WARNING`, alertando outros aparelhos sobre o encerramento do formato e orientando a atualização.

5. **Corte Rígido e Definitivo (Story 4.9):**
   - Constantes `LEGACY_CUTOFF_DATE_ISO = "2026-11-20T00:00:00.000Z"` e `LEGACY_MIN_APP_VERSION = "1.8.0"`.
   - Ao atingir a data ou versão, `useSyncEngine` e `loadCoexistingGroups` bloqueiam 100% de leitura (subscrição e pull) e escrita (push) no canal legado.

---

## 4. Avaliação e Aceitação do Risco Residual

### 4.1 Caracterização do Risco Residual

O risco residual refere-se **estritamente aos eventos que foram transmitidos em cifra XOR nos relays públicos no passado**, antes do corte da Story 4.9.

| Componente | Nível de Risco | Mitigação Realizada / Estado Atual |
|---|---|---|
| **Transações comuns antigas (valores, categorias de despesa)** | Residual Médio | O tráfego histórico pode ter sido arquivado por relays Nostr de terceiros que mantêm logs persistentes. Não há como forçar o apagamento físico desses dados em nós descentralizados externos. |
| **Holerites e Comprovantes de Renda** | Risco Nulo | Foram bloqueados desde a concepção (Story 11.4); jamais foram publicados no canal legado. |
| **Dados Religiosos e Confessionais** | Risco Nulo | Bloqueados na raiz do motor de envio (`OLD_GROUP_EXCLUDED_PREFIXES`). |
| **Novas Transações Pós-Corte** | Risco Nulo | O canal legado foi encerrado; 100% do novo tráfego utiliza AES-256-GCM com segredo de 256 bits (`DOMUS1-...`). |
| **Histórico Local no Dispositivo** | Risco Nulo (Preservado) | O corte não apaga o banco SQLite nem o EventStore local; os dados permanecem intactos no aparelho do usuário. |

### 4.2 Decisão de Gestão de Risco

1. **Impossibilidade de Revogação Ex-Post em Relays Descentralizados:**
   A natureza dos relays Nostr públicos impede qualquer garantia criptográfica de expurgo de eventos passados assinados por chaves antigas. Eventos substituíveis (NIP-33) têm seus lotes substituídos pelos nós em conformidade com o protocolo, mas observadores externos que tenham gravado o histórico em disco retêm os dados em XOR.

2. **Corte Definitivo como Solução Criptográfica:**
   A única solução viável e segura foi estipular a data de corte estrita (14 dias), encerrar o protocolo antigo e transicionar a base instalada para o Segredo forte.

3. **Recomendações ao Usuário:**
   - Usuários que necessitarem de isolamento absoluto em relação ao passado devem acionar a opção "Sair do grupo" e criar um novo Grupo forte independente, sem reutilizar vínculos anteriores.

---

## 5. Conclusão e Habilitação para a Story 4.10

Com o bloqueio completo de leitura e escrita do canal antigo implementado na Story 4.9:
1. Nenhum dado transita mais em XOR pela rede.
2. Todo tráfego de sincronização ativo do DOMUS opera exclusivamente sob autenticação criptográfica forte com AES-GCM de 256 bits e chaves HKDF com 128+ bits de entropia.
3. Fica plenamente justificada e verídica a reativação do termo **"criptografia de ponta a ponta"** nas lojas de aplicativos (Google Play Store), termos de serviço e políticas de privacidade na Story 4.10.
