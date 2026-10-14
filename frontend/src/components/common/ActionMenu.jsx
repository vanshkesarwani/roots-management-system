import React, { useState, useRef, useEffect } from 'react';

export const ActionMenu = ({ onView, onEdit, onDelete, canEdit = true }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="action-cell" ref={menuRef}>
      <button
        type="button"
        className="action-menu-btn"
        onClick={() => setOpen(!open)}
        title="Actions"
      >
        &#8942;
      </button>

      {open && (
        <div className="action-popup">
          {onView && (
            <button
              type="button"
              className="action-popup-item"
              onClick={() => {
                setOpen(false);
                onView();
              }}
            >
              View
            </button>
          )}
          {onEdit && canEdit && (
            <button
              type="button"
              className="action-popup-item"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="action-popup-item action-delete"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
