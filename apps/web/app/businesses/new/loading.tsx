export default function Loading() {
  return <main role="status" aria-label="Loading business form" className="mx-auto max-w-2xl space-y-6 px-5 py-10 animate-pulse"><div className="h-8 w-64 rounded bg-slate-200" />{Array.from({length: 6}, (_, i) => <div key={i} className="h-12 rounded bg-slate-100" />)}</main>;
}
