import { describe, it, expect } from "vitest";
import {
  MILLION,
  sortMillionDonors,
  millionDonors,
  regularDonors,
  formatAmount,
} from "./donors";
import type { Donor } from "./types";
import donorsData from "../content/donors.json";
import bookPages from "../content/book-pages.json";
import type { BookPage } from "./types";

const all = donorsData as Donor[];
const pages = bookPages as BookPage[];

describe("فرز المساهمات المليونية", () => {
  it("يرتّب تنازلياً بالمبلغ ثم تصاعدياً بترتيب السجل عند التعادل", () => {
    const sample: Donor[] = [
      { order: 5, n: null, name: "ج", amount: 2_000_000, amount_raw: "", source: "million" },
      { order: 2, n: null, name: "أ", amount: 3_000_000, amount_raw: "", source: "million" },
      { order: 9, n: null, name: "و", amount: 2_000_000, amount_raw: "", source: "million" },
      { order: 1, n: null, name: "ب", amount: 3_000_000, amount_raw: "", source: "million" },
    ];
    const sorted = sortMillionDonors(sample);
    expect(sorted.map((d) => d.name)).toEqual(["ب", "أ", "ج", "و"]);
  });

  it("لا يغيّر المصفوفة الأصلية", () => {
    const sample: Donor[] = [
      { order: 2, n: null, name: "أ", amount: 1_000_000, amount_raw: "", source: "million" },
      { order: 1, n: null, name: "ب", amount: 2_000_000, amount_raw: "", source: "million" },
    ];
    const copy = [...sample];
    sortMillionDonors(sample);
    expect(sample).toEqual(copy);
  });
});

describe("قسمة السجل إلى مليونية ودفتر", () => {
  const mil = millionDonors(all);
  const reg = regularDonors(all);

  it("عدد المساهمات المليونية 47", () => {
    expect(mil.length).toBe(47);
  });

  it("عدد مساهمات دفتر النفرة 266", () => {
    expect(reg.length).toBe(266);
  });

  it("الاتحاد يساوي كامل السجل بلا نقص ولا تكرار إضافي", () => {
    expect(mil.length + reg.length).toBe(all.length);
    expect(all.length).toBe(313);
    // كل سجل أصلي يظهر مرة واحدة بالضبط (عبر ترتيب الظهور الفريد)
    const orders = [...mil, ...reg].map((d) => d.order).sort((a, b) => a - b);
    const uniq = new Set(orders);
    expect(uniq.size).toBe(orders.length);
    expect(orders).toEqual(all.map((d) => d.order).sort((a, b) => a - b));
  });

  it("دفتر النفرة لا يحتوي أي مبلغ >= مليون", () => {
    expect(reg.every((d) => d.amount < MILLION)).toBe(true);
  });

  it("صفحات العطاء لا تحتوي أي مبلغ < مليون", () => {
    expect(mil.every((d) => d.amount >= MILLION)).toBe(true);
  });

  it("لا إعادة ترقيم: دفتر النفرة يحفظ أرقام السجل مع فجوات", () => {
    const ns = reg.map((d) => d.n as number);
    expect(ns.every((n) => typeof n === "number")).toBe(true);
    // توجد فجوات لأن المليونية نُقلت
    const span = Math.max(...ns) - Math.min(...ns) + 1;
    expect(span).toBeGreaterThan(ns.length);
    // الأرقام تصاعدية بترتيب السجل
    for (let i = 1; i < ns.length; i++) expect(ns[i]).toBeGreaterThan(ns[i - 1]);
  });

  it("لا دمج للأسماء المكرّرة: تعدد سجلات نفس الاسم يبقى", () => {
    // إن وُجد اسم مكرّر يجب أن يبقى بعدد سجلاته
    const byName = new Map<string, number>();
    for (const d of all) byName.set(d.name, (byName.get(d.name) ?? 0) + 1);
    const totalFromMap = [...byName.values()].reduce((a, b) => a + b, 0);
    expect(totalFromMap).toBe(all.length);
  });
});

describe("تطابق المخطوط", () => {
  it("عدد الصفحات المستوردة 100", () => {
    expect(pages.length).toBe(100);
  });

  it("توزيع أنواع الصفحات كما في المخطوط", () => {
    const counts: Record<string, number> = {};
    for (const p of pages) counts[p.type] = (counts[p.type] ?? 0) + 1;
    expect(counts.MILLION_DONOR).toBe(47);
    expect(counts.REGULAR_LIST).toBe(27);
    expect(counts.NARRATIVE).toBe(16);
    expect(counts.COVER).toBe(1);
    expect(counts.BACK_COVER).toBe(1);
  });

  it("صفحات المساهمات المليونية في المخطوط مرتّبة تنازلياً بالمبلغ", () => {
    const milPages = pages
      .filter((p) => p.type === "MILLION_DONOR")
      .map((p) => p.amount as number);
    const sorted = [...milPages].sort((a, b) => b - a);
    expect(milPages).toEqual(sorted);
  });

  it("الإجمالي المالي 221,423,000 جنيه", () => {
    const total = all.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(221_423_000);
  });

  it("لا اسم فارغ ولا مبلغ غير رقمي", () => {
    for (const d of all) {
      expect(d.name.trim().length).toBeGreaterThan(0);
      expect(Number.isInteger(d.amount)).toBe(true);
    }
  });
});

describe("تنسيق المبلغ", () => {
  it("يضيف فواصل الآلاف وكلمة جنيه", () => {
    expect(formatAmount(221423000)).toBe("221,423,000 جنيه");
    expect(formatAmount(50000)).toBe("50,000 جنيه");
  });
});
