import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = colors.tertiaryContainer,
  trackColor = colors.surfaceHighest,
  height = 10,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 100);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor,
          borderRadius: radii.full,
        },
        style,
      ]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color,
            borderRadius: radii.full,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    padding: 1.5,
  },
  fill: {
    height: '100%',
  },
});
