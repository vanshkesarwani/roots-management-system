/**
 * Authoritative single-source-of-truth helper for calculating task overdue state.
 * Rule: Today's date must be later than Due Date, and status must not be Completed or Cancelled.
 */
export const computeIsOverdue = (taskOrDueDate, status) => {
  const dueDate = taskOrDueDate && typeof taskOrDueDate === 'object' && 'dueDate' in taskOrDueDate
    ? taskOrDueDate.dueDate
    : taskOrDueDate;

  const currentStatus = status !== undefined
    ? status
    : (taskOrDueDate && typeof taskOrDueDate === 'object' ? taskOrDueDate.status : null);

  if (!dueDate) return false;
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') return false;

  return new Date().getTime() > new Date(dueDate).getTime();
};
