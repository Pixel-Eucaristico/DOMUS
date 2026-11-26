package expo.modules.domusgoogleauth

import android.accounts.Account
import android.app.Activity
import android.content.IntentSender
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Scope
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

private const val REQUEST_CODE_AUTHORIZE_DRIVE = 9481
private const val GOOGLE_ACCOUNT_TYPE = "com.google"

private const val CODE_SIGN_IN_CANCELLED = "SIGN_IN_CANCELLED"
private const val CODE_NO_CREDENTIAL = "NO_CREDENTIAL"
private const val CODE_IN_PROGRESS = "IN_PROGRESS"
private const val CODE_PLAY_SERVICES_NOT_AVAILABLE = "PLAY_SERVICES_NOT_AVAILABLE"
private const val CODE_DEVELOPER_ERROR = "DEVELOPER_ERROR"
private const val CODE_RESOLUTION_REQUIRED = "RESOLUTION_REQUIRED"
private const val CODE_NO_ACTIVITY = "NO_ACTIVITY"
private const val CODE_NOT_CONFIGURED = "NOT_CONFIGURED"
private const val CODE_AUTH_ERROR = "AUTH_ERROR"

class DomusGoogleAuthModule : Module() {
  private val signInInProgress = AtomicBoolean(false)
  private val pendingAuthPromise = AtomicReference<Promise?>(null)

