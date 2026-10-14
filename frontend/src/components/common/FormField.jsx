import React from 'react';

/**
 * Reusable accessible form field wrapper.
 */
export const FormField = ({
  label,
  htmlFor,
  required = false,
  error,
  helpText,
  className = '',
  children,
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label" htmlFor={htmlFor}>
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}
      {children}
      {helpText && !error && (
        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
          {helpText}
        </span>
      )}
      {error && (
        <span
          role="alert"
          style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}
        >
          {error}
        </span>
      )}
    </div>
  );
};
