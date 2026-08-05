// MAQAM · الدفعة ٠ — دوال تصفية نقية معزولة لتجمّعات التدريب المستقبلية.
// لا تتصل حالياً بأي مصدر بيانات ولا تُستهلَك من TrainingScreen.jsx — الشاشة
// لا تزال تستخدم بنكيها الثابتين (TAQTEE_BANK/RAWI_BANK). هذا الملف جاهز
// لتُستدعى دوالُه متى رُبط ركن التدريب بمستودع البارات في دفعة لاحقة.

import type { RepoBar } from './repository.ts'

/** بارات صالحة لتمرين التقطيع — تستبعد المسوّدات (بلا مقاطع محسوبة بعد) */
export function buildTaqteePool(bars: RepoBar[]): RepoBar[] {
  return bars.filter((b) => b.status === 'measured' && b.sylCount > 0)
}

/** بارات صالحة لتمرين اصطياد الروي — تستبعد المسوّدات وأي بار بلا روي مستخرَج */
export function buildRawiPool(bars: RepoBar[]): RepoBar[] {
  return bars.filter((b) => b.status === 'measured' && !!b.rhyme?.rawi)
}
