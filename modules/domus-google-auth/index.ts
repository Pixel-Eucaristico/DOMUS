import { requireOptionalNativeModule } from "expo";
import type { DomusGoogleAuthNativeModule } from "./src/types";

export { DomusGoogleAuthErrorCodes } from "./src/types";
export type {
  DomusGoogleAuthErrorCode,
  DomusGoogleAuthNativeModule,
  DriveAuthorizationResult,
  GoogleSignInResult,
} from "./src/types";

export function getDomusGoogleAuthModule(): DomusGoogleAuthNativeModule | null {
  return requireOptionalNativeModule<DomusGoogleAuthNativeModule>("DomusGoogleAuth") ?? null;
}

export default getDomusGoogleAuthModule;
