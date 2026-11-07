import { addDatabaseChangeListener } from 'expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  translations,
  type AppLanguage,
  type Translations,
} from '@/i18n/translations';
import { goalsRepository } from '@/repositories/goals.repository';

interface LanguageContextValue {
  language: AppLanguage;
  isPt: boolean;
  t: Translations;
  setLanguage: (lang: AppLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('pt');

  useEffect(() => {
    let isMounted = true;

    goalsRepository
      .get()
      .then((goals) => {
        if (isMounted && (goals.language === 'pt' || goals.language === 'en')) {
          setLanguageState(goals.language);
        }
      })
      .catch((err) => {
        if (__DEV__)
          console.warn('[LanguageProvider] Erro ao carregar idioma:', err);
      });

    // Reage instantaneamente a alterações locais no SQLite ou sync
    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (tableName !== 'user_goals') return;
      goalsRepository
        .get()
        .then((goals) => {
          if (
            isMounted &&
            (goals.language === 'pt' || goals.language === 'en')
          ) {
            setLanguageState(goals.language);
          }
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const setLanguage = useCallback(async (newLang: AppLanguage) => {
    // Atualização otimista imediata no estado React
    setLanguageState(newLang);
    try {
      await goalsRepository.update({ language: newLang });
    } catch (err) {
      if (__DEV__)
        console.warn('[LanguageProvider] Erro ao salvar idioma:', err);
    }
  }, []);

  const value: LanguageContextValue = {
    language,
    isPt: language === 'pt',
    t: translations[language],
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback defensivo caso usado fora do provider
    return {
      language: 'pt',
      isPt: true,
      t: translations.pt,
      setLanguage: async () => {},
    };
  }
  return context;
}
