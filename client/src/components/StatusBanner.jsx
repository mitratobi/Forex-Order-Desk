// Shows an error message with an optional retry button. Announced to screen readers.
export default function StatusBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="banner" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
