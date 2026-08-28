import type { Donor } from "./types";

export const MILLION = 1_000_000;

/**
 * فرز المساهمات المليونية: المبلغ تنازلياً، وعند التعادل حسب ترتيب السجل الأصلي
 * (order) تصاعدياً. دالة نقيّة لا تغيّر المدخل.
 */
export function sortMillionDonors(donors: Donor[]): Donor[] {
  return [...donors].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.order - b.order;
  });
}

/** المساهمات المليونية فقط (>= مليون)، مرتّبة وفق القاعدة. */
export function millionDonors(all: Donor[]): Donor[] {
  return sortMillionDonors(all.filter((d) => d.amount >= MILLION));
}

/**
 * دفتر النفرة: المساهمات دون المليون، بترتيب السجل الأصلي (order تصاعدياً)،
 * مع الاحتفاظ برقم السجل الأصلي (n) وفجواته. لا حذف ولا إعادة ترقيم ولا دمج.
 */
export function regularDonors(all: Donor[]): Donor[] {
  return all
    .filter((d) => d.amount < MILLION)
    .sort((a, b) => a.order - b.order);
}

/** تنسيق المبلغ بفواصل الآلاف مع «جنيه»، دون تحويل عملة. */
export function formatAmount(amount: number): string {
  return `${amount.toLocaleString("en-US")} جنيه`;
}
