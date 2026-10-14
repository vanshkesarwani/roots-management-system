import React, { useState, useRef, useEffect } from 'react';

const VALID_NEXT_STATUSES = {
  'Todo': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  'Completed': [],
  'Cancelled': [],
};

const STATUS_CLASS_MAP = {
  'Todo': 'badge-todo',
  'In Progress': 'badge-inprogress',
  'Completed': 'badge-completed',
  'Cancelled': 'badge-cancelled',
};

export const TaskStatusDropdown = ({ task, onStatusChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentStatus = task.status;
  const nextAllowed = VALID_NEXT_STATUSES[currentStatus] || [];
  const isTerminal = nextAllowed.length === 0;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (newStatus) => {
    setOpen(false);
    if (onStatusChange) {
      onStatusChange(task._id, newStatus);
    }
  };

  const badgeClass = STATUS_CLASS_MAP[currentStatus] || 'badge-todo';

  if (isTerminal) {
    return (
      <span className={`status-badge ${badgeClass}`} style={{ cursor: 'default' }}>
        {currentStatus}
      </span>
    );
  }

  return (
    <div className="status-dropdown-wrapper" ref={containerRef}>
      <button
        type="button"
        className={`status-badge ${badgeClass}`}
        onClick={() => setOpen(!open)}
        title="Click to advance status"
      >
        <span>{currentStatus}</span>
        <span style={{ fontSize: '0.65rem' }}>&#9660;</span>
      </button>

      {open && (
        <div className="status-menu-popup">
          {nextAllowed.map((nextStatus) => (
            <button
              key={nextStatus}
              type="button"
              className="status-menu-item"
              onClick={() => handleSelect(nextStatus)}
            >
              {nextStatus}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
