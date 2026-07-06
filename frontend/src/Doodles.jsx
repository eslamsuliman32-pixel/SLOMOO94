/* Doodles.jsx — مكتبة رسومات «زين مقام» اليدوية
   كل رسمة SVG بخط حبر حر (stroke) بلا تعبئة، تتلون بـ currentColor.
   الأسلوب: خطوط مرتجفة قليلًا، أطراف دائرية، بساطة الدودل التوضيحي. */

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const Mic = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <ellipse cx="32" cy="18" rx="11" ry="12" />
    <path d="M23 14 Q32 18 41 14 M22 20 Q32 24 42 20" strokeWidth="1.8" />
    <path d="M27 29 L29 44 Q32 47 35 44 L37 29" />
    <path d="M32 47 L32 56 M24 57 Q32 61 40 57" />
  </g></svg>
)

export const Pen = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <path d="M14 50 L40 24 L48 32 L22 58 L12 60 Z" />
    <path d="M40 24 L46 18 Q50 14 54 18 Q58 22 54 26 L48 32" />
    <path d="M14 50 L18 54" strokeWidth="1.8" />
    <path d="M8 40 Q14 34 10 28 Q6 22 12 18" strokeWidth="1.8" strokeDasharray="1 5" />
  </g></svg>
)

export const Notebook = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <rect x="14" y="10" width="38" height="46" rx="3" />
    <path d="M14 18 L10 18 M14 28 L10 28 M14 38 L10 38 M14 48 L10 48" />
    <path d="M22 22 L44 22 M22 30 L40 30 M22 38 L44 38 M22 46 L36 46" strokeWidth="1.8" />
  </g></svg>
)

export const Boombox = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <rect x="6" y="22" width="52" height="30" rx="4" />
    <circle cx="19" cy="37" r="8" /><circle cx="19" cy="37" r="2.5" />
    <circle cx="45" cy="37" r="8" /><circle cx="45" cy="37" r="2.5" />
    <path d="M24 14 Q32 8 40 14" />
    <rect x="28" y="28" width="8" height="5" strokeWidth="1.8" />
  </g></svg>
)

export const Cassette = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <rect x="8" y="16" width="48" height="32" rx="3" />
    <rect x="16" y="22" width="32" height="12" rx="2" strokeWidth="1.8" />
    <circle cx="23" cy="28" r="3.5" /><circle cx="41" cy="28" r="3.5" />
    <path d="M18 48 L22 40 L42 40 L46 48" strokeWidth="1.8" />
  </g></svg>
)

export const Spray = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <rect x="22" y="22" width="18" height="34" rx="4" />
    <rect x="26" y="14" width="10" height="8" strokeWidth="2.2" />
    <path d="M29 10 L33 10" />
    <path d="M44 12 L48 8 M46 18 L52 16 M46 24 L50 26" strokeWidth="1.8" />
    <path d="M26 34 Q31 30 36 34" strokeWidth="1.8" />
  </g></svg>
)

export const Headphones = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <path d="M12 40 L12 32 Q12 12 32 12 Q52 12 52 32 L52 40" />
    <rect x="8" y="38" width="10" height="16" rx="4" />
    <rect x="46" y="38" width="10" height="16" rx="4" />
  </g></svg>
)

export const Wave = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <path d="M6 32 L12 32 L16 20 L22 44 L28 14 L34 50 L40 24 L46 38 L52 30 L58 32" />
  </g></svg>
)

export const Search = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <circle cx="27" cy="27" r="15" />
    <path d="M38 38 L52 52" />
    <path d="M20 24 Q24 18 30 20" strokeWidth="1.8" />
  </g></svg>
)

export const Star = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <path d="M32 8 L37 24 L54 25 L40 35 L46 52 L32 42 L18 52 L24 35 L10 25 L27 24 Z" />
  </g></svg>
)

export const Bubble = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <path d="M10 14 Q8 12 12 10 L50 10 Q56 10 55 16 L54 36 Q54 42 48 42 L26 42 L14 54 L17 42 L14 42 Q8 42 9 36 Z" />
    <path d="M20 22 L44 22 M20 30 L38 30" strokeWidth="1.8" />
  </g></svg>
)

export const Grid = (p) => (
  <svg viewBox="0 0 64 64" {...p}><g {...S}>
    <path d="M8 44 L56 44" />
    <circle cx="14" cy="44" r="3" fill="currentColor" />
    <path d="M22 40 L30 40" strokeWidth="4" />
    <circle cx="38" cy="44" r="3" fill="currentColor" />
    <circle cx="46" cy="44" r="3" fill="currentColor" />
    <path d="M50 40 L58 40" strokeWidth="4" />
    <path d="M14 44 L14 20 M38 44 L38 28 M46 44 L46 24" strokeWidth="1.6" strokeDasharray="2 4" />
  </g></svg>
)

export const ArrowNext = (p) => (
  /* سهم يدوي يشير لليسار (اتجاه التدفق في RTL) */
  <svg viewBox="0 0 64 32" {...p}><g {...S}>
    <path d="M56 16 Q36 10 10 16" />
    <path d="M18 8 L8 16 L19 22" />
  </g></svg>
)

export const Underline = (p) => (
  <svg viewBox="0 0 200 14" preserveAspectRatio="none" {...p}>
    <path d="M4 8 Q50 2 100 8 Q150 14 196 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

const DOODLES = { Mic, Pen, Notebook, Boombox, Cassette, Spray, Headphones, Wave, Search, Star, Bubble, Grid }

export function Doodle({ name, className, title }) {
  const C = DOODLES[name] || Star
  return <C className={className} role="img" aria-label={title || name} />
}

/** شريط زين توضيحي: خطوات مرسومة تشرح منهجية الأداة — الرسم كأداة فهم لا زينة */
export function ZineStrip({ title, steps }) {
  return (
    <div className="zine-strip">
      {title && <div className="zine-strip-title">{title}</div>}
      <div className="zine-strip-row">
        {steps.map((s, i) => (
          <div className="zine-strip-item" key={i}>
            <div className="zine-panel wob" style={{ '--tilt': `${(i % 2 ? -1 : 1) * (1 + i * 0.3)}deg` }}>
              <Doodle name={s.icon} className="zine-panel-icon" title={s.title} />
              <div className="zine-panel-num">{['١', '٢', '٣', '٤', '٥'][i] || i + 1}</div>
              <div className="zine-panel-title">{s.title}</div>
              {s.text && <div className="zine-panel-text">{s.text}</div>}
            </div>
            {i < steps.length - 1 && <ArrowNext className="zine-arrow" />}
          </div>
        ))}
      </div>
    </div>
  )
}
