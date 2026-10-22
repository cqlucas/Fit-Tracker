export type AppLanguage = 'pt' | 'en';

export interface TranslationSchema {
  tabs: {
    today: string;
    history: string;
    log: string;
    analytics: string;
    settings: string;
  };
  home: {
    todayBadge: string;
    streakActive: (days: number) => string;
    adjustTarget: string;
    notifications: string;
    protein: string;
    hydration: string;
    left: string;
    goal: string;
    caloriesTitle: string;
    caloriesSubtitle: string;
    kcalLeft: string;
    kcalConsumed: string;
    goalCalories: (val: string) => string;
    quickLogCTA: string;
    weeklyTitle: string;
    last7Days: string;
    proteinGoalTitle: string;
    proteinGoalSubtitle: (val: number) => string;
    hydrationTitle: string;
    hydrationSubtitle: string;
    hitBadge: string;
    avgProtein: (val: number) => string;
    avgWater: (val: string) => string;
    recentLog: string;
    recentPostWorkout: string;
    todayPrefix: string;
  };
  settings: {
    headerTitle: string;
    headerSubtitle: string;
    reset: string;
    intro: string;
    proteinTagline: string;
    proteinTitle: string;
    gramsPerDay: string;
    ratioCal: string;
    proteinTip: string;
    waterTagline: string;
    waterTitle: string;
    mlPerDay: string;
    sportsBottles: string;
    waterTip: (glasses: number, bottles: string) => string;
    calorieTagline: string;
    calorieTitle: string;
    comingSoon: string;
    kcalPerDay: string;
    baseMode: string;
    maintenance: string;
    deficit: string;
    surplus: string;
    calorieTip: string;
    languageTitle: string;
    languageSubtitle: string;
    portuguese: string;
    english: string;
    remindersTitle: string;
    remindersSubtitle: string;
    syncStatus: string;
    readyToCommit: string;
    saveButton: string;
    savedButton: string;
    saveFooter: string;
    invalidProtein: string;
    invalidWater: string;
    invalidTitle: string;
    errorTitle: string;
    errorMessage: string;
  };
}

