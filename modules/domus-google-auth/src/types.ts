export interface GoogleSignInResult {
  email: string;
  idToken: string;
  displayName: string | null;
}

export interface DriveAuthorizationResult {
  accessToken: string;
  grantedScopes: string[];
}

export const DomusGoogleAuthErrorCodes = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  NO_CREDENTIAL: "NO_CREDENTIAL",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  DEVELOPER_ERROR: "DEVELOPER_ERROR",
  RESOLUTION_REQUIRED: "RESOLUTION_REQUIRED",
  NO_ACTIVITY: "NO_ACTIVITY",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  AUTH_ERROR: "AUTH_ERROR",
} as const;

export type DomusGoogleAuthErrorCode =
  (typeof DomusGoogleAuthErrorCodes)[keyof typeof DomusGoogleAuthErrorCodes];

export interface DomusGoogleAuthNativeModule {
  signIn(webClientId: string): Promise<GoogleSignInResult>;
  authorizeDrive(
    scopes: string[],
    accountEmail: string | null,
    interactive: boolean,
  ): Promise<DriveAuthorizationResult | null>;
  clearCachedAccessToken(accessToken: string): Promise<void>;
  signOut(): Promise<void>;
}
