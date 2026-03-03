import { useState, useCallback } from "react";
import * as Camera from "expo-camera";
import * as ImagePicker from "expo-image-picker";

export type PermissionStatus = "granted" | "denied" | "undetermined";

/**
 * Hook that manages permission requests with a rationale modal flow.
 *
 * Usage:
 *   const { cameraRationaleVisible, requestCamera, handleCameraAllow, handleCameraDeny } = usePermission();
 *
 *   <PermissionRationale
 *     visible={cameraRationaleVisible}
 *     onAllow={handleCameraAllow}
 *     onDeny={handleCameraDeny}
 *     {...CAMERA_RATIONALE}
 *   />
 *
 *   // Trigger the flow:
 *   const granted = await requestCamera();
 */
export function usePermission() {
  // Camera rationale state
  const [cameraRationaleVisible, setCameraRationaleVisible] = useState(false);
  const [cameraResolve, setCameraResolve] = useState<
    ((granted: boolean) => void) | null
  >(null);

  // Photos rationale state
  const [photosRationaleVisible, setPhotosRationaleVisible] = useState(false);
  const [photosResolve, setPhotosResolve] = useState<
    ((granted: boolean) => void) | null
  >(null);

  // ─── Camera ───────────────────────────────────────────────────────────────

  /**
   * Requests camera permission.
   * - If already granted, returns true immediately.
   * - Otherwise shows the rationale modal first, then requests native permission.
   */
  const requestCamera = useCallback((): Promise<boolean> => {
    return new Promise(async (resolve) => {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === "granted") {
        resolve(true);
        return;
      }

      // Show rationale modal; resolve after user action
      setCameraResolve(() => resolve);
      setCameraRationaleVisible(true);
    });
  }, []);

  const handleCameraAllow = useCallback(async () => {
    setCameraRationaleVisible(false);
    const { status } = await Camera.requestCameraPermissionsAsync();
    cameraResolve?.(status === "granted");
    setCameraResolve(null);
  }, [cameraResolve]);

  const handleCameraDeny = useCallback(() => {
    setCameraRationaleVisible(false);
    cameraResolve?.(false);
    setCameraResolve(null);
  }, [cameraResolve]);

  // ─── Photos / Media Library ───────────────────────────────────────────────

  /**
   * Requests photo library permission.
   * - If already granted, returns true immediately.
   * - Otherwise shows the rationale modal first, then requests native permission.
   */
  const requestPhotos = useCallback((): Promise<boolean> => {
    return new Promise(async (resolve) => {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status === "granted") {
        resolve(true);
        return;
      }

      setPhotosResolve(() => resolve);
      setPhotosRationaleVisible(true);
    });
  }, []);

  const handlePhotosAllow = useCallback(async () => {
    setPhotosRationaleVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    photosResolve?.(status === "granted");
    setPhotosResolve(null);
  }, [photosResolve]);

  const handlePhotosDeny = useCallback(() => {
    setPhotosRationaleVisible(false);
    photosResolve?.(false);
    setPhotosResolve(null);
  }, [photosResolve]);

  return {
    // Camera
    cameraRationaleVisible,
    requestCamera,
    handleCameraAllow,
    handleCameraDeny,
    // Photos
    photosRationaleVisible,
    requestPhotos,
    handlePhotosAllow,
    handlePhotosDeny,
  };
}
