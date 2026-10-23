/**
 * Alerta customizado do DOMUS — fila pura, sem `react-native`.
 *
 * `appAlert` tem a mesma forma do `Alert.alert` e `appConfirm` devolve uma
 * Promise<boolean>. Os pedidos entram numa fila FIFO e um `AppAlertHost` mostra
 * um por vez. Há um host na raiz (`app/_layout.tsx`) e um dentro de cada Modal
 * ou tela modal que pode chamar alertas: só o host montado por último (o de
 * cima) mostra o alerta, para ele não ficar escondido atrás de outro Modal no
 * iOS. Pedidos feitos antes de algum host montar ficam na fila. Com o app
 * bloqueado (`setAppAlertLocked`), nenhum alerta aparece; a fila espera.
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
  /** Chamado ao fechar sem tocar num botão (tocar fora / voltar). */
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
/** Hosts montados, do mais antigo ao mais novo (o último é o de cima). */
let hosts: number[] = [];
let nextHostId = 1;
let locked = false;

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
  queue.push({
    id: nextId++,
    title,
    message,
    buttons: Object.freeze(own.map((b) => Object.freeze(b))),
    options: Object.freeze({ ...(options ?? {}) }),
  });
  if (queue.length === 1) notify();
}

/** Pergunta e devolve true só se o usuário confirmar; cancelar ou fechar devolve false. */
export function appConfirm({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
}: AppConfirmParams): Promise<boolean> {
  return new Promise((resolve) => {
    appAlert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
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

/** Um host entra na pilha ao montar; o devolvido tira ele ao desmontar. */
export function registerAppAlertHost(): { id: number; unregister: () => void } {
  const id = nextHostId++;
  hosts = [...hosts, id];
  notify();
  return {
    id,
    unregister: () => {
      if (!hosts.includes(id)) return;
      hosts = hosts.filter((h) => h !== id);
      notify();
    },
  };
}

/** Host de cima (o montado por último que ainda está montado), ou null. */
export function getTopAppAlertHost(): number | null {
  return hosts.length > 0 ? hosts[hosts.length - 1] : null;
}

/** O que o host `hostId` deve mostrar: o alerta atual se ele for o de cima. */
export function getAppAlertForHost(hostId: number): AppAlertRequest | null {
  return getTopAppAlertHost() === hostId ? visible() : null;
}

// ─── Bloqueio ────────────────────────────────────────────────────────────────

/**
 * Com o app bloqueado (tela de PIN/biometria), o alerta some sem rodar nenhum
 * botão; ao desbloquear, volta o mesmo alerta.
 */
export function setAppAlertLocked(value: boolean): void {
  if (locked === value) return;
  locked = value;
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
 * Tocar fora / voltar do Android: chama o `onPress` do botão "cancel" (se
 * houver) e o `onDismiss` (se houver). Devolve false (e não fecha) se o alerta
 * não pode ser fechado assim.
 */
export function dismissAppAlert(id: number): boolean {
  const current = visible();
  if (!current || current.id !== id || !isAppAlertDismissable(current)) return false;
  close(id);
  current.buttons.find((b) => b.style === "cancel")?.onPress?.();
  current.options.onDismiss?.();
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
  nextId = 1;
  nextHostId = 1;
}
