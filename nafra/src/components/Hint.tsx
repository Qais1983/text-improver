export function Hint() {
  return (
    <div className="hint" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 11V7a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v7M10 10V6a2 2 0 0 0-4 0v9" />
        <path d="M18 11a6 6 0 0 1-6 8l-3-2c-2-1.5-3-3-4-5l-1-2a1.5 1.5 0 0 1 2.5-1.6L8 12" />
      </svg>
      <span>اسحب لتقلب الصفحة</span>
    </div>
  );
}
