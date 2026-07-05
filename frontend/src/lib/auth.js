// src/lib/auth.js
// وحدة المصادقة — تسجيل الدخول بحساب Google (المالك فقط عمليًا).
// تلتزم عقد الوحدات؛ هي البوابة الوحيدة لهوية المستخدم في النظام.

import { useEffect, useState } from 'react'
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut as fbSignOut,
} from 'firebase/auth'
import app from './firebase.js'

export const auth = getAuth(app)
const provider = new GoogleAuthProvider()

/** تسجيل الدخول بنافذة Google المنبثقة. */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider)
    return { ok: true, data: { uid: result.user.uid, name: result.user.displayName }, error: null }
  } catch (e) {
    const message_ar =
      e?.code === 'auth/unauthorized-domain'
        ? 'النطاق غير مصرّح به — أضف slomoo-94.vercel.app في نطاقات Firebase المعتمدة.'
        : e?.code === 'auth/popup-blocked'
          ? 'المتصفح منع النافذة المنبثقة — اسمح بالنوافذ المنبثقة لهذا الموقع وحاول ثانية.'
          : 'تعذّر تسجيل الدخول، حاول مرة أخرى.'
    return { ok: false, data: null, error: { code: e?.code || 'AUTH_FAILED', message_ar, recoverable: true } }
  }
}

/** تسجيل الخروج. */
export function signOut() {
  return fbSignOut(auth)
}

/**
 * هوك حالة المستخدم:
 * undefined = جارٍ التحقق ، null = غير مسجّل ، object = مسجّل.
 */
export function useUser() {
  const [user, setUser] = useState(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}
