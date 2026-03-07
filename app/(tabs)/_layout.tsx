import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { useResponsive } from "@/src/ui/layout/useResponsive";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Início</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="accounts">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>Contas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wishlist">
        <Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <Label>Desejos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="season">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Temporada</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { theme, themeMode } = useAppState();
  const { isDesktop } = useResponsive();
  const systemColorScheme = useColorScheme();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  const isDark =
    themeMode === "dark" ||
    (themeMode === "system" && systemColorScheme === "dark");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: theme.secondaryText,
        headerShown: false,
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: isIOS ? "transparent" : theme.cardBackground,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: theme.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
          ...(isDesktop ? { display: "none" as const } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: theme.cardBackground }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "DMSans_500Medium",
          fontSize: 11,
        },
      }}
      screenListeners={{
        state: (e) => {
          // Play sound when tab changes
          soundManager.play("tabSwitch");
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Contas",
          tabBarIcon: ({ color, size }) => (
            <Feather name="layers" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Desejos",
          tabBarIcon: ({ color, size }) => (
            <Feather name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="season"
        options={{
          title: "Temporada",
          tabBarIcon: ({ color, size }) => (
            <Feather name="award" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
