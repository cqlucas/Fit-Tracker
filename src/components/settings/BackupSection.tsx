import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { scopeGuard, getDatabaseScope } from '@/db/client';
import { useLanguage } from '@/context/LanguageContext';
import {
  backupStats,
  exportBackup,
  restoreBackup,
  validateBackup,
} from '@/services/backup.service';
import { Action, Note, Panel } from '@/components/ui/Form';
export function BackupSection() {
  const { isPt } = useLanguage();
  const labels: Record<string, string> = {
    food_logs: isPt ? 'Refeições' : 'Meals',
    water_logs: isPt ? 'Líquidos' : 'Fluids',
    goal_plans: isPt ? 'Versões de metas' : 'Target versions',
    food_templates: isPt ? 'Favoritos' : 'Favorites',
    weight_logs: isPt ? 'Pesos' : 'Weight logs',
    supplement_logs: isPt ? 'Creatina' : 'Creatine',
    training_days: isPt ? 'Treinos' : 'Training',
    daily_checkins: isPt ? 'Confirmações de dias' : 'Daily check-ins',
  };
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const exportFile = async () => {
    setBusy(true);
    setError('');
    try {
      const content = exportBackup();
      validateBackup(content);
      const name = `fittracker-${Date.now()}.json`;
      if (Platform.OS === 'web') {
        const href = URL.createObjectURL(
          new Blob([content], { type: 'application/json' }),
        );
        const a = document.createElement('a');
        a.href = href;
        a.download = name;
        a.click();
        URL.revokeObjectURL(href);
      } else {
        const file = new File(Paths.document, name);
        file.create();
        file.write(content);
        if ((await file.text()) !== content)
          throw new Error('Backup verification failed');
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            UTI: 'public.json',
          });
        else setMessage(file.uri);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };
  const importFile = async () => {
    const assertScope = scopeGuard();
    setBusy(true);
    setError('');
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;
      const asset = selection.assets[0];
      if (asset.size && asset.size > 100_000_000)
        throw new Error('Backup too large');
      const text =
        Platform.OS === 'web' && asset.file
          ? await asset.file.text()
          : await new File(asset.uri).text();
      assertScope();
      const b = validateBackup(text);
      const stats = backupStats(b);
      Alert.alert(
        isPt ? 'Restaurar este arquivo?' : 'Restore this file?',
        `${b.scope !== getDatabaseScope() ? (isPt ? 'Esta importação cria cópias independentes nesta conta. ' : 'This import creates independent copies in this account. ') : ''}${isPt ? 'Somente em diário vazio. Contagens' : 'Only into an empty diary. Counts'}:\n${Object.entries(
          stats,
        )
          .map(([t, s]) => `${labels[t]}: ${s.count}`)
          .join('\n')}`,
        [
          { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
          {
            text: isPt ? 'Restaurar' : 'Restore',
            onPress: () => {
              try {
                assertScope();
                restoreBackup(text);
                setMessage(
                  isPt
                    ? 'Restauração verificada: contagens e valores preservados.'
                    : 'Restore verified: counts and values preserved.',
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Error');
              }
            },
          },
        ],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title={isPt ? 'Backup JSON restaurável' : 'Restorable JSON backup'}>
      <Note>
        {isPt
          ? 'Inclui registros, metas, favoritos, rascunhos e preferências locais. Fotos continuam como referências a arquivos do aparelho; guarde as imagens separadamente. O arquivo contém seu diário pessoal.'
          : 'Includes logs, targets, favorites, drafts and local preferences. Photos remain references to device files; keep images separately. The file contains your personal diary.'}
      </Note>
      <Action
        label={isPt ? 'Exportar backup verificado' : 'Export verified backup'}
        busy={busy}
        onPress={() => void exportFile()}
      />
      <Action
        label={isPt ? 'Restaurar em diário vazio' : 'Restore into empty diary'}
        secondary
        busy={busy}
        onPress={() => void importFile()}
      />
      {message && <Note>{message}</Note>}
      {error && <Note error>{error}</Note>}
    </Panel>
  );
}
