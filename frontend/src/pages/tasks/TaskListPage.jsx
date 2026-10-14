import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { TaskStatusDropdown } from '../../components/tasks/TaskStatusDropdown';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDateDisplay } from '../../utils/dateUtils';
import {
  parseTaskParams,
  buildCleanSearchParams,
  VALID_DEPARTMENTS,
  VALID_TASK_PRIORITIES,
  VALID_TASK_STATUSES,
} from '../../utils/urlParams';

export const TaskListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Dialog state for deletion
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Parse and sanitize current URL parameters (Single Source of Truth)
  const currentFilters = useMemo(() => parseTaskParams(searchParams), [searchParams]);

  // Local search input state, synchronized with URL on browser navigation
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
        priority: 'All',
        status: 'All',
        sortBy: 'createdDate',
        sortOrder: 'desc',
        dueFrom: '',
        dueTo: '',
        search: '',
      });
      setSearchParams(nextParams);
    },
    [currentFilters, setSearchParams]
  );

  // Fetch tasks matching the current URL query parameters with AbortController for race condition protection
  const fetchTasks = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setFetchError(null);

        const params = {};
        if (currentFilters.search) params.search = currentFilters.search;
        if (currentFilters.department !== 'All') params.department = currentFilters.department;
        if (currentFilters.priority !== 'All') params.priority = currentFilters.priority;
        if (currentFilters.status !== 'All') params.status = currentFilters.status;
        if (currentFilters.dueFrom) params.dueFrom = currentFilters.dueFrom;
        if (currentFilters.dueTo) params.dueTo = currentFilters.dueTo;
        if (currentFilters.sortBy) params.sortBy = currentFilters.sortBy;
        if (currentFilters.sortOrder) params.sortOrder = currentFilters.sortOrder;
        if (currentFilters.page > 1) params.page = currentFilters.page;
        params.limit = 10;

        const res = await api.get('/tasks', { params, signal });
        if (res.data.success) {
          setTasks(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        if (err.name === 'CanceledError' || axios.isCancel?.(err)) {
          // Stale request aborted; do not show error
          return;
        }
        const msg = err.message || 'Failed to fetch tasks';
        setFetchError(msg);
        toastError(msg);
      } finally {
        setLoading(false);
      }
    },
    [currentFilters, toastError]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchTasks(controller.signal);
    return () => controller.abort();
  }, [fetchTasks]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data.success) {
        toastSuccess(`Task status changed to '${newStatus}'`);
        fetchTasks();
      }
    } catch (err) {
      toastError(err.message || 'Status transition rejected');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/tasks/${deleteTarget.id}`);
      if (res.data.success) {
        toastSuccess('Task deleted successfully');
        setDeleteTarget(null);
        fetchTasks();
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export preserving current search and filters across all pages
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = {};
      if (currentFilters.search) params.search = currentFilters.search;
      if (currentFilters.department !== 'All') params.department = currentFilters.department;
      if (currentFilters.priority !== 'All') params.priority = currentFilters.priority;
      if (currentFilters.status !== 'All') params.status = currentFilters.status;
      if (currentFilters.dueFrom) params.dueFrom = currentFilters.dueFrom;
      if (currentFilters.dueTo) params.dueTo = currentFilters.dueTo;
      if (currentFilters.sortBy) params.sortBy = currentFilters.sortBy;
      if (currentFilters.sortOrder) params.sortOrder = currentFilters.sortOrder;

      const res = await api.get('/tasks/export/csv', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tasks-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toastSuccess('Task CSV downloaded successfully matching current filters!');
    } catch (err) {
      toastError(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    return <span className={`priority-badge priority-${p}`}>{priority}</span>;
  };

  const hasActiveFilters =
    Boolean(currentFilters.search) ||
    currentFilters.department !== 'All' ||
    currentFilters.priority !== 'All' ||
    currentFilters.status !== 'All' ||
    Boolean(currentFilters.dueFrom) ||
    Boolean(currentFilters.dueTo) ||
    currentFilters.page > 1;

  return (
    <main className="container">
      {/* Search & Actions Header Row */}
      <div className="filter-toolbar">
        <div className="search-action-row">
          <form className="search-box" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              id="task-search-input"
              className="input-text"
              placeholder="Search title, task ID, or employee"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search tasks"
            />
            <button type="submit" id="task-search-btn" className="btn btn-primary">
              Search
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="add-task-btn"
              className="btn btn-primary"
              onClick={() => navigate('/tasks/new')}
            >
              + Add Task
            </button>
            <button
              type="button"
              id="export-csv-btn"
              className="btn btn-secondary"
              onClick={handleExportCsv}
              disabled={exporting}
              title="Export all tasks matching current filters to CSV"
            >
              {exporting ? 'Exporting...' : 'Export To Csv'}
            </button>
          </div>
        </div>

        {/* Filters and Sorters */}
        <div className="filter-pills-row">
          <select
            id="task-filter-dept"
            className="filter-select"
            value={currentFilters.department}
            onChange={(e) => updateFilters({ department: e.target.value })}
            aria-label="Filter tasks by department"
          >
            <option value="All">Department (All)</option>
            {VALID_DEPARTMENTS.filter((d) => d !== 'All').map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            id="task-filter-priority"
            className="filter-select"
            value={currentFilters.priority}
            onChange={(e) => updateFilters({ priority: e.target.value })}
            aria-label="Filter tasks by priority"
          >
            <option value="All">Priority (All)</option>
            {VALID_TASK_PRIORITIES.filter((p) => p !== 'All').map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            id="task-filter-status"
            className="filter-select"
            value={currentFilters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label="Filter tasks by status"
          >
            <option value="All">Status (All)</option>
            {VALID_TASK_STATUSES.filter((s) => s !== 'All').map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="date"
            id="task-due-from"
            className="filter-select"
            style={{ width: '135px' }}
            value={currentFilters.dueFrom}
            onChange={(e) => updateFilters({ dueFrom: e.target.value })}
            title="Due From"
            aria-label="Due from date"
          />

          <input
            type="date"
            id="task-due-to"
            className="filter-select"
            style={{ width: '135px' }}
            value={currentFilters.dueTo}
            onChange={(e) => updateFilters({ dueTo: e.target.value })}
            title="Due To"
            aria-label="Due to date"
          />

          <select
            id="task-sort-by"
            className="filter-select"
            value={currentFilters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value })}
            aria-label="Sort tasks by"
          >
            <option value="createdDate">Sort by Created Date</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
          </select>

          <select
            id="task-sort-order"
            className="filter-select"
            style={{ minWidth: '85px' }}
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
                navigate('/tasks');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table matching assignment layout */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '11%' }}>Task ID</th>
                <th style={{ width: '25%' }}>Title</th>
                <th style={{ width: '18%' }}>Assigned Employee</th>
                <th style={{ width: '14%' }}>Department</th>
                <th style={{ width: '10%' }}>Priority</th>
                <th style={{ width: '11%' }}>Status</th>
                <th style={{ width: '14%' }}>Due Date</th>
                <th style={{ width: '7%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <LoadingSpinner message="Loading tasks from server..." />
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={8}>
                    <ErrorState
                      title="Unable to load tasks"
                      message={fetchError}
                      onRetry={() => fetchTasks()}
                    />
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No tasks found"
                      description="No tasks match your active filters or search terms."
                      actionLabel="+ Add New Task"
                      onAction={() => navigate('/tasks/new')}
                    />
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const empName =
                    task.assignedEmployee?.fullName ||
                    task.assignedEmployeeSnapshot?.fullName ||
                    'Unassigned';
                  const isTerminal = task.status === 'Completed' || task.status === 'Cancelled';

                  return (
                    <tr key={task._id || task.taskId}>
                      <td style={{ fontWeight: 600, color: '#475569' }}>{task.taskId}</td>
                      <td style={{ fontWeight: 500 }}>
                        <span
                          style={{ cursor: 'pointer', color: '#0f172a' }}
                          onClick={() => navigate(`/tasks/${task._id}`)}
                        >
                          {task.title}
                        </span>
                      </td>
                      <td>
                        {task.assignedEmployee?._id ? (
                          <span
                            style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                            onClick={() => navigate(`/employees/${task.assignedEmployee._id}`)}
                          >
                            {empName}
                          </span>
                        ) : (
                          <span>{empName}</span>
                        )}
                      </td>
                      <td>{task.department}</td>
                      <td>{getPriorityBadge(task.priority)}</td>
                      <td>
                        <TaskStatusDropdown task={task} onStatusChange={handleStatusChange} />
                      </td>
                      <td className={task.isOverdue ? 'overdue-text' : ''}>
                        {formatDateDisplay(task.dueDate, false)} {task.isOverdue ? '(Overdue)' : ''}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <ActionMenu
                          onView={() => navigate(`/tasks/${task._id}`)}
                          onEdit={!isTerminal ? () => navigate(`/tasks/${task._id}/edit`) : null}
                          onDelete={() => setDeleteTarget({ id: task._id, title: task.title })}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          total={pagination.total}
          page={pagination.page}
          pages={pagination.pages}
          limit={pagination.limit}
          entityName="tasks"
          onPageChange={(newPage) => updateFilters({ page: newPage })}
        />
      </div>

      {/* Accessible Confirm Dialog for Task Deletion */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Task"
        message={`Are you sure you want to delete task "${deleteTarget?.title}"? This action cannot be reversed.`}
        confirmLabel="Delete Task"
        confirmVariant="danger"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
};
