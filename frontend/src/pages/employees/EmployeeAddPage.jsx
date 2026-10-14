import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FormField } from '../../components/common/FormField';
import { getTodayDateInput } from '../../utils/dateUtils';

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const STATUSES = ['Active', 'Inactive', 'On Leave'];

export const EmployeeAddPage = () => {
  const navigate = useNavigate();
  const { success: toastSuccess } = useToast();

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    department: 'Development',
    role: '',
    joiningDate: getTodayDateInput(),
    status: 'Active',
    skills: '',
    leaveStartDate: '',
    leaveEndDate: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!formData.employeeId.trim()) errors.employeeId = 'Employee ID is required';
    if (!formData.fullName.trim()) errors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Invalid email address format';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.role.trim()) errors.role = 'Role / Job title is required';
    if (!formData.joiningDate) errors.joiningDate = 'Joining date is required';

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
        ...formData,
        employeeId: formData.employeeId.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role.trim(),
        skills: formData.skills
          ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };

      if (payload.status !== 'On Leave') {
        delete payload.leaveStartDate;
        delete payload.leaveEndDate;
      }

      const res = await api.post('/employees', payload);
      if (res.data.success) {
        toastSuccess(`Employee ${res.data.data.employeeId} registered successfully!`);
        navigate('/employees');
      }
    } catch (err) {
      setServerError(err.message || 'Failed to create employee.');
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
              Add Employee
            </h1>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/employees')}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid-2">
              <FormField
                label="Employee ID"
                htmlFor="emp-id"
                required
                error={fieldErrors.employeeId}
                helpText="Unique ID (e.g. EMP-013)"
              >
                <input
                  type="text"
                  id="emp-id"
                  name="employeeId"
                  className={`input-text ${fieldErrors.employeeId ? 'input-error' : ''}`}
                  placeholder="e.g. EMP-013"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Full Name"
                htmlFor="emp-name"
                required
                error={fieldErrors.fullName}
              >
                <input
                  type="text"
                  id="emp-name"
                  name="fullName"
                  className={`input-text ${fieldErrors.fullName ? 'input-error' : ''}`}
                  placeholder="Enter Full Name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Email Address"
                htmlFor="emp-email"
                required
                error={fieldErrors.email}
              >
                <input
                  type="email"
                  id="emp-email"
                  name="email"
                  className={`input-text ${fieldErrors.email ? 'input-error' : ''}`}
                  placeholder="name@rootsmedia.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Phone Number"
                htmlFor="emp-phone"
                required
                error={fieldErrors.phone}
              >
                <input
                  type="text"
                  id="emp-phone"
                  name="phone"
                  className={`input-text ${fieldErrors.phone ? 'input-error' : ''}`}
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Department"
                htmlFor="emp-dept"
                required
              >
                <select
                  id="emp-dept"
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
                htmlFor="emp-role"
                required
                error={fieldErrors.role}
              >
                <input
                  type="text"
                  id="emp-role"
                  name="role"
                  className={`input-text ${fieldErrors.role ? 'input-error' : ''}`}
                  placeholder="e.g. Full Stack Developer"
                  value={formData.role}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Joining Date"
                htmlFor="emp-joining"
                required
                error={fieldErrors.joiningDate}
              >
                <input
                  type="date"
                  id="emp-joining"
                  name="joiningDate"
                  className={`input-text ${fieldErrors.joiningDate ? 'input-error' : ''}`}
                  value={formData.joiningDate}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField
                label="Status"
                htmlFor="emp-status"
                required
              >
                <select
                  id="emp-status"
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
                    htmlFor="emp-leave-start"
                    required
                    error={fieldErrors.leaveStartDate}
                  >
                    <input
                      type="date"
                      id="emp-leave-start"
                      name="leaveStartDate"
                      className={`input-text ${fieldErrors.leaveStartDate ? 'input-error' : ''}`}
                      value={formData.leaveStartDate}
                      onChange={handleChange}
                      required
                    />
                  </FormField>

                  <FormField
                    label="Leave End Date"
                    htmlFor="emp-leave-end"
                    required
                    error={fieldErrors.leaveEndDate}
                  >
                    <input
                      type="date"
                      id="emp-leave-end"
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
                htmlFor="emp-skills"
                className="full-width"
                helpText="Separate multiple skills with commas (e.g. React, Node.js, MongoDB)"
              >
                <input
                  type="text"
                  id="emp-skills"
                  name="skills"
                  className="input-text"
                  placeholder="e.g. React, Node.js, MongoDB, TypeScript"
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
              id="submit-employee-btn"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1.5rem' }}
              disabled={submitting}
            >
              {submitting ? 'Creating Employee...' : 'Submit Employee'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
