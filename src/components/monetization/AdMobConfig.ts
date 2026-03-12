/**
 * AdMob configuration — DOMUS
 * App ID: ca-app-pub-8693115758199908~8641009249
 */

// Use Google test IDs in dev to avoid policy violations
const IS_TEST = __DEV__;

export const ADMOB_IDS = {
  /** Banner (SupportBanner) */
  banner: IS_TEST
    ? "ca-app-pub-3940256099942544/6300978111" // Google test banner ID
    : "ca-app-pub-8693115758199908/8752689887",

  /** Interstitial (DailyAdModal) */
  interstitial: IS_TEST
    ? "ca-app-pub-3940256099942544/1033173712"
    : "ca-app-pub-8693115758199908/6825035120",

  /** Native Advanced (NativeAdBanner) */
  nativeAdvanced: IS_TEST
    ? "ca-app-pub-3940256099942544/2247696110"
    : "ca-app-pub-8693115758199908/3587993115",

  /** App Open (AppOpenAdHost) */
  appOpen: IS_TEST
    ? "ca-app-pub-3940256099942544/9257395921"
    : "ca-app-pub-8693115758199908/5842980150",
};
