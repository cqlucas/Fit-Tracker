import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows } from '@/theme/tokens';

export interface WaterVesselVisualProps {
  volume: number; // e.g. 500
  isPt?: boolean;
}

export function WaterVesselVisual({ volume, isPt = false }: WaterVesselVisualProps) {
  // Mapeia o volume de 100ml a 1000ml para a altura visual do líquido no SVG
  const clamped = Math.max(100, Math.min(volume, 1000));
  const ratio = (clamped - 100) / 900; // 0..1
  const newY = 135 - ratio * 85; // y vai de 135 (vazio) até 50 (cheio)
  const newHeight = 165 - newY;

  return (
    <View style={styles.container}>
      <Svg width={150} height={170} viewBox="0 0 160 180" style={styles.svg}>
        <Defs>
          <ClipPath id="vesselClip">
            <Path d="M47 24H113L121 146C121.5 155.5 114 164 104.5 164H55.5C46 164 38.5 155.5 39 146L47 24Z" />
          </ClipPath>

          <LinearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#4cd7f6" stopOpacity={0.95} />
            <Stop offset="60%" stopColor="#03b5d3" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#00424e" stopOpacity={0.9} />
          </LinearGradient>

          <LinearGradient id="glassGlare" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.25} />
            <Stop offset="12%" stopColor="#ffffff" stopOpacity={0.05} />
            <Stop offset="85%" stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="100%" stopColor="#4cd7f6" stopOpacity={0.15} />
          </LinearGradient>
        </Defs>

        {/* Garrafa: contorno de fundo escuro */}
        <Path
          d="M45 22C45 15.3726 50.3726 10 57 10H103C109.627 10 115 15.3726 115 22L124 148C124.5 159 115.5 168 104.5 168H55.5C44.5 168 35.5 159 36 148L45 22Z"
          fill={colors.surfaceLow}
          stroke={colors.strokeCrisp}
          strokeWidth={1.5}
        />

        {/* Líquido com máscara clipPath */}
        <Rect
          x={35}
          y={newY}
          width={90}
          height={newHeight}
          fill="url(#liquidGrad)"
          clipPath="url(#vesselClip)"
        />

        {/* Linha de onda superior na superfície do líquido */}
        <Path
          d={`M35 ${newY + 1} Q 60 ${newY - 3}, 80 ${newY + 1} T 125 ${newY + 1}`}
          fill="none"
          stroke="#acedff"
          strokeWidth={2.5}
          opacity={0.9}
          clipPath="url(#vesselClip)"
        />

        {/* Bolhas decorativas */}
        <Circle cx={65} cy={Math.min(newY + 30, 140)} r={3} fill="#ffffff" opacity={0.35} />
        <Circle cx={85} cy={Math.min(newY + 50, 150)} r={2} fill="#ffffff" opacity={0.3} />
        <Circle cx={75} cy={Math.min(newY + 20, 130)} r={1.5} fill="#ffffff" opacity={0.4} />

        {/* Brilho do vidro translúcido */}
        <Path
          d="M47 24H113L121 146C121.5 155.5 114 164 104.5 164H55.5C46 164 38.5 155.5 39 146L47 24Z"
          fill="url(#glassGlare)"
        />

        {/* Marcadores de medição na borda */}
        <Path d="M108 60H116" stroke="#86948a" strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
        <Path d="M106 90H117" stroke="#4cd7f6" strokeWidth={2} opacity={0.8} strokeLinecap="round" />
        <Path d="M108 120H115" stroke="#86948a" strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
      </Svg>

      {/* Tag de Meta Ideal */}
      <View style={[styles.badgeTag, shadows.card]}>
        <View style={styles.badgeDot} />
        <Typography variant="unitCaption" color={colors.secondary} style={styles.badgeText}>
          {isPt ? 'IDEAL' : 'OPTIMAL'}
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 175,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  svg: {
    overflow: 'visible',
  },
  badgeTag: {
    position: 'absolute',
    top: 14,
    right: -4,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: `${colors.secondary}40`,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.secondary,
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
