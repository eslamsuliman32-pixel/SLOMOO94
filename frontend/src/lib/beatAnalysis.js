// lib/beatAnalysis.js — محرك التحليل الطيفي الحقيقي (مُنقول حرفيًا من محلل البيت الحقيقي standalone)
// FFT مخصص (Cooley-Tukey) + STFT 1024/256 @22050Hz + كشف BPM/كيك/سنير/808 + تقسيم أقسام.
// لا بيانات وهمية — كل قيمة مقيسة من الطيف الفعلي. راجع محلل-البيت-الحقيقي-Beat-Analyzer.html للنسخة المرجعية المستقلة.

class FFT {
  constructor(n) {
    this.n = n
    this.cos = new Float32Array(n / 2)
    this.sin = new Float32Array(n / 2)
    for (let i = 0; i < n / 2; i++) { this.cos[i] = Math.cos(-2 * Math.PI * i / n); this.sin[i] = Math.sin(-2 * Math.PI * i / n) }
    this.rev = new Uint32Array(n)
    const bits = Math.log2(n)
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1); this.rev[i] = r }
  }
  transform(re, im) {
    const n = this.n, rev = this.rev
    for (let i = 0; i < n; i++) { const r = rev[i]; if (r > i) { let t = re[i]; re[i] = re[r]; re[r] = t; t = im[i]; im[i] = im[r]; im[r] = t } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + half; j++, k += step) {
          const c = this.cos[k], s = this.sin[k]
          const tre = re[j + half] * c - im[j + half] * s, tim = re[j + half] * s + im[j + half] * c
          re[j + half] = re[j] - tre; im[j + half] = im[j] - tim; re[j] += tre; im[j] += tim
        }
      }
    }
  }
}

function estimateTempo(env, fps) {
  const n = env.length, sm = new Float32Array(n)
  for (let i = 1; i < n - 1; i++) sm[i] = (env[i - 1] + env[i] + env[i + 1]) / 3
  const W = Math.round(fps * 1.2)
  const hp = new Float32Array(n)
  let run = 0; const q = []
  for (let i = 0; i < n; i++) { q.push(sm[i]); run += sm[i]; if (q.length > W) run -= q.shift(); hp[i] = Math.max(0, sm[i] - run / q.length) }
  let best = { bpm: 120, score: -1 }
  const scores = []
  for (let bpm = 60; bpm <= 180; bpm += 0.5) {
    const lag = fps * 60 / bpm; const L = Math.round(lag)
    if (L >= n - 1) continue
    let s = 0, c = 0
    for (let t = 0; t + L < n; t += 2) { s += hp[t] * hp[t + L]; c++ }
    s /= Math.max(1, c)
    const L2 = Math.round(lag * 2)
    if (L2 < n - 1) { let s2 = 0, c2 = 0; for (let t = 0; t + L2 < n; t += 4) { s2 += hp[t] * hp[t + L2]; c2++ } s += 0.5 * s2 / Math.max(1, c2) }
    scores.push(s)
    if (s > best.score) best = { bpm, score: s }
  }
  scores.sort((a, b) => b - a)
  const conf = scores.length > 1 ? Math.min(99, Math.round(100 * (1 - scores[1] / Math.max(1e-9, scores[0]))) + 55) : 70
  return { bpm: Math.round(best.bpm * 10) / 10, conf: Math.min(99, Math.max(40, conf)) }
}

