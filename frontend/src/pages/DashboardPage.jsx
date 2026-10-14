import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';

export const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/dashboard');
      if (res.data.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      const msg = err.message || 'Failed to load dashboard metrics';
      setFetchError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <main className="container">
        <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Dashboard</h1>
        <LoadingSpinner message="Calculating live dashboard metrics from database..." />
      </main>
    );
  }

  if (fetchError && !metrics) {
    return (
      <main className="container">
        <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Dashboard</h1>
        <ErrorState
          title="Dashboard Unavailable"
          message={fetchError}
          onRetry={fetchMetrics}
        />
      </main>
    );
  }

  const { employees, tasks, employeeWorkload } = metrics || {
    employees: { total: 0, active: 0, inactive: 0, onLeave: 0 },
    tasks: { total: 0, todo: 0, inProgress: 0, completed: 0, cancelled: 0, overdue: 0 },
    employeeWorkload: [],
  };

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
        <button
          type="button"
          className="btn btn-outline"
          onClick={fetchMetrics}
          disabled={loading}
          style={{ fontSize: '0.85rem' }}
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Row 1: Employee Metrics */}
      <section aria-labelledby="section-employee-metrics" style={{ marginBottom: '1.5rem' }}>
        <h2 id="section-employee-metrics" className="sr-only" style={{ display: 'none' }}>
          Employee Statistics
        </h2>
        <div className="stats-grid-4">
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/employees')}
            title="View all employees"
          >
            <div className="stat-card-label">Total Employees</div>
            <div className="stat-card-value">{employees.total}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/employees?status=Active')}
            title="View active employees"
          >
            <div className="stat-card-label">Active</div>
            <div className="stat-card-value val-active">{employees.active}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/employees?status=Inactive')}
            title="View inactive employees"
          >
            <div className="stat-card-label">Inactive</div>
            <div className="stat-card-value">{employees.inactive}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/employees?status=On+Leave')}
            title="View on-leave employees"
          >
            <div className="stat-card-label">On Leave</div>
            <div className="stat-card-value val-onleave">{employees.onLeave}</div>
          </div>
        </div>
      </section>

      {/* Row 2: Task Metrics */}
      <section aria-labelledby="section-task-metrics" style={{ marginBottom: '2rem' }}>
        <h2 id="section-task-metrics" className="sr-only" style={{ display: 'none' }}>
          Task Statistics
        </h2>
        <div className="stats-grid-6">
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/tasks')}
            title="View all tasks"
          >
            <div className="stat-card-label">Total Tasks</div>
            <div className="stat-card-value">{tasks.total}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/tasks?status=Todo')}
            title="View Todo tasks"
          >
            <div className="stat-card-label">Todo</div>
            <div className="stat-card-value">{tasks.todo}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/tasks?status=In+Progress')}
            title="View In Progress tasks"
          >
            <div className="stat-card-label">In Progress</div>
            <div className="stat-card-value val-inprogress">{tasks.inProgress}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/tasks?status=Completed')}
            title="View completed tasks"
          >
            <div className="stat-card-label">Completed</div>
            <div className="stat-card-value val-completed">{tasks.completed}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/tasks?status=Cancelled')}
            title="View cancelled tasks"
          >
            <div className="stat-card-label">Cancelled</div>
            <div className="stat-card-value val-cancelled">{tasks.cancelled}</div>
          </div>
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/tasks')}
            title="View overdue tasks"
          >
            <div className="stat-card-label">Overdue</div>
            <div className="stat-card-value val-overdue">{tasks.overdue}</div>
          </div>
        </div>
      </section>

      {/* Employee Workload Table */}
      <section style={{ marginTop: '2rem' }}>
        <h2 className="stat-section-title">Employee Workload</h2>
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '65%' }}>Employee</th>
                  <th style={{ width: '35%' }}>Active Tasks</th>
                </tr>
              </thead>
              <tbody>
                {employeeWorkload.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No active tasks currently assigned.
                    </td>
                  </tr>
                ) : (
                  employeeWorkload.map((item) => (
                    <tr
                      key={item._id || item.employeeId}
                      style={{ cursor: item._id ? 'pointer' : 'default' }}
                      onClick={() => item._id && navigate(`/employees/${item._id}`)}
                    >
                      <td style={{ fontWeight: 500 }}>
                        {item.employee}
                        {item.department && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                            ({item.department})
                          </span>
                        )}
                        {item.employeeId && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.35rem' }}>
                            &bull; {item.employeeId}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            backgroundColor: item.activeTasks >= 3 ? '#fee2e2' : '#eff6ff',
                            color: item.activeTasks >= 3 ? '#b91c1c' : '#1d4ed8',
                          }}
                        >
                          {item.activeTasks} / 3
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
};
