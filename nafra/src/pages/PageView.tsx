import type { BookPage, Line } from "../lib/types";

// ملاحظة: تُصيَّر هذه المكوّنات إلى HTML ثابت وتُسلَّم إلى StPageFlip.
// لا تعتمد على حالة React بعد التصيير.

function Decor() {
  return <div className="decor" aria-hidden="true">◆ ◆ ◆</div>;
}

function paras(lines: Line[] | undefined) {
  return (lines ?? []).filter((l): l is { kind: "para"; text: string } => l.kind === "para");
}

// رقم الصفحة داخل الورقة يُترك للمؤشّر العام أسفل الشاشة تفادياً للتداخل مع النص.
function Folio(_: { page: BookPage }) {
  return null;
}

function WireGlow() {
  // خيط بصري رفيع مستوحى من سلك كهرباء يتحوّل إلى أثر نور — تجريديّ راقٍ.
  return (
    <svg className="wire" viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--copper)" stopOpacity="0.0" />
          <stop offset="45%" stopColor="var(--copper)" stopOpacity="0.55" />
          <stop offset="70%" stopColor="var(--glow)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M50 0 C 52 60, 40 90, 50 140 S 60 210, 50 260 S 42 330, 50 400"
        fill="none"
        stroke="url(#wg)"
        strokeWidth="1.4"
      />
      <circle cx="50" cy="268" r="2.2" fill="var(--glow)" opacity="0.9" />
    </svg>
  );
}

function CoverPage({ page }: { page: BookPage }) {
  const p = paras(page.lines);
  return (
    <div className="page-inner">
      <WireGlow />
      <h1 className="cover-title">{p[0]?.text}</h1>
      {p[1] && <p className="cover-subtitle">{p[1].text}</p>}
      <div className="cover-decor">
        <Decor />
      </div>
    </div>
  );
}

function TitlePage({ page }: { page: BookPage }) {
  const p = paras(page.lines);
  return (
    <div className="page-inner">
      <h1 className="cover-title" style={{ fontSize: "clamp(30px,8.5vw,50px)" }}>
        {p[0]?.text}
      </h1>
      {p[1] && <p className="cover-subtitle">{p[1].text}</p>}
      <Decor />
      {p[2] && <p className="title-desc">{p[2].text}</p>}
    </div>
  );
}

function DedicationPage({ page }: { page: BookPage }) {
  const lines = page.lines ?? [];
  return (
    <div className="page-inner">
      {lines.map((l, i) =>
        l.kind === "decor" ? (
          <Decor key={i} />
        ) : l.kind === "para" ? (
          i === 0 ? (
            <p key={i} className="lead">{l.text}</p>
          ) : (
            <p key={i} className="body-text">{l.text}</p>
          )
        ) : null
      )}
    </div>
  );
}

function NarrativePage({ page }: { page: BookPage }) {
  const p = paras(page.lines);
  const title = p[0]?.text;
  const body = p.slice(1);
  return (
    <div className="page-inner">
      <h2 className="narrative-title">{title}</h2>
      <div className="flow">
        {body.map((b, i) => (
          <p key={i} className="body-text">{b.text}</p>
        ))}
      </div>
    </div>
  );
}

