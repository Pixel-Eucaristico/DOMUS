// Inicialização única do SDK do Google Mobile Ads, antes do primeiro pedido.
// Só é chamada quando há um modo de apoio com anúncio (quem usa só links não
// liga o SDK). A promessa sempre resolve (prazo de 5 s): falha ou demora não
// impedem os anúncios, que caem no próprio fallback. Depois de falhar, a
// próxima chamada tenta de novo.

const INIT_TIMEOUT_MS = 5_000;

let initPromise: Promise<void> | null = null;

function warn(message: string, err?: unknown): void {
  if (__DEV__) console.warn(`[mobileAds] ${message}`, err ?? "");
}

async function initialize(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admob = require("react-native-google-mobile-ads");
    const mobileAds = admob.MobileAds ?? admob.default;
    if (typeof mobileAds !== "function") {
      warn("SDK sem MobileAds()");
      return false;
    }
    await mobileAds().initialize();
    return true;
  } catch (err) {
    warn("falha ao inicializar", err);
    return false;
  }
}

export function ensureMobileAdsInitialized(): Promise<void> {
  if (!initPromise) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => {
        warn(`initialize() sem resposta em ${INIT_TIMEOUT_MS} ms`);
        resolve(false);
      }, INIT_TIMEOUT_MS);
    });
    initPromise = Promise.race([initialize(), timeout]).then((ok) => {
      clearTimeout(timer);
      // Falha ou prazo: esquece, para uma chamada futura tentar de novo
      if (!ok) initPromise = null;
    });
  }
  return initPromise;
}
