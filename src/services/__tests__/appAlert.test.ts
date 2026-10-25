import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  appAlert,
  appConfirm,
  dismissAppAlert,
  getAppAlertForHost,
  getCurrentAppAlert,
  getTopAppAlertHost,
  layoutAppAlertButtons,
  pressAppAlertButton,
  registerAppAlertHost,
  setAppAlertLocked,
  subscribeAppAlert,
  __resetAppAlertForTests,
  type AppAlertRequest,
} from "../appAlert";

function current(): AppAlertRequest {
  const c = getCurrentAppAlert();
  if (!c) throw new Error("nenhum alerta visível");
  return c;
}

describe("appAlert — fila do alerta customizado", () => {
  beforeEach(() => __resetAppAlertForTests());

  it("aviso simples ganha um botão OK", () => {
    appAlert("Erro", "Falhou");
    expect(current().title).toBe("Erro");
    expect(current().message).toBe("Falhou");
    expect(current().buttons).toEqual([{ text: "OK" }]);
  });

  it("mostra um por vez, na ordem das chamadas", () => {
    appAlert("Primeiro");
    appAlert("Segundo");
    appAlert("Terceiro");
    expect(current().title).toBe("Primeiro");
    pressAppAlertButton(current().id, 0);
    expect(current().title).toBe("Segundo");
    pressAppAlertButton(current().id, 0);
    expect(current().title).toBe("Terceiro");
    pressAppAlertButton(current().id, 0);
    expect(getCurrentAppAlert()).toBeNull();
  });

  it("cada botão chama o seu onPress, depois de fechar", () => {
    const cancel = vi.fn();
    const del = vi.fn(() => {
      // quando o onPress roda, o alerta já saiu da fila
      expect(getCurrentAppAlert()).toBeNull();
    });
    appAlert("Excluir?", "Não dá para desfazer.", [
      { text: "Cancelar", style: "cancel", onPress: cancel },
      { text: "Excluir", style: "destructive", onPress: del },
    ]);
    pressAppAlertButton(current().id, 1);
    expect(del).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("toque de um id antigo é ignorado", () => {
    const onPress = vi.fn();
    appAlert("A", undefined, [{ text: "OK", onPress }]);
    const id = current().id;
    pressAppAlertButton(id, 0);
    pressAppAlertButton(id, 0);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("tocar fora chama só o onPress do botão cancel, não o onDismiss", () => {
    const cancel = vi.fn();
    const onDismiss = vi.fn();
    appAlert("T", "M", [
      { text: "Cancelar", style: "cancel", onPress: cancel },
      { text: "Excluir", style: "destructive", onPress: vi.fn() },
    ], { onDismiss });
    expect(dismissAppAlert(current().id)).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(getCurrentAppAlert()).toBeNull();
  });

  it("botão cancel sem onPress: tocar fora chama o onDismiss", () => {
    const onDismiss = vi.fn();
    appAlert("T", "M", [{ text: "Cancelar", style: "cancel" }, { text: "Sim", onPress: vi.fn() }], { onDismiss });
    expect(dismissAppAlert(current().id)).toBe(true);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("sem botão cancel, tocar fora chama onDismiss", () => {
    const onDismiss = vi.fn();
    const ok = vi.fn();
    appAlert("T", "M", [{ text: "OK", onPress: ok }], { cancelable: true, onDismiss });
    expect(dismissAppAlert(current().id)).toBe(true);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(ok).not.toHaveBeenCalled();
  });

  it("cancelable: false não fecha tocando fora", () => {
    appAlert("T", "M", [{ text: "Desligar", style: "destructive", onPress: vi.fn() }, { text: "Manter" }], {
      cancelable: false,
    });
    expect(dismissAppAlert(current().id)).toBe(false);
    expect(current().title).toBe("T");
  });

  it("sem cancel e com botão de efeito, exige escolher um botão", () => {
    const ok = vi.fn();
    appAlert("Sucesso", "Salvo", [{ text: "OK", onPress: ok }]);
    expect(dismissAppAlert(current().id)).toBe(false);
    pressAppAlertButton(current().id, 0);
    expect(ok).toHaveBeenCalledOnce();
  });

  it("aviso só com OK fecha tocando fora", () => {
    appAlert("Erro", "Falhou");
    expect(dismissAppAlert(current().id)).toBe(true);
    expect(getCurrentAppAlert()).toBeNull();
  });

  it("appConfirm devolve true ao confirmar", async () => {
    const p = appConfirm({ title: "Excluir?", message: "M", confirmLabel: "Excluir", destructive: true });
    expect(current().buttons.map((b) => [b.text, b.style])).toEqual([
      ["Cancelar", "cancel"],
      ["Excluir", "destructive"],
    ]);
    pressAppAlertButton(current().id, 1);
    await expect(p).resolves.toBe(true);
  });

  it("appConfirm devolve false ao cancelar ou tocar fora", async () => {
    const a = appConfirm({ title: "A", confirmLabel: "Sim" });
    pressAppAlertButton(current().id, 0);
    await expect(a).resolves.toBe(false);
    const b = appConfirm({ title: "B", confirmLabel: "Sim" });
    dismissAppAlert(current().id);
    await expect(b).resolves.toBe(false);
  });

  it("chamado antes de o host montar, aparece quando ele assina", () => {
    appAlert("Cedo", "Antes da raiz");
    const seen: (string | null)[] = [];
    const unsubscribe = subscribeAppAlert((c) => seen.push(c?.title ?? null));
    expect(seen).toEqual(["Cedo"]);
    pressAppAlertButton(current().id, 0);
    expect(seen).toEqual(["Cedo", null]);
    unsubscribe();
    appAlert("Depois");
    expect(seen).toEqual(["Cedo", null]);
  });

  it("onPress que abre outro alerta coloca o novo na fila", () => {
    appAlert("Primeiro", undefined, [{ text: "OK", onPress: () => appAlert("Seguinte") }]);
    appAlert("Segundo");
    pressAppAlertButton(current().id, 0);
    expect(current().title).toBe("Segundo");
    pressAppAlertButton(current().id, 0);
    expect(current().title).toBe("Seguinte");
  });

  it("sem botão cancel e só com onDismiss, tocar fora chama onDismiss", () => {
    const onDismiss = vi.fn();
    const ok = vi.fn();
    appAlert("T", "M", [{ text: "OK", onPress: ok }], { onDismiss });
    expect(dismissAppAlert(current().id)).toBe(true);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(ok).not.toHaveBeenCalled();
  });

  it("o botão OK padrão é próprio de cada alerta", () => {
    appAlert("D1");
    const first = current().buttons;
    expect(Object.isFrozen(first)).toBe(true);
    expect(() => {
      (first[0] as { onPress?: () => void }).onPress = () => {};
    }).toThrow();
    pressAppAlertButton(current().id, 0);
    appAlert("D2");
    expect(current().buttons).not.toBe(first);
    expect(current().buttons[0].onPress).toBeUndefined();
  });

  it("copia os botões recebidos", () => {
    const buttons = [{ text: "OK" }];
    appAlert("T", undefined, buttons);
    buttons[0].text = "Mudou";
    expect(current().buttons[0].text).toBe("OK");
  });
});

describe("appAlert — pilha de hosts", () => {
  beforeEach(() => __resetAppAlertForTests());

  it("só o host de cima mostra o alerta", () => {
    const root = registerAppAlertHost();
    const modal = registerAppAlertHost();
    appAlert("Nome obrigatório");
    expect(getTopAppAlertHost()).toBe(modal.id);
    expect(getAppAlertForHost(modal.id)?.title).toBe("Nome obrigatório");
    expect(getAppAlertForHost(root.id)).toBeNull();
  });

  it("ao desmontar o de cima, o anterior assume sem perder a fila", () => {
    const root = registerAppAlertHost();
    const modal = registerAppAlertHost();
    appAlert("A");
    appAlert("B");
    const seen: (string | null)[] = [];
    subscribeAppAlert(() => seen.push(getAppAlertForHost(root.id)?.title ?? null));
    modal.unregister();
    expect(getTopAppAlertHost()).toBe(root.id);
    expect(getAppAlertForHost(root.id)?.title).toBe("A");
    expect(seen[seen.length - 1]).toBe("A");
    pressAppAlertButton(current().id, 0);
    expect(getAppAlertForHost(root.id)?.title).toBe("B");
    modal.unregister(); // segunda vez não faz nada
    expect(getTopAppAlertHost()).toBe(root.id);
  });

  it("raiz é a base mesmo registrada depois de um Modal no mesmo commit", () => {
    // Efeitos rodam do filho para o pai: o host do Modal registra antes da raiz
    const modal = registerAppAlertHost();
    const root = registerAppAlertHost({ root: true });
    appAlert("Nome obrigatório");
    expect(getTopAppAlertHost()).toBe(modal.id);
    expect(getAppAlertForHost(root.id)).toBeNull();
    // Um Modal aberto depois também fica por cima da raiz
    const other = registerAppAlertHost();
    expect(getTopAppAlertHost()).toBe(other.id);
    other.unregister();
    modal.unregister();
    expect(getAppAlertForHost(root.id)?.title).toBe("Nome obrigatório");
  });

  it("tela modal: entra no foco, sai no blur e a tela empilhada usa a raiz", () => {
    const root = registerAppAlertHost({ root: true });
    let sync = registerAppAlertHost(); // foco em /sync
    expect(getTopAppAlertHost()).toBe(sync.id);
    sync.unregister(); // /sync → /backup: blur
    appAlert("Backup salvo");
    expect(getAppAlertForHost(root.id)?.title).toBe("Backup salvo");
    pressAppAlertButton(current().id, 0);
    sync = registerAppAlertHost(); // voltou para /sync: foco de novo
    appAlert("Sincronizado");
    expect(getAppAlertForHost(sync.id)?.title).toBe("Sincronizado");
    expect(getAppAlertForHost(root.id)).toBeNull();
  });

  it("Modal aberto por cima de uma tela modal ganha o alerta", () => {
    const root = registerAppAlertHost({ root: true });
    const screen = registerAppAlertHost();
    const sheet = registerAppAlertHost();
    appAlert("Valor inválido");
    expect(getAppAlertForHost(sheet.id)?.title).toBe("Valor inválido");
    expect(getAppAlertForHost(screen.id)).toBeNull();
    expect(getAppAlertForHost(root.id)).toBeNull();
    sheet.unregister();
    expect(getAppAlertForHost(screen.id)?.title).toBe("Valor inválido");
  });

  it("se o host do alerta sai, o alerta visível passa na hora para o próximo de cima", () => {
    const root = registerAppAlertHost({ root: true });
    const screen = registerAppAlertHost();
    const modal = registerAppAlertHost();
    const onPress = vi.fn();
    appAlert("Erro", undefined, [{ text: "OK", onPress }]);
    const id = current().id;
    const seen: Record<string, (number | null)[]> = { root: [], screen: [] };
    subscribeAppAlert(() => {
      seen.root.push(getAppAlertForHost(root.id)?.id ?? null);
      seen.screen.push(getAppAlertForHost(screen.id)?.id ?? null);
    });
    modal.unregister();
    expect(seen.screen[seen.screen.length - 1]).toBe(id);
    screen.unregister();
    expect(seen.root[seen.root.length - 1]).toBe(id);
    pressAppAlertButton(id, 0);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("várias raízes ficam por baixo, na ordem de registro", () => {
    const modal = registerAppAlertHost();
    const r1 = registerAppAlertHost({ root: true });
    const r2 = registerAppAlertHost({ root: true });
    modal.unregister();
    expect(getTopAppAlertHost()).toBe(r2.id);
    r2.unregister();
    expect(getTopAppAlertHost()).toBe(r1.id);
  });

  it("desmontar um host do meio mantém o de cima", () => {
    const root = registerAppAlertHost();
    const a = registerAppAlertHost();
    const b = registerAppAlertHost();
    a.unregister();
    expect(getTopAppAlertHost()).toBe(b.id);
    b.unregister();
    expect(getTopAppAlertHost()).toBe(root.id);
    root.unregister();
    expect(getTopAppAlertHost()).toBeNull();
  });
});

describe("appAlert — app bloqueado", () => {
  beforeEach(() => __resetAppAlertForTests());

  it("esconde o alerta sem rodar botão e mostra de novo ao desbloquear", () => {
    const root = registerAppAlertHost();
    const cancel = vi.fn();
    const ok = vi.fn();
    appAlert("Excluir?", undefined, [
      { text: "Cancelar", style: "cancel", onPress: cancel },
      { text: "Excluir", style: "destructive", onPress: ok },
    ]);
    const id = current().id;
    setAppAlertLocked(true);
    expect(getCurrentAppAlert()).toBeNull();
    expect(getAppAlertForHost(root.id)).toBeNull();
    pressAppAlertButton(id, 1);
    expect(dismissAppAlert(id)).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
    expect(ok).not.toHaveBeenCalled();
    appAlert("Outro");
    setAppAlertLocked(false);
    expect(getAppAlertForHost(root.id)?.id).toBe(id);
    pressAppAlertButton(id, 1);
    expect(ok).toHaveBeenCalledOnce();
    expect(current().title).toBe("Outro");
  });

  it("ao bloquear, appConfirm pendente resolve false e sai da fila; avisos esperam", async () => {
    const root = registerAppAlertHost({ root: true });
    const onDismiss = vi.fn();
    appAlert("Aviso 1");
    const a = appConfirm({ title: "Excluir?", confirmLabel: "Excluir", destructive: true });
    appAlert("Aviso 2", undefined, undefined, { onDismiss });
    const b = appConfirm({ title: "Restaurar?", confirmLabel: "Restaurar" });
    setAppAlertLocked(true);
    await expect(a).resolves.toBe(false);
    await expect(b).resolves.toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
    setAppAlertLocked(false);
    expect(getAppAlertForHost(root.id)?.title).toBe("Aviso 1");
    pressAppAlertButton(current().id, 0);
    expect(current().title).toBe("Aviso 2");
    pressAppAlertButton(current().id, 0);
    expect(getCurrentAppAlert()).toBeNull();
  });

  it("appConfirm visível resolve false ao bloquear", async () => {
    registerAppAlertHost({ root: true });
    const p = appConfirm({ title: "Sair?", confirmLabel: "Sair" });
    const id = current().id;
    setAppAlertLocked(true);
    await expect(p).resolves.toBe(false);
    setAppAlertLocked(false);
    expect(getCurrentAppAlert()).toBeNull();
    pressAppAlertButton(id, 1); // id antigo: ignorado
    await expect(p).resolves.toBe(false);
  });

  it("appConfirm feito com o app bloqueado resolve false sem entrar na fila", async () => {
    setAppAlertLocked(true);
    await expect(appConfirm({ title: "X", confirmLabel: "Sim" })).resolves.toBe(false);
    setAppAlertLocked(false);
    expect(getCurrentAppAlert()).toBeNull();
  });

  it("appConfirm já respondido não é afetado pelo bloqueio seguinte", async () => {
    const p = appConfirm({ title: "X", confirmLabel: "Sim" });
    pressAppAlertButton(current().id, 1);
    setAppAlertLocked(true);
    await expect(p).resolves.toBe(true);
  });
});

describe("layoutAppAlertButtons", () => {
  it("[cancel, destructive] fica lado a lado, cancelar à esquerda", () => {
    const layout = layoutAppAlertButtons([
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive" },
    ]);
    expect(layout.stacked).toBe(false);
    expect(layout.items.map((i) => i.index)).toEqual([0, 1]);
    expect(layout.items.map((i) => i.variant)).toEqual(["outline", "danger"]);
  });

  it("cancelar vem à esquerda mesmo se for o último botão", () => {
    const layout = layoutAppAlertButtons([
      { text: "Excluir", style: "destructive" },
      { text: "Cancelar", style: "cancel" },
    ]);
    expect(layout.items.map((i) => i.index)).toEqual([1, 0]);
    expect(layout.items.map((i) => i.text)).toEqual(["Cancelar", "Excluir"]);
  });

  it("3 botões empilham, cancelar por último", () => {
    const buttons = [
      { text: "Cancelar", style: "cancel" as const },
      { text: "Talvez" },
      { text: "Sim" },
    ];
    const layout = layoutAppAlertButtons(buttons);
    expect(layout.stacked).toBe(true);
    expect(layout.items.map((i) => i.index)).toEqual([1, 2, 0]);
    expect(layout.items.map((i) => i.variant)).toEqual(["outline", "primary", "outline"]);
  });

  it("rótulo com mais de 14 caracteres empilha", () => {
    expect(layoutAppAlertButtons([{ text: "Desligar" }, { text: "Manter ligado" }]).stacked).toBe(false);
    expect(layoutAppAlertButtons([{ text: "Não" }, { text: "Sim, apagar tudo agora" }]).stacked).toBe(true);
  });

  it("botão único sem estilo é primary; sem texto vira OK", () => {
    const layout = layoutAppAlertButtons([{}]);
    expect(layout.items).toEqual([{ index: 0, text: "OK", variant: "primary" }]);
  });

  it("cada item aponta para o botão original", () => {
    const shapes = [
      [{ text: "A", style: "cancel" as const }, { text: "B" }, { text: "C", style: "destructive" as const }],
      [{ text: "Desligar", style: "destructive" as const }, { text: "Manter ligado" }],
      [{ text: "OK" }],
      [{ text: "Um texto bem comprido aqui" }, { text: "X", style: "cancel" as const }],
    ];
    for (const buttons of shapes) {
      const layout = layoutAppAlertButtons(buttons);
      expect(layout.items.map((i) => i.index).sort()).toEqual(buttons.map((_, i) => i));
      for (const item of layout.items) expect(item.text).toBe(buttons[item.index].text);
    }
  });
});