function alignBeats(env, subE, subF, bpm, fps) {
  const period = fps * 60 / bpm, n = env.length
  let bestOff = 0, bestS = -1
  const step = Math.max(1, Math.floor(period / 48))
  for (let off = 0; off < period; off += step) {
    let s = 0
    for (let t = off; t < n; t += period) { const i = Math.round(t); if (i < n) s += env[i] + (env[i - 1] || 0) + (env[i + 1] || 0) }
    if (s > bestS) { bestS = s; bestOff = off }
  }
  const beats = []
  for (let t = bestOff; t < n; t += period) beats.push(t)
  let bestC = 0, bestE = -1
  for (let c = 0; c < 4; c++) {
    let e = 0
    for (let k = c; k < beats.length; k += 4) {
      const i = Math.round(beats[k])
      if (i < n) e += (subF[i] || 0) + (subF[i + 1] || 0) + (subF[i - 1] || 0) + 0.15 * (subE[i] || 0)
    }
    if (e > bestE) { bestE = e; bestC = c }
  }
  const raw = beats.slice(bestC)
  const rad = Math.max(2, Math.round(period * 0.12))
  const refined = []
  raw.forEach((bf) => {
    const c = Math.round(bf)
    let best = c, bestV = -1
    for (let j = Math.max(0, c - rad); j <= Math.min(n - 1, c + rad); j++) {
      const w = 1 - 0.5 * Math.abs(j - c) / rad
      const v = (env[j] + (subE[j] || 0) * 0.5) * w
      if (v > bestV) { bestV = v; best = j }
    }
    const t = best / fps
    if (!refined.length || t > refined[refined.length - 1] + (period / fps) * 0.5) refined.push(t)
    else refined.push(refined[refined.length - 1] + period / fps)
  })
  return refined
}

function pickPeaks(env, fps, minSep, k) {
  const n = env.length, W = Math.round(fps * 0.35), sepF = Math.round(minSep * fps)
  const peaks = []
  for (let i = 2; i < n - 2; i++) {
    if (env[i] > env[i - 1] && env[i] >= env[i + 1]) {
      let m = 0, c = 0
      for (let j = Math.max(0, i - W); j < Math.min(n, i + W); j++) { m += env[j]; c++ }
      m /= c
      let v = 0
      for (let j = Math.max(0, i - W); j < Math.min(n, i + W); j++) { const d = env[j] - m; v += d * d }
      const sd = Math.sqrt(v / c)
      if (env[i] > m + k * sd && env[i] > 1e-4) {
        if (peaks.length && i - peaks[peaks.length - 1].f < sepF) {
          if (env[i] > peaks[peaks.length - 1].v) peaks[peaks.length - 1] = { f: i, v: env[i] }
        } else peaks.push({ f: i, v: env[i] })
      }
    }
  }
  return peaks
}
function median(a) { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 0 }

function classifyHits(env, fps) {
  const kickCand = pickPeaks(env.subF, fps, 0.09, 1.5)
  const highMed = median(env.highF), midMed = median(env.midF)
  const kickP = kickCand.filter((p) => env.subF[p.f] > env.highF[p.f] * 0.35)
  const snMix = new Float32Array(env.highF.length)
  for (let i = 0; i < snMix.length; i++) snMix[i] = env.highF[i] * 0.65 + env.midF[i] * 0.35
  const snCand = pickPeaks(snMix, fps, 0.10, 1.6)
  const snare = snCand.filter((p) => {
    if (env.midF[p.f] <= midMed * 1.8) return false
    if (env.highF[p.f] <= highMed * 1.3) return false
    const nearKick = kickP.some((k) => Math.abs(k.f - p.f) < fps * 0.04)
    if (nearKick && env.subF[p.f] > env.highF[p.f] * 2) return false
    return true
  })
  const rawP = pickPeaks(env.totF, fps, 0.07, 1.5)
  const e808 = []
  const sus1 = Math.round(fps * 0.05), sus2 = Math.round(fps * 0.38)
  kickP.forEach((p) => {
    let peakE = 1e-9
    for (let j = Math.max(0, p.f - 2); j < Math.min(env.subE.length, p.f + 4); j++) peakE = Math.max(peakE, env.subE[j])
    let s = 0, c = 0
    for (let j = p.f + sus1; j < Math.min(env.subE.length, p.f + sus2); j++) { s += env.subE[j]; c++ }
    if (c > 0 && (s / c) / peakE > 0.30) e808.push(p)
  })
  const toSec = (arr) => arr.map((p) => p.f / fps)
  return { kick: toSec(kickP), snare: toSec(snare), e808: toSec(e808), raw: toSec(rawP) }
}

