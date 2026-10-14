import React from 'react';

/**
 * Reusable error and retry state component.
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'Failed to load data from the server.',
  onRetry,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          color: '#dc2626',
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3
        style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          color: '#991b1b',
          marginBottom: '0.35rem',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.875rem',
          color: '#64748b',
          maxWidth: '400px',
          marginBottom: onRetry ? '1.25rem' : '0',
        }}
      >
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={onRetry}
          style={{ fontSize: '0.85rem' }}
        >
          Retry Request
        </button>
      )}
    </div>
  );
};
