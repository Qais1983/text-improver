import { describe, it, expect } from "vitest";
import bookPages from "../content/book-pages.json";
import type { BookPage } from "./types";
import { buildToc } from "./toc";

const pages = bookPages as BookPage[];

const firstPara = (p: BookPage) =>
  p.lines.find((l) => l.kind === "para") as { kind: "para"; text: string } | undefined;

describe("بنية النسخة السردية", () => {
  it("النوع الأول غلاف والصفحات متسلسلة الترقيم", () => {
    expect(pages.length).toBeGreaterThan(20);
    expect(pages[0].type).toBe("COVER");
    pages.forEach((p, i) => expect(p.id).toBe(String(i + 1).padStart(3, "0")));
  });

  it("لا أنواع مساهمات في النسخة السردية", () => {
    const banned = ["MILLION_DONOR", "REGULAR_LIST", "REGULAR_OPENER", "STATS"];
    expect(pages.some((p) => banned.includes(p.type))).toBe(false);
  });

  it("كل صفحة سرد أو جسر تحمل عنواناً ونصّاً", () => {
    for (const p of pages) {
      if (p.type === "NARRATIVE" || p.type === "BRIDGE") {
        const t = firstPara(p);
        expect(t?.text.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("لا تتسرّب علامات تحريرية إلى المتن", () => {
    for (const p of pages) {
      for (const l of p.lines) {
        if (l.kind === "para") {
          expect(l.text).not.toContain("[[");
          expect(l.text).not.toContain("DO_NOT_RENDER");
        }
      }
    }
  });

  it("المتن ينتهي بـ«وما لم يستطيعوا أخذه» ثم «ما تزال قائمة»، وآخر صفحة غلافٌ خلفيّ", () => {
    const titles = pages.map((p) => firstPara(p)?.text ?? "");
    const iEnd = titles.findIndex((t) => t.includes("وما لم يستطيعوا أخذه"));
    expect(iEnd).toBeGreaterThan(0);
    expect(pages[pages.length - 1].type).toBe("BACK_COVER");
    expect(titles[pages.length - 2]).toContain("ما تزال قائمة");
  });

  it("صفحتا الشهيدين حاضرتان", () => {
    const titles = pages.map((p) => firstPara(p)?.text ?? "");
    expect(titles.some((t) => t.includes("الصيدلي"))).toBe(true);
    expect(titles.some((t) => t.includes("أبوالكيك") || t.includes("أبو الكيك"))).toBe(true);
  });
});

describe("الفهرس", () => {
  it("يبني محطّاتٍ صالحةً ومرتّبة", () => {
    const toc = buildToc(pages);
    expect(toc.length).toBeGreaterThanOrEqual(4);
    for (const e of toc) {
      expect(e.index).toBeGreaterThanOrEqual(0);
      expect(e.index).toBeLessThan(pages.length);
    }
    const idx = toc.map((e) => e.index);
    expect([...idx]).toEqual([...idx].sort((a, b) => a - b));
  });
});
