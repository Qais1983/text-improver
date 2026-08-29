import type { BookPage } from "./types";

export interface TocEntry {
  label: string;
  index: number; // فهرس الصفحة (0-based) = فهرس StPageFlip
}

const firstPara = (p: BookPage) => {
  const l = p.lines.find((x) => x.kind === "para");
  return l && l.kind === "para" ? l.text.trim() : "";
};

/**
 * فهرسٌ كامل: الغلاف والإهداء، ثمّ كلُّ صفحات السرد والجسر بعناوينها الجانبية،
 * كلٌّ يقفز إلى موضعه. تُستثنى صفحتا العنوان والغلاف الخلفي.
 */
export function buildToc(pages: BookPage[]): TocEntry[] {
  const entries: TocEntry[] = [];
  const seen = new Set<number>();
  const push = (label: string, idx: number) => {
    if (idx >= 0 && idx < pages.length && !seen.has(idx) && label) {
      entries.push({ label, index: idx });
      seen.add(idx);
    }
  };

  const coverIdx = pages.findIndex((p) => p.type === "COVER");
  push("الغلاف", coverIdx);

  const dedIdx = pages.findIndex((p) => p.type === "DEDICATION");
  push("الإهداء", dedIdx);

  pages.forEach((p, i) => {
    if (p.type === "NARRATIVE" || p.type === "BRIDGE") {
      push(firstPara(p), i);
    }
  });

  return entries.sort((a, b) => a.index - b.index);
}
