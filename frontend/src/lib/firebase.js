// src/lib/firebase.js
// نقطة التهيئة الوحيدة لـ Firebase — كل الوحدات تستورد من هنا فقط (عقد الوحدات، القاعدة 2).
// القيم تُقرأ من متغيرات بيئة .env (لا تُكتب هنا أبدًا) — انظر .env.example.

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// يمنع إعادة التهيئة عند Hot Reload في بيئة التطوير
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
