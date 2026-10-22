import { Settings } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui/Typography';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Settings size={48} color={colors.onSurfaceVariant} />
        <Typography variant="headlineMd" style={styles.title}>
          Settings & Goals
        </Typography>
        <Typography variant="bodyMd" color={colors.onSurfaceVariant} center>
          Ajuste suas metas de proteína, água e calorias ou conecte sua conta Supabase.
        </Typography>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontWeight: '700',
  },
});
