const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Adds android:gwpAsanMode="always" to <application> in AndroidManifest.xml.
 * Required for Crashlytics NDK GWP-ASan memory-safety reports.
 * See: https://developer.android.com/studio/profile/gwp-asan
 */
module.exports = function withGwpAsan(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    application.$["android:gwpAsanMode"] = "always";
    return mod;
  });
};
