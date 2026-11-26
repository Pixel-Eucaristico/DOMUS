Pod::Spec.new do |s|
  s.name           = 'DomusGoogleAuth'
  s.version        = '1.0.0'
  s.summary        = 'DOMUS native Google authentication and Drive authorization module'
  s.description    = 'Expo native module for Google Sign-In and Drive AppData authorization'
  s.license        = 'MIT'
  s.author         = 'DOMUS'
  s.homepage       = 'https://domus.pixeleucaristico.com.br'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'GoogleSignIn', '~> 8.0'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
