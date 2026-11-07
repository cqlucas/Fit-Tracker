import { Image } from 'expo-image';
import {
  Camera,
  Droplets,
  Pencil,
  Trash2,
  Utensils,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useNumberFormat } from '@/components/ui/Form';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { v2Translations } from '@/i18n/translations';
import { MealWindow } from '@/db/schema';
import { UnifiedLogItem } from '@/repositories/logs.repository';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface HistoryLogItemCardProps {
  item: UnifiedLogItem;
  onDelete: (id: string, type: 'water' | 'food') => void;
  onEdit?: (item: UnifiedLogItem) => void;
}

export function HistoryLogItemCard({
  item,
  onDelete,
  onEdit,
}: HistoryLogItemCardProps) {
  const { t, isPt, language } = useLanguage();
  const format = useNumberFormat();

  const formatTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getMealWindowLabel = (window: MealWindow): string => {
    switch (window) {
      case 'breakfast':
        return t.history.breakfast;
      case 'lunch':
        return t.history.lunch;
      case 'dinner':
        return t.history.dinner;
      case 'snack':
        return t.history.snack;
      default:
        return window;
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      t.history.deleteTitle,
      item.type === 'water' && item.foodLogId
        ? isPt
          ? 'A bebida está vinculada à refeição. Excluir remove o conjunto (nutrientes e volume).'
          : 'This drink is linked to a meal. Deleting removes both nutrients and volume.'
        : t.history.deleteConfirm,
      [
        {
          text: t.history.cancel,
          style: 'cancel',
        },
        {
          text: t.history.delete,
          style: 'destructive',
          onPress: () => onDelete(item.id, item.type),
        },
      ],
    );
  };

  const [imageError, setImageError] = useState(false);

  if (item.type === 'food') {
    const hasValidImage = Boolean(item.imageUri && !imageError);

    return (
      <Pressable
        onPress={() => onEdit?.(item)}
        style={({ pressed }) => [
          styles.card,
          onEdit && pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.leftRow}>
          {/* Thumbnail da Comida ou Ícone Fallback */}
          <View style={[styles.iconBox, styles.foodIconBox]}>
            {hasValidImage ? (
              <Image
                source={{ uri: item.imageUri! }}
                style={styles.foodThumbImage}
                contentFit="cover"
                transition={200}
                onError={() => setImageError(true)}
              />
            ) : item.entryMethod === 'image' ? (
              <Camera size={18} color={colors.primary} />
            ) : (
              <Utensils size={18} color={colors.primary} />
            )}
          </View>

          {/* Dados Textuais */}
          <View style={styles.detailsCol}>
            <Typography
              variant="labelMd"
              style={styles.itemTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Typography>

            <Typography variant="labelSm" color={colors.onSurfaceVariant}>
              {`${isPt ? 'Carb.' : 'Carbs'} ${format(item.carbG)} g · ${isPt ? 'Gord.' : 'Fat'} ${format(item.fatG)} g · ${isPt ? 'Fibras' : 'Fiber'} ${format(item.fiberG)} g`}
            </Typography>
            <Typography variant="labelSm" color={colors.onSurfaceVariant}>
              {`${v2Translations[language].sources[item.nutritionSource]}${item.isEstimate ? ' · ' + (isPt ? 'estimativa' : 'estimate') : ''}${item.portionAmount !== null ? ' · ' + format(item.portionAmount) + ' ' + item.portionUnit : ''}`}
            </Typography>
            <View style={styles.metaRow}>
              {/* Badge da Janela de Refeição */}
              <View style={styles.mealBadge}>
                <Typography
                  variant="unitCaption"
                  color={colors.primary}
                  style={styles.badgeText}
                >
                  {getMealWindowLabel(item.mealWindow).toUpperCase()}
                </Typography>
              </View>

              <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                {formatTime(item.occurredAt)}
              </Typography>
            </View>
          </View>
        </View>

        {/* Lado Direito: Macros e Ações */}
        <View style={styles.rightGroup}>
          <View style={styles.macrosCol}>
            <View style={styles.macroPill}>
              <Typography
                variant="metricNumeralSm"
                color={colors.primary}
                style={styles.macroValue}
              >
                {format(item.proteinG)}g
              </Typography>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                {isPt ? 'prot' : 'pro'}
              </Typography>
            </View>

            <View style={styles.macroPill}>
              <Typography
                variant="labelSm"
                color={colors.tertiary}
                style={styles.calorieValue}
              >
                {format(item.caloriesKcal)}
              </Typography>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                kcal
              </Typography>
            </View>
          </View>

          {/* Ações: Editar e Excluir */}
          <View style={styles.actionButtonsRow}>
            {onEdit && (
              <Pressable
                onPress={() => onEdit(item)}
                accessibilityRole="button"
                accessibilityLabel={t.history.edit}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Pencil size={15} color={colors.onSurfaceVariant} />
              </Pressable>
            )}

            <Pressable
              onPress={handleDeletePress}
              accessibilityRole="button"
              accessibilityLabel={t.history.delete}
              hitSlop={6}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
              ]}
            >
              <Trash2 size={15} color={colors.error || '#ffb4ab'} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }

  // Card de Água
  return (
    <Pressable
      onPress={() => onEdit?.(item)}
      style={({ pressed }) => [
        styles.card,
        onEdit && pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.leftRow}>
        {/* Ícone de Água */}
        <View style={[styles.iconBox, styles.waterIconBox]}>
          <Droplets size={18} color={colors.secondary} />
        </View>

        {/* Dados Textuais */}
        <View style={styles.detailsCol}>
          <Typography
            variant="labelMd"
            style={styles.itemTitle}
            numberOfLines={1}
          >
            {t.history.waterTitle}
          </Typography>

          <View style={styles.metaRow}>
            <View style={styles.waterBadge}>
              <Typography
                variant="unitCaption"
                color={colors.secondary}
                style={styles.badgeText}
              >
                H2O
              </Typography>
            </View>

            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              {formatTime(item.occurredAt)}
            </Typography>
          </View>
        </View>
      </View>

      {/* Lado Direito: Volume e Ações */}
      <View style={styles.rightGroup}>
        <View style={styles.waterAmountBox}>
          <Typography
            variant="metricNumeralSm"
            color={colors.secondary}
            style={styles.waterNumber}
          >
            +{item.amountMl}
          </Typography>
          <Typography variant="unitCaption" color={colors.secondaryFixedDim}>
            ml
          </Typography>
        </View>

        {/* Ações: Editar e Excluir */}
        <View style={styles.actionButtonsRow}>
          {onEdit && (
            <Pressable
              onPress={() => onEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={t.history.edit}
              hitSlop={6}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
              ]}
            >
              <Pencil size={15} color={colors.onSurfaceVariant} />
            </Pressable>
          )}

          <Pressable
            onPress={handleDeletePress}
            accessibilityRole="button"
            accessibilityLabel={t.history.delete}
            hitSlop={6}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.pressed,
            ]}
          >
            <Trash2 size={15} color={colors.error || '#ffb4ab'} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    ...shadows.card,
  },
  cardPressed: {
    borderColor: colors.strokeCrisp,
    opacity: 0.9,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  foodIconBox: {
    backgroundColor: `${colors.primary}16`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    overflow: 'hidden',
  },
  foodThumbImage: {
    width: '100%',
    height: '100%',
  },
  waterIconBox: {
    backgroundColor: `${colors.secondary}16`,
    borderWidth: 1,
    borderColor: `${colors.secondary}30`,
  },
  detailsCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  itemTitle: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.sm,
  },
  waterBadge: {
    backgroundColor: `${colors.secondary}18`,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  macrosCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroValue: {
    fontWeight: '800',
  },
  calorieValue: {
    fontWeight: '700',
  },
  waterAmountBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  waterNumber: {
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 4,
  },
  actionBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.92 }],
  },
});
