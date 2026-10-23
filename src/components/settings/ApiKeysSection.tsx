import {
  Check,
  ExternalLink,
  Key,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  apiKeysService,
  type AiProvider,
  type ApiKeysStatus,
} from '@/services/api-keys.service';
import { colors, radii, spacing } from '@/theme/tokens';

export interface ApiKeysSectionProps {
  isPt?: boolean;
  onKeysChanged?: (status: ApiKeysStatus) => void;
}

export function ApiKeysSection({
  isPt = true,
  onKeysChanged,
}: ApiKeysSectionProps) {
  const [status, setStatus] = useState<ApiKeysStatus>({
    hasGeminiKey: false,
    hasGroqKey: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Estados de edição de cada provedor
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiKeysService
      .getApiKeysStatus()
      .then((current) => {
        if (isMounted) {
          setStatus(current);
          onKeysChanged?.(current);
        }
      })
      .catch((err) => {
        if (__DEV__) console.warn('[ApiKeysSection] Erro ao carregar status:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onKeysChanged]);

  const handleOpenInput = (provider: AiProvider) => {
    setEditingProvider(provider);
    setInputKey('');
  };

  const handleCancelInput = () => {
    setEditingProvider(null);
    setInputKey('');
  };

  const handleSaveKey = async (provider: AiProvider) => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      Alert.alert(
        isPt ? 'Chave Vazia' : 'Empty Key',
        isPt
          ? 'Por favor, cole uma chave de API válida para vincular.'
          : 'Please paste a valid API key to link.'
      );
      return;
    }

    setIsSaving(true);
    try {
      await apiKeysService.saveApiKey(provider, trimmed);
      const newStatus = await apiKeysService.getApiKeysStatus();
      setStatus(newStatus);
      onKeysChanged?.(newStatus);
      setEditingProvider(null);
      setInputKey('');

      Alert.alert(
        isPt ? 'Chave Vinculada' : 'Key Linked',
        isPt
          ? `Sua chave da ${provider === 'gemini' ? 'Google Gemini' : 'Groq Cloud'} foi salva com criptografia segura no seu aparelho.`
          : `Your ${provider === 'gemini' ? 'Google Gemini' : 'Groq Cloud'} key has been securely encrypted on your device.`
      );
    } catch (err: any) {
      console.error('[ApiKeysSection] Erro ao salvar chave:', err);
      Alert.alert(
        isPt ? 'Erro ao Salvar' : 'Error Saving',
        err?.message || (isPt ? 'Falha ao salvar chave.' : 'Failed to save key.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlinkKey = (provider: AiProvider) => {
    const providerName = provider === 'gemini' ? 'Google Gemini' : 'Groq Cloud';
    Alert.alert(
      isPt ? `Desvincular ${providerName}?` : `Unlink ${providerName}?`,
      isPt
        ? 'A chave será apagada do cofre seguro deste dispositivo. Você precisará vinculá-la novamente para usar este provedor.'
        : 'The key will be erased from this device vault. You will need to link it again to use this provider.',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Desvincular' : 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiKeysService.unlinkApiKey(provider);
              const newStatus = await apiKeysService.getApiKeysStatus();
              setStatus(newStatus);
              onKeysChanged?.(newStatus);
            } catch (err: any) {
              console.error('[ApiKeysSection] Erro ao desvincular:', err);
            }
          },
        },
      ]
    );
  };

  const openProviderDoc = (provider: AiProvider) => {
    const url =
      provider === 'gemini'
        ? 'https://aistudio.google.com/app/apikey'
        : 'https://console.groq.com/keys';
    Linking.openURL(url).catch(() => {});
  };

  const renderProviderCard = (
    provider: AiProvider,
    name: string,
    hasKey: boolean,
    icon: React.ReactNode,
    badgeText: string,
    description: string,
    placeholder: string
  ) => {
    const isEditing = editingProvider === provider;

    return (
      <View style={styles.providerCard}>
        {/* Cabeçalho do Card */}
        <View style={styles.providerHeader}>
          <View style={styles.providerInfoRow}>
            <View style={styles.providerIconBox}>{icon}</View>
            <View style={styles.providerTextGroup}>
              <View style={styles.providerTitleRow}>
                <Typography variant="labelMd" style={styles.providerName}>
                  {name}
                </Typography>
                <View style={styles.providerTag}>
                  <Text style={styles.providerTagText}>{badgeText}</Text>
                </View>
              </View>
              <Typography
                variant="bodyMd"
                color={colors.onSurfaceVariant}
                style={styles.providerDesc}>
                {description}
              </Typography>
            </View>
          </View>
        </View>

        {/* Estado 1: Chave Vinculada (WRITE-ONLY: NUNCA EXIBE O VALOR REAL) */}
        {hasKey && !isEditing && (
          <View style={styles.linkedStateRow}>
            <View style={styles.linkedBadge}>
              <Check size={14} color={colors.primary} />
              <Text style={styles.linkedBadgeText}>
                {isPt ? 'Vinculada ••••••••••••' : 'Linked ••••••••••••'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.unlinkBtn}
              onPress={() => handleUnlinkKey(provider)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={14} color={colors.error} />
              <Text style={styles.unlinkBtnText}>
                {isPt ? 'Desvincular' : 'Unlink'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Estado 2: Chave Não Vinculada (Botão para abrir input) */}
        {!hasKey && !isEditing && (
          <View style={styles.unlinkedActionsRow}>
            <TouchableOpacity
              style={styles.linkActionBtn}
              onPress={() => handleOpenInput(provider)}
              activeOpacity={0.75}>
              <Plus size={16} color={colors.secondary} />
              <Text style={styles.linkActionBtnText}>
                {isPt ? `Vincular ${name}` : `Link ${name} Key`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.getFreeKeyLink}
              onPress={() => openProviderDoc(provider)}
              activeOpacity={0.7}>
              <Text style={styles.getFreeKeyLinkText}>
                {isPt ? 'Criar chave gratuita' : 'Get free key'}
              </Text>
              <ExternalLink size={12} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input de Cadastro Protegido (Modo Edição) */}
        {isEditing && (
          <View style={styles.editInputContainer}>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              {isPt
                ? 'COLE SUA CHAVE DE API (ARMAZENADA COM CRIPTOGRAFIA)'
                : 'PASTE YOUR API KEY (ENCRYPTED IN HARDWARE)'}
            </Typography>

            <View style={styles.inputWrapper}>
              <Lock size={16} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                value={inputKey}
                onChangeText={setInputKey}
                placeholder={placeholder}
                placeholderTextColor={colors.outline}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                style={styles.secureTextInput}
              />
            </View>

            <View style={styles.editButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelInput}
                disabled={isSaving}
                activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>
                  {isPt ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveKeyBtn}
                onPress={() => handleSaveKey(provider)}
                disabled={isSaving}
                activeOpacity={0.8}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <Check size={16} color={colors.onPrimary} />
                    <Text style={styles.saveKeyBtnText}>
                      {isPt ? 'Salvar Chave' : 'Save Key'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Card variant="low" style={styles.mainCard}>
      {/* Header Geral da Seção */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderIconBox}>
          <Key size={20} color={colors.secondary} />
        </View>
        <View style={styles.sectionHeaderTextCol}>
          <Typography variant="unitCaption" color={colors.secondary} style={styles.sectionTagline}>
            {isPt ? 'INTELIGÊNCIA ARTIFICIAL (BYOK)' : 'ARTIFICIAL INTELLIGENCE (BYOK)'}
          </Typography>
          <Typography variant="headlineSm" style={styles.sectionTitle}>
            {isPt ? 'Chaves de IA (API Keys)' : 'AI API Keys'}
          </Typography>
          <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.sectionSubtitle}>
            {isPt
              ? 'Cadastre suas próprias chaves gratuitas para a IA reconhecer pratos e calcular macronutrientes com alta precisão.'
              : 'Add your free API keys for automated nutritional estimation and high-precision meal logging.'}
          </Typography>
        </View>
      </View>

      {/* Indicador de carregamento inicial */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.secondary} />
        </View>
      ) : (
        <View style={styles.providersList}>
          {/* Card Google Gemini */}
          {renderProviderCard(
            'gemini',
            'Google Gemini',
            status.hasGeminiKey,
            <Sparkles size={18} color={colors.primary} />,
            'Google AI Studio',
            isPt
              ? 'Multimodal rápido com visão computacional de alta fidelidade.'
              : 'Fast multimodal AI with high-fidelity food vision.',
            'AIzaSy...'
          )}

          {/* Card Groq Cloud */}
          {renderProviderCard(
            'groq',
            'Groq Cloud',
            status.hasGroqKey,
            <Zap size={18} color={colors.tertiary} />,
            'LPU Ultra Rápido',
            isPt
              ? 'Respostas ultrarrápidas em ~700ms com Qwen 2.5 & Llama Vision.'
              : 'Ultra-fast inference in ~700ms via Qwen 2.5 & Llama Vision.',
            'gsk_...'
          )}
        </View>
      )}

      {/* Nota de Segurança e Criptografia */}
      <View style={styles.securityFooter}>
        <ShieldCheck size={16} color={colors.primary} style={styles.shieldIcon} />
        <Text style={styles.securityText}>
          {isPt
            ? 'Segurança Máxima: Suas chaves ficam guardadas no cofre criptografado do celular (SecureStore). Nenhuma chave é exposta na tela ou enviada a servidores de terceiros.'
            : 'Maximum Security: Your keys are encrypted locally inside hardware storage (SecureStore). Keys are never exposed in UI or sent to third-party servers.'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    padding: spacing.md + 2,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  sectionHeaderIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    backgroundColor: '#0d2838',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionHeaderTextCol: {
    flex: 1,
    gap: 2,
  },
  sectionTagline: {
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providersList: {
    gap: spacing.sm + 2,
  },
  providerCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: spacing.sm,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  providerInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  providerIconBox: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  providerTextGroup: {
    flex: 1,
    gap: 2,
  },
  providerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  providerName: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  providerTag: {
    backgroundColor: colors.surfaceDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  providerTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  providerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  /* Estado Vinculada */
  linkedStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a1a14',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 4,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
  },
  unlinkBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },

  /* Estado Não Vinculada */
  unlinkedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    gap: spacing.sm,
  },
  linkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0d2838',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
  },
  linkActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  getFreeKeyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  getFreeKeyLinkText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },

  /* Formulário de Input Protegido */
  editInputContainer: {
    backgroundColor: colors.surfaceDim,
    padding: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: {
    marginRight: spacing.xs,
  },
  secureTextInput: {
    flex: 1,
    height: 40,
    color: colors.onSurface,
    fontSize: 13,
  },
  editButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  saveKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  saveKeyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },

  /* Rodapé Informativo */
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: `${colors.surfaceContainer}60`,
    padding: spacing.sm + 2,
    borderRadius: radii.lg,
  },
  shieldIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
});
