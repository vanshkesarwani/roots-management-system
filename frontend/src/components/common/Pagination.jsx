import React from 'react';

export const Pagination = ({
  total = 0,
  page = 1,
  limit = 10,
  pages = 1,
  onPageChange,
  entityName = 'items',
}) => {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pageNumbers = [];
    for (let i = 1; i <= pages; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  return (
    <div className="pagination-row">
      <div className="pagination-summary">
        Showing {start}-{end} of {total} {entityName}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous Page"
        >
          &lsaquo;
        </button>

        {getPageNumbers().map((num) => (
          <button
            key={num}
            type="button"
            className={`pagination-btn ${num === page ? 'active' : ''}`}
            onClick={() => onPageChange(num)}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          className="pagination-btn"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          title="Next Page"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
};