function buildBars(beats, hits, bpm, durationSec) {
  const beatDur = 60 / bpm, dur = durationSec
  const bt = [...beats]
  while (bt[0] - 4 * beatDur > -beatDur * 0.6) { for (let j = 1; j <= 4; j++) bt.unshift(bt[0] - beatDur) }
  while (bt[0] < -beatDur * 0.5) bt.shift()
  if (bt[0] < 0) bt[0] = 0
  while (bt[bt.length - 1] < dur) bt.push(bt[bt.length - 1] + beatDur)
  while ((bt.length - 1) % 4 !== 0) bt.push(bt[bt.length - 1] + beatDur)
  const bars = []
  for (let b = 0; b * 4 < bt.length - 1; b++) {
    const k0 = b * 4
    if (bt[k0] >= dur) break
    const slotTimes = []
    for (let i = 0; i < 16; i++) {
      const bi = k0 + Math.floor(i / 4)
      const t0 = bt[bi], t1 = bt[bi + 1] !== undefined ? bt[bi + 1] : t0 + beatDur
      slotTimes.push(t0 + (i % 4) / 4 * (t1 - t0))
    }
    const end = bt[k0 + 4] !== undefined ? bt[k0 + 4] : slotTimes[15] + (slotTimes[15] - slotTimes[14])
    bars.push({ idx: b, start: bt[k0], end, slotTimes, slots: Array.from({ length: 16 }, () => ({ kick: false, snare: false, e808: false, raw: false })) })
  }
  while (bars.length > 1) {
    const last = bars[bars.length - 1]
    if (last.start > dur - (last.end - last.start) * 0.25) bars.pop(); else break
  }
  bars.forEach((b, i) => { b.idx = i })
  const flat = []
  bars.forEach((b) => b.slotTimes.forEach((t, s) => flat.push({ t, b: b.idx, s })))
  const assign = (times, key) => {
    times.forEach((t) => {
      let lo = 0, hi = flat.length - 1
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (flat[m].t < t) lo = m; else hi = m }
      const cand = Math.abs(flat[lo].t - t) < Math.abs(flat[hi].t - t) ? flat[lo] : flat[hi]
      const slotDur = (bars[cand.b].end - bars[cand.b].start) / 16
      if (Math.abs(cand.t - t) < slotDur * 0.6) bars[cand.b].slots[cand.s][key] = true
    })
  }
  assign(hits.kick, 'kick'); assign(hits.snare, 'snare'); assign(hits.e808, 'e808'); assign(hits.raw, 'raw')
  return bars
}

function segment(bars, rmsF, subE, highF, fps) {
  if (!bars.length) return []
  const feats = bars.map((b) => {
    const f0 = Math.round(b.start * fps), f1 = Math.min(rmsF.length, Math.round(b.end * fps))
    let r = 0, s = 0, h = 0, c = Math.max(1, f1 - f0)
    for (let i = f0; i < f1; i++) { r += rmsF[i] || 0; s += subE[i] || 0; h += highF[i] || 0 }
    const on = b.slots.filter((x) => x.raw).length
    return [r / c, s / c, h / c, on / 16]
  })
  for (let d = 0; d < 4; d++) {
    let m = 0; feats.forEach((f) => { m += f[d] }); m /= feats.length
    let v = 0; feats.forEach((f) => { v += (f[d] - m) ** 2 }); const sd = Math.sqrt(v / feats.length) || 1
    feats.forEach((f) => { f[d] = (f[d] - m) / sd })
  }
  const nov = [0]
  for (let i = 1; i < feats.length; i++) {
    let d = 0; for (let k = 0; k < 4; k++) d += (feats[i][k] - feats[i - 1][k]) ** 2
    nov.push(Math.sqrt(d))
  }
  let m = 0; nov.forEach((x) => { m += x }); m /= nov.length
  let v = 0; nov.forEach((x) => { v += (x - m) ** 2 }); const sd = Math.sqrt(v / nov.length) || 1
  const bounds = [0]
  for (let i = 2; i < nov.length; i++) { if (nov[i] > m + 0.5 * sd && i - bounds[bounds.length - 1] >= 2) bounds.push(i) }
  const secs = []
  const rmsAll = feats.map((f) => f[0])
  const maxR = Math.max(...rmsAll), minR = Math.min(...rmsAll)
  for (let i = 0; i < bounds.length; i++) {
    const from = bounds[i], to = (i + 1 < bounds.length ? bounds[i + 1] : bars.length) - 1
    let e = 0; for (let b = from; b <= to; b++) e += rmsAll[b]
    e /= (to - from + 1)
    const lvl = maxR > minR ? (e - minR) / (maxR - minR) : 0.5
    secs.push({ idx: i, from, to, level: lvl, tag: lvl > 0.66 ? 'مرتفع' : lvl > 0.33 ? 'متوسط' : 'هادئ' })
  }
  return secs
}

