import * as Clipboard from 'expo-clipboard';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  ExternalLink,
  Globe,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { apiKeysService } from '@/services/api-keys.service';
import { SUPABASE_SETUP_SQL } from '@/sync/migration-sql';
import { createTemporarySupabaseClient } from '@/sync/supabase';
import {
  syncEngine,
  verifySupabaseSchema,
  type SchemaVerificationResult,
  type SyncResult,
  type SyncState,
} from '@/sync/sync.service';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface SupabaseSyncSectionProps {
  isPt?: boolean;
  onSyncCompleted?: (result: SyncResult) => void;
  onStatusChanged?: (hasLinked: boolean) => void;
}

export function SupabaseSyncSection({
  isPt = true,
  onSyncCompleted,
  onStatusChanged,
}: SupabaseSyncSectionProps) {
  const [hasLinked, setHasLinked] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine.getState());

  // Form de vinculação
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [anonKeyInput, setAnonKeyInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [schemaError, setSchemaError] = useState<SchemaVerificationResult | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Animações
  const [spinAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(0.4));

  // Carrega status inicial
  useEffect(() => {
    let isMounted = true;
    apiKeysService.getApiKeysStatus().then((status) => {
      if (isMounted) {
        setHasLinked(status.hasSupabaseLinked);
        setLastSyncAt(status.lastSyncAt || null);
      }
    });

    const unsubSync = syncEngine.subscribe((state) => {
      setSyncState(state);
      if (state.lastResult?.finishedAt) {
        setLastSyncAt(state.lastResult.finishedAt);
      }
    });

    return () => {
      isMounted = false;
      unsubSync();
    };
  }, []);

  // Animação de pulso para o status dot
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Animação de giro quando sincronizando
  useEffect(() => {
    if (syncState.isSyncing) {
      const spinLoop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      spinLoop.start();
      return () => {
        spinLoop.stop();
        spinAnim.setValue(0);
      };
    } else {
      spinAnim.setValue(0);
    }
  }, [syncState.isSyncing, spinAnim]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Copia o script SQL idempotente para o clipboard
  const handleCopySql = async () => {
    try {
      await Clipboard.setStringAsync(SUPABASE_SETUP_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      Alert.alert(
        isPt ? 'Erro ao Copiar' : 'Error Copying',
        isPt ? 'Não foi possível copiar o script SQL.' : 'Could not copy SQL script to clipboard.',
      );
    }
  };

  // Abre link do painel do Supabase
  const handleOpenSupabaseDashboard = () => {
    Linking.openURL('https://supabase.com/dashboard').catch(() => {});
  };

  // Conectar e validar credenciais
  const handleConnectAndSync = async () => {
    const cleanUrl = urlInput.trim().replace(/\/+$/, '');
    const cleanKey = anonKeyInput.trim();

    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      Alert.alert(
        isPt ? 'URL Inválida' : 'Invalid URL',
        isPt
          ? 'Insira a Project URL válida do seu Supabase (ex: https://xyz.supabase.co).'
          : 'Please enter a valid Supabase Project URL (e.g. https://xyz.supabase.co).',
      );
      return;
    }

    if (!cleanKey) {
      Alert.alert(
        isPt ? 'Anon Key Obrigatória' : 'Anon Key Required',
        isPt
          ? 'Insira a chave pública anônima (anon public key) do seu Supabase.'
          : 'Please enter the anonymous public key from your Supabase project.',
      );
      return;
    }

    setIsTesting(true);
    setSchemaError(null);

    try {
      const tempClient = createTemporarySupabaseClient(cleanUrl, cleanKey);
      const verification = await verifySupabaseSchema(tempClient);

      if (verification.status === 'missing_tables') {
        setSchemaError(verification);
        setIsTesting(false);
        return;
      }

      if (verification.status === 'invalid_credentials') {
        setSchemaError(verification);
        setIsTesting(false);
        return;
      }

      // Schema e credenciais verificadas com sucesso! Salva no SecureStore
      await apiKeysService.saveSupabaseCredentials(cleanUrl, cleanKey);
      setHasLinked(true);
      setIsFormOpen(false);
      setUrlInput('');
      setAnonKeyInput('');
      setSchemaError(null);
      onStatusChanged?.(true);

      // Dispara sync full inicial
      const syncResult = await syncEngine.syncNow({ forceFullSync: true });
      if (syncResult.ok) {
        const totalPushed = Object.values(syncResult.pushed).reduce((a, b) => a + b, 0);
        const totalPulled = Object.values(syncResult.pulled).reduce((a, b) => a + b, 0);
        setSyncFeedback(
          isPt
            ? `Conectado! ${totalPulled} baixados da nuvem, ${totalPushed} enviados.`
            : `Connected! ${totalPulled} pulled from cloud, ${totalPushed} pushed.`,
        );
        setTimeout(() => setSyncFeedback(null), 5000);
      }
      onSyncCompleted?.(syncResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSchemaError({ status: 'invalid_credentials', message });
    } finally {
      setIsTesting(false);
    }
  };

  // Sincronização manual
  const handleManualSync = async () => {
    if (syncState.isSyncing) return;
    setSyncFeedback(null);

    const res = await syncEngine.syncNow({ forceFullSync: true });
    const totalPushed = Object.values(res.pushed).reduce((a, b) => a + b, 0);
    const totalPulled = Object.values(res.pulled).reduce((a, b) => a + b, 0);

    if (res.ok) {
      setSyncFeedback(
        isPt
          ? `Sincronizado: ${totalPushed} enviados, ${totalPulled} recebidos.`
          : `Synced: ${totalPushed} pushed, ${totalPulled} pulled.`,
      );
      setTimeout(() => setSyncFeedback(null), 4000);
      onSyncCompleted?.(res);
    } else {
      setSyncFeedback(
        res.error === 'offline'
          ? isPt
            ? 'Sem internet no momento.'
            : 'Currently offline.'
          : isPt
          ? `Falha: ${res.error}`
          : `Error: ${res.error}`,
      );
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Desvincular Supabase com confirmação
  const handleUnlink = () => {
    Alert.alert(
      isPt ? 'Desvincular Supabase?' : 'Unlink Supabase?',
      isPt
        ? 'Seus dados locais continuarão salvos com segurança no aparelho. O aplicativo voltará a funcionar apenas offline.'
        : 'Your local data will remain safely saved on this device. The app will return to offline-only mode.',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Desvincular' : 'Unlink',
          style: 'destructive',
          onPress: async () => {
            await apiKeysService.unlinkSupabaseCredentials();
            setHasLinked(false);
            setLastSyncAt(null);
            setIsFormOpen(false);
            setSyncFeedback(null);
            onStatusChanged?.(false);
          },
        },
      ],
    );
  };

  // Formatação de data/hora amigável
  const formattedLastSync = useMemo(() => {
    if (!lastSyncAt) return isPt ? 'Pendente' : 'Pending';
    try {
      const date = new Date(lastSyncAt);
      if (isNaN(date.getTime())) return isPt ? 'Pendente' : 'Pending';

      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      if (isToday) {
        return isPt ? `Hoje às ${timeStr}` : `Today at ${timeStr}`;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month} às ${timeStr}`;
    } catch {
      return isPt ? 'Pendente' : 'Pending';
    }
  }, [lastSyncAt, isPt]);

  return (
    <View style={styles.container}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CABEÇALHO DO CARD                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconWrapper,
              hasLinked ? styles.iconWrapperLinked : styles.iconWrapperLocal,
            ]}>
            {hasLinked ? (
              <Cloud size={16} color={colors.primary} />
            ) : (
              <Database size={16} color={colors.outline} />
            )}
          </View>
          <View>
            <Typography variant="labelSm" color={colors.onSurface} style={styles.title}>
              {isPt ? 'Nuvem & Sincronização (Supabase)' : 'Cloud & Sync (Supabase)'}
            </Typography>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              {isPt ? 'ARQUITETURA BYOK • PRIVACIDADE TOTAL' : 'BYOK ARCHITECTURE • 100% PRIVATE'}
            </Typography>
          </View>
        </View>

        {/* Badge de Status */}
        <View
          style={[
            styles.statusBadge,
            hasLinked ? styles.statusBadgeLinked : styles.statusBadgeLocal,
          ]}>
          <Animated.View
            style={[
              styles.pulseDot,
              {
                backgroundColor: hasLinked ? colors.primary : colors.outline,
                opacity: hasLinked ? pulseAnim : 0.6,
              },
            ]}
          />
          <Typography
            variant="unitCaption"
            style={[
              styles.statusBadgeText,
              { color: hasLinked ? colors.primary : colors.outline },
            ]}>
            {hasLinked
              ? isPt
                ? 'VINCULADO'
                : 'LINKED'
              : isPt
              ? 'APENAS LOCAL'
              : 'LOCAL ONLY'}
          </Typography>
        </View>
      </View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ESTADO 1: DESVINCULADO (Local-First)                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!hasLinked ? (
        <View style={styles.unlinkedContent}>
          <Typography variant="labelSm" color={colors.onSurfaceVariant} style={styles.description}>
            {isPt
              ? 'Seus dados ficam 100% salvos no SQLite deste celular. Vincule seu próprio Supabase (gratuito) para sincronizar entre múltiplos aparelhos ou restaurar ao trocar de celular.'
              : 'Your data is 100% stored in local SQLite on this device. Link your own free Supabase project to sync across devices or restore when switching phones.'}
          </Typography>

          {!isFormOpen ? (
            <View style={styles.unlinkedActionsRow}>
              <Pressable
                onPress={() => setIsFormOpen(true)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  shadows.glowPrimary,
                  pressed && styles.pressed,
                ]}>
                <Cloud size={15} color={colors.onPrimary} />
                <Typography variant="labelSm" color={colors.onPrimary} style={styles.primaryBtnText}>
                  {isPt ? 'Vincular Supabase' : 'Link Supabase'}
                </Typography>
              </Pressable>

              <Pressable
                onPress={handleCopySql}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                {copiedSql ? (
                  <Check size={14} color={colors.primary} />
                ) : (
                  <Copy size={14} color={colors.onSurfaceVariant} />
                )}
                <Typography
                  variant="unitCaption"
                  color={copiedSql ? colors.primary : colors.onSurfaceVariant}
                  style={styles.secondaryBtnText}>
                  {copiedSql
                    ? isPt
                      ? 'SQL Copiado!'
                      : 'SQL Copied!'
                    : isPt
                    ? 'Copiar SQL das Tabelas'
                    : 'Copy Tables SQL'}
                </Typography>
              </Pressable>
            </View>
          ) : (
            /* Formulário Seguro de Inclusão */
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Typography variant="labelSm" color={colors.primary} style={styles.formTitle}>
                  {isPt ? 'Configurar Projeto Supabase' : 'Configure Supabase Project'}
                </Typography>
                <Pressable
                  onPress={handleOpenSupabaseDashboard}
                  style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
                  <Typography variant="unitCaption" color={colors.secondary}>
                    supabase.com
                  </Typography>
                  <ExternalLink size={12} color={colors.secondary} />
                </Pressable>
              </View>

              {/* Input URL */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Globe size={13} color={colors.onSurfaceVariant} />
                  <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                    {isPt ? 'PROJECT URL' : 'PROJECT URL'}
                  </Typography>
                </View>
                <TextInput
                  value={urlInput}
                  onChangeText={setUrlInput}
                  placeholder="https://xyzcompany.supabase.co"
                  placeholderTextColor={colors.outlineVariant}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                />
              </View>

              {/* Input Anon Key */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <KeyRound size={13} color={colors.onSurfaceVariant} />
                  <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                    {isPt ? 'ANON PUBLIC KEY' : 'ANON PUBLIC KEY'}
                  </Typography>
                </View>
                <TextInput
                  value={anonKeyInput}
                  onChangeText={setAnonKeyInput}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  placeholderTextColor={colors.outlineVariant}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              {/* Aviso se faltar criar tabelas no Supabase */}
              {schemaError && schemaError.status === 'missing_tables' && (
                <View style={styles.missingTablesAlert}>
                  <View style={styles.alertTitleRow}>
                    <AlertTriangle size={16} color="#f59e0b" />
                    <Typography variant="labelSm" color="#f59e0b" style={styles.alertTitle}>
                      {isPt
                        ? 'Tabelas não encontradas no seu Supabase'
                        : 'Tables not found in your Supabase'}
                    </Typography>
                  </View>
                  <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.alertText}>
                    {isPt
                      ? 'Cole o script SQL no SQL Editor do seu projeto Supabase, clique em "Run" e toque em "Conectar e Sincronizar" novamente.'
                      : 'Paste the SQL script in your Supabase SQL Editor, click "Run", then tap "Connect & Sync" again.'}
                  </Typography>
                  <Pressable
                    onPress={handleCopySql}
                    style={({ pressed }) => [styles.copySqlAlertBtn, pressed && styles.pressed]}>
                    {copiedSql ? (
                      <Check size={14} color="#052e16" />
                    ) : (
                      <Copy size={14} color="#052e16" />
                    )}
                    <Typography variant="labelSm" color="#052e16" style={styles.copySqlAlertText}>
                      {copiedSql
                        ? isPt
                          ? 'Script SQL Copiado!'
                          : 'SQL Script Copied!'
                        : isPt
                        ? 'Copiar Script SQL das Tabelas'
                        : 'Copy Tables SQL Script'}
                    </Typography>
                  </Pressable>
                </View>
              )}

              {/* Aviso se credenciais forem inválidas */}
              {schemaError && schemaError.status === 'invalid_credentials' && (
                <View style={styles.errorAlert}>
                  <AlertCircle size={15} color={colors.error} />
                  <Typography variant="unitCaption" color={colors.error} style={styles.errorText}>
                    {schemaError.message}
                  </Typography>
                </View>
              )}

              {/* Botões de Ação do Formulário */}
              <View style={styles.formButtonsRow}>
                <Pressable
                  onPress={() => {
                    setIsFormOpen(false);
                    setSchemaError(null);
                  }}
                  disabled={isTesting}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
                  <Typography variant="labelSm" color={colors.onSurfaceVariant}>
                    {isPt ? 'Cancelar' : 'Cancel'}
                  </Typography>
                </Pressable>

                <Pressable
                  onPress={handleConnectAndSync}
                  disabled={isTesting}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    shadows.glowPrimary,
                    pressed && !isTesting && styles.pressed,
                    isTesting && styles.disabledBtn,
                  ]}>
                  {isTesting ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <ShieldCheck size={16} color={colors.onPrimary} />
                  )}
                  <Typography variant="labelSm" color={colors.onPrimary} style={styles.primaryBtnText}>
                    {isTesting
                      ? isPt
                        ? 'Validando...'
                        : 'Validating...'
                      : isPt
                      ? 'Conectar e Sincronizar'
                      : 'Connect & Sync'}
                  </Typography>
                </Pressable>
              </View>

              {/* Botão sutil de cópia de SQL no rodapé do form */}
              <Pressable
                onPress={handleCopySql}
                style={({ pressed }) => [styles.discreetCopyRow, pressed && styles.pressed]}>
                <Copy size={12} color={colors.outline} />
                <Typography variant="unitCaption" color={colors.outline}>
                  {copiedSql
                    ? isPt
                      ? 'SQL das tabelas copiado!'
                      : 'Tables SQL copied!'
                    : isPt
                    ? 'Copiar script SQL para criar as 3 tabelas'
                    : 'Copy SQL script to create the 3 tables'}
                </Typography>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        /* ─────────────────────────────────────────────────────────────────── */
        /* ESTADO 2: VINCULADO (Write-Only, sem vazar chaves)                 */
        /* ─────────────────────────────────────────────────────────────────── */
        <View style={styles.linkedContent}>
          {/* Badge de Proteção Write-Only */}
          <View style={styles.writeOnlyRow}>
            <View style={styles.badgeProtected}>
              <ShieldCheck size={14} color={colors.primary} />
              <Typography variant="unitCaption" color={colors.primary} style={styles.badgeProtectedText}>
                {isPt
                  ? 'Supabase Vinculado •••••••••••'
                  : 'Supabase Linked •••••••••••'}
              </Typography>
            </View>

            <Typography variant="unitCaption" color={colors.outline}>
              {isPt ? `Último sync: ${formattedLastSync}` : `Last sync: ${formattedLastSync}`}
            </Typography>
          </View>

          {/* Feedback temporário de sincronização */}
          {syncFeedback && (
            <View style={styles.feedbackBanner}>
              <CheckCircle2 size={14} color={colors.primary} />
              <Typography variant="unitCaption" color={colors.primary} style={styles.feedbackText}>
                {syncFeedback}
              </Typography>
            </View>
          )}

          {/* Botões de Ação */}
          <View style={styles.linkedActionsRow}>
            <Pressable
              onPress={handleManualSync}
              disabled={syncState.isSyncing}
              style={({ pressed }) => [
                styles.syncNowBtn,
                pressed && !syncState.isSyncing && styles.pressed,
                syncState.isSyncing && styles.disabledBtn,
              ]}>
              <Animated.View
                style={syncState.isSyncing ? { transform: [{ rotate: spinInterpolation }] } : undefined}>
                <RefreshCw size={14} color={colors.primary} />
              </Animated.View>
              <Typography variant="labelSm" color={colors.primary} style={styles.syncNowText}>
                {syncState.isSyncing
                  ? isPt
                    ? 'Sincronizando...'
                    : 'Syncing...'
                  : isPt
                  ? 'Sincronizar Agora'
                  : 'Sync Now'}
              </Typography>
            </Pressable>

            <Pressable
              onPress={handleUnlink}
              disabled={syncState.isSyncing}
              style={({ pressed }) => [
                styles.unlinkBtn,
                pressed && !syncState.isSyncing && styles.pressed,
              ]}>
              <Trash2 size={13} color={colors.error || '#ffb4ab'} />
              <Typography
                variant="labelSm"
                color={colors.error || '#ffb4ab'}
                style={styles.unlinkText}>
                {isPt ? 'Desvincular' : 'Unlink'}
              </Typography>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: spacing.sm + 2,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconWrapperLinked: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderColor: 'rgba(78, 222, 163, 0.3)',
  },
  iconWrapperLocal: {
    backgroundColor: 'rgba(134, 148, 138, 0.12)',
    borderColor: 'rgba(134, 148, 138, 0.25)',
  },
  title: {
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusBadgeLinked: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderColor: 'rgba(78, 222, 163, 0.3)',
  },
  statusBadgeLocal: {
    backgroundColor: 'rgba(134, 148, 138, 0.12)',
    borderColor: 'rgba(134, 148, 138, 0.25)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  description: {
    lineHeight: 18,
  },
  unlinkedContent: {
    gap: spacing.sm + 2,
  },
  unlinkedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.lg,
  },
  primaryBtnText: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  secondaryBtnText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  formCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: spacing.sm + 2,
    marginTop: 4,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  input: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  missingTablesAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 6,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitle: {
    fontWeight: '800',
  },
  alertText: {
    lineHeight: 16,
  },
  copySqlAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fbbf24',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginTop: 2,
  },
  copySqlAlertText: {
    fontWeight: '800',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
  },
  errorText: {
    flex: 1,
  },
  formButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  discreetCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  linkedContent: {
    gap: spacing.sm + 2,
  },
  writeOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  badgeProtected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeProtectedText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.3)',
  },
  feedbackText: {
    fontWeight: '700',
    flex: 1,
  },
  linkedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(78, 222, 163, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.lg,
  },
  syncNowText: {
    fontWeight: '800',
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.lg,
  },
  unlinkText: {
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