  override fun definition() = ModuleDefinition {
    Name("DomusGoogleAuth")

    AsyncFunction("signIn") Coroutine { webClientId: String ->
      if (webClientId.isBlank()) {
        throw CodedException(
          CODE_NOT_CONFIGURED,
          "Google Web Client ID não configurado.",
          null
        )
      }

      val activity = appContext.currentActivity
        ?: throw CodedException(
          CODE_NO_ACTIVITY,
          "Nenhuma Activity ativa disponível para iniciar o login Google.",
          null
        )

      val availability = GoogleApiAvailability.getInstance()
      val playServicesStatus = availability.isGooglePlayServicesAvailable(activity)
      if (playServicesStatus != ConnectionResult.SUCCESS) {
        if (availability.isUserResolvableError(playServicesStatus)) {
          activity.runOnUiThread {
            if (!activity.isFinishing && !activity.isDestroyed) {
              availability.getErrorDialog(activity, playServicesStatus, 0)?.show()
            }
          }
        }
        throw CodedException(
          CODE_PLAY_SERVICES_NOT_AVAILABLE,
          "Google Play Services não disponível.",
          null
        )
      }

      if (!signInInProgress.compareAndSet(false, true)) {
        throw CodedException(CODE_IN_PROGRESS, "Login já em andamento.", null)
      }

      try {
        val signInOption = GetSignInWithGoogleOption.Builder(webClientId.trim()).build()
        val request = GetCredentialRequest.Builder()
          .addCredentialOption(signInOption)
          .build()

        val response = withContext(Dispatchers.Main) {
          val activeActivity = appContext.currentActivity
          if (activeActivity == null || activeActivity.isFinishing || activeActivity.isDestroyed) {
            throw CodedException(
              CODE_NO_ACTIVITY,
              "Activity indisponível ao iniciar o login Google.",
              null
            )
          }
          CredentialManager.create(activeActivity).getCredential(
            context = activeActivity,
            request = request
          )
        }

        val credential = response.credential
        if (
          credential is CustomCredential &&
          credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
          val googleId = GoogleIdTokenCredential.createFrom(credential.data)
          mapOf(
            "email" to googleId.id,
            "idToken" to googleId.idToken,
            "displayName" to googleId.displayName
          )
        } else {
          throw CodedException(
            CODE_AUTH_ERROR,
            "Credencial retornada não é do tipo Google ID Token.",
            null
          )
        }
      } catch (e: CancellationException) {
        throw e
      } catch (e: CodedException) {
        throw e
      } catch (e: GetCredentialCancellationException) {
        throw CodedException(
          CODE_SIGN_IN_CANCELLED,
          "Login cancelado pelo usuário.",
          e
        )
      } catch (e: NoCredentialException) {
        val msg = e.errorMessage?.toString() ?: e.message ?: "Nenhuma conta Google disponível."
        val code = if (isDeveloperErrorMessage(msg)) CODE_DEVELOPER_ERROR else CODE_NO_CREDENTIAL
        throw CodedException(code, msg, e)
      } catch (e: GoogleIdTokenParsingException) {
        throw CodedException(
          CODE_AUTH_ERROR,
          "Falha ao interpretar credencial Google: ${e.message}",
          e
        )
      } catch (e: GetCredentialException) {
        val msg = e.errorMessage?.toString() ?: e.message ?: "Erro ao autenticar com o Google."
        val code = if (isDeveloperErrorMessage(msg)) CODE_DEVELOPER_ERROR else CODE_AUTH_ERROR
        throw CodedException(code, msg, e)
      } catch (e: Exception) {
        val msg = e.localizedMessage ?: "Erro inesperado ao autenticar com o Google."
        val code = if (isDeveloperErrorMessage(msg)) CODE_DEVELOPER_ERROR else CODE_AUTH_ERROR
        throw CodedException(code, msg, e)
      } finally {
        signInInProgress.set(false)
      }
    }

    AsyncFunction("authorizeDrive") { scopes: List<String>, accountEmail: String?, interactive: Boolean, promise: Promise ->
      val normalizedScopes = scopes.map { it.trim() }.filter { it.isNotEmpty() }
      if (normalizedScopes.isEmpty()) {
        promise.reject(CODE_AUTH_ERROR, "Nenhum escopo informado para autorização do Drive.", null)
        return@AsyncFunction
      }

      val initialActivity = appContext.currentActivity
      val authorizationClient = if (interactive) {
        if (initialActivity == null || initialActivity.isFinishing || initialActivity.isDestroyed) {
          promise.reject(
            CODE_NO_ACTIVITY,
            "Nenhuma Activity ativa disponível para autorizar o Google Drive.",
            null
          )
          return@AsyncFunction
        }
        Identity.getAuthorizationClient(initialActivity)
      } else {
        when {
          initialActivity != null && !initialActivity.isFinishing && !initialActivity.isDestroyed ->
            Identity.getAuthorizationClient(initialActivity)
          appContext.reactContext != null ->
            Identity.getAuthorizationClient(appContext.reactContext!!)
          else -> {
            promise.resolve(null)
            return@AsyncFunction
          }
        }
      }

      val requestBuilder = AuthorizationRequest.builder()
        .setRequestedScopes(normalizedScopes.map { Scope(it) })

      if (!accountEmail.isNullOrBlank()) {
        requestBuilder.setAccount(Account(accountEmail.trim(), GOOGLE_ACCOUNT_TYPE))
      }

      val authRequest = requestBuilder.build()

      authorizationClient
        .authorize(authRequest)
        .addOnSuccessListener { result ->
          if (result.hasResolution()) {
            if (!interactive) {
              promise.resolve(null)
              return@addOnSuccessListener
            }

            val pendingIntent = result.pendingIntent
            if (pendingIntent == null) {
              promise.reject(
                CODE_RESOLUTION_REQUIRED,
                "Consentimento do Google Drive necessário, mas indisponível.",
                null
              )
              return@addOnSuccessListener
            }

            val activeActivity = appContext.currentActivity
            if (activeActivity == null || activeActivity.isFinishing || activeActivity.isDestroyed) {
              promise.reject(
                CODE_NO_ACTIVITY,
                "Activity encerrada antes de abrir o consentimento do Google Drive.",
                null
              )
              return@addOnSuccessListener
            }

            if (!pendingAuthPromise.compareAndSet(null, promise)) {
              promise.reject(
                CODE_IN_PROGRESS,
                "Autorização do Google Drive já em andamento.",
                null
              )
              return@addOnSuccessListener
            }

            activeActivity.runOnUiThread {
              if (activeActivity.isFinishing || activeActivity.isDestroyed) {
                pendingAuthPromise.getAndSet(null)?.reject(
                  CODE_NO_ACTIVITY,
                  "Activity encerrada antes de exibir o consentimento do Google Drive.",
                  null
                )
                return@runOnUiThread
              }
              try {
                @Suppress("DEPRECATION")
                activeActivity.startIntentSenderForResult(
                  pendingIntent.intentSender,
                  REQUEST_CODE_AUTHORIZE_DRIVE,
                  null,
                  0,
                  0,
                  0,
                  null
                )
              } catch (e: IntentSender.SendIntentException) {
                pendingAuthPromise.getAndSet(null)?.reject(
                  CODE_AUTH_ERROR,
                  "Falha ao abrir tela de consentimento do Google Drive: ${e.message}",
                  e
                )
              } catch (e: Exception) {
                pendingAuthPromise.getAndSet(null)?.reject(
                  CODE_AUTH_ERROR,
                  e.localizedMessage ?: "Falha ao solicitar consentimento do Google Drive.",
                  e
                )
              }
            }
          } else {
            val accessToken = result.accessToken
            if (accessToken.isNullOrBlank()) {
              if (!interactive) {
                promise.resolve(null)
              } else {
                promise.reject(
                  CODE_AUTH_ERROR,
                  "Token de acesso do Google Drive não retornado.",
                  null
                )
              }
            } else {
              promise.resolve(
                mapOf(
                  "accessToken" to accessToken,
                  "grantedScopes" to result.grantedScopes.toList()
                )
              )
            }
          }
        }
        .addOnCanceledListener {
          if (!interactive) {
            promise.resolve(null)
          } else {
            promise.reject(CODE_SIGN_IN_CANCELLED, "Autorização do Google Drive cancelada.", null)
          }
        }
        .addOnFailureListener { e ->
          if (e is ApiException) {
            when (e.statusCode) {
              CommonStatusCodes.CANCELED -> {
                promise.reject(CODE_SIGN_IN_CANCELLED, "Autorização cancelada pelo usuário.", e)
              }
              CommonStatusCodes.DEVELOPER_ERROR -> {
                promise.reject(
                  CODE_DEVELOPER_ERROR,
                  e.localizedMessage ?: "DEVELOPER_ERROR ao autorizar Google Drive.",
                  e
                )
              }
              CommonStatusCodes.SIGN_IN_REQUIRED,
              CommonStatusCodes.RESOLUTION_REQUIRED -> {
                if (!interactive) {
                  promise.resolve(null)
                } else {
                  promise.reject(
                    CODE_RESOLUTION_REQUIRED,
                    e.localizedMessage ?: "Consentimento necessário para acessar o Google Drive.",
                    e
                  )
                }
              }
              else -> {
                val msg = e.localizedMessage ?: "Falha ao autorizar o Google Drive."
                val code = if (isDeveloperErrorMessage(msg)) CODE_DEVELOPER_ERROR else CODE_AUTH_ERROR
                promise.reject(code, msg, e)
              }
            }
          } else {
            val msg = e.localizedMessage ?: "Falha ao autorizar o Google Drive."
            val code = if (isDeveloperErrorMessage(msg)) CODE_DEVELOPER_ERROR else CODE_AUTH_ERROR
            promise.reject(code, msg, e)
          }
        }
    }

    AsyncFunction("clearCachedAccessToken") Coroutine { accessToken: String ->
      if (accessToken.isBlank()) return@Coroutine
      val context = appContext.reactContext ?: return@Coroutine
      withContext(Dispatchers.IO) {
        GoogleAuthUtil.clearToken(context, accessToken)
      }
    }

    AsyncFunction("signOut") Coroutine { ->
      val context = appContext.currentActivity ?: appContext.reactContext ?: return@Coroutine
      val credentialManager = CredentialManager.create(context)
      credentialManager.clearCredentialState(ClearCredentialStateRequest())
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode != REQUEST_CODE_AUTHORIZE_DRIVE) {
        return@OnActivityResult
      }
      val promise = pendingAuthPromise.getAndSet(null) ?: return@OnActivityResult

      if (payload.resultCode == Activity.RESULT_CANCELED) {
        promise.reject(
          CODE_SIGN_IN_CANCELLED,
          "Autorização do Google Drive cancelada pelo usuário.",
          null
        )
        return@OnActivityResult
      }

      val data = payload.data
      if (data == null) {
        promise.reject(
          CODE_AUTH_ERROR,
          "Resposta vazia ao autorizar o Google Drive.",
          null
        )
        return@OnActivityResult
      }

      try {
        val result = Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(data)
        val accessToken = result.accessToken
        if (accessToken.isNullOrBlank()) {
          promise.reject(
            CODE_AUTH_ERROR,
            "Token de acesso do Google Drive não retornado após consentimento.",
            null
          )
        } else {
          promise.resolve(
            mapOf(
              "accessToken" to accessToken,
              "grantedScopes" to result.grantedScopes.toList()
            )
          )
        }
      } catch (e: ApiException) {
        val code = when (e.statusCode) {
          CommonStatusCodes.CANCELED -> CODE_SIGN_IN_CANCELLED
          CommonStatusCodes.DEVELOPER_ERROR -> CODE_DEVELOPER_ERROR
          else -> CODE_AUTH_ERROR
        }
        promise.reject(
          code,
          e.localizedMessage ?: "Falha ao processar autorização do Google Drive.",
          e
        )
      } catch (e: Exception) {
        promise.reject(
          CODE_AUTH_ERROR,
          e.localizedMessage ?: "Falha ao processar autorização do Google Drive.",
          e
        )
      }
    }

    OnActivityDestroys {
      pendingAuthPromise.getAndSet(null)?.reject(
        CODE_SIGN_IN_CANCELLED,
        "Activity encerrada durante a autorização do Google Drive.",
        null
      )
    }

    OnDestroy {
      pendingAuthPromise.getAndSet(null)?.reject(
        CODE_SIGN_IN_CANCELLED,
        "Módulo encerrado durante a autorização do Google Drive.",
        null
      )
    }
  }

  private fun isDeveloperErrorMessage(message: String): Boolean {
    return message.contains("DEVELOPER_ERROR", ignoreCase = true) ||
      message.contains("28444") ||
      message.contains("Developer console is not set up correctly", ignoreCase = true)
  }
}
