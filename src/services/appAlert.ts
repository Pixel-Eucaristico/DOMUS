/**
 * Alerta customizado do DOMUS — fila pura, sem `react-native`.
 *
 * `appAlert` tem a mesma forma do `Alert.alert` e `appConfirm` devolve uma
 * Promise<boolean>. Os pedidos entram numa fila FIFO e um `AppAlertHost` mostra
 * um por vez. Camadas de host (ver `registerAppAlertHost`):
 * - raiz (`app/_layout.tsx`): sempre a base, qualquer que seja a ordem dos efeitos;
 * - tela modal (`add-transaction`, `onboarding`, `sync`): entra no foco e sai no
 *   blur, então uma tela empilhada por cima (`/sync` → `/backup`) usa a raiz;
 * - dentro de um `Modal` do RN: entra ao montar e sai ao desmontar.
 * Só o host de cima (o registrado por último, com a raiz sempre por baixo)
 * mostra o alerta, para ele não ficar escondido atrás de outro Modal no iOS. Se
 * esse host sai, o alerta passa na hora para o próximo de cima. Pedidos feitos
 * antes de algum host montar ficam na fila. Com o app bloqueado
 * (`setAppAlertLocked`), nenhum alerta aparece: as confirmações (`appConfirm`)
 * pendentes resolvem `false` e saem da fila; os outros alertas esperam o
 * desbloqueio.
 */

export type AppAlertButtonStyle = "default" | "cancel" | "destructive";

export interface AppAlertButton {
  text?: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
}

export interface AppAlertOptions {
  /** `false` impede fechar tocando fora ou com o voltar do Android. */
  cancelable?: boolean;
  /**
   * Chamado ao fechar sem tocar num botão (tocar fora / voltar), só quando não
   * há botão "cancel" com `onPress` (havendo, roda esse `onPress` no lugar).
   */
  onDismiss?: () => void;
}

export interface AppAlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: readonly AppAlertButton[];
  options: AppAlertOptions;
}

export interface AppConfirmParams {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Listener = (current: AppAlertRequest | null) => void;

let queue: AppAlertRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
interface HostEntry {
  id: number;
  root: boolean;
}

/**
 * Hosts registrados, de baixo para cima: as raízes ficam sempre no começo
 * (índice 0), os outros na ordem de registro (o último é o de cima).
 */
let hosts: HostEntry[] = [];
let nextHostId = 1;
let locked = false;
/** Alertas de `appConfirm` ainda na fila → resolve a Promise com `false`. */
const confirmCancels = new Map<number, () => void>();

/** Alerta que deve aparecer agora (o primeiro da fila), ou null se bloqueado. */
function visible(): AppAlertRequest | null {
  return locked ? null : (queue[0] ?? null);
}

function notify(): void {
  const current = visible();
  for (const listener of Array.from(listeners)) listener(current);
}

/** Mostra o alerta customizado. Mesma assinatura do `Alert.alert`. */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions,
): void {
  const own: AppAlertButton[] =
    buttons && buttons.length > 0 ? buttons.map((b) => ({ ...b })) : [{ text: "OK" }];
  enqueue(title, message, own, options);
}

function enqueue(
  title: string,
  message: string | undefined,
  buttons: AppAlertButton[],
  options: AppAlertOptions | undefined,
): number {
  const id = nextId++;
  queue.push({
    id,
    title,
    message,
    buttons: Object.freeze(buttons.map((b) => Object.freeze(b))),
    options: Object.freeze({ ...(options ?? {}) }),
  });
  if (queue.length === 1) notify();
  return id;
}

/**
 * Pergunta e devolve true só se o usuário confirmar; cancelar, fechar ou o app
 * bloquear (pedido pendente ou feito com o app bloqueado) devolve false.
 */
export function appConfirm({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
}: AppConfirmParams): Promise<boolean> {
  return new Promise((resolve) => {
    if (locked) {
      resolve(false);
      return;
    }
    let id = 0;
    const settle = (value: boolean) => {
      confirmCancels.delete(id);
      resolve(value);
    };
    id = enqueue(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => settle(false) },
        { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => settle(true) },
      ],
      { cancelable: true, onDismiss: () => settle(false) },
    );
    confirmCancels.set(id, () => settle(false));
  });
}

/** Alerta visível agora (o primeiro da fila), ou null (fila vazia ou app bloqueado). */
export function getCurrentAppAlert(): AppAlertRequest | null {
  return visible();
}

/** Assina mudanças do alerta visível. Recebe o atual na hora. */
export function subscribeAppAlert(listener: Listener): () => void {
  listeners.add(listener);
  listener(visible());
  return () => {
    listeners.delete(listener);
  };
}

// ─── Pilha de hosts ──────────────────────────────────────────────────────────

export interface AppAlertHostOptions {
  /** Host da raiz: fica sempre por baixo dos outros, mesmo registrado depois. */
  root?: boolean;
}

/**
 * Põe um host na pilha; o `unregister` devolvido tira ele (idempotente).
 * Hosts de `Modal` registram ao montar; hosts de tela, no foco (e saem no
 * blur). A raiz (`root: true`) vai para o índice 0, então um Modal montado no
 * mesmo commit (cujo efeito roda antes do da raiz) continua por cima.
 */
