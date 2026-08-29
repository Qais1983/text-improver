interface Props {
  dim: boolean;
  isFull: boolean;
  onToc: () => void;
  onShare: () => void;
  onFullscreen: () => void;
  onPrev: () => void;
  onNext: () => void;
  onZoom?: () => void;
  zoomLabel?: string;
  soundOn?: boolean;
  onSound?: () => void;
}

export function Toolbar({
  dim,
  isFull,
  onToc,
  onShare,
  onFullscreen,
  onPrev,
  onNext,
  onZoom,
  zoomLabel,
  soundOn,
  onSound,
}: Props) {
  return (
    <div className={`toolbar ${dim ? "dim" : ""}`} role="toolbar" aria-label="أدوات الكتاب">
      <button className="tool-btn" onClick={onToc} aria-label="الفهرس" title="الفهرس">
        <svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="14" y2="18" /></svg>
      </button>
      {/* في RTL: السابق يمين، التالي يسار */}
      <button className="tool-btn" onClick={onPrev} aria-label="الصفحة السابقة" title="السابقة">
        <svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18" /></svg>
      </button>
      <button className="tool-btn" onClick={onNext} aria-label="الصفحة التالية" title="التالية">
        <svg viewBox="0 0 24 24"><polyline points="15 6 9 12 15 18" /></svg>
      </button>
      {onZoom && (
        <button className="tool-btn" onClick={onZoom} aria-label={zoomLabel || "تكبير"} title={zoomLabel || "تكبير"}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
        </button>
      )}
      {onSound && (
        <button
          className="tool-btn"
          onClick={onSound}
          aria-label={soundOn ? "كتم صوت التقليب" : "تشغيل صوت التقليب"}
          aria-pressed={soundOn}
          title={soundOn ? "صوت التقليب: مُشغّل" : "صوت التقليب: مكتوم"}
        >
          {soundOn ? (
            <svg viewBox="0 0 24 24"><polygon points="4 9 4 15 8 15 13 19 13 5 8 9" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8 8 0 0 1 0 12" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><polygon points="4 9 4 15 8 15 13 19 13 5 8 9" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></svg>
          )}
        </button>
      )}
      <button className="tool-btn" onClick={onShare} aria-label="مشاركة" title="مشاركة">
        <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.7" x2="15.4" y2="6.3" /><line x1="8.6" y1="13.3" x2="15.4" y2="17.7" /></svg>
      </button>
      <button className="tool-btn" onClick={onFullscreen} aria-label={isFull ? "إنهاء ملء الشاشة" : "ملء الشاشة"} title="ملء الشاشة">
        {isFull ? (
          <svg viewBox="0 0 24 24"><polyline points="9 4 9 9 4 9" /><polyline points="15 4 15 9 20 9" /><polyline points="9 20 9 15 4 15" /><polyline points="15 20 15 15 20 15" /></svg>
        ) : (
          <svg viewBox="0 0 24 24"><polyline points="4 9 4 4 9 4" /><polyline points="20 9 20 4 15 4" /><polyline points="4 15 4 20 9 20" /><polyline points="20 15 20 20 15 20" /></svg>
        )}
      </button>
    </div>
  );
}
