const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withOrientationFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Garante que o namespace "tools" está disponível no manifesto
    if (!androidManifest.manifest['$']['xmlns:tools']) {
      androidManifest.manifest['$']['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Injeta uma instrução para mesclar com a activity do ML Kit e remover a restrição PORTRAIT
    application.activity = application.activity || [];
    application.activity.push({
      '$': {
        'android:name': 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity',
        'tools:node': 'merge',
        'tools:remove': 'android:screenOrientation'
      }
    });

    return config;
  });
};