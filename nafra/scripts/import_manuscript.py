#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مستورِد مخطوط «النّفرة» (النسخة السردية).

الكتاب صار سيرةً للرِّكيب والنفرة معنىً، بلا قوائم مساهمات. يقرأ المستورِد
manuscript.docx بترتيب المستند، ويعيد ترقيم الصفحات ترقيماً صحيحاً (لأنّ أرقام
المخطوط صارت مكرّرةً بعد الحذف والإضافة)، ويحترم تعليق المؤلّف: «ابتداءً من هذه
الصفحة لم يعد جزءاً من الكتاب» — فيُسقِط الصفحةَ المؤشَّرة وكلَّ ما بعدها.

يحفظ فقط ما بين [[CONTENT]] و[[/CONTENT]]، ويتجاهل [[DESIGN NOTE]]. النصّ مصدر
الحقيقة: لا إعادة صياغة ولا تصحيح. المخرجات: src/content/book-pages.json.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SRC_DOCX = SCRIPT_DIR / "source" / "manuscript.docx"
OUT_DIR = SCRIPT_DIR.parent / "src" / "content"

PAGE_RE = re.compile(r"^\[\[PAGE\s+(\d+)\s*\|\s*TYPE:([A-Z_]+)\s*(?:\|[^\]]*)?\]\]\s*$")
CONTENT_OPEN = "[[CONTENT]]"
CONTENT_CLOSE = "[[/CONTENT]]"
DESIGN_NOTE_PREFIX = "[[DESIGN NOTE"
DECOR = "◆  ◆  ◆"

# تصحيحاتٌ إملائيةٌ مأذونة من المؤلّف، تُطبَّق كاستبدالٍ نصّيّ داخل الفقرات.
ERRATA = {
    "في ساعةٍ الامتحان": "في ساعةِ الامتحان",  # صفحة الأحمدان (الجسر)
    "شيهيدين": "شهيدين",
    "المألوف بين النس": "المألوف بين الناس",  # صفحة «ما تحفظه الجيرة»
    "حمله حين حموله": "حمله حين حملوه",         # صفحة «الرجوع إلى الرِّكيب»
    "وكان إجابة السؤال": "وكانت إجابة السؤال",  # صفحة «الرجوع إلى الرِّكيب»
    "ومن لزِم هذه الصنعة عرَف أنّ العِلمَ لا يُتمُّ عملَه حتى يبلغَ صاحبَ العلّة في أوانه":
        "ومن لزِم هذه الصنعة عرف أحوال الناس في ساعات ضعفهم",  # صفحة «الصيدلي»
}


def apply_errata(text):
    for wrong, right in ERRATA.items():
        text = text.replace(wrong, right)
    return text


# استبدالُ متنِ صفحةٍ كاملاً (بإذن المؤلّف)، مفتاحُه عنوانُ الصفحة الجانبيّ.
# يُبقى العنوانُ ويُستبدَل ما تحته من فقرات.
BODY_OVERRIDES = {
    "القليل إذا اجتمع": [
        "في باب العطاء، فالقليل لا يُذمّ لقِلّته إذا خرج من يدٍ لا تملك كثيراً، كما أن الكثير لا يُمدح لمجرّد كثرته حتى يُعرف ما وراءه من بذل. وأهلُ الرّكيب أكثرهم يعيش من عرقهِ وكدحِه، يسعون في مناكب الأرض ابتغاء الرزق الحلال فيعودون بما قسمَ الله لهم من مال تتنازعه مؤونة العيال وحاجات البيت، حتى يكاد ينفد قبل أن تستوفي النفقة أبوابها.",
        "غير أنّهم هبّوا لما ارتفع نداء النفرة، فجعل كلّ امرئ من ماله نصيباً للقرية على قدر وسعه. وفي ذلك من شِيم العطاء والكرم ما لا يحتاج إلى بيان. وهكذا جاءت الخمسون ألفاً، والمئة، والمئتان، والخمسمئة. مبالغ تتفاوت في المقدار وتلتقي عند الغاية.",
    ],
    "أبوالكيك": [
        "كان أحمد أبوالكيك فتىً يافعاً في مقتبل العمر. استقرّ له بين أهل الرِّكيب ذِكرٌ حسن صنعته السيرة الطيّبة والخُلق القويم. عُرف بطِيب المعشر، والقرب من الناس، والاستعداد لخدمتهم، وهي خصال تنشأ مع التربية والمخالطة حتى تستقر في الطبع. وكان صِيته المحمود بين أهله هو ثمرةَ ما رأوه منه في المعاملة اليومية، فالخصلة الحسنة تعرفها المجالس، وتحفظها المواقف، ويشهد بها من خالط صاحبها وعرفه. ومن هذا الرصيد الإنساني جاءت منزلته في نفوس أهل القرية، قبل أن يأتي اليوم الذي اقترن فيه اسمه بالتضحية.",
        "ثم جاء موقفه الأخير فختمَ عمره القصير على قدْرٍ كبير من الوفاء. فقد يكون العمر وجيزاً، وتكون السيرة أوسع منه أثراً، لأن ما يبقى من الإنسان في قومه ليس عدد السنين، وإنما ما أودعه بينهم من خُلُقٍ ومروءة وقبول عند الناس.",
    ],
}

