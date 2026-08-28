import type { TocEntry } from "../lib/toc";

interface Props {
  entries: TocEntry[];
  current: number;
  onGoto: (index: number) => void;
  onClose: () => void;
  onRestart: () => void;
}

export function Toc({ entries, current, onGoto, onClose, onRestart }: Props) {
  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <nav className="toc-panel" aria-label="فهرس الكتاب">
        <div className="toc-header">
          <span className="toc-title">الفهرس</span>
          <button className="tool-btn" onClick={onClose} aria-label="إغلاق الفهرس">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>
        <ul className="toc-list">
          {entries.map((e) => (
            <li key={e.label}>
              <button
                className="toc-link"
                onClick={() => onGoto(e.index)}
                aria-current={current === e.index ? "true" : undefined}
              >
                <span>{e.label}</span>
                <span className="toc-page">{e.index + 1}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="toc-restart">
          <button onClick={onRestart}>ابدأ من الغلاف</button>
        </div>
      </nav>
    </div>
  );
}
