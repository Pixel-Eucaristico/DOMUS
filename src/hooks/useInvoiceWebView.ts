import { useState, useRef, useCallback } from "react";
import WebView from "react-native-webview";
import { Alert } from "react-native";
import {
  InvoiceItem,
  InvoiceImportedPayload,
  InvoiceParser,
  parseSefazHtml,
  buildAutoFillScript,
  buildCaptureScript,
  buildPhase2Script,
} from "@packages/parsers";

const SEFAZ_SP_CONSULTA =
  "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx";

export const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

interface Phase1Data {
  items: any[];
  total: number;
  invoiceId: string;
  emitterName: string;
  emitterCnpj: string;
  dateStr: string;
}

export interface UseInvoiceWebViewResult {
  webviewRef: React.RefObject<WebView | null>;
  webviewUrl: string;
  webviewLoading: boolean;
  isEnrichingMode: boolean;
  isWaitingUserClick: boolean;
  autoFillScript: string;
  openInWebView: (url: string, chave: string) => void;
  handleCaptureData: () => void;
  handleWebViewMessage: (event: any) => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onNavigationStateChange: (navState: any) => void;
  onWebViewError: () => void;
}

export function useInvoiceWebView(
  onImported: (payload: InvoiceImportedPayload) => void,
  onError: (msg: string) => void,
): UseInvoiceWebViewResult {
  const webviewRef = useRef<WebView>(null);
  const pendingPhase1Ref = useRef<Phase1Data | null>(null);
  const webviewLoadingRef = useRef(true);
  const parser = useRef(new InvoiceParser()).current;

  const [webviewUrl, setWebviewUrl] = useState("");
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [isEnrichingMode, setIsEnrichingMode] = useState(false);
  const [isWaitingUserClick, setIsWaitingUserClick] = useState(false);
  const [chaveAcesso, setChaveAcesso] = useState("");

  const autoFillScript = buildAutoFillScript(chaveAcesso);

  const openInWebView = useCallback((url: string, chave: string) => {
    setChaveAcesso(chave);
    setWebviewUrl(url);
    setWebviewLoading(true);
    setIsWaitingUserClick(false);
    setIsEnrichingMode(false);
  }, []);

  const handleCaptureData = useCallback(() => {
    setIsEnrichingMode(true);
    webviewRef.current?.injectJavaScript(buildCaptureScript());
  }, []);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "PHASE1_DEBUG") {
        console.log(
          "[SEFAZ Debug] btn:", data._debug_btnId,
          "| status:", data._debug_fetchStatus,
          "| finalUrl:", data._debug_finalUrl,
          "| isUpdatePanel:", data._debug_isUpdatePanel,
          "| htmlStart:", String(data._debug_htmlStart || "").substring(0, 100),
        );
        return;
      }

      if (data.type === "NAVIGATE_URL" && data.url) {
        console.log("[SEFAZ] Navegando para ConsultaCompleta:", data.url);
        pendingPhase1Ref.current = {
          items: data.items, total: data.total, invoiceId: data.invoiceId,
          emitterName: data.emitterName, emitterCnpj: data.emitterCnpj, dateStr: data.dateStr,
        };
        setWebviewUrl(data.url);
        return;
      }

      if (data.type === "PHASE1_NAVIGATING") {
        console.log("[Fase1] Dados capturados, aguardando clique do usuário. Botão:", data._debug_btnId);
        pendingPhase1Ref.current = {
          items: data.items, total: data.total, invoiceId: data.invoiceId,
          emitterName: data.emitterName, emitterCnpj: data.emitterCnpj, dateStr: data.dateStr,
        };
        setIsEnrichingMode(false);
        setIsWaitingUserClick(true);
        return;
      }

      if (data.type === "CAPTURE_JSON" && data._debug_timeout) {
        console.warn("[Fase2] Timeout aguardando table.toggable após", data._debug_pollAttempts, "tentativas.");
      }
      if (data.type === "CAPTURE_JSON" && data._debug_btnFound === false) {
        console.warn("[Fase1] Botão 'Visualizar em Abas' não encontrado — capturando sem EAN/NCM.");
      }
      if (data.type === "CAPTURE_JSON" && data._debug_fetchFailed) {
        console.warn(
          "[Fetch] FALHOU — motivo:", data._debug_reason,
          "| btnId:", data._debug_btnId,
          "| hasFetch:", data._debug_hasFetch,
          "| hasForm:", data._debug_hasForm,
          "| httpStatus:", data._debug_httpStatus,
          "| err:", data._debug_err,
          "| snippet:", data._debug_snippet,
        );
      }
      if (data.type === "CAPTURE_JSON" && data._debug_fetchSuccess) {
        console.log(
          "[Fetch] OK — toggables:", data._debug_toggables,
          "| httpStatus:", data._debug_httpStatus,
          "| isUpdatePanel:", data._debug_isUpdatePanel,
          "| htmlSnippet:", String(data._debug_htmlSnippet || "").substring(0, 200),
        );
      }

      if (data.type === "CAPTURE_JSON") {
        setIsWaitingUserClick(false);
        if (!data.items || data.items.length === 0) {
          setIsEnrichingMode(false);
          Alert.alert(
            "Sem produtos",
            "O script encontrou a página mas não extraiu produtos.\nAguarde os dados carregarem e tente novamente.",
          );
          return;
        }

        const mappedItems: InvoiceItem[] = (data.items as any[]).map((i) => ({
          description: String(i.description || "").trim(),
          quantity: Number(i.quantity) || 1,
          unit: String(i.unit || "UN"),
          unitPrice: Number(i.unitPrice) || 0,
          totalPrice: Number(i.totalPrice) || 0,
          ...(i.ean ? { ean: String(i.ean) } : {}),
          ...(i.ncm ? { ncm: String(i.ncm) } : {}),
          ...(i.productCode ? { productCode: String(i.productCode) } : {}),
        }));

        const baseTotal =
          Number(data.total) ||
          Math.round(mappedItems.reduce((s, i) => s + i.totalPrice, 0) * 100) / 100;

        const payload: InvoiceImportedPayload = {
          invoiceId: data.invoiceId || Date.now().toString(36),
          source: "SEFAZ_QR",
          emitter: {
            name: data.emitterName || "Desconhecido",
            cnpj: (data.emitterCnpj || "").replace(/\D/g, ""),
          },
          date: (() => {
            if (!data.dateStr) return new Date().toISOString();
            const [d, m, y] = String(data.dateStr).split("/");
            const dt = new Date(Number(y), Number(m) - 1, Number(d));
            return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
          })(),
          items: mappedItems,
          totalAmount: baseTotal,
        };

        setIsEnrichingMode(false);
        onImported(payload);
        return;
      }

      if (data.type === "CAPTURE_HTML" && data.html) {
        if (data.debug) {
          console.log("[WebView Debug] classes:", (data.debug.classes || []).join(", "));
          console.log("[WebView Debug] body:", data.debug.bodySnippet);
        }
        const result = parseSefazHtml(data.html);
        const payload = parser.fromSefaz(result);

        if (result.items.length === 0 && result.totalAmount === 0) {
          setIsEnrichingMode(false);
          const hint = data.debug?.classes?.length
            ? `\n\nClasses na página: ${(data.debug.classes as string[]).slice(0, 8).join(", ")}`
            : "";
          Alert.alert(
            "Dados não encontrados",
            "A página não contém dados no formato esperado.\n\n" +
              "Verifique se:\n• O CAPTCHA foi resolvido\n" +
              "• Os dados estão visíveis na tela\n" +
              "• Aguarde carregar completamente" + hint,
            [{ text: "OK" }],
          );
          return;
        }
        setIsEnrichingMode(false);
        onImported(payload);
        return;
      }

      if (data.type === "ERROR") {
        setIsEnrichingMode(false);
        console.error("[WebView] JS Error:", data.message);
        Alert.alert("Erro no script", data.message);
      }
    } catch (err) {
      console.error("[WebView] Erro ao processar mensagem:", err);
    }
  }, [onImported, parser]);

  const onLoadStart = useCallback(() => {
    webviewLoadingRef.current = true;
    setWebviewLoading(true);
  }, []);

  const onLoadEnd = useCallback((event?: any) => {
    webviewLoadingRef.current = false;
    setWebviewLoading(false);
    const url = event?.nativeEvent?.url ?? "";
    console.log("[WebView] onLoadEnd:", url);
    // Fase 2: injetar script de captura EAN/NCM na ConsultaCompleta após navegação.
    // Guarda de URL: no Android, onLoadEnd pode disparar para a resposta do POST
    // (ainda em ConsultaResumida) ANTES do redirect para ConsultaCompleta.
    // Só injetamos se NÃO estivermos nas páginas de origem.
    const isSourcePage = url && (
      url.toLowerCase().includes("consultaresumida") ||
      url.toLowerCase().includes("consultapublica")
    );
    const p1 = pendingPhase1Ref.current;
    if (p1 && !isSourcePage) {
      pendingPhase1Ref.current = null;
      console.log("[Fase2] Injetando script na página:", url);
      setIsWaitingUserClick(false);
      setIsEnrichingMode(true);
      webviewRef.current?.injectJavaScript(buildPhase2Script(JSON.stringify(p1)));
    } else if (p1 && isSourcePage) {
      console.log("[Fase2] onLoadEnd em página de origem — aguardando ConsultaCompleta:", url);
    }
  }, []);

  const onNavigationStateChange = useCallback((navState: any) => {
    console.log("[WebView] navState:", navState.loading ? "loading" : "loaded", navState.url);
    // Backup: dispara quando a WebView muda de URL (ex: __doPostBack POST→redirect)
    // Só injeta Fase 2 se estivermos na ConsultaCompleta para evitar injeção na página errada
    const isConsultaCompleta = navState.url?.includes("ConsultaCompleta") || navState.url?.includes("consultacompleta");
    if (!navState.loading && isConsultaCompleta && pendingPhase1Ref.current) {
      const p1 = pendingPhase1Ref.current;
      pendingPhase1Ref.current = null;
      const p1json = JSON.stringify(p1);
      console.log("[Fase2] Backup via onNavigationStateChange:", navState.url);
      setIsWaitingUserClick(false);
      setIsEnrichingMode(true);
      setTimeout(() => {
        webviewRef.current?.injectJavaScript(buildPhase2Script(p1json));
      }, 1200);
    }
  }, []);

  const onWebViewError = useCallback(() => {
    setIsEnrichingMode(false);
    onError("Erro ao carregar a página da SEFAZ. Verifique sua conexão.");
  }, [onError]);

  return {
    webviewRef,
    webviewUrl,
    webviewLoading,
    isEnrichingMode,
    isWaitingUserClick,
    autoFillScript,
    openInWebView,
    handleCaptureData,
    handleWebViewMessage,
    onLoadStart,
    onLoadEnd,
    onNavigationStateChange,
    onWebViewError,
  };
}

export { SEFAZ_SP_CONSULTA };
