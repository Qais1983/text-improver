import type { BookPage, Line } from "../lib/types";

// تُصيَّر هذه المكوّنات إلى HTML ثابت وتُسلَّم إلى StPageFlip.

function Decor() {
  return <div className="decor" aria-hidden="true">◆ ◆ ◆</div>;
}

function paras(lines: Line[]) {
  return lines.filter((l): l is { kind: "para"; text: string } => l.kind === "para");
}

function WireGlow() {
  // خيطٌ رفيع مستوحى من سلك كهرباء يتحوّل إلى أثر نور — تجريديّ راقٍ.
  return (
    <svg className="wire" viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--copper)" stopOpacity="0" />
          <stop offset="45%" stopColor="var(--copper)" stopOpacity="0.55" />
          <stop offset="70%" stopColor="var(--glow)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
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
      {p[1] && <p className="cover-subtitle title-sub">{p[1].text}</p>}
      <Decor />
      {p[2] && <p className="title-desc">{p[2].text}</p>}
    </div>
  );
}

function DedicationPage({ page }: { page: BookPage }) {
  return (
    <div className="page-inner">
      {page.lines.map((l, i) =>
        l.kind === "decor" ? (
          <Decor key={i} />
        ) : i === 0 ? (
          <p key={i} className="lead">{l.text}</p>
        ) : (
          <p key={i} className="body-text">{l.text}</p>
        )
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
  const p = paras(page.lines);
  const title = p[0]?.text;
  const rest = p.slice(1);
  return (
    <div className="page-inner">
      <h2 className="bridge-title">{title}</h2>
      {rest.map((b, i) => {
        const isLast = i === rest.length - 1;
        return (
          <p key={i} className={isLast ? "bridge-emph" : "body-text"}>
            {b.text}
          </p>
        );
      })}
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
    case "BACK_COVER": body = <BackCoverPage page={page} />; break;
    default: body = null;
  }
  return <>{body}</>;
}

export function pageClass(page: BookPage): string {
  return CLASSES[page.type] || "";
}

export function pageLabel(page: BookPage): string {
  const n = parseInt(page.id, 10);
  const title = paras(page.lines)[0]?.text || page.type;
  return `صفحة ${n}: ${title}`;
}
