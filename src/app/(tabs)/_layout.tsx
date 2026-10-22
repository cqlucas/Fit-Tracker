import { Tabs } from 'expo-router';
import {
  Calendar,
  LayoutDashboard,
  LineChart,
  Plus,
  Settings,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

type CustomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function CustomTabBar({ state, descriptors, navigateToTab, insets }: CustomTabBarProps) {
  const bottomInset = insets?.bottom ?? 0;

  const tabIcons: Record<string, (color: string) => React.ReactNode> = {
    index: (color) => <LayoutDashboard size={22} color={color} strokeWidth={2.2} />,
    history: (color) => <Calendar size={22} color={color} strokeWidth={2.2} />,
    'quick-log': () => <Plus size={28} color={colors.onPrimaryContainer} strokeWidth={3} />,
    analytics: (color) => <LineChart size={22} color={color} strokeWidth={2.2} />,
    settings: (color) => <Settings size={22} color={color} strokeWidth={2.2} />,
  };

  const tabLabels: Record<string, string> = {
    index: 'Today',
    history: 'History',
    'quick-log': 'Log',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(bottomInset, 8) }]}>
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isLogButton = route.name === 'quick-log';

          const onPress = () => {
            if (!isFocused) {
              navigateToTab(route.key);
            }
          };

          if (isLogButton) {
            return (
              <View key={route.key} style={styles.centerButtonWrapper}>
                <Pressable
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityLabel="Quick Log"
                  style={({ pressed }) => [
                    styles.centerFab,
                    shadows.fab,
                    pressed && styles.pressedFab,
                  ]}>
                  {tabIcons['quick-log']?.(colors.onPrimaryContainer)}
                </Pressable>
                <Typography variant="labelSm" color={colors.onSurfaceVariant} style={styles.fabLabel}>
                  {tabLabels['quick-log']}
                </Typography>
              </View>
            );
          }

          const iconColor = isFocused ? colors.primary : colors.onSurfaceVariant;
          const labelColor = isFocused ? colors.primary : colors.onSurfaceVariant;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || tabLabels[route.name]}
              style={({ pressed }) => [styles.tabItem, pressed && styles.pressedTab]}>
              <View style={styles.iconWrapper}>
                {tabIcons[route.name]?.(iconColor)}
              </View>
              <Typography
                variant="labelSm"
                color={labelColor}
                style={[styles.tabLabel, isFocused && styles.activeTabLabel]}>
                {tabLabels[route.name]}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="quick-log" options={{ title: 'Log' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 14, 20, 0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.strokeSubtle,
    ...shadows.tabBar,
  },
  tabBarContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
  },
  tabItem: {
    minWidth: 54,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressedTab: {
    opacity: 0.7,
  },
  iconWrapper: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  activeTabLabel: {
    fontWeight: '800',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedFab: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    marginTop: 3,
  },
});
