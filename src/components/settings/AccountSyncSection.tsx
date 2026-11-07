import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { activeOwner, expoDb, scopeGuard } from '@/db/client';
import {
  getPreference,
  setPreference,
} from '@/repositories/preferences.repository';
import { apiKeysService } from '@/services/api-keys.service';
import {
  getAuthSession,
  sendEmailCode,
  signOut,
  subscribeAuth,
  verifyEmailCode,
} from '@/sync/supabase';
import {
  getSyncConflicts,
  resolveSyncConflict,
  syncEngine,
} from '@/sync/sync.service';
import {
  Action,
  Field,
  Note,
  Panel,
  Toggle,
  useNumberFormat,
} from '@/components/ui/Form';
import { StatusSyncCard } from './StatusSyncCard';
export function AccountSyncSection() {
  const { isPt } = useLanguage();
  const format = useNumberFormat();
  const [url, setUrl] = useState(''),
    [key, setKey] = useState(''),
    [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [session, setSession] = useState(getAuthSession),
    [sync, setSync] = useState(getPreference('cloudSync', false)),
    [conflicts, setConflicts] = useState(getSyncConflicts),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(
    () =>
      subscribeAuth(() => {
        setSession(getAuthSession());
        setSync(getPreference('cloudSync', false));
        setConflicts(getSyncConflicts());
      }),
    [],
  );
  useEffect(
    () => syncEngine.subscribe(() => setConflicts(getSyncConflicts())),
    [],
  );
  const run = async (action: () => Promise<unknown>, success = '') => {
    setBusy(true);
    setError('');
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };
  const describe = (row: Record<string, unknown> | null): string => {
    if (!row) return isPt ? 'Ausente' : 'Missing';
    const details: string[] = [
      row.name ? String(row.name) : '',
      String(row.date_key ?? row.effective_from ?? ''),
      row.deleted_at
        ? isPt
          ? 'EXCLUÍDO'
          : 'DELETED'
        : isPt
          ? 'Ativo'
          : 'Active',
    ].filter(Boolean);
    for (const [field, label] of [
      ['protein_g', isPt ? 'Proteína (g)' : 'Protein (g)'],
      ['calories_kcal', 'kcal'],
      ['carb_g', isPt ? 'Carboidratos (g)' : 'Carbs (g)'],
      ['fat_g', isPt ? 'Gorduras (g)' : 'Fat (g)'],
      ['fiber_g', isPt ? 'Fibras (g)' : 'Fiber (g)'],
      ['amount_ml', 'mL'],
      ['weight_kg', 'kg'],
      ['dose_g', isPt ? 'Dose (g)' : 'Dose (g)'],
      [
        'protein_goal',
        isPt ? 'Referência de proteína (g)' : 'Protein reference (g)',
      ],
      [
        'calories_goal',
        isPt ? 'Referência de energia (kcal)' : 'Energy reference (kcal)',
      ],
      [
        'water_goal',
        isPt ? 'Referência de líquidos (mL)' : 'Fluid reference (mL)',
      ],
      ['duration_min', 'min'],
    ]) {
      if (field in row)
        details.push(
          `${label}: ${row[field] == null ? '—' : format(Number(row[field]))}`,
        );
    }
    return details.join(' · ');
  };
  const resolve = (id: string, choice: 'cloud' | 'device') => {
    const assertScope = scopeGuard();
    const c = conflicts.find((c) => c.id === id);
    if (!c) return;
    const remote = JSON.parse(c.remote_json);
    const local = expoDb.getFirstSync<Record<string, string | number | null>>(
      `SELECT * FROM ${c.table_name} WHERE id=?`,
      c.local_id,
    );
    Alert.alert(
      isPt ? 'Resolver conflito' : 'Resolve conflict',
      `${isPt ? 'Aparelho' : 'Device'}: ${describe(local)}\n\n${isPt ? 'Nuvem' : 'Cloud'}: ${describe(remote)}\n\n${isPt ? 'A escolha vale também para a bebida vinculada. Uma versão marcada EXCLUÍDO remove esse consumo dos totais.' : 'The choice also applies to a linked drink. A DELETED version removes this consumption from totals.'}`,
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text:
            choice === 'cloud'
              ? isPt
                ? 'Usar a nuvem'
                : 'Use cloud'
              : isPt
                ? 'Manter este aparelho'
                : 'Keep this device',
          onPress: () => {
            try {
              assertScope();
              resolveSyncConflict(id, choice);
              setConflicts(getSyncConflicts());
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Error');
            }
          },
        },
      ],
    );
  };

  return (
    <Panel
      title={isPt ? 'Conta, IA e cópia na nuvem' : 'Account, AI and cloud copy'}
    >
      <Note>
        {isPt
          ? 'Você pode registrar tudo sem conta. A IA exige acesso por e-mail. Sincronizar o diário é uma autorização separada, desativada inicialmente. Cada conta mantém seu próprio banco e suas pendências.'
          : 'You can log everything without an account. AI requires email sign in. Diary sync is a separate permission, initially disabled. Each account keeps its own database and pending changes.'}
      </Note>
      <Field
        label={isPt ? 'URL do projeto Supabase' : 'Supabase project URL'}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Field
        label={
          isPt
            ? 'Chave pública anon/publishable'
            : 'Public anon/publishable key'
        }
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        secureTextEntry
      />
      <Action
        label={isPt ? 'Configurar conexão' : 'Configure connection'}
        busy={busy}
        onPress={() =>
          void run(
            async () => {
              await apiKeysService.saveSupabaseCredentials(url, key);
              await syncEngine.refreshEnabledStatus();
              setKey('');
            },
            isPt
              ? 'Conexão configurada. Entre por e-mail.'
              : 'Connection configured. Sign in by email.',
          )
        }
      />
      {session ? (
        <>
          <Note>{session.user.email}</Note>
          <Toggle
            label={
              isPt
                ? 'Autorizar sincronização do diário desta conta'
                : 'Authorize diary sync for this account'
            }
            value={sync}
            onChange={(value) => {
              setPreference('cloudSync', value);
              setSync(value);
              void syncEngine.refreshEnabledStatus();
            }}
          />
          <Action
            label={
              isPt
                ? 'Sair e voltar ao diário local'
                : 'Sign out and return to local diary'
            }
            secondary
            busy={busy}
            onPress={() => void run(signOut)}
          />
        </>
      ) : (
        <>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Action
            label={isPt ? 'Receber código por e-mail' : 'Receive email code'}
            busy={busy}
            onPress={() =>
              void run(
                () => sendEmailCode(email),
                isPt ? 'Código enviado.' : 'Code sent.',
              )
            }
          />
          <Field
            label={isPt ? 'Código de uso único' : 'One-time code'}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />
          <Action
            label={isPt ? 'Entrar' : 'Sign in'}
            busy={busy}
            onPress={() => void run(() => verifyEmailCode(email, code))}
          />
        </>
      )}
      {activeOwner && (
        <Note>
          {isPt
            ? 'Para importar o diário que você usava sem conta: exporte-o no modo local, entre nesta conta e restaure o arquivo aqui antes de sincronizar. O arquivo de origem é preservado.'
            : 'To import your account-free diary: export it in local mode, sign in to this account and restore the file here before syncing. The source file is preserved.'}
        </Note>
      )}
      <StatusSyncCard />
      <Action
        label={isPt ? 'Reconciliar acervo completo' : 'Reconcile full diary'}
        secondary
        disabled={!sync || !session}
        busy={busy}
        onPress={() =>
          void run(
            async () => {
              const r = await syncEngine.syncNow({ forceFullSync: true });
              if (!r.ok) throw new Error(r.error);
            },
            isPt ? 'Rodada confirmada.' : 'Sync round confirmed.',
          )
        }
      />
      {conflicts.length > 0 && (
        <Panel title={isPt ? 'Pendências de sincronização' : 'Sync conflicts'}>
          {conflicts.map((c) => (
            <Panel key={c.id}>
              <Note>{`${isPt ? 'Aparelho' : 'Device'}: ${describe(expoDb.getFirstSync<Record<string, string | number | null>>(`SELECT * FROM ${c.table_name} WHERE id=?`, c.local_id))}`}</Note>
              <Note>{`${isPt ? 'Nuvem' : 'Cloud'}: ${describe(JSON.parse(c.remote_json))}`}</Note>
              <Action
                label={isPt ? 'Usar a nuvem' : 'Use cloud'}
                secondary
                onPress={() => resolve(c.id, 'cloud')}
              />
              <Action
                label={isPt ? 'Manter este aparelho' : 'Keep this device'}
                secondary
                onPress={() => resolve(c.id, 'device')}
              />
            </Panel>
          ))}
        </Panel>
      )}
      {message && <Note>{message}</Note>}
      {error && <Note error>{error}</Note>}
    </Panel>
  );
}
