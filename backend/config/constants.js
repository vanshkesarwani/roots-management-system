export const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];

export const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'On Leave'];

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const TASK_STATUSES = ['Todo', 'In Progress', 'Completed', 'Cancelled'];

// Strict status flow as per assignment:
// Todo -> In Progress -> Completed
// Todo / In Progress -> Cancelled
// Any other change is rejected.
export const VALID_STATUS_TRANSITIONS = {
  'Todo': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  'Completed': [], // Terminal state, immutable
  'Cancelled': []  // Terminal state, immutable
};

export const MAX_ACTIVE_TASKS_PER_EMPLOYEE = 3;

export const PRIORITY_WEIGHTS = {
  'Critical': 4,
  'High': 3,
  'Medium': 2,
  'Low': 1
};