/**
 * التحليل الكامل: mono Float32Array مُعاد أخذ عيناته إلى sr (عادة 22050 أحادي)، durationSec بالثواني.
 * onProgress(label, pct) اختياري — يُستدعى دوريًا أثناء STFT.
 * يُعيد {bpm, conf, beats, bars, sections, counts} — نفس شكل S.analysis في الأداة المستقلة.
 */
export async function analyzeMono(mono, sr, durationSec, onProgress = () => {}) {
  const N = 1024, hop = 256
  const fps = sr / hop
  const frames = Math.max(1, Math.floor((mono.length - N) / hop))
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)
  const fft = new FFT(N), bins = N / 2
  const binOf = (hz) => Math.max(1, Math.min(bins - 1, Math.round(hz * N / sr)))
  const B = { sub: [binOf(25), binOf(120)], kx: [binOf(120), binOf(160)], sb: [binOf(160), binOf(350)], mid: [binOf(350), binOf(2000)], high: [binOf(3500), binOf(9000)] }

  const subE = new Float32Array(frames), subF = new Float32Array(frames),
    midF = new Float32Array(frames), highF = new Float32Array(frames),
    totF = new Float32Array(frames), rmsF = new Float32Array(frames)
  const re = new Float32Array(N), im = new Float32Array(N), mag = new Float32Array(bins), prev = new Float32Array(bins)

  const CHUNK = 500
  for (let f = 0; f < frames; f++) {
    const o = f * hop
    let rms = 0
    for (let i = 0; i < N; i++) { const v = mono[o + i] * win[i]; re[i] = v; im[i] = 0; rms += v * v }
    rmsF[f] = Math.sqrt(rms / N)
    fft.transform(re, im)
    for (let i = 0; i < bins; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
    let se = 0, sf = 0, mf = 0, hf = 0, tf = 0
    for (let i = B.sub[0]; i < B.sub[1]; i++) { se += mag[i]; const d = mag[i] - prev[i]; if (d > 0) sf += d }
    for (let i = B.kx[0]; i < B.kx[1]; i++) { const d = mag[i] - prev[i]; if (d > 0) sf += d * 0.4 }
    for (let i = B.sb[0]; i < B.sb[1]; i++) { const d = mag[i] - prev[i]; if (d > 0) mf += d * 0.8 }
    for (let i = B.mid[0]; i < B.mid[1]; i++) { const d = mag[i] - prev[i]; if (d > 0) mf += d }
    for (let i = B.high[0]; i < B.high[1]; i++) { const d = mag[i] - prev[i]; if (d > 0) hf += d }
    for (let i = 1; i < bins; i++) { const d = mag[i] - prev[i]; if (d > 0) tf += d; prev[i] = mag[i] }
    subE[f] = se; subF[f] = sf; midF[f] = mf; highF[f] = hf; totF[f] = tf
    if (f % CHUNK === 0) {
      onProgress('التحليل الطيفي STFT ... إطار ' + f + ' / ' + frames, 8 + Math.round(52 * f / frames))
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  onProgress('تقدير الإيقاع (Autocorrelation) ...', 64)
  await new Promise((r) => setTimeout(r, 0))
  const { bpm, conf } = estimateTempo(totF, fps)

  onProgress('محاذاة شبكة النبضات والداونبيت ...', 72)
  await new Promise((r) => setTimeout(r, 0))
  const beats = alignBeats(totF, subE, subF, bpm, fps)

  onProgress('كشف الكيك والسنير والـ808 ...', 80)
  await new Promise((r) => setTimeout(r, 0))
  const hits = classifyHits({ subF, midF, highF, totF, subE }, fps)

  onProgress('بناء البارات وتوزيع الضربات على الشبكة ...', 88)
  await new Promise((r) => setTimeout(r, 0))
  const bars = buildBars(beats, hits, bpm, durationSec)

  onProgress('تقسيم الأقسام (Novelty Segmentation) ...', 94)
  await new Promise((r) => setTimeout(r, 0))
  const sections = segment(bars, rmsF, subE, highF, fps)

  onProgress('اكتمل التحليل', 100)
  return {
    bpm, conf, beats, bars, sections, hits, durationSec,
    counts: { kick: hits.kick.length, snare: hits.snare.length, e808: hits.e808.length, raw: hits.raw.length },
  }
}

/**
 * إعادة بناء البارات على BPM جديد (نصف/ضعف) — لغموض الأوكتاف الشائع في أي كاشف إيقاع تلقائي.
 * يطابق سلوك reGrid() في الأداة المستقلة: لا يُعاد حساب الأقسام (segment) هنا أيضًا — نفس السلوك الأصلي.
 */
export function rebuildAtBpm(analysis, factor) {
  let beats = [...analysis.beats]
  if (factor > 1) {
    const nb = []
    for (let i = 0; i < beats.length - 1; i++) { nb.push(beats[i], (beats[i] + beats[i + 1]) / 2) }
    nb.push(beats[beats.length - 1]); beats = nb
  } else {
    beats = beats.filter((_, i) => i % 2 === 0)
  }
  const bpm = Math.round(analysis.bpm * factor * 10) / 10
  const bars = buildBars(beats, analysis.hits, bpm, analysis.durationSec)
  return { ...analysis, bpm, beats, bars }
}

const BEAT_PROFILE_SCHEMA_VERSION = '1.0'

/**
 * يحوّل ناتج analyzeMono إلى مخطط maqam.beatProfile الموحّد (نفس شكل buildBeatProfile()
 * في الأداة المستقلة) — يسمح بإعادة استخدام كل منطق العرض والتصدير دون تغيير.
 */
export function buildProfileFromAnalysis(analysis, { filename = null, sampleRateAnalysis = 22050 } = {}) {
  const beatDur = 60 / analysis.bpm
  return {
    schema: 'maqam.beatProfile',
    schemaVersion: BEAT_PROFILE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: 'Maqam Beat Analyzer (in-app, STFT/Autocorrelation, real spectral data — no synthetic values)',
    source: { filename, durationSec: +analysis.durationSec.toFixed(4), sampleRateAnalysis },
    tempo: { bpm: analysis.bpm, confidencePercent: analysis.conf, beatDurationSec: +beatDur.toFixed(6) },
    grid: { slotsPerBar: 16, subdivisionLabels: ['1', 'e', '+', 'a'], subdivisionLabelsAr: ['١', 'ي', 'و', 'ع'] },
    detectionCounts: { ...analysis.counts },
    sections: analysis.sections.map((s) => ({
      index: s.idx, fromBar: s.from, toBar: s.to, barsCount: s.to - s.from + 1,
      energyLevel: +s.level.toFixed(3), tag: s.tag,
    })),
    bars: analysis.bars.map((b) => ({
      index: b.idx, startSec: +b.start.toFixed(6), endSec: +b.end.toFixed(6),
      slotTimesSec: b.slotTimes.map((t) => +t.toFixed(6)),
      slots: b.slots.map((sl, i) => ({
        index: i, beat: Math.floor(i / 4) + 1, subdivision: ['1', 'e', '+', 'a'][i % 4],
        kick: sl.kick, snare: sl.snare, e808: sl.e808, rawOnset: sl.raw,
      })),
    })),
    lyrics: null,
  }
}
