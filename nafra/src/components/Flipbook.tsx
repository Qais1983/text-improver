import { useEffect, useLayoutEffect, useRef } from "react";
import { PageFlip } from "page-flip";
import type { BookPage } from "../lib/types";
import { PageView, pageClass, pageLabel } from "../pages/PageView";
import { renderToStaticMarkup } from "react-dom/server";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

interface Props {
  pages: BookPage[];
  startPage: number;
  onFlip: (page: number) => void;
  onInit: (api: FlipApi) => void;
  reducedMotion: boolean;
}

export interface FlipApi {
  next: () => void;
  prev: () => void;
  goto: (index: number) => void;
  getIndex: () => number;
  getCount: () => number;
}

// أنواع الصفحات ذات الكرتون الصلب (الغلاف والغلاف الخلفي).
const HARD = new Set(["COVER", "BACK_COVER"]);

// عرض الصفحة الواحدة نسبةً إلى ارتفاعها (سقف يمنع اتساعاً مفرطاً على اللوحيات).
const PAGE_W_FACTOR = 0.66;
const MIN_SPREAD_PAGE = 320;

function computeBox(stage: HTMLElement) {
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;

  // الصفحة تملأ الارتفاع المتاح (المسرح مُزاح أصلاً أسفل شريط الأدوات).
  const h = Math.round(sh);

  // فرش من صفحتين في الأفق فقط إذا بقيت الصفحة الواحدة مقروءة (>=320px).
  const halfW = Math.min(sw / 2, h * PAGE_W_FACTOR);
  const canSpread = sw > sh && halfW >= MIN_SPREAD_PAGE;

  if (canSpread) {
    const single = Math.round(halfW);
    return { w: single * 2, h, single, portrait: false };
  }
  const single = Math.round(Math.min(sw, h * PAGE_W_FACTOR));
  return { w: single, h, single, portrait: true };
}

export function Flipbook({ pages, startPage, onFlip, onInit, reducedMotion }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const lastPortrait = useRef<boolean | null>(null);

  // HTML ثابت لكل الصفحات (يُولَّد مرة واحدة، خارج شجرة React الحيّة).
  const html = useRef<string>("");
  if (!html.current) {
    html.current = pages
      .map((p) => {
        const density = HARD.has(p.type) ? "hard" : "soft";
        return `<div class="page ${pageClass(p)}" data-density="${density}" role="group" aria-label="${escapeAttr(
          pageLabel(p)
        )}">${renderToStaticMarkup(<PageView page={p} />)}</div>`;
      })
      .join("");
  }

  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const bookEl = bookRef.current!;
    bookEl.innerHTML = html.current;

    const { w, h, single, portrait } = computeBox(stage);
    bookEl.style.width = `${w}px`;
    bookEl.style.height = `${h}px`;
    lastPortrait.current = portrait;

    // نمرّر أبعاد الصفحة الفعلية كي تتبع الورقة نسبة الجهاز وتملأ الارتفاع المتاح.
    const flip = new PageFlip(bookEl, {
      width: single,
      height: h,
      size: "stretch",
      minWidth: 240,
      maxWidth: 2000,
      minHeight: 360,
      maxHeight: 2400,
      drawShadow: !reducedMotion,
      maxShadowOpacity: 0.55,
      flippingTime: reducedMotion ? 380 : 1050,
      usePortrait: true,
      autoSize: false,
      showCover: true,
      swipeDistance: 18,
      showPageCorners: true,
      clickEventForward: true,
      useMouseEvents: true,
      mobileScrollSupport: false,
    });

    flip.loadFromHTML(bookEl.querySelectorAll(".page"));
    flipRef.current = flip;

    // الانتقال إلى صفحة البداية دون حركة.
    if (startPage > 0) {
      try {
        flip.turnToPage(startPage);
      } catch {
        /* تجاهل حدود غير صالحة */
      }
    }

    flip.on("flip", (e) => onFlip(e.data as number));

    const api: FlipApi = {
      next: () => flip.flipNext(),
      prev: () => flip.flipPrev(),
      goto: (index: number) => flip.flip(index),
      getIndex: () => flip.getCurrentPageIndex(),
      getCount: () => flip.getPageCount(),
    };
    onInit(api);

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const box = computeBox(stage);
        bookEl.style.width = `${box.w}px`;
        bookEl.style.height = `${box.h}px`;
        try {
          flip.update({ width: box.single, height: box.h });
        } catch {
          /* تجاهل */
        }
        lastPortrait.current = box.portrait;
      });
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(stage);
    window.addEventListener("orientationchange", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", onResize);
      cancelAnimationFrame(raf);
      try {
        flip.destroy();
      } catch {
        /* تجاهل */
      }
      flipRef.current = null;
    };
    // تُهيّأ مرة واحدة؛ المحتوى ثابت.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--flip-time",
      reducedMotion ? "380ms" : "1050ms"
    );
  }, [reducedMotion]);

  return (
    <div className="book-stage" ref={stageRef}>
      <div id="book" ref={bookRef} />
    </div>
  );
}
