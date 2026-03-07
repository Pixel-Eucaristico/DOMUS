import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAppState } from '@/src/context/AppStateProvider';
import { soundManager } from '@/src/services/SoundManager';

interface NavItem {
  route: string;
  label: string;
  icon: string;
  iconSet?: 'Feather' | 'MaterialCommunityIcons';
  matchPaths?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { route: '/(tabs)', label: 'Início', icon: 'home', matchPaths: ['/(tabs)', '/index'] },
  { route: '/(tabs)/accounts', label: 'Contas', icon: 'layers', matchPaths: ['/accounts'] },
  { route: '/(tabs)/wishlist', label: 'Desejos', icon: 'heart', matchPaths: ['/wishlist'] },
  { route: '/(tabs)/season', label: 'Temporada', icon: 'award', matchPaths: ['/season'] },
];

const QUICK_LINKS: NavItem[] = [
  { route: '/about', label: 'Configurações', icon: 'settings' },
  { route: '/ai-chat', label: 'AI Chat', icon: 'robot-happy', iconSet: 'MaterialCommunityIcons' },
  { route: '/sync', label: 'Sincronizar', icon: 'refresh-cw' },
];

export const AdaptiveTabBar = memo(function AdaptiveTabBar() {
  const { theme } = useAppState();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    const paths = item.matchPaths ?? [item.route];
    return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  };

  const handlePress = (route: string) => {
    soundManager.play('tabSwitch');
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground, borderRightColor: theme.border }]}>
      <View style={styles.logoSection}>
        <Text style={[styles.logo, { color: theme.primaryColor }]}>DOMUS</Text>
      </View>

      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Pressable
              key={item.route}
              style={[
                styles.navItem,
                active && { backgroundColor: `${theme.primaryColor}15` },
              ]}
              onPress={() => handlePress(item.route)}
            >
              <Feather
                name={item.icon as any}
                size={20}
                color={active ? theme.primaryColor : theme.secondaryText}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: active ? theme.primaryColor : theme.secondaryText },
                  active && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.navSection}>
        {QUICK_LINKS.map((item) => (
          <Pressable
            key={item.route}
            style={styles.navItem}
            onPress={() => handlePress(item.route)}
          >
            {item.iconSet === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color={theme.secondaryText}
              />
            ) : (
              <Feather
                name={item.icon as any}
                size={20}
                color={theme.secondaryText}
              />
            )}
            <Text style={[styles.navLabel, { color: theme.secondaryText }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  logoSection: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  logo: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    letterSpacing: 1,
  },
  navSection: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 44,
  },
  navLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  navLabelActive: {
    fontFamily: 'DMSans_600SemiBold',
  },
  divider: {
    height: 1,
    marginVertical: 16,
    marginHorizontal: 12,
  },
});