export function registerAppAlertHost(options: AppAlertHostOptions = {}): {
  id: number;
  unregister: () => void;
} {
  const entry: HostEntry = { id: nextHostId++, root: options.root === true };
  if (entry.root) {
    const firstNonRoot = hosts.findIndex((h) => !h.root);
    const at = firstNonRoot === -1 ? hosts.length : firstNonRoot;
    hosts = [...hosts.slice(0, at), entry, ...hosts.slice(at)];
  } else {
    hosts = [...hosts, entry];
  }
  notify();
  return {
    id: entry.id,
    unregister: () => {
      if (!hosts.includes(entry)) return;
      hosts = hosts.filter((h) => h !== entry);
      notify();
    },
  };
}

/** Host de cima (o último registrado que não saiu; a raiz só sem outros), ou null. */
export function getTopAppAlertHost(): number | null {
  return hosts.length > 0 ? hosts[hosts.length - 1].id : null;
}

/** O que o host `hostId` deve mostrar: o alerta atual se ele for o de cima. */
export function getAppAlertForHost(hostId: number): AppAlertRequest | null {
  return getTopAppAlertHost() === hostId ? visible() : null;
}

// ─── Bloqueio ────────────────────────────────────────────────────────────────

/**
 * Com o app bloqueado (tela de PIN/biometria), o alerta some sem rodar nenhum
 * botão. As confirmações (`appConfirm`) na fila saem e resolvem `false` (quem
 * espera não fica pendurado; a ação pedida não roda). Os outros alertas ficam
 * na fila e voltam, na mesma ordem, ao desbloquear.
 */
export function setAppAlertLocked(value: boolean): void {
  if (locked === value) return;
  locked = value;
  if (locked && confirmCancels.size > 0) {
    const cancels = queue.flatMap((r) => {
      const cancel = confirmCancels.get(r.id);
      return cancel ? [cancel] : [];
    });
    queue = queue.filter((r) => !confirmCancels.has(r.id));
    for (const cancel of cancels) cancel();
  }
  notify();
}

// ─── Respostas ───────────────────────────────────────────────────────────────

function close(id: number): AppAlertRequest | null {
  const current = visible();
  if (!current || current.id !== id) return null;
  queue = queue.slice(1);
  notify();
  return current;
}

/** Toque no botão `index` do alerta `id`: fecha e chama o `onPress` dele. */
export function pressAppAlertButton(id: number, index: number): void {
  const closed = close(id);
  closed?.buttons[index]?.onPress?.();
}

/**
 * Pode fechar tocando fora / voltar do Android?
 * - `cancelable: false` → não.
 * - há botão "cancel", `onDismiss` ou `cancelable: true` → sim.
 * - senão, só se nenhum botão tiver efeito (fechar = tocar no único "OK").
 */
export function isAppAlertDismissable(request: AppAlertRequest): boolean {
  if (request.options.cancelable === false) return false;
  if (request.options.cancelable === true) return true;
  if (request.buttons.some((b) => b.style === "cancel")) return true;
  if (request.options.onDismiss) return true;
  return request.buttons.every((b) => !b.onPress);
}

/**
 * Tocar fora / voltar do Android: chama um só efeito, o `onPress` do botão
 * "cancel" se ele tiver um, senão o `onDismiss` (se houver). Devolve false
 * (e não fecha) se o alerta não pode ser fechado assim.
 */
export function dismissAppAlert(id: number): boolean {
  const current = visible();
  if (!current || current.id !== id || !isAppAlertDismissable(current)) return false;
  close(id);
  const cancelPress = current.buttons.find((b) => b.style === "cancel")?.onPress;
  if (cancelPress) cancelPress();
  else current.options.onDismiss?.();
  return true;
}

// ─── Layout dos botões ───────────────────────────────────────────────────────

export type AppAlertButtonVariant = "primary" | "outline" | "danger";

export interface AppAlertButtonLayout {
  /** true: um embaixo do outro; false: lado a lado. */
  stacked: boolean;
  /** Na ordem de desenho; `index` aponta para o botão original. */
  items: { index: number; text: string; variant: AppAlertButtonVariant }[];
}

/** Rótulos acima disso não cabem lado a lado. */
export const APP_ALERT_LONG_LABEL = 14;

/**
 * Ordem e aparência dos botões. Lado a lado (1–2 botões curtos): cancelar à
 * esquerda. Empilhados (3 botões ou rótulo longo): cancelar por último.
 * "destructive" → danger; "cancel" → outline; o último botão que não é
 * cancelar, se for "default", é o primary; os outros "default" são outline.
 */
export function layoutAppAlertButtons(buttons: readonly AppAlertButton[]): AppAlertButtonLayout {
  const indexed = buttons.map((button, index) => ({ button, index }));
  const stacked =
    buttons.length >= 3 || buttons.some((b) => (b.text ?? "OK").length > APP_ALERT_LONG_LABEL);
  const cancels = indexed.filter(({ button }) => button.style === "cancel");
  const others = indexed.filter(({ button }) => button.style !== "cancel");
  const lastOther = others[others.length - 1]?.index;
  const ordered = stacked ? [...others, ...cancels] : [...cancels, ...others];
  return {
    stacked,
    items: ordered.map(({ button, index }) => ({
      index,
      text: button.text ?? "OK",
      variant:
        button.style === "destructive"
          ? "danger"
          : button.style === "cancel" || index !== lastOther
            ? "outline"
            : "primary",
    })),
  };
}

/** Só para testes: esvazia a fila, os assinantes, a pilha de hosts e o bloqueio. */
export function __resetAppAlertForTests(): void {
  queue = [];
  listeners.clear();
  hosts = [];
  locked = false;
  confirmCancels.clear();
  nextId = 1;
  nextHostId = 1;
}
