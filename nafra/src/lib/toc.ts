import type { BookPage } from "./types";

export interface TocEntry {
  label: string;
  index: number; // فهرس الصفحة (0-based) = فهرس StPageFlip
}

/** يبني فهرساً موجزاً يقفز إلى محطّات السيرة الرئيسة. */
export function buildToc(pages: BookPage[]): TocEntry[] {
  const byType = (type: string) => pages.findIndex((p) => p.type === type);
  const byTitle = (needle: string) =>
    pages.findIndex((p) => {
      const first = p.lines.find((l) => l.kind === "para");
      return first && first.kind === "para" && first.text.includes(needle);
    });

  const entries: TocEntry[] = [];
  const push = (label: string, idx: number) => {
    if (idx >= 0 && !entries.some((e) => e.index === idx)) {
      entries.push({ label, index: idx });
    }
  };

  push("الغلاف", 0);
  push("الإهداء", byType("DEDICATION"));
  push("قبل الحرب", byTitle("قبل أن تكون"));
  push("جغرافيا وجدانية", byTitle("جغرافيا وجدانية"));
  push("شهيدا الرِّكيب", byTitle("الصيدلي"));
  push("النَّفرة", byTitle("الكلمة التي نهضت"));
  push("طوابير المدارس", byTitle("طابور البنات"));
  push("الخاتمة", byTitle("وما لم يستطيعوا"));

  return entries.sort((a, b) => a.index - b.index);
}
