import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { router } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, spacing } from '@/theme/tokens';
import { Typography } from './Typography';
export function Screen({
  title,
  children,
  back = false,
}: {
  title: string;
  children: React.ReactNode;
  back?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { isPt } = useLanguage();
  return (
    <SafeAreaView style={formStyles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            formStyles.content,
            { paddingBottom: insets.bottom + (back ? 32 : 110) },
          ]}
        >
          {back && (
            <Action
              label={isPt ? 'Voltar' : 'Back'}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/(tabs)')
              }
              secondary
            />
          )}
          <Typography variant="headlineLg" accessibilityRole="header">
            {title}
          </Typography>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={formStyles.panel}>
      {title && (
        <Typography variant="headlineSm" accessibilityRole="header">
          {title}
        </Typography>
      )}
      {children}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Typography variant="labelMd">{label}</Typography>
      <TextInput
        placeholderTextColor={colors.outline}
        {...props}
        accessibilityLabel={label}
        style={[
          formStyles.input,
          props.multiline && { minHeight: 100, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        formStyles.button,
        secondary && formStyles.secondary,
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onSurface} />
      ) : (
        <Typography
          variant="labelMd"
          color={secondary ? colors.onSurface : colors.onPrimary}
        >
          {label}
        </Typography>
      )}
    </Pressable>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={formStyles.row}>
      <Typography style={{ flex: 1 }} variant="bodyMd">
        {label}
      </Typography>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{
          true: colors.primaryContainer,
          false: colors.surfaceHighest,
        }}
      />
    </View>
  );
}
export function Note({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <Typography
      variant="bodyMd"
      color={error ? colors.error : colors.onSurfaceVariant}
      accessibilityLiveRegion={error ? 'polite' : undefined}
    >
      {children}
    </Typography>
  );
}
export function useNumberFormat() {
  const { isPt } = useLanguage();
  return (n: number | null | undefined, decimals = 1) =>
    n == null
      ? '—'
      : n.toLocaleString(isPt ? 'pt-BR' : 'en-US', {
          maximumFractionDigits: decimals,
        });
}
export const formStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  panel: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.strokeCrisp,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outline,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    minHeight: 48,
    color: colors.onSurface,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
});
