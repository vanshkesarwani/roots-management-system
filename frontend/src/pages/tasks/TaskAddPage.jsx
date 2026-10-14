import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FormField } from '../../components/common/FormField';
import { getTodayDateInput } from '../../utils/dateUtils';

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const TaskAddPage = () => {
  const navigate = useNavigate();
  const { success: toastSuccess } = useToast();

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    assignedEmployee: '',
    priority: 'Medium',
    department: 'Development',
    startDate: getTodayDateInput(),
    dueDate: '',
    description: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const res = await api.get('/employees?limit=100');
        if (res.data.success) {
          setEmployees(res.data.data);
          // Pre-select first Active employee with available capacity if none selected yet
          const activeEligible = res.data.data.find(
            (emp) => emp.status === 'Active' && (emp.activeTaskCount || 0) < 3
          );
          if (activeEligible) {
            setFormData((prev) => ({
              ...prev,
              assignedEmployee: prev.assignedEmployee || activeEligible._id,
              department: activeEligible.department || prev.department,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load employee list:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // When employee changes, auto-suggest their department
      if (name === 'assignedEmployee') {
        const selected = employees.find((emp) => emp._id === value);
        if (selected) {
          updated.department = selected.department;
        }
      }
      return updated;
    });
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
      const res = await api.post('/tasks', {
        title: formData.title.trim(),
        assignedEmployee: formData.assignedEmployee,
        priority: formData.priority,
        department: formData.department,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        description: formData.description.trim(),
      });

      if (res.data.success) {
        toastSuccess(`Task ${res.data.data.taskId} created successfully!`);
        navigate('/tasks');
      }
    } catch (err) {
      // Show authoritative business rule rejection in prominent banner
      setServerError(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

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
              Add Task
            </h1>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/tasks')}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid-2">
              {/* Title */}
              <FormField
                label="Title"
                htmlFor="task-title"
                required
                error={fieldErrors.title}
              >
                <input
                  type="text"
                  id="task-title"
                  name="title"
                  className={`input-text ${fieldErrors.title ? 'input-error' : ''}`}
                  placeholder="Enter Title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </FormField>

              {/* Assigned Employee */}
              <FormField
                label="Assigned Employee"
                htmlFor="task-employee"
                required
                error={fieldErrors.assignedEmployee}
                helpText="Only Active employees with fewer than 3 active tasks can be assigned"
              >
                <select
                  id="task-employee"
                  name="assignedEmployee"
                  className={`select-input ${fieldErrors.assignedEmployee ? 'input-error' : ''}`}
                  value={formData.assignedEmployee}
                  onChange={handleChange}
                  disabled={loadingEmployees}
                  required
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => {
                    const count = emp.activeTaskCount || 0;
                    const isAtCapacity = count >= 3;
                    const isInactive = emp.status === 'Inactive';
                    const labelSuffix = isAtCapacity
                      ? `(At Capacity - 3/3 tasks)`
                      : isInactive
                      ? `(Inactive - Cannot Assign)`
                      : emp.status === 'On Leave'
                      ? `(On Leave - ${count}/3 tasks)`
                      : `(Active - ${count}/3 tasks)`;

                    return (
                      <option
                        key={emp._id}
                        value={emp._id}
                        disabled={isInactive}
                      >
                        {emp.fullName} - {emp.department} {labelSuffix}
                      </option>
                    );
                  })}
                </select>
              </FormField>

              {/* Priority */}
              <FormField
                label="Priority"
                htmlFor="task-priority"
                required
              >
                <select
                  id="task-priority"
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

              {/* Department */}
              <FormField
                label="Department"
                htmlFor="task-dept"
                required
              >
                <select
                  id="task-dept"
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

              {/* Start Date */}
              <FormField
                label="Start Date"
                htmlFor="task-start-date"
                required
                error={fieldErrors.startDate}
              >
                <input
                  type="date"
                  id="task-start-date"
                  name="startDate"
                  className={`input-text ${fieldErrors.startDate ? 'input-error' : ''}`}
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </FormField>

              {/* Due Date */}
              <FormField
                label="Due Date"
                htmlFor="task-due-date"
                required
                error={fieldErrors.dueDate}
              >
                <input
                  type="date"
                  id="task-due-date"
                  name="dueDate"
                  className={`input-text ${fieldErrors.dueDate ? 'input-error' : ''}`}
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                />
              </FormField>

              {/* Description */}
              <FormField
                label="Description"
                htmlFor="task-description"
                className="full-width"
              >
                <textarea
                  id="task-description"
                  name="description"
                  rows={4}
                  className="input-text"
                  placeholder="Enter Description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            {/* Backend Rejection Error Banner */}
            {serverError && (
              <div
                className="error-banner"
                id="task-error-banner"
                role="alert"
                style={{ marginTop: '1.5rem' }}
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              id="submit-task-btn"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1.5rem' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
