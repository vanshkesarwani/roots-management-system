import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FormField } from '../../components/common/FormField';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDateInput } from '../../utils/dateUtils';

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const STATUSES = ['Active', 'Inactive', 'On Leave'];

export const EmployeeEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [employee, setEmployee] = useState(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    department: 'Development',
    role: '',
    status: 'Active',
    skills: '',
    leaveStartDate: '',
    leaveEndDate: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get(`/employees/${id}`);
      if (res.data.success) {
        const emp = res.data.data;
        setEmployee(emp);
        setFormData({
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          role: emp.role,
          status: emp.status,
          skills: emp.skills ? emp.skills.join(', ') : '',
          leaveStartDate: formatDateInput(emp.leaveStartDate),
          leaveEndDate: formatDateInput(emp.leaveEndDate),
        });
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
    if (!formData.fullName.trim()) errors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Invalid email address format';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.role.trim()) errors.role = 'Role / Job title is required';

    if (formData.status === 'On Leave') {
      if (!formData.leaveStartDate) errors.leaveStartDate = 'Leave Start Date is required';
      if (!formData.leaveEndDate) errors.leaveEndDate = 'Leave End Date is required';
      if (
        formData.leaveStartDate &&
        formData.leaveEndDate &&
        new Date(formData.leaveEndDate) < new Date(formData.leaveStartDate)
      ) {
        errors.leaveEndDate = 'Leave End Date cannot be earlier than Leave Start Date';
      }
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
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        department: formData.department,
        role: formData.role.trim(),
        status: formData.status,
        skills: formData.skills
          ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };

      if (payload.status === 'On Leave') {
        payload.leaveStartDate = formData.leaveStartDate;
        payload.leaveEndDate = formData.leaveEndDate;
      } else {
        payload.leaveStartDate = null;
        payload.leaveEndDate = null;
      }

      const res = await api.put(`/employees/${id}`, payload);
      if (res.data.success) {
        toastSuccess('Employee updated successfully!');
        navigate(`/employees/${id}`);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to update employee profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="container">
        <LoadingSpinner message="Loading employee profile for editing..." />
      </main>
    );
  }

  if (fetchError || !employee) {
    return (
      <main className="container">
        <ErrorState
          title="Employee Profile Unavailable"
          message={fetchError || 'Unable to locate employee record.'}
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
              Edit Employee ({formData.employeeId})
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate(`/employees/${id}`)}
              >
                Cancel
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid-2">
              <FormField
                label="Employee ID (Read-only)"
                htmlFor="edit-emp-id"
                helpText="Employee IDs are immutable"
              >
                <input
                  type="text"
                  id="edit-emp-id"
                  name="employeeId"
                  className="input-text"
                  value={formData.employeeId}
                  disabled
                  style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                />
              </FormField>

              <FormField
                label="Full Name"
                htmlFor="edit-emp-name"
                required
                error={fieldErrors.fullName}
              >
                <input
                  type="text"
                  id="edit-emp-name"
                  name="fullName"
                  className={`input-text ${fieldErrors.fullName ? 'input-error' : ''}`}
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Email Address"
                htmlFor="edit-emp-email"
                required
                error={fieldErrors.email}
              >
                <input
                  type="email"
                  id="edit-emp-email"
                  name="email"
                  className={`input-text ${fieldErrors.email ? 'input-error' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Phone Number"
                htmlFor="edit-emp-phone"
                required
                error={fieldErrors.phone}
              >
                <input
                  type="text"
                  id="edit-emp-phone"
                  name="phone"
                  className={`input-text ${fieldErrors.phone ? 'input-error' : ''}`}
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Department"
                htmlFor="edit-emp-dept"
                required
              >
                <select
                  id="edit-emp-dept"
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
                label="Role / Job Title"
                htmlFor="edit-emp-role"
                required
                error={fieldErrors.role}
              >
                <input
                  type="text"
                  id="edit-emp-role"
                  name="role"
                  className={`input-text ${fieldErrors.role ? 'input-error' : ''}`}
                  value={formData.role}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Status"
                htmlFor="edit-emp-status"
                required
              >
                <select
                  id="edit-emp-status"
                  name="status"
                  className="select-input"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Conditional Leave Window */}
              {formData.status === 'On Leave' && (
                <>
                  <FormField
                    label="Leave Start Date"
                    htmlFor="edit-emp-leave-start"
                    required
                    error={fieldErrors.leaveStartDate}
                  >
                    <input
                      type="date"
                      id="edit-emp-leave-start"
                      name="leaveStartDate"
                      className={`input-text ${fieldErrors.leaveStartDate ? 'input-error' : ''}`}
                      value={formData.leaveStartDate}
                      onChange={handleChange}
                      required
                    />
                  </FormField>

                  <FormField
                    label="Leave End Date"
                    htmlFor="edit-emp-leave-end"
                    required
                    error={fieldErrors.leaveEndDate}
                  >
                    <input
                      type="date"
                      id="edit-emp-leave-end"
                      name="leaveEndDate"
                      className={`input-text ${fieldErrors.leaveEndDate ? 'input-error' : ''}`}
                      value={formData.leaveEndDate}
                      onChange={handleChange}
                      required
                    />
                  </FormField>
                </>
              )}

              <FormField
                label="Skills & Expertise"
                htmlFor="edit-emp-skills"
                className="full-width"
                helpText="Comma separated values"
              >
                <input
                  type="text"
                  id="edit-emp-skills"
                  name="skills"
                  className="input-text"
                  value={formData.skills}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            {serverError && (
              <div className="error-banner" role="alert" style={{ marginTop: '1.5rem' }}>
                {serverError}
              </div>
            )}

            <button
              type="submit"
              id="save-employee-btn"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1.5rem' }}
              disabled={submitting}
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