# أنواع الصفحات المعتمدة في النسخة السردية.
KNOWN_TYPES = {"COVER", "TITLE", "DEDICATION", "NARRATIVE", "BRIDGE", "BACK_COVER"}


def para_text_and_runs(p_xml):
    """نصّ الفقرة من عناصر w:t، مع علامةٍ إن كانت الفقرة تحمل مرساة تعليق."""
    texts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", p_xml, re.S)
    text = "".join(texts)
    for a, b in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
                 ("&quot;", '"'), ("&apos;", "'")]:
        text = text.replace(a, b)
    has_comment = "<w:commentRangeStart" in p_xml
    return text, has_comment


def main():
    if not SRC_DOCX.exists():
        sys.exit(f"لم يُعثر على المخطوط: {SRC_DOCX}")

    with zipfile.ZipFile(SRC_DOCX) as z:
        xml = z.read("word/document.xml").decode("utf-8", "ignore")

    body_start = xml.find("<w:body")
    body = xml[body_start:] if body_start != -1 else xml

    # تقسيمٌ إلى فقرات مع الحفاظ على الترتيب.
    paras = re.findall(r"<w:p\b.*?</w:p>", body, re.S)

    pages = []          # كل صفحة: {"type", "blocks":[...]}
    current = None
    in_content = False
    cut_reached = False

    for p_xml in paras:
        text, has_comment = para_text_and_runs(p_xml)
        stripped = text.strip()

        m = PAGE_RE.match(stripped)
        if m:
            # مرساةُ تعليق المؤلّف على فقرة مُعلَّم الصفحة = قطعٌ من هنا.
            if has_comment:
                cut_reached = True
            if cut_reached:
                current = None
                in_content = False
                continue
            current = {"type": m.group(2).strip(), "blocks": []}
            pages.append(current)
            in_content = False
            continue

        if cut_reached or current is None:
            continue
        if stripped == CONTENT_OPEN:
            in_content = True
            continue
        if stripped == CONTENT_CLOSE:
            in_content = False
            continue
        if stripped.startswith(DESIGN_NOTE_PREFIX):
            continue
        if in_content:
            if stripped == "":
                continue
            if stripped == DECOR:
                current["blocks"].append({"kind": "decor"})
            else:
                current["blocks"].append({"kind": "para", "text": apply_errata(stripped)})

    # بناء تمثيلٍ نظيف (بلا ترقيمٍ بعد) بترتيب المستند.
    book_pages = []
    for p in pages:
        lines = []
        for b in p["blocks"]:
            if b["kind"] == "para":
                lines.append({"kind": "para", "text": b["text"]})
            else:
                lines.append({"kind": "decor"})
        book_pages.append({"type": p["type"], "lines": lines})

    # استبدالُ متنِ صفحاتٍ معيّنة بنصٍّ مأذون (يُبقى العنوان الجانبيّ).
    for p in book_pages:
        title = next((l["text"] for l in p["lines"] if l["kind"] == "para"), None)
        if title in BODY_OVERRIDES:
            new_lines = [{"kind": "para", "text": title}]
            new_lines += [{"kind": "para", "text": t} for t in BODY_OVERRIDES[title]]
            p["lines"] = new_lines

    # إهداءٌ مستقلٌّ لشهيدَي الرِّكيب، يُدرَج في صفحةٍ لوحده بعد الإهداءات الأخرى.
    martyrs_dedication = {
        "type": "DEDICATION",
        "lines": [
            {"kind": "para", "text": "وإلى الأحمدين شهيدَي الرِّكيب"},
            {"kind": "para", "text": (
                "أحمد عبد الله الصيدلي وأحمد الصديق أبوالكيك، اللذين ذهبا في ساعة الشدّة "
                "إلى قلب الخطر بلا وجلٍ نجدةً لأهلهم، فمَضَيا إلى ربّهما، وبقي اسماهما في ذاكرتنا."
            )},
        ],
    }
    last_ded = max((i for i, p in enumerate(book_pages) if p["type"] == "DEDICATION"),
                   default=-1)
    if last_ded >= 0:
        book_pages.insert(last_ded + 1, martyrs_dedication)

    # غلافٌ خلفيّ ختاميّ مقتصِد يُضاف آلياً (عنوان الكتاب وعلامة بصرية)،
    # يُشتقّ من الغلاف الأمامي حتى يبقى متطابقاً معه.
    cover = next((p for p in book_pages if p["type"] == "COVER"), None)
    if cover:
        cover_paras = [l["text"] for l in cover["lines"] if l["kind"] == "para"]
        back_lines = []
        if cover_paras:
            back_lines.append({"kind": "para", "text": cover_paras[0]})
        if len(cover_paras) > 1:
            back_lines.append({"kind": "para", "text": cover_paras[1]})
        back_lines.append({"kind": "decor"})
        book_pages.append({"type": "BACK_COVER", "lines": back_lines})

    # ترقيمٌ نهائيٌّ صحيح بعد الإدراج والإضافة.
    for i, p in enumerate(book_pages, start=1):
        p["id"] = f"{i:03d}"
    book_pages = [{"id": p["id"], "type": p["type"], "lines": p["lines"]} for p in book_pages]

    # ---------- المدقّقات ----------
    errors = []
    if not book_pages:
        errors.append("لا صفحات بعد الاستيراد")
    if not cut_reached:
        errors.append("لم يُعثر على مرساة تعليق القطع — تحقّق من المخطوط")
    for p in book_pages:
        if p["type"] not in KNOWN_TYPES:
            errors.append(f"نوع صفحة غير متوقّع في النسخة السردية: {p['type']} (صفحة {p['id']})")
        paras_txt = [l for l in p["lines"] if l["kind"] == "para"]
        if p["type"] in ("NARRATIVE", "BRIDGE") and not paras_txt:
            errors.append(f"صفحة {p['id']} ({p['type']}) بلا نصّ")
    # لا تتسرّب علاماتٌ تحريرية إلى المتن
    for p in book_pages:
        for l in p["lines"]:
            if l["kind"] == "para" and ("[[" in l["text"] or "DO_NOT_RENDER" in l["text"]):
                errors.append(f"علامة تحريرية مسرَّبة في صفحة {p['id']}: {l['text'][:40]}")
    # الخاتمة المتوقّعة
    titles = [next((l["text"] for l in p["lines"] if l["kind"] == "para"), "") for p in book_pages]
    if "وما لم يستطيعوا أخذه" not in "\n".join(titles):
        errors.append("لم يُعثر على صفحة «وما لم يستطيعوا أخذه»")

    if errors:
        print("فشل التحقق:", file=sys.stderr)
        for e in errors:
            print("  -", e, file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "book-pages.json").write_text(
        json.dumps(book_pages, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    # ملفُّ المساهمين لم يعد له وجود في النسخة السردية.
    donors_path = OUT_DIR / "donors.json"
    if donors_path.exists():
        donors_path.unlink()

    from collections import Counter
    print("تم الاستيراد بنجاح (النسخة السردية):")
    print(f"  عدد الصفحات: {len(book_pages)}")
    for t, c in Counter(p["type"] for p in book_pages).items():
        print(f"    {t}: {c}")
    print(f"  الصفحة الأخيرة: {titles[-1]!r}")


if __name__ == "__main__":
    main()
