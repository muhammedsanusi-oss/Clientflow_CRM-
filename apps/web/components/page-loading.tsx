import "./page-loading.css";

/** Shared server-rendered route fallback; it never delays or changes page data. */
export function PageLoading({ label = "Loading page...", website = false }: { label?: string; website?: boolean }) {
  return <main className="cf-page-loading" aria-label={label.replace(/\.+$/, "")}>
    <div className="cf-loading-status" role="status" aria-live="polite">
      <span className="cf-loading-spinner" aria-hidden="true" />
      <div><h1>{label}</h1><p>Getting everything ready for you.</p></div>
    </div>
    <div className={`cf-loading-skeleton${website ? " cf-loading-website" : ""}`} aria-hidden="true">
      <div className="cf-loading-line" /><div className="cf-loading-line cf-loading-line-short" />
      {website ? <div className="cf-loading-preview" /> : <div className="cf-loading-cards">{[0, 1, 2].map(key => <div key={key} />)}</div>}
      <div className="cf-loading-content" />
    </div>
  </main>;
}
