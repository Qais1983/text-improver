#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مستورِد مخطوط «النّفرة».

يقرأ manuscript.docx بترتيب المستند (فقرات + جداول)، ويقسّم المحتوى وفق علامات
[[PAGE ...]]، ويحفظ فقط ما بين [[CONTENT]] و [[/CONTENT]]، ويتجاهل كتل
[[DESIGN NOTE ...]]. النص مصدر الحقيقة: لا إعادة صياغة ولا تطبيع ولا تصحيح.

المخرجات:
  src/content/book-pages.json  — قائمة الصفحات المرتبة كما في المخطوط.
  src/content/donors.json      — سجلّ المساهمين المستخرج من صفحات المساهمات.

يفشل البناء (خروج != 0) عند أي خرق للثوابت التوثيقية.
"""
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

SCRIPT_DIR = Path(__file__).resolve().parent
SRC_DOCX = SCRIPT_DIR / "source" / "manuscript.docx"
OUT_DIR = SCRIPT_DIR.parent / "src" / "content"

PAGE_RE = re.compile(r"^\[\[PAGE\s+(\d+)\s*\|\s*TYPE:([A-Z_]+)\s*(?:\|[^\]]*)?\]\]\s*$")
CONTENT_OPEN = "[[CONTENT]]"
CONTENT_CLOSE = "[[/CONTENT]]"
DESIGN_NOTE_PREFIX = "[[DESIGN NOTE"
DECOR = "◆  ◆  ◆"


def para_text(p):
    """يجمع نصّ فقرة من عناصر w:t مع احترام الفواصل، دون أي تطبيع للمحارف."""
    parts = []
    for t in p.iter(f"{W}t"):
        parts.append(t.text or "")
    for br in p.iter(f"{W}br"):
        pass  # w:br تُعامل ضمن الفقرة؛ نادرة هنا
    return "".join(parts)


def table_rows(tbl):
    """يعيد صفوف الجدول كقوائم خلايا نصّية، بترتيب المستند."""
    rows = []
    for tr in tbl.findall(f"{W}tr"):
        cells = []
        for tc in tr.findall(f"{W}tc"):
            cell_parts = [para_text(p) for p in tc.findall(f"{W}p")]
            cells.append("\n".join(s for s in cell_parts).strip())
        rows.append(cells)
    return rows


def iter_body_blocks(body):
    """يمرّ على الأبناء المباشرين للجسم بالترتيب: ('p', element) أو ('tbl', element)."""
    for child in body:
        if child.tag == f"{W}p":
            yield ("p", child)
        elif child.tag == f"{W}tbl":
            yield ("tbl", child)


def parse_amount(raw):
    """يستخرج قيمة رقمية من نصّ مبلغ مثل «30,000,000 جنيه» دون تغيير العرض الأصلي."""
    digits = re.sub(r"[^\d]", "", raw)
    return int(digits) if digits else None


def main():
    if not SRC_DOCX.exists():
        sys.exit(f"لم يُعثر على المخطوط: {SRC_DOCX}")

    with zipfile.ZipFile(SRC_DOCX) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(f"{W}body")

    pages = []
    current = None
    in_content = False
    appearance = 0  # ترتيب ظهور المساهم في المخطوط (يُستخدم لكسر التعادل)

    for kind, el in iter_body_blocks(body):
        if kind == "p":
            text = para_text(el)
            stripped = text.strip()
            m = PAGE_RE.match(stripped)
            if m:
                # افتتاح صفحة جديدة
                current = {
                    "id": m.group(1),
                    "type": m.group(2),
                    "blocks": [],  # عناصر مرئية: {"kind":"para"|"decor"|"table", ...}
                }
                pages.append(current)
                in_content = False
                continue
            if stripped == CONTENT_OPEN:
                in_content = True
                continue
            if stripped == CONTENT_CLOSE:
                in_content = False
                continue
            if stripped.startswith(DESIGN_NOTE_PREFIX):
                continue  # بيانات تحريرية لا تُعرض
            if in_content and current is not None:
                if stripped == "":
                    continue
                if stripped == DECOR:
                    current["blocks"].append({"kind": "decor"})
                else:
                    # نحافظ على النص كما ورد تماماً (بلا strip داخلي للمحارف المهمة)
                    current["blocks"].append({"kind": "para", "text": text.strip()})
        else:  # tbl
            if in_content and current is not None:
                rows = table_rows(el)
                current["blocks"].append({"kind": "table", "rows": rows})

    # ---- بناء تمثيل صفحات نظيف حسب النوع ----
    book_pages = []
    donors = []  # {"n": int, "name": str, "amount": int, "amount_raw": str, "source": "million"|"regular"}

    for p in pages:
        ptype = p["type"]
        blocks = p["blocks"]
        entry = {"id": p["id"], "type": ptype}

        if ptype in ("COVER", "TITLE", "DEDICATION", "NARRATIVE", "BRIDGE",
                     "CLOSING", "VERSION", "BACK_COVER", "REGULAR_OPENER", "STATS"):
            # صفحات نصّية: أول فقرة نصّية غالباً عنوان، والبقية متن؛ لكن نحفظ التسلسل كما هو
            lines = []
            for b in blocks:
                if b["kind"] == "para":
                    lines.append({"kind": "para", "text": b["text"]})
                elif b["kind"] == "decor":
                    lines.append({"kind": "decor"})
                elif b["kind"] == "table":
                    # STATS قد يستخدم جدولاً؛ نحفظه صفوفاً
                    lines.append({"kind": "table", "rows": b["rows"]})
            entry["lines"] = lines
            if ptype == "STATS":
                stats = []
                for b in blocks:
                    if b["kind"] == "table":
                        for row in b["rows"]:
                            cell = (row[0] if row else "").strip()
                            if not cell:
                                continue
                            segs = [s.strip() for s in cell.split("\n") if s.strip()]
                            value = segs[0] if segs else ""
                            label = " ".join(segs[1:]) if len(segs) > 1 else ""
                            stats.append({"value": value, "label": label})
                entry["stats"] = stats

        elif ptype == "MILLION_DONOR":
            # فقرتان: الاسم ثم المبلغ (قد يوجد جدول في بعض النسخ)
            name = None
            amount_raw = None
            texts = [b["text"] for b in blocks if b["kind"] == "para"]
            if len(texts) >= 2:
                name, amount_raw = texts[0], texts[1]
            elif len(texts) == 1:
                name = texts[0]
            # جداول احتياطية
            if (name is None or amount_raw is None):
                for b in blocks:
                    if b["kind"] == "table":
                        for row in b["rows"]:
                            cells = [c for c in row if c]
                            if len(cells) >= 2:
                                name = name or cells[0]
                                amount_raw = amount_raw or cells[-1]
            amount = parse_amount(amount_raw or "")
            appearance += 1
            donors.append({
                "order": appearance,  # ترتيب السجل الأصلي كما رتّبه المخطوط (مفتاح كسر التعادل)
                "n": None,            # لا يحمل رقم سجل ظاهراً في صفحته المستقلة
                "name": name,
                "amount": amount,
                "amount_raw": amount_raw,
                "source": "million",
            })
            entry["name"] = name
            entry["amount"] = amount
            entry["amount_raw"] = amount_raw

        elif ptype == "REGULAR_LIST":
            heading = None
            rows_out = []
            for b in blocks:
                if b["kind"] == "para" and heading is None:
                    heading = b["text"]
                elif b["kind"] == "table":
                    for row in b["rows"]:
                        cells = [c.strip() for c in row]
                        # تنسيق متوقّع: رقم | اسم | مبلغ
                        if len(cells) < 3:
                            continue
                        num_raw, name, amount_raw = cells[0], cells[1], cells[2]
                        if not (num_raw or name or amount_raw):
                            continue
                        # تخطّي صف العنوان إن وُجد (غير رقمي في عمود الرقم)
                        n_digits = re.sub(r"[^\d]", "", num_raw)
                        rec = {
                            "n": int(n_digits) if n_digits else None,
                            "name": name,
                            "amount": parse_amount(amount_raw),
                            "amount_raw": amount_raw,
                        }
                        rows_out.append(rec)
                        appearance += 1
                        donors.append({"order": appearance, **rec, "source": "regular"})
            entry["heading"] = heading
            entry["rows"] = rows_out
        else:
            entry["lines"] = [{"kind": "para", "text": b.get("text", "")} for b in blocks if b["kind"] == "para"]

        book_pages.append(entry)

    # ---------- المدقّقات ----------
    errors = []
    if len(book_pages) != 100:
        errors.append(f"عدد الصفحات {len(book_pages)} != 100")
    ids = [p["id"] for p in book_pages]
    if len(set(ids)) != len(ids):
        dup = [i for i in ids if ids.count(i) > 1]
        errors.append(f"معرّفات صفحات مكرّرة: {sorted(set(dup))}")

    million_count = sum(1 for d in donors if d["source"] == "million")
    regular_count = sum(1 for d in donors if d["source"] == "regular")

    for d in donors:
        if not d.get("name") or not str(d["name"]).strip():
            errors.append(f"مساهم باسم فارغ: {d}")
        if d.get("amount") is None or not isinstance(d["amount"], int):
            errors.append(f"مبلغ غير رقمي: {d}")

    for d in donors:
        if d["source"] == "regular" and d.get("amount", 0) >= 1_000_000:
            errors.append(f"مساهمة مليونية داخل دفتر النفرة: {d}")
        if d["source"] == "million" and d.get("amount", 0) < 1_000_000:
            errors.append(f"مساهمة دون المليون في صفحات العطاء: {d}")

    if errors:
        print("فشل التحقق:", file=sys.stderr)
        for e in errors:
            print("  -", e, file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "book-pages.json").write_text(
        json.dumps(book_pages, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "donors.json").write_text(
        json.dumps(donors, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    total_amount = sum(d["amount"] for d in donors)
    print("تم الاستيراد بنجاح:")
    print(f"  الصفحات: {len(book_pages)}")
    from collections import Counter
    for t, c in Counter(p["type"] for p in book_pages).items():
        print(f"    {t}: {c}")
    print(f"  المساهمات المليونية: {million_count}")
    print(f"  مساهمات دفتر النفرة: {regular_count}")
    print(f"  إجمالي المساهمات: {million_count + regular_count}")
    print(f"  الإجمالي المالي: {total_amount:,} جنيه")


if __name__ == "__main__":
    main()
