import { useState, useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import {
  useAudioRecorder,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from "expo-audio";
import { File } from "expo-file-system";
import {
  cancelVoiceRecording,
  startVoiceRecording,
  stopVoiceRecording,
  type VoiceRecorderState,
} from "./voiceRecorderLifecycle";

export interface VoiceRecorderResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; base64: string } | null>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecorder(): VoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const stateRef = useRef<VoiceRecorderState>({ active: false, starting: false, cancelled: false });
  const recorderRef = useRef(recorder);

  useEffect(() => {
    recorderRef.current = recorder;
  }, [recorder]);

  useEffect(() => {
    const state = stateRef.current;
    return () => {
      if (state.active || state.starting) {
        void cancelVoiceRecording(state, {
          setAudioMode: setAudioModeAsync,
          recorder: recorderRef.current,
        });
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") return;

    const started = await startVoiceRecording(stateRef.current, {
      requestPermissions: requestRecordingPermissionsAsync,
      setAudioMode: setAudioModeAsync,
      recorder,
    });
    if (started) setIsRecording(true);
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; base64: string } | null> => {
    if (!stateRef.current.active) return null;

    setIsRecording(false);
    const uri = await stopVoiceRecording(stateRef.current, {
      setAudioMode: setAudioModeAsync,
      recorder,
    });
    if (!uri) return null;

    const base64 = await new File(uri).base64();
    return { uri, base64 };
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    if (!stateRef.current.active && !stateRef.current.starting) return;
    setIsRecording(false);
    await cancelVoiceRecording(stateRef.current, {
      setAudioMode: setAudioModeAsync,
      recorder,
    });
  }, [recorder]);

  return { isRecording, startRecording, stopRecording, cancelRecording };
}