export const translations: Record<AppLanguage, TranslationSchema> = {
  pt: {
    tabs: {
      today: 'Hoje',
      history: 'Histórico',
      log: 'Registrar',
      analytics: 'Evolução',
      settings: 'Ajustes',
    },
    home: {
      todayBadge: 'HOJE',
      streakActive: (days: number) => `Janela metabólica ativa • ${days}º dia seguido`,
      adjustTarget: 'Ajustar Meta',
      notifications: 'Notificações',
      protein: 'Proteína',
      hydration: 'Hidratação',
      left: 'RESTANTE',
      goal: 'Meta',
      caloriesTitle: 'Energia Ativa & Calorias',
      caloriesSubtitle: 'META DE DÉFICIT DINÂMICA',
      kcalLeft: 'kcal restantes',
      kcalConsumed: 'kcal consumidas',
      goalCalories: (val: string) => `Meta: ${val} kcal`,
      quickLogCTA: '+ Registrar Refeição, Shake ou Água',
      weeklyTitle: 'Consistência Semanal',
      last7Days: 'Últimos 7 Dias',
      proteinGoalTitle: 'Meta de Proteína',
      proteinGoalSubtitle: (val: number) => `Mínimo diário de ${val}g`,
      hydrationTitle: 'Sequência de Hidratação',
      hydrationSubtitle: 'Consistência diária',
      hitBadge: 'Batidos',
      avgProtein: (val: number) => `Média: ${val}g/d`,
      avgWater: (val: string) => `Média: ${val}L/d`,
      recentLog: 'Registro recente',
      recentPostWorkout: 'Almoço • Bowl Pós-Treino',
      todayPrefix: 'Hoje',
    },
    settings: {
      headerTitle: 'Metas & Alvos Diários',
      headerSubtitle: 'Metabolic Telemetry v2.4',
      reset: 'Padrão',
      intro:
        'Configure seus parâmetros diários. Os anéis de progresso e métricas recalibram instantaneamente em todo o app.',
      proteinTagline: 'SÍNTESE & ANABOLISMO',
      proteinTitle: 'Meta Diária de Proteína',
      gramsPerDay: 'GRAMAS / DIA',
      ratioCal: 'CALORIAS EQUIV.',
      proteinTip:
        'Recomendado: 1.6g a 2.2g por kg de peso corporal para máxima eficiência de síntese muscular.',
      waterTagline: 'FLUIDEZ & HIDRATAÇÃO',
      waterTitle: 'Meta Diária de Água',
      mlPerDay: 'ML / DIA',
      sportsBottles: 'GARRAFAS (750ML)',
      waterTip: (glasses: number, bottles: string) =>
        `Equivalente a aproximadamente ${glasses} copos de 250ml ou ${bottles} caramanholas esportivas.`,
      calorieTagline: 'ORÇAMENTO ENERGÉTICO',
      calorieTitle: 'Meta Calórica Diária',
      comingSoon: 'Em breve',
      kcalPerDay: 'KCAL / DIA',
      baseMode: 'MODO BASE',
      maintenance: 'Manutenção',
      deficit: 'Déficit (-400)',
      surplus: 'Superávit (+400)',
      calorieTip:
        'O motor de periodização calórica inteligente está em desenvolvimento e será liberado na próxima versão.',
      languageTitle: 'Idioma do Aplicativo',
      languageSubtitle: 'Interface local e unidades de telemetria',
      portuguese: '🇧🇷 Português (BR)',
      english: '🇺🇸 English (US)',
      remindersTitle: 'Lembretes Inteligentes de Hidratação',
      remindersSubtitle: 'Intervalos dinâmicos sincronizados com o dia',
      syncStatus: 'Status do SQLite Local',
      readyToCommit: 'PRONTO PARA SALVAR',
      saveButton: 'Salvar Metas Diárias',
      savedButton: 'Metas Sincronizadas!',
      saveFooter: 'As alterações recalculam instantaneamente os gráficos de rosca e o progresso.',
      invalidProtein: 'Por favor, insira uma meta válida de proteína (maior que 0g).',
      invalidWater: 'Por favor, insira uma meta válida de água (maior que 0ml).',
      invalidTitle: 'Valor Inválido',
      errorTitle: 'Erro ao Salvar',
      errorMessage: 'Não foi possível persistir as metas no banco local.',
    },
  },
  en: {
    tabs: {
      today: 'Today',
      history: 'History',
      log: 'Log',
      analytics: 'Analytics',
      settings: 'Settings',
    },
    home: {
      todayBadge: 'TODAY',
      streakActive: (days: number) => `Metabolic window active • Day ${days} Streak`,
      adjustTarget: 'Adjust Target',
      notifications: 'Notifications',
      protein: 'Protein',
      hydration: 'Hydration',
      left: 'LEFT',
      goal: 'Goal',
      caloriesTitle: 'Active Energy & Calories',
      caloriesSubtitle: 'DYNAMIC DEFICIT TARGET',
      kcalLeft: 'kcal left',
      kcalConsumed: 'kcal consumed',
      goalCalories: (val: string) => `Goal: ${val} kcal`,
      quickLogCTA: '+ Log Food, Shake or Water',
      weeklyTitle: 'Weekly Consistency',
      last7Days: 'Last 7 Days',
      proteinGoalTitle: 'Protein Target',
      proteinGoalSubtitle: (val: number) => `Min daily threshold ${val}g`,
      hydrationTitle: 'Hydration Streak',
      hydrationSubtitle: 'Active streak',
      hitBadge: 'Hit',
      avgProtein: (val: number) => `Avg. ${val}g/d`,
      avgWater: (val: string) => `Avg. ${val}L/d`,
      recentLog: 'Recent Log',
      recentPostWorkout: 'Lunch • Post-Workout Bowl',
      todayPrefix: 'Today',
    },
    settings: {
      headerTitle: 'Daily Goals & Targets',
      headerSubtitle: 'Metabolic Telemetry v2.4',
      reset: 'Reset',
      intro:
        'Configure your daily nutritional baselines. Progress rings and telemetry re-calibrate automatically across the app.',
      proteinTagline: 'ANABOLIC THRESHOLD',
      proteinTitle: 'Daily Protein Target',
      gramsPerDay: 'GRAMS / DAY',
      ratioCal: 'RATIO CAL',
      proteinTip:
        'Recommended: 1.6g – 2.2g per kg body weight for high-efficiency muscle protein synthesis.',
      waterTagline: 'CELLULAR FLUIDITY',
      waterTitle: 'Daily Hydration Target',
      mlPerDay: 'ML / DAY',
      sportsBottles: 'SPORTS BOTTLES',
      waterTip: (glasses: number, bottles: string) =>
        `Equivalent to ~${glasses} standard 250ml glasses or ~${bottles} pro cycling bottles.`,
      calorieTagline: 'METABOLIC BUDGET',
      calorieTitle: 'Daily Calorie Target',
      comingSoon: 'Coming soon',
      kcalPerDay: 'KCAL / DAY',
      baseMode: 'CURRENT MODE',
      maintenance: 'Maintenance',
      deficit: 'Deficit (-400)',
      surplus: 'Surplus (+400)',
      calorieTip:
        'Dynamic caloric budget and smart periodization will be enabled in the upcoming release.',
      languageTitle: 'App Language',
      languageSubtitle: 'Local interface & telemetry units',
      portuguese: '🇧🇷 Português (BR)',
      english: '🇺🇸 English (US)',
      remindersTitle: 'Smart Hydration Reminders',
      remindersSubtitle: 'Dynamic intervals synced with activity & climate',
      syncStatus: 'Telemetry Sync Status',
      readyToCommit: 'READY TO COMMIT',
      saveButton: 'Save Daily Goals',
      savedButton: 'Goals Synchronized!',
      saveFooter: 'Changes reflect instantly across widgets, companions, and ring charts.',
      invalidProtein: 'Please enter a valid protein target (greater than 0g).',
      invalidWater: 'Please enter a valid water target (greater than 0ml).',
      invalidTitle: 'Invalid Value',
      errorTitle: 'Error Saving',
      errorMessage: 'Could not persist goals to local database.',
    },
  },
};

export type Translations = TranslationSchema;
