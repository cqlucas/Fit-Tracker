import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows } from '@/theme/tokens';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface WaterVesselVisualProps {
  volume: number; // e.g. 500
  consumedToday?: number; // e.g. 1500
  waterGoal?: number; // e.g. 3000
  isPt?: boolean;
}

/**
 * Mapeia o volume (0 a 1000ml+) para a coordenada Y da superfície do líquido.
 * y = 155 (0ml, fundo)
 * y = 120 (250ml, marcação inferior)
 * y = 90  (500ml, marcação média ciano)
 * y = 60  (1000ml, marcação superior 1L)
 * y = 48  (>1000ml, topo máximo do bocal com efeito de brilho intenso)
 */
function calculateLiquidY(vol: number): number {
  if (vol <= 0) return 155;
  if (vol <= 250) {
    return 155 - (vol / 250) * (155 - 120);
  }
  if (vol <= 500) {
    return 120 - ((vol - 250) / 250) * (120 - 90);
  }
  if (vol <= 1000) {
    return 90 - ((vol - 500) / 500) * (90 - 60);
  }
  return 48; // Cheio até o bocal
}

export function WaterVesselVisual({
  volume,
  consumedToday = 0,
  waterGoal = 3000,
  isPt = false,
}: WaterVesselVisualProps) {
  const isOver1000 = volume > 1000;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Shared Values de Física e Animação Fluida (Reanimated 60fps)
  // ───────────────────────────────────────────────────────────────────────────
  const initialY = calculateLiquidY(volume);
  const liquidY = useSharedValue(initialY);
  const liquidHeight = useSharedValue(165 - initialY);

  // Oscilação contínua da crista da onda (Wave Slosh)
  const waveCrest = useSharedValue(-3.5);

  // Ciclo contínuo de subida das bolhas de água
  const bubble1Progress = useSharedValue(0.1);
  const bubble2Progress = useSharedValue(0.45);
  const bubble3Progress = useSharedValue(0.8);

  // Pulso do brilho intenso quando o volume passa de 1000ml
  const overfillPulse = useSharedValue(0);

  // Pulso da badge quando bate a meta diária
  const goalPulse = useSharedValue(1);

  // Atualiza altura do líquido com física suave de mola sempre que o volume muda
  useEffect(() => {
    const nextY = calculateLiquidY(volume);
    const nextHeight = 165 - nextY;

    liquidY.value = withSpring(nextY, {
      damping: 14,
      stiffness: 95,
      mass: 0.8,
    });
    liquidHeight.value = withSpring(nextHeight, {
      damping: 14,
      stiffness: 95,
      mass: 0.8,
    });
  }, [volume, liquidY, liquidHeight]);

  // Loops contínuos independentes de onda, bolhas e brilho
  useEffect(() => {
    // 1. Alternância contínua da crista da onda (slosh fluido)
    waveCrest.value = withRepeat(
      withTiming(3.5, {
        duration: 1700,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    // 2. Bolhas subindo ciclicamente do fundo até a superfície
    bubble1Progress.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
    bubble2Progress.value = withRepeat(
      withTiming(1, { duration: 2700, easing: Easing.linear }),
      -1,
      false,
    );
    bubble3Progress.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.linear }),
      -1,
      false,
    );
  }, [waveCrest, bubble1Progress, bubble2Progress, bubble3Progress]);

  // Efeito de brilho pulsante quando acima de 1000ml
  useEffect(() => {
    if (isOver1000) {
      overfillPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      overfillPulse.value = withTiming(0, { duration: 300 });
    }
  }, [isOver1000, overfillPulse]);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Lógica Dinâmica da Badge Flutuante (Significado Real)
  // ───────────────────────────────────────────────────────────────────────────
  const willHitGoal = waterGoal > 0 && consumedToday + volume >= waterGoal;

  // Pulso comemorativo da badge caso a meta seja atingida
  useEffect(() => {
    if (willHitGoal) {
      goalPulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      goalPulse.value = withTiming(1, { duration: 200 });
    }
  }, [willHitGoal, goalPulse]);

  const badgeConfig = useMemo(() => {
    if (willHitGoal) {
      return {
        label: isPt ? 'META BATIDA!' : 'GOAL HIT!',
        color: colors.primary,
        bgColor: `${colors.primary}20`,
        borderColor: `${colors.primary}60`,
        isGlowing: true,
      };
    }
    if (volume >= 250 && volume <= 600) {
      return {
        label: isPt ? 'DOSE IDEAL' : 'OPTIMAL DOSE',
        color: colors.secondary,
        bgColor: `${colors.secondary}18`,
        borderColor: `${colors.secondary}45`,
        isGlowing: false,
      };
    }
    if (volume < 250) {
      return {
        label: isPt ? 'GOLE RÁPIDO' : 'QUICK SIP',
        color: colors.onSurfaceVariant,
        bgColor: colors.surfaceHigh,
        borderColor: colors.strokeCrisp,
        isGlowing: false,
      };
    }
    return {
      label: isPt ? 'SUPER HIDRATAÇÃO' : 'HEAVY HYDRATION',
      color: colors.secondaryFixed,
      bgColor: `${colors.secondaryContainer}35`,
      borderColor: colors.secondary,
      isGlowing: false,
    };
  }, [willHitGoal, volume, isPt]);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Props Animadas do SVG (React Native Reanimated)
  // ───────────────────────────────────────────────────────────────────────────

  // Retângulo do Líquido
  const liquidRectProps = useAnimatedProps(() => {
    'worklet';
    return {
      y: liquidY.value,
      height: liquidHeight.value,
    };
  });

  // Linha de Onda Superior na Superfície
  const waveProps = useAnimatedProps(() => {
    'worklet';
    const y = liquidY.value;
    const crest = waveCrest.value;
    // Curva Quadratic Bezier com crista alternante e continuidade fluida
    return {
      d: `M30 ${y + 1} Q 55 ${y + crest}, 80 ${y + 1} T 130 ${y + 1}`,
    };
  });

  // Bolha 1 (cx=62, r=2.6)
  const bubble1Props = useAnimatedProps(() => {
    'worklet';
    const surface = liquidY.value;
    const distance = 152 - surface;
    if (distance < 14) {
      return { cy: 152, opacity: 0 };
    }
    const p = bubble1Progress.value;
    const cy = 152 - p * distance;
    let opacity = 0;
    if (p < 0.2) {
      opacity = (p / 0.2) * 0.55;
    } else if (p < 0.8) {
      opacity = 0.55;
    } else {
      opacity = 0.55 * (1 - (p - 0.8) / 0.2);
    }
    return { cy, opacity };
  });

  // Bolha 2 (cx=88, r=2.0)
  const bubble2Props = useAnimatedProps(() => {
    'worklet';
    const surface = liquidY.value;
    const distance = 152 - surface;
    if (distance < 14) {
      return { cy: 152, opacity: 0 };
    }
    const p = bubble2Progress.value;
    const cy = 152 - p * distance;
    let opacity = 0;
    if (p < 0.2) {
      opacity = (p / 0.2) * 0.5;
    } else if (p < 0.8) {
      opacity = 0.5;
    } else {
      opacity = 0.5 * (1 - (p - 0.8) / 0.2);
    }
    return { cy, opacity };
  });

  // Bolha 3 (cx=74, r=3.0)
  const bubble3Props = useAnimatedProps(() => {
    'worklet';
    const surface = liquidY.value;
    const distance = 152 - surface;
    if (distance < 14) {
      return { cy: 152, opacity: 0 };
    }
    const p = bubble3Progress.value;
    const cy = 152 - p * distance;
    let opacity = 0;
    if (p < 0.2) {
      opacity = (p / 0.2) * 0.6;
    } else if (p < 0.8) {
      opacity = 0.6;
    } else {
      opacity = 0.6 * (1 - (p - 0.8) / 0.2);
    }
    return { cy, opacity };
  });

  // Borda de Sobrecarga Brilhante (>1000ml)
  const overfillGlowProps = useAnimatedProps(() => {
    'worklet';
    return {
      opacity: overfillPulse.value * 0.85,
    };
  });

  // Estilo animado da badge
  const animatedBadgeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: goalPulse.value }],
    };
  });

  return (
    <View style={styles.container}>
      {/* SVG do Frasco com Nível Fluido, Marcações e Bolhas */}
      <Svg width={180} height={185} viewBox="0 0 180 185" style={styles.svg}>
        <Defs>
          {/* Cavidade Interna do Frasco para Recorte Perfeito */}
          <ClipPath id="vesselClip">
            <Path d="M47 24H113L121 146C121.5 155.5 114 164 104.5 164H55.5C46 164 38.5 155.5 39 146L47 24Z" />
          </ClipPath>

          {/* Gradiente do Líquido com Profundidade Aquática */}
          <LinearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#4cd7f6" stopOpacity={0.95} />
            <Stop offset="55%" stopColor="#03b5d3" stopOpacity={0.88} />
            <Stop offset="100%" stopColor="#00424e" stopOpacity={0.92} />
          </LinearGradient>

          {/* Reflexo Especular de Vidro Temperado */}
          <LinearGradient id="glassGlare" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.24} />
            <Stop offset="14%" stopColor="#ffffff" stopOpacity={0.06} />
            <Stop offset="82%" stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="100%" stopColor="#4cd7f6" stopOpacity={0.16} />
          </LinearGradient>
        </Defs>

        {/* 1. Estrutura Externa do Vidro */}
        <Path
          d="M45 22C45 15.3726 50.3726 10 57 10H103C109.627 10 115 15.3726 115 22L124 148C124.5 159 115.5 168 104.5 168H55.5C44.5 168 35.5 159 36 148L45 22Z"
          fill={colors.surfaceLow}
          stroke={colors.strokeCrisp}
          strokeWidth={1.5}
        />

        {/* 2. Líquido com Altura Animada via Reanimated */}
        <AnimatedRect
          x={35}
          width={90}
          fill="url(#liquidGrad)"
          clipPath="url(#vesselClip)"
          animatedProps={liquidRectProps}
        />

        {/* 3. Onda Superior Animada com Física de Slosh */}
        <AnimatedPath
          fill="none"
          stroke="#acedff"
          strokeWidth={2.4}
          opacity={0.9}
          clipPath="url(#vesselClip)"
          animatedProps={waveProps}
        />

        {/* 4. Bolhas de Água Animadas Subindo até a Superfície */}
        <AnimatedCircle
          cx={62}
          r={2.6}
          fill="#ffffff"
          clipPath="url(#vesselClip)"
          animatedProps={bubble1Props}
        />
        <AnimatedCircle
          cx={88}
          r={2.0}
          fill="#ffffff"
          clipPath="url(#vesselClip)"
          animatedProps={bubble2Props}
        />
        <AnimatedCircle
          cx={74}
          r={3.0}
          fill="#ffffff"
          clipPath="url(#vesselClip)"
          animatedProps={bubble3Props}
        />

        {/* 5. Reflexo Translúcido do Vidro */}
        <Path
          d="M47 24H113L121 146C121.5 155.5 114 164 104.5 164H55.5C46 164 38.5 155.5 39 146L47 24Z"
          fill="url(#glassGlare)"
        />

        {/* 6. Brilho Intenso de Sobrecarga quando > 1000ml */}
        <AnimatedPath
          d="M45 22C45 15.3726 50.3726 10 57 10H103C109.627 10 115 15.3726 115 22L124 148C124.5 159 115.5 168 104.5 168H55.5C44.5 168 35.5 159 36 148L45 22Z"
          fill="none"
          stroke="#4cd7f6"
          strokeWidth={3}
          animatedProps={overfillGlowProps}
        />

        {/* 7. Marcações do Vidro (Measurement Ticks) com Rótulos Reais */}
        {/* Marcação 1000ml (Topo) */}
        <Path
          d="M108 60H118"
          stroke={volume >= 1000 ? '#4cd7f6' : '#86948a'}
          strokeWidth={1.8}
          opacity={volume >= 1000 ? 0.95 : 0.55}
          strokeLinecap="round"
        />
        <SvgText
          x={124}
          y={63}
          fill={volume >= 1000 ? '#4cd7f6' : colors.onSurfaceVariant}
          fontSize={9}
          fontWeight={volume >= 1000 ? '800' : '600'}
          opacity={volume >= 1000 ? 1 : 0.8}>
          1000ml
        </SvgText>

        {/* Marcação 500ml (Meio - Destaque em Ciano) */}
        <Path
          d="M106 90H119"
          stroke="#4cd7f6"
          strokeWidth={2.2}
          opacity={volume >= 500 ? 1 : 0.75}
          strokeLinecap="round"
        />
        <SvgText
          x={124}
          y={93}
          fill="#4cd7f6"
          fontSize={9.5}
          fontWeight="800">
          500ml
        </SvgText>

        {/* Marcação 250ml (Base) */}
        <Path
          d="M108 120H117"
          stroke={volume >= 250 ? '#4cd7f6' : '#86948a'}
          strokeWidth={1.8}
          opacity={volume >= 250 ? 0.95 : 0.55}
          strokeLinecap="round"
        />
        <SvgText
          x={124}
          y={123}
          fill={volume >= 250 ? '#4cd7f6' : colors.onSurfaceVariant}
          fontSize={9}
          fontWeight={volume >= 250 ? '800' : '600'}
          opacity={volume >= 250 ? 1 : 0.8}>
          250ml
        </SvgText>
      </Svg>

      {/* 8. Badge Inteligente com Significado Real e Feedback Reativo */}
      <Animated.View
        style={[
          styles.badgeTag,
          shadows.card,
          {
            backgroundColor: badgeConfig.bgColor,
            borderColor: badgeConfig.borderColor,
          },
          animatedBadgeStyle,
        ]}>
        <View style={[styles.badgeDot, { backgroundColor: badgeConfig.color }]} />
        <Typography
          variant="unitCaption"
          color={badgeConfig.color}
          style={styles.badgeText}
          numberOfLines={1}>
          {badgeConfig.label}
        </Typography>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 185,
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
    top: 6,
    right: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
