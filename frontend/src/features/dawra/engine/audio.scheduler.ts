/**
 * مقام · المجدول الزمني الاستباقي
 * SPEC-04 §6 — الميلان (μ) يُطبَّق على مستوى الجدولة لا العرض.
 *
 * لماذا lookahead بدل setTimeout المباشر:
 * setTimeout يتراكم انزياحه (drift) حتى يفقد التزامن بعد ثوانٍ.
 * المجدول يحجز الأحداث مسبقاً على ساعة AudioContext الدقيقة.
 */
import type { Node, GridKind, Power } from '../types';
import { stepsPerBeat } from '../constants';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

export interface SchedulerOptions {
  getNodes: () => Node[];
  getBpm: () => number;
  getGrid: () => GridKind;
  onStep: (index: number) => void;
}

export class CycleScheduler {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private cursor = 0;
  private opts: SchedulerOptions;

  constructor(opts: SchedulerOptions) {
    this.opts = opts;
  }

  private ac(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  /** نقرة المترونوم — نقرة جافة، بلا موسيقى تخدع الأذن */
  private click(t: number, strong: boolean): void {
    const ac = this.ac();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square';
    o.frequency.value = strong ? 1650 : 1050;
    g.gain.setValueAtTime(strong ? 0.15 : 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.045);
  }

  /** ضربة المقطع — سعتها تتبع القوة ٠–٣ */
  private hit(t: number, v: Power): void {
    const ac = this.ac();
    const o = ac.createOscillator();
    const g = ac.createGain();
    const f = ac.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.setValueAtTime(215 + v * 95, t);
    o.frequency.exponentialRampToValueAtTime(88, t + 0.09);
    f.type = 'lowpass';
    f.frequency.value = 1350 + v * 900;
    const amp = [0, 0.09, 0.19, 0.33][v];
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(f).connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.15);
  }

  private stepDuration(): number {
    return 60 / this.opts.getBpm() / stepsPerBeat(this.opts.getGrid());
  }

  private tick = (): void => {
    const nodes = this.opts.getNodes();
    const grid = this.opts.getGrid();
    const total = nodes.length;
    if (!total) return;
    const spb = stepsPerBeat(grid);
    const ac = this.ac();

    while (this.nextTime < ac.currentTime + SCHEDULE_AHEAD_S) {
      const i = this.cursor % total;
      const nd = nodes[i];
      const st = (i % grid) + 1;

      if ((st - 1) % spb === 0) this.click(this.nextTime, st === 1);
      // الميلان يُزيح الضربة عن الشبكة، والمترونوم يبقى ثابتاً
      if (nd && nd.v > 0) this.hit(this.nextTime + nd.mu / 1000, nd.v);

      const at = this.nextTime;
      const idx = i;
      setTimeout(
        () => this.opts.onStep(idx),
        Math.max(0, (at - ac.currentTime) * 1000)
      );

      this.nextTime += this.stepDuration();
      this.cursor++;
    }
  };

  start(): void {
    if (this.timer) return;
    void this.ac().resume();
    this.cursor = 0;
    this.nextTime = this.ac().currentTime + 0.08;
    this.timer = setInterval(this.tick, LOOKAHEAD_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.opts.onStep(-1);
  }

  get running(): boolean {
    return this.timer !== null;
  }

  /** يُستدعى عند تفكيك المكوّن */
  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
