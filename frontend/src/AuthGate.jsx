import { useState } from 'react'
import { useUser, signInWithGoogle } from './lib/auth.js'

/** بوابة موحدة: تعرض المحتوى فقط بعد تسجيل الدخول، وإلا زر دخول Google. */
export default function AuthGate({ children }) {
  const user = useUser()
  const [msg, setMsg] = useState('')

  if (user === undefined) {
    return <p className="gate-note">جارٍ التحقق من حالة الدخول...</p>
  }

  if (user === null) {
    return (
      <div className="gate">
        <p className="gate-note">
          هذه المساحة محمية — الوصول لصاحب الحساب فقط. تسجيل الدخول مرة واحدة ويتذكرك المتصفح.
        </p>
        <button
          className="conn-test-btn"
          onClick={async () => {
            setMsg('')
            const r = await signInWithGoogle()
            if (!r.ok) setMsg(r.error.message_ar)
          }}
        >
          تسجيل الدخول بجوجل
        </button>
        {msg && (
          <div className="conn-test-result fail">
            <span className="conn-test-icon">✕</span> {msg}
          </div>
        )}
      </div>
    )
  }

  return typeof children === 'function' ? children(user) : children
}
