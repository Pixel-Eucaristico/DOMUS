import { useState, useRef, useCallback } from "react";
import { Platform } from "react-native";
import {
  useAudioRecorder,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from "expo-audio";
import { File } from "expo-file-system";

export interface VoiceRecorderResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; base64: string } | null>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecorder(): VoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const activeRef = useRef(false);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") return;

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) throw new Error("Permissão de microfone negada");

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    activeRef.current = true;
    setIsRecording(true);
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; base64: string } | null> => {
    if (!activeRef.current) return null;

    setIsRecording(false);
    activeRef.current = false;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });

    const uri = recorder.uri;
    if (!uri) return null;

    const base64 = await new File(uri).base64();
    return { uri, base64 };
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    if (!activeRef.current) return;
    setIsRecording(false);
    activeRef.current = false;
    try {
      await recorder.stop();
    } catch {
      // ignore
    }
    await setAudioModeAsync({ allowsRecording: false });
  }, [recorder]);

  return { isRecording, startRecording, stopRecording, cancelRecording };
}
