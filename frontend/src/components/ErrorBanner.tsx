interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <div className="error-banner__content">
        <strong>There is a problem</strong>
        <p>{message}</p>
      </div>
      <div className="error-banner__actions">
        {onRetry ? (
          <button type="button" className="button button--secondary" onClick={onRetry}>
            Try again
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            className="button button--quiet"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
