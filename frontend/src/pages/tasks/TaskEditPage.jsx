import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FormField } from '../../components/common/FormField';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDateInput } from '../../utils/dateUtils';

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const TaskEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [task, setTask] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    assignedEmployee: '',
    priority: 'Medium',
    department: 'Development',
    startDate: '',
    dueDate: '',
    description: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const [taskRes, empRes] = await Promise.all([
        api.get(`/tasks/${id}`),
        api.get('/employees?limit=100'),
      ]);

      if (taskRes.data.success) {
        const t = taskRes.data.data;
        setTask(t);
        setFormData({
          title: t.title || '',
          assignedEmployee: t.assignedEmployee?._id || t.assignedEmployee || '',
          priority: t.priority || 'Medium',
          department: t.department || 'Development',
          startDate: formatDateInput(t.startDate),
          dueDate: formatDateInput(t.dueDate),
          description: t.description || '',
        });
      }

      if (empRes.data.success) {
        setEmployees(empRes.data.data);
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
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setServerError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.assignedEmployee) errors.assignedEmployee = 'Assigned Employee is required';
    if (!formData.startDate) errors.startDate = 'Start Date is required';
    if (!formData.dueDate) errors.dueDate = 'Due Date is required';
    if (
      formData.startDate &&
      formData.dueDate &&
      new Date(formData.dueDate) < new Date(formData.startDate)
    ) {
      errors.dueDate = 'Due Date cannot be earlier than Start Date';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    try {
      setSubmitting(true);
      const res = await api.put(`/tasks/${id}`, {
        title: formData.title.trim(),
        assignedEmployee: formData.assignedEmployee,
        priority: formData.priority,
        department: formData.department,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        description: formData.description.trim(),
      });

      if (res.data.success) {
        toastSuccess('Task updated successfully!');
        navigate(`/tasks/${id}`);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to update task.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="container">
        <LoadingSpinner message="Loading task details for editing..." />
      </main>
    );
  }

  if (fetchError || !task) {
    return (
      <main className="container">
        <ErrorState
          title="Task Unavailable"
          message={fetchError || 'Task record could not be found.'}
          onRetry={fetchData}
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

  return (
    <main className="container">
      <div className="form-container">
        <div className="card" style={{ padding: '2.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
              Edit Task ({task.taskId})
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate(`/tasks/${id}`)}
              >
                Back to Details
              </button>
            </div>
          </div>

          {/* Terminal Task Banner: Completed and Cancelled cannot be edited */}
          {isTerminal && (
            <div
              className="error-banner"
              role="alert"
              style={{
                backgroundColor: '#fff7ed',
                borderColor: '#fdba74',
                color: '#c2410c',
                marginBottom: '1.5rem',
              }}
            >
              <strong>Notice:</strong> This task is marked as <strong>{task.status}</strong>.
              Completed and Cancelled tasks are immutable and cannot be modified.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <fieldset disabled={isTerminal} style={{ border: 'none', padding: 0 }}>
              <div className="form-grid-2">
                <FormField
                  label="Title"
                  htmlFor="edit-task-title"
                  required
                  error={fieldErrors.title}
                >
                  <input
                    type="text"
                    id="edit-task-title"
                    name="title"
                    className={`input-text ${fieldErrors.title ? 'input-error' : ''}`}
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </FormField>

                <FormField
                  label="Assigned Employee"
                  htmlFor="edit-task-employee"
                  required
                  error={fieldErrors.assignedEmployee}
                >
                  <select
                    id="edit-task-employee"
                    name="assignedEmployee"
                    className="select-input"
                    value={formData.assignedEmployee}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => {
                      const isCurrent = (task.assignedEmployee?._id || task.assignedEmployee) === emp._id;
                      const count = emp.activeTaskCount || 0;
                      const isAtCapacity = !isCurrent && count >= 3;
                      const isInactive = emp.status === 'Inactive';
                      const labelSuffix = isCurrent
                        ? `(Currently Assigned - ${count}/3)`
                        : isAtCapacity
                        ? `(At Capacity - 3/3 tasks)`
                        : isInactive
                        ? `(Inactive - Cannot Assign)`
                        : emp.status === 'On Leave'
                        ? `(On Leave)`
                        : `(${count}/3 active tasks)`;
                      return (
                        <option
                          key={emp._id}
                          value={emp._id}
                          disabled={isAtCapacity || isInactive}
                        >
                          {emp.fullName} - {emp.department} {labelSuffix}
                        </option>
                      );
                    })}
                  </select>
                </FormField>

                <FormField
                  label="Priority"
                  htmlFor="edit-task-priority"
                  required
                >
                  <select
                    id="edit-task-priority"
                    name="priority"
                    className="select-input"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Department"
                  htmlFor="edit-task-dept"
                  required
                >
                  <select
                    id="edit-task-dept"
                    name="department"
                    className="select-input"
                    value={formData.department}
                    onChange={handleChange}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Start Date"
                  htmlFor="edit-task-start-date"
                  required
                  error={fieldErrors.startDate}
                >
                  <input
                    type="date"
                    id="edit-task-start-date"
                    name="startDate"
                    className={`input-text ${fieldErrors.startDate ? 'input-error' : ''}`}
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </FormField>

                <FormField
                  label="Due Date"
                  htmlFor="edit-task-due-date"
                  required
                  error={fieldErrors.dueDate}
                >
                  <input
                    type="date"
                    id="edit-task-due-date"
                    name="dueDate"
                    className={`input-text ${fieldErrors.dueDate ? 'input-error' : ''}`}
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                  />
                </FormField>

                <FormField
                  label="Description"
                  htmlFor="edit-task-desc"
                  className="full-width"
                >
                  <textarea
                    id="edit-task-desc"
                    name="description"
                    rows={4}
                    className="input-text"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </FormField>
              </div>

              {serverError && (
                <div className="error-banner" role="alert" style={{ marginTop: '1.5rem' }}>
                  {serverError}
                </div>
              )}

              {!isTerminal && (
                <button
                  type="submit"
                  id="save-task-btn"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1.5rem' }}
                  disabled={submitting}
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              )}
            </fieldset>
          </form>
        </div>
      </div>
    </main>
  );
};
