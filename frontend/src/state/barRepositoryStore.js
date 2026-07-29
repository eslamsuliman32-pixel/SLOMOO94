import { create } from 'zustand';

/**
 * مخزن مشترك للبارات — يحلّ محلّ useState المحلي في BarRepositoryScreen
 * ليصبح متاحاً لأي شاشة أخرى (تبويب الدورة) عبر البوابة الواحدة.
 * setBars يقبل قيمة مباشرة أو دالة تحديث، تماماً كـ setState الأصلي،
 * حتى لا ينكسر أي استدعاء حالي بصيغة setBars(prev => ...).
 */
export const useBarRepositoryStore = create((set) => ({
  bars: [],
  setBars: (updater) => set((s) => ({
    bars: typeof updater === 'function' ? updater(s.bars) : updater,
  })),
  addBars: (newBars) => set((s) => ({ bars: [...s.bars, ...newBars] })),
}));
