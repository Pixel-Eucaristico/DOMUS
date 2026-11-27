import ExpoModulesCore
import GoogleSignIn
import UIKit

public class DomusGoogleAuthModule: Module {
  private var isSigningIn = false
  private var invalidatedAccessTokens = Set<String>()

  public func definition() -> ModuleDefinition {
    Name("DomusGoogleAuth")

    AsyncFunction("signIn") { (webClientId: String, promise: Promise) in
      let trimmedWebClientId = webClientId.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !trimmedWebClientId.isEmpty else {
        promise.reject("NOT_CONFIGURED", "Google Web Client ID não configurado.")
        return
      }

      guard let clientID = self.resolveIosClientId() else {
        promise.reject(
          "NOT_CONFIGURED",
          "GIDClientID não encontrado no Info.plist nem em GoogleService-Info.plist."
        )
        return
      }

      guard !self.isSigningIn else {
        promise.reject("IN_PROGRESS", "Login já em andamento.")
        return
      }

      GIDSignIn.sharedInstance.configuration = GIDConfiguration(
        clientID: clientID,
        serverClientID: trimmedWebClientId
      )

      guard let presenter = self.topViewController() else {
        promise.reject(
          "NO_ACTIVITY",
          "Nenhum UIViewController ativo disponível para iniciar o login Google."
        )
        return
      }

      self.isSigningIn = true
      GIDSignIn.sharedInstance.signIn(withPresenting: presenter) { result, error in
        self.isSigningIn = false

        if let error = error {
          self.rejectGoogleError(error, promise: promise)
          return
        }

        guard let user = result?.user,
              let email = user.profile?.email,
              let idToken = user.idToken?.tokenString else {
          promise.reject("AUTH_ERROR", "Dados da conta Google incompletos.")
          return
        }

        promise.resolve([
          "email": email,
          "idToken": idToken,
          "displayName": user.profile?.name ?? NSNull()
        ])
      }
    }.runOnQueue(.main)

    AsyncFunction("authorizeDrive") { (scopes: [String], accountEmail: String?, interactive: Bool, promise: Promise) in
      let normalizedScopes = scopes
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }

      guard !normalizedScopes.isEmpty else {
        promise.reject("AUTH_ERROR", "Nenhum escopo informado para autorização do Drive.")
        return
      }

      let startInteractiveSignIn: () -> Void = {
        guard !self.isSigningIn else {
          promise.reject("IN_PROGRESS", "Login já em andamento.")
          return
        }

        if GIDSignIn.sharedInstance.configuration == nil {
          guard let clientID = self.resolveIosClientId() else {
            promise.reject(
              "NOT_CONFIGURED",
              "GIDClientID não encontrado no Info.plist nem em GoogleService-Info.plist."
            )
            return
          }
          GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }

        guard let presenter = self.topViewController() else {
          promise.reject(
            "NO_ACTIVITY",
            "Nenhum UIViewController ativo disponível para autorizar o Google Drive."
          )
          return
        }

        self.isSigningIn = true
        GIDSignIn.sharedInstance.signIn(
          withPresenting: presenter,
          hint: accountEmail,
          additionalScopes: normalizedScopes
        ) { result, error in
          self.isSigningIn = false

          if let error = error {
            self.rejectGoogleError(error, promise: promise)
            return
          }

          guard let authorizedUser = result?.user,
                !authorizedUser.accessToken.tokenString.isEmpty else {
            promise.reject("AUTH_ERROR", "Token de acesso do Google Drive não retornado.")
            return
          }

          guard self.matchesRequestedAccount(authorizedUser, accountEmail: accountEmail) else {
            promise.reject(
              "AUTH_ERROR",
              "A conta autorizada no Google Drive não corresponde à conta selecionada."
            )
            return
          }

          let token = authorizedUser.accessToken.tokenString
          self.invalidatedAccessTokens.remove(token)
          promise.resolve([
            "accessToken": token,
            "grantedScopes": authorizedUser.grantedScopes ?? []
          ])
        }
      }

      let handleUser: (GIDGoogleUser) -> Void = { user in
        let granted = Set(user.grantedScopes ?? [])
        let missing = normalizedScopes.filter { !granted.contains($0) }

        if missing.isEmpty {
          user.refreshTokensIfNeeded { refreshedUser, error in
            if let error = error {
              if !interactive {
                promise.resolve(nil)
              } else {
                self.rejectGoogleError(error, promise: promise)
              }
              return
            }

            guard let activeUser = refreshedUser,
                  !activeUser.accessToken.tokenString.isEmpty else {
              if !interactive {
                promise.resolve(nil)
              } else {
                promise.reject("AUTH_ERROR", "Token de acesso do Google Drive não retornado.")
              }
              return
            }

            let token = activeUser.accessToken.tokenString
            if self.invalidatedAccessTokens.contains(token) {
              if !interactive {
                promise.resolve(nil)
              } else {
                startInteractiveSignIn()
              }
              return
            }

            promise.resolve([
              "accessToken": token,
              "grantedScopes": activeUser.grantedScopes ?? []
            ])
          }
          return
        }

        if !interactive {
          promise.resolve(nil)
          return
        }

        guard !self.isSigningIn else {
          promise.reject("IN_PROGRESS", "Autorização do Google Drive já em andamento.")
          return
        }

        guard let presenter = self.topViewController() else {
          promise.reject(
            "NO_ACTIVITY",
            "Nenhum UIViewController ativo disponível para autorizar o Google Drive."
          )
          return
        }

        self.isSigningIn = true
        user.addScopes(missing, presenting: presenter) { result, error in
          self.isSigningIn = false

          if let error = error {
            self.rejectGoogleError(error, promise: promise)
            return
          }

          guard let authorizedUser = result?.user,
                !authorizedUser.accessToken.tokenString.isEmpty else {
            promise.reject("AUTH_ERROR", "Token de acesso do Google Drive não retornado.")
            return
          }

          let token = authorizedUser.accessToken.tokenString
          self.invalidatedAccessTokens.remove(token)
          promise.resolve([
            "accessToken": token,
            "grantedScopes": authorizedUser.grantedScopes ?? []
          ])
        }
      }

      if GIDSignIn.sharedInstance.configuration == nil {
        guard let clientID = self.resolveIosClientId() else {
          if !interactive {
            promise.resolve(nil)
          } else {
            promise.reject(
              "NOT_CONFIGURED",
              "GIDClientID não encontrado no Info.plist nem em GoogleService-Info.plist."
            )
          }
          return
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
      }

      if let currentUser = GIDSignIn.sharedInstance.currentUser,
         self.matchesRequestedAccount(currentUser, accountEmail: accountEmail) {
        handleUser(currentUser)
        return
      }

      GIDSignIn.sharedInstance.restorePreviousSignIn { restoredUser, _ in
        if let user = restoredUser,
           self.matchesRequestedAccount(user, accountEmail: accountEmail) {
          handleUser(user)
          return
        }

        if !interactive {
          promise.resolve(nil)
          return
        }

        startInteractiveSignIn()
      }
    }.runOnQueue(.main)

    AsyncFunction("clearCachedAccessToken") { (accessToken: String) in
      let trimmed = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
      if !trimmed.isEmpty {
        self.invalidatedAccessTokens.insert(trimmed)
      }
    }.runOnQueue(.main)

    AsyncFunction("signOut") {
      self.invalidatedAccessTokens.removeAll()
      GIDSignIn.sharedInstance.signOut()
    }.runOnQueue(.main)
  }

