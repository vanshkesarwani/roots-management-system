import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import {
  parseEmployeeParams,
  buildCleanSearchParams,
  VALID_DEPARTMENTS,
  VALID_EMPLOYEE_STATUSES,
} from '../../utils/urlParams';

export const EmployeeListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Dialog state for deletion
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Single Source of Truth: parse and sanitize URL parameters
  const currentFilters = useMemo(() => parseEmployeeParams(searchParams), [searchParams]);

  // Synchronize local search input with URL (handles browser Back/Forward)
  const [prevSearch, setPrevSearch] = useState(currentFilters.search);
  const [searchInput, setSearchInput] = useState(currentFilters.search);

  if (currentFilters.search !== prevSearch) {
    setPrevSearch(currentFilters.search);
    setSearchInput(currentFilters.search);
  }

  // Update URL parameters (resets page to 1 on filter/search change)
  const updateFilters = useCallback(
    (updates) => {
      const nextParams = buildCleanSearchParams(currentFilters, updates, {
        department: 'All',
        status: 'All',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: '',
      });
      setSearchParams(nextParams);
    },
    [currentFilters, setSearchParams]
  );

  // Fetch employees matching current URL parameters with AbortController
  const fetchEmployees = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setFetchError(null);

        const params = {};
        if (currentFilters.search) params.search = currentFilters.search;
        if (currentFilters.department !== 'All') params.department = currentFilters.department;
        if (currentFilters.status !== 'All') params.status = currentFilters.status;
        if (currentFilters.sortBy) params.sortBy = currentFilters.sortBy;
        if (currentFilters.sortOrder) params.sortOrder = currentFilters.sortOrder;
        if (currentFilters.page > 1) params.page = currentFilters.page;
        params.limit = 10;

        const res = await api.get('/employees', { params, signal });
        if (res.data.success) {
          setEmployees(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        if (
          signal?.aborted ||
          err?.name === 'CanceledError' ||
          axios.isCancel?.(err) ||
          err?.code === 'ERR_CANCELED' ||
          err?.message === 'canceled'
        ) {
          // Newer request superseded this one; ignore safely
          return;
        }
        const msg = err.message || 'Failed to fetch employees';
        setFetchError(msg);
        toastError(msg);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [currentFilters, toastError]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchEmployees(controller.signal);
    return () => controller.abort();
  }, [fetchEmployees]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/employees/${deleteTarget.id}`);
      if (res.data.success) {
        toastSuccess(res.data.message || `Employee ${deleteTarget.name} deleted successfully`);
        setDeleteTarget(null);
        fetchEmployees();
      }
    } catch (err) {
      toastError(err.message || 'Cannot delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="status-badge badge-completed">Active</span>;
      case 'On Leave':
        return <span className="status-badge badge-cancelled">On Leave</span>;
      case 'Inactive':
      default:
        return <span className="status-badge badge-todo">Inactive</span>;
    }
  };

  const hasActiveFilters =
    Boolean(currentFilters.search) ||
    currentFilters.department !== 'All' ||
    currentFilters.status !== 'All' ||
    currentFilters.page > 1;

  return (
    <main className="container">
      {/* Search & Actions Toolbar */}
      <div className="filter-toolbar">
        <div className="search-action-row">
          <form className="search-box" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              id="employee-search-input"
              className="input-text"
              placeholder="Search name, role, or ID"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search employees"
            />
            <button type="submit" id="employee-search-btn" className="btn btn-primary">
              Search
            </button>
          </form>

          <button
            type="button"
            id="add-employee-btn"
            className="btn btn-primary"
            onClick={() => navigate('/employees/new')}
          >
            + Add Employee
          </button>
        </div>

        {/* Filter Pills */}
        <div className="filter-pills-row">
          <select
            id="emp-filter-department"
            className="filter-select"
            value={currentFilters.department}
            onChange={(e) => updateFilters({ department: e.target.value })}
            aria-label="Filter by department"
          >
            <option value="All">Department (All)</option>
            {VALID_DEPARTMENTS.filter((d) => d !== 'All').map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            id="emp-filter-status"
            className="filter-select"
            value={currentFilters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="All">Status (All)</option>
            {VALID_EMPLOYEE_STATUSES.filter((s) => s !== 'All').map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            id="emp-sort-by-select"
            className="filter-select"
            value={currentFilters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value })}
            aria-label="Sort employees by"
          >
            <option value="createdAt">Sort by Registered Date</option>
            <option value="fullName">Sort by Name</option>
            <option value="joiningDate">Sort by Joining Date</option>
            <option value="department">Sort by Department</option>
          </select>

          <select
            id="emp-sort-order-select"
            className="filter-select"
            style={{ minWidth: '90px' }}
            value={currentFilters.sortOrder}
            onChange={(e) => updateFilters({ sortOrder: e.target.value })}
            aria-label="Sort order"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
              onClick={() => {
                setSearchInput('');
                navigate('/employees');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Employees Table matching assignment design */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Employee ID</th>
                <th style={{ width: '22%' }}>Full Name</th>
                <th style={{ width: '16%' }}>Department</th>
                <th style={{ width: '18%' }}>Role</th>
                <th style={{ width: '12%' }}>Status</th>
                <th style={{ width: '10%' }}>Active Tasks</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <LoadingSpinner message="Loading employee directory..." />
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7}>
                    <ErrorState
                      title="Unable to load employees"
                      message={fetchError}
                      onRetry={() => fetchEmployees()}
                    />
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No employees found"
                      description="No records match your active search or filters."
                      actionLabel="+ Add Employee"
                      onAction={() => navigate('/employees/new')}
                    />
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id || emp.employeeId}>
                    <td style={{ fontWeight: 600, color: '#475569' }}>{emp.employeeId}</td>
                    <td style={{ fontWeight: 500 }}>
                      <span
                        style={{ cursor: 'pointer', color: '#0f172a' }}
                        onClick={() => navigate(`/employees/${emp._id}`)}
                      >
                        {emp.fullName}
                      </span>
                    </td>
                    <td>{emp.department}</td>
                    <td>{emp.role}</td>
                    <td>{getStatusBadge(emp.status)}</td>
                    <td style={{ fontWeight: 600 }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: emp.activeTaskCount >= 3 ? '#fee2e2' : '#f1f5f9',
                          color: emp.activeTaskCount >= 3 ? '#b91c1c' : '#334155',
                        }}
                      >
                        {emp.activeTaskCount || 0} / 3
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ActionMenu
                        onView={() => navigate(`/employees/${emp._id}`)}
                        onEdit={() => navigate(`/employees/${emp._id}/edit`)}
                        onDelete={() => setDeleteTarget({ id: emp._id, name: emp.fullName })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          total={pagination.total}
          page={pagination.page}
          pages={pagination.pages}
          limit={pagination.limit}
          entityName="employees"
          onPageChange={(newPage) => updateFilters({ page: newPage })}
        />
      </div>

      {/* Accessible Confirm Dialog for Deletion */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone if the employee has no active tasks.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
};
