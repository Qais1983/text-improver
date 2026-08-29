// لقطات QA على أحجام هواتف حقيقية + فحوص سلامة أساسية.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "..", "qa-shots");
mkdirSync(OUT, { recursive: true });

const EXEC =
  process.env.CHROMIUM_BIN ||
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = process.env.BASE_URL || "http://localhost:4173/";

const PHONES = [
  { name: "360x800", w: 360, h: 800 },
  { name: "375x812", w: 375, h: 812 },
  { name: "390x844", w: 390, h: 844 },
  { name: "393x873", w: 393, h: 873 },
  { name: "412x915", w: 412, h: 915 },
  { name: "430x932", w: 430, h: 932 },
];

// أهداف اللقطات: (اسم، فهرس الصفحة 0-based). نقفز عبر استعادة آخر صفحة.
// النسخة السردية: 36 صفحة.
const TARGETS = [
  { label: "cover", index: 0 },
  { label: "title", index: 1 },
  { label: "dedication", index: 2 },
  { label: "narrative-open", index: 3 },
  { label: "geography-bridge", index: 11 }, // الرِّكيب.. جغرافيا وجدانية
  { label: "martyr-saydali", index: 13 },   // الصيدلي
  { label: "martyr-abualkaik", index: 14 }, // أبوالكيك
  { label: "ahmadan-bridge", index: 17 },   // الأحمدان (جسر)
  { label: "nisa", index: 24 },             // نساء الرِّكيب
  { label: "school-girls", index: 26 },     // طابور البنات
  { label: "ending", index: 34 },           // وما لم يستطيعوا أخذه
  { label: "afterword", index: 35 },        // والنَّفرة ما تزال قائمة
];

async function overflowReport(page) {
  return page.evaluate(() => {
    const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    const bad = [];
    // افحص الصفحات المرئية: أي محتوى يتجاوز ارتفاع الورقة الثابتة = قصّ.
    document.querySelectorAll("#book .page").forEach((page) => {
      const r = page.getBoundingClientRect();
      if (r.height < 2) return; // غير مرئية
      const inner = page.querySelector(".page-inner");
      if (!inner) return;
      const ir = inner.getBoundingClientRect();
      const over = Math.max(
        page.scrollHeight - page.clientHeight,
        Math.round(ir.bottom - r.bottom),
        Math.round(r.top - ir.top)
      );
      if (over > 2) {
        const t = (inner.querySelector("h1,h2,.million-name,.donorlist-head,.cover-title")?.textContent || "").slice(0, 30);
        bad.push({ over, t });
      }
    });
    return { docOverflow, bad };
  });
}

const run = async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const consoleErrors = [];
  let totalOverflow = 0;

  for (const phone of PHONES) {
    const ctx = await browser.newContext({
      viewport: { width: phone.w, height: phone.h },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: "ar",
    });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(`[${phone.name}] ${m.text()}`);
    });
    page.on("pageerror", (e) => consoleErrors.push(`[${phone.name}] PAGEERR ${e.message}`));

    for (const target of TARGETS) {
      // ازرع آخر صفحة في localStorage ثم حمّل: التطبيق يفتح على الصفحة المطلوبة فوراً.
      await page.addInitScript((idx) => {
        try {
          localStorage.setItem("nafra.lastPage", String(idx));
          localStorage.setItem("nafra.hintSeen", "1");
        } catch {}
      }, target.index);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const rep = await overflowReport(page);
      totalOverflow += rep.bad.length;
      if (rep.docOverflow) consoleErrors.push(`[${phone.name}] ${target.label} DOC H-OVERFLOW`);
      if (rep.bad.length) {
        consoleErrors.push(`[${phone.name}] ${target.label} OVERFLOW ${JSON.stringify(rep.bad)}`);
      }
      // لقطة فقط لأحجام مختارة لتقليل الحجم
      if (phone.name === "360x800" || phone.name === "430x932" || phone.name === "390x844") {
        await page.screenshot({ path: join(OUT, `${target.label}_${phone.name}.png`) });
      }
    }
    await ctx.close();
  }

  // لقطة أفقية (فرش صفحتين) على حجم متوسط
  const lctx = await browser.newContext({
    viewport: { width: 900, height: 430 },
    isMobile: true,
    hasTouch: true,
    locale: "ar",
  });
  const lp = await lctx.newPage();
  await lp.goto(BASE, { waitUntil: "networkidle" });
  await lp.waitForTimeout(900);
  await lp.evaluate(() => { try { localStorage.setItem("nafra.lastPage", "13"); } catch {} });
  await lp.reload({ waitUntil: "networkidle" });
  await lp.waitForTimeout(1400);
  await lp.screenshot({ path: join(OUT, "landscape_spread_900x430.png") });
  const orient = await lp.evaluate(() => document.querySelectorAll("#book .stf__item").length);
  await lctx.close();

  await browser.close();

  console.log("=== تقرير QA ===");
  console.log("لقطات في:", OUT);
  console.log("عناصر الفرش الأفقي (stf items):", orient);
  console.log("إجمالي حالات overflow:", totalOverflow);
  if (consoleErrors.length) {
    console.log("\nملاحظات/أخطاء:");
    for (const e of consoleErrors) console.log("  -", e);
    process.exitCode = 1;
  } else {
    console.log("لا أخطاء console ولا overflow.");
  }
};

const reduce = false;
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
