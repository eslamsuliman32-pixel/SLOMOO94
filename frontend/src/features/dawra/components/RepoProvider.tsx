import React from 'react';
import type { BarRepository } from '../types';
import { createSeedRepo } from '../repo/repo.gate';

/**
 * مزوّد المستودع — نقطة الحقن الوحيدة.
 *
 * في التطوير:  <RepoProvider>            → بذرة في الذاكرة
 * في الإنتاج:  <RepoProvider repo={dexieRepo}>
 *
 * كل مكوّن يقرأ عبر `useRepo()` — لا استيراد مباشر لأي مصدر بيانات.
 */
const RepoContext = React.createContext<BarRepository | null>(null);

export const RepoProvider: React.FC<{
  repo?: BarRepository;
  children: React.ReactNode;
}> = ({ repo, children }) => {
  const value = React.useMemo(() => repo ?? createSeedRepo(), [repo]);
  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
};

export function useRepo(): BarRepository {
  const ctx = React.useContext(RepoContext);
  if (!ctx) throw new Error('useRepo يجب أن يُستدعى داخل <RepoProvider>');
  return ctx;
}
