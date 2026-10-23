import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, spacing } from '@/theme/tokens';
import {
  addDays,
  formatDateTimeFriendly,
  fromDateKey,
  toDateKey,
} from '@/utils/date';

export interface OptionalDateTimePickerProps {
  /** Data/horário selecionado ou null se for o modo padrão "Agora" (automático) */
  value: Date | null;
  /** Disparado ao selecionar nova data/hora ou resetar para null */
  onChange: (value: Date | null) => void;
  /** Idioma explícito opcional (se omitido, consome useLanguage) */
  isPt?: boolean;
  /** Indica se está sendo renderizado no modo de edição */
  isEditMode?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function OptionalDateTimePicker({
  value,
  onChange,
  isPt: isPtProp,
  isEditMode = false,
}: OptionalDateTimePickerProps) {
  const insets = useSafeAreaInsets();
  const { isPt: contextIsPt } = useLanguage();
  const isPt = isPtProp ?? contextIsPt;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const daysScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  // Garante que ao abrir o modal o scroll horizontal vá para a extrema direita (Hoje)
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        daysScrollRef.current?.scrollToEnd({ animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // Abre o modal sincronizando o estado temporário
  const handleOpenModal = () => {
    setTempDate(value ? new Date(value) : new Date());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleConfirm = () => {
    onChange(new Date(tempDate));
    setIsModalOpen(false);
  };

  const handleResetToNow = () => {
    onChange(null);
    setIsModalOpen(false);
  };

  // Ajuste de horas e minutos
  const adjustHours = (delta: number) => {
    setTempDate((prev) => {
      const next = new Date(prev);
      let nextH = next.getHours() + delta;
      if (nextH > 23) nextH = 0;
      if (nextH < 0) nextH = 23;
      next.setHours(nextH);
      return next;
    });
  };

  const adjustMinutes = (delta: number) => {
    setTempDate((prev) => {
      const next = new Date(prev);
      let nextM = next.getMinutes() + delta;
      if (nextM > 59) nextM = 0;
      if (nextM < 0) nextM = 55;
      next.setMinutes(nextM);
      return next;
    });
  };

  // Ajuste de dias
  const shiftDay = (days: number) => {
    setTempDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const selectSpecificDateKey = (dateKey: string) => {
    setTempDate((prev) => {
      const target = fromDateKey(dateKey);
      target.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      return target;
    });
  };

  const setSpecificTime = (hours: number, minutes: number) => {
    setTempDate((prev) => {
      const next = new Date(prev);
      next.setHours(hours, minutes, 0, 0);
      return next;
    });
  };

  const setTimeToCurrent = () => {
    const now = new Date();
    setSpecificTime(now.getHours(), now.getMinutes());
  };

  // Dias recentes para seleção rápida: do passado (esquerda) até Hoje (extrema direita)
  const recentDays = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const weekdaysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return Array.from({ length: 8 }, (_, i) => {
      const daysAgo = 7 - i; // 7, 6, 5, 4, 3, 2, 1, 0 (Hoje fica no final, extrema direita)
      const key = addDays(todayKey, -daysAgo);
      const dateObj = fromDateKey(key);
      const isTodayKey = daysAgo === 0;
      const isYesterdayKey = daysAgo === 1;

      let label = isTodayKey
        ? isPt
          ? 'Hoje'
          : 'Today'
        : isYesterdayKey
        ? isPt
          ? 'Ontem'
          : 'Yesterday'
        : (isPt ? weekdaysPt : weekdaysEn)[dateObj.getDay()];

      return {
        key,
        label,
        dayNum: dateObj.getDate(),
      };
    });
  }, [isPt]);

  const isCustomTimeActive = value !== null;
  const tempDateKey = toDateKey(tempDate);

  const displayTimeTitle = useMemo(() => {
    if (!value) {
      return isPt ? 'Agora (Data e hora atuais)' : 'Now (Current date & time)';
    }
    return formatDateTimeFriendly(value, isPt);
  }, [value, isPt]);

  const displaySubtitle = useMemo(() => {
    if (!value) {
      return isPt ? 'Horário de consumo automático' : 'Automatic intake timestamp';
    }
    return isPt ? 'Horário personalizado definido' : 'Custom timestamp active';
  }, [value, isPt]);

  return (
    <>
      {/* ── CARD PRINCIPAL COLAPSADO / INLINE ── */}
      <View
        style={[
          styles.cardContainer,
          isCustomTimeActive && styles.cardContainerActive,
        ]}>
        <TouchableOpacity
          style={styles.cardMainTouch}
          onPress={handleOpenModal}
          activeOpacity={0.75}>
          {/* Ícone de Relógio/Calendário */}
          <View
            style={[
              styles.iconWrapper,
              isCustomTimeActive && styles.iconWrapperActive,
            ]}>
            {isCustomTimeActive ? (
              <Calendar size={18} color={colors.secondary} />
            ) : (
              <Clock size={18} color={colors.onSurfaceVariant} />
            )}
          </View>

          {/* Textos informativos */}
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.titleText,
                isCustomTimeActive && styles.titleTextActive,
              ]}
              numberOfLines={1}>
              {displayTimeTitle}
            </Text>
            <Text style={styles.subtitleText} numberOfLines={1}>
              {displaySubtitle}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Ações à direita */}
        <View style={styles.rightActionsRow}>
          {isCustomTimeActive && (
            <TouchableOpacity
              style={styles.resetQuickBtn}
              onPress={() => onChange(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <RotateCcw size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.resetQuickText}>
                {isPt ? 'Agora' : 'Now'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.changeBtn,
              isCustomTimeActive && styles.changeBtnActive,
            ]}
            onPress={handleOpenModal}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.changeBtnText,
                isCustomTimeActive && styles.changeBtnTextActive,
              ]}>
              {isCustomTimeActive
                ? isPt
                  ? 'Editar'
                  : 'Edit'
                : isPt
                ? 'Alterar'
                : 'Change'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MODAL ELEGANTE DE SELEÇÃO DE DATA E HORÁRIO ── */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={handleCloseModal} />

          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom + spacing.md, spacing.xl) },
            ]}>
            {/* Handle visual decorativo */}
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Cabeçalho do Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={styles.modalHeaderIconBadge}>
                  <Clock size={18} color={colors.secondary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {isPt ? 'Data e Horário do Registro' : 'Log Date & Time'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {isPt
                      ? 'Defina quando a ingestão ocorreu para histórico exato'
                      : 'Set when this intake occurred for accurate history'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={handleCloseModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}>
              {/* ── SEÇÃO 1: DATA DA INGESTÃO ── */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {isPt ? '1. DATA DA REFEIÇÃO / CONSUMO' : '1. INTAKE DATE'}
                  </Text>
                  <View style={styles.dayNavGroup}>
                    <TouchableOpacity
                      style={styles.dayNavBtn}
                      onPress={() => shiftDay(-1)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <ChevronLeft size={16} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dayNavBtn}
                      onPress={() => shiftDay(1)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <ChevronRight size={16} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Carrossel horizontal de dias recentes: scrollado para o final (Hoje à direita) */}
                <ScrollView
                  ref={daysScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.daysScrollContent}
                  onContentSizeChange={() => {
                    daysScrollRef.current?.scrollToEnd({ animated: false });
                  }}>
                  {recentDays.map((item) => {
                    const isSelected = item.key === tempDateKey;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.dayPill,
                          isSelected && styles.dayPillSelected,
                        ]}
                        onPress={() => selectSpecificDateKey(item.key)}
                        activeOpacity={0.75}>
                        <Text
                          style={[
                            styles.dayPillLabel,
                            isSelected && styles.dayPillLabelSelected,
                          ]}>
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.dayPillNum,
                            isSelected && styles.dayPillNumSelected,
                          ]}>
                          {item.dayNum}
                        </Text>
                        {isSelected && (
                          <View style={styles.dayPillDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── SEÇÃO 2: HORÁRIO DA INGESTÃO ── */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {isPt ? '2. HORÁRIO' : '2. TIME'}
                  </Text>
                  <TouchableOpacity
                    style={styles.nowBadgeBtn}
                    onPress={setTimeToCurrent}
                    activeOpacity={0.7}>
                    <Text style={styles.nowBadgeText}>
                      {isPt ? 'Usar Hora Atual' : 'Use Current Time'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Relógio Digital com Steppers de Hora e Minuto */}
                <View style={styles.timeSelectorRow}>
                  {/* Bloco de Horas */}
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeBlockLabel}>
                      {isPt ? 'HORA' : 'HOUR'}
                    </Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustHours(-1)}
                        activeOpacity={0.6}>
                        <Minus size={18} color={colors.onSurface} />
                      </TouchableOpacity>

                      <View style={styles.timeDisplayBox}>
                        <Text style={styles.timeDigits}>
                          {pad(tempDate.getHours())}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustHours(1)}
                        activeOpacity={0.6}>
                        <Plus size={18} color={colors.onSurface} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.timeColon}>:</Text>

                  {/* Bloco de Minutos */}
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeBlockLabel}>
                      {isPt ? 'MINUTO' : 'MINUTE'}
                    </Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustMinutes(-5)}
                        activeOpacity={0.6}>
                        <Minus size={18} color={colors.onSurface} />
                      </TouchableOpacity>

                      <View style={styles.timeDisplayBox}>
                        <Text style={styles.timeDigits}>
                          {pad(tempDate.getMinutes())}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustMinutes(5)}
                        activeOpacity={0.6}>
                        <Plus size={18} color={colors.onSurface} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Presets Rápidos de Refeição */}
                <View style={styles.timePresetsRow}>
                  <TouchableOpacity
                    style={styles.timePresetChip}
                    onPress={() => setSpecificTime(8, 0)}>
                    <Text style={styles.timePresetText}>08:00</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.timePresetChip}
                    onPress={() => setSpecificTime(12, 30)}>
                    <Text style={styles.timePresetText}>12:30</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.timePresetChip}
                    onPress={() => setSpecificTime(16, 0)}>
                    <Text style={styles.timePresetText}>16:00</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.timePresetChip}
                    onPress={() => setSpecificTime(20, 0)}>
                    <Text style={styles.timePresetText}>20:00</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Preview Resumo do que será salvo */}
              <View style={styles.previewBox}>
                <Clock size={16} color={colors.secondary} />
                <Text style={styles.previewText}>
                  {formatDateTimeFriendly(tempDate, isPt)}
                </Text>
              </View>
            </ScrollView>

            {/* Rodapé com botões de Ação */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetFooterBtn}
                onPress={handleResetToNow}
                activeOpacity={0.7}>
                <RotateCcw size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.resetFooterBtnText}>
                  {isPt ? 'Resetar para Agora' : 'Reset to Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmFooterBtn}
                onPress={handleConfirm}
                activeOpacity={0.85}>
                <Check size={18} color={colors.onPrimary} />
                <Text style={styles.confirmFooterBtnText}>
                  {isPt ? 'Confirmar Horário' : 'Apply Time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* Container do Card Inline */
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  cardContainerActive: {
    borderColor: colors.secondaryContainer,
    backgroundColor: '#0c1a24',
  },
  cardMainTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#0d2838',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  titleTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  subtitleText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resetQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  resetQuickText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  changeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  changeBtnActive: {
    backgroundColor: colors.secondary,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  changeBtnTextActive: {
    color: colors.onSecondary,
  },

  /* Backdrop do Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 12, 0.78)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceLow,
    borderTopLeftRadius: radii['3xl'],
    borderTopRightRadius: radii['3xl'],
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.strokeCrisp,
    maxHeight: '85%',
    paddingBottom: spacing.lg,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHighest,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.strokeSubtle,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: '#0d2838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Conteúdo do Scroll */
  sheetScroll: {
    maxHeight: 460,
  },
  sheetScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.onSurfaceVariant,
  },
  dayNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayNavBtn: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysScrollContent: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  dayPill: {
    width: 58,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayPillSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondaryFixed,
  },
  dayPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  dayPillLabelSelected: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  dayPillNum: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
    marginTop: 2,
  },
  dayPillNumSelected: {
    color: colors.onSecondary,
  },
  dayPillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.onSecondary,
    marginTop: 4,
  },

  /* Time Section */
  nowBadgeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  nowBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  timeBlock: {
    alignItems: 'center',
    gap: 4,
  },
  timeBlockLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperBtn: {
    width: 36,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  timeDisplayBox: {
    width: 64,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  timeDigits: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: 1,
  },
  timeColon: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    marginTop: 18,
  },
  timePresetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  timePresetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },

  /* Preview */
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: '#0a151d',
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },

  /* Footer */
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  resetFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  resetFooterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  confirmFooterBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
  },
  confirmFooterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
