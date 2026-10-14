import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { TaskStatusDropdown } from '../../components/tasks/TaskStatusDropdown';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDateDisplay } from '../../utils/dateUtils';

export const TaskDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get(`/tasks/${id}`);
      if (res.data.success) {
        setTask(res.data.data);
      }
    } catch (err) {
      const msg = err.message || 'Failed to load task details';
      setFetchError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data.success) {
        toastSuccess(`Task status changed to '${newStatus}'`);
        fetchTask();
      }
    } catch (err) {
      toastError(err.message || 'Status transition rejected');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await api.delete(`/tasks/${task._id}`);
      if (res.data.success) {
        toastSuccess('Task deleted successfully');
        setConfirmOpen(false);
        navigate('/tasks');
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="container">
        <LoadingSpinner message="Loading task details..." />
      </main>
    );
  }

  if (fetchError || !task) {
    return (
      <main className="container">
        <ErrorState
          title="Task Unavailable"
          message={fetchError || 'Task record could not be found.'}
          onRetry={fetchTask}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/tasks')}>
            Back to Task List
          </button>
        </div>
      </main>
    );
  }

  const isTerminal = task.status === 'Completed' || task.status === 'Cancelled';
  const assignedEmp = task.assignedEmployee;
  const snapshot = task.assignedEmployeeSnapshot;

  return (
    <main className="container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b' }}>{task.taskId}</span>
            <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
              {task.priority}
            </span>
            {task.isOverdue && (
              <span className="priority-badge priority-critical">OVERDUE</span>
            )}
          </div>
          <h1 className="page-title">{task.title}</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <TaskStatusDropdown task={task} onStatusChange={handleStatusChange} />
          {!isTerminal && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/tasks/${task._id}/edit`)}
            >
              Edit Task
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmOpen(true)}
          >
            Delete
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/tasks')}
          >
            Back
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Main Details */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#1e293b' }}>
            Task Overview
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Department</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{task.department}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Current Status</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{task.status}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Start Date</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{formatDateDisplay(task.startDate)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Due Date</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }} className={task.isOverdue ? 'overdue-text' : ''}>
                {formatDateDisplay(task.dueDate)} {task.isOverdue ? '(Overdue)' : ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Completed Date</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {task.completedDate ? formatDateDisplay(task.completedDate) : 'Not Completed Yet'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Created Date</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{formatDateDisplay(task.createdDate)}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '0.35rem' }}>
              Description
            </div>
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1rem',
                fontSize: '0.9rem',
                color: '#334155',
                minHeight: '80px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {task.description || 'No description provided for this task.'}
            </div>
          </div>
        </div>

        {/* Assigned Employee Details Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#1e293b' }}>
            Assigned Employee
          </h2>

          {assignedEmp ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {assignedEmp.fullName?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{assignedEmp.fullName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{assignedEmp.employeeId}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Email: </span>
                  <span style={{ fontWeight: 500 }}>{assignedEmp.email}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Department: </span>
                  <span style={{ fontWeight: 500 }}>{assignedEmp.department}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Status: </span>
                  <span style={{ fontWeight: 600 }}>{assignedEmp.status}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', marginTop: '1.25rem' }}
                onClick={() => navigate(`/employees/${assignedEmp._id}`)}
              >
                View Employee Profile
              </button>
            </div>
          ) : snapshot ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600, marginBottom: '0.5rem' }}>
                Archived Employee Snapshot
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                The original employee record was removed, but historical task details are preserved.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div><strong>Name:</strong> {snapshot.fullName}</div>
                <div><strong>ID:</strong> {snapshot.employeeId}</div>
                <div><strong>Email:</strong> {snapshot.email}</div>
                <div><strong>Dept:</strong> {snapshot.department}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No employee assigned.</p>
          )}
        </div>
      </div>

      {/* Accessible Confirm Dialog for Task Deletion */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Task"
        message={`Are you sure you want to delete task "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete Task"
        confirmVariant="danger"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
};
