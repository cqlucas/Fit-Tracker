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
  history: {
    headerTitle: string;
    headerSubtitle: string;
    searchPlaceholder: string;
    allTypes: string;
    foodOnly: string;
    waterOnly: string;
    allDates: string;
    today: string;
    yesterday: string;
    waterTitle: string;
    proteinLabel: string;
    caloriesLabel: string;
    deleteTitle: string;
    deleteConfirm: string;
    cancel: string;
    delete: string;
    edit: string;
    editWaterTitle: string;
    editFoodTitle: string;
    saveChanges: string;
    changesSaved: string;
    emptyTitle: string;
    emptySubtitle: string;
    clearFilters: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
    totalEntries: (count: number) => string;
  };
  analytics: {
    headerTitle: string;
    headerSubtitle: string;
    period7d: string;
    period14d: string;
    period30d: string;
    avgProtein: string;
    avgWater: string;
    avgCalories: string;
    successRate: string;
    streak: string;
    daysStreak: (days: number) => string;
    aboveGoal: string;
    belowGoal: string;
    onGoal: string;
    dailyEvolution: string;
    protein: string;
    water: string;
    calories: string;
    goalLine: string;
    selectedDay: string;
    mealDistribution: string;
    mealDistributionSub: string;
    consistencyMap: string;
    consistencyMapSub: string;
    bothGoals: string;
    oneGoal: string;
    noGoal: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
    periodCustom: string;
    customDateRange: string;
    startDate: string;
    endDate: string;
    apply: string;
    invalidDate: string;
    singleDateHint: string;
    emptyTitle: string;
    emptySubtitle: string;
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
    history: {
      headerTitle: 'Histórico & Registros',
      headerSubtitle: 'TODOS OS DIAS E REFEIÇÕES',
      searchPlaceholder: 'Buscar por prato, refeição ou alimento...',
      allTypes: 'Todos',
      foodOnly: 'Comida',
      waterOnly: 'Água',
      allDates: 'Todas as datas',
      today: 'Hoje',
      yesterday: 'Ontem',
      waterTitle: 'Água Pura',
      proteinLabel: 'Proteína',
      caloriesLabel: 'Calorias',
      deleteTitle: 'Excluir registro',
      deleteConfirm: 'Deseja realmente remover este registro? O histórico e as metas serão recalculados.',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      editWaterTitle: 'Editar Registro de Água',
      editFoodTitle: 'Editar Refeição',
      saveChanges: 'Salvar Alterações',
      changesSaved: 'Alterações Salvas!',
      emptyTitle: 'Nenhum registro encontrado',
      emptySubtitle: 'Tente alterar os filtros de busca ou adicione um novo registro pelo botão +.',
      clearFilters: 'Limpar filtros',
      breakfast: 'Café da manhã',
      lunch: 'Almoço',
      dinner: 'Jantar',
      snack: 'Lanche',
      totalEntries: (count: number) => `${count} registro${count === 1 ? '' : 's'}`,
    },
    analytics: {
      headerTitle: 'Estatísticas & Evolução',
      headerSubtitle: 'MÉTRICAS METABÓLICAS',
      period7d: '7 Dias',
      period14d: '14 Dias',
      period30d: '30 Dias',
      avgProtein: 'Média Proteína/dia',
      avgWater: 'Média Água/dia',
      avgCalories: 'Média Calorias/dia',
      successRate: 'Taxa de Metas',
      streak: 'Sequência Atual',
      daysStreak: (days: number) => `${days} dia${days === 1 ? '' : 's'} seguidos`,
      aboveGoal: 'Acima da meta',
      belowGoal: 'Abaixo da meta',
      onGoal: 'Na meta',
      dailyEvolution: 'Evolução Diária',
      protein: 'Proteína',
      water: 'Água',
      calories: 'Calorias',
      goalLine: 'Meta Diária',
      selectedDay: 'Dia Selecionado',
      mealDistribution: 'Distribuição por Refeição',
      mealDistributionSub: 'Concentração de nutrientes por horário',
      consistencyMap: 'Mapa de Consistência',
      consistencyMapSub: 'Frequência de cumprimento de metas',
      bothGoals: 'Ambas as metas',
      oneGoal: 'Apenas 1 meta',
      noGoal: 'Nenhuma meta',
      breakfast: 'Café da manhã',
      lunch: 'Almoço',
      dinner: 'Jantar',
      snack: 'Lanches',
      periodCustom: 'Personalizado',
      customDateRange: 'Intervalo de Datas',
      startDate: 'Data Início',
      endDate: 'Data Fim',
      apply: 'Aplicar',
      invalidDate: 'Data inválida (use AAAA-MM-DD ou DD/MM/AAAA)',
      singleDateHint: 'Para consultar um único dia, informe a mesma data no início e no fim.',
      emptyTitle: 'Sem dados suficientes',
      emptySubtitle: 'Registre suas refeições e hidratação para acompanhar sua evolução.',
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
    history: {
      headerTitle: 'History & Logs',
      headerSubtitle: 'ALL DAYS & MEALS',
      searchPlaceholder: 'Search by meal, dish or ingredient...',
      allTypes: 'All',
      foodOnly: 'Food',
      waterOnly: 'Water',
      allDates: 'All dates',
      today: 'Today',
      yesterday: 'Yesterday',
      waterTitle: 'Pure Water',
      proteinLabel: 'Protein',
      caloriesLabel: 'Calories',
      deleteTitle: 'Delete record',
      deleteConfirm: 'Are you sure you want to delete this record? Totals will be updated immediately.',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      editWaterTitle: 'Edit Water Log',
      editFoodTitle: 'Edit Meal',
      saveChanges: 'Save Changes',
      changesSaved: 'Changes Saved!',
      emptyTitle: 'No logs found',
      emptySubtitle: 'Try adjusting your search filters or log an entry using the + button.',
      clearFilters: 'Clear filters',
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
      totalEntries: (count: number) => `${count} record${count === 1 ? '' : 's'}`,
    },
    analytics: {
      headerTitle: 'Analytics & Progress',
      headerSubtitle: 'METABOLIC METRICS',
      period7d: '7 Days',
      period14d: '14 Days',
      period30d: '30 Days',
      avgProtein: 'Avg Protein/day',
      avgWater: 'Avg Water/day',
      avgCalories: 'Avg Calories/day',
      successRate: 'Goal Hit Rate',
      streak: 'Current Streak',
      daysStreak: (days: number) => `${days} day${days === 1 ? '' : 's'} streak`,
      aboveGoal: 'Above goal',
      belowGoal: 'Below goal',
      onGoal: 'On goal',
      dailyEvolution: 'Daily Trend',
      protein: 'Protein',
      water: 'Water',
      calories: 'Calories',
      goalLine: 'Daily Target',
      selectedDay: 'Selected Day',
      mealDistribution: 'Meal Window Breakdown',
      mealDistributionSub: 'Nutrient density throughout the day',
      consistencyMap: 'Habit Consistency Map',
      consistencyMapSub: 'Daily goals accomplishment frequency',
      bothGoals: 'Both goals met',
      oneGoal: '1 goal met',
      noGoal: 'No goals met',
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snacks',
      periodCustom: 'Custom',
      customDateRange: 'Date Range',
      startDate: 'Start Date',
      endDate: 'End Date',
      apply: 'Apply',
      invalidDate: 'Invalid date (use YYYY-MM-DD or MM/DD/YYYY)',
      singleDateHint: 'For a single day, set both start and end to the same date.',
      emptyTitle: 'Insufficient data',
      emptySubtitle: 'Start logging your meals and hydration to view trends and charts.',
    },
  },
};

export type Translations = TranslationSchema;
