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

const FIT_FLOOR = 0.8;

/**
 * يحسب معامل --fit لكلّ صفحةٍ عبر قياسٍ خارج الشاشة (مستقلٍّ عن StPageFlip)،
 * بعرض صفحةٍ واحدة (single) وارتفاعها (h)، ثمّ يطبّقه على الصفحات الحقيقية.
 * يُنفَّذ بعد جهوز الخطوط كي يكون القياس صحيحاً.
 */
function computeFits(pageHtml: string[], single: number, h: number): number[] {
  const host = document.createElement("div");
  host.style.cssText =
    `position:absolute;left:-99999px;top:0;width:${single}px;height:${h}px;` +
    `visibility:hidden;pointer-events:none;`;
  host.dir = "rtl";
  document.body.appendChild(host);
  const fits = pageHtml.map((phtml) => {
    host.innerHTML = phtml;
    const page = host.firstElementChild as HTMLElement;
    page.style.width = `${single}px`;
    page.style.height = `${h}px`;
    const inner = page.firstElementChild as HTMLElement | null;
    let fit = 1;
    if (inner) {
      for (let i = 0; i < 6; i++) {
        if (inner.scrollHeight <= page.clientHeight + 1) break;
        fit = Math.max(FIT_FLOOR, fit - 0.04);
        page.style.setProperty("--fit", String(fit));
        if (fit <= FIT_FLOOR) break;
      }
    }
    return fit;
  });
  host.remove();
  return fits;
}

function applyFits(bookEl: HTMLElement, fits: number[]) {
  // يُضبط على .page-inner لا على .page، فمحرّك التقليب يمسح أنماط .page لا محتواها.
  const pages = bookEl.querySelectorAll<HTMLElement>(".page");
  pages.forEach((page, i) => {
    const inner = page.firstElementChild as HTMLElement | null;
    inner?.style.setProperty("--fit", String(fits[i] ?? 1));
  });
}

/**
 * يقيس الصفحات المرصوصة في #book (قبل تسليمها للمحرّك) بعرض صفحةٍ واحدة، ويخبز
 * معامل --fit في كلٍّ منها كي يتّسع محتواها ضمن ارتفاع الورقة.
 */
function fitStackedPages(bookEl: HTMLElement, single: number, h: number) {
  bookEl.style.width = `${single}px`;
  bookEl.style.height = "auto";
  bookEl.querySelectorAll<HTMLElement>(".page").forEach((page) => {
    page.style.height = `${h}px`;
    const inner = page.firstElementChild as HTMLElement | null;
    if (inner) {
      inner.style.setProperty("--fit", "1");
      let fit = 1;
      for (let i = 0; i < 6; i++) {
        if (inner.scrollHeight <= page.clientHeight + 1) break;
        fit = Math.max(FIT_FLOOR, fit - 0.04);
        inner.style.setProperty("--fit", String(fit));
        if (fit <= FIT_FLOOR) break;
      }
    }
    page.style.height = "";
  });
}

export function Flipbook({ pages, startPage, onFlip, onInit, reducedMotion }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const lastPortrait = useRef<boolean | null>(null);

  // HTML ثابت لكل الصفحات (يُولَّد مرة واحدة، خارج شجرة React الحيّة).
  const html = useRef<string>("");
  const pageHtml = useRef<string[]>([]);
  if (!html.current) {
    pageHtml.current = pages.map((p) => {
      const density = HARD.has(p.type) ? "hard" : "soft";
      return `<div class="page ${pageClass(p)}" data-density="${density}" role="group" aria-label="${escapeAttr(
        pageLabel(p)
      )}">${renderToStaticMarkup(<PageView page={p} />)}</div>`;
    });
    html.current = pageHtml.current.join("");
  }

  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const bookEl = bookRef.current!;
    bookEl.innerHTML = html.current;

    let flip: PageFlip | null = null;
    let ro: ResizeObserver | null = null;
    let raf = 0;
    let destroyed = false;

    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!flip) return;
        const box = computeBox(stage);
        // إعادة ملاءمة النصّ عند تغيّر الأبعاد (قياسٌ خارج الشاشة)، ثم تحديث المحرّك.
        try {
          applyFits(bookEl, computeFits(pageHtml.current, box.single, box.h));
        } catch {
          /* تجاهل */
        }
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

    const init = () => {
      if (destroyed) return;
      const { w, h, single, portrait } = computeBox(stage);
      lastPortrait.current = portrait;

      // ملاءمةُ النصّ للصفحة: تُقاس الصفحات المرصوصة بعرض صفحةٍ واحدة، ويُخبَز معامل
      // --fit في كلٍّ منها قبل أن يتولّاها المحرّك، فلا يُقصُّ سطرٌ في الصفحات الكثيفة.
      fitStackedPages(bookEl, single, h);

      bookEl.style.width = `${w}px`;
      bookEl.style.height = `${h}px`;

      flip = new PageFlip(bookEl, {
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

      if (startPage > 0) {
        try {
          flip.turnToPage(startPage);
        } catch {
          /* تجاهل حدود غير صالحة */
        }
      }

      flip.on("flip", (e) => onFlip(e.data as number));
      onInit({
        next: () => flip!.flipNext(),
        prev: () => flip!.flipPrev(),
        goto: (index: number) => flip!.flip(index),
        getIndex: () => flip!.getCurrentPageIndex(),
        getCount: () => flip!.getPageCount(),
      });

      ro = new ResizeObserver(onResize);
      ro.observe(stage);
      window.addEventListener("orientationchange", onResize);
    };

    // نؤخّر التهيئة حتى جهوز الخطوط كي يكون قياسُ الملاءمة صحيحاً، مع مهلةٍ احتياطية.
    let started = false;
    const go = () => {
      if (started || destroyed) return;
      started = true;
      init();
    };
    const ready = (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    Promise.resolve(ready).then(go);
    const fallback = window.setTimeout(go, 1200);

    return () => {
      destroyed = true;
      window.clearTimeout(fallback);
      ro?.disconnect();
      window.removeEventListener("orientationchange", onResize);
      cancelAnimationFrame(raf);
      try {
        flip?.destroy();
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
