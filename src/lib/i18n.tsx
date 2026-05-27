import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AppLanguage = 'TH' | 'EN';

const STORAGE_KEY = 'trip2talk_language';

type Dictionary = Record<string, { TH: string; EN: string }>;

const DICT: Dictionary = {
  operatorAccess: { TH: 'สำหรับทีมงาน', EN: 'STAFF ACCESS' },
  enterPin: { TH: 'กรอกรหัส 4 หลัก', EN: 'ENTER 4-DIGIT CODE' },
  locked: { TH: 'ล็อกชั่วคราว', EN: 'LOCKED' },
  invalidAttemptsLeft: { TH: 'รหัสไม่ถูกต้อง — เหลืออีก {n} ครั้ง', EN: 'INVALID — {n} ATTEMPTS LEFT' },

  offlineMode: { TH: 'ออฟไลน์ — บันทึกในเครื่อง และจะซิงก์เมื่อกลับมาออนไลน์', EN: 'OFFLINE MODE — Data saves locally, syncs when reconnected' },
  connectedSyncing: { TH: 'ออนไลน์ — กำลังซิงก์ข้อมูลออฟไลน์…', EN: 'CONNECTED — Syncing offline data...' },

  installTitle: { TH: 'ติดตั้งแอป Trip2Talk', EN: 'Install Trip2Talk App' },
  installHint: { TH: 'เพิ่มไปที่หน้าจอหลักเพื่อใช้งานแบบออฟไลน์', EN: 'Add to home screen for offline access' },
  installIOSHint: { TH: 'กดปุ่มแชร์ แล้วเลือก “เพิ่มไปที่หน้าจอโฮม”', EN: 'Tap the share icon then "Add to Home Screen"' },
  installButton: { TH: 'ติดตั้ง', EN: 'INSTALL' },
};

function readStoredLanguage(): AppLanguage {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'EN' || raw === 'TH' ? raw : 'TH';
}

export interface I18nContextValue {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  toggleLang: () => void;
  t: (key: keyof typeof DICT, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(() => readStoredLanguage());

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === 'TH' ? 'th' : 'en';
  }, []);

  const toggleLang = useCallback(() => setLang(lang === 'TH' ? 'EN' : 'TH'), [lang, setLang]);

  const t = useCallback(
    (key: keyof typeof DICT, vars?: Record<string, string | number>) => {
      let out = DICT[key][lang];
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replaceAll(`{${k}}`, String(v));
        }
      }
      return out;
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

