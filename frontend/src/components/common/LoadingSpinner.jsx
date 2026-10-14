import React from 'react';

/**
 * Reusable loading spinner indicator.
 */
export const LoadingSpinner = ({ message = 'Loading...', size = 'medium', inline = false }) => {
  const sizeMap = {
    small: '18px',
    medium: '32px',
    large: '48px',
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: inline ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        color: '#64748b',
        fontSize: '0.9rem',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: '3px solid #e2e8f0',
          borderTopColor: 'var(--color-primary, #6366f1)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {message && <span>{message}</span>}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div style={{ padding: '3rem 1rem', width: '100%', textAlign: 'center' }}>
      {content}
    </div>
  );
};
