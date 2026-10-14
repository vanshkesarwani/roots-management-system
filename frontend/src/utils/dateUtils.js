/**
 * Standard date formatting and manipulation utilities across the frontend.
 */

export const formatDateDisplay = (dateInput, includeYear = true) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();

  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
};

export const formatDateInput = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export const isTaskOverdue = (dueDate, status) => {
  if (!dueDate) return false;
  if (status === 'Completed' || status === 'Cancelled') return false;
  return new Date().getTime() > new Date(dueDate).getTime();
};

export const getTodayDateInput = () => {
  return new Date().toISOString().split('T')[0];
};