function BridgePage({ page }: { page: BookPage }) {
  const lines = page.lines ?? [];
  const p = paras(page.lines);
  const title = p[0]?.text;
  const rest = lines.slice(1); // بعد العنوان
  return (
    <div className="page-inner">
      <h2 className="bridge-title">{title}</h2>
      {rest.map((l, i) => {
        if (l.kind === "decor") return <Decor key={i} />;
        if (l.kind === "para") {
          const isLast = i === rest.length - 1;
          return (
            <p key={i} className={isLast ? "bridge-emph" : "body-text"}>
              {l.text}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

function StatsPage({ page }: { page: BookPage }) {
  const stats = page.stats ?? [];
  const p = paras(page.lines);
  return (
    <div className="page-inner">
      <h2 className="stats-title">{p[0]?.text}</h2>
      {p[1] && <p className="stats-note">{p[1].text}</p>}
      <div className="flow">
        {stats.map((s, i) => (
          <div className="stat-item" key={i}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MillionPage({ page }: { page: BookPage }) {
  return (
    <div className="page-inner">
      <div className="million-kicker">من صفحات العطاء</div>
      <div className="million-name">{page.name}</div>
      <div className="million-amount amount">{page.amount_raw}</div>
      <div className="million-rule" aria-hidden="true" />
    </div>
  );
}

function OpenerPage({ page }: { page: BookPage }) {
  const p = paras(page.lines);
  return (
    <div className="page-inner">
      <h2 className="opener-title">{p[0]?.text}</h2>
      {p[1] && <div className="opener-sub">{p[1].text}</div>}
      {p[2] && <p className="opener-note">{p[2].text}</p>}
    </div>
  );
}

function DonorListPage({ page }: { page: BookPage }) {
  const rows = page.rows ?? [];
  return (
    <div className="page-inner">
      <div className="donorlist-head">{page.heading || "دفتر النفرة"}</div>
      <div className="donor-table">
        {rows.map((r, i) => (
          <div className="donor-row" key={i}>
            <span className="donor-n">{r.n ?? ""}</span>
            <span className="donor-name">{r.name}</span>
            <span className="donor-amount amount">{r.amount_raw}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosingPage({ page }: { page: BookPage }) {
  const p = paras(page.lines);
  return (
    <div className="page-inner">
      <h2 className="narrative-title">{p[0]?.text}</h2>
      <div className="flow">
        {p.slice(1).map((b, i) => (
          <p key={i} className="body-text">{b.text}</p>
        ))}
      </div>
    </div>
  );
}

function VersionPage({ page }: { page: BookPage }) {
  const p = paras(page.lines);
  return (
    <div className="page-inner">
      <h2 className="version-title">{p[0]?.text}</h2>
      {p.slice(1).map((b, i) => (
        <p key={i} className="body-text">{b.text}</p>
      ))}
    </div>
  );
}

function BackCoverPage({ page }: { page: BookPage }) {
  const p = paras(page.lines);
  return (
    <div className="page-inner">
      <WireGlow />
      <div className="backcover-title">{p[0]?.text}</div>
      {p[1] && <div className="backcover-sub">{p[1].text}</div>}
      <Decor />
    </div>
  );
}

const CLASSES: Record<string, string> = {
  COVER: "cover",
  TITLE: "cover title-page",
  DEDICATION: "dedication",
  NARRATIVE: "narrative",
  BRIDGE: "bridge",
  STATS: "stats",
  MILLION_DONOR: "million",
  REGULAR_OPENER: "opener",
  REGULAR_LIST: "donorlist",
  CLOSING: "closing",
  VERSION: "version",
  BACK_COVER: "backcover",
};

export function PageView({ page }: { page: BookPage }) {
  let body;
  switch (page.type) {
    case "COVER": body = <CoverPage page={page} />; break;
    case "TITLE": body = <TitlePage page={page} />; break;
    case "DEDICATION": body = <DedicationPage page={page} />; break;
    case "NARRATIVE": body = <NarrativePage page={page} />; break;
    case "BRIDGE": body = <BridgePage page={page} />; break;
    case "STATS": body = <StatsPage page={page} />; break;
    case "MILLION_DONOR": body = <MillionPage page={page} />; break;
    case "REGULAR_OPENER": body = <OpenerPage page={page} />; break;
    case "REGULAR_LIST": body = <DonorListPage page={page} />; break;
    case "CLOSING": body = <ClosingPage page={page} />; break;
    case "VERSION": body = <VersionPage page={page} />; break;
    case "BACK_COVER": body = <BackCoverPage page={page} />; break;
    default: body = null;
  }
  return (
    <>
      {body}
      <Folio page={page} />
    </>
  );
}

export function pageClass(page: BookPage): string {
  return CLASSES[page.type] || "";
}

export function pageLabel(page: BookPage): string {
  const n = parseInt(page.id, 10);
  const label =
    page.type === "MILLION_DONOR"
      ? `${page.name} — ${page.amount_raw}`
      : paras(page.lines)[0]?.text || page.type;
  return `صفحة ${n}: ${label}`;
}
