// أنواع بيانات الكتاب المستخرجة من المخطوط.

export type PageType =
  | "COVER"
  | "TITLE"
  | "DEDICATION"
  | "NARRATIVE"
  | "BRIDGE"
  | "STATS"
  | "MILLION_DONOR"
  | "REGULAR_OPENER"
  | "REGULAR_LIST"
  | "CLOSING"
  | "VERSION"
  | "BACK_COVER";

export type Line =
  | { kind: "para"; text: string }
  | { kind: "decor" }
  | { kind: "table"; rows: string[][] };

export interface StatItem {
  value: string;
  label: string;
}

export interface DonorRow {
  n: number | null;
  name: string;
  amount: number;
  amount_raw: string;
}

export interface BookPage {
  id: string;
  type: PageType;
  lines?: Line[];
  stats?: StatItem[];
  // MILLION_DONOR
  name?: string;
  amount?: number;
  amount_raw?: string;
  // REGULAR_LIST
  heading?: string;
  rows?: DonorRow[];
}

export interface Donor {
  order: number;
  n: number | null;
  name: string;
  amount: number;
  amount_raw: string;
  source: "million" | "regular";
}