  private func matchesRequestedAccount(_ user: GIDGoogleUser, accountEmail: String?) -> Bool {
    guard let expected = accountEmail?.trimmingCharacters(in: .whitespacesAndNewlines),
          !expected.isEmpty else {
      return true
    }
    guard let actual = user.profile?.email else {
      return false
    }
    return actual.caseInsensitiveCompare(expected) == .orderedSame
  }

  private func resolveIosClientId() -> String? {
    if let plistClientId = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String,
       !plistClientId.isEmpty {
      return plistClientId
    }

    if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
       let dict = NSDictionary(contentsOfFile: path),
       let clientId = dict["CLIENT_ID"] as? String,
       !clientId.isEmpty {
      return clientId
    }

    return nil
  }

  private func topViewController() -> UIViewController? {
    let connectedScenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .filter { $0.activationState == .foregroundActive }

    let root = connectedScenes
      .flatMap { $0.windows }
      .first(where: { $0.isKeyWindow })?.rootViewController
      ?? UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first?.rootViewController

    var current = root
    while let presented = current?.presentedViewController {
      current = presented
    }
    return current
  }

  private func isDeveloperError(_ nsError: NSError) -> Bool {
    let combined = [
      nsError.localizedDescription,
      nsError.localizedFailureReason ?? "",
      String(describing: nsError.userInfo)
    ].joined(separator: " ").lowercased()

    return combined.contains("invalid_client") ||
      combined.contains("invalid client") ||
      combined.contains("url scheme") ||
      combined.contains("cfbundleurlschemes") ||
      combined.contains("cfbundleurltypes") ||
      combined.contains("reversed_client_id") ||
      combined.contains("gidclientid") ||
      combined.contains("developer_error")
  }

  private func rejectGoogleError(_ error: Error, promise: Promise) {
    let nsError = error as NSError
    if nsError.domain == kGIDSignInErrorDomain && nsError.code == GIDSignInError.canceled.rawValue {
      promise.reject("SIGN_IN_CANCELLED", "Login cancelado pelo usuário.")
      return
    }
    if self.isDeveloperError(nsError) {
      promise.reject("DEVELOPER_ERROR", error.localizedDescription)
      return
    }
    promise.reject("AUTH_ERROR", error.localizedDescription)
  }
}
