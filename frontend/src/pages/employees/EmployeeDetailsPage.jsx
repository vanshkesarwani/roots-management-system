import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDateDisplay } from '../../utils/dateUtils';

export const EmployeeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get(`/employees/${id}`);
      if (res.data.success) {
        setEmployee(res.data.data);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch employee details';
      setFetchError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await api.delete(`/employees/${employee._id}`);
      if (res.data.success) {
        toastSuccess('Employee deleted successfully');
        setConfirmOpen(false);
        navigate('/employees');
      }
    } catch (err) {
      // Rejection with BR7 error if active tasks exist
      toastError(err.message || 'Cannot delete employee with active tasks');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="container">
        <LoadingSpinner message="Loading employee profile..." />
      </main>
    );
  }

  if (fetchError || !employee) {
    return (
      <main className="container">
        <ErrorState
          title="Employee Profile Unavailable"
          message={fetchError || 'Employee record could not be found.'}
          onRetry={fetchEmployee}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/employees')}>
            Back to Employee Directory
          </button>
        </div>
      </main>
    );
  }

  const activeTasks = employee.activeTasks || [];
  const pastTasks = employee.pastTasks || [];

  return (
    <main className="container">
      {/* Header bar */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {employee.fullName?.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="page-title" style={{ fontSize: '1.75rem', margin: 0 }}>
                {employee.fullName}
              </h1>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                ({employee.employeeId})
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {employee.role} &bull; {employee.department}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/employees/${employee._id}/edit`)}
          >
            Edit Profile
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmOpen(true)}
          >
            Delete Employee
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/employees')}
          >
            Back to Directory
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#1e293b' }}>
          Employee Information & Status
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Email Address</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{employee.email}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Phone</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{employee.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Joining Date</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{formatDateDisplay(employee.joiningDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Current Status</div>
            <div style={{ marginTop: '0.2rem' }}>
              <span
                className={`status-badge ${
                  employee.status === 'Active'
                    ? 'badge-completed'
                    : employee.status === 'On Leave'
                    ? 'badge-cancelled'
                    : 'badge-todo'
                }`}
              >
                {employee.status}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Workload Capacity</div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: activeTasks.length >= 3 ? '#b91c1c' : '#15803d',
              }}
            >
              {activeTasks.length} / 3 Active Tasks
            </div>
          </div>
        </div>

        {employee.status === 'On Leave' && employee.leaveStartDate && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '6px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#b45309' }}>Scheduled Leave Period: </span>
            <span style={{ color: '#78350f' }}>
              {formatDateDisplay(employee.leaveStartDate)} to {formatDateDisplay(employee.leaveEndDate)}
            </span>
          </div>
        )}

        {employee.skills && employee.skills.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '0.5rem' }}>
              Skills & Expertise
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {employee.skills.map((skill, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #dbeafe',
                    borderRadius: '4px',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Tasks Section */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
            Active Tasks ({activeTasks.length})
          </h2>
          {activeTasks.length < 3 && employee.status === 'Active' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/tasks/new')}
            >
              + Assign New Task
            </button>
          )}
        </div>

        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Task ID</th>
                  <th style={{ width: '35%' }}>Title</th>
                  <th style={{ width: '15%' }}>Priority</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '20%' }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No active tasks currently assigned to {employee.fullName}.
                    </td>
                  </tr>
                ) : (
                  activeTasks.map((task) => (
                    <tr
                      key={task._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/tasks/${task._id}`)}
                    >
                      <td style={{ fontWeight: 600 }}>{task.taskId}</td>
                      <td style={{ fontWeight: 500 }}>{task.title}</td>
                      <td>
                        <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            task.status === 'In Progress' ? 'badge-inprogress' : 'badge-todo'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className={task.isOverdue ? 'overdue-text' : ''}>
                        {formatDateDisplay(task.dueDate)} {task.isOverdue ? '(Overdue)' : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Historical / Completed Tasks */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          Historical Tasks ({pastTasks.length})
        </h2>

        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Task ID</th>
                  <th style={{ width: '35%' }}>Title</th>
                  <th style={{ width: '15%' }}>Priority</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '20%' }}>Completed Date</th>
                </tr>
              </thead>
              <tbody>
                {pastTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No completed or cancelled tasks on record.
                    </td>
                  </tr>
                ) : (
                  pastTasks.map((task) => (
                    <tr
                      key={task._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/tasks/${task._id}`)}
                    >
                      <td style={{ fontWeight: 600 }}>{task.taskId}</td>
                      <td style={{ fontWeight: 500 }}>{task.title}</td>
                      <td>
                        <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            task.status === 'Completed' ? 'badge-completed' : 'badge-cancelled'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td>
                        {task.completedDate ? formatDateDisplay(task.completedDate) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Accessible Confirm Dialog for Deletion */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employee.fullName}? All assigned active tasks must be completed or cancelled beforehand.`}
        confirmLabel="Delete Employee"
        confirmVariant="danger"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
};
