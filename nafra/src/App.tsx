import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flipbook, type FlipApi } from "./components/Flipbook";
import { Toolbar } from "./components/Toolbar";
import { Toc } from "./components/Toc";
import { Hint } from "./components/Hint";
import { buildToc } from "./lib/toc";
import { playFlip, setSoundEnabled } from "./lib/flipSound";
import bookPages from "./content/book-pages.json";
import type { BookPage } from "./lib/types";

const LS_PAGE = "nafra.lastPage";
const LS_HINT = "nafra.hintSeen";
const LS_SOUND = "nafra.sound";

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* تجاهل */
  }
}

export default function App() {
  const pages = bookPages as BookPage[];
  const toc = useMemo(() => buildToc(pages), [pages]);
  const total = pages.length;

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const startPage = useMemo(() => {
    const saved = parseInt(readLS(LS_PAGE) || "", 10);
    return Number.isFinite(saved) && saved > 0 && saved < total ? saved : 0;
  }, [total]);

  const apiRef = useRef<FlipApi | null>(null);
  const [current, setCurrent] = useState(startPage);
  const [tocOpen, setTocOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => !readLS(LS_HINT) && startPage === 0);
  const [dim, setDim] = useState(false);
  const dimTimer = useRef<number | undefined>(undefined);
  const [announce, setAnnounce] = useState("");

  // صوت التقليب — مفعّل افتراضياً، مع إمكان الكتم والحفظ.
  const [soundOn, setSoundOn] = useState(() => readLS(LS_SOUND) !== "0");
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);
  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      const next = !v;
      writeLS(LS_SOUND, next ? "1" : "0");
      setSoundEnabled(next);
      return next;
    });
  }, []);

  const onInit = useCallback((api: FlipApi) => {
    apiRef.current = api;
  }, []);

  const onFlip = useCallback(
    (page: number) => {
      playFlip();
      setCurrent(page);
      writeLS(LS_PAGE, String(page));
      if (showHint) {
        setShowHint(false);
        writeLS(LS_HINT, "1");
      }
      const p = pages[page];
      if (p) setAnnounce(`صفحة ${parseInt(p.id, 10)} من ${total}`);
    },
    [pages, total, showHint]
  );

  // تعتيم الأدوات تلقائياً بعد سكون، وإظهارها عند اللمس.
  const wake = useCallback(() => {
    setDim(false);
    window.clearTimeout(dimTimer.current);
    dimTimer.current = window.setTimeout(() => setDim(true), 3200);
  }, []);
  useEffect(() => {
    wake();
    const onAny = () => wake();
    window.addEventListener("pointerdown", onAny);
    return () => {
      window.removeEventListener("pointerdown", onAny);
      window.clearTimeout(dimTimer.current);
    };
  }, [wake]);

  const goto = useCallback((index: number) => {
    apiRef.current?.goto(index);
    setTocOpen(false);
  }, []);

  const restart = useCallback(() => {
    apiRef.current?.goto(0);
    setTocOpen(false);
  }, []);

  const share = useCallback(async () => {
    const data = {
      title: "النّفرة — سيرة الرِّكيب",
      text: "سيرة نفرة أهل الرِّكيب لشراء محوّل الكهرباء.",
      url: location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(location.href);
        setAnnounce("نُسخ الرابط");
      }
    } catch {
      /* أُلغيت المشاركة */
    }
  }, []);

  const [isFull, setIsFull] = useState(false);
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFull(true);
      } else {
        await document.exitFullscreen();
        setIsFull(false);
      }
    } catch {
      /* غير مدعوم — التطبيق يعمل بدونه */
    }
  }, []);
  useEffect(() => {
    const h = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // تنقّل بلوحة المفاتيح (سطح المكتب) مع مراعاة اتجاه RTL.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tocOpen) {
        if (e.key === "Escape") setTocOpen(false);
        return;
      }
      if (e.key === "ArrowLeft") apiRef.current?.next();
      else if (e.key === "ArrowRight") apiRef.current?.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tocOpen]);

  // ---- التكبير: 1x → 1.5x → 2x → 1x، مع سحب للتنقّل وتعطيل التقليب أثناءه ----
  const ZOOMS = [1, 1.5, 2];
  const [zoomIdx, setZoomIdx] = useState(0);
  const zoom = ZOOMS[zoomIdx];
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const cycleZoom = useCallback(() => {
    setZoomIdx((i) => {
      const next = (i + 1) % ZOOMS.length;
      if (ZOOMS[next] === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const clampPan = useCallback(
    (x: number, y: number, z: number) => {
      const stage = document.querySelector(".book-stage") as HTMLElement | null;
      const w = stage?.clientWidth ?? window.innerWidth;
      const h = stage?.clientHeight ?? window.innerHeight;
      const mx = (w * (z - 1)) / 2;
      const my = (h * (z - 1)) / 2;
      return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
    },
    []
  );

  const onCatcherDown = useCallback(
    (e: React.PointerEvent) => {
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pan]
  );
  const onCatcherMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panStart.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan(clampPan(panStart.current.px + dx, panStart.current.py + dy, zoom));
    },
    [zoom, clampPan]
  );
  const onCatcherUp = useCallback(() => {
    panStart.current = null;
  }, []);

  const humanPage = parseInt(pages[current]?.id || "1", 10);

  return (
    <div className="app-shell">
      <div
        className={`zoom-layer ${zoom > 1 ? "zoomed" : ""}`}
        style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
      >
        <Flipbook
          pages={pages}
          startPage={startPage}
          onFlip={onFlip}
          onInit={onInit}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* عند التكبير: طبقة تلتقط السحب وتمنع التقليب العشوائي */}
      {zoom > 1 && (
        <div
          className="zoom-catcher"
          onPointerDown={onCatcherDown}
          onPointerMove={onCatcherMove}
          onPointerUp={onCatcherUp}
          onPointerCancel={onCatcherUp}
          aria-hidden="true"
        />
      )}

      <Toolbar
        dim={dim}
        isFull={isFull}
        onToc={() => setTocOpen(true)}
        onShare={share}
        onFullscreen={toggleFullscreen}
        onPrev={() => apiRef.current?.prev()}
        onNext={() => apiRef.current?.next()}
        onZoom={cycleZoom}
        zoomLabel={zoom > 1 ? `تكبير ${zoom}×` : "تكبير"}
        soundOn={soundOn}
        onSound={toggleSound}
      />

      <div className={`page-indicator ${dim ? "dim" : ""}`}>
        {humanPage} / {total}
      </div>

      {showHint && <Hint />}
      {tocOpen && (
        <Toc entries={toc} current={current} onGoto={goto} onClose={() => setTocOpen(false)} onRestart={restart} />
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
