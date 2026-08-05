// MAQAM · الدفعة ٠ — نسخة احتياطية كاملة لمستودع البارات المحفوظة والأعمال
// يُبنى فوق lib/bars.js وlib/pieces.js (localStore) — لا يعيد تنفيذ التخزين،
// فقط يجمّع ويُعيد عبر عقد الوحدة الموحّد (docs/MODULE_CONTRACT.md).
//
// ملاحظة حدود الأنواع: bars.js وpieces.js ملفات JS قديمة بلا تعليقات أنواع،
// فتُلقَّب نتائجهما هنا صراحةً بـ`ModuleResult<T>` بدل الاعتماد على استنتاج
// TypeScript غير المضمون عبر حدود JS/TS.

import { listBars, importBars } from '../bars.js'
import { listPieces, importPieces } from '../pieces.js'

export const VAULT_SCHEMA_VERSION = 1 as const

export interface BarRow {
  id: string
  text: string
  project: string | null
  song: string | null
  created_at: number
  updated_at: number
}

export interface PieceRow {
  id: string
  title: string
  text: string
  created_at: number
  updated_at: number
}

export interface VaultSnapshot {
  version: typeof VAULT_SCHEMA_VERSION
  exportedAt: string
  bars: BarRow[]
  pieces: PieceRow[]
}

export interface VaultImportOutcome {
  added: number
  skipped: number
  conflicts: number
}

interface ModuleError {
  code: string
  message_ar: string
  recoverable: boolean
}

interface ModuleResult<T> {
  ok: boolean
  data: T | null
  error: ModuleError | null
  meta: { module: string; version: string; took_ms: number }
}

const MODULE = 'vault-snapshot'
const MODULE_VERSION = '1.0.0'

function ok<T>(data: T, t0: number): ModuleResult<T> {
  return { ok: true, data, error: null, meta: { module: MODULE, version: MODULE_VERSION, took_ms: Date.now() - t0 } }
}

function fail<T>(code: string, message_ar: string, t0: number): ModuleResult<T> {
  return {
    ok: false,
    data: null,
    error: { code, message_ar, recoverable: true },
    meta: { module: MODULE, version: MODULE_VERSION, took_ms: Date.now() - t0 },
  }
}

const REMINDER_KEY = 'maqam.vault.lastExportAt'
const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

/** يُسجَّل عند كل تصدير ناجح — أساس تذكير الأسبوع. */
export function markExported(now: number = Date.now()): void {
  try {
    localStorage.setItem(REMINDER_KEY, String(now))
  } catch {
    /* تخزين التذكير اختياري — لا يوقف التصدير */
  }
}

/** آخر مرة صُدِّرت فيها نسخة احتياطية، أو null إن لم يحدث تصدير بعد. */
export function lastExportAt(): number | null {
  try {
    const raw = localStorage.getItem(REMINDER_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** هل حان وقت تذكير المستخدم بالتصدير؟ (لا تصدير سابق، أو مرّ ٧ أيام فأكثر). */
export function shouldRemindExport(now: number = Date.now()): boolean {
  const last = lastExportAt()
  if (last == null) return true
  return now - last >= REMINDER_INTERVAL_MS
}

/** يجمع كل البارات المحفوظة والأعمال في لقطة واحدة قابلة للتنزيل. */
export async function exportVault(): Promise<ModuleResult<VaultSnapshot>> {
  const t0 = Date.now()
  const barsRes = (await listBars()) as ModuleResult<BarRow[]>
  if (!barsRes.ok || !barsRes.data) {
    return fail('VAULT_BARS_READ_FAILED', barsRes.error?.message_ar ?? 'تعذّر قراءة البارات المحفوظة.', t0)
  }
  const piecesRes = (await listPieces()) as ModuleResult<PieceRow[]>
  if (!piecesRes.ok || !piecesRes.data) {
    return fail('VAULT_PIECES_READ_FAILED', piecesRes.error?.message_ar ?? 'تعذّر قراءة الأعمال.', t0)
  }

  const snapshot: VaultSnapshot = {
    version: VAULT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    bars: barsRes.data,
    pieces: piecesRes.data,
  }
  markExported()
  return ok(snapshot, t0)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** يستورد لقطة سابقة: يضيف الجديد ويحافظ على الموجود، يتجاوز التعارض بالمعرّف. */
export async function importVault(json: unknown): Promise<ModuleResult<VaultImportOutcome>> {
  const t0 = Date.now()
  if (!isPlainObject(json) || !Array.isArray(json.bars) || !Array.isArray(json.pieces)) {
    return fail('VAULT_INVALID_FILE', 'ملف النسخة الاحتياطية غير صالح — يجب أن يحتوي bars وpieces.', t0)
  }

  const barsRes = (await importBars(json.bars)) as ModuleResult<VaultImportOutcome>
  if (!barsRes.ok || !barsRes.data) {
    return fail('VAULT_BARS_IMPORT_FAILED', barsRes.error?.message_ar ?? 'تعذّر استيراد البارات.', t0)
  }
  const piecesRes = (await importPieces(json.pieces)) as ModuleResult<VaultImportOutcome>
  if (!piecesRes.ok || !piecesRes.data) {
    return fail('VAULT_PIECES_IMPORT_FAILED', piecesRes.error?.message_ar ?? 'تعذّر استيراد الأعمال.', t0)
  }

  return ok({
    added: barsRes.data.added + piecesRes.data.added,
    skipped: barsRes.data.skipped + piecesRes.data.skipped,
    conflicts: barsRes.data.conflicts + piecesRes.data.conflicts,
  }, t0)
}
