import { useEffect, useRef } from 'react'

/* فن خوارزمي ببذرة — mulberry32 PRNG */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* توليد بصمة وزن عربية طبيعية: لا ساكنان متتاليان في الغالب */
function generateFingerprint(rand, length) {
  const units = []
  let prevSakin = false
  for (let i = 0; i < length; i++) {
    const sakin = prevSakin ? rand() < 0.08 : rand() < 0.42
    units.push(sakin)
    prevSakin = sakin
  }
  return units // true = ▬ ساكن ، false = ● متحرك
}

export default function RhythmCanvas({ seed = 941994 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const rand = mulberry32(seed)
    const units = generateFingerprint(rand, 48)
    const jitter = units.map(() => rand() * 0.5 + 0.5)

    let raf, W, H, dpr

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H)
      const n = units.length
      const gap = W / n
      const mid = H / 2
      const beat = reduced ? 0.6 : (Math.sin(t / 480) + 1) / 2      // نبض عام
      const sweep = reduced ? -1 : ((t / 2600) % 1.25) * n           // مؤشر ماسح

      for (let i = 0; i < n; i++) {
        const x = W - (i + 0.5) * gap                                 // RTL: من اليمين لليسار
        const near = Math.max(0, 1 - Math.abs(sweep - i) / 2.5)       // توهج قرب المؤشر
        const a = 0.16 + jitter[i] * 0.12 + near * 0.65 + beat * 0.06

        ctx.fillStyle = near > 0.15 ? `rgba(244,209,96,${Math.min(a,0.95)})` : `rgba(243,237,225,${Math.min(a*0.55,0.55)})`
        ctx.strokeStyle = ctx.fillStyle
        if (near > 0.15) { ctx.shadowColor = 'rgba(212,175,55,0.65)'; ctx.shadowBlur = 8 } else { ctx.shadowBlur = 0 }

        if (units[i]) {
          // ▬ ساكن: شرطة ثقيلة
          const w = gap * 0.62, h = 3 + near * 3
          ctx.fillRect(x - w / 2, mid - h / 2, w, h)
        } else {
          // ● متحرك: نقطة
          const r = 2.1 + jitter[i] * 1.2 + near * 2.6
          ctx.beginPath()
          ctx.arc(x, mid, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // خط الزمن الخافت
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(243,237,225,0.1)'
      ctx.fillRect(0, mid - 0.5, W, 1)

      if (!reduced) raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    if (reduced) draw(0)
    else raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [seed])

  return <canvas ref={ref} className="rhythm-canvas" aria-hidden="true" />
}
