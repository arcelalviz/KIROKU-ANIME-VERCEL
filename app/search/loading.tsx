export default function SearchLoading() {
  return <div className="shell kiroku-skeleton-page" aria-label="Loading anime results" role="status">
    <div className="kiroku-skeleton kiroku-skeleton-label"/>
    <div className="kiroku-skeleton kiroku-skeleton-title"/>
    <div className="kiroku-skeleton-grid">{Array.from({ length:10 }, (_,i) => <div key={i} className="kiroku-skeleton kiroku-skeleton-card"/>)}</div>
  </div>;
}
