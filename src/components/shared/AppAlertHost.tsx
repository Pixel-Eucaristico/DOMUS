import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { TButton } from "@/src/components/tamagui";
import {
  dismissAppAlert,
  getAppAlertForHost,
  layoutAppAlertButtons,
  pressAppAlertButton,
  registerAppAlertHost,
  subscribeAppAlert,
  type AppAlertRequest,
} from "@/src/services/appAlert";

const { height } = Dimensions.get("window");

/**
 * Alerta customizado do app (substitui `Alert.alert` / `window.confirm`), no
 * estilo do `ConfirmDeleteModal`. Um na raiz (`app/_layout.tsx`) e um dentro de
 * cada Modal ou tela modal que pode chamar alertas: só o montado por último
 * mostra o alerta (ver `src/services/appAlert.ts`). No Android/iOS o `Modal`
 * fica sempre montado e só muda `visible`.
 */
export function AppAlertHost() {
  const { theme } = useAppState();
  const [request, setRequest] = useState<AppAlertRequest | null>(null);

  useEffect(() => {
    const host = registerAppAlertHost();
    const unsubscribe = subscribeAppAlert(() => setRequest(getAppAlertForHost(host.id)));
    return () => {
      unsubscribe();
      host.unregister();
    };
  }, []);

  return <AppAlertModal request={request} theme={theme} />;
}

function AppAlertModal({ request, theme }: { request: AppAlertRequest | null; theme: ThemeColors }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const requestId = request?.id ?? null;

  useEffect(() => {
    if (requestId === null) return;
    // Teclado aberto cobriria os botões da folha
    Keyboard.dismiss();
    slideAnim.setValue(height);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 300, useNativeDriver: true }),
    ]).start();
  }, [requestId, slideAnim, fadeAnim]);

  const dismiss = () => {
    if (request) dismissAppAlert(request.id);
  };

  const danger = theme.danger ?? "#DC2626";
  const isDestructive = !!request?.buttons.some((b) => b.style === "destructive");
  const iconColor = isDestructive ? danger : theme.accentColor;
  const layout = request ? layoutAppAlertButtons(request.buttons) : { stacked: false, items: [] };

  // Na web o Modal entra no DOM ao montar: montado desde o início, ficaria por
  // baixo de Modais abertos depois. Lá ele só monta quando há alerta; no
  // Android/iOS fica sempre montado e só muda `visible`.
  if (Platform.OS === "web" && !request) return null;

  return (
    <Modal visible={request !== null} transparent animationType="none" onRequestClose={dismiss}>
      {request ? (
        <View style={s.container}>
          <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback onPress={dismiss} accessible={false}>
              <View style={s.flex} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            accessibilityRole="alert"
            style={[
              s.sheet,
              {
                backgroundColor: theme.cardBackground,
                paddingBottom: Math.max(insets.bottom, 20),
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={[s.handle, { backgroundColor: theme.secondaryText + "40" }]} />

            <View style={[s.iconCircle, { backgroundColor: iconColor + "15" }]}>
              <Feather name={isDestructive ? "alert-triangle" : "info"} size={28} color={iconColor} />
            </View>

            <Text style={[s.title, { color: theme.textColor }]}>{request.title}</Text>

            {request.message ? (
              <ScrollView style={s.messageScroll} contentContainerStyle={s.messageContent}>
                <Text style={[s.message, { color: theme.secondaryText }]}>{request.message}</Text>
              </ScrollView>
            ) : null}

            <View style={[s.buttons, layout.stacked ? s.buttonsStacked : null]}>
              {layout.items.map((item) => {
                const common = {
                  flex: layout.stacked ? undefined : 1,
                  width: layout.stacked ? "100%" : undefined,
                  onPress: () => {
                    soundManager.play("tap");
                    pressAppAlertButton(request.id, item.index);
                  },
                };
                if (item.variant === "danger") {
                  return (
                    <TButton key={item.index} {...common} variant="danger" backgroundColor={danger}>
                      {item.text}
                    </TButton>
                  );
                }
                if (item.variant === "outline") {
                  return (
                    <TButton key={item.index} {...common} variant="outline" borderColor={theme.border} color={theme.textColor}>
                      {item.text}
                    </TButton>
                  );
                }
                return (
                  <TButton key={item.index} {...common} variant="primary" backgroundColor={theme.primaryColor}>
                    {item.text}
                  </TButton>
                );
              })}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  messageScroll: {
    maxHeight: height * 0.5,
    alignSelf: "stretch",
    flexGrow: 0,
  },
  messageContent: {
    paddingBottom: 24,
  },
  message: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  buttonsStacked: {
    flexDirection: "column",
  },
});
