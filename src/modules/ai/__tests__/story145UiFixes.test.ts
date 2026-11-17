import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../../..");

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("Story 14.5: UI fixes", () => {
  it("app/ai-chat.tsx libera QuickSuggestions e envio local mesmo sem settings.isEnabled, protege detectMissingPermission/voiceEnabled e torna banner clicável", () => {
    const src = readWorkspaceFile("app/ai-chat.tsx");

    // Sem gate `if (!settings.isEnabled) return` em handleSend / handleQuickSuggestion
    const handleSendMatch = src.match(/const handleSend = useCallback\([\s\S]*?\n\s*\);/);
    const handleQuickMatch = src.match(/const handleQuickSuggestion = useCallback\([\s\S]*?\n\s*\);/);
    expect(handleSendMatch?.[0]).toBeTruthy();
    expect(handleQuickMatch?.[0]).toBeTruthy();
    expect(handleSendMatch![0]).not.toMatch(/if\s*\(\s*!settings\.isEnabled\s*\)\s*return/);
    expect(handleQuickMatch![0]).not.toMatch(/if\s*\(\s*!settings\.isEnabled\s*\)\s*return/);

    // detectMissingPermission só roda quando settings.isEnabled for true
    expect(handleSendMatch![0]).toMatch(/if\s*\(\s*settings\.isEnabled\s*\)\s*\{[\s\S]*?detectMissingPermission/);

    // voiceEnabled exige settings.isEnabled
    expect(src).toMatch(/voiceEnabled=\{settings\.isEnabled\s*&&/);

    // renderChatFooter sem `settings.isEnabled && !compact` e contendo <QuickSuggestions
    expect(src).not.toContain("settings.isEnabled && !compact");
    expect(src).toMatch(/renderChatFooter=\{[\s\S]*?<QuickSuggestions/);

    // Banner inteiro é um TouchableOpacity navegando para /ai-settings com accessibilityRole="button" (props em qualquer ordem)
    const bannerBlock = src.match(/\{\/\*\s*Banner: IA desabilitada\s*\*\/\}\s*\{!settings\.isEnabled\s*&&\s*\(([\s\S]*?)\)\}/);
    expect(bannerBlock?.[1]).toBeTruthy();
    expect(bannerBlock![1]).toContain("<TouchableOpacity");
    expect(bannerBlock![1]).toMatch(/router\.push\(["']\/ai-settings["']\)/);
    expect(bannerBlock![1]).toContain('accessibilityRole="button"');
  });

  it("src/components/ai/ChatInputBar.tsx remove completamente a barra de formatação Markdown e preserva inputRow, ChatActionMenu e TextInput", () => {
    const src = readWorkspaceFile("src/components/ai/ChatInputBar.tsx");

    expect(src).not.toContain("MD_BUTTONS");
    expect(src).not.toContain("FormatBtn");
    expect(src).not.toContain("insertMarkdown");
    expect(src).not.toContain("handleFormat");
    expect(src).not.toContain("mdBar");
    expect(src).not.toContain("mdBtn");
    expect(src).not.toContain("onSelectionChange");

    expect(src).toContain("s.inputRow");
    expect(src).toContain("<ChatActionMenu");
    expect(src).toContain("<TextInput");
  });

  it("src/components/invoice/QrScanScreen.tsx usa aimLayout.height, aimLayout.focusedFlex e aimLayout.hintMarginTop", () => {
    const src = readWorkspaceFile("src/components/invoice/QrScanScreen.tsx");

    expect(src).toContain("getScanAimWindowLayout(scanMode)");
    expect(src).toContain("aimLayout.height");
    expect(src).toContain("aimLayout.focusedFlex");
    expect(src).toContain("aimLayout.hintMarginTop");
  });

  it("app/backup.tsx define gap: 12 em driveAccountRow, minWidth: 0 em driveAccountLeft e flexShrink: 0 em Desconectar", () => {
    const src = readWorkspaceFile("app/backup.tsx");

    expect(src).toMatch(/driveAccountRow:\s*\{[^}]*gap:\s*12/);
    expect(src).toMatch(/driveAccountLeft:\s*\{[^}]*minWidth:\s*0/);
    expect(src).toMatch(/flexShrink:\s*0/);
  });

  it("app/about.tsx usa título 'Configurações e Sobre', mantém title='Pixel Eucarístico' no SectionCard e não duplica em PixelText", () => {
    const src = readWorkspaceFile("app/about.tsx");

    expect(src).toContain("Configurações e Sobre");
    expect(src).toContain('title="Pixel Eucarístico"');
    expect(src).not.toMatch(/<PixelText[^>]*>Pixel Eucarístico<\/PixelText>/);
  });
});
