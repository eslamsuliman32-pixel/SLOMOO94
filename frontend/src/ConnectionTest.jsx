import { useState } from 'react'
import { createBar, listBars, deleteBar } from './lib/bars.js'
import { useUser, signInWithGoogle, signOut } from './lib/auth.js'

/**
 * اختبار الاتصال الحي بـ Firestore (خطوة الاكتمال رقم 15).
 * يكتب بار تجريبي، يتأكد أنه ظهر في القراءة، ثم يحذفه — لا يترك أثرًا في المستودع.
 */
export default function ConnectionTest() {
  const [state, setState] = useState('idle') // idle | running | success | error
  const [detail, setDetail] = useState('')
  const [authMsg, setAuthMsg] = useState('')
  const user = useUser()

  async function handleSignIn() {
    setAuthMsg('')
    const res = await signInWithGoogle()
    if (!res.ok) setAuthMsg(res.error.message_ar)
  }

  async function runTest() {
    setState('running')
    setDetail('')

    const marker = `اختبار-اتصال-${Date.now()}`

    const created = await createBar({ text: marker })
    if (!created.ok) {
      setState('error')
      setDetail(`فشل الحفظ: ${created.error.message_ar}`)
      return
    }

    const list = await listBars()
    if (!list.ok) {
      setState('error')
      setDetail(`فشلت القراءة: ${list.error.message_ar}`)
      return
    }

    const found = list.data.some((b) => b.text === marker)
    if (!found) {
      setState('error')
      setDetail('البار اتحفظ لكن ما ظهرش في القراءة — تحقق من قواعد الأمان في Firestore.')
      return
    }

    // تنظيف: نحذف البار التجريبي فورًا فلا يبقى أثر
    await deleteBar(created.data.id)

    setState('success')
    setDetail('تم الحفظ، القراءة، والحذف بنجاح — Firestore متصل ويعمل فعليًا.')
  }

  if (user === undefined) {
    return (
      <div className="conn-test">
        <h3>اختبار الاتصال بقاعدة البيانات</h3>
        <p className="conn-test-desc">جارٍ التحقق من حالة الدخول...</p>
      </div>
    )
  }

  if (user === null) {
    return (
      <div className="conn-test">
        <h3>اختبار الاتصال بقاعدة البيانات</h3>
        <p className="conn-test-desc">
          قاعدة البيانات محمية — الوصول لصاحب الحساب فقط. سجّل دخولك بجوجل أولًا (مرة واحدة، ويتذكرك المتصفح بعدها).
        </p>
        <button className="conn-test-btn" onClick={handleSignIn}>
          تسجيل الدخول بجوجل
        </button>
        {authMsg && (
          <div className="conn-test-result fail">
            <span className="conn-test-icon">✕</span> {authMsg}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="conn-test">
      <h3>اختبار الاتصال بقاعدة البيانات</h3>
      <p className="conn-test-desc">
        مسجّل باسم: {user.displayName} · <button className="conn-test-link" onClick={signOut}>خروج</button>
      </p>
      <p className="conn-test-desc">
        يكتب بارًا تجريبيًا، يتأكد من ظهوره، ثم يحذفه تلقائيًا — لا يترك أي أثر في مستودعك.
      </p>

      <button
        className="conn-test-btn"
        onClick={runTest}
        disabled={state === 'running'}
      >
        {state === 'running' ? 'جارٍ الفحص...' : 'شغّل الاختبار'}
      </button>

      {state === 'success' && (
        <div className="conn-test-result ok">
          <span className="conn-test-icon">✓</span> {detail}
        </div>
      )}
      {state === 'error' && (
        <div className="conn-test-result fail">
          <span className="conn-test-icon">✕</span> {detail}
        </div>
      )}
    </div>
  )
}
