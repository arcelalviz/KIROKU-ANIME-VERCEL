export default function AnimeLoading() {
  return <div className="shell kiroku-skeleton-page" aria-label="Loading anime details" role="status">
    <div className="kiroku-skeleton kiroku-skeleton-label"/>
    <div className="kiroku-skeleton kiroku-skeleton-title"/>
    <div className="kiroku-skeleton-detail"><div className="kiroku-skeleton kiroku-skeleton-poster"/><div>
      {Array.from({length:5},(_,i)=><div key={i} className="kiroku-skeleton kiroku-skeleton-description"/>)}
    </div></div>
  </div>;
}
