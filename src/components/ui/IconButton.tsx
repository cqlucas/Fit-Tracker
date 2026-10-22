import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export interface IconButtonProps {
  onPress?: () => void;
  icon: React.ReactNode;
  size?: number;
  backgroundColor?: string;
  borderColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function IconButton({
  onPress,
  icon,
  size = 40,
  backgroundColor = colors.surfaceContainer,
  borderColor,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: radii.full,
          backgroundColor,
          borderWidth: borderColor ? 1 : 0,
          borderColor,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        style,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
