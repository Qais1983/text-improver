import type { BookPage } from "./types";

export interface TocEntry {
  label: string;
  index: number; // فهرس الصفحة (0-based) في المصفوفة = فهرس StPageFlip
}

/** يبني فهرساً موجزاً يقفز إلى أقسام الكتاب الرئيسة. */
export function buildToc(pages: BookPage[]): TocEntry[] {
  const first = (type: string) => pages.findIndex((p) => p.type === type);
  const entries: TocEntry[] = [];
  const push = (label: string, idx: number) => {
    if (idx >= 0) entries.push({ label, index: idx });
  };
  push("الغلاف", 0);
  push("الإهداء", first("DEDICATION"));
  push("السيرة", first("NARRATIVE"));
  push("الأثر في أرقام", first("STATS"));
  push("صفحات العطاء", first("MILLION_DONOR"));
  push("دفتر النفرة", first("REGULAR_OPENER"));
  push("الخاتمة", first("CLOSING"));
  return entries;
}
