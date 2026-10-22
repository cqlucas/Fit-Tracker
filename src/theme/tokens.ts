/**
 * Kinetic Dark Health — Design Tokens
 * Extraído das especificações do design.md e interface de referência.
 *
 * Utilizado em componentes React Native, gráficos SVG (react-native-svg),
 * canvas e navegação.
 */

export const colors = {
  // Foundation / Canvas
  background: '#10141a',
  surface: '#10141a',
  surfaceDim: '#10141a',
  surfaceBright: '#353940',

  // Surfaces estratificadas por elevação
  surfaceLowest: '#0a0e14', // Header / Floating TabBar backdrop
  surfaceLow: '#181c22', // Cards estruturais principais
  surfaceContainer: '#1c2026', // Trilha de progresso, pílulas secundárias
  surfaceHigh: '#262a31', // Badges, dia ativo, estados elevados
  surfaceHighest: '#31353c', // Trilhas de barra de progresso, bordas de chips

  // Tipografia & Ícones
  onSurface: '#dfe2eb', // Texto principal (alta ênfase)
  onSurfaceVariant: '#bbcabf', // Texto secundário / unidades / labels
  inverseSurface: '#dfe2eb',
  inverseOnSurface: '#2d3137',

  // Bordas estruturais
  outline: '#86948a',
  outlineVariant: '#3c4a42',
  strokeSubtle: '#21262d', // Divisores discretos
  strokeCrisp: '#30363d', // Borda padrão para delimitação nítida

  // Canal Primário: Proteína & Síntese Muscular (Emerald)
  primary: '#4edea3',
  primaryContainer: '#10b981',
  primaryFixed: '#6ffbbe',
  primaryFixedDim: '#4edea3',
  onPrimary: '#003824',
  onPrimaryContainer: '#00422b',
  onPrimaryFixed: '#002113',
  onPrimaryFixedVariant: '#005236',
  inversePrimary: '#006c49',

  // Canal Secundário: Hidratação / Água (Cyan)
  secondary: '#4cd7f6',
  secondaryContainer: '#03b5d3',
  secondaryFixed: '#acedff',
  secondaryFixedDim: '#4cd7f6',
  onSecondary: '#003640',
  onSecondaryContainer: '#00424e',
  onSecondaryFixed: '#001f26',

  // Canal Terciário: Energia / Calorias (Thermal Orange)
  tertiary: '#ffb690',
  tertiaryContainer: '#ff7e2d', // #F97316
  tertiaryFixed: '#ffdbca',
  tertiaryFixedDim: '#ffb690',
  onTertiary: '#552100',
  onTertiaryContainer: '#622700',

  // Erro / Alertas
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  onErrorContainer: '#ffdad6',
} as const;

export const spacing = {
  xs: 4, // 0.25rem - Gaps internos entre tags e números
  sm: 8, // 0.5rem - Distância entre rótulo e barra
  gutterMobile: 12, // 0.75rem - Gutter entre colunas de cards
  md: 16, // 1rem - Padding interno de cards / margin-mobile
  lg: 24, // 1.5rem - Padding de containers principais
  xl: 32, // 2rem - Separação vertical entre seções
  xxl: 40,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const typography = {
  displayHero: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800' as const,
    letterSpacing: -1.4,
  },
  displayHeroMobile: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -0.9,
  },
  headlineLg: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  headlineMd: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  headlineSm: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  metricNumeralLg: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  metricNumeralSm: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  bodyMd: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  labelMd: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
  unitCaption: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  glowPrimary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  glowSecondary: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  glowTertiary: {
    shadowColor: colors.tertiaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  tabBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  fab: {
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radii = typeof radii;
export type Typography = typeof typography;
