// صوت تقليب ورقيّ واقعيّ مُولَّد آنياً عبر Web Audio API — بلا ملفات، يعمل Offline.
// "حَفيف" ورقة: ضجيج أبيض مُشكَّل يمرّ بمرشّح نطاقيّ يهبط تردده، بمغلّف سريع.

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  // يُستأنف داخل إيماءة المستخدم (السحب/النقر) فيُفكّ قفل الصوت.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  if (v) getCtx(); // تهيئة/استئناف مبكّر ضمن الإيماءة
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** يشغّل حَفيف تقليب صفحة واحدة. آمن للاستدعاء المتكرر؛ يتجاهل إن كان الصوت مكتوماً. */
export function playFlip(): void {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;

  const now = ac.currentTime;
  const dur = 0.24 + Math.random() * 0.07;

  const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    // ضجيج يخفت تدريجياً مع نبضة أكثف في البداية (لحظة انفصال الورقة)
    const envShape = Math.pow(1 - t, 1.6);
    data[i] = (Math.random() * 2 - 1) * envShape;
  }

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 380;

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  const f0 = 1700 + Math.random() * 700;
  bp.frequency.setValueAtTime(f0, now);
  bp.frequency.exponentialRampToValueAtTime(650, now + dur);
  bp.Q.value = 0.7;

  const gain = ac.createGain();
  const peak = 0.16 + Math.random() * 0.05;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  src.connect(hp);
  hp.connect(bp);
  bp.connect(gain);
  gain.connect(ac.destination);

  src.start(now);
  src.stop(now + dur);
}
