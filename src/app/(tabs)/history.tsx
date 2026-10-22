import { Calendar } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui/Typography';
import { colors, spacing } from '@/theme/tokens';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Calendar size={48} color={colors.primary} />
        <Typography variant="headlineMd" style={styles.title}>
          History & Logs
        </Typography>
        <Typography variant="bodyMd" color={colors.onSurfaceVariant} center>
          Navegue pelas refeições e consumo de água de dias anteriores.
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
