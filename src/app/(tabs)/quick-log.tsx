import { PlusCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui/Typography';
import { colors, spacing } from '@/theme/tokens';

export default function QuickLogScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PlusCircle size={56} color={colors.primary} />
        <Typography variant="headlineMd" style={styles.title}>
          Quick Log
        </Typography>
        <Typography variant="bodyMd" color={colors.onSurfaceVariant} center>
          Registre refeições por texto, foto ou adicione copos de água rapidamente.
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
