// أنواع بيانات الكتاب (النسخة السردية) المستخرجة من المخطوط.

export type PageType =
  | "COVER"
  | "TITLE"
  | "DEDICATION"
  | "NARRATIVE"
  | "BRIDGE"
  | "BACK_COVER";

export type Line =
  | { kind: "para"; text: string }
  | { kind: "decor" };

export interface BookPage {
  id: string;
  type: PageType;
  lines: Line[];
}
