/**
 * Safe URL Query Parameter parsing, validation, and serialization.
 * Ensures robust synchronization between React UI state, URL bar, and backend APIs.
 */

export const VALID_DEPARTMENTS = ['All', 'Development', 'Design', 'QA', 'HR', 'Sales'];
export const VALID_EMPLOYEE_STATUSES = ['All', 'Active', 'Inactive', 'On Leave'];
export const VALID_TASK_STATUSES = ['All', 'Todo', 'In Progress', 'Completed', 'Cancelled'];
export const VALID_TASK_PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Critical'];
export const VALID_EMPLOYEE_SORT_FIELDS = ['createdAt', 'fullName', 'joiningDate', 'department'];
export const VALID_TASK_SORT_FIELDS = ['createdDate', 'dueDate', 'priority', 'title'];
export const VALID_SORT_ORDERS = ['asc', 'desc'];

const isValidDateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
};

/**
 * Parses and sanitizes URL parameters for the Employee List.
 */
export const parseEmployeeParams = (searchParams) => {
  const rawSearch = searchParams.get('search') || '';
  const rawDept = searchParams.get('department') || 'All';
  const rawStatus = searchParams.get('status') || 'All';
  const rawSortBy = searchParams.get('sortBy') || 'createdAt';
  const rawSortOrder = searchParams.get('sortOrder') || 'desc';
  const rawPage = searchParams.get('page');

  const department = VALID_DEPARTMENTS.includes(rawDept) ? rawDept : 'All';
  const status = VALID_EMPLOYEE_STATUSES.includes(rawStatus) ? rawStatus : 'All';
  const sortBy = VALID_EMPLOYEE_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'createdAt';
  const sortOrder = VALID_SORT_ORDERS.includes(rawSortOrder) ? rawSortOrder : 'desc';

  const parsedPage = parseInt(rawPage, 10);
  const page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return {
    search: rawSearch.trim(),
    department,
    status,
    sortBy,
    sortOrder,
    page,
  };
};

/**
 * Parses and sanitizes URL parameters for the Task List.
 */
export const parseTaskParams = (searchParams) => {
  const rawSearch = searchParams.get('search') || '';
  const rawDept = searchParams.get('department') || 'All';
  const rawPriority = searchParams.get('priority') || 'All';
  const rawStatus = searchParams.get('status') || 'All';
  const rawDueFrom = searchParams.get('dueFrom') || '';
  const rawDueTo = searchParams.get('dueTo') || '';
  const rawSortBy = searchParams.get('sortBy') || 'createdDate';
  const rawSortOrder = searchParams.get('sortOrder') || 'desc';
  const rawPage = searchParams.get('page');

  const department = VALID_DEPARTMENTS.includes(rawDept) ? rawDept : 'All';
  const priority = VALID_TASK_PRIORITIES.includes(rawPriority) ? rawPriority : 'All';
  const status = VALID_TASK_STATUSES.includes(rawStatus) ? rawStatus : 'All';
  const dueFrom = isValidDateString(rawDueFrom) ? rawDueFrom : '';
  const dueTo = isValidDateString(rawDueTo) ? rawDueTo : '';
  const sortBy = VALID_TASK_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'createdDate';
  const sortOrder = VALID_SORT_ORDERS.includes(rawSortOrder) ? rawSortOrder : 'desc';

  const parsedPage = parseInt(rawPage, 10);
  const page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return {
    search: rawSearch.trim(),
    department,
    priority,
    status,
    dueFrom,
    dueTo,
    sortBy,
    sortOrder,
    page,
  };
};

/**
 * Builds a clean URLSearchParams object, omitting default/empty values.
 * Automatically resets page to 1 whenever any filter/search/sort change is made.
 */
export const buildCleanSearchParams = (currentParams, updates, defaults = {}) => {
  const merged = { ...currentParams, ...updates };

  // If any filter/search/sort changed and page wasn't explicitly provided in updates, reset page to 1
  if (!('page' in updates)) {
    delete merged.page;
  }

  const result = new URLSearchParams();

  Object.entries(merged).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return;

    // Omit default values to keep URL clean and canonical
    if (defaults[key] !== undefined && val === defaults[key]) return;

    // For page: only include if > 1
    if (key === 'page' && (Number(val) <= 1 || isNaN(Number(val)))) return;

    result.set(key, String(val));
  });

  return result;
};
