// Shared loading and error display with a Retry button (System SDS §3).
export function LoadState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (error)
    return (
      <div className="alert" role="alert">
        {error}{" "}
        <button type="button" className="link" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  if (loading) return <p>Loading…</p>;
  return null;
}
